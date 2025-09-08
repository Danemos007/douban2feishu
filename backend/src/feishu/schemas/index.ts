/**
 * 飞书 API Zod Schemas 统一导出
 * 
 * 此模块提供完整的飞书 API 类型安全保障，遵循"未来优先"原则
 * 所有 Schema 基于真实 API 响应设计，确保契约验证的准确性
 * 
 * 设计原则:
 * 1. 未来优先 - 包含所有 API 字段，即使暂不使用
 * 2. 类型唯一性 - 所有 TS 类型从 Schema 生成
 * 3. 运行时验证 - 替代 any 类型，提供契约保障
 * 4. 易于测试 - Schema 设计便于单元测试验证
 */

// 重新导出现在在同目录中的 Schema（保持兼容性）
export {
  // 认证相关
  FeishuAuthRequestSchema,
  FeishuTokenResponseSchema,
  TokenCacheInfoSchema,
  calculateTokenExpiry,
  isTokenExpiringSoon,
} from './auth.schema';

export {
  // 字段相关
  FeishuFieldsResponseSchema,
  FeishuFieldSchema,
  FeishuFieldPropertySchema,
  RatingFieldSchema,
  isRatingField,
  extractFieldTypeMapping,
  FeishuFieldType,
  FeishuUiType,
} from './field.schema';

export {
  // 记录相关
  FeishuRecordSchema,
  FeishuRecordsResponseSchema,
  FeishuRecordCreateRequestSchema,
  FeishuSearchRecordRequestSchema,
  FeishuRecordFieldValueSchema,
} from './record.schema';

export {
  // 字段创建相关
  FieldCreationRequestSchema,
  FieldCreationResponseSchema,
  FieldCreationConfigSchema,
  FieldPropertySchema,
  StatusOptionSchema,
  BatchFieldCreationRequestSchema,
  BatchFieldCreationResultSchema,
  ContentTypeSchema,
  ContentTypeConfigSchema,
  FieldCreationStatsSchema,
} from './field-creation.schema';

export {
  // 字段操作相关
  FeishuCredentialsSchema,
  FieldOperationOptionsSchema,
  FieldOperationResultSchema,
  BatchFieldOperationResultSchema,
  FieldMatchAnalysisSchema,
  FieldOperationStrategySchema,
  ConflictResolutionSchema,
  ConfigurationChangeSchema,
  BatchOperationSummarySchema,
  FieldOperationError,
  FieldConfigurationMismatchError,
  FieldNotFoundError,
} from './field-operations.schema';

// 字段映射相关
export * from './field-mapping.schema';

// 导出类型定义
export type {
  // 认证类型
  FeishuAuthRequest,
  FeishuTokenResponse,
  TokenCacheInfo,
} from './auth.schema';

export type {
  // 字段类型
  FeishuField,
  FeishuFieldsResponse,
  FeishuFieldProperty,
  RatingField,
} from './field.schema';

export type {
  // 记录类型
  FeishuRecord,
  FeishuRecordsResponse,
  FeishuRecordCreateRequest,
  FeishuSearchRecordRequest,
  FeishuRecordFieldValue,
} from './record.schema';

export type {
  // 字段创建类型
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
} from './field-creation.schema';

export type {
  // 字段操作类型
  FeishuCredentials,
  FieldOperationStrategy,
  ConflictResolution,
  FieldOperationOptions,
  ConfigurationChange,
  FieldOperationResult,
  BatchOperationSummary,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
} from './field-operations.schema';

// 新增：批量操作相关 Schema
export * from './batch-operations.schema';
export * from './table-metadata.schema';
export * from './api-responses.schema';

// 验证服务 - 保持在 contract 目录中
export {
  FeishuContractValidatorService,
  type ValidationStats,
} from '../contract/validator.service';