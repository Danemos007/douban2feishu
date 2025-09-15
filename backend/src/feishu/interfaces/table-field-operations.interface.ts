/**
 * 飞书表格字段操作统一接口定义
 *
 * 革命性设计：
 * - 一个方法处理所有场景 (创建/更新/不变)
 * - 智能冲突解决策略
 * - 完整的操作可观测性
 * - 面向未来的扩展能力
 *
 * 核心理念：用户只需要表达"我要这个字段配置正确"
 */

import {
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
} from '../schemas/field-operations.schema';
import {
  FieldCreationConfig,
  FieldProperty,
} from '../schemas/field-creation.schema';
import { FeishuField } from '../schemas/field.schema';

/**
 * 🚀 统一字段操作接口 - 革命性设计
 *
 * 这个接口彻底改变了字段操作的思维模式：
 * - 从"我要创建字段"转变为"我要确保字段配置正确"
 * - 从"分离的创建和更新"转变为"智能的统一处理"
 * - 从"简单的成功/失败"转变为"丰富的操作反馈"
 */
export interface IFeishuTableFieldOperations {
  /**
   * 🎯 核心方法：智能字段配置确保
   *
   * 这是整个接口的核心，一个方法处理所有字段操作场景：
   *
   * 📋 处理逻辑：
   * 1. 检查字段是否存在
   * 2. 如果不存在 → 创建新字段
   * 3. 如果存在且配置匹配 → 返回现有字段
   * 4. 如果存在但配置不匹配 → 根据策略更新或抛错
   *
   * 🔧 智能特性：
   * - 自动缓存管理：操作后自动清理相关缓存
   * - 智能重试：API失败时自动重试
   * - 详细日志：记录每个决策和操作
   * - 完整追踪：返回操作类型、变更详情、性能指标
   *
   * @param credentials 飞书应用凭证
   * @param tableId 表格ID
   * @param fieldConfig 期望的字段配置
   * @param options 操作选项(可选)
   * @returns 字段操作结果，包含操作类型、字段信息、变更详情等
   *
   * @example
   * ```typescript
   * // 确保书籍状态字段配置正确
   * const result = await ensureFieldConfiguration(
   *   { appId, appSecret, appToken },
   *   'tblXXX',
   *   {
   *     field_name: '我的状态',
   *     type: FeishuFieldType.SingleSelect,
   *     ui_type: 'SingleSelect',
   *     property: {
   *       options: [
   *         { name: '想读', color: 5 },
   *         { name: '在读', color: 4 },
   *         { name: '读过', color: 0 }
   *       ]
   *     }
   *   }
   * );
   *
   * console.log(result.operation); // "created" | "updated" | "unchanged"
   * if (result.operation === 'updated') {
   *   console.log(`更新了 ${result.changes.length} 项配置`);
   * }
   * ```
   */
  ensureFieldConfiguration(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
    options?: FieldOperationOptions,
  ): Promise<FieldOperationResult>;

  /**
   * 🔄 批量字段配置确保
   *
   * 高效处理多个字段的配置确保，支持：
   * - 并行处理优化
   * - 智能延迟控制
   * - 失败隔离（单个字段失败不影响其他字段）
   * - 完整的批量统计
   *
   * @param credentials 飞书应用凭证
   * @param tableId 表格ID
   * @param fieldConfigs 字段配置列表
   * @param options 批量操作选项
   * @returns 批量操作结果，包含各字段处理结果和汇总信息
   *
   * @example
   * ```typescript
   * const batchResult = await batchEnsureFieldConfigurations(
   *   credentials,
   *   tableId,
   *   [statusConfig, ratingConfig, dateConfig],
   *   { enableDetailedLogging: true }
   * );
   *
   * console.log(`处理完成: ${batchResult.summary.created}个创建, ${batchResult.summary.updated}个更新`);
   * ```
   */
  batchEnsureFieldConfigurations(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfigs: FieldCreationConfig[],
    options?: FieldOperationOptions,
  ): Promise<BatchFieldOperationResult>;

  /**
   * 🔍 字段查找 - 根据名称精确查找字段
   *
   * 支持智能缓存和错误处理的字段查找功能
   *
   * @param credentials 飞书应用凭证
   * @param tableId 表格ID
   * @param fieldName 字段名称
   * @returns 找到的字段信息，不存在时返回null
   */
  findFieldByName(
    credentials: FeishuCredentials,
    tableId: string,
    fieldName: string,
  ): Promise<FeishuField | null>;

  /**
   * 📊 字段配置匹配分析
   *
   * 深度分析现有字段与期望配置的匹配程度：
   * - 精确识别差异点
   * - 评估差异重要性
   * - 提供推荐操作建议
   *
   * @param existingField 现有字段信息
   * @param expectedConfig 期望的字段配置
   * @returns 匹配分析结果
   *
   * @example
   * ```typescript
   * const analysis = analyzeFieldConfiguration(existingField, expectedConfig);
   *
   * if (!analysis.isFullMatch) {
   *   console.log(`发现 ${analysis.differences.length} 项差异:`);
   *   analysis.differences.forEach(diff => {
   *     console.log(`- ${diff.property}: ${diff.from} → ${diff.to} (${diff.severity})`);
   *   });
   * }
   * ```
   */
  analyzeFieldConfiguration(
    existingField: FeishuField,
    expectedConfig: FieldCreationConfig,
  ): Promise<FieldMatchAnalysis>;
}

/**
 * 🔧 字段操作内部接口 - 供实现类使用的内部方法
 *
 * 这些方法封装了具体的API调用逻辑，不对外暴露
 */
export interface IFeishuTableFieldInternalOperations {
  /**
   * 内部方法：创建新字段
   */
  createFieldInternal(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
  ): Promise<FeishuField>;

  /**
   * 内部方法：更新现有字段
   */
  updateFieldInternal(
    credentials: FeishuCredentials,
    tableId: string,
    fieldId: string,
    fieldConfig: FieldCreationConfig,
    changes?: Array<{ property: string; from: unknown; to: unknown }>,
  ): Promise<FeishuField>;

  /**
   * 内部方法：深度比较字段属性
   */
  compareFieldProperties(
    existingProperty: FieldProperty,
    expectedProperty: FieldProperty,
  ): Array<{
    property: string;
    from: unknown;
    to: unknown;
    severity: 'critical' | 'minor';
  }>;

  /**
   * 内部方法：智能重试机制
   */
  withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs?: number,
  ): Promise<T>;

  /**
   * 内部方法：缓存管理
   */
  clearFieldCache(appToken: string, tableId: string): Promise<void>;
}

/**
 * 📈 操作统计接口 - 字段操作的可观测性
 */
export interface IFeishuTableFieldOperationsStats {
  /**
   * 获取字段操作统计信息
   */
  getOperationStats(): Promise<{
    totalOperations: number;
    createdCount: number;
    updatedCount: number;
    unchangedCount: number;
    failedCount: number;
    averageProcessingTime: number;
    successRate: number;
    operationTypeDistribution: Record<string, number>;
    lastOperationTime?: string;
  }>;

  /**
   * 重置统计信息
   */
  resetOperationStats(): Promise<void>;
}

/**
 * 🎯 完整的字段操作服务接口
 *
 * 组合所有接口，形成完整的字段操作能力
 */
export interface IFeishuTableFieldService
  extends IFeishuTableFieldOperations,
    IFeishuTableFieldOperationsStats {
  /**
   * 服务健康检查
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      apiConnectivity: boolean;
      cacheConnectivity: boolean;
      lastSuccessfulOperation?: string;
    };
  }>;
}

// 重新导出核心类型
export {
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
} from '../schemas/field-operations.schema';
