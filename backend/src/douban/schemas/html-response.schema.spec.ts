/**
 * html-response.schema.ts 单元测试
 *
 * 测试覆盖豆瓣HTML响应所有 Zod Schema 定义和工具函数
 * 目标覆盖率: 85%+
 */

import { z } from 'zod';
import {
  DoubanHtmlBaseSchema,
  DoubanItemHtmlSchema,
  DoubanBookHtmlSchema,
  DoubanMovieHtmlSchema,
  DoubanTvHtmlSchema,
  DoubanCollectionHtmlSchema,
  DoubanHttpErrorSchema,
  DoubanRateLimitSchema,
  validateDoubanHtml,
  isValidDoubanHtml,
  type DoubanHtmlBase,
  type DoubanItemHtml,
  type DoubanBookHtml,
  type DoubanMovieHtml,
  type DoubanTvHtml,
  type DoubanCollectionHtml,
  type DoubanHttpError,
  type DoubanRateLimit,
} from './html-response.schema';

describe('html-response.schema.ts', () => {
  describe('Schema Definitions', () => {
    describe('DoubanHtmlBaseSchema', () => {
      it('should accept valid base HTML structure', () => {
        const validBase = {
          title: '豆瓣读书',
          url: 'https://book.douban.com',
          statusCode: 200,
        };
        expect(() => DoubanHtmlBaseSchema.parse(validBase)).not.toThrow();
      });

      it('should reject empty title', () => {
        const invalidBase = {
          title: '',
          url: 'https://book.douban.com',
          statusCode: 200,
        };
        expect(() => DoubanHtmlBaseSchema.parse(invalidBase)).toThrow(
          z.ZodError,
        );
      });

      it('should reject invalid URL', () => {
        const invalidBase = {
          title: '豆瓣读书',
          url: 'not-a-url',
          statusCode: 200,
        };
        expect(() => DoubanHtmlBaseSchema.parse(invalidBase)).toThrow(
          z.ZodError,
        );
      });

      it('should validate statusCode range (200-599)', () => {
        const validCodes = [200, 404, 500, 599];
        validCodes.forEach((code) => {
          const base = {
            title: '测试',
            url: 'https://book.douban.com',
            statusCode: code,
          };
          expect(() => DoubanHtmlBaseSchema.parse(base)).not.toThrow();
        });

        const invalidCodes = [199, 600];
        invalidCodes.forEach((code) => {
          const base = {
            title: '测试',
            url: 'https://book.douban.com',
            statusCode: code,
          };
          expect(() => DoubanHtmlBaseSchema.parse(base)).toThrow(z.ZodError);
        });
      });

      it('should accept optional headers and cookies', () => {
        const baseWithOptionals = {
          title: '豆瓣读书',
          url: 'https://book.douban.com',
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          cookies: { sessionid: 'abc123' },
        };
        expect(() =>
          DoubanHtmlBaseSchema.parse(baseWithOptionals),
        ).not.toThrow();
      });

      it('should accept optional responseTime', () => {
        const baseWithResponseTime = {
          title: '豆瓣读书',
          url: 'https://book.douban.com',
          statusCode: 200,
          responseTime: 1500,
        };
        expect(() =>
          DoubanHtmlBaseSchema.parse(baseWithResponseTime),
        ).not.toThrow();
      });

      it('should reject negative responseTime', () => {
        const invalidBase = {
          title: '豆瓣读书',
          url: 'https://book.douban.com',
          statusCode: 200,
          responseTime: -1,
        };
        expect(() => DoubanHtmlBaseSchema.parse(invalidBase)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('DoubanItemHtmlSchema', () => {
      const baseValidItem = {
        title: '银河系漫游指南',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      };

      it('should accept valid item HTML with jsonLd', () => {
        const validItem = {
          ...baseValidItem,
          jsonLd: {
            '@type': 'Book' as const,
            name: '银河系漫游指南',
            author: [{ '@type': 'Person', name: '道格拉斯·亚当斯' }],
          },
        };
        expect(() => DoubanItemHtmlSchema.parse(validItem)).not.toThrow();
      });

      it('should accept valid item HTML with pageElements', () => {
        const validItem = {
          ...baseValidItem,
          pageElements: {
            mainTitle: '银河系漫游指南',
            ratingValue: '8.5',
            authors: ['道格拉斯·亚当斯'],
          },
        };
        expect(() => DoubanItemHtmlSchema.parse(validItem)).not.toThrow();
      });

      it('should accept valid item HTML with userInteraction', () => {
        const validItem = {
          ...baseValidItem,
          userInteraction: {
            userRating: 5,
            userComment: '非常有趣',
            userTags: ['科幻', '推荐'],
            userStatus: 'collect' as const,
            markDate: '2023-01-01',
          },
        };
        expect(() => DoubanItemHtmlSchema.parse(validItem)).not.toThrow();
      });

      it('should validate jsonLd @type enum', () => {
        const validTypes = ['Book', 'Movie', 'TVSeries', 'CreativeWork'];
        validTypes.forEach((type) => {
          const item = {
            ...baseValidItem,
            jsonLd: {
              '@type': type,
              name: '测试',
            },
          };
          expect(() => DoubanItemHtmlSchema.parse(item)).not.toThrow();
        });

        const invalidItem = {
          ...baseValidItem,
          jsonLd: {
            '@type': 'InvalidType',
            name: '测试',
          },
        };
        expect(() => DoubanItemHtmlSchema.parse(invalidItem)).toThrow(
          z.ZodError,
        );
      });

      it('should validate aggregateRating with default bestRating', () => {
        const item = {
          ...baseValidItem,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试书籍',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: 8.5,
              ratingCount: 1000,
            },
          },
        };
        const parsed = DoubanItemHtmlSchema.parse(item);
        expect(parsed.jsonLd?.aggregateRating?.bestRating).toBe(10);
      });

      it('should accept optional jsonLd fields', () => {
        const itemWithOptionals = {
          ...baseValidItem,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试书籍',
            alternateName: '别名',
            datePublished: '2020-01-01',
            isbn: '9787532745723',
            description: '详细描述',
            image: 'https://example.com/cover.jpg',
          },
        };
        expect(() =>
          DoubanItemHtmlSchema.parse(itemWithOptionals),
        ).not.toThrow();
      });

      it('should validate userInteraction userStatus enum', () => {
        const validStatuses = ['wish', 'do', 'collect'];
        validStatuses.forEach((status) => {
          const item = {
            ...baseValidItem,
            userInteraction: {
              userStatus: status,
            },
          };
          expect(() => DoubanItemHtmlSchema.parse(item)).not.toThrow();
        });

        const invalidItem = {
          ...baseValidItem,
          userInteraction: {
            userStatus: 'invalid',
          },
        };
        expect(() => DoubanItemHtmlSchema.parse(invalidItem)).toThrow(
          z.ZodError,
        );
      });

      it('should validate userRating range (1-5)', () => {
        const validRatings = [1, 2, 3, 4, 5, 3.5];
        validRatings.forEach((rating) => {
          const item = {
            ...baseValidItem,
            userInteraction: {
              userRating: rating,
            },
          };
          expect(() => DoubanItemHtmlSchema.parse(item)).not.toThrow();
        });

        const invalidRatings = [0, 6, -1, 5.1];
        invalidRatings.forEach((rating) => {
          const item = {
            ...baseValidItem,
            userInteraction: {
              userRating: rating,
            },
          };
          expect(() => DoubanItemHtmlSchema.parse(item)).toThrow(z.ZodError);
        });
      });

      it('should apply default empty arrays for genre, genres, authors, etc.', () => {
        const item = {
          ...baseValidItem,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试',
          },
        };
        const parsed = DoubanItemHtmlSchema.parse(item);
        expect(parsed.jsonLd?.genre).toEqual([]);
      });
    });

    describe('DoubanBookHtmlSchema', () => {
      const baseValidBook = {
        title: '银河系漫游指南',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      };

      it('should accept valid book HTML structure', () => {
        const validBook = {
          ...baseValidBook,
          jsonLd: {
            '@type': 'Book' as const,
            name: '银河系漫游指南',
            author: [{ '@type': 'Person', name: '道格拉斯·亚当斯' }],
          },
        };
        expect(() => DoubanBookHtmlSchema.parse(validBook)).not.toThrow();
      });

      it('should enforce @type as "Book"', () => {
        const invalidBook = {
          ...baseValidBook,
          jsonLd: {
            '@type': 'Movie',
            name: '测试',
            author: [{ '@type': 'Person', name: '作者' }],
          },
        };
        expect(() => DoubanBookHtmlSchema.parse(invalidBook)).toThrow(
          z.ZodError,
        );
      });

      it('should require author field in jsonLd', () => {
        const validBook = {
          ...baseValidBook,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试书籍',
            author: [{ '@type': 'Person', name: '作者' }],
          },
        };
        expect(() => DoubanBookHtmlSchema.parse(validBook)).not.toThrow();
      });

      it('should accept optional book-specific fields (numberOfPages, bookFormat, isbn)', () => {
        const bookWithOptionals = {
          ...baseValidBook,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试书籍',
            author: [{ '@type': 'Person', name: '作者' }],
            numberOfPages: 300,
            bookFormat: '平装',
            isbn: '9787532745723',
          },
        };
        expect(() =>
          DoubanBookHtmlSchema.parse(bookWithOptionals),
        ).not.toThrow();
      });

      it('should accept bookSpecific with translators and binding', () => {
        const bookWithSpecific = {
          ...baseValidBook,
          bookSpecific: {
            translators: ['姚向辉'],
            binding: '平装',
            price: '25.00元',
          },
        };
        expect(() =>
          DoubanBookHtmlSchema.parse(bookWithSpecific),
        ).not.toThrow();
      });

      it('should inherit all DoubanItemHtmlSchema validations', () => {
        const bookWithUserInteraction = {
          ...baseValidBook,
          userInteraction: {
            userRating: 5,
            userStatus: 'collect' as const,
          },
        };
        expect(() =>
          DoubanBookHtmlSchema.parse(bookWithUserInteraction),
        ).not.toThrow();
      });
    });

    describe('DoubanMovieHtmlSchema', () => {
      const baseValidMovie = {
        title: '肖申克的救赎',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      };

      it('should accept valid movie HTML structure', () => {
        const validMovie = {
          ...baseValidMovie,
          jsonLd: {
            '@type': 'Movie' as const,
            name: '肖申克的救赎',
            director: [{ '@type': 'Person', name: '弗兰克·德拉邦特' }],
          },
        };
        expect(() => DoubanMovieHtmlSchema.parse(validMovie)).not.toThrow();
      });

      it('should enforce @type as "Movie"', () => {
        const invalidMovie = {
          ...baseValidMovie,
          jsonLd: {
            '@type': 'Book',
            name: '测试',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };
        expect(() => DoubanMovieHtmlSchema.parse(invalidMovie)).toThrow(
          z.ZodError,
        );
      });

      it('should require director field in jsonLd', () => {
        const validMovie = {
          ...baseValidMovie,
          jsonLd: {
            '@type': 'Movie' as const,
            name: '测试电影',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };
        expect(() => DoubanMovieHtmlSchema.parse(validMovie)).not.toThrow();
      });

      it('should accept optional movie-specific fields (duration, countryOfOrigin, inLanguage)', () => {
        const movieWithOptionals = {
          ...baseValidMovie,
          jsonLd: {
            '@type': 'Movie' as const,
            name: '测试电影',
            director: [{ '@type': 'Person', name: '导演' }],
            duration: '142分钟',
            countryOfOrigin: [{ '@type': 'Country', name: '美国' }],
            inLanguage: ['英语'],
          },
        };
        expect(() =>
          DoubanMovieHtmlSchema.parse(movieWithOptionals),
        ).not.toThrow();
      });

      it('should accept movieSpecific with imdbId and writers', () => {
        const movieWithSpecific = {
          ...baseValidMovie,
          movieSpecific: {
            imdbId: 'tt0111161',
            writers: ['Stephen King'],
            releaseYear: 1994,
          },
        };
        expect(() =>
          DoubanMovieHtmlSchema.parse(movieWithSpecific),
        ).not.toThrow();
      });

      it('should apply default empty arrays for actor and inLanguage', () => {
        const movie = {
          ...baseValidMovie,
          jsonLd: {
            '@type': 'Movie' as const,
            name: '测试',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };
        const parsed = DoubanMovieHtmlSchema.parse(movie);
        expect(parsed.jsonLd?.actor).toEqual([]);
        expect(parsed.jsonLd?.inLanguage).toEqual([]);
      });
    });

    describe('DoubanTvHtmlSchema', () => {
      const baseValidTv = {
        title: '权力的游戏',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      };

      it('should accept valid TV HTML structure', () => {
        const validTv = {
          ...baseValidTv,
          jsonLd: {
            '@type': 'TVSeries' as const,
            name: '权力的游戏',
            director: [{ '@type': 'Person', name: '大卫·贝尼奥夫' }],
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(validTv)).not.toThrow();
      });

      it('should enforce @type as "TVSeries"', () => {
        const invalidTv = {
          ...baseValidTv,
          jsonLd: {
            '@type': 'Movie',
            name: '测试',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(invalidTv)).toThrow(z.ZodError);
      });

      it('should require director field in jsonLd', () => {
        const validTv = {
          ...baseValidTv,
          jsonLd: {
            '@type': 'TVSeries' as const,
            name: '测试电视剧',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(validTv)).not.toThrow();
      });

      it('should accept optional TV-specific fields (numberOfEpisodes, episodeRunTime)', () => {
        const tvWithOptionals = {
          ...baseValidTv,
          jsonLd: {
            '@type': 'TVSeries' as const,
            name: '测试电视剧',
            director: [{ '@type': 'Person', name: '导演' }],
            numberOfEpisodes: 73,
            episodeRunTime: '60分钟',
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(tvWithOptionals)).not.toThrow();
      });

      it('should accept tvSpecific with episodeCount and network', () => {
        const tvWithSpecific = {
          ...baseValidTv,
          tvSpecific: {
            episodeCount: 73,
            episodeDuration: '60分钟',
            seasons: 8,
            network: 'HBO',
            firstAirDate: '2011-04-17',
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(tvWithSpecific)).not.toThrow();
      });

      it('should validate tvSpecific status enum (ended, ongoing, upcoming)', () => {
        const validStatuses = ['ended', 'ongoing', 'upcoming'];
        validStatuses.forEach((status) => {
          const tv = {
            ...baseValidTv,
            tvSpecific: {
              status: status as 'ended' | 'ongoing' | 'upcoming',
            },
          };
          expect(() => DoubanTvHtmlSchema.parse(tv)).not.toThrow();
        });

        const invalidTv = {
          ...baseValidTv,
          tvSpecific: {
            status: 'invalid',
          },
        };
        expect(() => DoubanTvHtmlSchema.parse(invalidTv)).toThrow(z.ZodError);
      });
    });

    describe('DoubanCollectionHtmlSchema', () => {
      const baseValidCollection = {
        title: '我的读书收藏',
        url: 'https://book.douban.com/people/user123/collect',
        statusCode: 200,
        collectionType: 'books' as const,
        collectionStatus: 'collect' as const,
        pagination: {
          currentPage: 1,
          totalPages: 10,
          totalItems: 150,
          itemsPerPage: 15,
          hasNextPage: true,
          hasPrevPage: false,
        },
        items: [],
      };

      it('should accept valid collection HTML structure', () => {
        expect(() =>
          DoubanCollectionHtmlSchema.parse(baseValidCollection),
        ).not.toThrow();
      });

      it('should validate collectionType enum (books, movies, tv, music)', () => {
        const validTypes = ['books', 'movies', 'tv', 'music'];
        validTypes.forEach((type) => {
          const collection = {
            ...baseValidCollection,
            collectionType: type,
          };
          expect(() =>
            DoubanCollectionHtmlSchema.parse(collection),
          ).not.toThrow();
        });

        const invalidCollection = {
          ...baseValidCollection,
          collectionType: 'invalid',
        };
        expect(() =>
          DoubanCollectionHtmlSchema.parse(invalidCollection),
        ).toThrow(z.ZodError);
      });

      it('should validate collectionStatus enum (wish, do, collect)', () => {
        const validStatuses = ['wish', 'do', 'collect'];
        validStatuses.forEach((status) => {
          const collection = {
            ...baseValidCollection,
            collectionStatus: status,
          };
          expect(() =>
            DoubanCollectionHtmlSchema.parse(collection),
          ).not.toThrow();
        });

        const invalidCollection = {
          ...baseValidCollection,
          collectionStatus: 'invalid',
        };
        expect(() =>
          DoubanCollectionHtmlSchema.parse(invalidCollection),
        ).toThrow(z.ZodError);
      });

      it('should validate pagination structure', () => {
        const validPagination = {
          ...baseValidCollection,
          pagination: {
            currentPage: 2,
            totalPages: 5,
            totalItems: 75,
            itemsPerPage: 15,
            hasNextPage: true,
            hasPrevPage: true,
          },
        };
        expect(() =>
          DoubanCollectionHtmlSchema.parse(validPagination),
        ).not.toThrow();
      });

      it('should enforce pagination constraints (currentPage >= 1, totalPages >= 1)', () => {
        const invalidPaginations = [
          {
            ...baseValidCollection,
            pagination: { ...baseValidCollection.pagination, currentPage: 0 },
          },
          {
            ...baseValidCollection,
            pagination: { ...baseValidCollection.pagination, totalPages: 0 },
          },
          {
            ...baseValidCollection,
            pagination: { ...baseValidCollection.pagination, totalItems: -1 },
          },
        ];

        invalidPaginations.forEach((collection) => {
          expect(() => DoubanCollectionHtmlSchema.parse(collection)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate items array structure', () => {
        const collectionWithItems = {
          ...baseValidCollection,
          items: [
            {
              subjectId: '12345',
              title: '银河系漫游指南',
              url: 'https://book.douban.com/subject/12345/',
              coverImage: 'https://example.com/cover.jpg',
              rating: {
                average: 8.5,
                userRating: 5,
              },
              userComment: '非常好',
              userTags: ['科幻'],
              markDate: '2023-01-01',
            },
          ],
        };
        expect(() =>
          DoubanCollectionHtmlSchema.parse(collectionWithItems),
        ).not.toThrow();
      });

      it('should validate item rating range (0-10 for average, 1-5 for userRating)', () => {
        const validRatings = [
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: 0, userRating: 1 },
              },
            ],
          },
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: 10, userRating: 5 },
              },
            ],
          },
        ];

        validRatings.forEach((collection) => {
          expect(() =>
            DoubanCollectionHtmlSchema.parse(collection),
          ).not.toThrow();
        });

        const invalidRatings = [
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: -1, userRating: 1 },
              },
            ],
          },
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: 11, userRating: 5 },
              },
            ],
          },
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: 8.5, userRating: 0 },
              },
            ],
          },
          {
            ...baseValidCollection,
            items: [
              {
                subjectId: '12345',
                title: '测试',
                url: 'https://book.douban.com/subject/12345/',
                rating: { average: 8.5, userRating: 6 },
              },
            ],
          },
        ];

        invalidRatings.forEach((collection) => {
          expect(() => DoubanCollectionHtmlSchema.parse(collection)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should accept optional userProfile', () => {
        const collectionWithProfile = {
          ...baseValidCollection,
          userProfile: {
            userId: 'user123',
            username: '测试用户',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        };
        expect(() =>
          DoubanCollectionHtmlSchema.parse(collectionWithProfile),
        ).not.toThrow();
      });
    });

    describe('DoubanHttpErrorSchema', () => {
      it('should accept valid HTTP error structure', () => {
        const validError = {
          statusCode: 404,
          error: 'Not Found',
          message: '页面不存在',
          url: 'https://book.douban.com/subject/invalid/',
        };
        expect(() => DoubanHttpErrorSchema.parse(validError)).not.toThrow();
      });

      it('should validate statusCode range (400-599)', () => {
        const validCodes = [400, 404, 500, 503, 599];
        validCodes.forEach((code) => {
          const error = {
            statusCode: code,
            error: 'Error',
            message: '错误',
            url: 'https://book.douban.com',
          };
          expect(() => DoubanHttpErrorSchema.parse(error)).not.toThrow();
        });

        const invalidCodes = [399, 600];
        invalidCodes.forEach((code) => {
          const error = {
            statusCode: code,
            error: 'Error',
            message: '错误',
            url: 'https://book.douban.com',
          };
          expect(() => DoubanHttpErrorSchema.parse(error)).toThrow(z.ZodError);
        });
      });

      it('should apply default values for isAntiSpiderDetected and requiresCookieRefresh', () => {
        const error = {
          statusCode: 403,
          error: 'Forbidden',
          message: '禁止访问',
          url: 'https://book.douban.com',
        };
        const parsed = DoubanHttpErrorSchema.parse(error);
        expect(parsed.isAntiSpiderDetected).toBe(false);
        expect(parsed.requiresCookieRefresh).toBe(false);
      });

      it('should apply default timestamp as current date', () => {
        const error = {
          statusCode: 500,
          error: 'Internal Server Error',
          message: '服务器错误',
          url: 'https://book.douban.com',
        };
        const parsed = DoubanHttpErrorSchema.parse(error);
        expect(parsed.timestamp).toBeInstanceOf(Date);
      });

      it('should accept optional retryAfterSeconds', () => {
        const errorWithRetry = {
          statusCode: 429,
          error: 'Too Many Requests',
          message: '请求过多',
          url: 'https://book.douban.com',
          retryAfterSeconds: 60,
        };
        expect(() => DoubanHttpErrorSchema.parse(errorWithRetry)).not.toThrow();
      });

      it('should accept optional responseBody and responseHeaders', () => {
        const errorWithDetails = {
          statusCode: 403,
          error: 'Forbidden',
          message: '禁止访问',
          url: 'https://book.douban.com',
          responseBody: '<html>禁止访问</html>',
          responseHeaders: { 'content-type': 'text/html' },
        };
        expect(() =>
          DoubanHttpErrorSchema.parse(errorWithDetails),
        ).not.toThrow();
      });
    });

    describe('DoubanRateLimitSchema', () => {
      it('should accept valid rate limit structure', () => {
        const validRateLimit = {
          isRateLimited: false,
          resetTime: new Date('2023-12-31T23:59:59Z'),
          remainingRequests: 50,
        };
        expect(() => DoubanRateLimitSchema.parse(validRateLimit)).not.toThrow();
      });

      it('should apply default limitPerHour as 100', () => {
        const rateLimit = {
          isRateLimited: false,
        };
        const parsed = DoubanRateLimitSchema.parse(rateLimit);
        expect(parsed.limitPerHour).toBe(100);
      });

      it('should apply default currentWindowStart as current date', () => {
        const rateLimit = {
          isRateLimited: false,
        };
        const parsed = DoubanRateLimitSchema.parse(rateLimit);
        expect(parsed.currentWindowStart).toBeInstanceOf(Date);
      });

      it('should accept optional resetTime and remainingRequests', () => {
        const rateLimitWithOptionals = {
          isRateLimited: true,
          resetTime: new Date('2023-12-31T23:59:59Z'),
          remainingRequests: 0,
          limitPerHour: 200,
        };
        expect(() =>
          DoubanRateLimitSchema.parse(rateLimitWithOptionals),
        ).not.toThrow();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateDoubanHtml', () => {
      describe('Type: book', () => {
        it('should return success for valid book HTML', () => {
          const validBook = {
            title: '银河系漫游指南',
            url: 'https://book.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Book' as const,
              name: '银河系漫游指南',
              author: [{ '@type': 'Person', name: '道格拉斯·亚当斯' }],
            },
          };

          const result = validateDoubanHtml(validBook, 'book');

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.title).toBe('银河系漫游指南');
          }
        });

        it('should return error for invalid book HTML', () => {
          const invalidBook = {
            title: '',
            url: 'https://book.douban.com/subject/12345/',
            statusCode: 200,
          };

          const result = validateDoubanHtml(invalidBook, 'book');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('豆瓣HTML验证失败');
          }
        });

        it('should enforce @type as "Book" for book validation', () => {
          const wrongTypeBook = {
            title: '测试',
            url: 'https://book.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Movie' as const,
              name: '测试',
              director: [{ '@type': 'Person', name: '导演' }],
            },
          };

          const result = validateDoubanHtml(wrongTypeBook, 'book');

          expect(result.success).toBe(false);
        });
      });

      describe('Type: movie', () => {
        it('should return success for valid movie HTML', () => {
          const validMovie = {
            title: '肖申克的救赎',
            url: 'https://movie.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Movie' as const,
              name: '肖申克的救赎',
              director: [{ '@type': 'Person', name: '弗兰克·德拉邦特' }],
            },
          };

          const result = validateDoubanHtml(validMovie, 'movie');

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.title).toBe('肖申克的救赎');
          }
        });

        it('should return error for invalid movie HTML', () => {
          const invalidMovie = {
            title: '测试',
            url: 'invalid-url',
            statusCode: 200,
          };

          const result = validateDoubanHtml(invalidMovie, 'movie');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('豆瓣HTML验证失败');
          }
        });

        it('should enforce @type as "Movie" for movie validation', () => {
          const wrongTypeMovie = {
            title: '测试',
            url: 'https://movie.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Book' as const,
              name: '测试',
              author: [{ '@type': 'Person', name: '作者' }],
            },
          };

          const result = validateDoubanHtml(wrongTypeMovie, 'movie');

          expect(result.success).toBe(false);
        });
      });

      describe('Type: tv', () => {
        it('should return success for valid TV HTML', () => {
          const validTv = {
            title: '权力的游戏',
            url: 'https://movie.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'TVSeries' as const,
              name: '权力的游戏',
              director: [{ '@type': 'Person', name: '大卫·贝尼奥夫' }],
            },
          };

          const result = validateDoubanHtml(validTv, 'tv');

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.title).toBe('权力的游戏');
          }
        });

        it('should return error for invalid TV HTML', () => {
          const invalidTv = {
            title: '测试',
            url: 'https://movie.douban.com/subject/12345/',
            statusCode: 100,
          };

          const result = validateDoubanHtml(invalidTv, 'tv');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('豆瓣HTML验证失败');
          }
        });

        it('should enforce @type as "TVSeries" for TV validation', () => {
          const wrongTypeTv = {
            title: '测试',
            url: 'https://movie.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Movie' as const,
              name: '测试',
              director: [{ '@type': 'Person', name: '导演' }],
            },
          };

          const result = validateDoubanHtml(wrongTypeTv, 'tv');

          expect(result.success).toBe(false);
        });
      });

      describe('Type: collection', () => {
        it('should return success for valid collection HTML', () => {
          const validCollection = {
            title: '我的收藏',
            url: 'https://book.douban.com/people/user123/collect',
            statusCode: 200,
            collectionType: 'books' as const,
            collectionStatus: 'collect' as const,
            pagination: {
              currentPage: 1,
              totalPages: 5,
              totalItems: 75,
              itemsPerPage: 15,
              hasNextPage: true,
              hasPrevPage: false,
            },
            items: [],
          };

          const result = validateDoubanHtml(validCollection, 'collection');

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.collectionType).toBe('books');
          }
        });

        it('should return error for invalid collection HTML', () => {
          const invalidCollection = {
            title: '测试',
            url: 'https://book.douban.com/people/user123/collect',
            statusCode: 200,
            collectionType: 'invalid',
            collectionStatus: 'collect',
          };

          const result = validateDoubanHtml(invalidCollection, 'collection');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('豆瓣HTML验证失败');
          }
        });
      });

      describe('Error Handling', () => {
        it('should format ZodError messages correctly', () => {
          const invalidData = {
            title: '',
            url: 'invalid-url',
            statusCode: 100,
          };

          const result = validateDoubanHtml(invalidData, 'book');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toContain('豆瓣HTML验证失败');
            expect(result.error).toMatch(/title|url|statusCode/);
          }
        });

        it('should handle non-ZodError exceptions', () => {
          const invalidType = 'unsupported' as 'book';
          const result = validateDoubanHtml({}, invalidType);

          expect(result.success).toBe(false);
        });

        it('should return error for unsupported type', () => {
          // @ts-expect-error: Testing runtime behavior with invalid type
          const result = validateDoubanHtml({}, 'unsupported');

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBe('不支持的豆瓣页面类型');
          }
        });
      });

      describe('Type Safety', () => {
        it('should provide correct type inference for each overload', () => {
          const bookData = {
            title: '测试',
            url: 'https://book.douban.com/subject/12345/',
            statusCode: 200,
            jsonLd: {
              '@type': 'Book' as const,
              name: '测试',
              author: [{ '@type': 'Person', name: '作者' }],
            },
          };

          const result = validateDoubanHtml(bookData, 'book');

          if (result.success) {
            // TypeScript should infer result.data as DoubanBookHtml
            expect(result.data.jsonLd?.['@type']).toBe('Book');
          }
        });
      });
    });

    describe('isValidDoubanHtml', () => {
      it('should return true for valid HTML (no type specified)', () => {
        const validHtml = {
          title: '测试',
          url: 'https://book.douban.com/subject/12345/',
          statusCode: 200,
        };

        expect(isValidDoubanHtml(validHtml)).toBe(true);
      });

      it('should return false for invalid HTML (no type specified)', () => {
        const invalidHtml = {
          title: '',
          url: 'invalid-url',
          statusCode: 100,
        };

        expect(isValidDoubanHtml(invalidHtml)).toBe(false);
      });

      it('should return true for valid book HTML (type="book")', () => {
        const validBook = {
          title: '测试',
          url: 'https://book.douban.com/subject/12345/',
          statusCode: 200,
          jsonLd: {
            '@type': 'Book' as const,
            name: '测试',
            author: [{ '@type': 'Person', name: '作者' }],
          },
        };

        expect(isValidDoubanHtml(validBook, 'book')).toBe(true);
      });

      it('should return false for invalid book HTML (type="book")', () => {
        const invalidBook = {
          title: '',
          url: 'https://book.douban.com/subject/12345/',
          statusCode: 200,
        };

        expect(isValidDoubanHtml(invalidBook, 'book')).toBe(false);
      });

      it('should return true for valid movie HTML (type="movie")', () => {
        const validMovie = {
          title: '测试',
          url: 'https://movie.douban.com/subject/12345/',
          statusCode: 200,
          jsonLd: {
            '@type': 'Movie' as const,
            name: '测试',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };

        expect(isValidDoubanHtml(validMovie, 'movie')).toBe(true);
      });

      it('should return false for invalid movie HTML (type="movie")', () => {
        const invalidMovie = {
          title: '测试',
          url: 'invalid-url',
          statusCode: 200,
        };

        expect(isValidDoubanHtml(invalidMovie, 'movie')).toBe(false);
      });

      it('should return true for valid TV HTML (type="tv")', () => {
        const validTv = {
          title: '测试',
          url: 'https://movie.douban.com/subject/12345/',
          statusCode: 200,
          jsonLd: {
            '@type': 'TVSeries' as const,
            name: '测试',
            director: [{ '@type': 'Person', name: '导演' }],
          },
        };

        expect(isValidDoubanHtml(validTv, 'tv')).toBe(true);
      });

      it('should return false for invalid TV HTML (type="tv")', () => {
        const invalidTv = {
          title: '测试',
          url: 'https://movie.douban.com/subject/12345/',
          statusCode: 100,
        };

        expect(isValidDoubanHtml(invalidTv, 'tv')).toBe(false);
      });

      it('should return true for valid collection HTML (type="collection")', () => {
        const validCollection = {
          title: '测试',
          url: 'https://book.douban.com/people/user123/collect',
          statusCode: 200,
          collectionType: 'books' as const,
          collectionStatus: 'collect' as const,
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalItems: 75,
            itemsPerPage: 15,
            hasNextPage: true,
            hasPrevPage: false,
          },
          items: [],
        };

        expect(isValidDoubanHtml(validCollection, 'collection')).toBe(true);
      });

      it('should return false for invalid collection HTML (type="collection")', () => {
        const invalidCollection = {
          title: '测试',
          url: 'https://book.douban.com/people/user123/collect',
          statusCode: 200,
          collectionType: 'invalid',
        };

        expect(isValidDoubanHtml(invalidCollection, 'collection')).toBe(false);
      });

      it('should act as proper type guard', () => {
        const data: unknown = {
          title: '测试',
          url: 'https://book.douban.com/subject/12345/',
          statusCode: 200,
        };

        if (isValidDoubanHtml(data)) {
          // TypeScript should recognize data as DoubanItemHtml here
          expect(data.title).toBe('测试');
          expect(data.statusCode).toBe(200);
        } else {
          fail('Type guard should have returned true for valid data');
        }
      });

      it('should handle edge cases (null, undefined, wrong types)', () => {
        const edgeCases = [null, undefined, 'string', 123, [], {}];

        edgeCases.forEach((testCase) => {
          expect(isValidDoubanHtml(testCase)).toBe(false);
        });
      });

      it('should return false for unsupported type', () => {
        const validHtml = {
          title: '测试',
          url: 'https://book.douban.com/subject/12345/',
          statusCode: 200,
        };

        // @ts-expect-error: Testing runtime behavior with invalid type
        expect(isValidDoubanHtml(validHtml, 'unsupported')).toBe(false);
      });
    });
  });

  describe('Type Inference', () => {
    it('should export correct TypeScript types for all schemas', () => {
      const htmlBase: DoubanHtmlBase = {
        title: '测试',
        url: 'https://book.douban.com',
        statusCode: 200,
      };

      const itemHtml: DoubanItemHtml = {
        title: '测试',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      };

      const bookHtml: DoubanBookHtml = {
        title: '测试',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      };

      const movieHtml: DoubanMovieHtml = {
        title: '测试',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      };

      const tvHtml: DoubanTvHtml = {
        title: '测试',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      };

      const collectionHtml: DoubanCollectionHtml = {
        title: '测试',
        url: 'https://book.douban.com/people/user123/collect',
        statusCode: 200,
        collectionType: 'books',
        collectionStatus: 'collect',
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalItems: 75,
          itemsPerPage: 15,
          hasNextPage: true,
          hasPrevPage: false,
        },
        items: [],
      };

      const httpError: DoubanHttpError = {
        statusCode: 404,
        error: 'Not Found',
        message: '错误',
        url: 'https://book.douban.com',
        timestamp: new Date(),
        isAntiSpiderDetected: false,
        requiresCookieRefresh: false,
      };

      const rateLimit: DoubanRateLimit = {
        isRateLimited: false,
        limitPerHour: 100,
        currentWindowStart: new Date(),
      };

      expect(htmlBase).toBeDefined();
      expect(itemHtml).toBeDefined();
      expect(bookHtml).toBeDefined();
      expect(movieHtml).toBeDefined();
      expect(tvHtml).toBeDefined();
      expect(collectionHtml).toBeDefined();
      expect(httpError).toBeDefined();
      expect(rateLimit).toBeDefined();
    });

    it('should validate type consistency between manual types and schema inferences', () => {
      expect(() =>
        DoubanHtmlBaseSchema.parse({
          title: '测试',
          url: 'https://book.douban.com',
          statusCode: 200,
        } as DoubanHtmlBase),
      ).not.toThrow();

      expect(() =>
        DoubanCollectionHtmlSchema.parse({
          title: '测试',
          url: 'https://book.douban.com/people/user123/collect',
          statusCode: 200,
          collectionType: 'books',
          collectionStatus: 'collect',
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalItems: 75,
            itemsPerPage: 15,
            hasNextPage: true,
            hasPrevPage: false,
          },
          items: [],
        } as DoubanCollectionHtml),
      ).not.toThrow();
    });

    it('should ensure all 8 exported types match their schemas', () => {
      type InferredHtmlBase = z.infer<typeof DoubanHtmlBaseSchema>;
      type InferredItemHtml = z.infer<typeof DoubanItemHtmlSchema>;
      type InferredBookHtml = z.infer<typeof DoubanBookHtmlSchema>;
      type InferredMovieHtml = z.infer<typeof DoubanMovieHtmlSchema>;
      type InferredTvHtml = z.infer<typeof DoubanTvHtmlSchema>;
      type InferredCollectionHtml = z.infer<typeof DoubanCollectionHtmlSchema>;
      type InferredHttpError = z.infer<typeof DoubanHttpErrorSchema>;
      type InferredRateLimit = z.infer<typeof DoubanRateLimitSchema>;

      const htmlBase: DoubanHtmlBase = {
        title: '测试',
        url: 'https://book.douban.com',
        statusCode: 200,
      } as InferredHtmlBase;

      const itemHtml: DoubanItemHtml = {
        title: '测试',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      } as InferredItemHtml;

      const bookHtml: DoubanBookHtml = {
        title: '测试',
        url: 'https://book.douban.com/subject/12345/',
        statusCode: 200,
      } as InferredBookHtml;

      const movieHtml: DoubanMovieHtml = {
        title: '测试',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      } as InferredMovieHtml;

      const tvHtml: DoubanTvHtml = {
        title: '测试',
        url: 'https://movie.douban.com/subject/12345/',
        statusCode: 200,
      } as InferredTvHtml;

      const collectionHtml: DoubanCollectionHtml = {
        title: '测试',
        url: 'https://book.douban.com/people/user123/collect',
        statusCode: 200,
        collectionType: 'books',
        collectionStatus: 'collect',
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalItems: 75,
          itemsPerPage: 15,
          hasNextPage: true,
          hasPrevPage: false,
        },
        items: [],
      } as InferredCollectionHtml;

      const httpError: DoubanHttpError = {
        statusCode: 404,
        error: 'Not Found',
        message: '错误',
        url: 'https://book.douban.com',
        timestamp: new Date(),
        isAntiSpiderDetected: false,
        requiresCookieRefresh: false,
      } as InferredHttpError;

      const rateLimit: DoubanRateLimit = {
        isRateLimited: false,
        limitPerHour: 100,
        currentWindowStart: new Date(),
      } as InferredRateLimit;

      expect(htmlBase.title).toBe('测试');
      expect(itemHtml.statusCode).toBe(200);
      expect(bookHtml.url).toContain('book.douban.com');
      expect(movieHtml.url).toContain('movie.douban.com');
      expect(tvHtml.statusCode).toBe(200);
      expect(collectionHtml.collectionType).toBe('books');
      expect(httpError.statusCode).toBe(404);
      expect(rateLimit.isRateLimited).toBe(false);
    });
  });
});
