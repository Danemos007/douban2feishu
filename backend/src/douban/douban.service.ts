import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FetchUserDataDto } from './dto/douban.dto';
import { DoubanItem } from './interfaces/douban.interface';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { BookScraperService, BookData } from './services/book-scraper.service';
import { DataTransformationService } from './services/data-transformation.service';

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
    private readonly dataTransformation: DataTransformationService,
  ) {}

  /**
   * 抓取用户豆瓣数据 - 主要入口方法
   */
  async fetchUserData(fetchDto: FetchUserDataDto): Promise<DoubanItem[]> {
    this.logger.log(
      `Starting to fetch ${fetchDto.category} data for user ${fetchDto.userId}`,
    );

    try {
      // 验证Cookie格式
      if (!this.cookieManager.validateCookieFormat(fetchDto.cookie)) {
        throw new Error('Invalid cookie format');
      }

      // 解密Cookie (如果已加密)
      let cookie = fetchDto.cookie;
      if (fetchDto.isEncrypted) {
        cookie = await this.cookieManager.decryptCookie(
          fetchDto.userId,
          fetchDto.cookie,
        );
      }

      // 验证Cookie有效性
      const validation = await this.antiSpider.validateCookie(
        fetchDto.userId,
        cookie,
      );
      if (!validation.isValid) {
        throw new Error(`Cookie validation failed: ${validation.error}`);
      }

      let results: DoubanItem[] = [];

      // 根据类型调用不同的抓取器
      switch (fetchDto.category) {
        case 'books':
          const bookData = await this.fetchBooks(
            fetchDto.userId,
            cookie,
            fetchDto,
          );
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

      this.logger.log(
        `Successfully fetched ${results.length} ${fetchDto.category} items`,
      );
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch ${fetchDto.category} data:`,
        errorMessage,
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 抓取并转换用户豆瓣数据 - 企业级集成方法
   */
  async scrapeAndTransform(fetchDto: FetchUserDataDto): Promise<{
    rawData: DoubanItem[];
    transformedData: any[];
    transformationStats: {
      totalProcessed: number;
      repairsApplied: number;
      validationWarnings: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    this.logger.log(
      `Starting scrape and transform for ${fetchDto.category} data`,
    );

    try {
      // 抓取原始数据
      const rawData = await this.fetchUserData(fetchDto);

      // 数据转换配置
      const transformationOptions = {
        enableIntelligentRepairs: true,
        strictValidation: true,
        preserveRawData: false,
      };

      // 执行数据转换 - 逐个处理数组项目
      const transformedData: any[] = [];
      let totalRepairsApplied = 0;
      let totalValidationWarnings = 0;

      for (const item of rawData) {
        const transformationResult =
          await this.dataTransformation.transformDoubanData(
            item as any,
            fetchDto.category,
            transformationOptions,
          );

        transformedData.push(transformationResult.data);
        totalRepairsApplied +=
          transformationResult.statistics?.repairedFields || 0;
        totalValidationWarnings += transformationResult.warnings?.length || 0;
      }

      const processingTime = Date.now() - startTime;

      // 构建统计信息
      const transformationStats = {
        totalProcessed: rawData.length,
        repairsApplied: totalRepairsApplied,
        validationWarnings: totalValidationWarnings,
        processingTime,
      };

      this.logger.log(
        `Transformation completed: ${transformationStats.totalProcessed} items, ${transformationStats.repairsApplied} repairs, ${transformationStats.validationWarnings} warnings`,
      );

      return {
        rawData,
        transformedData,
        transformationStats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to scrape and transform ${fetchDto.category} data:`,
        errorMessage,
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 抓取书籍数据
   */
  private async fetchBooks(
    userId: string,
    cookie: string,
    fetchDto: FetchUserDataDto,
  ): Promise<BookData[]> {
    return await this.bookScraper.fetchUserBooks(userId, cookie, {
      status: fetchDto.status,
      limit: fetchDto.limit,
    });
  }

  /**
   * 将BookData映射为DoubanItem
   */
  private mapBookToDoubanItem(book: BookData): DoubanItem {
    return {
      subjectId: book.subjectId,
      title: book.title,
      category: 'books',
      rating: book.score ? { average: book.score, numRaters: 0 } : undefined,
      userRating: book.myRating,
      userTags: book.myTags || [],
      userComment: book.myComment,
      readDate: book.markDate,
      doubanUrl: `https://book.douban.com/subject/${book.subjectId}/`,
      genres: [],
    };
  }

  /**
   * 验证Cookie有效性
   */
  async validateCookie(
    userId: string,
    cookie: string,
  ): Promise<{
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
      books: this.bookScraper.getScrapingStats(),
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
