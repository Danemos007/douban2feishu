/**
 * 字段映射配置的Zod验证Schema
 *
 * 为douban-field-mapping-verified.config.ts提供运行时类型安全保障
 * 基于"宽进严出" + "类型唯一性"原则设计
 *
 * 创建时间: 2025-09-03
 * 用途: 验证从历史文件抢救的字段映射配置正确性
 */

import { z } from 'zod';

/**
 * 支持的豆瓣数据类型
 */
export const DoubanDataTypeSchema = z.enum([
  'books',
  'movies',
  'tv',
  'documentary',
]);

/**
 * 字段类型枚举验证
 */
export const FieldTypeSchema = z.enum([
  'text',
  'number',
  'rating',
  'singleSelect',
  'multiSelect',
  'datetime',
  'checkbox',
  'url',
]);

/**
 * 验证来源文件Schema
 * 基于我们已知的历史文件进行严格验证
 */
export const VerifiedSourceSchema = z
  .array(
    z.enum([
      'sync-all-movies-fixed.ts',
      'sync-movie-from-cache.ts',
      'sync-from-cache.ts',
      'real-douban-data-sync.ts',
    ]),
  )
  .min(1);

/**
 * 嵌套路径验证Schema
 * 验证类似 'rating.average' 这样的嵌套属性路径
 */
export const NestedPathSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/, {
    message: '嵌套路径格式无效，应类似 "rating.average"',
  });

/**
 * 字段映射配置Schema - 增强版
 * 对应 VerifiedFieldMappingConfig 接口
 */
export const VerifiedFieldMappingConfigSchema = z
  .object({
    /** 豆瓣字段名：严格验证 */
    doubanFieldName: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z][a-zA-Z0-9]*$/),

    /** 飞书表格中文字段名：严格验证 */
    chineseName: z.string().min(1).max(50),

    /** API字段名：与中文名一致性验证 */
    apiFieldName: z.string().min(1),

    /** 字段类型：枚举验证 */
    fieldType: FieldTypeSchema,

    /** 必需字段：布尔验证 */
    required: z.boolean(),

    /** 字段描述：内容验证 */
    description: z.string().min(5).max(200),

    /** 验证状态：必须为true表示已验证 */
    verified: z.literal(true),

    /** 嵌套属性路径：可选但格式严格 */
    nestedPath: NestedPathSchema.optional(),

    /** 处理说明：可选 */
    processingNotes: z.string().optional(),
  })
  .refine(
    // 自定义验证：确保API字段名与中文名一致
    (data) => data.apiFieldName === data.chineseName,
    {
      message: 'API字段名必须与中文字段名一致',
      path: ['apiFieldName'],
    },
  );

/**
 * 字段映射配置集合Schema
 * 验证整个数据类型的字段映射配置
 */
export const FieldMappingCollectionSchema = z
  .record(
    z.string().min(1), // key: 豆瓣字段名
    VerifiedFieldMappingConfigSchema, // value: 配置对象
  )
  .refine(
    // 自定义验证：确保key与doubanFieldName一致
    (data) => {
      const inconsistent = Object.entries(data).find(
        ([key, config]) => key !== config.doubanFieldName,
      );
      return !inconsistent;
    },
    {
      message: '字段名key必须与config.doubanFieldName一致',
    },
  );

/**
 * 完整验证配置Schema
 * 验证整个 VERIFIED_FIELD_MAPPINGS 结构
 */
export const VerifiedFieldMappingsSchema = z
  .object({
    books: FieldMappingCollectionSchema,
    movies: FieldMappingCollectionSchema,
    tv: FieldMappingCollectionSchema,
    documentary: FieldMappingCollectionSchema,
  })
  .refine(
    // 自定义验证：确保每种类型都有必需的字段
    (data) => {
      const requiredFields = ['subjectId', 'title'];

      for (const [_dataType, mapping] of Object.entries(data)) {
        for (const requiredField of requiredFields) {
          if (!mapping[requiredField] || !mapping[requiredField].required) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: '每种数据类型都必须包含subjectId和title作为必需字段',
    },
  );

/**
 * 验证统计Schema
 * 用于验证getVerificationStats()的返回值
 */
export const VerificationStatsSchema = z
  .object({
    totalBooks: z.number().min(0, '书籍字段数量不能为负数'),
    totalMovies: z.number().min(0, '电影字段数量不能为负数'),
    totalVerified: z.number().min(0, '验证字段数量不能为负数'),
    sourceCoverage: z.record(
      z.string().min(1, '来源文件名不能为空'),
      z.number().min(0, '覆盖数量不能为负数'),
    ),
  })
  .refine(
    // 自定义验证：确保统计数据的合理性
    (data) => {
      return data.totalVerified <= data.totalBooks + data.totalMovies;
    },
    {
      message: '验证字段数量不能超过总字段数量',
    },
  );

/**
 * 字段映射查询参数Schema
 * 用于验证getVerifiedFieldMapping等函数的参数
 */
export const FieldMappingQuerySchema = z.object({
  dataType: DoubanDataTypeSchema,
  fieldName: z.string().min(1, '字段名不能为空').optional(),
  onlyRequired: z.boolean().default(false),
  onlyVerified: z.boolean().default(true),
});

/**
 * 字段映射转换结果Schema
 * 用于验证字段名转换函数的返回值
 */
export const FieldMappingTransformResultSchema = z
  .object({
    success: z.boolean(),
    result: z.string().optional(),
    error: z.string().optional(),
    metadata: z
      .object({
        dataType: DoubanDataTypeSchema,
        fieldFound: z.boolean(),
        verified: z.boolean(),
      })
      .optional(),
  })
  .refine(
    // 自定义验证：成功时必须有result，失败时必须有error
    (data) => {
      if (data.success) {
        return !!data.result;
      } else {
        return !!data.error;
      }
    },
    {
      message: '成功时必须提供结果，失败时必须提供错误信息',
    },
  );

/**
 * 嵌套属性提取参数Schema
 * 用于验证嵌套属性提取函数的参数
 */
export const NestedValueExtractionSchema = z.object({
  data: z.unknown(), // 原始数据，类型安全
  nestedPath: NestedPathSchema,
  defaultValue: z.unknown().optional(),
  throwOnError: z.boolean().default(false),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type DoubanDataType = z.infer<typeof DoubanDataTypeSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type VerifiedFieldMappingConfig = z.infer<
  typeof VerifiedFieldMappingConfigSchema
>;
export type FieldMappingCollection = z.infer<
  typeof FieldMappingCollectionSchema
>;
export type VerifiedFieldMappings = z.infer<typeof VerifiedFieldMappingsSchema>;
export type VerificationStats = z.infer<typeof VerificationStatsSchema>;
export type FieldMappingQuery = z.infer<typeof FieldMappingQuerySchema>;
export type FieldMappingTransformResult = z.infer<
  typeof FieldMappingTransformResultSchema
>;
export type NestedValueExtraction = z.infer<typeof NestedValueExtractionSchema>;

/**
 * 验证单个字段映射配置的完整性和正确性
 *
 * @description 对传入的字段映射配置进行严格的运行时验证，确保符合 VerifiedFieldMappingConfig 规范
 * @param {unknown} config - 待验证的字段映射配置对象，可能来自外部数据源
 * @param {DoubanDataType} _dataType - 豆瓣数据类型枚举值，用于上下文标识（当前版本未使用）
 * @returns {Promise<{success: true; data: VerifiedFieldMappingConfig} | {success: false; error: string}>}
 *   成功时返回包含验证后数据的对象，失败时返回包含错误信息的对象
 * @throws {never} 此方法不会抛出异常，所有错误都通过返回值的 error 字段传递
 *
 * @example
 * ```typescript
 * const result = validateFieldMappingConfig({
 *   doubanFieldName: 'title',
 *   chineseName: '书名',
 *   apiFieldName: '书名',
 *   fieldType: 'text',
 *   required: true,
 *   description: '书籍标题字段',
 *   verified: true
 * }, 'books');
 *
 * if (result.success) {
 *   console.log('验证成功:', result.data);
 * } else {
 *   console.error('验证失败:', result.error);
 * }
 * ```
 */
export function validateFieldMappingConfig(
  config: unknown,
  _dataType: DoubanDataType,
):
  | { success: true; data: VerifiedFieldMappingConfig }
  | { success: false; error: string } {
  try {
    const validatedConfig = VerifiedFieldMappingConfigSchema.parse(config);
    return { success: true, data: validatedConfig };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `字段映射配置验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 批量验证字段映射配置集合的完整性和一致性
 *
 * @description 验证整个数据类型的字段映射配置集合，确保键值对的一致性和字段数量的正确性
 * @param {unknown} collection - 待验证的字段映射集合对象，键为字段名，值为字段配置
 * @param {number} [expectedCount] - 可选参数，期望的字段数量，用于验证配置完整性
 * @returns {Promise<{success: true; data: FieldMappingCollection} | {success: false; error: string}>}
 *   成功时返回包含验证后集合数据的对象，失败时返回包含详细错误信息的对象
 * @throws {never} 此方法不会抛出异常，所有错误都通过返回值的 error 字段传递
 *
 * @example
 * ```typescript
 * const collection = {
 *   title: { doubanFieldName: 'title', chineseName: '标题', ... },
 *   author: { doubanFieldName: 'author', chineseName: '作者', ... }
 * };
 *
 * const result = validateFieldMappingCollection(collection, 2);
 *
 * if (result.success) {
 *   console.log('集合验证成功，包含字段:', Object.keys(result.data));
 * } else {
 *   console.error('集合验证失败:', result.error);
 * }
 * ```
 */
export function validateFieldMappingCollection(
  collection: unknown,
  expectedCount?: number,
):
  | { success: true; data: FieldMappingCollection }
  | { success: false; error: string } {
  try {
    const validatedCollection = FieldMappingCollectionSchema.parse(collection);

    if (
      expectedCount &&
      Object.keys(validatedCollection).length !== expectedCount
    ) {
      return {
        success: false,
        error: `字段数量不匹配，期望${expectedCount}个，实际${Object.keys(validatedCollection).length}个`,
      };
    }

    return { success: true, data: validatedCollection };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `字段映射集合验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证嵌套对象属性路径的格式正确性
 *
 * @description 检查类似 'rating.average' 或 'author.name' 的嵌套路径字符串是否符合规范格式
 * @param {string} path - 待验证的嵌套路径字符串，如 'rating.average'、'metadata.source.url' 等
 * @returns {boolean} 路径格式正确返回 true，格式错误返回 false
 * @throws {never} 此方法不会抛出异常，格式错误时静默返回 false
 *
 * @example
 * ```typescript
 * // 有效路径
 * console.log(validateNestedPath('rating')); // true
 * console.log(validateNestedPath('rating.average')); // true
 * console.log(validateNestedPath('metadata.source.url')); // true
 *
 * // 无效路径
 * console.log(validateNestedPath('123invalid')); // false - 不能以数字开头
 * console.log(validateNestedPath('rating..average')); // false - 不能有连续的点
 * console.log(validateNestedPath('rating-average')); // false - 不能包含连字符
 * console.log(validateNestedPath('')); // false - 不能为空字符串
 * ```
 */
export function validateNestedPath(path: string): boolean {
  try {
    NestedPathSchema.parse(path);
    return true;
  } catch {
    return false;
  }
}
