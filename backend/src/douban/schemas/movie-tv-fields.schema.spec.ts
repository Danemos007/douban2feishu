/**
 * movie-tv-fields.schema.ts 单元测试
 *
 * 测试覆盖豆瓣影视内容所有 Zod Schema 定义和工具函数
 * 支持：电影(18字段)、电视剧(19字段)、纪录片(19字段)
 * 目标覆盖率: 90%+
 */

import { z } from 'zod';
import {
  MovieSubjectIdSchema,
  MovieTitleSchema,
  MovieRatingSchema,
  DirectorsSchema,
  CastSchema,
  WritersSchema,
  DurationSchema,
  CountriesSchema,
  LanguagesSchema,
  ReleaseDateSchema,
  MovieGenresSchema,
  ImdbIdSchema,
  MovieUserRatingSchema,
  MovieUserTagsSchema,
  MovieUserStatusSchema,
  TvSpecificFieldsSchema,
  MovieCompleteSchema,
  TvSeriesCompleteSchema,
  DocumentaryCompleteSchema,
  MovieFieldValidationSchema,
  validateMovieComplete,
  validateTvSeriesComplete,
  validateDocumentaryComplete,
  isDocumentaryByGenres,
  assessMovieDataQuality,
  isValidMovieComplete,
  isValidTvSeriesComplete,
  isValidDocumentaryComplete,
  type MovieSubjectId,
  type MovieTitle,
  type MovieRating,
  type Directors,
  type Cast,
  type Writers,
  type Duration,
  type Countries,
  type Languages,
  type ReleaseDate,
  type MovieGenres,
  type ImdbId,
  type MovieUserRating,
  type MovieUserTags,
  type MovieUserStatus,
  type TvSpecificFields,
  type MovieComplete,
  type TvSeriesComplete,
  type DocumentaryComplete,
  type MovieFieldValidation,
} from './movie-tv-fields.schema';

describe('movie-tv-fields.schema.ts', () => {
  describe('Schema Definitions', () => {
    describe('MovieSubjectIdSchema', () => {
      it('should accept valid numeric string IDs', () => {
        const validIds = ['123', '1234567', '12345678901234567890'];

        validIds.forEach((id) => {
          expect(() => MovieSubjectIdSchema.parse(id)).not.toThrow();
        });
      });

      it('should reject non-numeric strings', () => {
        const invalidIds = ['abc', '123abc', 'a123', '12.34', '12-34'];

        invalidIds.forEach((id) => {
          expect(() => MovieSubjectIdSchema.parse(id)).toThrow(z.ZodError);
        });
      });

      it('should reject empty strings', () => {
        expect(() => MovieSubjectIdSchema.parse('')).toThrow(z.ZodError);
      });

      it('should reject IDs exceeding 20 characters', () => {
        const longId = '123456789012345678901'; // 21 characters
        expect(() => MovieSubjectIdSchema.parse(longId)).toThrow(z.ZodError);
      });

      it('should reject non-string values', () => {
        const nonStringValues = [123, null, undefined, {}, []];

        nonStringValues.forEach((value) => {
          expect(() => MovieSubjectIdSchema.parse(value)).toThrow(z.ZodError);
        });
      });
    });

    describe('MovieTitleSchema', () => {
      it('should accept valid title with main title', () => {
        const validTitle = { main: '复仇者联盟' };
        expect(() => MovieTitleSchema.parse(validTitle)).not.toThrow();
      });

      it('should accept title with original title and aka', () => {
        const validTitle = {
          main: '复仇者联盟',
          original: 'The Avengers',
          aka: ['复联', 'Avengers'],
        };
        expect(() => MovieTitleSchema.parse(validTitle)).not.toThrow();
      });

      it('should reject empty main title', () => {
        const invalidTitle = { main: '' };
        expect(() => MovieTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should reject main title exceeding 500 characters', () => {
        const longTitle = 'a'.repeat(501);
        const invalidTitle = { main: longTitle };
        expect(() => MovieTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should reject original title exceeding 500 characters', () => {
        const longOriginal = 'a'.repeat(501);
        const invalidTitle = { main: '测试', original: longOriginal };
        expect(() => MovieTitleSchema.parse(invalidTitle)).toThrow(z.ZodError);
      });

      it('should apply default empty array for aka', () => {
        const title = { main: '测试电影' };
        const parsed = MovieTitleSchema.parse(title);
        expect(parsed.aka).toEqual([]);
      });
    });

    describe('MovieRatingSchema', () => {
      it('should accept valid rating with average and numRaters', () => {
        const validRating = { average: 8.5, numRaters: 1000 };
        expect(() => MovieRatingSchema.parse(validRating)).not.toThrow();
      });

      it('should accept optional stars field', () => {
        const validRating = {
          average: 8.5,
          numRaters: 1000,
          stars: '4.0',
        };
        expect(() => MovieRatingSchema.parse(validRating)).not.toThrow();
      });

      it('should reject average rating below 0', () => {
        const invalidRating = { average: -1, numRaters: 100 };
        expect(() => MovieRatingSchema.parse(invalidRating)).toThrow(
          z.ZodError,
        );
      });

      it('should reject average rating above 10', () => {
        const invalidRating = { average: 11, numRaters: 100 };
        expect(() => MovieRatingSchema.parse(invalidRating)).toThrow(
          z.ZodError,
        );
      });

      it('should reject rating not multiple of 0.1', () => {
        const invalidRating = { average: 8.55, numRaters: 100 };
        expect(() => MovieRatingSchema.parse(invalidRating)).toThrow(
          z.ZodError,
        );
      });

      it('should reject negative numRaters', () => {
        const invalidRating = { average: 8.5, numRaters: -1 };
        expect(() => MovieRatingSchema.parse(invalidRating)).toThrow(
          z.ZodError,
        );
      });

      it('should reject non-integer numRaters', () => {
        const invalidRating = { average: 8.5, numRaters: 100.5 };
        expect(() => MovieRatingSchema.parse(invalidRating)).toThrow(
          z.ZodError,
        );
      });

      it('should reject invalid stars format', () => {
        const invalidRatings = [
          { average: 8.5, numRaters: 100, stars: '6.0' }, // above 5.0
          { average: 8.5, numRaters: 100, stars: '4.5' }, // not .0 format
          { average: 8.5, numRaters: 100, stars: 'abc' }, // non-numeric
        ];

        invalidRatings.forEach((rating) => {
          expect(() => MovieRatingSchema.parse(rating)).toThrow(z.ZodError);
        });
      });
    });

    describe('DirectorsSchema', () => {
      it('should accept array of valid directors', () => {
        const validDirectors = [
          { name: '克里斯托弗·诺兰' },
          {
            name: 'Christopher Nolan',
            originalName: 'Christopher Nolan',
            nationality: '英国',
          },
        ];
        expect(() => DirectorsSchema.parse(validDirectors)).not.toThrow();
      });

      it('should require at least one director', () => {
        expect(() => DirectorsSchema.parse([])).toThrow(z.ZodError);
      });

      it('should reject empty director name', () => {
        const invalidDirectors = [{ name: '' }];
        expect(() => DirectorsSchema.parse(invalidDirectors)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional fields (originalName, nationality)', () => {
        const directorsWithOptionals = [
          {
            name: '克里斯托弗·诺兰',
            originalName: 'Christopher Nolan',
            nationality: '英国',
          },
        ];
        expect(() =>
          DirectorsSchema.parse(directorsWithOptionals),
        ).not.toThrow();
      });
    });

    describe('CastSchema', () => {
      it('should accept array of valid cast members', () => {
        const validCast = [
          { name: '小罗伯特·唐尼' },
          {
            name: 'Robert Downey Jr.',
            originalName: 'Robert John Downey Jr.',
            role: 'Tony Stark',
            nationality: '美国',
          },
        ];
        expect(() => CastSchema.parse(validCast)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = CastSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty cast member name', () => {
        const invalidCast = [{ name: '' }];
        expect(() => CastSchema.parse(invalidCast)).toThrow(z.ZodError);
      });

      it('should accept optional fields (originalName, role, nationality)', () => {
        const castWithOptionals = [
          {
            name: '小罗伯特·唐尼',
            originalName: 'Robert Downey Jr.',
            role: 'Tony Stark / Iron Man',
            nationality: '美国',
          },
        ];
        expect(() => CastSchema.parse(castWithOptionals)).not.toThrow();
      });
    });

    describe('WritersSchema', () => {
      it('should accept array of valid writers', () => {
        const validWriters = [
          { name: '克里斯托弗·马库斯' },
          { name: 'Christopher Markus', originalName: 'Christopher Markus' },
        ];
        expect(() => WritersSchema.parse(validWriters)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = WritersSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty writer name', () => {
        const invalidWriters = [{ name: '' }];
        expect(() => WritersSchema.parse(invalidWriters)).toThrow(z.ZodError);
      });

      it('should accept optional originalName', () => {
        const writers = [
          { name: '克里斯托弗·马库斯' },
          { name: '斯蒂芬·麦克菲利', originalName: 'Stephen McFeely' },
        ];
        expect(() => WritersSchema.parse(writers)).not.toThrow();
      });
    });

    describe('DurationSchema', () => {
      it('should accept valid duration formats (分钟, 小时分, :, 分秒)', () => {
        const validDurations = [
          '90分钟',
          '90分',
          '1小时30分',
          '1小时30',
          '90:00',
          '6分03秒',
        ];

        validDurations.forEach((duration) => {
          expect(() => DurationSchema.parse(duration)).not.toThrow();
        });
      });

      it('should reject invalid duration formats', () => {
        const invalidDurations = [
          '90mins', // 英文
          '1h30m', // 英文缩写
          '90', // 纯数字
          '1.5小时', // 小数
          '90分钟30秒', // 混合格式
        ];

        invalidDurations.forEach((duration) => {
          expect(() => DurationSchema.parse(duration)).toThrow(z.ZodError);
        });
      });

      it('should be optional', () => {
        expect(() => DurationSchema.parse(undefined)).not.toThrow();
      });
    });

    describe('CountriesSchema', () => {
      it('should accept array of valid countries', () => {
        const validCountries = ['中国大陆', '美国', '英国'];
        expect(() => CountriesSchema.parse(validCountries)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = CountriesSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty country strings', () => {
        const invalidCountries = [''];
        expect(() => CountriesSchema.parse(invalidCountries)).toThrow(
          z.ZodError,
        );
      });

      it('should reject country exceeding 50 characters', () => {
        const longCountry = 'a'.repeat(51);
        const invalidCountries = [longCountry];
        expect(() => CountriesSchema.parse(invalidCountries)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('LanguagesSchema', () => {
      it('should accept array of valid languages', () => {
        const validLanguages = ['中文', '英语', '日语'];
        expect(() => LanguagesSchema.parse(validLanguages)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = LanguagesSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty language strings', () => {
        const invalidLanguages = [''];
        expect(() => LanguagesSchema.parse(invalidLanguages)).toThrow(
          z.ZodError,
        );
      });

      it('should reject language exceeding 30 characters', () => {
        const longLanguage = 'a'.repeat(31);
        const invalidLanguages = [longLanguage];
        expect(() => LanguagesSchema.parse(invalidLanguages)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('ReleaseDateSchema', () => {
      it('should accept valid date formats (YYYY, YYYY-MM, YYYY-MM-DD)', () => {
        const validDates = ['2023', '2023-05', '2023-05-03'];

        validDates.forEach((date) => {
          expect(() => ReleaseDateSchema.parse(date)).not.toThrow();
        });
      });

      it('should accept date with region info', () => {
        const datesWithRegion = [
          '2023-05-03(中国大陆)',
          '2023-05-03(美国)',
          '2023(全球)',
        ];

        datesWithRegion.forEach((date) => {
          expect(() => ReleaseDateSchema.parse(date)).not.toThrow();
        });
      });

      it('should reject invalid date formats', () => {
        const invalidDates = [
          '23',
          '2023/05/03',
          '20a3',
          'abc-01',
          '2023-',
          '2023--01',
        ];

        invalidDates.forEach((date) => {
          expect(() => ReleaseDateSchema.parse(date)).toThrow(z.ZodError);
        });
      });

      it('should be optional', () => {
        expect(() => ReleaseDateSchema.parse(undefined)).not.toThrow();
      });
    });

    describe('MovieGenresSchema', () => {
      it('should accept array of valid genres', () => {
        const validGenres = ['动作', '科幻', '冒险'];
        expect(() => MovieGenresSchema.parse(validGenres)).not.toThrow();
      });

      it('should require at least one genre', () => {
        expect(() => MovieGenresSchema.parse([])).toThrow(z.ZodError);
      });

      it('should reject empty genre strings', () => {
        const invalidGenres = [''];
        expect(() => MovieGenresSchema.parse(invalidGenres)).toThrow(
          z.ZodError,
        );
      });

      it('should reject genre exceeding 20 characters', () => {
        const longGenre = 'a'.repeat(21);
        const invalidGenres = [longGenre];
        expect(() => MovieGenresSchema.parse(invalidGenres)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('ImdbIdSchema', () => {
      it('should accept valid IMDB IDs (tt followed by 7+ digits)', () => {
        const validIds = ['tt0848228', 'tt12345678', 'tt1234567890'];

        validIds.forEach((id) => {
          expect(() => ImdbIdSchema.parse(id)).not.toThrow();
        });
      });

      it('should reject invalid IMDB ID formats', () => {
        const invalidIds = [
          'tt123456', // too short
          'nm0123456', // wrong prefix
          '0848228', // no prefix
          'tt', // no digits
          'tt123abc', // non-digits
        ];

        invalidIds.forEach((id) => {
          expect(() => ImdbIdSchema.parse(id)).toThrow(z.ZodError);
        });
      });

      it('should be optional', () => {
        expect(() => ImdbIdSchema.parse(undefined)).not.toThrow();
      });
    });

    describe('MovieUserRatingSchema', () => {
      it('should accept valid user rating (1-5)', () => {
        const validRatings = [1, 2, 3, 4, 5];

        validRatings.forEach((rating) => {
          expect(() => MovieUserRatingSchema.parse(rating)).not.toThrow();
        });
      });

      it('should be optional', () => {
        expect(() => MovieUserRatingSchema.parse(undefined)).not.toThrow();
      });

      it('should reject rating below 1', () => {
        expect(() => MovieUserRatingSchema.parse(0)).toThrow(z.ZodError);
      });

      it('should reject rating above 5', () => {
        expect(() => MovieUserRatingSchema.parse(6)).toThrow(z.ZodError);
      });

      it('should require integer values', () => {
        expect(() => MovieUserRatingSchema.parse(3.5)).toThrow(z.ZodError);
      });
    });

    describe('MovieUserTagsSchema', () => {
      it('should accept array of valid tags', () => {
        const validTags = ['动作', '经典', '超级英雄'];
        expect(() => MovieUserTagsSchema.parse(validTags)).not.toThrow();
      });

      it('should apply default empty array', () => {
        const parsed = MovieUserTagsSchema.parse(undefined);
        expect(parsed).toEqual([]);
      });

      it('should reject empty tag strings', () => {
        const invalidTags = [''];
        expect(() => MovieUserTagsSchema.parse(invalidTags)).toThrow(
          z.ZodError,
        );
      });

      it('should reject tags exceeding 50 characters', () => {
        const longTag = 'a'.repeat(51);
        const invalidTags = [longTag];
        expect(() => MovieUserTagsSchema.parse(invalidTags)).toThrow(
          z.ZodError,
        );
      });

      it('should reject tags with forbidden characters', () => {
        const invalidTags = [
          ['tag,with,comma'],
          ['tag，with，chinese，comma'],
          ['tag;with;semicolon'],
          ['tag；with；chinese；semicolon'],
          ['tag|with|pipe'],
          ['tag｜with｜chinese｜pipe'],
        ];

        invalidTags.forEach((tags) => {
          expect(() => MovieUserTagsSchema.parse(tags)).toThrow(z.ZodError);
        });
      });

      it('should reject more than 50 tags', () => {
        const tooManyTags = Array.from({ length: 51 }, (_, i) => `tag${i}`);
        expect(() => MovieUserTagsSchema.parse(tooManyTags)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('MovieUserStatusSchema', () => {
      it('should accept valid status values (wish, do, collect)', () => {
        const validStatuses = ['wish', 'do', 'collect'] as const;

        validStatuses.forEach((status) => {
          expect(() => MovieUserStatusSchema.parse(status)).not.toThrow();
        });
      });

      it('should reject invalid status values', () => {
        const invalidStatuses = ['watch', 'watching', 'watched', 'seen'];

        invalidStatuses.forEach((status) => {
          expect(() => MovieUserStatusSchema.parse(status)).toThrow(z.ZodError);
        });
      });
    });

    describe('TvSpecificFieldsSchema', () => {
      it('should accept valid TV specific fields', () => {
        const validFields = {
          episodeCount: 24,
          episodeDuration: '45分钟',
          firstAirDate: '2023-01-01',
          network: 'HBO',
          status: 'ended' as const,
        };
        expect(() => TvSpecificFieldsSchema.parse(validFields)).not.toThrow();
      });

      it('should validate episodeCount constraints', () => {
        const invalidCounts = [0, -1, 10001, 3.5];

        invalidCounts.forEach((count) => {
          const fields = { episodeCount: count };
          expect(() => TvSpecificFieldsSchema.parse(fields)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate episodeDuration format', () => {
        const validFields = { episodeDuration: '45分钟' };
        expect(() => TvSpecificFieldsSchema.parse(validFields)).not.toThrow();

        const invalidFields = { episodeDuration: '45mins' };
        expect(() => TvSpecificFieldsSchema.parse(invalidFields)).toThrow(
          z.ZodError,
        );
      });

      it('should validate firstAirDate format', () => {
        const validFields = { firstAirDate: '2023-01-01' };
        expect(() => TvSpecificFieldsSchema.parse(validFields)).not.toThrow();

        const invalidFields = { firstAirDate: '2023/01/01' };
        expect(() => TvSpecificFieldsSchema.parse(invalidFields)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional network and status', () => {
        const fieldsWithOptionals = {
          episodeCount: 12,
          network: 'Netflix',
          status: 'ongoing' as const,
        };
        expect(() =>
          TvSpecificFieldsSchema.parse(fieldsWithOptionals),
        ).not.toThrow();
      });
    });

    describe('MovieCompleteSchema', () => {
      const validCompleteMovie = {
        subjectId: '1234567',
        userTags: ['动作', '科幻'],
        userStatus: 'collect' as const,
        category: 'movies' as const,
        title: '复仇者联盟',
        coverUrl: 'https://example.com/avengers.jpg',
        rating: { average: 8.5, numRaters: 100000 },
        userComment: '非常精彩的超级英雄电影',
        duration: '143分钟',
        releaseDate: '2012-05-04',
        summary: '地球最强超级英雄团队的诞生',
        cast: ['小罗伯特·唐尼', '克里斯·埃文斯'],
        directors: ['乔斯·韦登'],
        writers: ['乔斯·韦登'],
        countries: ['美国'],
        languages: ['英语'],
        userRating: 5,
        readDate: new Date('2023-01-01'),
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        originalTitle: 'The Avengers',
        year: 2012,
        genres: ['动作', '科幻', '冒险'],
        imdbId: 'tt0848228',
      };

      it('should accept complete valid movie data (18 fields)', () => {
        expect(() =>
          MovieCompleteSchema.parse(validCompleteMovie),
        ).not.toThrow();
      });

      it('should require all mandatory fields', () => {
        const requiredFields = [
          'subjectId',
          'category',
          'title',
          'directors',
          'doubanUrl',
          'genres',
        ];

        requiredFields.forEach((field) => {
          const incompleteMovie = { ...validCompleteMovie };
          delete incompleteMovie[field as keyof typeof incompleteMovie];
          expect(() => MovieCompleteSchema.parse(incompleteMovie)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate category as "movies"', () => {
        const movieWithWrongCategory = {
          ...validCompleteMovie,
          category: 'tv',
        };
        expect(() => MovieCompleteSchema.parse(movieWithWrongCategory)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional fields', () => {
        const minimalMovie = {
          subjectId: '1234567',
          category: 'movies' as const,
          title: '测试电影',
          directors: ['测试导演'],
          doubanUrl: 'https://movie.douban.com/subject/1234567/',
          genres: ['剧情'],
        };
        expect(() => MovieCompleteSchema.parse(minimalMovie)).not.toThrow();
      });

      it('should reject missing required fields', () => {
        const movieWithoutTitle = { ...validCompleteMovie };
        delete (movieWithoutTitle as Record<string, unknown>).title;
        expect(() => MovieCompleteSchema.parse(movieWithoutTitle)).toThrow(
          z.ZodError,
        );
      });

      it('should validate nested field structures', () => {
        const movieWithInvalidRating = {
          ...validCompleteMovie,
          rating: { average: 11, numRaters: -1 }, // invalid values
        };
        expect(() => MovieCompleteSchema.parse(movieWithInvalidRating)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('TvSeriesCompleteSchema', () => {
      const validCompleteTvSeries = {
        subjectId: '1234567',
        userTags: ['剧情', '科幻'],
        userStatus: 'do' as const,
        category: 'tv' as const,
        title: '权力的游戏',
        coverUrl: 'https://example.com/got.jpg',
        rating: { average: 9.3, numRaters: 200000 },
        episodeDuration: '60分钟',
        episodeCount: 73,
        firstAirDate: '2011-04-17',
        summary: '史诗级奇幻电视剧',
        userComment: '最喜欢的美剧之一',
        cast: ['彼特·丁拉基', '艾米莉亚·克拉克'],
        directors: ['大卫·贝尼奥夫'],
        writers: ['大卫·贝尼奥夫', 'D·B·威斯'],
        countries: ['美国'],
        languages: ['英语'],
        userRating: 5,
        readDate: new Date('2023-01-01'),
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        originalTitle: 'Game of Thrones',
        year: 2011,
        genres: ['剧情', '奇幻', '冒险'],
        imdbId: 'tt0944947',
      };

      it('should accept complete valid TV series data (19 fields)', () => {
        expect(() =>
          TvSeriesCompleteSchema.parse(validCompleteTvSeries),
        ).not.toThrow();
      });

      it('should require all mandatory fields', () => {
        const requiredFields = [
          'subjectId',
          'category',
          'title',
          'directors',
          'doubanUrl',
          'genres',
        ];

        requiredFields.forEach((field) => {
          const incompleteTv = { ...validCompleteTvSeries };
          delete incompleteTv[field as keyof typeof incompleteTv];
          expect(() => TvSeriesCompleteSchema.parse(incompleteTv)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate category as "tv"', () => {
        const tvWithWrongCategory = {
          ...validCompleteTvSeries,
          category: 'movies',
        };
        expect(() => TvSeriesCompleteSchema.parse(tvWithWrongCategory)).toThrow(
          z.ZodError,
        );
      });

      it('should include episodeCount field', () => {
        const tvWithEpisodeCount = {
          ...validCompleteTvSeries,
          episodeCount: 24,
        };
        expect(() =>
          TvSeriesCompleteSchema.parse(tvWithEpisodeCount),
        ).not.toThrow();
      });

      it('should validate episodeDuration vs duration difference', () => {
        // TV series uses episodeDuration, not duration
        const tvWithEpisodeDuration = {
          ...validCompleteTvSeries,
          episodeDuration: '45分钟',
        };
        expect(() =>
          TvSeriesCompleteSchema.parse(tvWithEpisodeDuration),
        ).not.toThrow();
      });
    });

    describe('DocumentaryCompleteSchema', () => {
      const validCompleteDocumentary = {
        subjectId: '1234567',
        userTags: ['纪录片', '自然'],
        userStatus: 'collect' as const,
        category: 'documentary' as const,
        title: '地球脉动',
        coverUrl: 'https://example.com/planet-earth.jpg',
        rating: { average: 9.8, numRaters: 50000 },
        episodeDuration: '50分钟',
        episodeCount: 11,
        firstAirDate: '2006-03-05',
        summary: 'BBC制作的自然纪录片',
        userComment: '震撼的自然影像',
        cast: [],
        directors: ['艾雷斯泰·法瑟吉尔'],
        writers: ['艾雷斯泰·法瑟吉尔'],
        countries: ['英国'],
        languages: ['英语'],
        userRating: 5,
        readDate: new Date('2023-01-01'),
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        originalTitle: 'Planet Earth',
        year: 2006,
        genres: ['纪录片'],
        imdbId: 'tt0795176',
      };

      it('should accept complete valid documentary data (19 fields)', () => {
        expect(() =>
          DocumentaryCompleteSchema.parse(validCompleteDocumentary),
        ).not.toThrow();
      });

      it('should validate category as "documentary"', () => {
        const docWithCorrectCategory = { ...validCompleteDocumentary };
        expect(() =>
          DocumentaryCompleteSchema.parse(docWithCorrectCategory),
        ).not.toThrow();

        const docWithWrongCategory = {
          ...validCompleteDocumentary,
          category: 'movies',
        };
        expect(() =>
          DocumentaryCompleteSchema.parse(docWithWrongCategory),
        ).toThrow(z.ZodError);
      });

      it('should inherit TV series structure', () => {
        // Documentary should have the same structure as TV series except category
        const docFields = Object.keys(validCompleteDocumentary);
        expect(docFields).toContain('episodeCount');
        expect(docFields).toContain('episodeDuration');
        expect(docFields).toContain('firstAirDate');
      });
    });

    describe('MovieFieldValidationSchema', () => {
      it('should accept valid field validation result', () => {
        const validResult = {
          field: 'title',
          isValid: true,
          value: '复仇者联盟',
          errors: [],
          warnings: [],
          suggestion: '建议添加原标题',
        };
        expect(() =>
          MovieFieldValidationSchema.parse(validResult),
        ).not.toThrow();
      });

      it('should require field and isValid', () => {
        const incompleteResults = [
          { isValid: true, value: 'test' },
          { field: 'title', value: 'test' },
        ];

        incompleteResults.forEach((result) => {
          expect(() => MovieFieldValidationSchema.parse(result)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should apply default empty arrays for errors/warnings', () => {
        const result = { field: 'title', isValid: true, value: 'test' };
        const parsed = MovieFieldValidationSchema.parse(result);
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
          MovieFieldValidationSchema.parse(resultWithoutSuggestion),
        ).not.toThrow();
        expect(() =>
          MovieFieldValidationSchema.parse(resultWithSuggestion),
        ).not.toThrow();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateMovieComplete', () => {
      const validMovieData = {
        subjectId: '1234567',
        category: 'movies' as const,
        title: '测试电影',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['剧情'],
      };

      it('should return success for valid movie data', () => {
        const result = validateMovieComplete(validMovieData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(expect.objectContaining(validMovieData));
        }
      });

      it('should return error for invalid movie data', () => {
        const invalidData = {
          ...validMovieData,
          subjectId: '', // empty string not allowed
        };

        const result = validateMovieComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('电影数据验证失败');
        }
      });

      it('should format ZodError messages correctly', () => {
        const invalidData = {
          ...validMovieData,
          directors: [], // empty array not allowed
        };

        const result = validateMovieComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('directors');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(MovieCompleteSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateMovieComplete(validMovieData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate 18-field structure', () => {
        // All required fields for movies
        const requiredFields = [
          'subjectId',
          'category',
          'title',
          'directors',
          'doubanUrl',
          'genres',
        ];

        requiredFields.forEach((field) => {
          const incompleteData = { ...validMovieData };
          delete incompleteData[field as keyof typeof incompleteData];
          const result = validateMovieComplete(incompleteData);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('validateTvSeriesComplete', () => {
      const validTvData = {
        subjectId: '1234567',
        category: 'tv' as const,
        title: '测试电视剧',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['剧情'],
      };

      it('should return success for valid TV series data', () => {
        const result = validateTvSeriesComplete(validTvData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(expect.objectContaining(validTvData));
        }
      });

      it('should return error for invalid TV series data', () => {
        const invalidData = {
          ...validTvData,
          category: 'movies', // wrong category
        };

        const result = validateTvSeriesComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('电视剧数据验证失败');
        }
      });

      it('should format ZodError messages correctly', () => {
        const invalidData = {
          ...validTvData,
          genres: [], // empty array not allowed
        };

        const result = validateTvSeriesComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('genres');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(TvSeriesCompleteSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateTvSeriesComplete(validTvData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate 19-field structure', () => {
        // All required fields for TV series
        const requiredFields = [
          'subjectId',
          'category',
          'title',
          'directors',
          'doubanUrl',
          'genres',
        ];

        requiredFields.forEach((field) => {
          const incompleteData = { ...validTvData };
          delete incompleteData[field as keyof typeof incompleteData];
          const result = validateTvSeriesComplete(incompleteData);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('validateDocumentaryComplete', () => {
      const validDocumentaryData = {
        subjectId: '1234567',
        category: 'documentary' as const,
        title: '测试纪录片',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['纪录片'],
      };

      it('should return success for valid documentary data', () => {
        const result = validateDocumentaryComplete(validDocumentaryData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(
            expect.objectContaining(validDocumentaryData),
          );
        }
      });

      it('should return error for invalid documentary data', () => {
        const invalidData = {
          ...validDocumentaryData,
          category: 'tv', // wrong category
        };

        const result = validateDocumentaryComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('纪录片数据验证失败');
        }
      });

      it('should format ZodError messages correctly', () => {
        const invalidData = {
          ...validDocumentaryData,
          directors: [], // empty array not allowed
        };

        const result = validateDocumentaryComplete(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('directors');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(DocumentaryCompleteSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateDocumentaryComplete(validDocumentaryData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate documentary-specific fields', () => {
        const documentaryWithSpecificGenre = {
          ...validDocumentaryData,
          genres: ['纪录片', '自然'],
        };

        const result = validateDocumentaryComplete(
          documentaryWithSpecificGenre,
        );
        expect(result.success).toBe(true);
      });
    });

    describe('isDocumentaryByGenres', () => {
      it('should return true for genres containing documentary', () => {
        const documentaryGenres = [
          ['纪录片'],
          ['纪录片', '自然'],
          ['自然', '纪录片', '动物'],
          ['BBC纪录片'],
        ];

        documentaryGenres.forEach((genres) => {
          expect(isDocumentaryByGenres(genres)).toBe(true);
        });
      });

      it('should return false for non-documentary genres', () => {
        const nonDocumentaryGenres = [
          ['剧情', '动作'],
          ['科幻', '冒险'],
          ['喜剧'],
          ['恐怖', '惊悚'],
        ];

        nonDocumentaryGenres.forEach((genres) => {
          expect(isDocumentaryByGenres(genres)).toBe(false);
        });
      });

      it('should handle empty arrays', () => {
        expect(isDocumentaryByGenres([])).toBe(false);
      });

      it('should handle invalid input types', () => {
        const invalidInputs = [null, undefined, 'string', 123, {}];

        invalidInputs.forEach((input) => {
          expect(isDocumentaryByGenres(input as unknown as string[])).toBe(
            false,
          );
        });
      });

      it('should be case-sensitive for Chinese "纪录片"', () => {
        expect(isDocumentaryByGenres(['纪录片'])).toBe(true);
        expect(isDocumentaryByGenres(['Documentary'])).toBe(false);
        expect(isDocumentaryByGenres(['记录片'])).toBe(false); // typo
      });
    });

    describe('assessMovieDataQuality', () => {
      it('should return 0 for invalid input', () => {
        const invalidInputs = [null, undefined, 'string', 123, []];

        invalidInputs.forEach((input) => {
          expect(assessMovieDataQuality(input)).toBe(0);
        });
      });

      it('should calculate quality score correctly', () => {
        const highQualityMovie = {
          subjectId: '123',
          title: '高质量电影',
          directors: ['知名导演'],
          rating: { average: 8.5, numRaters: 1000 },
          summary: '详细的电影简介',
          cast: ['知名演员'],
          year: 2023,
          duration: '120分钟',
          countries: ['中国大陆'],
          languages: ['中文'],
          genres: ['剧情'],
          coverUrl: 'https://example.com/cover.jpg',
          writers: ['编剧'],
          userRating: 5,
          category: 'movies',
          userTags: ['推荐'],
          userStatus: 'collect',
          userComment: '很好看',
          readDate: new Date(),
          doubanUrl: 'https://movie.douban.com/subject/123/',
          originalTitle: 'High Quality Movie',
          imdbId: 'tt1234567',
        };

        const score = assessMovieDataQuality(highQualityMovie);
        expect(score).toBeGreaterThan(50);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should weight core fields appropriately', () => {
        const coreFieldsMovie = {
          subjectId: '123', // weight 15
          title: '测试电影', // weight 15
          directors: ['导演'], // weight 12
          rating: { average: 8.0, numRaters: 100 }, // weight 10
          category: 'movies',
          doubanUrl: 'https://movie.douban.com/subject/123/',
          genres: ['剧情'],
        };

        const score = assessMovieDataQuality(coreFieldsMovie);
        expect(score).toBeGreaterThanOrEqual(40); // At least core fields weight
      });

      it('should handle different content types (movie/TV/documentary)', () => {
        const movieData = {
          subjectId: '123',
          title: '电影',
          directors: ['导演'],
          duration: '120分钟', // movie field
          category: 'movies',
        };

        const tvData = {
          subjectId: '123',
          title: '电视剧',
          directors: ['导演'],
          episodeDuration: '45分钟', // TV field
          episodeCount: 24, // TV field
          category: 'tv',
        };

        const movieScore = assessMovieDataQuality(movieData);
        const tvScore = assessMovieDataQuality(tvData);

        expect(movieScore).toBeGreaterThan(0);
        expect(tvScore).toBeGreaterThan(0);
      });

      it('should handle TV-specific fields', () => {
        const tvWithSpecificFields = {
          subjectId: '123',
          title: '电视剧',
          directors: ['导演'],
          episodeDuration: '45分钟',
          episodeCount: 24,
          firstAirDate: '2023-01-01',
        };

        const score = assessMovieDataQuality(tvWithSpecificFields);
        expect(score).toBeGreaterThan(0);
      });

      it('should cap score at 100', () => {
        // Create data with all possible weighted fields
        const perfectMovie = {
          subjectId: '123',
          title: '完美电影',
          directors: ['知名导演'],
          rating: { average: 9.5, numRaters: 100000 },
          summary: '非常详细的电影简介内容',
          cast: ['著名演员1', '著名演员2'],
          year: 2023,
          duration: '150分钟',
          countries: ['中国大陆', '美国'],
          languages: ['中文', '英语'],
          genres: ['剧情', '动作'],
          coverUrl: 'https://example.com/perfect-cover.jpg',
          writers: ['知名编剧'],
          userRating: 5,
          userTags: ['经典', '必看', '推荐'],
          userStatus: 'collect',
          category: 'movies',
          userComment: '非常好的电影',
          readDate: new Date(),
          doubanUrl: 'https://movie.douban.com/subject/123/',
          originalTitle: 'Perfect Movie',
          imdbId: 'tt1234567',
        };

        const score = assessMovieDataQuality(perfectMovie);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should handle missing fields gracefully', () => {
        const sparseMovie = {
          subjectId: '123',
          title: '简单电影',
          doubanUrl: 'https://movie.douban.com/subject/123/',
          category: 'movies',
        };

        const score = assessMovieDataQuality(sparseMovie);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThan(50);
      });
    });

    describe('isValidMovieComplete', () => {
      const validMovie = {
        subjectId: '1234567',
        category: 'movies' as const,
        title: '测试电影',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['剧情'],
      };

      it('should return true for valid movie data', () => {
        expect(isValidMovieComplete(validMovie)).toBe(true);
      });

      it('should return false for invalid movie data', () => {
        const invalidMovie = {
          ...validMovie,
          subjectId: '', // invalid
        };
        expect(isValidMovieComplete(invalidMovie)).toBe(false);
      });

      it('should act as proper type guard', () => {
        const data: unknown = validMovie;

        if (isValidMovieComplete(data)) {
          // TypeScript should recognize data as MovieComplete here
          expect(data.subjectId).toBe('1234567');
          expect(data.category).toBe('movies');
        } else {
          fail('Type guard should have returned true for valid data');
        }
      });

      it('should handle edge cases', () => {
        const edgeCases = [null, undefined, 'string', 123, [], {}];

        edgeCases.forEach((testCase) => {
          expect(isValidMovieComplete(testCase)).toBe(false);
        });
      });
    });

    describe('isValidTvSeriesComplete', () => {
      const validTvSeries = {
        subjectId: '1234567',
        category: 'tv' as const,
        title: '测试电视剧',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['剧情'],
      };

      it('should return true for valid TV series data', () => {
        expect(isValidTvSeriesComplete(validTvSeries)).toBe(true);
      });

      it('should return false for invalid TV series data', () => {
        const invalidTvSeries = {
          ...validTvSeries,
          category: 'movies', // wrong category
        };
        expect(isValidTvSeriesComplete(invalidTvSeries)).toBe(false);
      });

      it('should act as proper type guard', () => {
        const data: unknown = validTvSeries;

        if (isValidTvSeriesComplete(data)) {
          // TypeScript should recognize data as TvSeriesComplete here
          expect(data.subjectId).toBe('1234567');
          expect(data.category).toBe('tv');
        } else {
          fail('Type guard should have returned true for valid data');
        }
      });

      it('should handle edge cases', () => {
        const edgeCases = [null, undefined, 'string', 123, [], {}];

        edgeCases.forEach((testCase) => {
          expect(isValidTvSeriesComplete(testCase)).toBe(false);
        });
      });
    });

    describe('isValidDocumentaryComplete', () => {
      const validDocumentary = {
        subjectId: '1234567',
        category: 'documentary' as const,
        title: '测试纪录片',
        directors: ['测试导演'],
        doubanUrl: 'https://movie.douban.com/subject/1234567/',
        genres: ['纪录片'],
      };

      it('should return true for valid documentary data', () => {
        expect(isValidDocumentaryComplete(validDocumentary)).toBe(true);
      });

      it('should return false for invalid documentary data', () => {
        const invalidDocumentary = {
          ...validDocumentary,
          category: 'tv', // wrong category
        };
        expect(isValidDocumentaryComplete(invalidDocumentary)).toBe(false);
      });

      it('should act as proper type guard', () => {
        const data: unknown = validDocumentary;

        if (isValidDocumentaryComplete(data)) {
          // TypeScript should recognize data as DocumentaryComplete here
          expect(data.subjectId).toBe('1234567');
          expect(data.category).toBe('documentary');
        } else {
          fail('Type guard should have returned true for valid data');
        }
      });

      it('should handle edge cases', () => {
        const edgeCases = [null, undefined, 'string', 123, [], {}];

        edgeCases.forEach((testCase) => {
          expect(isValidDocumentaryComplete(testCase)).toBe(false);
        });
      });
    });
  });

  describe('Type Inference', () => {
    it('should export correct TypeScript types', () => {
      // Test that types are correctly inferred from schemas
      const subjectId: MovieSubjectId = '12345';
      const title: MovieTitle = { main: '测试电影', aka: [] };
      const rating: MovieRating = { average: 8.5, numRaters: 1000 };
      const directors: Directors = [{ name: '导演' }];
      const cast: Cast = [{ name: '演员' }];
      const writers: Writers = [{ name: '编剧' }];
      const duration: Duration = '120分钟';
      const countries: Countries = ['中国大陆'];
      const languages: Languages = ['中文'];
      const releaseDate: ReleaseDate = '2023-01-01';
      const genres: MovieGenres = ['剧情'];
      const imdbId: ImdbId = 'tt1234567';
      const userRating: MovieUserRating = 5;
      const userTags: MovieUserTags = ['标签'];
      const userStatus: MovieUserStatus = 'collect';
      const tvSpecificFields: TvSpecificFields = { episodeCount: 24 };

      const completeMovie: MovieComplete = {
        subjectId: '12345',
        userTags: [],
        category: 'movies',
        title: '测试电影',
        directors: ['导演'],
        doubanUrl: 'https://movie.douban.com/subject/12345/',
        genres: ['剧情'],
        cast: [],
        writers: [],
        countries: [],
        languages: [],
      };

      const tvSeries: TvSeriesComplete = {
        subjectId: '12345',
        userTags: [],
        category: 'tv',
        title: '测试电视剧',
        directors: ['导演'],
        doubanUrl: 'https://movie.douban.com/subject/12345/',
        genres: ['剧情'],
        cast: [],
        writers: [],
        countries: [],
        languages: [],
      };

      const documentary: DocumentaryComplete = {
        subjectId: '12345',
        userTags: [],
        category: 'documentary',
        title: '测试纪录片',
        directors: ['导演'],
        doubanUrl: 'https://movie.douban.com/subject/12345/',
        genres: ['纪录片'],
        cast: [],
        writers: [],
        countries: [],
        languages: [],
      };

      const fieldValidation: MovieFieldValidation = {
        field: 'title',
        isValid: true,
        value: 'test',
        errors: [],
        warnings: [],
      };

      // If types are correctly inferred, these assignments should not cause TypeScript errors
      expect(subjectId).toBeDefined();
      expect(title).toBeDefined();
      expect(rating).toBeDefined();
      expect(directors).toBeDefined();
      expect(cast).toBeDefined();
      expect(writers).toBeDefined();
      expect(duration).toBeDefined();
      expect(countries).toBeDefined();
      expect(languages).toBeDefined();
      expect(releaseDate).toBeDefined();
      expect(genres).toBeDefined();
      expect(imdbId).toBeDefined();
      expect(userRating).toBeDefined();
      expect(userTags).toBeDefined();
      expect(userStatus).toBeDefined();
      expect(tvSpecificFields).toBeDefined();
      expect(completeMovie).toBeDefined();
      expect(tvSeries).toBeDefined();
      expect(documentary).toBeDefined();
      expect(fieldValidation).toBeDefined();
    });

    it('should validate type consistency with schemas', () => {
      // Test that schemas accept the typed values
      expect(() =>
        MovieSubjectIdSchema.parse('12345' as MovieSubjectId),
      ).not.toThrow();
      expect(() =>
        MovieUserStatusSchema.parse('collect' as MovieUserStatus),
      ).not.toThrow();

      const movieData: MovieComplete = {
        subjectId: '12345',
        userTags: [],
        category: 'movies',
        title: '测试电影',
        directors: ['导演'],
        doubanUrl: 'https://movie.douban.com/subject/12345/',
        genres: ['剧情'],
        cast: [],
        writers: [],
        countries: [],
        languages: [],
      };

      expect(() => MovieCompleteSchema.parse(movieData)).not.toThrow();

      const validation: MovieFieldValidation = {
        field: 'title',
        isValid: true,
        value: 'test',
        errors: [],
        warnings: [],
      };

      expect(() => MovieFieldValidationSchema.parse(validation)).not.toThrow();
    });

    it('should ensure all exported types match schema inferences', () => {
      // This test ensures that manually defined types match Zod inferred types
      type InferredMovieSubjectId = z.infer<typeof MovieSubjectIdSchema>;
      type InferredMovieUserStatus = z.infer<typeof MovieUserStatusSchema>;
      type InferredMovieComplete = z.infer<typeof MovieCompleteSchema>;

      const subjectId: MovieSubjectId = '12345' as InferredMovieSubjectId;
      const userStatus: MovieUserStatus = 'collect' as InferredMovieUserStatus;
      const movieComplete: MovieComplete = {
        subjectId: '12345',
        userTags: [],
        category: 'movies',
        title: '测试',
        directors: ['导演'],
        doubanUrl: 'https://movie.douban.com/subject/12345/',
        genres: ['剧情'],
        cast: [],
        writers: [],
        countries: [],
        languages: [],
      } as InferredMovieComplete;

      expect(subjectId).toBe('12345');
      expect(userStatus).toBe('collect');
      expect(movieComplete.category).toBe('movies');
    });
  });
});
