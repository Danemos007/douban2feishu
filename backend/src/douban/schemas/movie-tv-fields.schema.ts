/**
 * 豆瓣电影/电视剧/纪录片字段专用Zod验证Schema
 *
 * 为豆瓣影视类内容的标准字段提供精确的验证和转换
 * 支持：电影(18字段)、电视剧(19字段)、纪录片(19字段)
 * 与飞书多维表格字段映射系统完全兼容
 *
 * 创建时间: 2025-09-08
 * 用途: 影视数据的字段级验证和飞书同步准备
 */

import { z } from 'zod';

/**
 * 豆瓣影视Subject ID Schema
 * 严格验证豆瓣影视ID格式
 */
export const MovieSubjectIdSchema = z
  .string()
  .regex(/^\d+$/, 'Subject ID必须是纯数字字符串')
  .min(1, 'Subject ID不能为空')
  .max(20, 'Subject ID长度不能超过20位');

/**
 * 影视标题Schema
 * 支持主标题和原标题
 */
export const MovieTitleSchema = z.object({
  main: z
    .string()
    .min(1, '影片名称不能为空')
    .max(500, '影片名称长度不能超过500字符'),
  original: z.string().max(500, '原标题长度不能超过500字符').optional(),
  aka: z.array(z.string()).default([]), // 又名
});

/**
 * 豆瓣评分Schema (影视通用)
 */
export const MovieRatingSchema = z.object({
  average: z
    .number()
    .min(0, '豆瓣评分不能小于0')
    .max(10, '豆瓣评分不能大于10')
    .multipleOf(0.1, '豆瓣评分精度为0.1'),
  numRaters: z.number().min(0, '评分人数不能为负数').int('评分人数必须是整数'),
  stars: z
    .string()
    .regex(/^[0-5]\.0$/, '星级评分格式错误，应为0.0-5.0')
    .optional(),
});

/**
 * 导演Schema
 */
export const DirectorsSchema = z
  .array(
    z.object({
      name: z.string().min(1, '导演姓名不能为空'),
      originalName: z.string().optional(),
      nationality: z.string().optional(),
    }),
  )
  .min(1, '影视作品必须至少有一个导演');

/**
 * 演员Schema
 */
export const CastSchema = z
  .array(
    z.object({
      name: z.string().min(1, '演员姓名不能为空'),
      originalName: z.string().optional(),
      role: z.string().optional(), // 角色名
      nationality: z.string().optional(),
    }),
  )
  .default([]);

/**
 * 编剧Schema
 */
export const WritersSchema = z
  .array(
    z.object({
      name: z.string().min(1, '编剧姓名不能为空'),
      originalName: z.string().optional(),
    }),
  )
  .default([]);

/**
 * 时长Schema
 * 支持多种时长格式：分钟、小时分钟、多种格式混合
 */
export const DurationSchema = z
  .string()
  .regex(
    /^(\d+分钟?|\d+小时\d*分?|\d+:\d+|\d+分\d+秒)$/,
    '时长格式错误，支持格式：90分钟、1小时30分、90:00、6分03秒',
  )
  .optional();

/**
 * 制片地区Schema
 */
export const CountriesSchema = z
  .array(
    z.string().min(1, '制片地区不能为空').max(50, '制片地区长度不能超过50字符'),
  )
  .default([]);

/**
 * 语言Schema
 */
export const LanguagesSchema = z
  .array(z.string().min(1, '语言不能为空').max(30, '语言长度不能超过30字符'))
  .default([]);

/**
 * 发行/上映日期Schema
 * 支持多种日期格式
 */
export const ReleaseDateSchema = z
  .string()
  .regex(
    /^\d{4}(-\d{1,2}(-\d{1,2})?)?(\(.+\))?$/,
    '日期格式错误，支持：2023、2023-01、2023-01-01、2023-01-01(中国大陆)',
  )
  .optional();

/**
 * 影视类型/分类Schema
 */
export const MovieGenresSchema = z
  .array(z.string().min(1, '类型不能为空').max(20, '类型长度不能超过20字符'))
  .min(1, '影视作品必须至少有一个类型');

/**
 * IMDB ID Schema
 */
export const ImdbIdSchema = z
  .string()
  .regex(/^tt\d{7,}$/, 'IMDB ID格式错误，应为tt开头加数字')
  .optional();

/**
 * 用户评分Schema (1-5星，影视通用)
 */
export const MovieUserRatingSchema = z
  .number()
  .int('用户评分必须是整数')
  .min(1, '用户评分不能小于1星')
  .max(5, '用户评分不能大于5星')
  .optional();

/**
 * 用户标签Schema (影视通用)
 */
export const MovieUserTagsSchema = z
  .array(
    z
      .string()
      .min(1, '标签不能为空')
      .max(50, '单个标签长度不能超过50字符')
      .regex(/^[^,，;；|｜]+$/, '标签不能包含逗号、分号或竖线'),
  )
  .max(50, '标签数量不能超过50个')
  .default([]);

/**
 * 用户状态Schema (影视通用)
 */
export const MovieUserStatusSchema = z
  .enum(['wish', 'do', 'collect'])
  .describe('wish=想看, do=在看, collect=看过');

/**
 * 电视剧/纪录片特有字段Schema
 */
export const TvSpecificFieldsSchema = z.object({
  // 集数 (第19个字段，区别于电影)
  episodeCount: z
    .number()
    .int('集数必须是整数')
    .min(1, '集数必须大于0')
    .max(10000, '集数不能超过10000')
    .optional(),

  // 单集片长 (区别于电影的总片长)
  episodeDuration: DurationSchema,

  // 首播日期 (区别于电影的上映日期)
  firstAirDate: ReleaseDateSchema,

  // 电视台/网络平台
  network: z.string().max(100, '播出平台长度不能超过100字符').optional(),

  // 播出状态
  status: z.enum(['ended', 'ongoing', 'upcoming']).optional(),
});

/**
 * 豆瓣电影完整18字段Schema
 * 标准字段：Subject ID、我的标签、我的状态、类型、电影名、封面图、
 * 豆瓣评分、我的备注、片长、上映日期、剧情简介、主演、导演、编剧、
 * 制片地区、语言、我的评分、标记日期
 */
export const MovieCompleteSchema = z.object({
  // 1. Subject ID
  subjectId: MovieSubjectIdSchema,

  // 2. 我的标签
  userTags: MovieUserTagsSchema,

  // 3. 我的状态
  userStatus: MovieUserStatusSchema.optional(),

  // 4. 类型 (固定为movie)
  category: z.literal('movies'),

  // 5. 电影名
  title: z.string().min(1, '电影名不能为空'),

  // 6. 封面图
  coverUrl: z.string().url('封面图片必须是有效的URL').optional(),

  // 7. 豆瓣评分
  rating: MovieRatingSchema.optional(),

  // 8. 我的备注
  userComment: z.string().max(5000, '我的备注长度不能超过5000字符').optional(),

  // 9. 片长
  duration: DurationSchema,

  // 10. 上映日期
  releaseDate: ReleaseDateSchema,

  // 11. 剧情简介
  summary: z.string().max(10000, '剧情简介长度不能超过10000字符').optional(),

  // 12. 主演
  cast: z.array(z.string()).default([]),

  // 13. 导演
  directors: z.array(z.string()).min(1, '电影必须至少有一个导演'),

  // 14. 编剧
  writers: z.array(z.string()).default([]),

  // 15. 制片地区
  countries: CountriesSchema,

  // 16. 语言
  languages: LanguagesSchema,

  // 17. 我的评分
  userRating: MovieUserRatingSchema,

  // 18. 标记日期
  readDate: z.coerce.date().optional(),

  // 附加字段（系统处理用）
  doubanUrl: z.string().url('豆瓣URL必须是有效的URL'),
  originalTitle: z.string().optional(),
  year: z.number().min(1800).max(2100).optional(),
  genres: MovieGenresSchema,
  imdbId: ImdbIdSchema,
});

/**
 * 豆瓣电视剧完整19字段Schema
 * 比电影多1个字段：集数
 */
export const TvSeriesCompleteSchema = z.object({
  // 1. Subject ID
  subjectId: MovieSubjectIdSchema,

  // 2. 我的标签
  userTags: MovieUserTagsSchema,

  // 3. 我的状态
  userStatus: MovieUserStatusSchema.optional(),

  // 4. 类型 (固定为tv)
  category: z.literal('tv'),

  // 5. 片名
  title: z.string().min(1, '片名不能为空'),

  // 6. 封面图
  coverUrl: z.string().url('封面图片必须是有效的URL').optional(),

  // 7. 豆瓣评分
  rating: MovieRatingSchema.optional(),

  // 8. 单集片长
  episodeDuration: DurationSchema,

  // 9. 集数 (第19个字段)
  episodeCount: z.number().int().min(1).optional(),

  // 10. 首播日期
  firstAirDate: ReleaseDateSchema,

  // 11. 剧情简介
  summary: z.string().max(10000, '剧情简介长度不能超过10000字符').optional(),

  // 12. 我的备注
  userComment: z.string().max(5000, '我的备注长度不能超过5000字符').optional(),

  // 13. 主演
  cast: z.array(z.string()).default([]),

  // 14. 导演
  directors: z.array(z.string()).min(1, '电视剧必须至少有一个导演'),

  // 15. 编剧
  writers: z.array(z.string()).default([]),

  // 16. 制片地区
  countries: CountriesSchema,

  // 17. 语言
  languages: LanguagesSchema,

  // 18. 我的评分
  userRating: MovieUserRatingSchema,

  // 19. 标记日期
  readDate: z.coerce.date().optional(),

  // 附加字段（系统处理用）
  doubanUrl: z.string().url('豆瓣URL必须是有效的URL'),
  originalTitle: z.string().optional(),
  year: z.number().min(1800).max(2100).optional(),
  genres: MovieGenresSchema,
  imdbId: ImdbIdSchema,
});

/**
 * 豆瓣纪录片完整19字段Schema
 * 与电视剧结构相同，但类型不同
 */
export const DocumentaryCompleteSchema = TvSeriesCompleteSchema.extend({
  // 4. 类型 (固定为documentary)
  category: z.literal('documentary'),
});

/**
 * 影视字段验证结果Schema
 */
export const MovieFieldValidationSchema = z.object({
  field: z.string(),
  isValid: z.boolean(),
  value: z.unknown(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  suggestion: z.string().optional(),
});

// Schema已在上面直接导出，这里不需要重复导出

// 类型推断导出
export type MovieSubjectId = z.infer<typeof MovieSubjectIdSchema>;
export type MovieTitle = z.infer<typeof MovieTitleSchema>;
export type MovieRating = z.infer<typeof MovieRatingSchema>;
export type Directors = z.infer<typeof DirectorsSchema>;
export type Cast = z.infer<typeof CastSchema>;
export type Writers = z.infer<typeof WritersSchema>;
export type Duration = z.infer<typeof DurationSchema>;
export type Countries = z.infer<typeof CountriesSchema>;
export type Languages = z.infer<typeof LanguagesSchema>;
export type ReleaseDate = z.infer<typeof ReleaseDateSchema>;
export type MovieGenres = z.infer<typeof MovieGenresSchema>;
export type ImdbId = z.infer<typeof ImdbIdSchema>;
export type MovieUserRating = z.infer<typeof MovieUserRatingSchema>;
export type MovieUserTags = z.infer<typeof MovieUserTagsSchema>;
export type MovieUserStatus = z.infer<typeof MovieUserStatusSchema>;
export type TvSpecificFields = z.infer<typeof TvSpecificFieldsSchema>;
export type MovieComplete = z.infer<typeof MovieCompleteSchema>;
export type TvSeriesComplete = z.infer<typeof TvSeriesCompleteSchema>;
export type DocumentaryComplete = z.infer<typeof DocumentaryCompleteSchema>;
export type MovieFieldValidation = z.infer<typeof MovieFieldValidationSchema>;

/**
 * 验证工具函数：验证完整电影数据
 */
export function validateMovieComplete(
  data: unknown,
): { success: true; data: MovieComplete } | { success: false; error: string } {
  try {
    const validatedData = MovieCompleteSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `电影数据验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证完整电视剧数据
 */
export function validateTvSeriesComplete(
  data: unknown,
):
  | { success: true; data: TvSeriesComplete }
  | { success: false; error: string } {
  try {
    const validatedData = TvSeriesCompleteSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `电视剧数据验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证完整纪录片数据
 */
export function validateDocumentaryComplete(
  data: unknown,
):
  | { success: true; data: DocumentaryComplete }
  | { success: false; error: string } {
  try {
    const validatedData = DocumentaryCompleteSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `纪录片数据验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 智能类型推断：根据genres判断是否为纪录片
 */
export function isDocumentaryByGenres(genres: string[]): boolean {
  if (!Array.isArray(genres)) return false;
  return genres.some((genre) => genre.includes('纪录片'));
}

/**
 * 数据质量评估函数：影视内容（电影/电视剧/纪录片）
 * 使用类型安全的方式评估数据完整性和质量
 */
export function assessMovieDataQuality(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;

  // 类型安全的数据访问：使用Record类型进行安全的属性访问
  const movieData = data as Record<string, unknown>;
  let score = 0;
  const maxScore = 100;

  // 影视字段权重分配 - 支持电影/电视剧/纪录片的不同字段结构
  const fieldWeights: Record<string, number> = {
    subjectId: 15, // 最重要
    title: 15, // 片名
    directors: 12, // 导演
    rating: 10, // 豆瓣评分
    summary: 8, // 简介
    cast: 8, // 主演
    year: 5, // 年份
    duration: 5, // 片长 (电影)
    episodeDuration: 5, // 单集片长 (电视剧/纪录片)
    countries: 5, // 制片地区
    languages: 3, // 语言
    genres: 5, // 类型
    coverUrl: 4, // 封面
    writers: 3, // 编剧
    userRating: 2, // 用户评分
    // 共同字段
    userTags: 2,
    userStatus: 2,
    category: 2,
    userComment: 2,
    readDate: 2,
    doubanUrl: 2,
    originalTitle: 1,
    imdbId: 1,
    // 电视剧特有字段
    episodeCount: 3,
    firstAirDate: 3,
    releaseDate: 3,
  };

  // 类型安全的字段访问和评分
  for (const [field, weight] of Object.entries(fieldWeights)) {
    const value = movieData[field];
    if (isValidFieldValue(value)) {
      score += weight;
    }
  }

  return Math.min(score, maxScore);
}

/**
 * 字段值有效性检查 - 类型安全的字段值验证
 */
function isValidFieldValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'object') {
    return true;
  }

  return false;
}

/**
 * 类型守卫函数
 */
export function isValidMovieComplete(value: unknown): value is MovieComplete {
  try {
    MovieCompleteSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidTvSeriesComplete(
  value: unknown,
): value is TvSeriesComplete {
  try {
    TvSeriesCompleteSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidDocumentaryComplete(
  value: unknown,
): value is DocumentaryComplete {
  try {
    DocumentaryCompleteSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}
