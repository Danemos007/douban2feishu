import { Injectable, Logger } from '@nestjs/common';
import { CryptoService } from '../../common/crypto/crypto.service';

/**
 * Cookie管理服务 - 基于obsidian-douban的Cookie认证策略
 *
 * 功能:
 * - 安全存储Cookie (AES-256加密)
 * - Headers构建和管理
 * - Cookie有效性验证
 */
@Injectable()
export class CookieManagerService {
  private readonly logger = new Logger(CookieManagerService.name);

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * 获取豆瓣请求Headers - 基于obsidian-douban的Headers配置
   */
  getDoubanHeaders(cookie?: string): Record<string, string> {
    const headers = {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Host: 'www.douban.com',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    };

    // 添加Cookie如果提供
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    return headers;
  }

  /**
   * 根据不同域名调整Host头
   */
  getHeadersForDomain(
    domain: 'book' | 'movie' | 'music' | 'www',
    cookie?: string,
  ): Record<string, string> {
    const headers = this.getDoubanHeaders(cookie);

    const hostMap = {
      book: 'book.douban.com',
      movie: 'movie.douban.com',
      music: 'music.douban.com',
      www: 'www.douban.com',
    };

    headers['Host'] = hostMap[domain];
    return headers;
  }

  /**
   * 加密存储Cookie
   */
  async encryptCookie(userId: string, rawCookie: string): Promise<string> {
    try {
      const iv = this.cryptoService.generateIV();
      const encrypted = this.cryptoService.encrypt(rawCookie, userId, iv);
      this.logger.debug(`Cookie encrypted for user ${userId}`);
      return encrypted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to encrypt cookie for user ${userId}:`,
        errorMessage,
      );
      throw new Error('Cookie encryption failed');
    }
  }

  /**
   * 解密Cookie
   */
  async decryptCookie(
    userId: string,
    encryptedCookie: string,
  ): Promise<string> {
    try {
      const decrypted = this.cryptoService.decrypt(encryptedCookie, userId);
      this.logger.debug(`Cookie decrypted for user ${userId}`);
      return decrypted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to decrypt cookie for user ${userId}:`,
        errorMessage,
      );
      throw new Error('Cookie decryption failed');
    }
  }

  /**
   * 验证Cookie格式
   */
  validateCookieFormat(cookie: string): boolean {
    // 检查Cookie格式是否合理 - 更宽松的正则表达式
    const cookiePattern = /^[a-zA-Z0-9_=;%\-\s\.":'/]+$/;

    if (!cookiePattern.test(cookie)) {
      this.logger.warn('Invalid cookie format detected');
      return false;
    }

    // 检查是否包含必要的豆瓣Cookie字段
    const requiredFields = ['bid', 'dbcl2'];
    const hasRequired = requiredFields.some((field) => cookie.includes(field));

    if (!hasRequired) {
      this.logger.warn('Cookie missing required douban fields');
      return false;
    }

    return true;
  }

  /**
   * 清理Cookie字符串
   */
  sanitizeCookie(cookie: string): string {
    // 移除多余的空格和换行
    return cookie.replace(/\r?\n/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * 从Cookie中提取用户ID (如果可能)
   */
  extractUserIdFromCookie(cookie: string): string | null {
    const match = cookie.match(/dbcl2="(\d+):/);
    return match ? match[1] : null;
  }

  /**
   * 检查Cookie是否即将过期 (启发式判断)
   */
  isCookieLikelyExpired(cookie: string): boolean {
    // 检查Cookie中的时间戳或其他过期指标
    // 这是一个启发式方法，真正的验证需要实际请求

    // 检查bid字段是否存在(通常是持久性Cookie)
    if (!cookie.includes('bid=')) {
      return true;
    }

    // 如果Cookie太短，可能不完整
    if (cookie.length < 50) {
      return true;
    }

    return false;
  }

  /**
   * 创建Cookie备份和版本管理
   */
  createCookieBackup(
    userId: string,
    cookie: string,
  ): {
    timestamp: Date;
    cookieHash: string;
    preview: string;
  } {
    const timestamp = new Date();
    // 简单的hash实现
    const cookieHash = require('crypto')
      .createHash('sha256')
      .update(cookie)
      .digest('hex')
      .substring(0, 16);
    const preview = cookie.substring(0, 50) + '...';

    return {
      timestamp,
      cookieHash,
      preview,
    };
  }
}
