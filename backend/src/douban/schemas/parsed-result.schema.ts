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
  rating: z
    .object({
      average: z.number().min(0).max(10),
      numRaters: z.number().min(0),
    })
    .optional(),

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
  errors: z
    .array(
      z.object({
        subjectId: z.string().optional(),
        url: z.string().url().optional(),
        error: z.string(),
        timestamp: z.date().default(() => new Date()),
      }),
    )
    .default([]),
});

/**
 * 解析上下文Schema
 * 记录解析过程的元信息
 */
export const DoubanParsingContextSchema = z.object({
  sourceUrl: z.string().url(),
  parseStrategy: z.enum(['json-ld', 'html-selectors', 'mixed']),
  parsingStages: z.array(
    z.object({
      stage: z.string(),
      success: z.boolean(),
      duration: z.number().min(0),
      extractedFields: z.array(z.string()),
      warnings: z.array(z.string()).default([]),
    }),
  ),
  finalValidation: z.object({
    isValid: z.boolean(),
    fieldsCovered: z.number().min(0),
    totalExpectedFields: z.number().min(0),
    coveragePercentage: z.number().min(0).max(100),
    missingFields: z.array(z.string()).default([]),
    invalidFields: z
      .array(
        z.object({
          field: z.string(),
          value: z.unknown(),
          reason: z.string(),
        }),
      )
      .default([]),
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
 * 验证豆瓣条目数据的完整性和类型正确性
 *
 * @description 使用联合类型Schema对未知数据进行验证，自动判断条目类型并返回验证结果
 * @param data - 待验证的未知类型数据，通常来源于豆瓣网页解析或API响应
 * @returns 验证成功时返回包含验证后数据的对象，失败时返回错误信息
 * @throws 当输入数据不符合任何豆瓣条目Schema时，返回包含详细错误信息的失败结果
 *
 * @example
 * ```typescript
 * const result = validateDoubanItem(rawBookData);
 * if (result.success) {
 *   console.log('验证成功:', result.data.title);
 * } else {
 *   console.error('验证失败:', result.error);
 * }
 * ```
 */
export function validateDoubanItem(
  data: unknown,
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
 * 根据指定类型验证豆瓣条目数据
 *
 * @description 使用特定类型的Schema验证数据，确保数据符合指定豆瓣条目类型的字段要求
 * @param data - 待验证的未知类型数据
 * @param type - 指定的豆瓣条目类型，支持books、movies、music、tv、documentary
 * @returns 验证成功时返回包含验证后数据的对象，失败时返回错误信息
 * @throws 当type参数不在支持范围内时，返回"不支持的豆瓣条目类型"错误
 * @throws 当data不符合指定type的Schema要求时，返回详细的字段验证错误信息
 *
 * @example
 * ```typescript
 * const result = validateDoubanItemByType(rawData, 'books');
 * if (result.success) {
 *   const bookData = result.data as DoubanBook;
 *   console.log('书籍标题:', bookData.title);
 * }
 * ```
 */
export function validateDoubanItemByType(
  data: unknown,
  type: 'books' | 'movies' | 'music' | 'tv' | 'documentary',
): { success: true; data: unknown } | { success: false; error: string } {
  try {
    // 使用类型安全的直接调用，避免schema变量的any类型问题
    switch (type) {
      case 'books': {
        const validatedData = DoubanBookSchema.parse(data);
        return { success: true, data: validatedData };
      }
      case 'movies': {
        const validatedData = DoubanMovieSchema.parse(data);
        return { success: true, data: validatedData };
      }
      case 'music': {
        const validatedData = DoubanMusicSchema.parse(data);
        return { success: true, data: validatedData };
      }
      case 'tv': {
        const validatedData = DoubanTvSeriesSchema.parse(data);
        return { success: true, data: validatedData };
      }
      case 'documentary': {
        const validatedData = DoubanDocumentarySchema.parse(data);
        return { success: true, data: validatedData };
      }
      default:
        return { success: false, error: '不支持的豆瓣条目类型' };
    }
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
 * 类型守卫：检查数据是否为豆瓣书籍类型
 *
 * @description 通过Zod Schema验证判断未知数据是否符合豆瓣书籍的数据结构要求
 * @param item - 待检查的未知类型数据
 * @returns 如果数据符合DoubanBook类型返回true，否则返回false
 *
 * @example
 * ```typescript
 * if (isDoubanBook(someData)) {
 *   // TypeScript现在知道someData是DoubanBook类型
 *   console.log('书籍作者:', someData.authors);
 * }
 * ```
 */
export function isDoubanBook(item: unknown): item is DoubanBook {
  try {
    DoubanBookSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

/**
 * 类型守卫：检查数据是否为豆瓣电影类型
 *
 * @description 通过Zod Schema验证判断未知数据是否符合豆瓣电影的数据结构要求
 * @param item - 待检查的未知类型数据
 * @returns 如果数据符合DoubanMovie类型返回true，否则返回false
 *
 * @example
 * ```typescript
 * if (isDoubanMovie(someData)) {
 *   // TypeScript现在知道someData是DoubanMovie类型
 *   console.log('电影导演:', someData.directors);
 * }
 * ```
 */
export function isDoubanMovie(item: unknown): item is DoubanMovie {
  try {
    DoubanMovieSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

/**
 * 类型守卫：检查数据是否为豆瓣电视剧类型
 *
 * @description 通过Zod Schema验证判断未知数据是否符合豆瓣电视剧的数据结构要求
 * @param item - 待检查的未知类型数据
 * @returns 如果数据符合DoubanTvSeries类型返回true，否则返回false
 *
 * @example
 * ```typescript
 * if (isDoubanTvSeries(someData)) {
 *   // TypeScript现在知道someData是DoubanTvSeries类型
 *   console.log('电视剧集数:', someData.episodeCount);
 * }
 * ```
 */
export function isDoubanTvSeries(item: unknown): item is DoubanTvSeries {
  try {
    DoubanTvSeriesSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

/**
 * 类型守卫：检查数据是否为豆瓣纪录片类型
 *
 * @description 通过Zod Schema验证判断未知数据是否符合豆瓣纪录片的数据结构要求
 * @param item - 待检查的未知类型数据
 * @returns 如果数据符合DoubanDocumentary类型返回true，否则返回false
 *
 * @example
 * ```typescript
 * if (isDoubanDocumentary(someData)) {
 *   // TypeScript现在知道someData是DoubanDocumentary类型
 *   console.log('纪录片导演:', someData.directors);
 * }
 * ```
 */
export function isDoubanDocumentary(item: unknown): item is DoubanDocumentary {
  try {
    DoubanDocumentarySchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

/**
 * 智能推断豆瓣条目类型
 *
 * @description 通过分析数据的字段特征自动判断豆瓣条目类型，支持显式category字段和基于字段推断两种模式
 * @param data - 待推断的未知类型数据，通常包含豆瓣条目的部分字段信息
 * @returns 推断出的豆瓣条目类型，如果无法确定则返回'unknown'
 *
 * @example
 * ```typescript
 * const bookData = { authors: ['作者1'], title: '测试书籍' };
 * const type = inferDoubanItemType(bookData); // 返回 'books'
 *
 * const movieData = { directors: ['导演1'], title: '测试电影' };
 * const type2 = inferDoubanItemType(movieData); // 返回 'movies'
 *
 * const tvData = { directors: ['导演1'], episodeCount: 24 };
 * const type3 = inferDoubanItemType(tvData); // 返回 'tv'
 * ```
 *
 * @remarks
 * 推断优先级：
 * 1. 显式category字段 > 2. 基于authors字段(books) > 3. 基于directors字段(movies/tv/documentary) > 4. 基于artists字段(music)
 * 对于影视类型，通过episodeCount或firstAirDate判断是否为电视剧/纪录片，再通过genres中是否包含"纪录片"区分电视剧和纪录片
 */
export function inferDoubanItemType(
  data: unknown,
): 'books' | 'movies' | 'tv' | 'documentary' | 'music' | 'unknown' {
  // 基础类型守卫
  if (!data || typeof data !== 'object') return 'unknown';

  // 类型安全的对象属性访问
  const safeData = data as Record<string, unknown>;

  // 明确的分类字段检查
  if (
    'category' in safeData &&
    typeof safeData.category === 'string' &&
    ['books', 'movies', 'tv', 'documentary', 'music'].includes(
      safeData.category,
    )
  ) {
    return safeData.category as
      | 'books'
      | 'movies'
      | 'tv'
      | 'documentary'
      | 'music';
  }

  // 基于字段推断 - 书籍类型检查
  if (
    'authors' in safeData &&
    Array.isArray(safeData.authors) &&
    safeData.authors.length > 0
  ) {
    return 'books';
  }

  // 基于字段推断 - 影视类型检查
  if (
    'directors' in safeData &&
    Array.isArray(safeData.directors) &&
    safeData.directors.length > 0
  ) {
    // 检查是否为电视剧或纪录片
    const hasEpisodeCount = 'episodeCount' in safeData && safeData.episodeCount;
    const hasFirstAirDate = 'firstAirDate' in safeData && safeData.firstAirDate;

    if (hasEpisodeCount || hasFirstAirDate) {
      // 检查genres是否包含"纪录片"
      if (
        'genres' in safeData &&
        Array.isArray(safeData.genres) &&
        safeData.genres.some(
          (g: unknown) => typeof g === 'string' && g.includes('纪录片'),
        )
      ) {
        return 'documentary';
      }
      return 'tv';
    }
    return 'movies';
  }

  // 基于字段推断 - 音乐类型检查
  if (
    'artists' in safeData &&
    Array.isArray(safeData.artists) &&
    safeData.artists.length > 0
  ) {
    return 'music';
  }

  return 'unknown';
}
