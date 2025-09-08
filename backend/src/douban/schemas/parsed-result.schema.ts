/**
 * 豆瓣解析结果Zod验证Schema
 * 
 * 为豆瓣数据解析后的结构化结果提供完整的运行时类型安全保障
 * 与现有 DoubanItem 接口保持兼容，同时提供更严格的验证
 * 
 * 创建时间: 2025-09-08
 * 用途: 解析结果的类型安全和验证，对接飞书同步系统
 */

import { z } from 'zod';

/**
 * 豆瓣条目基础Schema
 * 对应现有的 DoubanItem 接口
 */
export const DoubanItemBaseSchema = z.object({
  // 核心标识
  subjectId: z.string().min(1, '豆瓣ID不能为空'),
  title: z.string().min(1, '标题不能为空'),
  originalTitle: z.string().optional(),
  
  // 基础元数据
  year: z.number().min(1800).max(2100).optional(),
  rating: z.object({
    average: z.number().min(0).max(10),
    numRaters: z.number().min(0),
  }).optional(),
  
  // 分类和描述
  genres: z.array(z.string()).default([]),
  summary: z.string().optional(),
  coverUrl: z.string().url().optional(),
  doubanUrl: z.string().url('豆瓣URL必须是有效的URL'),
  
  // 用户交互数据
  userRating: z.number().min(1).max(5).optional(),
  userComment: z.string().optional(),
  userTags: z.array(z.string()).default([]),
  readDate: z.coerce.date().optional(),
  
  // 条目分类（必须明确）
  category: z.enum(['books', 'movies', 'music']),
  
  // 创作者信息（可选，子类型会重写）
  directors: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([]),
  authors: z.array(z.string()).default([]),
  artists: z.array(z.string()).default([]),
});

/**
 * 豆瓣书籍解析结果Schema
 * 对应现有的 DoubanBook 接口，包含16个标准字段
 */
export const DoubanBookSchema = DoubanItemBaseSchema.extend({
  category: z.literal('books'),
  
  // 书籍专有字段
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publishDate: z.string().optional(),
  pages: z.number().min(1).optional(),
  price: z.string().optional(),
  binding: z.string().optional(),
  
  // 必需的创作者字段
  authors: z.array(z.string()).min(1, '书籍必须至少有一个作者'),
  translators: z.array(z.string()).default([]),
  
  // 覆盖基类的可选字段，书籍不需要这些
  directors: z.array(z.string()).default([]).optional(),
  cast: z.array(z.string()).default([]).optional(),
  artists: z.array(z.string()).default([]).optional(),
}).strict(); // 严格模式，不允许额外字段

/**
 * 豆瓣电影解析结果Schema
 * 对应现有的 DoubanMovie 接口，包含18个标准字段
 */
export const DoubanMovieSchema = DoubanItemBaseSchema.extend({
  category: z.literal('movies'),
  
  // 电影专有字段
  imdbId: z.string().optional(),
  duration: z.string().optional(),
  countries: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  releaseDate: z.string().optional(),
  
  // 必需的创作者字段
  directors: z.array(z.string()).min(1, '电影必须至少有一个导演'),
  writers: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([]),
  
  // 覆盖基类的可选字段，电影不需要这些
  authors: z.array(z.string()).default([]).optional(),
  artists: z.array(z.string()).default([]).optional(),
}).strict();

/**
 * 豆瓣音乐解析结果Schema
 * 对应现有的 DoubanMusic 接口
 */
export const DoubanMusicSchema = DoubanItemBaseSchema.extend({
  category: z.literal('music'),
  
  // 音乐专有字段
  album: z.string().optional(),
  releaseDate: z.string().optional(),
  label: z.string().optional(),
  trackCount: z.number().min(1).optional(),
  duration: z.string().optional(),
  medium: z.string().optional(),
  
  // 必需的创作者字段
  artists: z.array(z.string()).min(1, '音乐必须至少有一个艺术家'),
  
  // 覆盖基类的可选字段，音乐不需要这些
  directors: z.array(z.string()).default([]).optional(),
  cast: z.array(z.string()).default([]).optional(),
  authors: z.array(z.string()).default([]).optional(),
}).strict();

/**
 * 扩展的豆瓣电视剧Schema
 * 新增支持，包含19个字段（比电影多1个集数字段）
 */
export const DoubanTvSeriesSchema = DoubanItemBaseSchema.extend({
  category: z.literal('tv'), // 新的分类
  
  // 电视剧专有字段
  imdbId: z.string().optional(),
  episodeDuration: z.string().optional(), // 单集时长
  episodeCount: z.number().min(1).optional(), // 集数（新增字段）
  countries: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  firstAirDate: z.string().optional(), // 首播日期
  
  // 必需的创作者字段
  directors: z.array(z.string()).min(1, '电视剧必须至少有一个导演'),
  writers: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([]),
  
  // 覆盖基类的可选字段，电视剧不需要这些
  authors: z.array(z.string()).default([]).optional(),
  artists: z.array(z.string()).default([]).optional(),
}).strict();

/**
 * 扩展的豆瓣纪录片Schema  
 * 从电视剧中细分出来，字段基本相同
 */
export const DoubanDocumentarySchema = DoubanItemBaseSchema.extend({
  category: z.literal('documentary'), // 新的分类
  
  // 纪录片专有字段（与电视剧相似）
  imdbId: z.string().optional(),
  episodeDuration: z.string().optional(), 
  episodeCount: z.number().min(1).optional(),
  countries: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  firstAirDate: z.string().optional(),
  
  // 创作者字段（纪录片可能没有传统意义的演员）
  directors: z.array(z.string()).min(1, '纪录片必须至少有一个导演'),
  writers: z.array(z.string()).default([]),
  cast: z.array(z.string()).default([]), // 对于纪录片，可能是受访者
  
  // 覆盖基类的可选字段
  authors: z.array(z.string()).default([]).optional(),
  artists: z.array(z.string()).default([]).optional(),
}).strict();

/**
 * 联合类型Schema - 支持所有豆瓣条目类型
 */
export const DoubanItemSchema = z.discriminatedUnion('category', [
  DoubanBookSchema,
  DoubanMovieSchema,
  DoubanMusicSchema,
  DoubanTvSeriesSchema,
  DoubanDocumentarySchema,
]);

/**
 * 豆瓣批量解析结果Schema
 * 用于处理用户收藏页面的批量数据
 */
export const DoubanBatchResultSchema = z.object({
  items: z.array(DoubanItemSchema),
  pagination: z.object({
    currentPage: z.number().min(1),
    totalPages: z.number().min(1),
    totalItems: z.number().min(0),
    itemsPerPage: z.number().min(1).default(15),
    hasMore: z.boolean(),
  }),
  metadata: z.object({
    userId: z.string(),
    category: z.enum(['books', 'movies', 'tv', 'documentary', 'music']),
    status: z.enum(['wish', 'do', 'collect']),
    scrapedAt: z.date().default(() => new Date()),
    totalProcessingTime: z.number().min(0).optional(),
  }),
  statistics: z.object({
    totalFound: z.number().min(0),
    successful: z.number().min(0),
    failed: z.number().min(0),
    skipped: z.number().min(0),
  }),
  errors: z.array(z.object({
    subjectId: z.string().optional(),
    url: z.string().url().optional(),
    error: z.string(),
    timestamp: z.date().default(() => new Date()),
  })).default([]),
});

/**
 * 解析上下文Schema
 * 记录解析过程的元信息
 */
export const DoubanParsingContextSchema = z.object({
  sourceUrl: z.string().url(),
  parseStrategy: z.enum(['json-ld', 'html-selectors', 'mixed']),
  parsingStages: z.array(z.object({
    stage: z.string(),
    success: z.boolean(),
    duration: z.number().min(0),
    extractedFields: z.array(z.string()),
    warnings: z.array(z.string()).default([]),
  })),
  finalValidation: z.object({
    isValid: z.boolean(),
    fieldsCovered: z.number().min(0),
    totalExpectedFields: z.number().min(0),
    coveragePercentage: z.number().min(0).max(100),
    missingFields: z.array(z.string()).default([]),
    invalidFields: z.array(z.object({
      field: z.string(),
      value: z.unknown(),
      reason: z.string(),
    })).default([]),
  }),
  performanceMetrics: z.object({
    totalDuration: z.number().min(0),
    networkTime: z.number().min(0).optional(),
    parseTime: z.number().min(0),
    validationTime: z.number().min(0),
  }),
});

// Schema已在上面直接导出，这里不需要重复导出

// 类型推断导出
export type DoubanItemBase = z.infer<typeof DoubanItemBaseSchema>;
export type DoubanBook = z.infer<typeof DoubanBookSchema>;
export type DoubanMovie = z.infer<typeof DoubanMovieSchema>;
export type DoubanMusic = z.infer<typeof DoubanMusicSchema>;
export type DoubanTvSeries = z.infer<typeof DoubanTvSeriesSchema>;
export type DoubanDocumentary = z.infer<typeof DoubanDocumentarySchema>;
export type DoubanItem = z.infer<typeof DoubanItemSchema>;
export type DoubanBatchResult = z.infer<typeof DoubanBatchResultSchema>;
export type DoubanParsingContext = z.infer<typeof DoubanParsingContextSchema>;

/**
 * 验证工具函数：验证豆瓣解析结果
 */
export function validateDoubanItem(
  data: unknown
): { success: true; data: DoubanItem } | { success: false; error: string } {
  try {
    const validatedData = DoubanItemSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `豆瓣条目验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证特定类型的豆瓣条目
 */
export function validateDoubanItemByType(
  data: unknown,
  type: 'books' | 'movies' | 'music' | 'tv' | 'documentary'
): { success: true; data: any } | { success: false; error: string } {
  try {
    let schema;
    switch (type) {
      case 'books':
        schema = DoubanBookSchema;
        break;
      case 'movies':
        schema = DoubanMovieSchema;
        break;
      case 'music':
        schema = DoubanMusicSchema;
        break;
      case 'tv':
        schema = DoubanTvSeriesSchema;
        break;
      case 'documentary':
        schema = DoubanDocumentarySchema;
        break;
      default:
        return { success: false, error: '不支持的豆瓣条目类型' };
    }
    
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `${type}条目验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 类型守卫：检查是否为特定类型的豆瓣条目
 */
export function isDoubanBook(item: unknown): item is DoubanBook {
  try {
    DoubanBookSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function isDoubanMovie(item: unknown): item is DoubanMovie {
  try {
    DoubanMovieSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function isDoubanTvSeries(item: unknown): item is DoubanTvSeries {
  try {
    DoubanTvSeriesSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function isDoubanDocumentary(item: unknown): item is DoubanDocumentary {
  try {
    DoubanDocumentarySchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

/**
 * 智能类型推断：根据数据自动判断豆瓣条目类型
 */
export function inferDoubanItemType(data: any): 'books' | 'movies' | 'tv' | 'documentary' | 'music' | 'unknown' {
  if (!data || typeof data !== 'object') return 'unknown';
  
  // 明确的分类字段
  if (data.category && ['books', 'movies', 'tv', 'documentary', 'music'].includes(data.category)) {
    return data.category;
  }
  
  // 基于字段推断
  if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
    return 'books';
  }
  
  if (data.directors && Array.isArray(data.directors) && data.directors.length > 0) {
    if (data.episodeCount || data.firstAirDate) {
      // 检查genres是否包含"纪录片"
      if (data.genres && Array.isArray(data.genres) && 
          data.genres.some((g: string) => g.includes('纪录片'))) {
        return 'documentary';
      }
      return 'tv';
    }
    return 'movies';
  }
  
  if (data.artists && Array.isArray(data.artists) && data.artists.length > 0) {
    return 'music';
  }
  
  return 'unknown';
}