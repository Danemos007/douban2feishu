/**
 * parsed-result.schema.ts 单元测试
 *
 * 测试覆盖豆瓣解析结果所有 Zod Schema 定义和工具函数
 * 目标覆盖率: 90%+
 */

import { z } from 'zod';
import {
  DoubanItemBaseSchema,
  DoubanBookSchema,
  DoubanMovieSchema,
  DoubanMusicSchema,
  DoubanTvSeriesSchema,
  DoubanDocumentarySchema,
  DoubanItemSchema,
  DoubanBatchResultSchema,
  DoubanParsingContextSchema,
  validateDoubanItem,
  validateDoubanItemByType,
  isDoubanBook,
  isDoubanMovie,
  isDoubanTvSeries,
  isDoubanDocumentary,
  inferDoubanItemType,
  type DoubanBook,
  type DoubanMovie,
  type DoubanMusic,
  type DoubanTvSeries,
  type DoubanDocumentary,
  type DoubanBatchResult,
  type DoubanParsingContext,
} from './parsed-result.schema';

// 测试数据工厂函数
const createBaseItem = (overrides = {}) => ({
  subjectId: '123456',
  title: '测试标题',
  doubanUrl: 'https://movie.douban.com/subject/123456/',
  category: 'books',
  ...overrides,
});

const createValidBook = (overrides = {}): DoubanBook => ({
  subjectId: '123456',
  title: '测试书籍',
  doubanUrl: 'https://book.douban.com/subject/123456/',
  category: 'books',
  authors: ['测试作者'],
  genres: ['小说'],
  userTags: [],
  directors: [],
  cast: [],
  artists: [],
  translators: [],
  ...overrides,
});

const createValidMovie = (overrides = {}): DoubanMovie => ({
  subjectId: '123456',
  title: '测试电影',
  doubanUrl: 'https://movie.douban.com/subject/123456/',
  category: 'movies',
  directors: ['测试导演'],
  genres: ['剧情'],
  userTags: [],
  countries: [],
  languages: [],
  writers: [],
  cast: [],
  authors: [],
  artists: [],
  ...overrides,
});

const createValidMusic = (overrides = {}): DoubanMusic => ({
  subjectId: '123456',
  title: '测试音乐',
  doubanUrl: 'https://music.douban.com/subject/123456/',
  category: 'music',
  artists: ['测试艺术家'],
  genres: ['流行'],
  userTags: [],
  directors: [],
  cast: [],
  authors: [],
  ...overrides,
});

const createValidTvSeries = (overrides = {}): DoubanTvSeries => ({
  subjectId: '123456',
  title: '测试电视剧',
  doubanUrl: 'https://movie.douban.com/subject/123456/',
  category: 'tv',
  directors: ['测试导演'],
  genres: ['剧情'],
  userTags: [],
  countries: [],
  languages: [],
  writers: [],
  cast: [],
  authors: [],
  artists: [],
  ...overrides,
});

const createValidDocumentary = (overrides = {}): DoubanDocumentary => ({
  subjectId: '123456',
  title: '测试纪录片',
  doubanUrl: 'https://movie.douban.com/subject/123456/',
  category: 'documentary',
  directors: ['测试导演'],
  genres: ['纪录片'],
  userTags: [],
  countries: [],
  languages: [],
  writers: [],
  cast: [],
  authors: [],
  artists: [],
  ...overrides,
});

describe('parsed-result.schema.ts', () => {
  describe('Schema Definitions', () => {
    describe('DoubanItemBaseSchema', () => {
      it('should accept valid base douban item data', () => {
        const validData = createBaseItem({
          year: 2023,
          rating: { average: 8.5, numRaters: 1000 },
          genres: ['测试类型'],
          summary: '测试摘要',
          coverUrl: 'https://example.com/cover.jpg',
          userRating: 5,
          userComment: '测试评论',
          userTags: ['测试标签'],
          readDate: new Date(),
        });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid subjectId (empty string)', () => {
        const invalidData = createBaseItem({ subjectId: '' });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should reject invalid title (empty string)', () => {
        const invalidData = createBaseItem({ title: '' });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should validate rating with correct range (0-10)', () => {
        const validData = createBaseItem({
          rating: { average: 8.5, numRaters: 100 },
        });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should reject rating outside valid range', () => {
        const invalidData = createBaseItem({
          rating: { average: 11.0, numRaters: 100 },
        });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should validate year within acceptable range (1800-2100)', () => {
        const validData = createBaseItem({ year: 2023 });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should reject year outside acceptable range', () => {
        const invalidData = createBaseItem({ year: 1500 });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should accept valid category enum values', () => {
        const validCategories = ['books', 'movies', 'music'];

        validCategories.forEach((category) => {
          const validData = createBaseItem({ category });
          expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
        });
      });

      it('should reject invalid category values', () => {
        const invalidData = createBaseItem({ category: 'invalid' });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should validate userRating within range (1-5)', () => {
        const validData = createBaseItem({ userRating: 4 });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should reject userRating outside valid range', () => {
        const invalidData = createBaseItem({ userRating: 6 });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional fields as undefined', () => {
        const validData = createBaseItem({
          year: undefined,
          rating: undefined,
          summary: undefined,
          coverUrl: undefined,
          userRating: undefined,
          userComment: undefined,
          readDate: undefined,
        });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should validate URL fields properly', () => {
        const validData = createBaseItem({
          doubanUrl: 'https://book.douban.com/subject/123456/',
          coverUrl: 'https://example.com/cover.jpg',
        });

        expect(() => DoubanItemBaseSchema.parse(validData)).not.toThrow();
      });

      it('should reject invalid URLs', () => {
        const invalidData = createBaseItem({
          doubanUrl: 'not-a-url',
        });

        expect(() => DoubanItemBaseSchema.parse(invalidData)).toThrow(
          z.ZodError,
        );
      });

      it('should apply default values for arrays', () => {
        const data = createBaseItem();
        const parsed = DoubanItemBaseSchema.parse(data);

        expect(parsed.genres).toEqual([]);
        expect(parsed.userTags).toEqual([]);
        expect(parsed.directors).toEqual([]);
        expect(parsed.cast).toEqual([]);
        expect(parsed.authors).toEqual([]);
        expect(parsed.artists).toEqual([]);
      });
    });

    describe('DoubanBookSchema', () => {
      it('should accept complete valid book data', () => {
        const validBook = createValidBook({
          isbn: '978-0123456789',
          publisher: '测试出版社',
          publishDate: '2023-01-01',
          pages: 300,
          price: '39.00',
          binding: '平装',
          translators: ['测试翻译'],
        });

        expect(() => DoubanBookSchema.parse(validBook)).not.toThrow();
      });

      it('should require category to be "books"', () => {
        const validBook = createValidBook({ category: 'movies' });

        expect(() => DoubanBookSchema.parse(validBook)).toThrow(z.ZodError);
      });

      it('should require at least one author', () => {
        const validBook = createValidBook();

        expect(() => DoubanBookSchema.parse(validBook)).not.toThrow();
      });

      it('should reject book without authors', () => {
        const invalidBook = createValidBook({ authors: [] });

        expect(() => DoubanBookSchema.parse(invalidBook)).toThrow(z.ZodError);
      });

      it('should accept optional book-specific fields', () => {
        const validBook = createValidBook({
          isbn: undefined,
          publisher: undefined,
          publishDate: undefined,
          pages: undefined,
          price: undefined,
          binding: undefined,
        });

        expect(() => DoubanBookSchema.parse(validBook)).not.toThrow();
      });

      it('should validate pages as positive number', () => {
        const validBook = createValidBook({ pages: 300 });

        expect(() => DoubanBookSchema.parse(validBook)).not.toThrow();
      });

      it('should reject negative pages', () => {
        const invalidBook = createValidBook({ pages: -1 });

        expect(() => DoubanBookSchema.parse(invalidBook)).toThrow(z.ZodError);
      });

      it('should apply strict mode (reject extra fields)', () => {
        const invalidBook = {
          ...createValidBook(),
          extraField: 'should not be allowed',
        };

        expect(() => DoubanBookSchema.parse(invalidBook)).toThrow(z.ZodError);
      });
    });

    describe('DoubanMovieSchema', () => {
      it('should accept complete valid movie data', () => {
        const validMovie = createValidMovie({
          imdbId: 'tt1234567',
          duration: '120分钟',
          countries: ['中国', '美国'],
          languages: ['中文', '英语'],
          releaseDate: '2023-01-01',
          writers: ['测试编剧'],
          cast: ['测试演员'],
        });

        expect(() => DoubanMovieSchema.parse(validMovie)).not.toThrow();
      });

      it('should require category to be "movies"', () => {
        const invalidMovie = createValidMovie({ category: 'books' });

        expect(() => DoubanMovieSchema.parse(invalidMovie)).toThrow(z.ZodError);
      });

      it('should require at least one director', () => {
        const validMovie = createValidMovie();

        expect(() => DoubanMovieSchema.parse(validMovie)).not.toThrow();
      });

      it('should reject movie without directors', () => {
        const invalidMovie = createValidMovie({ directors: [] });

        expect(() => DoubanMovieSchema.parse(invalidMovie)).toThrow(z.ZodError);
      });

      it('should accept optional movie-specific fields', () => {
        const validMovie = createValidMovie({
          imdbId: undefined,
          duration: undefined,
          releaseDate: undefined,
        });

        expect(() => DoubanMovieSchema.parse(validMovie)).not.toThrow();
      });

      it('should validate arrays for countries, languages, cast, writers', () => {
        const validMovie = createValidMovie({
          countries: ['中国'],
          languages: ['中文'],
          cast: ['演员1', '演员2'],
          writers: ['编剧1'],
        });

        expect(() => DoubanMovieSchema.parse(validMovie)).not.toThrow();
      });

      it('should apply strict mode (reject extra fields)', () => {
        const invalidMovie = {
          ...createValidMovie(),
          extraField: 'should not be allowed',
        };

        expect(() => DoubanMovieSchema.parse(invalidMovie)).toThrow(z.ZodError);
      });
    });

    describe('DoubanMusicSchema', () => {
      it('should accept complete valid music data', () => {
        const validMusic = createValidMusic({
          album: '测试专辑',
          releaseDate: '2023-01-01',
          label: '测试唱片公司',
          trackCount: 12,
          duration: '45:30',
          medium: 'CD',
        });

        expect(() => DoubanMusicSchema.parse(validMusic)).not.toThrow();
      });

      it('should require category to be "music"', () => {
        const invalidMusic = createValidMusic({ category: 'books' });

        expect(() => DoubanMusicSchema.parse(invalidMusic)).toThrow(z.ZodError);
      });

      it('should require at least one artist', () => {
        const validMusic = createValidMusic();

        expect(() => DoubanMusicSchema.parse(validMusic)).not.toThrow();
      });

      it('should reject music without artists', () => {
        const invalidMusic = createValidMusic({ artists: [] });

        expect(() => DoubanMusicSchema.parse(invalidMusic)).toThrow(z.ZodError);
      });

      it('should validate trackCount as positive number', () => {
        const validMusic = createValidMusic({ trackCount: 10 });

        expect(() => DoubanMusicSchema.parse(validMusic)).not.toThrow();
      });

      it('should reject negative trackCount', () => {
        const invalidMusic = createValidMusic({ trackCount: -1 });

        expect(() => DoubanMusicSchema.parse(invalidMusic)).toThrow(z.ZodError);
      });

      it('should accept optional music-specific fields', () => {
        const validMusic = createValidMusic({
          album: undefined,
          releaseDate: undefined,
          label: undefined,
          trackCount: undefined,
          duration: undefined,
          medium: undefined,
        });

        expect(() => DoubanMusicSchema.parse(validMusic)).not.toThrow();
      });

      it('should apply strict mode (reject extra fields)', () => {
        const invalidMusic = {
          ...createValidMusic(),
          extraField: 'should not be allowed',
        };

        expect(() => DoubanMusicSchema.parse(invalidMusic)).toThrow(z.ZodError);
      });
    });

    describe('DoubanTvSeriesSchema', () => {
      it('should accept complete valid TV series data', () => {
        const validTv = createValidTvSeries({
          imdbId: 'tt1234567',
          episodeDuration: '45分钟',
          episodeCount: 24,
          countries: ['美国'],
          languages: ['英语'],
          firstAirDate: '2023-01-01',
          writers: ['测试编剧'],
          cast: ['测试演员'],
        });

        expect(() => DoubanTvSeriesSchema.parse(validTv)).not.toThrow();
      });

      it('should require category to be "tv"', () => {
        const invalidTv = createValidTvSeries({ category: 'movies' });

        expect(() => DoubanTvSeriesSchema.parse(invalidTv)).toThrow(z.ZodError);
      });

      it('should require at least one director', () => {
        const validTv = createValidTvSeries();

        expect(() => DoubanTvSeriesSchema.parse(validTv)).not.toThrow();
      });

      it('should reject TV series without directors', () => {
        const invalidTv = createValidTvSeries({ directors: [] });

        expect(() => DoubanTvSeriesSchema.parse(invalidTv)).toThrow(z.ZodError);
      });

      it('should validate episodeCount as positive number', () => {
        const validTv = createValidTvSeries({ episodeCount: 10 });

        expect(() => DoubanTvSeriesSchema.parse(validTv)).not.toThrow();
      });

      it('should reject negative episodeCount', () => {
        const invalidTv = createValidTvSeries({ episodeCount: -1 });

        expect(() => DoubanTvSeriesSchema.parse(invalidTv)).toThrow(z.ZodError);
      });

      it('should accept episodeDuration and firstAirDate', () => {
        const validTv = createValidTvSeries({
          episodeDuration: '30分钟',
          firstAirDate: '2023-01-01',
        });

        expect(() => DoubanTvSeriesSchema.parse(validTv)).not.toThrow();
      });

      it('should apply strict mode (reject extra fields)', () => {
        const invalidTv = {
          ...createValidTvSeries(),
          extraField: 'should not be allowed',
        };

        expect(() => DoubanTvSeriesSchema.parse(invalidTv)).toThrow(z.ZodError);
      });
    });

    describe('DoubanDocumentarySchema', () => {
      it('should accept complete valid documentary data', () => {
        const validDoc = createValidDocumentary({
          imdbId: 'tt1234567',
          episodeDuration: '60分钟',
          episodeCount: 6,
          countries: ['英国'],
          languages: ['英语'],
          firstAirDate: '2023-01-01',
          writers: ['测试编剧'],
          cast: ['纪录片主角'],
        });

        expect(() => DoubanDocumentarySchema.parse(validDoc)).not.toThrow();
      });

      it('should require category to be "documentary"', () => {
        const invalidDoc = createValidDocumentary({ category: 'tv' });

        expect(() => DoubanDocumentarySchema.parse(invalidDoc)).toThrow(
          z.ZodError,
        );
      });

      it('should require at least one director', () => {
        const validDoc = createValidDocumentary();

        expect(() => DoubanDocumentarySchema.parse(validDoc)).not.toThrow();
      });

      it('should reject documentary without directors', () => {
        const invalidDoc = createValidDocumentary({ directors: [] });

        expect(() => DoubanDocumentarySchema.parse(invalidDoc)).toThrow(
          z.ZodError,
        );
      });

      it('should validate documentary-specific fields', () => {
        const validDoc = createValidDocumentary({
          episodeDuration: '90分钟',
          episodeCount: 3,
          firstAirDate: '2023-06-01',
        });

        expect(() => DoubanDocumentarySchema.parse(validDoc)).not.toThrow();
      });

      it('should apply strict mode (reject extra fields)', () => {
        const invalidDoc = {
          ...createValidDocumentary(),
          extraField: 'should not be allowed',
        };

        expect(() => DoubanDocumentarySchema.parse(invalidDoc)).toThrow(
          z.ZodError,
        );
      });
    });
  });

  describe('Discriminated Union Schema', () => {
    describe('DoubanItemSchema', () => {
      it('should discriminate based on category field', () => {
        const book = createValidBook();
        const movie = createValidMovie();
        const music = createValidMusic();
        const tv = createValidTvSeries();
        const documentary = createValidDocumentary();

        expect(() => DoubanItemSchema.parse(book)).not.toThrow();
        expect(() => DoubanItemSchema.parse(movie)).not.toThrow();
        expect(() => DoubanItemSchema.parse(music)).not.toThrow();
        expect(() => DoubanItemSchema.parse(tv)).not.toThrow();
        expect(() => DoubanItemSchema.parse(documentary)).not.toThrow();
      });

      it('should validate book items correctly', () => {
        const validBook = createValidBook();
        const parsed = DoubanItemSchema.parse(validBook);

        expect(parsed.category).toBe('books');
        expect('authors' in parsed).toBe(true);
      });

      it('should validate movie items correctly', () => {
        const validMovie = createValidMovie();
        const parsed = DoubanItemSchema.parse(validMovie);

        expect(parsed.category).toBe('movies');
        expect('directors' in parsed).toBe(true);
      });

      it('should validate music items correctly', () => {
        const validMusic = createValidMusic();
        const parsed = DoubanItemSchema.parse(validMusic);

        expect(parsed.category).toBe('music');
        expect('artists' in parsed).toBe(true);
      });

      it('should validate TV series items correctly', () => {
        const validTv = createValidTvSeries({ episodeCount: 24 });
        const parsed = DoubanItemSchema.parse(validTv);

        expect(parsed.category).toBe('tv');
        expect('directors' in parsed).toBe(true);
        if (parsed.category === 'tv') {
          expect('episodeCount' in parsed).toBe(true);
        }
      });

      it('should validate documentary items correctly', () => {
        const validDoc = createValidDocumentary();
        const parsed = DoubanItemSchema.parse(validDoc);

        expect(parsed.category).toBe('documentary');
        expect('directors' in parsed).toBe(true);
      });

      it('should reject invalid category values', () => {
        const invalidItem = createBaseItem({ category: 'invalid' });

        expect(() => DoubanItemSchema.parse(invalidItem)).toThrow(z.ZodError);
      });

      it('should reject items missing category field', () => {
        const invalidItem = createBaseItem();
        delete (invalidItem as Record<string, unknown>).category;

        expect(() => DoubanItemSchema.parse(invalidItem)).toThrow(z.ZodError);
      });
    });
  });

  describe('Complex Schema', () => {
    describe('DoubanBatchResultSchema', () => {
      it('should accept valid batch result data', () => {
        const validBatchResult: DoubanBatchResult = {
          items: [createValidBook(), createValidMovie()],
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalItems: 100,
            itemsPerPage: 15,
            hasMore: true,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 100,
            successful: 98,
            failed: 2,
            skipped: 0,
          },
          errors: [],
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should validate items array with mixed types', () => {
        const validBatchResult = {
          items: [createValidBook(), createValidMovie(), createValidMusic()],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 3,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 3,
            successful: 3,
            failed: 0,
            skipped: 0,
          },
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should validate pagination object', () => {
        const validBatchResult = {
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 15,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          },
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should reject invalid pagination values', () => {
        const invalidBatchResult = {
          items: [],
          pagination: {
            currentPage: 0, // Should be >= 1
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          },
        };

        expect(() => DoubanBatchResultSchema.parse(invalidBatchResult)).toThrow(
          z.ZodError,
        );
      });

      it('should validate metadata object', () => {
        const validBatchResult = {
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'tv',
            status: 'wish',
            scrapedAt: new Date(),
            totalProcessingTime: 1500,
          },
          statistics: {
            totalFound: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          },
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should validate statistics object', () => {
        const validBatchResult = {
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'movies',
            status: 'do',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 50,
            successful: 45,
            failed: 3,
            skipped: 2,
          },
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should apply default values for optional fields', () => {
        const batchResult = {
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          },
        };

        const parsed = DoubanBatchResultSchema.parse(batchResult);
        expect(parsed.pagination.itemsPerPage).toBe(15);
        expect(parsed.errors).toEqual([]);
      });

      it('should validate errors array structure', () => {
        const validBatchResult = {
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
          },
          metadata: {
            userId: 'user123',
            category: 'books',
            status: 'collect',
            scrapedAt: new Date(),
          },
          statistics: {
            totalFound: 0,
            successful: 0,
            failed: 1,
            skipped: 0,
          },
          errors: [
            {
              subjectId: '123456',
              url: 'https://book.douban.com/subject/123456/',
              error: '解析失败',
              timestamp: new Date(),
            },
          ],
        };

        expect(() =>
          DoubanBatchResultSchema.parse(validBatchResult),
        ).not.toThrow();
      });
    });

    describe('DoubanParsingContextSchema', () => {
      it('should accept valid parsing context data', () => {
        const validContext: DoubanParsingContext = {
          sourceUrl: 'https://book.douban.com/subject/123456/',
          parseStrategy: 'json-ld',
          parsingStages: [
            {
              stage: 'html-fetch',
              success: true,
              duration: 500,
              extractedFields: ['title', 'authors'],
              warnings: [],
            },
          ],
          finalValidation: {
            isValid: true,
            fieldsCovered: 10,
            totalExpectedFields: 16,
            coveragePercentage: 62.5,
            missingFields: [],
            invalidFields: [],
          },
          performanceMetrics: {
            totalDuration: 1200,
            networkTime: 500,
            parseTime: 600,
            validationTime: 100,
          },
        };

        expect(() =>
          DoubanParsingContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should validate parsing stages array', () => {
        const validContext = {
          sourceUrl: 'https://book.douban.com/subject/123456/',
          parseStrategy: 'html-selectors',
          parsingStages: [
            {
              stage: 'json-ld-extraction',
              success: false,
              duration: 100,
              extractedFields: [],
              warnings: ['JSON-LD not found'],
            },
            {
              stage: 'fallback-selectors',
              success: true,
              duration: 300,
              extractedFields: ['title', 'rating'],
            },
          ],
          finalValidation: {
            isValid: true,
            fieldsCovered: 5,
            totalExpectedFields: 16,
            coveragePercentage: 31.25,
          },
          performanceMetrics: {
            totalDuration: 800,
            parseTime: 400,
            validationTime: 50,
          },
        };

        expect(() =>
          DoubanParsingContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should validate final validation object', () => {
        const validContext = {
          sourceUrl: 'https://movie.douban.com/subject/123456/',
          parseStrategy: 'mixed',
          parsingStages: [],
          finalValidation: {
            isValid: false,
            fieldsCovered: 8,
            totalExpectedFields: 18,
            coveragePercentage: 44.44,
            missingFields: ['cast', 'writers'],
            invalidFields: [
              {
                field: 'year',
                value: 'invalid-year',
                reason: 'Not a valid number',
              },
            ],
          },
          performanceMetrics: {
            totalDuration: 2000,
            parseTime: 1500,
            validationTime: 200,
          },
        };

        expect(() =>
          DoubanParsingContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should validate performance metrics', () => {
        const validContext = {
          sourceUrl: 'https://music.douban.com/subject/123456/',
          parseStrategy: 'json-ld',
          parsingStages: [],
          finalValidation: {
            isValid: true,
            fieldsCovered: 5,
            totalExpectedFields: 10,
            coveragePercentage: 50.0,
          },
          performanceMetrics: {
            totalDuration: 800,
            networkTime: 300,
            parseTime: 400,
            validationTime: 100,
          },
        };

        expect(() =>
          DoubanParsingContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should validate coverage percentage (0-100)', () => {
        const validContext = {
          sourceUrl: 'https://book.douban.com/subject/123456/',
          parseStrategy: 'json-ld',
          parsingStages: [],
          finalValidation: {
            isValid: true,
            fieldsCovered: 16,
            totalExpectedFields: 16,
            coveragePercentage: 100.0,
          },
          performanceMetrics: {
            totalDuration: 500,
            parseTime: 400,
            validationTime: 100,
          },
        };

        expect(() =>
          DoubanParsingContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should reject invalid coverage percentage', () => {
        const invalidContext = {
          sourceUrl: 'https://book.douban.com/subject/123456/',
          parseStrategy: 'json-ld',
          parsingStages: [],
          finalValidation: {
            isValid: true,
            fieldsCovered: 16,
            totalExpectedFields: 16,
            coveragePercentage: 101.0, // Invalid: > 100
          },
          performanceMetrics: {
            totalDuration: 500,
            parseTime: 400,
            validationTime: 100,
          },
        };

        expect(() => DoubanParsingContextSchema.parse(invalidContext)).toThrow(
          z.ZodError,
        );
      });

      it('should apply default values for optional arrays', () => {
        const context = {
          sourceUrl: 'https://book.douban.com/subject/123456/',
          parseStrategy: 'json-ld',
          parsingStages: [
            {
              stage: 'test',
              success: true,
              duration: 100,
              extractedFields: ['title'],
            },
          ],
          finalValidation: {
            isValid: true,
            fieldsCovered: 5,
            totalExpectedFields: 16,
            coveragePercentage: 31.25,
          },
          performanceMetrics: {
            totalDuration: 500,
            parseTime: 400,
            validationTime: 100,
          },
        };

        const parsed = DoubanParsingContextSchema.parse(context);
        expect(parsed.parsingStages[0].warnings).toEqual([]);
        expect(parsed.finalValidation.missingFields).toEqual([]);
        expect(parsed.finalValidation.invalidFields).toEqual([]);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateDoubanItem()', () => {
      it('should return success for valid douban item', () => {
        const validBook = createValidBook();
        const result = validateDoubanItem(validBook);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.category).toBe('books');
        }
      });

      it('should return error for invalid douban item', () => {
        const invalidItem = { invalid: 'data' };
        const result = validateDoubanItem(invalidItem);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('豆瓣条目验证失败');
        }
      });

      it('should format ZodError messages properly', () => {
        const invalidItem = createValidBook({ subjectId: '' });
        const result = validateDoubanItem(invalidItem);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('subjectId');
          expect(result.error).toContain('不能为空');
        }
      });

      it('should handle unknown errors gracefully', () => {
        // 第一优先级："Spy变量引用"方案 - spy on the parse method
        const parseMethodSpy = jest
          .spyOn(DoubanItemSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Unknown error');
          });

        const result = validateDoubanItem({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        // 恢复原方法
        parseMethodSpy.mockRestore();
      });
    });

    describe('validateDoubanItemByType()', () => {
      it('should validate books type correctly', () => {
        const validBook = createValidBook();
        const result = validateDoubanItemByType(validBook, 'books');

        expect(result.success).toBe(true);
      });

      it('should validate movies type correctly', () => {
        const validMovie = createValidMovie();
        const result = validateDoubanItemByType(validMovie, 'movies');

        expect(result.success).toBe(true);
      });

      it('should validate music type correctly', () => {
        const validMusic = createValidMusic();
        const result = validateDoubanItemByType(validMusic, 'music');

        expect(result.success).toBe(true);
      });

      it('should validate tv type correctly', () => {
        const validTv = createValidTvSeries();
        const result = validateDoubanItemByType(validTv, 'tv');

        expect(result.success).toBe(true);
      });

      it('should validate documentary type correctly', () => {
        const validDoc = createValidDocumentary();
        const result = validateDoubanItemByType(validDoc, 'documentary');

        expect(result.success).toBe(true);
      });

      it('should reject unsupported types', () => {
        const validBook = createValidBook();
        const result = validateDoubanItemByType(
          validBook,
          'unsupported' as 'books' | 'movies' | 'music' | 'tv' | 'documentary',
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('不支持的豆瓣条目类型');
        }
      });

      it('should format type-specific error messages', () => {
        const invalidBook = createValidBook({ authors: [] });
        const result = validateDoubanItemByType(invalidBook, 'books');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('books条目验证失败');
        }
      });

      it('should handle ZodError for each type', () => {
        const invalidMovie = createValidMovie({ directors: [] });
        const result = validateDoubanItemByType(invalidMovie, 'movies');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('movies条目验证失败');
          expect(result.error).toContain('directors');
        }
      });

      it('should handle unknown errors gracefully', () => {
        // 第一优先级："Spy变量引用"方案 - spy on the parse method
        const parseMethodSpy = jest
          .spyOn(DoubanBookSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Unknown error');
          });

        const result = validateDoubanItemByType({}, 'books');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        // 恢复原方法
        parseMethodSpy.mockRestore();
      });
    });
  });

  describe('Type Guards', () => {
    describe('isDoubanBook()', () => {
      it('should return true for valid book items', () => {
        const validBook = createValidBook();

        expect(isDoubanBook(validBook)).toBe(true);
      });

      it('should return false for non-book items', () => {
        const validMovie = createValidMovie();
        const validMusic = createValidMusic();

        expect(isDoubanBook(validMovie)).toBe(false);
        expect(isDoubanBook(validMusic)).toBe(false);
      });

      it('should return false for invalid data', () => {
        const invalidData = { invalid: 'data' };
        const nullData = null;
        const undefinedData = undefined;

        expect(isDoubanBook(invalidData)).toBe(false);
        expect(isDoubanBook(nullData)).toBe(false);
        expect(isDoubanBook(undefinedData)).toBe(false);
      });
    });

    describe('isDoubanMovie()', () => {
      it('should return true for valid movie items', () => {
        const validMovie = createValidMovie();

        expect(isDoubanMovie(validMovie)).toBe(true);
      });

      it('should return false for non-movie items', () => {
        const validBook = createValidBook();
        const validMusic = createValidMusic();

        expect(isDoubanMovie(validBook)).toBe(false);
        expect(isDoubanMovie(validMusic)).toBe(false);
      });

      it('should return false for invalid data', () => {
        const invalidData = { invalid: 'data' };

        expect(isDoubanMovie(invalidData)).toBe(false);
      });
    });

    describe('isDoubanTvSeries()', () => {
      it('should return true for valid TV series items', () => {
        const validTv = createValidTvSeries();

        expect(isDoubanTvSeries(validTv)).toBe(true);
      });

      it('should return false for non-TV series items', () => {
        const validBook = createValidBook();
        const validMovie = createValidMovie();

        expect(isDoubanTvSeries(validBook)).toBe(false);
        expect(isDoubanTvSeries(validMovie)).toBe(false);
      });

      it('should return false for invalid data', () => {
        const invalidData = { invalid: 'data' };

        expect(isDoubanTvSeries(invalidData)).toBe(false);
      });
    });

    describe('isDoubanDocumentary()', () => {
      it('should return true for valid documentary items', () => {
        const validDoc = createValidDocumentary();

        expect(isDoubanDocumentary(validDoc)).toBe(true);
      });

      it('should return false for non-documentary items', () => {
        const validBook = createValidBook();
        const validMovie = createValidMovie();
        const validTv = createValidTvSeries();

        expect(isDoubanDocumentary(validBook)).toBe(false);
        expect(isDoubanDocumentary(validMovie)).toBe(false);
        expect(isDoubanDocumentary(validTv)).toBe(false);
      });

      it('should return false for invalid data', () => {
        const invalidData = { invalid: 'data' };

        expect(isDoubanDocumentary(invalidData)).toBe(false);
      });
    });
  });

  describe('Smart Type Inference', () => {
    describe('inferDoubanItemType()', () => {
      it('should return "books" for data with authors', () => {
        const bookData = {
          authors: ['测试作者'],
          title: '测试书籍',
        };

        expect(inferDoubanItemType(bookData)).toBe('books');
      });

      it('should return "movies" for data with directors (no episodes)', () => {
        const movieData = {
          directors: ['测试导演'],
          title: '测试电影',
        };

        expect(inferDoubanItemType(movieData)).toBe('movies');
      });

      it('should return "tv" for data with directors and episodes', () => {
        const tvData = {
          directors: ['测试导演'],
          episodeCount: 24,
          title: '测试电视剧',
        };

        expect(inferDoubanItemType(tvData)).toBe('tv');
      });

      it('should return "tv" for data with directors and firstAirDate', () => {
        const tvData = {
          directors: ['测试导演'],
          firstAirDate: '2023-01-01',
          title: '测试电视剧',
        };

        expect(inferDoubanItemType(tvData)).toBe('tv');
      });

      it('should return "documentary" for TV data with documentary genre', () => {
        const docData = {
          directors: ['测试导演'],
          episodeCount: 6,
          genres: ['剧情', '纪录片'],
          title: '测试纪录片',
        };

        expect(inferDoubanItemType(docData)).toBe('documentary');
      });

      it('should return "music" for data with artists', () => {
        const musicData = {
          artists: ['测试艺术家'],
          title: '测试专辑',
        };

        expect(inferDoubanItemType(musicData)).toBe('music');
      });

      it('should return explicit category when present', () => {
        const explicitBook = {
          category: 'books',
          directors: ['这会让推断认为是电影'],
          title: '但明确标注为书籍',
        };

        expect(inferDoubanItemType(explicitBook)).toBe('books');
      });

      it('should return "unknown" for invalid/empty data', () => {
        expect(inferDoubanItemType(null)).toBe('unknown');
        expect(inferDoubanItemType(undefined)).toBe('unknown');
        expect(inferDoubanItemType({})).toBe('unknown');
        expect(inferDoubanItemType('string')).toBe('unknown');
        expect(inferDoubanItemType(123)).toBe('unknown');
      });

      it('should handle edge cases with mixed fields', () => {
        const mixedData = {
          authors: ['作者'],
          directors: ['导演'],
          artists: ['艺术家'],
          title: '混合数据',
        };

        // Should prioritize books (authors field)
        expect(inferDoubanItemType(mixedData)).toBe('books');
      });

      it('should prioritize explicit category over inferred type', () => {
        const conflictData = {
          category: 'documentary',
          authors: ['这会让推断认为是书籍'],
          title: '但明确标注为纪录片',
        };

        expect(inferDoubanItemType(conflictData)).toBe('documentary');
      });

      it('should handle invalid category gracefully', () => {
        const invalidCategoryData = {
          category: 'invalid-category',
          authors: ['测试作者'],
          title: '测试',
        };

        // Should fall back to field-based inference
        expect(inferDoubanItemType(invalidCategoryData)).toBe('books');
      });

      it('should handle empty arrays correctly', () => {
        const emptyArraysData = {
          authors: [],
          directors: [],
          artists: [],
          title: '测试',
        };

        expect(inferDoubanItemType(emptyArraysData)).toBe('unknown');
      });
    });
  });

  describe('Edge Cases & Error Handling', () => {
    describe('Boundary Conditions', () => {
      it('should handle minimum valid values', () => {
        const minimalBook = {
          subjectId: '1',
          title: 'A',
          doubanUrl: 'https://book.douban.com/subject/1/',
          category: 'books',
          authors: ['A'],
          genres: [],
          userTags: [],
          directors: [],
          cast: [],
          artists: [],
          translators: [],
        };

        expect(() => DoubanBookSchema.parse(minimalBook)).not.toThrow();
      });

      it('should handle maximum valid values', () => {
        const maximalBook = createValidBook({
          year: 2100,
          rating: { average: 10.0, numRaters: 999999999 },
          userRating: 5,
          pages: 999999,
        });

        expect(() => DoubanBookSchema.parse(maximalBook)).not.toThrow();
      });

      it('should reject values outside boundaries', () => {
        const outOfBoundsBook = createValidBook({
          year: 1799, // Below minimum
        });

        expect(() => DoubanBookSchema.parse(outOfBoundsBook)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('Type Safety', () => {
      it('should maintain type safety with exported types', () => {
        const book: DoubanBook = createValidBook();
        const movie: DoubanMovie = createValidMovie();

        // TypeScript should enforce correct types
        expect(book.category).toBe('books');
        expect(movie.category).toBe('movies');
        expect('authors' in book).toBe(true);
        expect('directors' in movie).toBe(true);
      });

      it('should properly infer TypeScript types', () => {
        const parsedBook = DoubanBookSchema.parse(createValidBook());
        const parsedMovie = DoubanMovieSchema.parse(createValidMovie());

        // These should have correct TypeScript types
        expect(parsedBook.authors).toBeDefined();
        expect(parsedMovie.directors).toBeDefined();
      });
    });
  });
});
