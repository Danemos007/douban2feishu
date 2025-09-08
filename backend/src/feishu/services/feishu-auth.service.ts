import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

import { CryptoService } from '../../common/crypto/crypto.service';
import { ExtendedAxiosRequestConfig } from '../../common/interfaces/http.interface';
import { FeishuErrorResponse } from '../interfaces/api.interface';
import { FeishuContractValidatorService } from '../contract/validator.service';
import { FeishuTokenResponse } from '../schemas';

/**
 * Token统计信息接口
 */
interface TokenStats {
  totalApps: number;
  cachedTokens: number;
  expiringSoon: number;
}

/**
 * 飞书认证服务 - 企业级Token管理
 *
 * 功能:
 * - 自动Token获取和刷新
 * - 多租户Token隔离
 * - Redis分布式缓存
 * - 错误处理和重试机制
 * - 速率限制和熔断保护
 * - 安全日志和审计
 */
@Injectable()
export class FeishuAuthService implements OnModuleDestroy {
  private readonly logger = new Logger(FeishuAuthService.name);
  private readonly httpClient: AxiosInstance;
  private readonly tokenKeyPrefix = 'feishu:token:';
  private readonly rateLimitKeyPrefix = 'feishu:ratelimit:';

  // 认证配置
  private readonly authConfig = {
    baseUrl: 'https://open.feishu.cn',
    tokenEndpoint: '/open-apis/auth/v3/tenant_access_token/internal',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    tokenTtl: 7200, // 2小时
    tokenRefreshBuffer: 300, // 提前5分钟刷新
  };

  // 内存缓存fallback
  private readonly memoryCache = new Map<
    string,
    { value: string; expiry: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly contractValidator: FeishuContractValidatorService,
    @Optional() @InjectRedis() private readonly redis: Redis,
  ) {
    this.httpClient = this.createHttpClient();

    if (!this.redis) {
      this.logger.warn(
        'Redis not available, using in-memory cache fallback for tokens',
      );
    }
  }

  onModuleDestroy() {
    // 清理资源
    this.httpClient?.defaults?.timeout &&
      clearTimeout(this.httpClient.defaults.timeout);
  }

  /**
   * 创建HTTP客户端 - 带重试和错误处理
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.authConfig.baseUrl,
      timeout: this.authConfig.timeout,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': `D2F-Backend/${this.configService.get('APP_VERSION', '1.0.0')}`,
      },
    });

    // 响应拦截器 - 错误处理和日志
    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const context = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        };

        this.logger.error('Feishu API request failed:', context);

        // 根据错误类型决定是否重试
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        throw this.transformError(error);
      },
    );

    return client;
  }

  /**
   * 获取访问令牌 - 支持分布式缓存和自动刷新
   * @param appId 应用ID
   * @param appSecret 应用密钥 (可能是明文或加密数据)
   * @param userId 用户ID (用于解密，可选)
   */
  async getAccessToken(
    appId: string,
    appSecret: string,
    userId?: string,
  ): Promise<string> {
    try {
      // 速率限制检查
      await this.checkRateLimit(appId);

      const cacheKey = `${this.tokenKeyPrefix}${appId}`;

      // 尝试从Redis获取缓存的token
      const cachedToken = await this.getCachedToken(cacheKey);
      if (cachedToken) {
        return cachedToken;
      }

      // 获取新token
      const token = await this.requestNewToken(appId, appSecret, userId);

      // 缓存token
      await this.cacheToken(cacheKey, token);

      this.logger.log(
        `Access token refreshed for app: ${this.maskAppId(appId)}`,
      );
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to get access token for app ${this.maskAppId(appId)}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw error;
    }
  }

  /**
   * 从缓存获取token (Redis优先，内存缓存fallback)
   */
  private async getCachedToken(cacheKey: string): Promise<string | null> {
    // 尝试Redis缓存
    if (this.redis) {
      try {
        const tokenData = await this.redis.hgetall(cacheKey);

        if (!tokenData.token || !tokenData.expiresAt) {
          return null;
        }

        const expiresAt = parseInt(tokenData.expiresAt, 10);
        const now = Date.now();

        // 检查token是否即将过期（提前刷新）
        if (expiresAt <= now + this.authConfig.tokenRefreshBuffer * 1000) {
          return null;
        }

        return tokenData.token;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          'Redis cache failed, falling back to memory cache:',
          errorMessage,
        );
      }
    }

    // Fallback到内存缓存
    const cached = this.memoryCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (cached.expiry <= now + this.authConfig.tokenRefreshBuffer * 1000) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  /**
   * 请求新的access token
   * @param appId 应用ID
   * @param appSecret 应用密钥 (可能是明文或加密后的数据)
   * @param userId 用户ID (用于解密，可选)
   */
  private async requestNewToken(
    appId: string,
    appSecret: string,
    userId?: string,
  ): Promise<string> {
    // 如果提供了用户ID且appSecret看起来像加密数据，则解密
    let decryptedSecret = appSecret;
    if (userId && this.isEncryptedData(appSecret)) {
      decryptedSecret = await this.cryptoService.decrypt(appSecret, userId);
    }

    const response = await this.httpClient.post(this.authConfig.tokenEndpoint, {
      app_id: appId,
      app_secret: decryptedSecret,
    });

    // 🔥 使用契约验证器验证认证响应
    const validatedResponse = this.contractValidator.validateAuthResponse(
      response.data,
      'requestNewToken',
    );

    const { tenant_access_token, expire } = validatedResponse;

    if (!tenant_access_token) {
      throw new Error('Invalid token response from Feishu API');
    }

    return tenant_access_token;
  }

  /**
   * 缓存token (Redis优先，内存缓存fallback)
   */
  private async cacheToken(cacheKey: string, token: string): Promise<void> {
    const expiresAt =
      Date.now() +
      (this.authConfig.tokenTtl - this.authConfig.tokenRefreshBuffer) * 1000;

    // 尝试Redis缓存
    if (this.redis) {
      try {
        await this.redis
          .pipeline()
          .hset(cacheKey, {
            token,
            expiresAt: expiresAt.toString(),
            createdAt: Date.now().toString(),
          })
          .expire(cacheKey, this.authConfig.tokenTtl)
          .exec();
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          'Redis cache failed, using memory cache:',
          errorMessage,
        );
      }
    }

    // Fallback到内存缓存
    this.memoryCache.set(cacheKey, { value: token, expiry: expiresAt });
  }

  /**
   * 速率限制检查 (Redis优先，内存缓存fallback)
   */
  private async checkRateLimit(appId: string): Promise<void> {
    const rateLimitKey = `${this.rateLimitKeyPrefix}${appId}`;
    const windowSize = 60; // 1分钟窗口
    const maxRequests = 20; // 每分钟最多20次认证请求

    if (this.redis) {
      try {
        const current = await this.redis.incr(rateLimitKey);

        if (current === 1) {
          await this.redis.expire(rateLimitKey, windowSize);
        }

        if (current > maxRequests) {
          throw new Error(
            `Rate limit exceeded for app ${this.maskAppId(appId)}. Max ${maxRequests} requests per minute.`,
          );
        }
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Rate limit exceeded')) {
          throw error;
        }
        this.logger.warn('Redis rate limit check failed:', errorMessage);
      }
    }

    // Fallback到内存缓存的简单限流 (不如Redis精确，但足够测试使用)
    const now = Date.now();
    const windowStart = now - windowSize * 1000;

    const cached = this.memoryCache.get(rateLimitKey);
    let requests: number[] = cached ? JSON.parse(cached.value) : [];

    // 清理过期请求
    requests = requests.filter((time) => time > windowStart);

    if (requests.length >= maxRequests) {
      throw new Error(
        `Rate limit exceeded for app ${this.maskAppId(appId)}. Max ${maxRequests} requests per minute.`,
      );
    }

    // 记录当前请求
    requests.push(now);
    this.memoryCache.set(rateLimitKey, {
      value: JSON.stringify(requests),
      expiry: now + windowSize * 1000,
    });
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) {
      return true; // 网络错误，可以重试
    }

    const status = error.response.status;

    // 服务器错误或限流错误可以重试
    return status >= 500 || status === 429;
  }

  /**
   * 重试请求
   */
  private async retryRequest(error: AxiosError): Promise<any> {
    const config = error.config as ExtendedAxiosRequestConfig;
    if (!config) throw error;

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= this.authConfig.retryAttempts) {
      throw error;
    }

    config.__retryCount += 1;

    // 指数退避延迟
    const delay =
      this.authConfig.retryDelay * Math.pow(2, config.__retryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.httpClient.request(config);
  }

  /**
   * 转换错误格式
   */
  private transformError(error: AxiosError): Error {
    if (error.response?.data) {
      const { code, msg } = error.response.data as FeishuErrorResponse;
      return new Error(`Feishu API Error: [${code}] ${msg}`);
    }

    return new Error(`Feishu API Request Failed: ${error.message}`);
  }

  /**
   * 判断数据是否为加密格式
   * 加密数据通常是base64编码且长度较长
   */
  private isEncryptedData(data: string): boolean {
    // 简单的启发式判断：
    // 1. 长度大于64字符 (明文appSecret通常32字符左右)
    // 2. 是有效的base64格式
    if (data.length < 64) {
      return false;
    }

    try {
      const decoded = Buffer.from(data, 'base64');
      return decoded.toString('base64') === data;
    } catch {
      return false;
    }
  }

  /**
   * 脱敏App ID用于日志
   */
  private maskAppId(appId: string): string {
    if (appId.length <= 8) return '***';
    return `${appId.substring(0, 4)}***${appId.substring(appId.length - 4)}`;
  }

  /**
   * 验证App凭证
   */
  async validateCredentials(
    appId: string,
    appSecret: string,
  ): Promise<boolean> {
    try {
      await this.getAccessToken(appId, appSecret);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Credential validation failed for app ${this.maskAppId(appId)}:`,
        errorMessage,
      );
      return false;
    }
  }

  /**
   * 清除指定应用的token缓存
   */
  async clearTokenCache(appId: string): Promise<void> {
    const cacheKey = `${this.tokenKeyPrefix}${appId}`;
    await this.redis.del(cacheKey);
    this.logger.log(`Token cache cleared for app: ${this.maskAppId(appId)}`);
  }

  /**
   * 获取token统计信息
   */
  async getTokenStats(): Promise<TokenStats | null> {
    try {
      const pattern = `${this.tokenKeyPrefix}*`;
      const keys = await this.redis.keys(pattern);

      const stats = {
        totalApps: keys.length,
        cachedTokens: 0,
        expiringSoon: 0,
      };

      for (const key of keys) {
        const tokenData = await this.redis.hgetall(key);
        if (tokenData.token) {
          stats.cachedTokens++;

          const expiresAt = parseInt(tokenData.expiresAt, 10);
          const now = Date.now();
          if (expiresAt <= now + this.authConfig.tokenRefreshBuffer * 1000) {
            stats.expiringSoon++;
          }
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get token stats:', error);
      return null;
    }
  }
}
