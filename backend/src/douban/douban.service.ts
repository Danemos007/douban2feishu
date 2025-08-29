import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FetchUserDataDto } from './dto/douban.dto';
import { DoubanItem } from './interfaces/douban.interface';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { BookScraperService, BookData } from './services/book-scraper.service';

/**
 * 豆瓣服务 - 基于obsidian-douban的成熟反爬虫策略
 * 
 * 核心特性:
 * - 智能请求延迟 (4-15秒动态调整)
 * - Cookie认证机制
 * - 人机验证检测
 * - 数据解析和标准化
 * - 错误处理和重试
 */
@Injectable()
export class DoubanService {
  private readonly logger = new Logger(DoubanService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cookieManager: CookieManagerService,
    private readonly antiSpider: AntiSpiderService,
    private readonly bookScraper: BookScraperService,
  ) {}

  /**
   * 抓取用户豆瓣数据 - 主要入口方法
   */
  async fetchUserData(fetchDto: FetchUserDataDto): Promise<DoubanItem[]> {
    this.logger.log(`Starting to fetch ${fetchDto.category} data for user ${fetchDto.userId}`);
    
    try {
      // 验证Cookie格式
      if (!this.cookieManager.validateCookieFormat(fetchDto.cookie)) {
        throw new Error('Invalid cookie format');
      }

      // 解密Cookie (如果已加密)
      let cookie = fetchDto.cookie;
      if (fetchDto.isEncrypted) {
        cookie = await this.cookieManager.decryptCookie(fetchDto.userId, fetchDto.cookie);
      }

      // 验证Cookie有效性
      const validation = await this.antiSpider.validateCookie(fetchDto.userId, cookie);
      if (!validation.isValid) {
        throw new Error(`Cookie validation failed: ${validation.error}`);
      }

      let results: DoubanItem[] = [];

      // 根据类型调用不同的抓取器
      switch (fetchDto.category) {
        case 'books':
          const bookData = await this.fetchBooks(fetchDto.userId, cookie, fetchDto);
          results = bookData.map(this.mapBookToDoubanItem);
          break;
          
        case 'movies':
          // TODO: 实现电影抓取
          throw new Error('Movie scraping not implemented yet');
          
        case 'tv':
          // TODO: 实现电视剧抓取  
          throw new Error('TV show scraping not implemented yet');
          
        default:
          throw new Error(`Unsupported category: ${fetchDto.category}`);
      }

      this.logger.log(`Successfully fetched ${results.length} ${fetchDto.category} items`);
      return results;

    } catch (error) {
      this.logger.error(`Failed to fetch ${fetchDto.category} data:`, error);
      throw error;
    }
  }

  /**
   * 抓取书籍数据
   */
  private async fetchBooks(userId: string, cookie: string, fetchDto: FetchUserDataDto): Promise<BookData[]> {
    return await this.bookScraper.fetchUserBooks(userId, cookie, {
      status: fetchDto.status,
      limit: fetchDto.limit
    });
  }

  /**
   * 将BookData映射为DoubanItem
   */
  private mapBookToDoubanItem(book: BookData): DoubanItem {
    return {
      id: book.subjectId,
      title: book.title,
      category: 'book',
      rating: book.score,
      userRating: book.myRating,
      tags: book.myTags || [],
      status: book.myState || 'collect',
      comment: book.myComment,
      dateMarked: book.markDate,
      metadata: {
        subTitle: book.subTitle,
        originalTitle: book.originalTitle,
        author: book.author,
        translator: book.translator,
        publisher: book.publisher,
        datePublished: book.datePublished,
        isbn: book.isbn,
        pages: book.totalPage,
        price: book.price,
        binding: book.binding,
        series: book.series,
        producer: book.producer,
        description: book.desc,
        image: book.image,
        url: book.url
      }
    };
  }

  /**
   * 验证Cookie有效性
   */
  async validateCookie(userId: string, cookie: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    return await this.antiSpider.validateCookie(userId, cookie);
  }

  /**
   * 加密并存储Cookie
   */
  async encryptCookie(userId: string, rawCookie: string): Promise<string> {
    // 验证格式
    if (!this.cookieManager.validateCookieFormat(rawCookie)) {
      throw new Error('Invalid cookie format');
    }

    // 清理Cookie
    const cleanedCookie = this.cookieManager.sanitizeCookie(rawCookie);
    
    // 加密存储
    return await this.cookieManager.encryptCookie(userId, cleanedCookie);
  }

  /**
   * 获取抓取统计信息
   */
  getScrapingStats() {
    return {
      antiSpider: this.antiSpider.getRequestStats(),
      books: this.bookScraper.getScrapingStats()
    };
  }

  /**
   * 重置请求计数器
   */
  resetRequestCount(): void {
    this.antiSpider.resetRequestCount();
    this.logger.log('Request count reset');
  }
}