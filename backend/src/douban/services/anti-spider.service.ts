import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CookieManagerService } from './cookie-manager.service';

/**
 * 反爬虫策略服务 - 基于obsidian-douban的成熟方案
 * 
 * 核心策略:
 * - 智能延迟 (4-8秒正常模式, 10-15秒慢速模式)
 * - 人机验证检测
 * - 403错误处理和重试
 * - 请求频率控制
 */
@Injectable()
export class AntiSpiderService {
  private readonly logger = new Logger(AntiSpiderService.name);
  private requestCount = 0;

  // 反爬虫配置 - 参考obsidian-douban Constants.ts
  private readonly baseDelay = 4000;           // 基础延迟4秒
  private readonly randomDelay = 4000;         // 随机延迟范围4秒  
  private readonly slowModeThreshold = 200;    // 200条后进入慢速模式
  private readonly slowDelay = 10000;          // 慢速模式基础延迟10秒
  private readonly slowRandomDelay = 5000;     // 慢速模式随机延迟5秒
  private readonly maxRetries = 3;             // 最大重试次数

  constructor(private readonly cookieManager: CookieManagerService) {}

  /**
   * 智能延迟策略 - 基于请求计数动态调整
   */
  async intelligentDelay(): Promise<void> {
    this.requestCount++;
    
    let delay: number;
    
    if (this.requestCount > this.slowModeThreshold) {
      // 慢速模式：10-15秒延迟
      delay = this.slowDelay + Math.random() * this.slowRandomDelay;
      this.logger.debug(`Slow mode (${this.requestCount} requests) - delay: ${Math.round(delay)}ms`);
    } else {
      // 正常模式：4-8秒延迟
      delay = this.baseDelay + Math.random() * this.randomDelay;
      this.logger.debug(`Normal mode (${this.requestCount} requests) - delay: ${Math.round(delay)}ms`);
    }
    
    await this.sleep(delay);
  }

  /**
   * 带反爬虫保护的HTTP请求
   */
  async makeRequest(
    url: string, 
    cookie: string, 
    options: AxiosRequestConfig = {}
  ): Promise<string> {
    
    // 确定域名类型
    const domain = this.extractDomainType(url);
    const headers = this.cookieManager.getHeadersForDomain(domain, cookie);

    // 创建请求配置
    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers: {
        ...headers,
        ...options.headers
      },
      timeout: 30000,
      validateStatus: (status) => status < 500, // 允许4xx错误进入响应处理
      ...options
    };

    let lastError: Error;

    // 重试机制
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${this.maxRetries} - ${url}`);

        // 智能延迟
        if (attempt > 1) {
          await this.sleep(5000 + Math.random() * 5000); // 重试时额外延迟
        }
        await this.intelligentDelay();

        // 发起请求
        const response = await axios(config);

        // 检查响应状态
        if (response.status === 403) {
          throw new Error('Request forbidden (403) - possible IP blocking');
        }

        const html = response.data;

        // 人机验证检测
        if (this.isHumanVerificationRequired(html)) {
          throw new Error('Human verification required - please update cookie');
        }

        // 检查其他阻止指标
        if (this.isBlocked(html)) {
          throw new Error('Access blocked - content indicates restriction');
        }

        this.logger.debug(`Request successful - ${url}`);
        return html;

      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed:`, error.message);

        // 如果是人机验证或403，不再重试
        if (this.isHumanVerificationError(error) || error.message.includes('403')) {
          throw error;
        }

        // 最后一次尝试失败
        if (attempt === this.maxRetries) {
          break;
        }
      }
    }

    // 所有重试失败
    this.logger.error(`All attempts failed for ${url}:`, lastError);
    throw lastError;
  }

  /**
   * 检测是否遇到人机验证 - 基于obsidian-douban的检测逻辑
   */
  private isHumanVerificationRequired(html: string): boolean {
    const indicators = [
      '<title>禁止访问</title>',     // obsidian-douban的核心检测
      '验证码',
      '人机验证', 
      'captcha',
      'robot check',
      '安全验证'
    ];

    return indicators.some(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * 检测是否被阻止访问
   */
  private isBlocked(html: string): boolean {
    const blockIndicators = [
      '访问被拒绝',
      'access denied',
      '请求频繁',
      'too many requests',
      '系统繁忙'
    ];

    return blockIndicators.some(indicator =>
      html.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * 判断是否是人机验证错误
   */
  private isHumanVerificationError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const responseData = error.response?.data?.toString().toLowerCase() || '';
    
    const verificationKeywords = [
      'human verification',
      'captcha', 
      '禁止访问',
      '验证码',
      '人机验证'
    ];

    return verificationKeywords.some(keyword =>
      errorMessage.includes(keyword) || responseData.includes(keyword)
    );
  }

  /**
   * 提取域名类型
   */
  private extractDomainType(url: string): 'book' | 'movie' | 'music' | 'www' {
    if (url.includes('book.douban.com')) return 'book';
    if (url.includes('movie.douban.com')) return 'movie';
    if (url.includes('music.douban.com')) return 'music';
    return 'www';
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 随机睡眠
   */
  async sleepRange(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await this.sleep(delay);
  }

  /**
   * 获取请求统计信息
   */
  getRequestStats() {
    return {
      requestCount: this.requestCount,
      isSlowMode: this.requestCount > this.slowModeThreshold,
      slowModeThreshold: this.slowModeThreshold,
      baseDelay: this.baseDelay,
      slowDelay: this.slowDelay
    };
  }

  /**
   * 重置请求计数器
   */
  resetRequestCount(): void {
    const oldCount = this.requestCount;
    this.requestCount = 0;
    this.logger.log(`Request count reset from ${oldCount} to 0`);
  }

  /**
   * 手动设置请求计数器 (用于测试)
   */
  setRequestCount(count: number): void {
    this.requestCount = count;
    this.logger.debug(`Request count manually set to ${count}`);
  }

  /**
   * 验证Cookie有效性
   */
  async validateCookie(userId: string, cookie: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // 尝试访问用户主页
      const testUrl = `https://www.douban.com/people/${userId}/`;
      const html = await this.makeRequest(testUrl, cookie);

      // 检查是否需要登录
      if (html.includes('登录') && html.includes('注册')) {
        return {
          isValid: false,
          error: 'Cookie已失效，需要重新登录'
        };
      }

      // 检查是否被限制访问
      if (this.isHumanVerificationRequired(html) || this.isBlocked(html)) {
        return {
          isValid: false,
          error: '账号受限或需要验证'
        };
      }

      return { isValid: true };

    } catch (error) {
      this.logger.error(`Cookie validation failed:`, error);
      return {
        isValid: false,
        error: error.message || 'Cookie验证失败'
      };
    }
  }

  /**
   * 获取当前延迟配置
   */
  getCurrentDelayConfig() {
    const isSlowMode = this.requestCount > this.slowModeThreshold;
    
    return {
      mode: isSlowMode ? 'slow' : 'normal',
      baseDelay: isSlowMode ? this.slowDelay : this.baseDelay,
      randomRange: isSlowMode ? this.slowRandomDelay : this.randomDelay,
      expectedDelay: isSlowMode 
        ? `${this.slowDelay + this.slowRandomDelay / 2}ms` 
        : `${this.baseDelay + this.randomDelay / 2}ms`
    };
  }
}