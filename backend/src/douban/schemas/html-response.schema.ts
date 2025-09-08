/**
 * 豆瓣HTML响应Zod验证Schema
 * 
 * 为豆瓣页面抓取和解析提供完整的运行时类型安全保障
 * 基于实际豆瓣页面结构设计，支持书籍、电影、电视剧、纪录片等类型
 * 
 * 创建时间: 2025-09-08
 * 用途: HTML解析的类型安全和验证
 */

import { z } from 'zod';

/**
 * 豆瓣页面基础HTML结构Schema
 * 适用于所有豆瓣条目页面的通用元素
 */
export const DoubanHtmlBaseSchema = z.object({
  title: z.string().min(1, '页面标题不能为空'),
  url: z.string().url('必须是有效的URL'),
  statusCode: z.number().min(200).max(599),
  headers: z.record(z.string(), z.string()).optional(),
  cookies: z.record(z.string(), z.string()).optional(),
  responseTime: z.number().min(0).optional(),
});

/**
 * 豆瓣条目页面核心信息Schema
 * 包含JSON-LD结构化数据和页面元素
 */
export const DoubanItemHtmlSchema = DoubanHtmlBaseSchema.extend({
  // JSON-LD结构化数据（优先解析源）
  jsonLd: z.object({
    '@type': z.enum(['Book', 'Movie', 'TVSeries', 'CreativeWork']),
    name: z.string(),
    alternateName: z.string().optional(),
    author: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).optional(),
    director: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).optional(),
    actor: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).optional(),
    datePublished: z.string().optional(),
    isbn: z.string().optional(),
    publisher: z.object({
      '@type': z.string(),
      name: z.string(),
    }).optional(),
    aggregateRating: z.object({
      '@type': z.string(),
      ratingValue: z.number(),
      ratingCount: z.number(),
      bestRating: z.number().default(10),
    }).optional(),
    genre: z.array(z.string()).default([]),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),

  // HTML页面元素（备选解析源）
  pageElements: z.object({
    // 标题相关
    mainTitle: z.string().optional(),
    subtitle: z.string().optional(),
    originalTitle: z.string().optional(),
    
    // 评分信息
    ratingValue: z.string().optional(),
    ratingCount: z.string().optional(),
    
    // 基础信息
    year: z.string().optional(),
    genres: z.array(z.string()).default([]),
    summary: z.string().optional(),
    coverImage: z.string().optional(),
    
    // 创作者信息
    authors: z.array(z.string()).default([]),
    directors: z.array(z.string()).default([]),
    cast: z.array(z.string()).default([]),
    writers: z.array(z.string()).default([]),
    
    // 出版/发行信息
    publisher: z.string().optional(),
    publishDate: z.string().optional(),
    releaseDate: z.string().optional(),
    
    // 其他元数据
    pages: z.string().optional(),
    duration: z.string().optional(),
    countries: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    isbn: z.string().optional(),
    imdbId: z.string().optional(),
  }).optional(),

  // 用户相关数据（需登录）
  userInteraction: z.object({
    userRating: z.number().min(1).max(5).optional(),
    userComment: z.string().optional(),
    userTags: z.array(z.string()).default([]),
    userStatus: z.enum(['wish', 'do', 'collect']).optional(),
    markDate: z.string().optional(),
  }).optional(),
});

/**
 * 豆瓣书籍页面专用Schema
 */
export const DoubanBookHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z.object({
    '@type': z.literal('Book'),
    name: z.string(),
    alternateName: z.string().optional(),
    author: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })),
    isbn: z.string().optional(),
    publisher: z.object({
      '@type': z.string(),
      name: z.string(),
    }).optional(),
    datePublished: z.string().optional(),
    numberOfPages: z.number().optional(),
    bookFormat: z.string().optional(),
    aggregateRating: z.object({
      '@type': z.string(),
      ratingValue: z.number(),
      ratingCount: z.number(),
      bestRating: z.number().default(10),
    }).optional(),
    genre: z.array(z.string()).default([]),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),

  bookSpecific: z.object({
    translators: z.array(z.string()).default([]),
    binding: z.string().optional(),
    price: z.string().optional(),
    series: z.string().optional(),
    originalLanguage: z.string().optional(),
  }).optional(),
});

/**
 * 豆瓣电影页面专用Schema
 */
export const DoubanMovieHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z.object({
    '@type': z.literal('Movie'),
    name: z.string(),
    alternateName: z.string().optional(),
    director: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })),
    actor: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).default([]),
    datePublished: z.string().optional(),
    duration: z.string().optional(),
    countryOfOrigin: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).default([]),
    inLanguage: z.array(z.string()).default([]),
    aggregateRating: z.object({
      '@type': z.string(),
      ratingValue: z.number(),
      ratingCount: z.number(),
      bestRating: z.number().default(10),
    }).optional(),
    genre: z.array(z.string()).default([]),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),

  movieSpecific: z.object({
    imdbId: z.string().optional(),
    writers: z.array(z.string()).default([]),
    releaseYear: z.number().optional(),
    runtime: z.string().optional(),
    productionCountries: z.array(z.string()).default([]),
    spokenLanguages: z.array(z.string()).default([]),
  }).optional(),
});

/**
 * 豆瓣电视剧页面专用Schema
 */
export const DoubanTvHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z.object({
    '@type': z.literal('TVSeries'),
    name: z.string(),
    alternateName: z.string().optional(),
    director: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })),
    actor: z.array(z.object({
      '@type': z.string(),
      name: z.string(),
    })).default([]),
    datePublished: z.string().optional(),
    numberOfEpisodes: z.number().optional(),
    episodeRunTime: z.string().optional(),
    aggregateRating: z.object({
      '@type': z.string(),
      ratingValue: z.number(),
      ratingCount: z.number(),
      bestRating: z.number().default(10),
    }).optional(),
    genre: z.array(z.string()).default([]),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),

  tvSpecific: z.object({
    episodeCount: z.number().optional(),
    episodeDuration: z.string().optional(),
    seasons: z.number().optional(),
    network: z.string().optional(),
    firstAirDate: z.string().optional(),
    lastAirDate: z.string().optional(),
    status: z.enum(['ended', 'ongoing', 'upcoming']).optional(),
  }).optional(),
});

/**
 * 豆瓣用户收藏页面HTML Schema
 * 用于解析用户书影音收藏列表页面
 */
export const DoubanCollectionHtmlSchema = DoubanHtmlBaseSchema.extend({
  collectionType: z.enum(['books', 'movies', 'tv', 'music']),
  collectionStatus: z.enum(['wish', 'do', 'collect']),
  
  // 分页信息
  pagination: z.object({
    currentPage: z.number().min(1),
    totalPages: z.number().min(1),
    totalItems: z.number().min(0),
    itemsPerPage: z.number().default(15),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),

  // 条目列表
  items: z.array(z.object({
    subjectId: z.string(),
    title: z.string(),
    url: z.string().url(),
    coverImage: z.string().url().optional(),
    rating: z.object({
      average: z.number().min(0).max(10).optional(),
      userRating: z.number().min(1).max(5).optional(),
    }).optional(),
    userComment: z.string().optional(),
    userTags: z.array(z.string()).default([]),
    markDate: z.string().optional(),
    quickInfo: z.object({
      year: z.number().optional(),
      author: z.string().optional(),
      director: z.string().optional(),
      genres: z.array(z.string()).default([]),
    }).optional(),
  })),

  // 用户信息
  userProfile: z.object({
    userId: z.string(),
    username: z.string(),
    avatarUrl: z.string().url().optional(),
  }).optional(),
});

/**
 * HTTP响应错误Schema
 */
export const DoubanHttpErrorSchema = z.object({
  statusCode: z.number().min(400).max(599),
  error: z.string(),
  message: z.string(),
  url: z.string().url(),
  timestamp: z.date().default(() => new Date()),
  
  // 反爬虫检测
  isAntiSpiderDetected: z.boolean().default(false),
  requiresCookieRefresh: z.boolean().default(false),
  retryAfterSeconds: z.number().optional(),
  
  // 响应详情
  responseBody: z.string().optional(),
  responseHeaders: z.record(z.string(), z.string()).optional(),
});

/**
 * 豆瓣API限流Schema
 */
export const DoubanRateLimitSchema = z.object({
  isRateLimited: z.boolean(),
  resetTime: z.date().optional(),
  remainingRequests: z.number().optional(),
  limitPerHour: z.number().default(100),
  currentWindowStart: z.date().default(() => new Date()),
});

// Schema已在上面直接导出，这里不需要重复导出

// 类型推断导出
export type DoubanHtmlBase = z.infer<typeof DoubanHtmlBaseSchema>;
export type DoubanItemHtml = z.infer<typeof DoubanItemHtmlSchema>;
export type DoubanBookHtml = z.infer<typeof DoubanBookHtmlSchema>;
export type DoubanMovieHtml = z.infer<typeof DoubanMovieHtmlSchema>;
export type DoubanTvHtml = z.infer<typeof DoubanTvHtmlSchema>;
export type DoubanCollectionHtml = z.infer<typeof DoubanCollectionHtmlSchema>;
export type DoubanHttpError = z.infer<typeof DoubanHttpErrorSchema>;
export type DoubanRateLimit = z.infer<typeof DoubanRateLimitSchema>;

/**
 * 验证工具函数：验证豆瓣HTML响应
 */
export function validateDoubanHtml(
  html: unknown,
  type: 'book' | 'movie' | 'tv' | 'collection'
): { success: true; data: any } | { success: false; error: string } {
  try {
    let schema;
    switch (type) {
      case 'book':
        schema = DoubanBookHtmlSchema;
        break;
      case 'movie':
        schema = DoubanMovieHtmlSchema;
        break;
      case 'tv':
        schema = DoubanTvHtmlSchema;
        break;
      case 'collection':
        schema = DoubanCollectionHtmlSchema;
        break;
      default:
        return { success: false, error: '不支持的豆瓣页面类型' };
    }
    
    const validatedData = schema.parse(html);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `豆瓣HTML验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 类型守卫：检查是否为有效的豆瓣HTML响应
 */
export function isValidDoubanHtml(
  value: unknown,
  type?: 'book' | 'movie' | 'tv' | 'collection'
): value is DoubanItemHtml {
  if (!type) {
    // 通用检查
    try {
      DoubanItemHtmlSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  }
  
  const result = validateDoubanHtml(value, type);
  return result.success;
}