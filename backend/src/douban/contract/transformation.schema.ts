/**
 * 数据转换Zod验证Schema体系
 *
 * 为DataTransformationService提供完整的运行时类型安全保障
 * 基于"宽进严出" + "类型唯一性"原则设计
 *
 * 创建时间: 2025-09-04
 * 用途: 数据转换逻辑的类型安全和验证
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
 * 转换选项配置Schema
 */
const TransformationOptionsSchema = z
  .object({
    enableIntelligentRepairs: z.boolean().default(true),
    strictValidation: z.boolean().default(true),
    preserveRawData: z.boolean().default(false),
    customFieldMappings: z.record(z.string(), z.string()).optional(),
  })
  .partial(); // 所有字段都是可选的

/**
 * 转换统计信息Schema
 */
const TransformationStatisticsSchema = z
  .object({
    totalFields: z.number().min(0, '总字段数不能为负数'),
    transformedFields: z.number().min(0, '转换字段数不能为负数'),
    repairedFields: z.number().min(0, '修复字段数不能为负数'),
    failedFields: z.number().min(0, '失败字段数不能为负数'),
  })
  .refine(
    // 自定义验证：确保数量逻辑合理
    (data) => {
      return data.transformedFields + data.failedFields <= data.totalFields;
    },
    {
      message: '转换字段数 + 失败字段数不能超过总字段数',
    },
  );

/**
 * 转换结果Schema
 */
const TransformationResultSchema = z.object({
  data: z.any(), // 转换后的数据，类型可变
  statistics: TransformationStatisticsSchema,
  warnings: z.array(z.string()),
  rawData: z.any().optional(), // 原始数据备份
});

/**
 * 智能修复配置Schema
 * 控制各种修复功能的开关
 */
const IntelligentRepairConfigSchema = z.object({
  durationRepair: z.boolean().default(true),
  dateFormatRepair: z.boolean().default(true),
  regionSplitting: z.boolean().default(true),
  languageCleaning: z.boolean().default(true),
  arrayProcessing: z.boolean().default(true),
  nestedValueExtraction: z.boolean().default(true),
});

/**
 * 字段转换上下文Schema
 * 用于在转换过程中传递上下文信息
 */
const FieldTransformationContextSchema = z.object({
  fieldName: z.string().min(1, '字段名不能为空'),
  sourceValue: z.any(),
  targetFieldType: z.enum([
    'text',
    'number',
    'rating',
    'singleSelect',
    'multiSelect',
    'datetime',
    'checkbox',
    'url',
  ]),
  isRequired: z.boolean(),
  hasNestedPath: z.boolean(),
  processingNotes: z.string().optional(),
});

/**
 * 转换错误Schema
 * 记录转换过程中的错误详情
 */
const TransformationErrorSchema = z.object({
  fieldName: z.string().min(1, '字段名不能为空'),
  errorType: z.enum([
    'validation_error',
    'type_conversion_error',
    'nested_path_error',
    'repair_error',
  ]),
  errorMessage: z.string().min(1, '错误信息不能为空'),
  sourceValue: z.any(),
  timestamp: z.date().default(() => new Date()),
});

/**
 * 批量转换请求Schema
 * 用于批量处理多个数据项的转换
 */
const BatchTransformationRequestSchema = z.object({
  items: z.array(z.any()).min(1, '批量转换项目不能为空'),
  dataType: DoubanDataTypeSchema,
  options: TransformationOptionsSchema.optional(),
  batchSize: z.number().min(1).max(1000).default(100), // 批次大小限制
});

/**
 * 批量转换结果Schema
 */
const BatchTransformationResultSchema = z.object({
  results: z.array(TransformationResultSchema),
  batchStatistics: z.object({
    totalItems: z.number().min(0),
    successfulItems: z.number().min(0),
    failedItems: z.number().min(0),
    processingTimeMs: z.number().min(0),
  }),
  errors: z.array(TransformationErrorSchema),
});

/**
 * 转换性能指标Schema
 */
const TransformationPerformanceSchema = z
  .object({
    startTime: z.date(),
    endTime: z.date(),
    durationMs: z.number().min(0, '处理时间不能为负数'),
    memoryUsageKB: z.number().min(0).optional(),
    fieldsPerSecond: z.number().min(0).optional(),
  })
  .refine((data) => data.endTime >= data.startTime, {
    message: '结束时间不能早于开始时间',
  });

/**
 * 数据转换审计记录Schema
 * 用于追踪转换操作的历史记录
 */
const TransformationAuditSchema = z.object({
  operationId: z.string().uuid('操作ID必须是有效的UUID'),
  dataType: DoubanDataTypeSchema,
  inputHash: z.string().min(1, '输入数据哈希不能为空'),
  outputHash: z.string().min(1, '输出数据哈希不能为空'),
  transformationOptions: TransformationOptionsSchema,
  performance: TransformationPerformanceSchema,
  timestamp: z.date().default(() => new Date()),
  version: z.string().default('1.0'),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type DoubanDataType = z.infer<typeof DoubanDataTypeSchema>;
export type TransformationOptions = z.infer<typeof TransformationOptionsSchema>;
export type TransformationStatistics = z.infer<
  typeof TransformationStatisticsSchema
>;
export type TransformationResult = z.infer<typeof TransformationResultSchema>;
export type IntelligentRepairConfig = z.infer<
  typeof IntelligentRepairConfigSchema
>;
export type FieldTransformationContext = z.infer<
  typeof FieldTransformationContextSchema
>;
export type TransformationError = z.infer<typeof TransformationErrorSchema>;
export type BatchTransformationRequest = z.infer<
  typeof BatchTransformationRequestSchema
>;
export type BatchTransformationResult = z.infer<
  typeof BatchTransformationResultSchema
>;
export type TransformationPerformance = z.infer<
  typeof TransformationPerformanceSchema
>;
export type TransformationAudit = z.infer<typeof TransformationAuditSchema>;

// Schema导出
export {
  TransformationOptionsSchema,
  TransformationStatisticsSchema,
  TransformationResultSchema,
  IntelligentRepairConfigSchema,
  FieldTransformationContextSchema,
  TransformationErrorSchema,
  BatchTransformationRequestSchema,
  BatchTransformationResultSchema,
  TransformationPerformanceSchema,
  TransformationAuditSchema,
};

/**
 * 验证工具函数：验证转换选项
 */
export function validateTransformationOptions(
  options: unknown,
):
  | { success: true; data: TransformationOptions }
  | { success: false; error: string } {
  try {
    const validatedOptions = TransformationOptionsSchema.parse(options);
    return { success: true, data: validatedOptions };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `转换选项验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证转换结果
 */
export function validateTransformationResult(
  result: unknown,
):
  | { success: true; data: TransformationResult }
  | { success: false; error: string } {
  try {
    const validatedResult = TransformationResultSchema.parse(result);
    return { success: true, data: validatedResult };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `转换结果验证失败: ${errorMessage}` };
    }
    return { success: false, error: '未知的验证错误' };
  }
}

/**
 * 验证工具函数：验证豆瓣数据类型
 */
export function validateDoubanDataType(
  dataType: unknown,
): dataType is DoubanDataType {
  try {
    DoubanDataTypeSchema.parse(dataType);
    return true;
  } catch {
    return false;
  }
}
