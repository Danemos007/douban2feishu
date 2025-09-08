/**
 * 飞书契约验证模块统一导出
 *
 * 此模块提供基于Zod的飞书API契约验证能力，解决历史遗留的类型安全问题
 *
 * 核心功能：
 * 1. 运行时类型验证 (替代 `as any` 类型断言)
 * 2. 双模式验证 (开发环境严格，生产环境软验证)
 * 3. 基于真实API响应的Schema设计
 * 4. Rating字段正确识别 (修复历史遗留的isRatingFieldType问题)
 */

// Schema定义 - 重新导出从 schemas 目录迁移的文件
export {
  FeishuFieldsResponseSchema,
  FeishuFieldSchema,
  FeishuFieldPropertySchema,
  RatingFieldSchema,
  isRatingField,
  extractFieldTypeMapping,
  FeishuFieldType,
  FeishuUiType,
} from '../schemas/field.schema';

export {
  FeishuAuthRequestSchema,
  FeishuTokenResponseSchema,
  TokenCacheInfoSchema,
  calculateTokenExpiry,
  isTokenExpiringSoon,
} from '../schemas/auth.schema';

export {
  FeishuRecordSchema,
  FeishuRecordsResponseSchema,
  FeishuRecordCreateRequestSchema,
  FeishuSearchRecordRequestSchema,
  FeishuRecordFieldValueSchema,
} from '../schemas/record.schema';

// 🚀 新增：统一字段操作Schema
export {
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
} from '../schemas/field-operations.schema';

// 类型定义 (从Schema生成，确保类型唯一性)
export type {
  FeishuField,
  FeishuFieldsResponse,
  FeishuFieldProperty,
  RatingField,
} from '../schemas/field.schema';

export type {
  FeishuAuthRequest,
  FeishuTokenResponse,
  TokenCacheInfo,
} from '../schemas/auth.schema';

export type {
  FeishuRecord,
  FeishuRecordsResponse,
  FeishuRecordCreateRequest,
  FeishuSearchRecordRequest,
  FeishuRecordFieldValue,
} from '../schemas/record.schema';

// 🚀 新增：统一字段操作类型
export type {
  FeishuCredentials,
  FieldOperationStrategy,
  ConflictResolution,
  FieldOperationOptions,
  ConfigurationChange,
  FieldOperationResult,
  BatchOperationSummary,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
} from '../schemas/field-operations.schema';

// 验证服务
export {
  FeishuContractValidatorService,
  type ValidationStats,
} from './validator.service';
