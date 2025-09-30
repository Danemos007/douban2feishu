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
 * 飞书应用凭证验证Schema
 *
 * @description 统一验证飞书应用的三个核心凭证字段，确保格式正确和长度符合要求
 * @param appId - 飞书应用ID，必须以'cli_'开头的字母数字组合
 * @param appSecret - 飞书应用密钥，最小长度32个字符
 * @param appToken - 飞书应用令牌，支持字母数字下划线和短横线
 * @returns {object} 验证通过的飞书凭证对象
 * @throws {ZodError} 当凭证格式不正确、为空或长度不足时抛出验证错误
 *
 * @example
 * ```typescript
 * const credentials = FeishuCredentialsSchema.parse({
 *   appId: 'cli_your_app_id_here',
 *   appSecret: 'your_app_secret_here',
 *   appToken: 'your_app_token_here'
 * });
 * ```
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
 * 字段操作策略枚举Schema
 *
 * @description 定义字段操作的三种策略模式，控制字段创建和更新的行为
 * @returns {string} 操作策略枚举值，默认为'ensure_correct'
 * @throws {ZodError} 当传入无效的策略值时抛出验证错误
 *
 * @example
 * ```typescript
 * // 使用默认策略
 * const strategy = FieldOperationStrategySchema.parse(undefined); // 'ensure_correct'
 *
 * // 指定策略
 * const createOnly = FieldOperationStrategySchema.parse('create_only');
 * ```
 */
export const FieldOperationStrategySchema = z
  .enum([
    'create_only', // 仅创建：字段存在时抛错
    'update_only', // 仅更新：字段不存在时抛错
    'ensure_correct', // 智能确保：自动创建或更新(默认)
  ])
  .default('ensure_correct');

/**
 * 冲突解决策略枚举Schema
 *
 * @description 定义当字段存在但配置不匹配时的处理策略
 * @returns {string} 冲突解决策略枚举值，默认为'update_existing'
 * @throws {ZodError} 当传入无效的冲突解决策略值时抛出验证错误
 *
 * @example
 * ```typescript
 * // 使用默认策略
 * const resolution = ConflictResolutionSchema.parse(undefined); // 'update_existing'
 *
 * // 指定严格模式
 * const strict = ConflictResolutionSchema.parse('throw_error');
 * ```
 */
export const ConflictResolutionSchema = z
  .enum([
    'update_existing', // 更新现有字段(默认)
    'throw_error', // 抛出错误
    'skip_operation', // 跳过操作
  ])
  .default('update_existing');

/**
 * 字段操作选项配置Schema
 *
 * @description 定义字段操作的完整配置选项，包含策略控制、性能优化、可靠性保证等设置
 * @param strategy - 操作策略，控制字段创建和更新行为
 * @param conflictResolution - 冲突解决策略，处理字段配置不匹配情况
 * @param skipCache - 性能选项，是否跳过缓存强制获取最新数据
 * @param enableDetailedLogging - 日志选项，是否启用详细操作日志
 * @param maxRetries - 可靠性选项，API调用失败时的最大重试次数(0-5次)
 * @param operationDelay - 限流控制，操作间延迟毫秒数(0-10000ms)
 * @returns {object} 部分或完整的字段操作选项对象，所有字段都是可选的
 * @throws {ZodError} 当参数超出有效范围或类型不正确时抛出验证错误
 *
 * @example
 * ```typescript
 * // 使用默认配置
 * const options = FieldOperationOptionsSchema.parse({});
 *
 * // 自定义配置
 * const customOptions = FieldOperationOptionsSchema.parse({
 *   strategy: 'create_only',
 *   maxRetries: 5,
 *   operationDelay: 2000
 * });
 * ```
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
 * 配置变更差异记录Schema
 *
 * @description 记录字段配置变更的详细信息，用于追踪和分析配置差异
 * @param property - 发生变更的属性名称
 * @param from - 变更前的原始值，可以是任意类型
 * @param to - 变更后的目标值，可以是任意类型
 * @param severity - 变更的重要程度，critical表示关键变更，minor表示次要变更
 * @param description - 可选的变更描述信息
 * @returns {object} 配置变更记录对象
 * @throws {ZodError} 当必填字段缺失或severity值无效时抛出验证错误
 *
 * @example
 * ```typescript
 * const change = ConfigurationChangeSchema.parse({
 *   property: 'field_name',
 *   from: '旧字段名',
 *   to: '新字段名',
 *   severity: 'minor',
 *   description: '字段重命名'
 * });
 * ```
 */
export const ConfigurationChangeSchema = z.object({
  property: z.string().describe('变更的属性名'),

  from: z.unknown().describe('原始值'),

  to: z.unknown().describe('目标值'),

  severity: z.enum(['critical', 'minor']).describe('变更重要程度'),

  description: z.string().optional().describe('变更描述'),
});

/**
 * 字段操作结果Schema
 *
 * @description 记录单个字段操作的完整结果信息，包含操作详情、性能指标和元数据
 * @param field - 操作后的完整字段信息，符合FeishuFieldSchema结构
 * @param operation - 实际执行的操作类型: created(新建)、updated(更新)、unchanged(无变化)
 * @param changes - 字段配置变更列表，仅在更新操作时有值，默认为空数组
 * @param processingTime - 操作处理时间，以毫秒为单位，必须为非负数
 * @param warnings - 操作过程中的警告信息列表，默认为空数组
 * @param metadata - 可选的操作元数据，包含重试次数、缓存命中状态和API调用次数
 * @returns {object} 完整的字段操作结果对象
 * @throws {ZodError} 当字段结构无效、操作类型不正确或时间为负数时抛出验证错误
 *
 * @example
 * ```typescript
 * const result = FieldOperationResultSchema.parse({
 *   field: { field_id: 'fld123', field_name: '测试字段', type: 1, ui_type: 'Text' },
 *   operation: 'created',
 *   processingTime: 1500,
 *   warnings: ['字段已存在相似名称'],
 *   metadata: { retryCount: 1, cacheHit: false, apiCallCount: 2 }
 * });
 * ```
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
 * 批量操作汇总统计Schema
 *
 * @description 统计批量字段操作的整体执行情况和性能指标
 * @param total - 总操作数量，必须为非负整数
 * @param created - 成功创建的字段数量，必须为非负整数
 * @param updated - 成功更新的字段数量，必须为非负整数
 * @param unchanged - 无需变更的字段数量，必须为非负整数
 * @param failed - 操作失败的字段数量，必须为非负整数
 * @param totalProcessingTime - 总处理时间，以毫秒为单位，必须为非负数
 * @param averageProcessingTime - 平均处理时间，以毫秒为单位，必须为非负数
 * @returns {object} 批量操作统计汇总对象
 * @throws {ZodError} 当任何数量字段为负数时抛出验证错误
 *
 * @example
 * ```typescript
 * const summary = BatchOperationSummarySchema.parse({
 *   total: 10,
 *   created: 3,
 *   updated: 5,
 *   unchanged: 1,
 *   failed: 1,
 *   totalProcessingTime: 15000,
 *   averageProcessingTime: 1500
 * });
 * ```
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
 * 批量字段操作结果Schema
 *
 * @description 记录批量字段操作的完整结果，包含每个字段的操作结果、统计汇总和失败详情
 * @param results - 各字段操作结果列表，每项包含完整的字段操作信息
 * @param summary - 批量操作统计汇总，包含成功、失败、时间等统计数据
 * @param failures - 失败操作详情列表，记录每个失败字段的错误信息和重试次数，默认为空数组
 * @param totalExecutionTime - 批量操作总执行时间，以毫秒为单位，必须为非负数
 * @returns {object} 完整的批量字段操作结果对象
 * @throws {ZodError} 当结果结构无效或时间为负数时抛出验证错误
 *
 * @example
 * ```typescript
 * const batchResult = BatchFieldOperationResultSchema.parse({
 *   results: [
 *     { field: {...}, operation: 'created', processingTime: 1000, warnings: [] }
 *   ],
 *   summary: { total: 2, created: 1, updated: 0, unchanged: 0, failed: 1, ... },
 *   failures: [
 *     { fieldName: '失败字段', error: '权限不足', retryCount: 3 }
 *   ],
 *   totalExecutionTime: 5000
 * });
 * ```
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
 * 字段匹配分析结果Schema
 *
 * @description 分析现有字段与期望配置的匹配程度，提供差异详情和推荐操作
 * @param isFullMatch - 字段配置是否完全匹配，true表示完全一致
 * @param differences - 配置差异列表，记录所有不匹配的属性变更
 * @param matchScore - 匹配度评分，范围0-1，1表示完全匹配，0表示完全不匹配
 * @param recommendedAction - 推荐操作: no_action(无需操作)、update_field(更新字段)、recreate_field(重建字段)
 * @returns {object} 字段匹配分析结果对象
 * @throws {ZodError} 当匹配度评分超出0-1范围或推荐操作无效时抛出验证错误
 *
 * @example
 * ```typescript
 * const analysis = FieldMatchAnalysisSchema.parse({
 *   isFullMatch: false,
 *   differences: [
 *     { property: 'field_name', from: '旧名称', to: '新名称', severity: 'minor' }
 *   ],
 *   matchScore: 0.8,
 *   recommendedAction: 'update_field'
 * });
 * ```
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

/**
 * 飞书应用凭证类型
 *
 * @description 从FeishuCredentialsSchema推断的TypeScript类型，包含完整的飞书应用认证信息
 */
export type FeishuCredentials = z.infer<typeof FeishuCredentialsSchema>;

/**
 * 字段操作策略类型
 *
 * @description 从FieldOperationStrategySchema推断的TypeScript类型，定义字段操作的策略模式
 */
export type FieldOperationStrategy = z.infer<
  typeof FieldOperationStrategySchema
>;

/**
 * 冲突解决策略类型
 *
 * @description 从ConflictResolutionSchema推断的TypeScript类型，定义配置冲突的处理方式
 */
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

/**
 * 字段操作选项类型
 *
 * @description 从FieldOperationOptionsSchema推断的TypeScript类型，包含完整的操作配置选项
 */
export type FieldOperationOptions = z.infer<typeof FieldOperationOptionsSchema>;

/**
 * 配置变更记录类型
 *
 * @description 从ConfigurationChangeSchema推断的TypeScript类型，记录字段配置的变更详情
 */
export type ConfigurationChange = z.infer<typeof ConfigurationChangeSchema>;

/**
 * 字段操作结果类型
 *
 * @description 从FieldOperationResultSchema推断的TypeScript类型，包含单个字段操作的完整结果
 */
export type FieldOperationResult = z.infer<typeof FieldOperationResultSchema>;

/**
 * 批量操作汇总类型
 *
 * @description 从BatchOperationSummarySchema推断的TypeScript类型，统计批量操作的执行情况
 */
export type BatchOperationSummary = z.infer<typeof BatchOperationSummarySchema>;

/**
 * 批量字段操作结果类型
 *
 * @description 从BatchFieldOperationResultSchema推断的TypeScript类型，包含批量字段操作的完整结果
 */
export type BatchFieldOperationResult = z.infer<
  typeof BatchFieldOperationResultSchema
>;

/**
 * 字段匹配分析结果类型
 *
 * @description 从FieldMatchAnalysisSchema推断的TypeScript类型，包含字段匹配分析的详细结果
 */
export type FieldMatchAnalysis = z.infer<typeof FieldMatchAnalysisSchema>;

/**
 * 字段操作错误类
 *
 * @description 字段操作过程中发生的通用错误，包含操作上下文和错误原因
 * @param message - 错误消息描述
 * @param operation - 发生错误的操作类型，如'create_field'、'update_field'等
 * @param fieldName - 可选的字段名称，标识出错的具体字段
 * @param cause - 可选的原始错误对象，用于错误链追踪
 * @throws 当字段操作失败时抛出此错误
 *
 * @example
 * ```typescript
 * throw new FieldOperationError(
 *   '字段创建失败',
 *   'create_field',
 *   '测试字段',
 *   originalError
 * );
 * ```
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

/**
 * 字段配置不匹配错误类
 *
 * @description 当现有字段配置与期望配置不匹配时抛出的专用错误
 * @param differences - 配置差异详情列表，描述所有不匹配的属性
 * @param fieldName - 可选的字段名称，标识配置不匹配的具体字段
 * @throws 当字段配置验证失败或存在不可接受的差异时抛出此错误
 *
 * @example
 * ```typescript
 * const differences = [
 *   { property: 'type', from: 1, to: 2, severity: 'critical' }
 * ];
 * throw new FieldConfigurationMismatchError(differences, '测试字段');
 * ```
 */
export class FieldConfigurationMismatchError extends Error {
  constructor(
    public readonly differences: ConfigurationChange[],
    public readonly fieldName?: string,
  ) {
    super(`字段配置不匹配: ${differences.length}项差异`);
    this.name = 'FieldConfigurationMismatchError';
  }
}

/**
 * 字段未找到错误类
 *
 * @description 当在指定表格中找不到预期字段时抛出的专用错误
 * @param fieldName - 未找到的字段名称
 * @param tableId - 查找字段的目标表格ID
 * @throws 当字段查找操作失败或字段在表格中不存在时抛出此错误
 *
 * @example
 * ```typescript
 * throw new FieldNotFoundError('书名', 'tbl_books123');
 * ```
 */
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
