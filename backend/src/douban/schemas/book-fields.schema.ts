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
export const BookSubjectIdSchema = z.string()
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
  average: z.number()
    .min(0, '豆瓣评分不能小于0')
    .max(10, '豆瓣评分不能大于10')
    .multipleOf(0.1, '豆瓣评分精度为0.1'),
  numRaters: z.number()
    .min(0, '评分人数不能为负数')
    .int('评分人数必须是整数'),
  stars: z.string()
    .regex(/^[0-5]\.0$/, '星级评分格式错误，应为0.0-5.0')
    .optional(),
});

/**
 * 书籍作者Schema
 * 支持多作者，包含详细信息
 */
export const BookAuthorsSchema = z.array(
  z.object({
    name: z.string().min(1, '作者姓名不能为空'),
    originalName: z.string().optional(),
    role: z.enum(['author', 'co-author', 'editor']).default('author'),
    nationality: z.string().optional(),
  })
).min(1, '书籍必须至少有一个作者');

/**
 * 书籍译者Schema
 */
export const BookTranslatorsSchema = z.array(
  z.object({
    name: z.string().min(1, '译者姓名不能为空'),
    originalName: z.string().optional(),
  })
).default([]);

/**
 * 出版信息Schema
 */
export const BookPublishingSchema = z.object({
  publisher: z.string().max(200, '出版社名称长度不能超过200字符').optional(),
  publishDate: z.string()
    .regex(/^\d{4}(-\d{1,2}(-\d{1,2})?)?$/, '出版日期格式错误，应为YYYY或YYYY-MM或YYYY-MM-DD')
    .optional(),
  edition: z.string().max(100, '版次信息长度不能超过100字符').optional(),
});

/**
 * 书籍物理信息Schema
 */
export const BookPhysicalSchema = z.object({
  pages: z.number()
    .int('页数必须是整数')
    .min(1, '页数必须大于0')
    .max(50000, '页数不能超过50000')
    .optional(),
  binding: z.enum([
    '平装', '精装', '简装', '袋装', '硬壳精装', '软精装', 
    '毛边本', '线装', '骑马钉', 'kindle版', 'epub', 'pdf', '其他'
  ]).optional(),
  price: z.string()
    .regex(/^[0-9.]+\s*[元USD$€£¥￥]?$/, '价格格式错误')
    .max(50, '价格字符串长度不能超过50')
    .optional(),
  isbn: z.string()
    .regex(/^(97[89])?\d{9}[\dX]$/, 'ISBN格式错误')
    .optional(),
});

/**
 * 书籍类型/分类Schema
 */
export const BookGenresSchema = z.array(
  z.string().min(1, '类型不能为空').max(50, '类型长度不能超过50字符')
).default([]);

/**
 * 书籍简介Schema
 */
export const BookSummarySchema = z.string()
  .max(10000, '内容简介长度不能超过10000字符')
  .optional();

/**
 * 用户评分Schema (1-5星)
 */
export const UserRatingSchema = z.number()
  .int('用户评分必须是整数')
  .min(1, '用户评分不能小于1星')
  .max(5, '用户评分不能大于5星')
  .optional();

/**
 * 用户标签Schema
 */
export const UserTagsSchema = z.array(
  z.string()
    .min(1, '标签不能为空')
    .max(50, '单个标签长度不能超过50字符')
    .regex(/^[^,，;；|｜]+$/, '标签不能包含逗号、分号或竖线')
).max(50, '标签数量不能超过50个')
.default([]);

/**
 * 用户备注Schema
 */
export const UserCommentSchema = z.string()
  .max(5000, '我的备注长度不能超过5000字符')
  .optional();

/**
 * 用户状态Schema
 */
export const UserStatusSchema = z.enum(['wish', 'do', 'collect'])
  .describe('wish=想读, do=在读, collect=读过');

/**
 * 标记日期Schema
 */
export const MarkDateSchema = z.coerce.date()
  .refine((date) => date <= new Date(), {
    message: '标记日期不能是未来时间'
  })
  .optional();

/**
 * 封面图片URL Schema
 */
export const CoverImageSchema = z.string()
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
 * 验证工具函数：验证完整书籍数据
 */
export function validateBookComplete(
  data: unknown
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
 * 验证工具函数：验证单个书籍字段
 */
export function validateBookField(
  fieldName: keyof BookComplete,
  value: unknown
): BookFieldValidation {
  const fieldSchemas = {
    subjectId: BookSubjectIdSchema,
    title: z.string().min(1),
    authors: z.array(z.string()).min(1),
    userTags: UserTagsSchema,
    userRating: UserRatingSchema,
    rating: BookRatingSchema,
    // ... 可以继续添加其他字段
  };

  const schema = fieldSchemas[fieldName];
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
        errors: error.issues.map(i => i.message),
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
 * 数据质量评估函数
 */
export function assessBookDataQuality(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  
  const book = data as any;
  let score = 0;
  const maxScore = 100;
  
  // 核心字段权重分配
  const fieldWeights = {
    subjectId: 15, // 最重要，必需字段
    title: 15,     // 书名，必需
    authors: 10,   // 作者，重要
    rating: 8,     // 豆瓣评分
    summary: 8,    // 简介
    coverUrl: 5,   // 封面
    year: 5,       // 年份
    publisher: 5,  // 出版社
    userRating: 5, // 用户评分
    userTags: 5,   // 用户标签
    genres: 5,     // 分类
    pages: 3,      // 页数
    isbn: 3,       // ISBN
    translators: 2, // 译者
    binding: 2,    // 装帧
    price: 2,      // 价格
  };
  
  for (const [field, weight] of Object.entries(fieldWeights)) {
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
 * 类型守卫：检查是否为完整的书籍数据
 */
export function isValidBookComplete(value: unknown): value is BookComplete {
  try {
    BookCompleteSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}