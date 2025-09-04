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
export const DoubanDataTypeSchema = z.enum(['books', 'movies', 'tv', 'documentary']);

/**
 * 字段类型枚举验证
 */
export const FieldTypeSchema = z.enum([
  'text', 'number', 'rating', 'singleSelect', 'multiSelect', 
  'datetime', 'checkbox', 'url'
]);

/**
 * 验证来源文件Schema
 * 基于我们已知的历史文件进行严格验证
 */
export const VerifiedSourceSchema = z.array(
  z.enum([
    'sync-all-movies-fixed.ts',
    'sync-movie-from-cache.ts', 
    'sync-from-cache.ts',
    'real-douban-data-sync.ts'
  ])
).min(1);

/**
 * 嵌套路径验证Schema
 * 验证类似 'rating.average' 这样的嵌套属性路径
 */
export const NestedPathSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/, {
    message: '嵌套路径格式无效，应类似 "rating.average"'
  });

/**
 * 字段映射配置Schema - 增强版
 * 对应 VerifiedFieldMappingConfig 接口
 */
export const VerifiedFieldMappingConfigSchema = z.object({
  /** 豆瓣字段名：严格验证 */
  doubanFieldName: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    
  /** 飞书表格中文字段名：严格验证 */
  chineseName: z
    .string()
    .min(1)
    .max(50),
    
  /** API字段名：与中文名一致性验证 */
  apiFieldName: z
    .string()
    .min(1),
    
  /** 字段类型：枚举验证 */
  fieldType: FieldTypeSchema,
  
  /** 必需字段：布尔验证 */
  required: z.boolean(),
  
  /** 字段描述：内容验证 */
  description: z
    .string()
    .min(5)
    .max(200),
    
  /** 验证状态：必须为true表示已验证 */
  verified: z.literal(true),
  
  /** 嵌套属性路径：可选但格式严格 */
  nestedPath: NestedPathSchema.optional(),
  
  /** 处理说明：可选 */
  processingNotes: z.string().optional(),
}).refine(
  // 自定义验证：确保API字段名与中文名一致
  (data) => data.apiFieldName === data.chineseName,
  {
    message: 'API字段名必须与中文字段名一致',
    path: ['apiFieldName']
  }
);

/**
 * 字段映射配置集合Schema
 * 验证整个数据类型的字段映射配置
 */
export const FieldMappingCollectionSchema = z.record(
  z.string().min(1),  // key: 豆瓣字段名
  VerifiedFieldMappingConfigSchema  // value: 配置对象
).refine(
  // 自定义验证：确保key与doubanFieldName一致
  (data) => {
    const inconsistent = Object.entries(data).find(
      ([key, config]) => key !== config.doubanFieldName
    );
    return !inconsistent;
  },
  {
    message: '字段名key必须与config.doubanFieldName一致'
  }
);

/**
 * 完整验证配置Schema
 * 验证整个 VERIFIED_FIELD_MAPPINGS 结构
 */
export const VerifiedFieldMappingsSchema = z.object({
  books: FieldMappingCollectionSchema,
  movies: FieldMappingCollectionSchema,
  tv: FieldMappingCollectionSchema,
  documentary: FieldMappingCollectionSchema,
}).refine(
  // 自定义验证：确保每种类型都有必需的字段
  (data) => {
    const requiredFields = ['subjectId', 'title'];
    
    for (const [dataType, mapping] of Object.entries(data)) {
      for (const requiredField of requiredFields) {
        if (!mapping[requiredField] || !mapping[requiredField].required) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: '每种数据类型都必须包含subjectId和title作为必需字段'
  }
);

/**
 * 验证统计Schema
 * 用于验证getVerificationStats()的返回值
 */
export const VerificationStatsSchema = z.object({
  totalBooks: z.number().min(0, '书籍字段数量不能为负数'),
  totalMovies: z.number().min(0, '电影字段数量不能为负数'),
  totalVerified: z.number().min(0, '验证字段数量不能为负数'),
  sourceCoverage: z.record(
    z.string().min(1, '来源文件名不能为空'),
    z.number().min(0, '覆盖数量不能为负数')
  )
}).refine(
  // 自定义验证：确保统计数据的合理性
  (data) => {
    return data.totalVerified <= (data.totalBooks + data.totalMovies);
  },
  {
    message: '验证字段数量不能超过总字段数量'
  }
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
export const FieldMappingTransformResultSchema = z.object({
  success: z.boolean(),
  result: z.string().optional(),
  error: z.string().optional(),
  metadata: z.object({
    dataType: DoubanDataTypeSchema,
    fieldFound: z.boolean(),
    verified: z.boolean(),
  }).optional()
}).refine(
  // 自定义验证：成功时必须有result，失败时必须有error
  (data) => {
    if (data.success) {
      return !!data.result;
    } else {
      return !!data.error;
    }
  },
  {
    message: '成功时必须提供结果，失败时必须提供错误信息'
  }
);

/**
 * 嵌套属性提取参数Schema
 * 用于验证嵌套属性提取函数的参数
 */
export const NestedValueExtractionSchema = z.object({
  data: z.any(), // 原始数据，类型可变
  nestedPath: NestedPathSchema,
  defaultValue: z.any().optional(),
  throwOnError: z.boolean().default(false),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type DoubanDataType = z.infer<typeof DoubanDataTypeSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type VerifiedFieldMappingConfig = z.infer<typeof VerifiedFieldMappingConfigSchema>;
export type FieldMappingCollection = z.infer<typeof FieldMappingCollectionSchema>;
export type VerifiedFieldMappings = z.infer<typeof VerifiedFieldMappingsSchema>;
export type VerificationStats = z.infer<typeof VerificationStatsSchema>;
export type FieldMappingQuery = z.infer<typeof FieldMappingQuerySchema>;
export type FieldMappingTransformResult = z.infer<typeof FieldMappingTransformResultSchema>;
export type NestedValueExtraction = z.infer<typeof NestedValueExtractionSchema>;

/**
 * 验证工具函数：验证整个字段映射配置
 */
export function validateFieldMappingConfig(
  config: unknown, 
  dataType: DoubanDataType
): { success: true; data: VerifiedFieldMappingConfig } | { success: false; error: string } {
  try {
    const validatedConfig = VerifiedFieldMappingConfigSchema.parse(config);
    return { success: true, data: validatedConfig };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `字段映射配置验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：批量验证字段映射集合
 */
export function validateFieldMappingCollection(
  collection: unknown,
  expectedCount?: number
): { success: true; data: FieldMappingCollection } | { success: false; error: string } {
  try {
    const validatedCollection = FieldMappingCollectionSchema.parse(collection);
    
    if (expectedCount && Object.keys(validatedCollection).length !== expectedCount) {
      return { 
        success: false, 
        error: `字段数量不匹配，期望${expectedCount}个，实际${Object.keys(validatedCollection).length}个` 
      };
    }
    
    return { success: true, data: validatedCollection };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `字段映射集合验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证嵌套路径格式
 */
export function validateNestedPath(path: string): boolean {
  try {
    NestedPathSchema.parse(path);
    return true;
  } catch {
    return false;
  }
}