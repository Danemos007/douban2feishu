import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
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
  private readonly baseDelay = 4000; // 基础延迟4秒
  private readonly randomDelay = 4000; // 随机延迟范围4秒
  private readonly slowModeThreshold = 200; // 200条后进入慢速模式
  private readonly slowDelay = 10000; // 慢速模式基础延迟10秒
  private readonly slowRandomDelay = 5000; // 慢速模式随机延迟5秒
  private readonly maxRetries = 3; // 最大重试次数

  constructor(private readonly cookieManager: CookieManagerService) {}

  /**
   * 智能延迟策略 - 基于请求计数动态调整延迟时间
   *
   * @description 根据当前请求计数自动切换延迟模式：
   * - 正常模式（≤200次请求）：4-8秒随机延迟
   * - 慢速模式（>200次请求）：10-15秒随机延迟
   * 每次调用会自动增加请求计数器，并执行相应的延迟
   *
   * @returns {Promise<void>} 延迟完成后的Promise
   *
   * @example
   * ```typescript
   * await antiSpiderService.intelligentDelay();
   * // 根据请求计数自动执行4-8秒或10-15秒延迟
   * ```
   */
  async intelligentDelay(): Promise<void> {
    this.requestCount++;

    let delay: number;

    if (this.requestCount > this.slowModeThreshold) {
      // 慢速模式：10-15秒延迟
      delay = this.slowDelay + Math.random() * this.slowRandomDelay;
      this.logger.debug(
        `Slow mode (${this.requestCount} requests) - delay: ${Math.round(delay)}ms`,
      );
    } else {
      // 正常模式：4-8秒延迟
      delay = this.baseDelay + Math.random() * this.randomDelay;
      this.logger.debug(
        `Normal mode (${this.requestCount} requests) - delay: ${Math.round(delay)}ms`,
      );
    }

    await this.sleep(delay);
  }

  /**
   * 带反爬虫保护的HTTP请求
   *
   * @description 执行带有智能延迟、重试机制和人机验证检测的HTTP请求。
   * 包含以下保护机制：
   * - 智能延迟（基于请求计数）
   * - 最多3次重试
   * - 403错误和人机验证检测
   * - 自动设置请求头和Cookie
   *
   * @param {string} url - 目标URL地址
   * @param {string} cookie - 用户Cookie字符串
   * @param {Partial<AxiosRequestConfig>} options - 可选的axios配置参数
   *
   * @returns {Promise<string>} 响应的HTML内容
   *
   * @throws {Error} 当遇到以下情况时抛出错误：
   * - 403错误（可能的IP封禁）
   * - 人机验证要求
   * - 访问被阻止
   * - 网络错误或超时
   * - 所有重试尝试失败
   *
   * @example
   * ```typescript
   * const html = await antiSpiderService.makeRequest(
   *   'https://book.douban.com/subject/123456/',
   *   'userCookieString',
   *   { timeout: 60000 }
   * );
   * ```
   */
  async makeRequest(
    url: string,
    cookie: string,
    options: Partial<AxiosRequestConfig> = {},
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
        ...options.headers,
      },
      timeout: 30000,
      validateStatus: (status) => status < 500, // 允许4xx错误进入响应处理
      ...options,
    };

    let lastError: Error = new Error('No attempts made');

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

        const html = String(response.data);

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
        lastError = error as Error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(
          `Attempt ${attempt}/${this.maxRetries} failed:`,
          errorMessage,
        );

        // 如果是人机验证或403，不再重试
        if (
          this.isHumanVerificationError(error as Error | AxiosError) ||
          errorMessage.includes('403')
        ) {
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
      '<title>禁止访问</title>', // obsidian-douban的核心检测
      '验证码',
      '人机验证',
      'captcha',
      'robot check',
      '安全验证',
    ];

    return indicators.some((indicator) =>
      html.toLowerCase().includes(indicator.toLowerCase()),
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
      '系统繁忙',
    ];

    return blockIndicators.some((indicator) =>
      html.toLowerCase().includes(indicator.toLowerCase()),
    );
  }

  /**
   * 判断是否是人机验证错误
   */
  private isHumanVerificationError(error: Error | AxiosError): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const responseData =
      (error as AxiosError).response?.data?.toString().toLowerCase() || '';

    const verificationKeywords = [
      'human verification',
      'captcha',
      '禁止访问',
      '验证码',
      '人机验证',
    ];

    return verificationKeywords.some(
      (keyword) =>
        errorMessage.includes(keyword) || responseData.includes(keyword),
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 在指定范围内执行随机延迟
   *
   * @description 在最小值和最大值之间生成随机延迟时间并执行延迟。
   * 用于模拟更自然的请求间隔，避免被检测为机器行为。
   *
   * @param {number} minMs - 最小延迟时间（毫秒）
   * @param {number} maxMs - 最大延迟时间（毫秒）
   *
   * @returns {Promise<void>} 延迟完成后的Promise
   *
   * @example
   * ```typescript
   * // 在5-10秒之间随机延迟
   * await antiSpiderService.sleepRange(5000, 10000);
   * ```
   */
  async sleepRange(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await this.sleep(delay);
  }

  /**
   * 获取当前请求统计信息
   *
   * @description 返回服务的当前状态统计，包括请求计数、延迟模式等信息。
   * 用于监控和调试反爬虫策略的执行状态。
   *
   * @returns {object} 包含以下属性的统计对象：
   * - requestCount: 当前请求计数
   * - isSlowMode: 是否处于慢速模式
   * - slowModeThreshold: 慢速模式触发阈值
   * - baseDelay: 基础延迟时间
   * - slowDelay: 慢速模式延迟时间
   *
   * @example
   * ```typescript
   * const stats = antiSpiderService.getRequestStats();
   * console.log(`已请求 ${stats.requestCount} 次，慢速模式: ${stats.isSlowMode}`);
   * ```
   */
  getRequestStats() {
    return {
      requestCount: this.requestCount,
      isSlowMode: this.requestCount > this.slowModeThreshold,
      slowModeThreshold: this.slowModeThreshold,
      baseDelay: this.baseDelay,
      slowDelay: this.slowDelay,
    };
  }

  /**
   * 重置请求计数器为0
   *
   * @description 将内部请求计数器重置为0，使服务回到正常延迟模式。
   * 通常在开始新的爬取任务或需要重新开始计数时使用。
   * 会记录重置前后的计数值到日志中。
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * antiSpiderService.resetRequestCount();
   * // 请求计数器已重置，下次请求将使用正常模式延迟
   * ```
   */
  resetRequestCount(): void {
    const oldCount = this.requestCount;
    this.requestCount = 0;
    this.logger.log(`Request count reset from ${oldCount} to 0`);
  }

  /**
   * 手动设置请求计数器值（主要用于测试）
   *
   * @description 直接设置内部请求计数器的值，主要用于测试场景。
   * 在生产环境中应谨慎使用，因为它会影响延迟策略的执行。
   *
   * @param {number} count - 要设置的请求计数值
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * // 设置为慢速模式阈值以上，测试慢速延迟
   * antiSpiderService.setRequestCount(250);
   * ```
   */
  setRequestCount(count: number): void {
    this.requestCount = count;
    this.logger.debug(`Request count manually set to ${count}`);
  }

  /**
   * 验证用户Cookie的有效性
   *
   * @description 通过访问用户主页来验证Cookie是否有效。
   * 检查以下情况：
   * - Cookie是否已失效（需要重新登录）
   * - 账号是否受限或需要验证
   * - 网络连接是否正常
   *
   * @param {string} userId - 豆瓣用户ID
   * @param {string} cookie - 要验证的Cookie字符串
   *
   * @returns {Promise<{isValid: boolean; error?: string}>} 验证结果对象：
   * - isValid: 是否有效
   * - error: 错误信息（仅当isValid为false时存在）
   *
   * @throws {Error} 当网络请求失败或遇到意外错误时抛出
   *
   * @example
   * ```typescript
   * const result = await antiSpiderService.validateCookie('12345', 'cookieString');
   * if (result.isValid) {
   *   console.log('Cookie有效');
   * } else {
   *   console.log('Cookie无效:', result.error);
   * }
   * ```
   */
  async validateCookie(
    userId: string,
    cookie: string,
  ): Promise<{
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
          error: 'Cookie已失效，需要重新登录',
        };
      }

      // 检查是否被限制访问
      if (this.isHumanVerificationRequired(html) || this.isBlocked(html)) {
        return {
          isValid: false,
          error: '账号受限或需要验证',
        };
      }

      return { isValid: true };
    } catch (error) {
      this.logger.error(`Cookie validation failed:`, error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Cookie验证失败',
      };
    }
  }

  /**
   * 获取当前延迟配置信息
   *
   * @description 根据当前请求计数返回当前使用的延迟配置。
   * 包括延迟模式、基础延迟、随机范围和预期延迟时间等信息。
   *
   * @returns {object} 延迟配置对象，包含以下属性：
   * - mode: 当前模式（'normal' 或 'slow'）
   * - baseDelay: 基础延迟时间（毫秒）
   * - randomRange: 随机延迟范围（毫秒）
   * - expectedDelay: 预期延迟时间（字符串格式，包含单位）
   *
   * @example
   * ```typescript
   * const config = antiSpiderService.getCurrentDelayConfig();
   * console.log(`当前模式: ${config.mode}, 预期延迟: ${config.expectedDelay}`);
   * ```
   */
  getCurrentDelayConfig() {
    const isSlowMode = this.requestCount > this.slowModeThreshold;

    return {
      mode: isSlowMode ? 'slow' : 'normal',
      baseDelay: isSlowMode ? this.slowDelay : this.baseDelay,
      randomRange: isSlowMode ? this.slowRandomDelay : this.randomDelay,
      expectedDelay: isSlowMode
        ? `${this.slowDelay + this.slowRandomDelay / 2}ms`
        : `${this.baseDelay + this.randomDelay / 2}ms`,
    };
  }
}
