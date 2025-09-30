/**
 * book-fields.schema.ts 单元测试
 *
 * 测试覆盖豆瓣书籍字段所有 Zod Schema 定义和工具函数
 * 目标覆盖率: 90%+
 */

import { z } from 'zod';
import {
  BookSubjectIdSchema,
  BookTitleSchema,
  BookRatingSchema,
  BookAuthorsSchema,
  BookTranslatorsSchema,
  BookPublishingSchema,
  BookPhysicalSchema,
  BookGenresSchema,
  BookSummarySchema,
  UserRatingSchema,
  UserTagsSchema,
  UserCommentSchema,
  UserStatusSchema,
  MarkDateSchema,
  CoverImageSchema,
  BookCompleteSchema,
  BookFieldValidationSchema,
  BookBatchValidationSchema,
  validateBookComplete,
  validateBookField,
  assessBookDataQuality,
  isValidBookComplete,
  type BookSubjectId,
  type BookTitle,
  type BookRating,
  type BookAuthors,
  type BookTranslators,
  type BookPublishing,
  type BookPhysical,
  type BookGenres,
  type BookSummary,
  type UserRating,
  type UserTags,
  type UserComment,
  type UserStatus,
  type MarkDate,
  type CoverImage,
  type BookComplete,
  type BookFieldValidation,
  type BookBatchValidation,
} from './book-fields.schema';

describe('book-fields.schema.ts', () => {
  describe('Schema Definitions', () => {
    describe('BookSubjectIdSchema', () => {
      it('should accept valid numeric string IDs', () => {
        const validIds = ['123', '1234567', '12345678901234567890'];

        validIds.forEach((id) => {
          expect(() => BookSubjectIdSchema.parse(id)).not.toThrow();
        });
      });

      it('should reject non-numeric strings', () => {
        const invalidIds = ['abc', '123abc', 'a123', '12.34', '12-34'];

        invalidIds.forEach((id) => {
          expect(() => BookSubjectIdSchema.parse(id)).toThrow(z.ZodError);
        });
      });

      it('should reject empty strings', () => {
        expect(() => BookSubjectIdSchema.parse('')).toThrow(z.ZodError);
      });

      it('should reject IDs exceeding 20 characters', () => {
        const longId = '123456789012345678901'; // 21 characters
        expect(() => BookSubjectIdSchema.parse(longId)).toThrow(z.ZodError);
      });

      it('should reject non-string values', () => {
        const nonStringValues = [123, null, undefined, {}, []];

        nonStringValues.forEach((value) => {
          expect(() => BookSubjectIdSchema.parse(value)).toThrow(z.ZodError);
        });
      });
    });

    describe('BookTitleSchema', () => {
      it('should accept valid title with main title', () => {
        const validTitle = { main: '哈利·波特与魔法石' };
        expect(() => BookTitleSchema.parse(validTitle)).not.toThrow();
      });

      it('should accept title with subtitle and original title', () => {
        const validTitle = {
          main: '哈利·波特与魔法石',
          subtitle: '第一部',
          original: "Harry Potter and the Philosopher's Stone",
        };
        expect(() => BookTitleSchema.parse(validTitle)).not.toThrow();
      });

      it('should reject empty main title', () => {
        const invalidTitle = { main: '' };
        expect(() => BookTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should reject main title exceeding 500 characters', () => {
        const longTitle = 'a'.repeat(501);
        const invalidTitle = { main: longTitle };
        expect(() => BookTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should reject subtitle exceeding 300 characters', () => {
        const longSubtitle = 'a'.repeat(301);
        const invalidTitle = { main: '测试', subtitle: longSubtitle };
        expect(() => BookTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should reject original title exceeding 500 characters', () => {
        const longOriginal = 'a'.repeat(501);
        const invalidTitle = { main: '测试', original: longOriginal };
        expect(() => BookTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });
    });

    describe('BookRatingSchema', () => {
      it('should accept valid rating with average and numRaters', () => {
        const validRating = { average: 8.5, numRaters: 1000 };
        expect(() => BookRatingSchema.parse(validRating)).not.toThrow();
      });

      it('should accept optional stars field', () => {
        const validRating = {
          average: 8.5,
          numRaters: 1000,
          stars: '4.0',
        };
        expect(() => BookRatingSchema.parse(validRating)).not.toThrow();
      });

      it('should reject average rating below 0', () => {
        const invalidRating = { average: -1, numRaters: 100 };
        expect(() => BookRatingSchema.parse(invalidRating)).toThrow(z.ZodError);
      });

      it('should reject average rating above 10', () => {
        const invalidRating = { average: 11, numRaters: 100 };
        expect(() => BookRatingSchema.parse(invalidRating)).toThrow(z.ZodError);
      });

      it('should reject rating not multiple of 0.1', () => {
        const invalidRating = { average: 8.55, numRaters: 100 };
        expect(() => BookRatingSchema.parse(invalidRating)).toThrow(z.ZodError);
      });

      it('should reject negative numRaters', () => {
        const invalidRating = { average: 8.5, numRaters: -1 };
        expect(() => BookRatingSchema.parse(invalidRating)).toThrow(z.ZodError);
      });

      it('should reject non-integer numRaters', () => {
        const invalidRating = { average: 8.5, numRaters: 100.5 };
        expect(() => BookRatingSchema.parse(invalidRating)).toThrow(z.ZodError);
      });

      it('should reject invalid stars format', () => {
        const invalidRatings = [
          { average: 8.5, numRaters: 100, stars: '6.0' }, // above 5.0
          { average: 8.5, numRaters: 100, stars: '4.5' }, // not .0 format
          { average: 8.5, numRaters: 100, stars: 'abc' }, // non-numeric
        ];

        invalidRatings.forEach((rating) => {
          expect(() => BookRatingSchema.parse(rating)).toThrow(z.ZodError);
        });
      });
    });

    describe('BookAuthorsSchema', () => {
      it('should accept array of valid authors', () => {
        const validAuthors = [
          { name: 'J.K. 罗琳' },
          { name: 'Stephen King', role: 'author' as const },
        ];
        expect(() => BookAuthorsSchema.parse(validAuthors)).not.toThrow();
      });

      it('should require at least one author', () => {
        expect(() => BookAuthorsSchema.parse([])).toThrow(z.ZodError);
      });

      it('should reject empty author name', () => {
        const invalidAuthors = [{ name: '' }];
        expect(() => BookAuthorsSchema.parse(invalidAuthors)).toThrow(
          z.ZodError,
        );
      });

      it('should apply default role as "author"', () => {
        const authors = [{ name: '测试作者' }];
        const parsed = BookAuthorsSchema.parse(authors);
        expect(parsed[0].role).toBe('author');
      });

      it('should validate role enum values', () => {
        const validRoles = ['author', 'co-author', 'editor'] as const;

        validRoles.forEach((role) => {
          const authors = [{ name: '测试作者', role }];
          expect(() => BookAuthorsSchema.parse(authors)).not.toThrow();
        });

        const invalidAuthors = [{ name: '测试作者', role: 'invalid' }];
        expect(() => BookAuthorsSchema.parse(invalidAuthors)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional fields', () => {
        const authorsWithOptionals = [
          {
            name: 'J.K. 罗琳',
            originalName: 'Joanne Rowling',
            role: 'author' as const,
            nationality: '英国',
          },
        ];
        expect(() =>
          BookAuthorsSchema.parse(authorsWithOptionals),
        ).not.toThrow();
      });
    });

    describe('BookTranslatorsSchema', () => {
      it('should accept array of valid translators', () => {
        const validTranslators = [
          { name: '苏农' },
          { name: '马爱农', originalName: 'Ma Ainong' },
        ];
        expect(() =>
          BookTranslatorsSchema.parse(validTranslators),
        ).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = BookTranslatorsSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty translator name', () => {
        const invalidTranslators = [{ name: '' }];
        expect(() => BookTranslatorsSchema.parse(invalidTranslators)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional originalName', () => {
        const translators = [
          { name: '苏农' },
          { name: '马爱农', originalName: 'Ma Ainong' },
        ];
        expect(() => BookTranslatorsSchema.parse(translators)).not.toThrow();
      });
    });

    describe('BookPublishingSchema', () => {
      it('should accept valid publishing information', () => {
        const validPublishing = {
          publisher: '人民文学出版社',
          publishDate: '2000-09',
          edition: '第1版',
        };
        expect(() => BookPublishingSchema.parse(validPublishing)).not.toThrow();
      });

      it('should reject publisher name exceeding 200 characters', () => {
        const longPublisher = 'a'.repeat(201);
        const invalidPublishing = { publisher: longPublisher };
        expect(() => BookPublishingSchema.parse(invalidPublishing)).toThrow(
          z.ZodError,
        );
      });

      it('should accept valid date formats (YYYY, YYYY-MM, YYYY-MM-DD)', () => {
        const validDates = ['2000', '2000-09', '2000-09-01'];

        validDates.forEach((date) => {
          const publishing = { publishDate: date };
          expect(() => BookPublishingSchema.parse(publishing)).not.toThrow();
        });
      });

      it('should reject invalid date format', () => {
        const invalidDates = ['00', '200', '2000-', '2000-09-', 'abc-12-01'];

        invalidDates.forEach((date) => {
          const publishing = { publishDate: date };
          expect(() => BookPublishingSchema.parse(publishing)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should reject edition exceeding 100 characters', () => {
        const longEdition = 'a'.repeat(101);
        const invalidPublishing = { edition: longEdition };
        expect(() => BookPublishingSchema.parse(invalidPublishing)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('BookPhysicalSchema', () => {
      it('should accept valid physical book information', () => {
        const validPhysical = {
          pages: 300,
          binding: '平装' as const,
          price: '29.8元',
          isbn: '9787020024759',
        };
        expect(() => BookPhysicalSchema.parse(validPhysical)).not.toThrow();
      });

      it('should reject non-integer pages', () => {
        const invalidPhysical = { pages: 300.5 };
        expect(() => BookPhysicalSchema.parse(invalidPhysical)).toThrow(
          z.ZodError,
        );
      });

      it('should reject pages below 1 or above 50000', () => {
        const invalidPages = [0, -1, 50001];

        invalidPages.forEach((pages) => {
          const physical = { pages };
          expect(() => BookPhysicalSchema.parse(physical)).toThrow(z.ZodError);
        });
      });

      it('should validate binding enum values', () => {
        const validBindings = [
          '平装',
          '精装',
          '简装',
          '袋装',
          '硬壳精装',
          '软精装',
          '毛边本',
          '线装',
          '骑马钉',
          'kindle版',
          'epub',
          'pdf',
          '其他',
        ] as const;

        validBindings.forEach((binding) => {
          const physical = { binding };
          expect(() => BookPhysicalSchema.parse(physical)).not.toThrow();
        });

        const invalidPhysical = { binding: 'invalid' };
        expect(() => BookPhysicalSchema.parse(invalidPhysical)).toThrow(
          z.ZodError,
        );
      });

      it('should validate price format with regex', () => {
        const validPrices = [
          '29.8元',
          '20$',
          '30€',
          '25£',
          '100¥',
          '45￥',
          '10',
          '29.8 元',
          '15.99',
        ];

        validPrices.forEach((price) => {
          const physical = { price };
          expect(() => BookPhysicalSchema.parse(physical)).not.toThrow();
        });

        const invalidPrices = ['abc', '29.8元/本', 'free'];

        invalidPrices.forEach((price) => {
          const physical = { price };
          expect(() => BookPhysicalSchema.parse(physical)).toThrow(z.ZodError);
        });
      });

      it('should validate ISBN format', () => {
        const validISBNs = ['9787020024759', '787020024X'];

        validISBNs.forEach((isbn) => {
          const physical = { isbn };
          expect(() => BookPhysicalSchema.parse(physical)).not.toThrow();
        });

        const invalidISBNs = ['123', 'abc123456789', '97870200247590'];

        invalidISBNs.forEach((isbn) => {
          const physical = { isbn };
          expect(() => BookPhysicalSchema.parse(physical)).toThrow(z.ZodError);
        });
      });
    });

    describe('BookGenresSchema', () => {
      it('should accept array of valid genres', () => {
        const validGenres = ['小说', '科幻', '文学'];
        expect(() => BookGenresSchema.parse(validGenres)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = BookGenresSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty genre strings', () => {
        const invalidGenres = [''];
        expect(() => BookGenresSchema.parse(invalidGenres)).toThrow(z.ZodError);
      });

      it('should reject genre exceeding 50 characters', () => {
        const longGenre = 'a'.repeat(51);
        const invalidGenres = [longGenre];
        expect(() => BookGenresSchema.parse(invalidGenres)).toThrow(z.ZodError);
      });
    });

    describe('BookSummarySchema', () => {
      it('should accept valid summary text', () => {
        const validSummary = '这是一本非常精彩的书籍，内容丰富，值得推荐。';
        expect(() => BookSummarySchema.parse(validSummary)).not.toThrow();
      });

      it('should accept optional summary', () => {
        expect(() => BookSummarySchema.parse(undefined)).not.toThrow();
      });

      it('should reject summary exceeding 10000 characters', () => {
        const longSummary = 'a'.repeat(10001);
        expect(() => BookSummarySchema.parse(longSummary)).toThrow(z.ZodError);
      });
    });

    describe('UserRatingSchema', () => {
      it('should accept valid user rating (1-5)', () => {
        const validRatings = [1, 2, 3, 4, 5];

        validRatings.forEach((rating) => {
          expect(() => UserRatingSchema.parse(rating)).not.toThrow();
        });
      });

      it('should be optional', () => {
        expect(() => UserRatingSchema.parse(undefined)).not.toThrow();
      });

      it('should reject rating below 1', () => {
        expect(() => UserRatingSchema.parse(0)).toThrow(z.ZodError);
      });

      it('should reject rating above 5', () => {
        expect(() => UserRatingSchema.parse(6)).toThrow(z.ZodError);
      });

      it('should require integer values', () => {
        expect(() => UserRatingSchema.parse(3.5)).toThrow(z.ZodError);
      });
    });

    describe('UserTagsSchema', () => {
      it('should accept array of valid tags', () => {
        const validTags = ['科幻', '推荐', '好书'];
        expect(() => UserTagsSchema.parse(validTags)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = UserTagsSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty tag strings', () => {
        const invalidTags = [''];
        expect(() => UserTagsSchema.parse(invalidTags)).toThrow(z.ZodError);
      });

      it('should reject tags exceeding 50 characters', () => {
        const longTag = 'a'.repeat(51);
        const invalidTags = [longTag];
        expect(() => UserTagsSchema.parse(invalidTags)).toThrow(z.ZodError);
      });

      it('should reject tags with forbidden characters (comma, semicolon, pipe)', () => {
        const invalidTags = [
          ['tag,with,comma'],
          ['tag，with，chinese，comma'],
          ['tag;with;semicolon'],
          ['tag；with；chinese；semicolon'],
          ['tag|with|pipe'],
          ['tag｜with｜chinese｜pipe'],
        ];

        invalidTags.forEach((tags) => {
          expect(() => UserTagsSchema.parse(tags)).toThrow(z.ZodError);
        });
      });

      it('should reject more than 50 tags', () => {
        const tooManyTags = Array.from({ length: 51 }, (_, i) => `tag${i}`);
        expect(() => UserTagsSchema.parse(tooManyTags)).toThrow(z.ZodError);
      });
    });

    describe('UserCommentSchema', () => {
      it('should accept valid comment text', () => {
        const validComment = '这本书真的很不错，推荐阅读！';
        expect(() => UserCommentSchema.parse(validComment)).not.toThrow();
      });

      it('should be optional', () => {
        expect(() => UserCommentSchema.parse(undefined)).not.toThrow();
      });

      it('should reject comment exceeding 5000 characters', () => {
        const longComment = 'a'.repeat(5001);
        expect(() => UserCommentSchema.parse(longComment)).toThrow(z.ZodError);
      });
    });

    describe('UserStatusSchema', () => {
      it('should accept valid status values (wish, do, collect)', () => {
        const validStatuses = ['wish', 'do', 'collect'] as const;

        validStatuses.forEach((status) => {
          expect(() => UserStatusSchema.parse(status)).not.toThrow();
        });
      });

      it('should reject invalid status values', () => {
        const invalidStatuses = ['read', 'reading', 'want', 'done'];

        invalidStatuses.forEach((status) => {
          expect(() => UserStatusSchema.parse(status)).toThrow(z.ZodError);
        });
      });
    });

    describe('MarkDateSchema', () => {
      it('should accept valid past dates', () => {
        const pastDate = new Date('2023-01-01');
        expect(() => MarkDateSchema.parse(pastDate)).not.toThrow();
      });

      it('should be optional', () => {
        expect(() => MarkDateSchema.parse(undefined)).not.toThrow();
      });

      it('should coerce string dates to Date objects', () => {
        const dateString = '2023-01-01';
        const parsed = MarkDateSchema.parse(dateString);
        expect(parsed).toBeInstanceOf(Date);
      });

      it('should reject future dates', () => {
        const futureDate = new Date(Date.now() + 86400000); // tomorrow
        expect(() => MarkDateSchema.parse(futureDate)).toThrow(z.ZodError);
      });
    });

    describe('CoverImageSchema', () => {
      it('should accept valid image URLs', () => {
        const validUrls = [
          'https://example.com/cover.jpg',
          'https://example.com/cover.jpeg',
          'https://example.com/cover.png',
          'https://example.com/cover.webp',
          'https://example.com/cover.gif',
        ];

        validUrls.forEach((url) => {
          expect(() => CoverImageSchema.parse(url)).not.toThrow();
        });
      });

      it('should be optional', () => {
        expect(() => CoverImageSchema.parse(undefined)).not.toThrow();
      });

      it('should reject invalid URLs', () => {
        const invalidUrls = ['not-a-url'];

        invalidUrls.forEach((url) => {
          expect(() => CoverImageSchema.parse(url)).toThrow(z.ZodError);
        });
      });

      it('should require supported image formats', () => {
        const unsupportedUrls = [
          'https://example.com/cover.bmp',
          'https://example.com/cover.svg',
          'https://example.com/cover.txt',
        ];

        unsupportedUrls.forEach((url) => {
          expect(() => CoverImageSchema.parse(url)).toThrow(z.ZodError);
        });
      });
    });

    describe('BookCompleteSchema', () => {
      const validCompleteBook = {
        subjectId: '12345',
        userTags: ['科幻', '推荐'],
        userStatus: 'collect' as const,
        title: '银河系漫游指南',
        subtitle: '不要恐慌',
        rating: { average: 8.5, numRaters: 1000 },
        authors: ['道格拉斯·亚当斯'],
        userComment: '非常有趣的科幻小说',
        summary: '一本关于银河系的幽默科幻小说',
        coverUrl: 'https://example.com/cover.jpg',
        userRating: 5,
        originalTitle: "The Hitchhiker's Guide to the Galaxy",
        translators: ['姚向辉'],
        year: 1979,
        publisher: '上海译文出版社',
        readDate: new Date('2023-01-01'),
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books' as const,
        genres: ['科幻', '小说'],
        publishDate: '1979-10',
        pages: 208,
        price: '25.00元',
        binding: '平装',
        isbn: '9787532745723',
      };

      it('should accept complete valid book data', () => {
        expect(() => BookCompleteSchema.parse(validCompleteBook)).not.toThrow();
      });

      it('should require all mandatory fields', () => {
        const requiredFields = [
          'subjectId',
          'title',
          'authors',
          'doubanUrl',
          'category',
        ];

        requiredFields.forEach((field) => {
          const incompleteBook = { ...validCompleteBook };
          delete incompleteBook[field as keyof typeof incompleteBook];
          expect(() => BookCompleteSchema.parse(incompleteBook)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate all 16 standard fields', () => {
        // Test that all 16 standard fields are validated correctly
        const fields16 = [
          'subjectId',
          'userTags',
          'userStatus',
          'title',
          'subtitle',
          'rating',
          'authors',
          'userComment',
          'summary',
          'coverUrl',
          'userRating',
          'originalTitle',
          'translators',
          'year',
          'publisher',
          'readDate',
        ];

        fields16.forEach((field) => {
          expect(BookCompleteSchema.shape).toHaveProperty(field);
        });
      });

      it('should accept optional fields', () => {
        const minimalBook = {
          subjectId: '12345',
          title: '测试书籍',
          authors: ['测试作者'],
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
        };
        expect(() => BookCompleteSchema.parse(minimalBook)).not.toThrow();
      });

      it('should reject missing required fields', () => {
        const bookWithoutTitle = { ...validCompleteBook };
        delete (bookWithoutTitle as Record<string, unknown>).title;
        expect(() => BookCompleteSchema.parse(bookWithoutTitle)).toThrow(
          z.ZodError,
        );
      });

      it('should validate nested field structures', () => {
        const bookWithInvalidRating = {
          ...validCompleteBook,
          rating: { average: 11, numRaters: -1 }, // invalid values
        };
        expect(() => BookCompleteSchema.parse(bookWithInvalidRating)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('BookFieldValidationSchema', () => {
      it('should accept valid field validation result', () => {
        const validResult = {
          field: 'title',
          isValid: true,
          value: '测试书名',
          errors: [],
          warnings: [],
          suggestion: '建议补充副标题',
        };
        expect(() =>
          BookFieldValidationSchema.parse(validResult),
        ).not.toThrow();
      });

      it('should require field and isValid', () => {
        const incompleteResults = [
          { isValid: true, value: 'test' },
          { field: 'title', value: 'test' },
        ];

        incompleteResults.forEach((result) => {
          expect(() => BookFieldValidationSchema.parse(result)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should apply default empty arrays for errors/warnings', () => {
        const result = { field: 'title', isValid: true, value: 'test' };
        const parsed = BookFieldValidationSchema.parse(result);
        expect(parsed.errors).toEqual([]);
        expect(parsed.warnings).toEqual([]);
      });

      it('should accept optional suggestion', () => {
        const resultWithoutSuggestion = {
          field: 'title',
          isValid: true,
          value: 'test',
        };
        const resultWithSuggestion = {
          field: 'title',
          isValid: true,
          value: 'test',
          suggestion: '建议',
        };

        expect(() =>
          BookFieldValidationSchema.parse(resultWithoutSuggestion),
        ).not.toThrow();
        expect(() =>
          BookFieldValidationSchema.parse(resultWithSuggestion),
        ).not.toThrow();
      });
    });

    describe('BookBatchValidationSchema', () => {
      const validBatchResult = {
        isValid: true,
        totalFields: 16,
        validFields: 14,
        invalidFields: 2,
        fieldResults: [
          {
            field: 'title',
            isValid: true,
            value: 'test',
            errors: [],
            warnings: [],
          },
        ],
        summary: {
          criticalErrors: 0,
          warnings: 2,
          missingRequiredFields: [],
          dataQualityScore: 85,
        },
      };

      it('should accept valid batch validation result', () => {
        expect(() =>
          BookBatchValidationSchema.parse(validBatchResult),
        ).not.toThrow();
      });

      it('should enforce 16 fields constraint', () => {
        const invalidResults = [
          { ...validBatchResult, totalFields: 15 },
          { ...validBatchResult, totalFields: 17 },
          { ...validBatchResult, validFields: 17 },
          { ...validBatchResult, invalidFields: 17 },
        ];

        invalidResults.forEach((result) => {
          expect(() => BookBatchValidationSchema.parse(result)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate summary structure', () => {
        const invalidSummary = {
          ...validBatchResult,
          summary: {
            criticalErrors: -1, // negative not allowed
            warnings: 2,
            missingRequiredFields: [],
            dataQualityScore: 85,
          },
        };
        expect(() => BookBatchValidationSchema.parse(invalidSummary)).toThrow(
          z.ZodError,
        );
      });

      it('should validate dataQualityScore range (0-100)', () => {
        const invalidScores = [-1, 101];

        invalidScores.forEach((score) => {
          const invalidResult = {
            ...validBatchResult,
            summary: {
              ...validBatchResult.summary,
              dataQualityScore: score,
            },
          };
          expect(() => BookBatchValidationSchema.parse(invalidResult)).toThrow(
            z.ZodError,
          );
        });
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateBookComplete', () => {
      const validBookData = {
        subjectId: '12345',
        title: '测试书籍',
        authors: ['测试作者'],
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books' as const,
      };

      it('should return success for valid book data', () => {
        const result = validateBookComplete(validBookData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(expect.objectContaining(validBookData));
        }
      });

      it('should return error for invalid book data', () => {
        const invalidData = {
          ...validBookData,
          subjectId: '', // empty string not allowed
        };

        const result = validateBookComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('书籍数据验证失败');
        }
      });

      it('should format ZodError messages correctly', () => {
        const invalidData = {
          ...validBookData,
          authors: [], // empty array not allowed
        };

        const result = validateBookComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('authors');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(BookCompleteSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateBookComplete(validBookData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate all required fields presence', () => {
        const requiredFields = [
          'subjectId',
          'title',
          'authors',
          'doubanUrl',
          'category',
        ];

        requiredFields.forEach((field) => {
          const incompleteData = { ...validBookData };
          delete incompleteData[field as keyof typeof incompleteData];
          const result = validateBookComplete(incompleteData);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('validateBookField', () => {
      it('should return valid result for correct field values', () => {
        const result = validateBookField('title', '测试书名');

        expect(result.isValid).toBe(true);
        expect(result.field).toBe('title');
        expect(result.value).toBe('测试书名');
        expect(result.errors).toEqual([]);
      });

      it('should return invalid result for incorrect field values', () => {
        const result = validateBookField('title', ''); // empty string not allowed

        expect(result.isValid).toBe(false);
        expect(result.field).toBe('title');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle all supported field names', () => {
        const supportedFields: (keyof BookComplete)[] = [
          'subjectId',
          'userTags',
          'title',
          'authors',
          'coverUrl',
          'userRating',
          'year',
          'readDate',
          'category',
        ];

        supportedFields.forEach((field) => {
          let testValue: unknown = 'test';

          // Provide appropriate test values for different field types
          if (field === 'userTags' || field === 'authors') testValue = ['test'];
          if (field === 'userRating') testValue = 5;
          if (field === 'year') testValue = 2000;
          if (field === 'readDate') testValue = new Date('2023-01-01');
          if (field === 'category') testValue = 'books';
          if (field === 'coverUrl') testValue = 'https://example.com/cover.jpg';

          const result = validateBookField(field, testValue);
          expect(result.field).toBe(field);
        });
      });

      it('should return error for unsupported field names', () => {
        const result = validateBookField(
          'unsupportedField' as keyof BookComplete,
          'value',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('不支持的字段验证');
      });

      it('should format validation errors properly', () => {
        const result = validateBookField('userRating', 10); // out of range

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('不能大于5');
      });

      it('should handle ZodError and non-ZodError exceptions', () => {
        // Test with invalid null value
        const result = validateBookField('title', null);
        expect(result.isValid).toBe(false);
      });
    });

    describe('assessBookDataQuality', () => {
      it('should return 0 for invalid input', () => {
        const invalidInputs = [null, undefined, 'string', 123, []];

        invalidInputs.forEach((input) => {
          expect(assessBookDataQuality(input)).toBe(0);
        });
      });

      it('should calculate quality score correctly', () => {
        const highQualityBook = {
          subjectId: '12345',
          title: '高质量书籍',
          authors: ['著名作者'],
          rating: { average: 8.5, numRaters: 1000 },
          summary: '详细的书籍简介',
          coverUrl: 'https://example.com/cover.jpg',
          year: 2020,
          publisher: '知名出版社',
          userRating: 5,
          userTags: ['推荐'],
          translators: ['译者'],
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
        };

        const score = assessBookDataQuality(highQualityBook);
        expect(score).toBeGreaterThan(50);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should weight core fields appropriately', () => {
        const coreFieldsBook = {
          subjectId: '12345', // weight 15
          title: '测试书籍', // weight 15
          authors: ['作者'], // weight 10
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
        };

        const score = assessBookDataQuality(coreFieldsBook);
        expect(score).toBeGreaterThanOrEqual(40); // At least core fields weight
      });

      it('should handle different value types (strings, numbers, arrays, objects)', () => {
        const mixedTypeBook = {
          subjectId: '12345', // string
          title: '测试', // string
          authors: ['作者1', '作者2'], // array
          rating: { average: 8.0, numRaters: 100 }, // object
          year: 2020, // number
          userRating: 4, // number
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
        };

        const score = assessBookDataQuality(mixedTypeBook);
        expect(score).toBeGreaterThan(0);
      });

      it('should cap score at 100', () => {
        // Create a book with all possible weighted fields
        const perfectBook = {
          subjectId: '12345',
          title: '完美书籍',
          authors: ['著名作者'],
          rating: { average: 9.5, numRaters: 10000 },
          summary: '非常详细的书籍简介，内容丰富',
          coverUrl: 'https://example.com/cover.jpg',
          year: 2023,
          publisher: '顶级出版社',
          userRating: 5,
          userTags: ['经典', '必读', '推荐'],
          translators: ['知名译者'],
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
          // Add extra fields to try to exceed 100
          userComment: '非常好的书',
          originalTitle: 'Perfect Book',
          subtitle: '副标题',
        };

        const score = assessBookDataQuality(perfectBook);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should handle missing fields gracefully', () => {
        const sparseBook = {
          subjectId: '12345',
          doubanUrl: 'https://book.douban.com/subject/12345/',
          category: 'books' as const,
        };

        const score = assessBookDataQuality(sparseBook);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThan(50);
      });
    });

    describe('isValidBookComplete', () => {
      const validBook = {
        subjectId: '12345',
        title: '测试书籍',
        authors: ['测试作者'],
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books' as const,
      };

      it('should return true for valid book data', () => {
        expect(isValidBookComplete(validBook)).toBe(true);
      });

      it('should return false for invalid book data', () => {
        const invalidBook = {
          ...validBook,
          subjectId: '', // invalid
        };
        expect(isValidBookComplete(invalidBook)).toBe(false);
      });

      it('should act as proper type guard', () => {
        const data: unknown = validBook;

        if (isValidBookComplete(data)) {
          // TypeScript should recognize data as BookComplete here
          expect(data.subjectId).toBe('12345');
          expect(data.category).toBe('books');
        } else {
          fail('Type guard should have returned true for valid data');
        }
      });

      it('should handle edge cases (null, undefined, wrong types)', () => {
        const edgeCases = [null, undefined, 'string', 123, [], {}];

        edgeCases.forEach((testCase) => {
          expect(isValidBookComplete(testCase)).toBe(false);
        });
      });
    });
  });

  describe('Type Inference', () => {
    it('should export correct TypeScript types', () => {
      // Test that types are correctly inferred from schemas
      const subjectId: BookSubjectId = '12345';
      const title: BookTitle = { main: '测试书名' };
      const rating: BookRating = { average: 8.5, numRaters: 1000 };
      const authors: BookAuthors = [{ name: '作者', role: 'author' }];
      const translators: BookTranslators = [{ name: '译者' }];
      const publishing: BookPublishing = { publisher: '出版社' };
      const physical: BookPhysical = { pages: 300 };
      const genres: BookGenres = ['科幻'];
      const summary: BookSummary = '简介';
      const userRating: UserRating = 5;
      const userTags: UserTags = ['标签'];
      const userComment: UserComment = '评论';
      const userStatus: UserStatus = 'collect';
      const markDate: MarkDate = new Date();
      const coverImage: CoverImage = 'https://example.com/cover.jpg';

      const completeBook: BookComplete = {
        subjectId: '12345',
        userTags: [],
        title: '测试书籍',
        authors: ['作者'],
        translators: [],
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books',
        genres: [],
      };

      const fieldValidation: BookFieldValidation = {
        field: 'title',
        isValid: true,
        value: 'test',
        errors: [],
        warnings: [],
      };

      const batchValidation: BookBatchValidation = {
        isValid: true,
        totalFields: 16,
        validFields: 16,
        invalidFields: 0,
        fieldResults: [],
        summary: {
          criticalErrors: 0,
          warnings: 0,
          missingRequiredFields: [],
          dataQualityScore: 100,
        },
      };

      // If types are correctly inferred, these assignments should not cause TypeScript errors
      expect(subjectId).toBeDefined();
      expect(title).toBeDefined();
      expect(rating).toBeDefined();
      expect(authors).toBeDefined();
      expect(translators).toBeDefined();
      expect(publishing).toBeDefined();
      expect(physical).toBeDefined();
      expect(genres).toBeDefined();
      expect(summary).toBeDefined();
      expect(userRating).toBeDefined();
      expect(userTags).toBeDefined();
      expect(userComment).toBeDefined();
      expect(userStatus).toBeDefined();
      expect(markDate).toBeDefined();
      expect(coverImage).toBeDefined();
      expect(completeBook).toBeDefined();
      expect(fieldValidation).toBeDefined();
      expect(batchValidation).toBeDefined();
    });

    it('should validate type consistency with schemas', () => {
      // Test that schemas accept the typed values
      expect(() =>
        BookSubjectIdSchema.parse('12345' as BookSubjectId),
      ).not.toThrow();
      expect(() =>
        UserStatusSchema.parse('collect' as UserStatus),
      ).not.toThrow();

      const bookData: BookComplete = {
        subjectId: '12345',
        userTags: [],
        title: '测试书籍',
        authors: ['作者'],
        translators: [],
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books',
        genres: [],
      };

      expect(() => BookCompleteSchema.parse(bookData)).not.toThrow();

      const validation: BookFieldValidation = {
        field: 'title',
        isValid: true,
        value: 'test',
        errors: [],
        warnings: [],
      };

      expect(() => BookFieldValidationSchema.parse(validation)).not.toThrow();
    });

    it('should ensure all exported types match schema inferences', () => {
      // This test ensures that manually defined types match Zod inferred types
      // by attempting to assign inferred types to manually defined types

      type InferredBookSubjectId = z.infer<typeof BookSubjectIdSchema>;
      type InferredUserStatus = z.infer<typeof UserStatusSchema>;
      type InferredBookComplete = z.infer<typeof BookCompleteSchema>;

      const subjectId: BookSubjectId = '12345' as InferredBookSubjectId;
      const userStatus: UserStatus = 'collect' as InferredUserStatus;
      const bookComplete: BookComplete = {
        subjectId: '12345',
        userTags: [],
        title: '测试',
        authors: ['作者'],
        translators: [],
        doubanUrl: 'https://book.douban.com/subject/12345/',
        category: 'books',
        genres: [],
      } as InferredBookComplete;

      expect(subjectId).toBe('12345');
      expect(userStatus).toBe('collect');
      expect(bookComplete.category).toBe('books');
    });
  });
});
