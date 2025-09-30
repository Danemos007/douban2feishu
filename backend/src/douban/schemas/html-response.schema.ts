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
 *
 * @description 定义所有豆瓣条目页面的通用基础字段，包括标题、URL、状态码等
 * @property {string} title - 页面标题，不能为空
 * @property {string} url - 页面URL，必须是有效的URL格式
 * @property {number} statusCode - HTTP状态码，范围200-599
 * @property {Record<string, string>} [headers] - 可选的响应头信息
 * @property {Record<string, string>} [cookies] - 可选的Cookie信息
 * @property {number} [responseTime] - 可选的响应时间（毫秒），必须>=0
 *
 * @example
 * const baseHtml = {
 *   title: '豆瓣读书',
 *   url: 'https://book.douban.com/subject/12345/',
 *   statusCode: 200,
 *   responseTime: 1500
 * };
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
 *
 * @description 扩展基础Schema，包含JSON-LD结构化数据、页面元素和用户交互信息，适用于书籍、电影、电视剧等条目页面
 * @property {object} [jsonLd] - JSON-LD结构化数据（优先解析源）
 * @property {string} jsonLd['@type'] - 条目类型：'Book' | 'Movie' | 'TVSeries' | 'CreativeWork'
 * @property {string} jsonLd.name - 条目名称
 * @property {Array} [jsonLd.author] - 作者信息（书籍）
 * @property {Array} [jsonLd.director] - 导演信息（影视）
 * @property {Array} [jsonLd.actor] - 演员信息（影视）
 * @property {object} [jsonLd.aggregateRating] - 聚合评分，默认bestRating为10
 * @property {Array<string>} [jsonLd.genre] - 类型/体裁，默认空数组
 * @property {object} [pageElements] - HTML页面元素（备选解析源）
 * @property {Array<string>} [pageElements.genres] - 类型列表，默认空数组
 * @property {Array<string>} [pageElements.authors] - 作者列表，默认空数组
 * @property {Array<string>} [pageElements.directors] - 导演列表，默认空数组
 * @property {object} [userInteraction] - 用户相关数据（需登录）
 * @property {number} [userInteraction.userRating] - 用户评分，范围1-5
 * @property {string} [userInteraction.userStatus] - 用户状态：'wish' | 'do' | 'collect'
 * @property {Array<string>} [userInteraction.userTags] - 用户标签，默认空数组
 *
 * @example
 * const itemHtml = {
 *   title: '银河系漫游指南',
 *   url: 'https://book.douban.com/subject/12345/',
 *   statusCode: 200,
 *   jsonLd: {
 *     '@type': 'Book',
 *     name: '银河系漫游指南',
 *     author: [{ '@type': 'Person', name: '道格拉斯·亚当斯' }]
 *   },
 *   userInteraction: {
 *     userRating: 5,
 *     userStatus: 'collect',
 *     userTags: ['科幻', '幽默']
 *   }
 * };
 */
export const DoubanItemHtmlSchema = DoubanHtmlBaseSchema.extend({
  // JSON-LD结构化数据（优先解析源）
  jsonLd: z
    .object({
      '@type': z.enum(['Book', 'Movie', 'TVSeries', 'CreativeWork']),
      name: z.string(),
      alternateName: z.string().optional(),
      author: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .optional(),
      director: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .optional(),
      actor: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .optional(),
      datePublished: z.string().optional(),
      isbn: z.string().optional(),
      publisher: z
        .object({
          '@type': z.string(),
          name: z.string(),
        })
        .optional(),
      aggregateRating: z
        .object({
          '@type': z.string(),
          ratingValue: z.number(),
          ratingCount: z.number(),
          bestRating: z.number().default(10),
        })
        .optional(),
      genre: z.array(z.string()).default([]),
      description: z.string().optional(),
      image: z.string().url().optional(),
    })
    .optional(),

  // HTML页面元素（备选解析源）
  pageElements: z
    .object({
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
    })
    .optional(),

  // 用户相关数据（需登录）
  userInteraction: z
    .object({
      userRating: z.number().min(1).max(5).optional(),
      userComment: z.string().optional(),
      userTags: z.array(z.string()).default([]),
      userStatus: z.enum(['wish', 'do', 'collect']).optional(),
      markDate: z.string().optional(),
    })
    .optional(),
});

/**
 * 豆瓣书籍页面专用Schema
 *
 * @description 扩展条目Schema，专门用于书籍页面验证，强制@type为'Book'，包含书籍特有字段如译者、装帧等
 * @property {object} [jsonLd] - JSON-LD结构化数据，@type强制为'Book'
 * @property {Array} jsonLd.author - 作者信息，书籍必填
 * @property {number} [jsonLd.numberOfPages] - 页数
 * @property {string} [jsonLd.bookFormat] - 书籍格式（如平装、精装）
 * @property {object} [bookSpecific] - 书籍特有字段
 * @property {Array<string>} [bookSpecific.translators] - 译者列表，默认空数组
 * @property {string} [bookSpecific.binding] - 装帧方式
 * @property {string} [bookSpecific.price] - 价格
 * @property {string} [bookSpecific.series] - 所属系列
 * @property {string} [bookSpecific.originalLanguage] - 原文语言
 *
 * @example
 * const bookHtml = {
 *   title: '银河系漫游指南',
 *   url: 'https://book.douban.com/subject/12345/',
 *   statusCode: 200,
 *   jsonLd: {
 *     '@type': 'Book',
 *     name: '银河系漫游指南',
 *     author: [{ '@type': 'Person', name: '道格拉斯·亚当斯' }],
 *     numberOfPages: 208
 *   },
 *   bookSpecific: {
 *     translators: ['姚向辉'],
 *     binding: '平装',
 *     price: '25.00元'
 *   }
 * };
 */
export const DoubanBookHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z
    .object({
      '@type': z.literal('Book'),
      name: z.string(),
      alternateName: z.string().optional(),
      author: z.array(
        z.object({
          '@type': z.string(),
          name: z.string(),
        }),
      ),
      isbn: z.string().optional(),
      publisher: z
        .object({
          '@type': z.string(),
          name: z.string(),
        })
        .optional(),
      datePublished: z.string().optional(),
      numberOfPages: z.number().optional(),
      bookFormat: z.string().optional(),
      aggregateRating: z
        .object({
          '@type': z.string(),
          ratingValue: z.number(),
          ratingCount: z.number(),
          bestRating: z.number().default(10),
        })
        .optional(),
      genre: z.array(z.string()).default([]),
      description: z.string().optional(),
      image: z.string().url().optional(),
    })
    .optional(),

  bookSpecific: z
    .object({
      translators: z.array(z.string()).default([]),
      binding: z.string().optional(),
      price: z.string().optional(),
      series: z.string().optional(),
      originalLanguage: z.string().optional(),
    })
    .optional(),
});

/**
 * 豆瓣电影页面专用Schema
 *
 * @description 扩展条目Schema，专门用于电影页面验证，强制@type为'Movie'，包含电影特有字段如片长、IMDB ID等
 * @property {object} [jsonLd] - JSON-LD结构化数据，@type强制为'Movie'
 * @property {Array} jsonLd.director - 导演信息，电影必填
 * @property {Array} [jsonLd.actor] - 演员信息，默认空数组
 * @property {string} [jsonLd.duration] - 片长
 * @property {Array} [jsonLd.countryOfOrigin] - 制片国家/地区，默认空数组
 * @property {Array<string>} [jsonLd.inLanguage] - 语言，默认空数组
 * @property {object} [movieSpecific] - 电影特有字段
 * @property {string} [movieSpecific.imdbId] - IMDB ID
 * @property {Array<string>} [movieSpecific.writers] - 编剧列表，默认空数组
 * @property {number} [movieSpecific.releaseYear] - 上映年份
 * @property {string} [movieSpecific.runtime] - 片长
 * @property {Array<string>} [movieSpecific.productionCountries] - 制片国家，默认空数组
 * @property {Array<string>} [movieSpecific.spokenLanguages] - 语言，默认空数组
 *
 * @example
 * const movieHtml = {
 *   title: '肖申克的救赎',
 *   url: 'https://movie.douban.com/subject/12345/',
 *   statusCode: 200,
 *   jsonLd: {
 *     '@type': 'Movie',
 *     name: '肖申克的救赎',
 *     director: [{ '@type': 'Person', name: '弗兰克·德拉邦特' }],
 *     duration: '142分钟'
 *   },
 *   movieSpecific: {
 *     imdbId: 'tt0111161',
 *     releaseYear: 1994
 *   }
 * };
 */
export const DoubanMovieHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z
    .object({
      '@type': z.literal('Movie'),
      name: z.string(),
      alternateName: z.string().optional(),
      director: z.array(
        z.object({
          '@type': z.string(),
          name: z.string(),
        }),
      ),
      actor: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .default([]),
      datePublished: z.string().optional(),
      duration: z.string().optional(),
      countryOfOrigin: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .default([]),
      inLanguage: z.array(z.string()).default([]),
      aggregateRating: z
        .object({
          '@type': z.string(),
          ratingValue: z.number(),
          ratingCount: z.number(),
          bestRating: z.number().default(10),
        })
        .optional(),
      genre: z.array(z.string()).default([]),
      description: z.string().optional(),
      image: z.string().url().optional(),
    })
    .optional(),

  movieSpecific: z
    .object({
      imdbId: z.string().optional(),
      writers: z.array(z.string()).default([]),
      releaseYear: z.number().optional(),
      runtime: z.string().optional(),
      productionCountries: z.array(z.string()).default([]),
      spokenLanguages: z.array(z.string()).default([]),
    })
    .optional(),
});

/**
 * 豆瓣电视剧页面专用Schema
 *
 * @description 扩展条目Schema，专门用于电视剧/纪录片页面验证，强制@type为'TVSeries'，包含剧集特有字段如集数、播出状态等
 * @property {object} [jsonLd] - JSON-LD结构化数据，@type强制为'TVSeries'
 * @property {Array} jsonLd.director - 导演信息，电视剧必填
 * @property {Array} [jsonLd.actor] - 演员信息，默认空数组
 * @property {number} [jsonLd.numberOfEpisodes] - 集数
 * @property {string} [jsonLd.episodeRunTime] - 单集片长
 * @property {object} [tvSpecific] - 电视剧特有字段
 * @property {number} [tvSpecific.episodeCount] - 总集数
 * @property {string} [tvSpecific.episodeDuration] - 单集时长
 * @property {number} [tvSpecific.seasons] - 季数
 * @property {string} [tvSpecific.network] - 播出平台/电视台
 * @property {string} [tvSpecific.firstAirDate] - 首播日期
 * @property {string} [tvSpecific.lastAirDate] - 完结日期
 * @property {string} [tvSpecific.status] - 播出状态：'ended' | 'ongoing' | 'upcoming'
 *
 * @example
 * const tvHtml = {
 *   title: '权力的游戏',
 *   url: 'https://movie.douban.com/subject/12345/',
 *   statusCode: 200,
 *   jsonLd: {
 *     '@type': 'TVSeries',
 *     name: '权力的游戏',
 *     director: [{ '@type': 'Person', name: '大卫·贝尼奥夫' }],
 *     numberOfEpisodes: 73
 *   },
 *   tvSpecific: {
 *     seasons: 8,
 *     network: 'HBO',
 *     status: 'ended'
 *   }
 * };
 */
export const DoubanTvHtmlSchema = DoubanItemHtmlSchema.extend({
  jsonLd: z
    .object({
      '@type': z.literal('TVSeries'),
      name: z.string(),
      alternateName: z.string().optional(),
      director: z.array(
        z.object({
          '@type': z.string(),
          name: z.string(),
        }),
      ),
      actor: z
        .array(
          z.object({
            '@type': z.string(),
            name: z.string(),
          }),
        )
        .default([]),
      datePublished: z.string().optional(),
      numberOfEpisodes: z.number().optional(),
      episodeRunTime: z.string().optional(),
      aggregateRating: z
        .object({
          '@type': z.string(),
          ratingValue: z.number(),
          ratingCount: z.number(),
          bestRating: z.number().default(10),
        })
        .optional(),
      genre: z.array(z.string()).default([]),
      description: z.string().optional(),
      image: z.string().url().optional(),
    })
    .optional(),

  tvSpecific: z
    .object({
      episodeCount: z.number().optional(),
      episodeDuration: z.string().optional(),
      seasons: z.number().optional(),
      network: z.string().optional(),
      firstAirDate: z.string().optional(),
      lastAirDate: z.string().optional(),
      status: z.enum(['ended', 'ongoing', 'upcoming']).optional(),
    })
    .optional(),
});

/**
 * 豆瓣用户收藏页面HTML Schema
 *
 * @description 用于解析用户书影音收藏列表页面，包含分页信息、条目列表和用户资料
 * @property {string} collectionType - 收藏类型：'books' | 'movies' | 'tv' | 'music'
 * @property {string} collectionStatus - 收藏状态：'wish'(想看/想读) | 'do'(在看/在读) | 'collect'(看过/读过)
 * @property {object} pagination - 分页信息
 * @property {number} pagination.currentPage - 当前页码，最小值1
 * @property {number} pagination.totalPages - 总页数，最小值1
 * @property {number} pagination.totalItems - 总条目数，最小值0
 * @property {number} pagination.itemsPerPage - 每页条目数，默认15
 * @property {boolean} pagination.hasNextPage - 是否有下一页
 * @property {boolean} pagination.hasPrevPage - 是否有上一页
 * @property {Array<object>} items - 条目列表
 * @property {object} items[].rating - 评分信息
 * @property {number} [items[].rating.average] - 豆瓣评分，范围0-10
 * @property {number} [items[].rating.userRating] - 用户评分，范围1-5
 * @property {Array<string>} [items[].userTags] - 用户标签，默认空数组
 * @property {object} [userProfile] - 用户资料（可选）
 *
 * @example
 * const collectionHtml = {
 *   title: '我的读书收藏',
 *   url: 'https://book.douban.com/people/user123/collect',
 *   statusCode: 200,
 *   collectionType: 'books',
 *   collectionStatus: 'collect',
 *   pagination: {
 *     currentPage: 1,
 *     totalPages: 10,
 *     totalItems: 150,
 *     itemsPerPage: 15,
 *     hasNextPage: true,
 *     hasPrevPage: false
 *   },
 *   items: [
 *     {
 *       subjectId: '12345',
 *       title: '银河系漫游指南',
 *       url: 'https://book.douban.com/subject/12345/',
 *       rating: { average: 8.5, userRating: 5 }
 *     }
 *   ]
 * };
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
  items: z.array(
    z.object({
      subjectId: z.string(),
      title: z.string(),
      url: z.string().url(),
      coverImage: z.string().url().optional(),
      rating: z
        .object({
          average: z.number().min(0).max(10).optional(),
          userRating: z.number().min(1).max(5).optional(),
        })
        .optional(),
      userComment: z.string().optional(),
      userTags: z.array(z.string()).default([]),
      markDate: z.string().optional(),
      quickInfo: z
        .object({
          year: z.number().optional(),
          author: z.string().optional(),
          director: z.string().optional(),
          genres: z.array(z.string()).default([]),
        })
        .optional(),
    }),
  ),

  // 用户信息
  userProfile: z
    .object({
      userId: z.string(),
      username: z.string(),
      avatarUrl: z.string().url().optional(),
    })
    .optional(),
});

/**
 * HTTP响应错误Schema
 *
 * @description 定义豆瓣HTTP请求错误的标准结构，包含反爬虫检测和重试策略信息
 * @property {number} statusCode - HTTP错误状态码，范围400-599
 * @property {string} error - 错误类型（如'Not Found', 'Forbidden'）
 * @property {string} message - 错误详细信息
 * @property {string} url - 请求的URL
 * @property {Date} timestamp - 错误发生时间，默认当前时间
 * @property {boolean} isAntiSpiderDetected - 是否检测到反爬虫机制，默认false
 * @property {boolean} requiresCookieRefresh - 是否需要刷新Cookie，默认false
 * @property {number} [retryAfterSeconds] - 建议重试等待时间（秒）
 * @property {string} [responseBody] - 响应体内容（用于调试）
 * @property {Record<string, string>} [responseHeaders] - 响应头信息
 *
 * @example
 * const httpError = {
 *   statusCode: 403,
 *   error: 'Forbidden',
 *   message: '检测到反爬虫机制，请更新Cookie',
 *   url: 'https://book.douban.com/subject/12345/',
 *   isAntiSpiderDetected: true,
 *   requiresCookieRefresh: true,
 *   retryAfterSeconds: 60
 * };
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
 *
 * @description 定义API限流状态和配额信息，用于请求频率控制
 * @property {boolean} isRateLimited - 当前是否被限流
 * @property {Date} [resetTime] - 限流重置时间
 * @property {number} [remainingRequests] - 当前时间窗口剩余请求次数
 * @property {number} limitPerHour - 每小时请求限制，默认100
 * @property {Date} currentWindowStart - 当前时间窗口开始时间，默认当前时间
 *
 * @example
 * const rateLimit = {
 *   isRateLimited: false,
 *   remainingRequests: 85,
 *   limitPerHour: 100,
 *   currentWindowStart: new Date()
 * };
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
 * Schema联合类型：用于类型安全的Schema操作
 */
type DoubanSchemaType =
  | typeof DoubanBookHtmlSchema
  | typeof DoubanMovieHtmlSchema
  | typeof DoubanTvHtmlSchema
  | typeof DoubanCollectionHtmlSchema;

/**
 * 验证豆瓣HTML响应数据
 *
 * @description 使用对应的Schema验证豆瓣HTML数据，支持书籍、电影、电视剧和收藏列表四种类型，提供精确的类型推断
 *
 * @param {unknown} html - 待验证的HTML数据对象
 * @param {'book' | 'movie' | 'tv' | 'collection'} type - 豆瓣页面类型
 *
 * @returns {{ success: true; data: DoubanBookHtml | DoubanMovieHtml | DoubanTvHtml | DoubanCollectionHtml } | { success: false; error: string }}
 * 验证成功返回 `{ success: true, data: 验证后的数据 }`，失败返回 `{ success: false, error: 错误信息 }`
 *
 * @throws 不会直接抛出异常，所有错误都包装在返回值的error字段中
 *
 * @example
 * // 验证书籍HTML
 * const bookResult = validateDoubanHtml(rawHtml, 'book');
 * if (bookResult.success) {
 *   console.log('书名:', bookResult.data.jsonLd?.name);
 * } else {
 *   console.error('验证失败:', bookResult.error);
 * }
 *
 * @example
 * // 验证电影HTML
 * const movieResult = validateDoubanHtml(rawHtml, 'movie');
 * if (movieResult.success) {
 *   console.log('导演:', movieResult.data.jsonLd?.director);
 * }
 *
 * @example
 * // 处理验证错误
 * const result = validateDoubanHtml(invalidData, 'book');
 * if (!result.success) {
 *   if (result.error.includes('title')) {
 *     console.log('标题字段验证失败');
 *   }
 * }
 */
export function validateDoubanHtml(
  html: unknown,
  type: 'book',
): { success: true; data: DoubanBookHtml } | { success: false; error: string };

export function validateDoubanHtml(
  html: unknown,
  type: 'movie',
): { success: true; data: DoubanMovieHtml } | { success: false; error: string };

export function validateDoubanHtml(
  html: unknown,
  type: 'tv',
): { success: true; data: DoubanTvHtml } | { success: false; error: string };

export function validateDoubanHtml(
  html: unknown,
  type: 'collection',
):
  | { success: true; data: DoubanCollectionHtml }
  | { success: false; error: string };

export function validateDoubanHtml(
  html: unknown,
  type: 'book' | 'movie' | 'tv' | 'collection',
):
  | {
      success: true;
      data:
        | DoubanBookHtml
        | DoubanMovieHtml
        | DoubanTvHtml
        | DoubanCollectionHtml;
    }
  | { success: false; error: string } {
  try {
    let schema: DoubanSchemaType;
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
 * 类型守卫：检查值是否为有效的豆瓣HTML响应
 *
 * @description 验证给定值是否符合豆瓣HTML响应的结构要求，可用作TypeScript类型守卫
 *
 * @param {unknown} value - 待检查的值
 * @param {'book' | 'movie' | 'tv' | 'collection'} [type] - 可选的具体类型，不指定则使用通用验证
 *
 * @returns {boolean} 如果值符合豆瓣HTML结构返回true，否则返回false
 *
 * @example
 * // 通用验证（不指定类型）
 * if (isValidDoubanHtml(data)) {
 *   // TypeScript识别data为DoubanItemHtml类型
 *   console.log('标题:', data.title);
 *   console.log('URL:', data.url);
 * }
 *
 * @example
 * // 指定类型验证
 * if (isValidDoubanHtml(data, 'book')) {
 *   // data被识别为DoubanItemHtml类型
 *   console.log('这是一个有效的书籍HTML');
 * }
 *
 * @example
 * // 在条件分支中使用
 * const processHtml = (data: unknown) => {
 *   if (!isValidDoubanHtml(data, 'movie')) {
 *     throw new Error('Invalid movie HTML');
 *   }
 *   // TypeScript此时知道data是DoubanItemHtml
 *   return data.title;
 * };
 *
 * @example
 * // 过滤数组
 * const validHtmls = rawDataArray.filter((item) => isValidDoubanHtml(item));
 */
export function isValidDoubanHtml(
  value: unknown,
  type?: 'book' | 'movie' | 'tv' | 'collection',
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

  // 直接使用Schema避免重载问题
  try {
    let schema: DoubanSchemaType;
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
        return false;
    }
    schema.parse(value);
    return true;
  } catch {
    return false;
  }
}
