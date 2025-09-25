/**
 * 豆瓣书籍字段专用Zod验证Schema
 *
 * 为豆瓣书籍的16个标准字段提供精确的验证和转换
 * 与飞书多维表格字段映射系统完全兼容
 *
 * 创建时间: 2025-09-08
 * 用途: 书籍数据的字段级验证和飞书同步准备
 */

import { z } from 'zod';

/**
 * 豆瓣书籍Subject ID Schema
 * 严格验证豆瓣书籍ID格式
 */
export const BookSubjectIdSchema = z
  .string()
  .regex(/^\d+$/, 'Subject ID必须是纯数字字符串')
  .min(1, 'Subject ID不能为空')
  .max(20, 'Subject ID长度不能超过20位');

/**
 * 豆瓣书籍标题Schema
 * 支持主标题和副标题
 */
export const BookTitleSchema = z.object({
  main: z.string().min(1, '书名不能为空').max(500, '书名长度不能超过500字符'),
  subtitle: z.string().max(300, '副标题长度不能超过300字符').optional(),
  original: z.string().max(500, '原作名长度不能超过500字符').optional(),
});

/**
 * 豆瓣评分Schema
 * 严格的评分格式验证
 */
export const BookRatingSchema = z.object({
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
 * 书籍作者Schema
 * 支持多作者，包含详细信息
 */
export const BookAuthorsSchema = z
  .array(
    z.object({
      name: z.string().min(1, '作者姓名不能为空'),
      originalName: z.string().optional(),
      role: z.enum(['author', 'co-author', 'editor']).default('author'),
      nationality: z.string().optional(),
    }),
  )
  .min(1, '书籍必须至少有一个作者');

/**
 * 书籍译者Schema
 */
export const BookTranslatorsSchema = z
  .array(
    z.object({
      name: z.string().min(1, '译者姓名不能为空'),
      originalName: z.string().optional(),
    }),
  )
  .default([]);

/**
 * 出版信息Schema
 */
export const BookPublishingSchema = z.object({
  publisher: z.string().max(200, '出版社名称长度不能超过200字符').optional(),
  publishDate: z
    .string()
    .regex(
      /^\d{4}(-\d{1,2}(-\d{1,2})?)?$/,
      '出版日期格式错误，应为YYYY或YYYY-MM或YYYY-MM-DD',
    )
    .optional(),
  edition: z.string().max(100, '版次信息长度不能超过100字符').optional(),
});

/**
 * 书籍物理信息Schema
 */
export const BookPhysicalSchema = z.object({
  pages: z
    .number()
    .int('页数必须是整数')
    .min(1, '页数必须大于0')
    .max(50000, '页数不能超过50000')
    .optional(),
  binding: z
    .enum([
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
    ])
    .optional(),
  price: z
    .string()
    .regex(/^[0-9.]+\s*[元USD$€£¥￥]?$/, '价格格式错误')
    .max(50, '价格字符串长度不能超过50')
    .optional(),
  isbn: z
    .string()
    .regex(/^(97[89])?\d{9}[\dX]$/, 'ISBN格式错误')
    .optional(),
});

/**
 * 书籍类型/分类Schema
 */
export const BookGenresSchema = z
  .array(z.string().min(1, '类型不能为空').max(50, '类型长度不能超过50字符'))
  .default([]);

/**
 * 书籍简介Schema
 */
export const BookSummarySchema = z
  .string()
  .max(10000, '内容简介长度不能超过10000字符')
  .optional();

/**
 * 用户评分Schema (1-5星)
 */
export const UserRatingSchema = z
  .number()
  .int('用户评分必须是整数')
  .min(1, '用户评分不能小于1星')
  .max(5, '用户评分不能大于5星')
  .optional();

/**
 * 用户标签Schema
 */
export const UserTagsSchema = z
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
 * 用户备注Schema
 */
export const UserCommentSchema = z
  .string()
  .max(5000, '我的备注长度不能超过5000字符')
  .optional();

/**
 * 用户状态Schema
 */
export const UserStatusSchema = z
  .enum(['wish', 'do', 'collect'])
  .describe('wish=想读, do=在读, collect=读过');

/**
 * 标记日期Schema
 */
export const MarkDateSchema = z.coerce
  .date()
  .refine((date) => date <= new Date(), {
    message: '标记日期不能是未来时间',
  })
  .optional();

/**
 * 封面图片URL Schema
 */
export const CoverImageSchema = z
  .string()
  .url('封面图片必须是有效的URL')
  .regex(/\.(jpg|jpeg|png|webp|gif)$/i, '封面图片必须是支持的图片格式')
  .optional();

/**
 * 豆瓣书籍完整16字段Schema
 * 标准字段映射：Subject ID、我的标签、我的状态、书名、副标题、
 * 豆瓣评分、作者、我的备注、内容简介、封面图、我的评分、
 * 原作名、译者、出版年份、出版社、标记日期
 */
export const BookCompleteSchema = z.object({
  // 1. Subject ID (豆瓣唯一标识)
  subjectId: BookSubjectIdSchema,

  // 2. 我的标签
  userTags: UserTagsSchema,

  // 3. 我的状态
  userStatus: UserStatusSchema.optional(),

  // 4. 书名
  title: z.string().min(1, '书名不能为空'),

  // 5. 副标题
  subtitle: z.string().optional(),

  // 6. 豆瓣评分
  rating: BookRatingSchema.optional(),

  // 7. 作者
  authors: z.array(z.string()).min(1, '书籍必须至少有一个作者'),

  // 8. 我的备注
  userComment: UserCommentSchema,

  // 9. 内容简介
  summary: BookSummarySchema,

  // 10. 封面图
  coverUrl: CoverImageSchema,

  // 11. 我的评分 (1-5星)
  userRating: UserRatingSchema,

  // 12. 原作名
  originalTitle: z.string().optional(),

  // 13. 译者
  translators: z.array(z.string()).default([]),

  // 14. 出版年份
  year: z.number().min(1000).max(2100).optional(),

  // 15. 出版社
  publisher: z.string().optional(),

  // 16. 标记日期
  readDate: MarkDateSchema,

  // 附加字段（不计入16字段，用于系统处理）
  doubanUrl: z.string().url('豆瓣URL必须是有效的URL'),
  category: z.literal('books'),
  genres: BookGenresSchema,

  // 扩展的出版信息
  publishDate: z.string().optional(),
  pages: z.number().min(1).optional(),
  price: z.string().optional(),
  binding: z.string().optional(),
  isbn: z.string().optional(),
});

/**
 * 书籍字段验证结果Schema
 */
export const BookFieldValidationSchema = z.object({
  field: z.string(),
  isValid: z.boolean(),
  value: z.unknown(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  suggestion: z.string().optional(),
});

/**
 * 书籍批量验证结果Schema
 */
export const BookBatchValidationSchema = z.object({
  isValid: z.boolean(),
  totalFields: z.number().min(16).max(16), // 严格16字段
  validFields: z.number().min(0).max(16),
  invalidFields: z.number().min(0).max(16),
  fieldResults: z.array(BookFieldValidationSchema),
  summary: z.object({
    criticalErrors: z.number().min(0),
    warnings: z.number().min(0),
    missingRequiredFields: z.array(z.string()).default([]),
    dataQualityScore: z.number().min(0).max(100), // 数据质量评分
  }),
});

// Schema已在上面直接导出，这里不需要重复导出

// 类型推断导出
export type BookSubjectId = z.infer<typeof BookSubjectIdSchema>;
export type BookTitle = z.infer<typeof BookTitleSchema>;
export type BookRating = z.infer<typeof BookRatingSchema>;
export type BookAuthors = z.infer<typeof BookAuthorsSchema>;
export type BookTranslators = z.infer<typeof BookTranslatorsSchema>;
export type BookPublishing = z.infer<typeof BookPublishingSchema>;
export type BookPhysical = z.infer<typeof BookPhysicalSchema>;
export type BookGenres = z.infer<typeof BookGenresSchema>;
export type BookSummary = z.infer<typeof BookSummarySchema>;
export type UserRating = z.infer<typeof UserRatingSchema>;
export type UserTags = z.infer<typeof UserTagsSchema>;
export type UserComment = z.infer<typeof UserCommentSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type MarkDate = z.infer<typeof MarkDateSchema>;
export type CoverImage = z.infer<typeof CoverImageSchema>;
export type BookComplete = z.infer<typeof BookCompleteSchema>;
export type BookFieldValidation = z.infer<typeof BookFieldValidationSchema>;
export type BookBatchValidation = z.infer<typeof BookBatchValidationSchema>;

/**
 * 验证完整书籍数据的工具函数，支持16个标准字段的完整验证
 *
 * @description 对输入的未知数据进行完整的书籍数据验证，确保符合豆瓣书籍16字段标准格式
 * @param data - 待验证的数据，可以是任意类型的未知数据
 * @returns 返回包含验证结果的对象，成功时包含验证后的数据，失败时包含错误信息
 * @throws 内部捕获所有异常，不会向外抛出异常，而是通过返回值的error字段传递错误信息
 *
 * @example
 * ```typescript
 * const bookData = { subjectId: '123', title: '测试书籍', authors: ['作者'], doubanUrl: 'https://book.douban.com/subject/123/', category: 'books' };
 * const result = validateBookComplete(bookData);
 * if (result.success) {
 *   console.log('验证成功:', result.data);
 * } else {
 *   console.error('验证失败:', result.error);
 * }
 * ```
 */
export function validateBookComplete(
  data: unknown,
): { success: true; data: BookComplete } | { success: false; error: string } {
  try {
    const validatedData = BookCompleteSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `书籍数据验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证单个书籍字段的工具函数，支持书籍所有字段的独立验证
 *
 * @description 对书籍的单个字段进行精确验证，返回详细的验证结果包含字段名、验证状态、错误信息等
 * @param fieldName - 要验证的字段名，必须是BookComplete类型的有效字段名
 * @param value - 字段的值，可以是任意类型的数据
 * @returns 返回包含字段验证结果的详细信息对象，包括验证状态、错误信息、警告信息等
 * @throws 内部捕获所有验证异常，通过返回值的errors数组传递错误信息，不会向外抛出异常
 *
 * @example
 * ```typescript
 * // 验证书名字段
 * const result = validateBookField('title', '哈利·波特与魔法石');
 * if (result.isValid) {
 *   console.log('字段验证通过');
 * } else {
 *   console.error('验证失败:', result.errors);
 * }
 *
 * // 验证用户评分字段
 * const ratingResult = validateBookField('userRating', 6); // 超出范围
 * console.log(ratingResult.errors); // ['用户评分不能大于5星']
 * ```
 */
export function validateBookField(
  fieldName: keyof BookComplete,
  value: unknown,
): BookFieldValidation {
  // 完整的字段Schema映射，与BookCompleteSchema保持一致
  const fieldSchemas: Record<keyof BookComplete, z.ZodTypeAny> = {
    subjectId: BookSubjectIdSchema,
    userTags: UserTagsSchema,
    userStatus: UserStatusSchema.optional(),
    title: z.string().min(1, '书名不能为空'),
    subtitle: z.string().optional(),
    rating: BookRatingSchema.optional(),
    authors: z.array(z.string()).min(1, '书籍必须至少有一个作者'),
    userComment: UserCommentSchema,
    summary: BookSummarySchema,
    coverUrl: CoverImageSchema,
    userRating: UserRatingSchema,
    originalTitle: z.string().optional(),
    translators: z.array(z.string()).default([]),
    year: z.number().min(1000).max(2100).optional(),
    publisher: z.string().optional(),
    readDate: MarkDateSchema,
    doubanUrl: z.string().url().optional(),
    category: z.literal('books'),
    genres: BookGenresSchema,
    publishDate: z.string().optional(),
    pages: z.number().min(1).optional(),
    price: z.string().optional(),
    binding: z.string().optional(),
    isbn: z.string().optional(),
  } as const;

  const schema = fieldSchemas[fieldName];
  // 由于完整映射，schema永远不会是undefined，但保持防御性编程
  if (!schema) {
    return {
      field: fieldName,
      isValid: false,
      value,
      errors: ['不支持的字段验证'],
      warnings: [],
    };
  }

  try {
    schema.parse(value);
    return {
      field: fieldName,
      isValid: true,
      value,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        field: fieldName,
        isValid: false,
        value,
        errors: error.issues.map((i) => i.message),
        warnings: [],
      };
    }
    return {
      field: fieldName,
      isValid: false,
      value,
      errors: ['未知验证错误'],
      warnings: [],
    };
  }
}

/**
 * 评估书籍数据质量的量化分析函数，基于字段完整性和重要性进行评分
 *
 * @description 根据书籍数据的完整性和字段重要性权重计算质量评分(0-100分)，核心字段权重更高
 * @param data - 待评估的书籍数据，可以是任意类型的未知数据
 * @returns 返回0-100的质量评分，0表示数据无效或质量极低，100表示数据完整且高质量
 * @throws 内部处理所有异常情况，对于无效数据返回0分，不会向外抛出异常
 *
 * @example
 * ```typescript
 * // 评估完整的高质量数据
 * const completeBook = {
 *   subjectId: '123',
 *   title: '哈利·波特与魔法石',
 *   authors: ['J.K.罗琳'],
 *   rating: { average: 8.5, numRaters: 1000 },
 *   summary: '详细的书籍简介...',
 *   coverUrl: 'https://example.com/cover.jpg',
 *   // ... 更多字段
 * };
 * const score = assessBookDataQuality(completeBook); // 可能返回85-100分
 *
 * // 评估最基础的数据
 * const basicBook = { subjectId: '123' };
 * const basicScore = assessBookDataQuality(basicBook); // 返回较低分数
 * ```
 */
export function assessBookDataQuality(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;

  // 使用类型守卫进行类型收窄，确保类型安全
  if (!isValidBookComplete(data)) return 0;

  const book = data;
  let score = 0;
  const maxScore = 100;

  // 核心字段权重分配 - 使用严格类型定义确保类型安全
  const fieldWeights: Partial<Record<keyof BookComplete, number>> = {
    subjectId: 15, // 最重要，必需字段
    title: 15, // 书名，必需
    authors: 10, // 作者，重要
    rating: 8, // 豆瓣评分
    summary: 8, // 简介
    coverUrl: 5, // 封面
    year: 5, // 年份
    publisher: 5, // 出版社
    userRating: 5, // 用户评分
    userTags: 5, // 用户标签
    translators: 2, // 译者
  } as const;

  // 使用类型安全的方式遍历字段权重
  for (const [field, weight] of Object.entries(fieldWeights) as Array<
    [keyof BookComplete, number]
  >) {
    const value = book[field];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        score += weight;
      } else if (typeof value === 'string' && value.trim().length > 0) {
        score += weight;
      } else if (typeof value === 'number' && value > 0) {
        score += weight;
      } else if (typeof value === 'object') {
        score += weight;
      }
    }
  }

  return Math.min(score, maxScore);
}

/**
 * 类型守卫函数，检查输入数据是否为有效的完整书籍数据格式
 *
 * @description 作为TypeScript类型守卫，验证未知数据是否符合BookComplete接口规范，用于类型收窄和运行时类型检查
 * @param value - 待检查的数据，可以是任意类型的未知数据
 * @returns 返回布尔值，true表示数据符合BookComplete格式，false表示数据格式不正确
 * @throws 内部捕获所有验证异常，对于验证失败的情况返回false，不会向外抛出异常
 *
 * @example
 * ```typescript
 * // 类型守卫用法
 * function processBookData(data: unknown) {
 *   if (isValidBookComplete(data)) {
 *     // 在此作用域内，TypeScript知道data是BookComplete类型
 *     console.log('书籍ID:', data.subjectId);
 *     console.log('书名:', data.title);
 *     // 可以安全访问BookComplete的所有属性
 *   } else {
 *     console.error('数据格式不正确');
 *   }
 * }
 *
 * // 检查外部API数据
 * const apiData = await fetchBookFromAPI();
 * if (isValidBookComplete(apiData)) {
 *   saveToDatabase(apiData); // 类型安全
 * }
 * ```
 */
export function isValidBookComplete(value: unknown): value is BookComplete {
  try {
    BookCompleteSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}
