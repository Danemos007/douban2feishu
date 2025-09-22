import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FetchUserDataDto } from './dto/douban.dto';
import { DoubanItem } from './interfaces/douban.interface';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { BookScraperService, BookData } from './services/book-scraper.service';
import { DataTransformationService } from './services/data-transformation.service';
import { RawDataInput } from './types/transformation-generics.types';

/**
 * 飞书表格记录类型定义
 * 基于实际飞书API字段类型的严格定义
 */
interface FeishuTableRecord {
  [fieldName: string]:
    | string
    | number
    | boolean
    | Date
    | string[]
    | null
    | undefined;
}

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
   *
   * @description 根据用户配置抓取豆瓣书影音数据，支持Cookie验证、数据解密和智能反爬虫机制
   * @param fetchDto 抓取配置参数，包含用户ID、Cookie、数据分类等信息
   * @returns Promise<DoubanItem[]> 返回标准化的豆瓣数据项目数组
   * @throws Error 当Cookie格式无效时抛出异常
   * @throws Error 当Cookie验证失败时抛出异常
   * @throws Error 当请求不支持的数据分类时抛出异常
   * @throws Error 当底层服务（解密、验证、抓取）出现错误时抛出异常
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
        cookie = this.cookieManager.decryptCookie(
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
        case 'books': {
          const bookData = await this.fetchBooks(
            fetchDto.userId,
            cookie,
            fetchDto,
          );
          results = bookData.map((book) => this.mapBookToDoubanItem(book));
          break;
        }

        case 'movies':
          // TODO: 实现电影抓取
          throw new Error('Movie scraping not implemented yet');

        case 'tv':
          // TODO: 实现电视剧抓取
          throw new Error('TV show scraping not implemented yet');

        default: {
          // 这行代码将确保我们的 switch 语句始终是完整的
          const _exhaustiveCheck: never = fetchDto.category;

          // 在错误信息中，使用 String() 来获取运行时的值
          throw new Error(`Unsupported category: ${String(fetchDto.category)}`);
        }
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
   *
   * @description 执行完整的数据抓取和转换流程，包含智能修复、验证统计和性能监控
   * @param fetchDto 抓取配置参数，包含用户ID、Cookie、数据分类等信息
   * @returns Promise<{rawData, transformedData, transformationStats}> 返回原始数据、转换后数据和详细统计信息
   * @throws Error 当数据抓取过程中出现错误时抛出异常
   * @throws Error 当数据转换过程中出现错误时抛出异常
   */
  async scrapeAndTransform(fetchDto: FetchUserDataDto): Promise<{
    rawData: DoubanItem[];
    transformedData: FeishuTableRecord[];
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
      const transformedData: FeishuTableRecord[] = [];
      let totalRepairsApplied = 0;
      let totalValidationWarnings = 0;

      for (const item of rawData) {
        const transformationResult =
          this.dataTransformation.transformDoubanData(
            // Reason: DoubanItem lacks string index signature but is runtime-compatible with RawDataInput
            item as unknown as RawDataInput,
            fetchDto.category,
            transformationOptions,
          );

        // Reason: TransformedDataOutput uses 'unknown' but transformation service produces FeishuTableRecord-compatible data
        transformedData.push(transformationResult.data as FeishuTableRecord);
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
   *
   * @description 检查豆瓣Cookie是否有效，包含格式验证和服务端验证
   * @param userId 用户唯一标识符
   * @param cookie 待验证的豆瓣Cookie字符串
   * @returns Promise<{isValid: boolean, error?: string}> 返回验证结果，包含有效性和可能的错误信息
   * @throws Error 当反爬虫服务不可用或验证过程中出现网络错误时抛出异常
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
   *
   * @description 对原始Cookie进行格式验证、清理和AES-256加密处理
   * @param userId 用户唯一标识符，用于生成用户特定的加密密钥
   * @param rawCookie 原始的豆瓣Cookie字符串
   * @returns string 返回加密后的Cookie字符串
   * @throws Error 当Cookie格式无效时抛出异常
   * @throws Error 当Cookie清理或加密过程中出现错误时抛出异常
   */
  encryptCookie(userId: string, rawCookie: string): string {
    // 验证格式
    if (!this.cookieManager.validateCookieFormat(rawCookie)) {
      throw new Error('Invalid cookie format');
    }

    // 清理Cookie
    const cleanedCookie = this.cookieManager.sanitizeCookie(rawCookie);

    // 加密存储
    return this.cookieManager.encryptCookie(userId, cleanedCookie);
  }

  /**
   * 获取抓取统计信息
   *
   * @description 获取豆瓣数据抓取过程的详细统计信息，包含反爬虫和书籍抓取的统计数据
   * @returns object 返回包含反爬虫服务和书籍抓取服务统计信息的对象
   */
  getScrapingStats() {
    return {
      antiSpider: this.antiSpider.getRequestStats(),
      books: this.bookScraper.getScrapingStats(),
    };
  }

  /**
   * 重置请求计数器
   *
   * @description 重置反爬虫服务的请求计数器，用于调试或手动重置慢速模式状态
   * @returns void 无返回值
   */
  resetRequestCount(): void {
    this.antiSpider.resetRequestCount();
    this.logger.log('Request count reset');
  }
}
