/**
 * 🚀 字段自动创建接口 V2.0 - 极简重构版
 *
 * 革命性设计：
 * - 基于统一字段操作接口构建
 * - 极大简化接口复杂度
 * - 完全向后兼容V1接口
 * - 为未来统一架构奠定基础
 */

import {
  FieldCreationRequest,
  FieldCreationResponse,
  BatchFieldCreationResult,
  FieldCreationStats,
} from '../contract/field-creation.schema';

/**
 * 🎯 极简字段自动创建服务接口 V2.0
 *
 * 相比V1版本的简化：
 * - 保持相同的公共API契约
 * - 移除了复杂的内部配置接口
 * - 统一使用FeishuCredentials对象
 * - 委托所有复杂逻辑给统一接口
 */
export interface IFieldAutoCreationServiceV2 {
  /**
   * 🎯 智能字段创建 - 自动处理存在性检查、配置匹配
   *
   * 相比V1的改进：
   * - 自动检查字段是否存在
   * - 自动匹配配置差异
   * - 自动重试失败操作
   * - 完整的操作追踪
   */
  createFieldWithContentTypeSupport(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    request: FieldCreationRequest,
  ): Promise<FieldCreationResponse>;

  /**
   * 🔄 智能批量字段创建 - 极简但强大
   *
   * 相比V1的改进：
   * - 自动失败隔离
   * - 智能延迟控制
   * - 完整的批量统计
   * - 并发性能优化
   */
  batchCreateFieldsWithSmartDelay(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    requests: FieldCreationRequest[],
  ): Promise<BatchFieldCreationResult>;

  /**
   * 🔍 字段存在性检查 - 一行代码实现
   */
  checkFieldExists(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldName: string,
  ): Promise<boolean>;

  /**
   * 📊 获取统计信息 - 委托给统一接口
   */
  getCreationStats(): Promise<FieldCreationStats>;

  /**
   * 🗑️ 重置统计 - 委托给统一接口
   */
  resetStats(): Promise<void>;
}

/**
 * 🔧 极简配置选项 - 仅保留核心配置
 *
 * 移除V1中的复杂配置，统一使用FieldOperationOptions
 */
export interface FieldAutoCreationOptionsV2 {
  /**
   * 操作策略
   */
  strategy?: 'create_only' | 'update_only' | 'ensure_correct';

  /**
   * 冲突解决方案
   */
  conflictResolution?: 'update_existing' | 'throw_error' | 'skip_operation';

  /**
   * 是否启用详细日志
   */
  enableDetailedLogging?: boolean;

  /**
   * 操作延迟（毫秒）
   */
  operationDelay?: number;

  /**
   * 最大重试次数
   */
  maxRetries?: number;
}

/**
 * 📈 极简统计结果 - 基于统一接口的操作统计
 */
export interface FieldOperationStatsV2 {
  /**
   * 总操作数
   */
  totalOperations: number;

  /**
   * 创建数量
   */
  created: number;

  /**
   * 更新数量
   */
  updated: number;

  /**
   * 未变更数量
   */
  unchanged: number;

  /**
   * 失败数量
   */
  failed: number;

  /**
   * 平均处理时间
   */
  averageProcessingTime: number;

  /**
   * 成功率
   */
  successRate: number;
}

/**
 * 🚀 未来迁移接口 - 为完全统一做准备
 *
 * 当所有服务都迁移到统一接口后，可以进一步简化
 */
export interface IUnifiedFieldService {
  /**
   * 通用字段操作 - 基于FeishuCredentials的统一调用
   */
  ensureField(
    credentials: {
      appId: string;
      appSecret: string;
      appToken: string;
    },
    tableId: string,
    fieldConfig: {
      field_name: string;
      type: number;
      ui_type: string;
      property?: any;
      description?: { text: string };
    },
    options?: FieldAutoCreationOptionsV2,
  ): Promise<{
    field: any;
    operation: 'created' | 'updated' | 'unchanged';
    processingTime: number;
  }>;

  /**
   * 批量字段操作
   */
  ensureFields(
    credentials: {
      appId: string;
      appSecret: string;
      appToken: string;
    },
    tableId: string,
    fieldConfigs: Array<{
      field_name: string;
      type: number;
      ui_type: string;
      property?: any;
      description?: { text: string };
    }>,
    options?: FieldAutoCreationOptionsV2,
  ): Promise<{
    results: Array<{
      field: any;
      operation: 'created' | 'updated' | 'unchanged';
      processingTime: number;
    }>;
    summary: {
      total: number;
      created: number;
      updated: number;
      unchanged: number;
      failed: number;
    };
  }>;
}

/**
 * 重新导出核心类型，保持兼容性
 */
export {
  FieldCreationRequest,
  FieldCreationResponse,
  BatchFieldCreationResult,
  FieldCreationStats,
} from '../contract/field-creation.schema';

export {
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
} from '../contract/field-operations.schema';
