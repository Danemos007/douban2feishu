/**
 * 飞书字段自动创建 Schema定义
 *
 * 基于历史测试文件分析和真实API验证
 * 设计原则: "宽进严出" + "类型唯一性" + TDD友好
 *
 * 整合来源:
 * - sync-movie-from-cache.ts: 完整Switch逻辑架构
 * - sync-from-cache.ts: 精细化状态字段验证
 * - 现有正式架构: Zod + 契约验证模式
 */

import { z } from 'zod';
import { FeishuFieldType } from './field.schema';

/**
 * 内容类型枚举 - 支持4种豆瓣内容类型
 */
export const ContentTypeSchema = z.enum([
  'books',
  'movies',
  'tv',
  'documentary',
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

/**
 * 字段创建请求Schema - 严格验证输入
 */
export const FieldCreationRequestSchema = z.object({
  fieldName: z
    .string()
    .min(1, '字段名不能为空')
    .max(50, '字段名长度不能超过50个字符')
    .regex(
      /^[\u4e00-\u9fa5a-zA-Z0-9_\s]+$/,
      '字段名只能包含中文、英文、数字、下划线和空格',
    ),

  contentType: ContentTypeSchema,

  fieldType: z.nativeEnum(FeishuFieldType),

  description: z.string().max(200, '描述长度不能超过200个字符').optional(),
});

/**
 * 状态选项Schema - 支持不同内容类型的状态差异
 */
export const StatusOptionSchema = z.object({
  id: z.string().optional(), // 飞书选项ID，创建时可选
  name: z.string().min(1, '选项名称不能为空'),
  color: z
    .number()
    .int('颜色值必须为整数')
    .min(0, '颜色值不能小于0')
    .max(15, '颜色值不能大于15'), // 飞书颜色范围0-15
});

/**
 * 字段属性Schema - 基于不同字段类型的完整配置
 */
export const FieldPropertySchema = z
  .object({
    // Rating字段专用属性
    formatter: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    rating: z
      .object({
        symbol: z.string(),
      })
      .optional(),

    // 选择字段属性
    options: z.array(StatusOptionSchema).optional(),

    // 文本字段属性
    auto_wrap: z.boolean().optional(),

    // 数字字段范围
    range: z
      .object({
        min: z.number(),
        max: z.number(),
      })
      .optional(),

    precision: z.number().optional(),
  })
  .passthrough();

/**
 * 字段创建配置Schema - 内部使用的完整配置
 */
export const FieldCreationConfigSchema = z.object({
  field_name: z.string(),
  type: z.nativeEnum(FeishuFieldType),
  ui_type: z.string(),
  property: FieldPropertySchema.optional(),
  description: z
    .object({
      text: z.string(),
    })
    .optional(),
});

/**
 * 字段创建响应Schema - 基于飞书API实际响应
 */
export const FieldCreationResponseSchema = z
  .object({
    field_id: z.string().regex(/^fld[a-zA-Z0-9]{14,}$/, 'Field ID格式不正确'),

    field_name: z.string(),

    type: z.nativeEnum(FeishuFieldType),

    ui_type: z.string(),

    is_primary: z.boolean().optional(),

    property: FieldPropertySchema.optional(),

    description: z.string().optional(),
  })
  .passthrough();

/**
 * 批量字段创建请求Schema
 */
export const BatchFieldCreationRequestSchema = z.object({
  fields: z
    .array(FieldCreationRequestSchema)
    .min(1, '至少需要创建一个字段')
    .max(20, '单次最多创建20个字段'), // 合理的批量限制
});

/**
 * 批量字段创建结果Schema
 */
export const BatchFieldCreationResultSchema = z.object({
  success: z.array(FieldCreationResponseSchema),
  failed: z.array(
    z.object({
      request: FieldCreationRequestSchema,
      error: z.string(),
    }),
  ),
  summary: z.object({
    total: z.number(),
    successCount: z.number(),
    failedCount: z.number(),
    processingTime: z.number(), // 毫秒
  }),
});

/**
 * 内容类型配置Schema - 4种内容类型的完整配置
 */
export const ContentTypeConfigSchema = z.object({
  statusOptions: z.array(StatusOptionSchema),
  fieldTemplates: z.record(z.string(), FieldCreationConfigSchema),
});

/**
 * 字段创建统计Schema - 用于监控和分析
 */
export const FieldCreationStatsSchema = z.object({
  totalCreated: z.number(),
  successRate: z.number(), // 成功率百分比
  averageCreationTime: z.number(), // 平均创建时间（毫秒）
  contentTypeDistribution: z.record(ContentTypeSchema, z.number()),
  fieldTypeDistribution: z.record(z.string(), z.number()),
  lastCreationTime: z.string().datetime().optional(),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type FieldCreationRequest = z.infer<typeof FieldCreationRequestSchema>;
export type FieldCreationResponse = z.infer<typeof FieldCreationResponseSchema>;
export type FieldCreationConfig = z.infer<typeof FieldCreationConfigSchema>;
export type FieldProperty = z.infer<typeof FieldPropertySchema>;
export type StatusOption = z.infer<typeof StatusOptionSchema>;
export type BatchFieldCreationRequest = z.infer<
  typeof BatchFieldCreationRequestSchema
>;
export type BatchFieldCreationResult = z.infer<
  typeof BatchFieldCreationResultSchema
>;
export type ContentTypeConfig = z.infer<typeof ContentTypeConfigSchema>;
export type FieldCreationStats = z.infer<typeof FieldCreationStatsSchema>;

// Note: Schemas are already exported above with their declarations
