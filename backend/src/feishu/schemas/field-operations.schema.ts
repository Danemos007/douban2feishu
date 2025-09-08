/**
 * 字段操作统一Schema定义
 *
 * 面向未来的理想设计：
 * - 统一凭证管理
 * - 智能操作选项
 * - 完整结果追踪
 * - 类型唯一性保证
 *
 * 设计原则: "极简接口，强大内核"
 */

import { z } from 'zod';
import { FeishuFieldSchema } from './field.schema';

/**
 * 🔥 统一飞书凭证 - 消除重复参数传递
 *
 * 将原本分散的 appId, appSecret, appToken 统一为一个对象
 * 提升接口清晰度和调用便利性
 */
export const FeishuCredentialsSchema = z.object({
  appId: z
    .string()
    .min(1, 'App ID不能为空')
    .regex(/^cli_[a-zA-Z0-9]+$/, 'App ID格式不正确'),

  appSecret: z
    .string()
    .min(1, 'App Secret不能为空')
    .min(32, 'App Secret长度不足'),

  appToken: z
    .string()
    .min(1, 'App Token不能为空')
    .regex(/^[a-zA-Z0-9_-]+$/, 'App Token格式不正确'),
});

/**
 * 🚀 字段操作策略 - 智能处理各种场景
 */
export const FieldOperationStrategySchema = z
  .enum([
    'create_only', // 仅创建：字段存在时抛错
    'update_only', // 仅更新：字段不存在时抛错
    'ensure_correct', // 智能确保：自动创建或更新(默认)
  ])
  .default('ensure_correct');

/**
 * 🔧 冲突解决策略 - 字段存在但配置不匹配时的处理方式
 */
export const ConflictResolutionSchema = z
  .enum([
    'update_existing', // 更新现有字段(默认)
    'throw_error', // 抛出错误
    'skip_operation', // 跳过操作
  ])
  .default('update_existing');

/**
 * ⚙️ 字段操作选项 - 面向未来的扩展配置
 */
export const FieldOperationOptionsSchema = z
  .object({
    /**
     * 操作策略：决定如何处理字段存在性
     */
    strategy: FieldOperationStrategySchema,

    /**
     * 冲突解决：字段配置不匹配时的处理方式
     */
    conflictResolution: ConflictResolutionSchema,

    /**
     * 性能优化选项
     */
    skipCache: z
      .boolean()
      .default(false)
      .describe('跳过缓存，强制从API获取最新数据'),

    /**
     * 可观测性选项
     */
    enableDetailedLogging: z
      .boolean()
      .default(true)
      .describe('启用详细操作日志'),

    /**
     * 可靠性选项
     */
    maxRetries: z
      .number()
      .min(0, '重试次数不能为负数')
      .max(5, '重试次数不能超过5次')
      .default(3)
      .describe('API调用失败时的最大重试次数'),

    /**
     * 延迟控制：防止API限流
     */
    operationDelay: z
      .number()
      .min(0)
      .max(10000)
      .default(1000)
      .describe('操作间延迟(毫秒)，用于防止API限流'),
  })
  .partial(); // 所有选项都是可选的，使用智能默认值

/**
 * 📊 配置差异详情 - 精确记录字段配置变更
 */
export const ConfigurationChangeSchema = z.object({
  property: z.string().describe('变更的属性名'),

  from: z.unknown().describe('原始值'),

  to: z.unknown().describe('目标值'),

  severity: z.enum(['critical', 'minor']).describe('变更重要程度'),

  description: z.string().optional().describe('变更描述'),
});

/**
 * 📈 字段操作结果 - 完整的操作反馈信息
 */
export const FieldOperationResultSchema = z.object({
  /**
   * 操作后的字段信息
   */
  field: FeishuFieldSchema,

  /**
   * 执行的操作类型
   */
  operation: z
    .enum(['created', 'updated', 'unchanged'])
    .describe('实际执行的操作'),

  /**
   * 配置变更详情(仅在更新时有值)
   */
  changes: z
    .array(ConfigurationChangeSchema)
    .default([])
    .describe('字段配置变更列表'),

  /**
   * 性能指标
   */
  processingTime: z.number().min(0).describe('操作处理时间(毫秒)'),

  /**
   * 警告信息
   */
  warnings: z.array(z.string()).default([]).describe('操作过程中的警告信息'),

  /**
   * 额外元数据
   */
  metadata: z
    .object({
      retryCount: z.number().min(0).default(0),
      cacheHit: z.boolean().default(false),
      apiCallCount: z.number().min(0).default(1),
    })
    .optional(),
});

/**
 * 📋 批量操作汇总信息
 */
export const BatchOperationSummarySchema = z.object({
  total: z.number().min(0),
  created: z.number().min(0),
  updated: z.number().min(0),
  unchanged: z.number().min(0),
  failed: z.number().min(0),
  totalProcessingTime: z.number().min(0),
  averageProcessingTime: z.number().min(0),
});

/**
 * 🔄 批量字段操作结果
 */
export const BatchFieldOperationResultSchema = z.object({
  /**
   * 各字段操作结果
   */
  results: z.array(FieldOperationResultSchema),

  /**
   * 批量操作汇总
   */
  summary: BatchOperationSummarySchema,

  /**
   * 失败操作详情
   */
  failures: z
    .array(
      z.object({
        fieldName: z.string(),
        error: z.string(),
        retryCount: z.number().min(0),
      }),
    )
    .default([]),

  /**
   * 批量操作总耗时
   */
  totalExecutionTime: z.number().min(0),
});

/**
 * 🔍 字段匹配分析结果
 */
export const FieldMatchAnalysisSchema = z.object({
  isFullMatch: z.boolean().describe('字段配置是否完全匹配'),

  differences: z.array(ConfigurationChangeSchema).describe('配置差异列表'),

  matchScore: z.number().min(0).max(1).describe('匹配度评分(0-1)'),

  recommendedAction: z
    .enum(['no_action', 'update_field', 'recreate_field'])
    .describe('推荐操作'),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type FeishuCredentials = z.infer<typeof FeishuCredentialsSchema>;
export type FieldOperationStrategy = z.infer<
  typeof FieldOperationStrategySchema
>;
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;
export type FieldOperationOptions = z.infer<typeof FieldOperationOptionsSchema>;
export type ConfigurationChange = z.infer<typeof ConfigurationChangeSchema>;
export type FieldOperationResult = z.infer<typeof FieldOperationResultSchema>;
export type BatchOperationSummary = z.infer<typeof BatchOperationSummarySchema>;
export type BatchFieldOperationResult = z.infer<
  typeof BatchFieldOperationResultSchema
>;
export type FieldMatchAnalysis = z.infer<typeof FieldMatchAnalysisSchema>;

/**
 * 🎯 自定义错误类型 - 精确的错误分类
 */
export class FieldOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly fieldName?: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'FieldOperationError';
  }
}

export class FieldConfigurationMismatchError extends Error {
  constructor(
    public readonly differences: ConfigurationChange[],
    public readonly fieldName?: string,
  ) {
    super(`字段配置不匹配: ${differences.length}项差异`);
    this.name = 'FieldConfigurationMismatchError';
  }
}

export class FieldNotFoundError extends Error {
  constructor(
    public readonly fieldName: string,
    public readonly tableId: string,
  ) {
    super(`字段"${fieldName}"在表格"${tableId}"中不存在`);
    this.name = 'FieldNotFoundError';
  }
}

// Note: 所有Schema都已在定义时导出，无需重复导出
