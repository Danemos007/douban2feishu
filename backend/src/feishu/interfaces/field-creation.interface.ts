/**
 * 字段自动创建接口定义
 *
 * 基于Schema的类型定义，遵循"类型唯一性"原则
 * 所有类型都从Zod Schema生成，确保运行时和编译时类型一致
 *
 * 🚀 面向未来重构：
 * - 保持现有IFieldAutoCreationService接口的向后兼容
 * - 整合新的统一字段操作接口
 * - 为渐进式迁移做准备
 */

import {
  FieldCreationRequest,
  FieldCreationResponse,
  FieldCreationConfig,
  FieldProperty,
  StatusOption,
  BatchFieldCreationRequest,
  BatchFieldCreationResult,
  ContentType,
  ContentTypeConfig,
  FieldCreationStats,
} from '../contract/field-creation.schema';

// 🔥 新增：统一字段操作相关类型
import {
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
  FieldOperationStrategy,
  ConflictResolution,
  ConfigurationChange,
} from '../contract/field-operations.schema';

// 🔥 新增：统一字段操作接口
import {
  IFeishuTableFieldOperations,
  IFeishuTableFieldService,
} from './table-field-operations.interface';

// 重新导出Schema类型，提供清晰的接口层
export {
  // 🔄 现有字段创建类型
  FieldCreationRequest,
  FieldCreationResponse,
  FieldCreationConfig,
  FieldProperty,
  StatusOption,
  BatchFieldCreationRequest,
  BatchFieldCreationResult,
  ContentType,
  ContentTypeConfig,
  FieldCreationStats,

  // 🚀 新增：统一字段操作类型
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
  FieldOperationStrategy,
  ConflictResolution,
  ConfigurationChange,

  // 🚀 新增：统一字段操作接口
  IFeishuTableFieldOperations,
  IFeishuTableFieldService,
};

/**
 * 字段自动创建服务接口
 *
 * 定义核心服务的公共契约
 */
export interface IFieldAutoCreationService {
  /**
   * 创建单个字段
   */
  createFieldWithContentTypeSupport(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    request: FieldCreationRequest,
  ): Promise<FieldCreationResponse>;

  /**
   * 批量创建字段（带智能延迟）
   */
  batchCreateFieldsWithSmartDelay(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    requests: FieldCreationRequest[],
  ): Promise<BatchFieldCreationResult>;

  /**
   * 检查字段是否存在
   */
  checkFieldExists(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldName: string,
  ): Promise<boolean>;

  /**
   * 获取字段创建统计信息
   */
  getCreationStats(): Promise<FieldCreationStats>;

  /**
   * 重置统计信息
   */
  resetStats(): Promise<void>;
}

/**
 * 字段配置管理器接口
 *
 * 负责不同内容类型的字段模板管理
 */
export interface IFieldCreationConfigManager {
  /**
   * 获取内容类型配置
   */
  getContentTypeConfig(contentType: ContentType): ContentTypeConfig;

  /**
   * 获取字段模板
   */
  getFieldTemplate(
    contentType: ContentType,
    fieldName: string,
  ): FieldCreationConfig | null;

  /**
   * 获取状态选项
   */
  getStatusOptions(contentType: ContentType): StatusOption[];

  /**
   * 验证字段名是否支持
   */
  isFieldNameSupported(fieldName: string, contentType: ContentType): boolean;
}

/**
 * 字段创建策略接口
 *
 * 支持不同的字段创建策略
 */
export interface IFieldCreationStrategy {
  /**
   * 构建字段配置
   */
  buildFieldConfig(request: FieldCreationRequest): FieldCreationConfig;

  /**
   * 验证字段配置
   */
  validateFieldConfig(config: FieldCreationConfig): boolean;

  /**
   * 应用字段特定配置
   */
  applyFieldSpecificConfig(
    config: FieldCreationConfig,
    fieldName: string,
    contentType: ContentType,
  ): FieldCreationConfig;
}

/**
 * 字段创建结果详情
 */
export interface FieldCreationResult {
  success: boolean;
  field?: FieldCreationResponse;
  error?: string;
  processingTime: number; // 毫秒
}

/**
 * 字段创建选项
 */
export interface FieldCreationOptions {
  /**
   * 是否跳过已存在的字段
   */
  skipExisting?: boolean;

  /**
   * 创建间隔（毫秒）
   */
  delayBetweenCreations?: number;

  /**
   * 最大重试次数
   */
  maxRetries?: number;

  /**
   * 进度回调
   */
  onProgress?: (processed: number, total: number) => void;

  /**
   * 错误回调
   */
  onError?: (error: string, request: FieldCreationRequest) => void;
}

/**
 * 字段创建上下文
 */
export interface FieldCreationContext {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  contentType: ContentType;
  options?: FieldCreationOptions;
}

/**
 * 字段类型映射
 */
export interface FieldTypeMapping {
  [fieldName: string]: {
    type: number;
    ui_type: string;
    supportedContentTypes: ContentType[];
    description: string;
  };
}

/**
 * 字段创建事件
 */
export interface FieldCreationEvent {
  type: 'created' | 'failed' | 'skipped' | 'progress';
  timestamp: Date;
  fieldName: string;
  contentType: ContentType;
  data?: any;
}

/**
 * 字段创建监听器
 */
export interface IFieldCreationEventListener {
  onFieldCreated(event: FieldCreationEvent): void;
  onFieldCreationFailed(event: FieldCreationEvent): void;
  onFieldCreationSkipped(event: FieldCreationEvent): void;
  onProgress(event: FieldCreationEvent): void;
}

/**
 * 字段创建策略枚举
 */
export enum FieldCreationStrategy {
  SKIP_EXISTING = 'skip_existing',
  UPDATE_EXISTING = 'update_existing',
  FAIL_ON_EXISTING = 'fail_on_existing',
}

/**
 * 字段创建策略配置
 */
export interface FieldCreationStrategyConfig {
  strategy: FieldCreationStrategy;
  updateFields?: string[]; // 允许更新的字段列表
}

/**
 * 高级字段创建选项
 */
export interface AdvancedFieldCreationOptions extends FieldCreationOptions {
  /**
   * 字段创建策略
   */
  strategy?: FieldCreationStrategyConfig;

  /**
   * 事件监听器
   */
  eventListener?: IFieldCreationEventListener;

  /**
   * 是否启用详细日志
   */
  enableDetailedLogging?: boolean;

  /**
   * 自定义字段属性
   */
  customProperties?: Record<string, any>;
}

/**
 * 字段创建工厂接口
 */
export interface IFieldCreationFactory {
  /**
   * 创建字段创建器
   */
  createFieldCreator(context: FieldCreationContext): IFieldAutoCreationService;

  /**
   * 创建配置管理器
   */
  createConfigManager(): IFieldCreationConfigManager;

  /**
   * 创建字段策略
   */
  createFieldStrategy(
    strategyType: FieldCreationStrategy,
  ): IFieldCreationStrategy;
}
