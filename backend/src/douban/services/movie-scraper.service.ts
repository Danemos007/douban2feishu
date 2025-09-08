/**
 * 豆瓣电影数据抓取服务
 *
 * 特性：
 * - 基于Zod Schema的完整类型安全验证
 * - 智能分类识别：电影/电视剧/纪录片
 * - 统一的解析策略和错误处理
 * - 面向未来的API设计（破坏性变更以获得最佳架构）
 * - 完整的性能监控和批量处理支持
 * 
 * @version 3.0.0 - Future-First Architecture
 */

import { Injectable, Logger } from '@nestjs/common';
import { AntiSpiderService } from './anti-spider.service';
import { HtmlParserService } from './html-parser.service';
import {
  validateMovieComplete,
  validateTvSeriesComplete, 
  validateDocumentaryComplete,
  type MovieComplete,
  type TvSeriesComplete,
  type DocumentaryComplete,
  type UserStatus,
  type DoubanItem,
} from '../schemas';
import * as cheerio from 'cheerio';

/**
 * 电影/影视内容联合类型
 */
export type MediaContent = MovieComplete | TvSeriesComplete | DocumentaryComplete;

/**
 * 内容类型枚举
 */
export type MediaType = 'movie' | 'tv' | 'documentary';

/**
 * 抓取结果接口
 */
export interface MediaScrapingResult {
  success: boolean;
  data?: MediaContent;
  type?: MediaType;
  errors: string[];
  warnings: string[];
  performance: {
    startTime: Date;
    endTime: Date;
    durationMs: number;
    parsingStrategy: string;
    classification: string;
  };
}

/**
 * 批量抓取结果
 */
export interface MediaBatchResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  byType: {
    movies: MovieComplete[];
    tvSeries: TvSeriesComplete[];
    documentaries: DocumentaryComplete[];
  };
  errors: Array<{ mediaId: string; error: string }>;
  performance: {
    startTime: Date;
    endTime: Date;
    totalDurationMs: number;
    averageDurationPerItem: number;
  };
}

/**
 * 媒体列表项接口
 */
export interface MediaListItem {
  id: string;
  title: string;
  url: string;
  dateText?: string;
}

/**
 * @deprecated 旧的MovieData接口，仅供向后兼容
 */
export interface MovieData {
  subjectId: string;
  title: string;
  subtitle?: string;
  originalTitle?: string;
  doubanRating?: number;
  image?: string;
  description?: string;
  director: string[];
  writer: string[];
  cast: string[];
  genre: string[];
  country: string[];
  language: string[];
  releaseYear?: string;
  releaseDate?: string;
  duration?: string;
  episodes?: string;
  myRating?: number;
  myTags: string[];
  myStatus?: string;
  myComment?: string;
  markDate?: Date;
  type: 'movie' | 'tv' | 'documentary';
}

/**
 * 豆瓣电影/影视抓取服务
 * 
 * 重构原则：
 * - 面向未来优先：不考虑向后兼容，追求最佳架构
 * - 类型安全优先：完整的Zod Schema运行时验证
 * - 简洁API优先：统一的方法命名和参数结构
 * - 性能优先：批量处理和智能缓存
 * - 错误处理优先：详细的错误信息和恢复策略
 */
@Injectable()
export class MovieScraperService {
  private readonly logger = new Logger(MovieScraperService.name);

  constructor(
    private readonly antiSpiderService: AntiSpiderService,
    private readonly htmlParserService: HtmlParserService,
  ) {}

  /**
   * 获取用户的影视内容详情 - 新的统一API
   * 
   * @param mediaId 媒体ID（豆瓣subject ID）
   * @param cookie 用户Cookie
   * @param expectedType 期望的媒体类型（可选，用于优化解析）
   * @returns 类型安全的抓取结果
   */
  async scrapeMediaContent(
    mediaId: string,
    cookie: string,
    expectedType?: MediaType,
  ): Promise<MediaScrapingResult> {
    const startTime = new Date();
    const url = `https://movie.douban.com/subject/${mediaId}/`;

    try {
      this.logger.debug(`Scraping media content: ${url}`);
      
      // 使用AntiSpiderService进行安全请求
      const html = await this.antiSpiderService.makeRequest(url, cookie);
      
      // 使用类型安全的HtmlParserService解析
      const parseResult = await this.htmlParserService.parseDoubanItem(html, url, 'movies');
      
      if (parseResult.success && parseResult.data) {
        // 智能分类识别
        const detectedType = this.classifyMediaType(parseResult.data);
        const finalType = expectedType || detectedType;
        
        // 根据类型进行特定验证
        const validationResult = await this.validateByType(parseResult.data, finalType);
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        if (validationResult.success) {
          this.logger.debug(`Successfully scraped ${finalType}: ${validationResult.data.title}`);
          
          return {
            success: true,
            data: validationResult.data,
            type: finalType,
            errors: parseResult.errors,
            warnings: parseResult.warnings,
            performance: {
              startTime,
              endTime,
              durationMs: duration,
              parsingStrategy: parseResult.parsingStrategy || 'mixed',
              classification: `${detectedType}${expectedType ? ` -> ${expectedType}` : ''}`,
            },
          };
        } else {
          return {
            success: false,
            errors: [`Type validation failed: ${validationResult.error}`],
            warnings: parseResult.warnings,
            performance: {
              startTime,
              endTime,
              durationMs: duration,
              parsingStrategy: parseResult.parsingStrategy || 'mixed',
              classification: `validation-failed:${finalType}`,
            },
          };
        }
      } else {
        const endTime = new Date();
        return {
          success: false,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          performance: {
            startTime,
            endTime,
            durationMs: endTime.getTime() - startTime.getTime(),
            parsingStrategy: parseResult.parsingStrategy || 'failed',
            classification: 'parse-failed',
          },
        };
      }
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`Failed to scrape media ${mediaId}:`, error);
      
      return {
        success: false,
        errors: [errorMessage],
        warnings: [],
        performance: {
          startTime,
          endTime,
          durationMs: endTime.getTime() - startTime.getTime(),
          parsingStrategy: 'error',
          classification: 'network-error',
        },
      };
    }
  }

  /**
   * 批量抓取用户的影视内容 - 新的统一批量API
   * 
   * @param userId 用户ID
   * @param cookie 用户Cookie
   * @param options 抓取选项
   * @returns 批量抓取结果，按类型分组
   */
  async batchScrapeUserMedia(
    userId: string,
    cookie: string,
    options: {
      status?: UserStatus;
      limit?: number;
      continueOnError?: boolean;
      includeDetails?: boolean;
    } = {},
  ): Promise<MediaBatchResult> {
    const startTime = new Date();
    const { status = 'collect', limit = 100, continueOnError = true, includeDetails = true } = options;

    try {
      this.logger.log(`[Batch] Starting media scraping for user ${userId} (${status})`);
      
      // 1. 获取列表页数据
      const listItems = await this.scrapeMediaList(userId, cookie, status, limit);
      this.logger.log(`Found ${listItems.length} media items`);

      // 2. 初始化结果容器
      const result: MediaBatchResult = {
        success: false,
        total: listItems.length,
        succeeded: 0,
        failed: 0,
        byType: {
          movies: [],
          tvSeries: [],
          documentaries: [],
        },
        errors: [],
        performance: {
          startTime,
          endTime: new Date(),
          totalDurationMs: 0,
          averageDurationPerItem: 0,
        },
      };

      if (!includeDetails || listItems.length === 0) {
        const endTime = new Date();
        result.performance.endTime = endTime;
        result.performance.totalDurationMs = endTime.getTime() - startTime.getTime();
        result.success = listItems.length > 0;
        return result;
      }

      // 3. 批量获取详情
      for (const item of listItems) {
        try {
          const mediaResult = await this.scrapeMediaContent(item.id, cookie);
          
          if (mediaResult.success && mediaResult.data && mediaResult.type) {
            // 按类型分组存储
            switch (mediaResult.type) {
              case 'movie':
                result.byType.movies.push(mediaResult.data as MovieComplete);
                break;
              case 'tv':
                result.byType.tvSeries.push(mediaResult.data as TvSeriesComplete);
                break;
              case 'documentary':
                result.byType.documentaries.push(mediaResult.data as DocumentaryComplete);
                break;
            }
            result.succeeded++;
            
            this.logger.debug(`✓ Scraped ${mediaResult.type}: ${mediaResult.data.title}`);
          } else {
            result.errors.push({ mediaId: item.id, error: mediaResult.errors.join(', ') });
            result.failed++;
            
            if (!continueOnError) {
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({ mediaId: item.id, error: errorMessage });
          result.failed++;
          
          this.logger.warn(`✗ Failed to scrape media ${item.id}: ${errorMessage}`);
          
          if (!continueOnError) {
            break;
          }
        }
      }

      // 4. 计算最终结果
      const endTime = new Date();
      const totalDuration = endTime.getTime() - startTime.getTime();
      
      result.success = result.succeeded > 0;
      result.performance = {
        startTime,
        endTime,
        totalDurationMs: totalDuration,
        averageDurationPerItem: result.total > 0 ? totalDuration / result.total : 0,
      };

      this.logger.log(
        `[Batch] Completed: ${result.succeeded}/${result.total} success ` +
        `(Movies: ${result.byType.movies.length}, TV: ${result.byType.tvSeries.length}, Docs: ${result.byType.documentaries.length})`,
      );
      
      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`[Batch] Failed to scrape media for user ${userId}:`, error);
      
      return {
        success: false,
        total: 0,
        succeeded: 0,
        failed: 1,
        byType: { movies: [], tvSeries: [], documentaries: [] },
        errors: [{ mediaId: 'BATCH_FETCH', error: errorMessage }],
        performance: {
          startTime,
          endTime,
          totalDurationMs: endTime.getTime() - startTime.getTime(),
          averageDurationPerItem: 0,
        },
      };
    }
  }

  /**
   * 抓取媒体列表 - 内部方法
   */
  private async scrapeMediaList(
    userId: string,
    cookie: string,
    status: UserStatus,
    limit: number,
  ): Promise<MediaListItem[]> {
    const items: MediaListItem[] = [];
    let start = 0;
    const pageSize = 30;

    while (items.length < limit) {
      const url = this.buildListUrl(userId, status, start);
      
      try {
        const html = await this.antiSpiderService.makeRequest(url, cookie);
        const $ = cheerio.load(html);
        
        // 使用HtmlParserService解析列表页
        const listPage = this.htmlParserService.parseListPage($ as any);
        
        if (listPage.items.length === 0) {
          this.logger.debug(`No more items found at start=${start}`);
          break;
        }
        
        // 转换为MediaListItem格式
        const mediaItems: MediaListItem[] = listPage.items.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          dateText: '', // 从列表页可能无法获取，但保持接口一致
        }));
        
        items.push(...mediaItems);
        
        // 检查是否还有更多页面
        if (!listPage.hasMore || listPage.items.length < pageSize) {
          break;
        }
        
        start += pageSize;
      } catch (error) {
        this.logger.error(`Failed to fetch list page at start=${start}:`, error);
        break;
      }
    }

    return items.slice(0, limit);
  }

  /**
   * 构建列表页URL
   */
  private buildListUrl(userId: string, status: UserStatus, start: number): string {
    const baseParams = `start=${start}&sort=time&rating=all&filter=all&mode=list`;
    return `https://movie.douban.com/people/${userId}/${status}?${baseParams}`;
  }

  /**
   * 智能媒体类型分类
   */
  private classifyMediaType(data: DoubanItem): MediaType {
    // 优先检查显式类型信息
    if ('category' in data) {
      switch (data.category) {
        case 'movies': return 'movie';
        case 'tv': return 'tv';
        case 'documentary': return 'documentary';
      }
    }
    
    // 基于genres智能分类
    const genres = ('genres' in data ? data.genres : []) || [];
    const genreStr = genres.join(' ').toLowerCase();
    
    // 优先识别纪录片
    if (genreStr.includes('纪录片') || genreStr.includes('documentary')) {
      return 'documentary';
    }
    
    // 检查是否有电视剧特有字段
    if ('episodeCount' in data && data.episodeCount) {
      return 'tv';
    }
    
    if ('episodeDuration' in data && data.episodeDuration) {
      return 'tv';
    }
    
    if ('firstAirDate' in data && data.firstAirDate) {
      return 'tv';
    }
    
    // 检查电视剧相关的类型标识
    const tvKeywords = ['电视剧', 'tv', 'series', '剧集', '连续剧', '网剧'];
    for (const keyword of tvKeywords) {
      if (genreStr.includes(keyword)) {
        return 'tv';
      }
    }
    
    // 默认为电影
    return 'movie';
  }

  /**
   * 根据类型进行特定验证
   */
  private async validateByType(
    data: DoubanItem,
    type: MediaType,
  ): Promise<{ success: true; data: MediaContent } | { success: false; error: string }> {
    try {
      switch (type) {
        case 'movie': {
          const result = validateMovieComplete(data);
          if (result.success) {
            return { success: true, data: result.data };
          } else {
            return { success: false, error: result.error };
          }
        }
        
        case 'tv': {
          const result = validateTvSeriesComplete(data);
          if (result.success) {
            return { success: true, data: result.data };
          } else {
            return { success: false, error: result.error };
          }
        }
        
        case 'documentary': {
          const result = validateDocumentaryComplete(data);
          if (result.success) {
            return { success: true, data: result.data };
          } else {
            return { success: false, error: result.error };
          }
        }
        
        default:
          return { success: false, error: `Unknown media type: ${type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 批量验证媒体内容
   */
  validateMediaBatch(items: unknown[]): {
    valid: {
      movies: MovieComplete[];
      tvSeries: TvSeriesComplete[];
      documentaries: DocumentaryComplete[];
    };
    invalid: Array<{ index: number; data: unknown; errors: string[] }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      byType: { movies: number; tvSeries: number; documentaries: number };
      successRate: number;
    };
  } {
    const valid = {
      movies: [] as MovieComplete[],
      tvSeries: [] as TvSeriesComplete[],
      documentaries: [] as DocumentaryComplete[],
    };
    const invalid: Array<{ index: number; data: unknown; errors: string[] }> = [];

    items.forEach((item, index) => {
      // 尝试智能分类
      const detectedType = this.classifyMediaType(item as DoubanItem);
      
      // 验证对应类型
      let validation: { success: boolean; data?: any; error?: string };
      
      switch (detectedType) {
        case 'movie':
          validation = validateMovieComplete(item);
          if (validation.success && validation.data) {
            valid.movies.push(validation.data);
          } else {
            invalid.push({ index, data: item, errors: [validation.error || 'Movie validation failed'] });
          }
          break;
          
        case 'tv':
          validation = validateTvSeriesComplete(item);
          if (validation.success && validation.data) {
            valid.tvSeries.push(validation.data);
          } else {
            invalid.push({ index, data: item, errors: [validation.error || 'TV series validation failed'] });
          }
          break;
          
        case 'documentary':
          validation = validateDocumentaryComplete(item);
          if (validation.success && validation.data) {
            valid.documentaries.push(validation.data);
          } else {
            invalid.push({ index, data: item, errors: [validation.error || 'Documentary validation failed'] });
          }
          break;
          
        default:
          invalid.push({ index, data: item, errors: [`Unknown media type: ${detectedType}`] });
      }
    });

    const validCount = valid.movies.length + valid.tvSeries.length + valid.documentaries.length;
    const summary = {
      total: items.length,
      valid: validCount,
      invalid: invalid.length,
      byType: {
        movies: valid.movies.length,
        tvSeries: valid.tvSeries.length,
        documentaries: valid.documentaries.length,
      },
      successRate: items.length > 0 ? (validCount / items.length) * 100 : 0,
    };

    this.logger.log(
      `Batch validation: ${validCount}/${items.length} valid ` +
      `(M:${valid.movies.length}, TV:${valid.tvSeries.length}, D:${valid.documentaries.length})`,
    );

    return { valid, invalid, summary };
  }

  /**
   * 获取抓取统计信息
   */
  getScrapingStats() {
    return this.antiSpiderService.getRequestStats();
  }

  /**
   * 根据类型获取字段映射配置
   */
  getFieldMappingByType(type: MediaType): string[] {
    const baseFields = [
      'Subject ID',
      '我的标签', 
      '我的状态',
      '类型',
      '片名',
      '封面图',
      '豆瓣评分',
      '我的备注',
      '剧情简介',
      '我的评分',
      '主演',
      '导演', 
      '编剧',
      '制片地区',
      '语言',
      '标记日期',
    ];

    switch (type) {
      case 'movie':
        return [...baseFields, '片长', '上映日期'];
      case 'tv':
      case 'documentary':
        return [...baseFields, '单集片长', '集数', '首播日期'];
      default:
        return baseFields;
    }
  }

  // ======================================
  // 向后兼容的遗留方法（标记为deprecated）
  // ======================================

  /**
   * @deprecated 使用 scrapeMediaContent() 替代
   */
  async getMovieDetail(movieId: string, cookie: string): Promise<MovieData> {
    const result = await this.scrapeMediaContent(movieId, cookie, 'movie');
    
    if (result.success && result.data) {
      return this.convertToLegacyFormat(result.data, result.type!);
    } else {
      throw new Error(`Failed to get movie detail: ${result.errors.join(', ')}`);
    }
  }

  /**
   * @deprecated 使用 batchScrapeUserMedia() 替代
   */
  async getAllUserMovies(
    userId: string,
    cookie: string,
    status: 'collect' | 'wish' | 'do' = 'collect',
    limit = 1000,
  ): Promise<any[]> {
    const result = await this.batchScrapeUserMedia(userId, cookie, {
      status: status as UserStatus,
      limit,
      includeDetails: true,
    });
    
    // 转换为旧格式
    const legacyItems: any[] = [];
    
    result.byType.movies.forEach(movie => {
      legacyItems.push(this.convertToLegacyFormat(movie, 'movie'));
    });
    
    result.byType.tvSeries.forEach(tv => {
      legacyItems.push(this.convertToLegacyFormat(tv, 'tv'));
    });
    
    result.byType.documentaries.forEach(doc => {
      legacyItems.push(this.convertToLegacyFormat(doc, 'documentary'));
    });
    
    return legacyItems;
  }

  /**
   * @deprecated 使用 batchScrapeUserMedia() 的 includeDetails: false 替代
   */
  async getUserMovieList(
    userId: string,
    cookie: string,
    page = 0,
    status: 'collect' | 'wish' | 'do' = 'collect',
  ): Promise<{ items: any[]; total: number }> {
    const start = page * 30;
    const url = this.buildListUrl(userId, status as UserStatus, start);
    
    try {
      const html = await this.antiSpiderService.makeRequest(url, cookie);
      const $ = cheerio.load(html);
      const listPage = this.htmlParserService.parseListPage($ as any);
      
      return {
        items: listPage.items.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          dateText: '',
        })),
        total: listPage.total,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取电影列表失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * @deprecated 使用 getFieldMappingByType() 替代
   */
  getFieldMapping(type: 'movie' | 'tv' | 'documentary'): string[] {
    return this.getFieldMappingByType(type);
  }

  /**
   * 转换为旧格式 - 向后兼容
   */
  private convertToLegacyFormat(data: MediaContent, type: MediaType): MovieData {
    const baseData: MovieData = {
      subjectId: data.subjectId,
      title: data.title,
      subtitle: undefined, // 简化处理，不使用subtitle字段
      originalTitle: data.originalTitle,
      doubanRating: data.rating?.average,
      image: data.coverUrl,
      description: data.summary,
      director: data.directors || [],
      writer: data.writers || [],
      cast: data.cast || [],
      genre: data.genres || [],
      country: data.countries || [],
      language: data.languages || [],
      releaseYear: data.year?.toString(),
      releaseDate: ('releaseDate' in data) ? data.releaseDate : ('firstAirDate' in data) ? data.firstAirDate : undefined,
      duration: ('duration' in data) ? data.duration : ('episodeDuration' in data) ? data.episodeDuration : undefined,
      episodes: ('episodeCount' in data) ? data.episodeCount?.toString() : undefined,
      myRating: data.userRating,
      myTags: data.userTags || [],
      myStatus: data.userStatus,
      myComment: data.userComment,
      markDate: data.readDate,
      type,
    };
    
    return baseData;
  }
}