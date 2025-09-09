/**
 * 飞书批量操作 API Schema 定义
 *
 * 基于真实 API 响应设计，支持批量创建/更新/删除操作
 * 设计原则: "未来优先" + "类型唯一性" + "完整性验证"
 */

import { z } from 'zod';
import { FeishuRecordFieldValueSchema } from './record.schema';

/**
 * 批量创建记录请求 Schema
 */
export const FeishuBatchCreateRequestSchema = z.object({
  records: z
    .array(
      z.object({
        fields: z.record(z.string(), FeishuRecordFieldValueSchema),
      }),
    )
    .min(1, '批量创建至少需要一条记录')
    .max(500, '单次批量创建最多500条记录'),
});

/**
 * 批量更新记录请求 Schema
 */
export const FeishuBatchUpdateRequestSchema = z.object({
  records: z
    .array(
      z.object({
        record_id: z.string().min(1, 'record_id不能为空'),
        fields: z.record(z.string(), FeishuRecordFieldValueSchema),
      }),
    )
    .min(1, '批量更新至少需要一条记录')
    .max(500, '单次批量更新最多500条记录'),
});

/**
 * 批量删除记录请求 Schema
 */
export const FeishuBatchDeleteRequestSchema = z.object({
  records: z
    .array(z.string().min(1, 'record_id不能为空'))
    .min(1, '批量删除至少需要一条记录')
    .max(500, '单次批量删除最多500条记录'),
});

/**
 * 批量操作响应 Schema - 基于真实 API 响应结构
 */
export const FeishuBatchOperationResponseSchema = z
  .object({
    // API 状态
    code: z.number().refine((val) => val === 0, { message: '批量操作失败' }),
    msg: z.string(),

    data: z.object({
      // 批量创建响应
      records: z
        .array(
          z.object({
            record_id: z.string(),
            fields: z.record(z.string(), FeishuRecordFieldValueSchema),
            created_time: z.number().optional(),
            last_modified_time: z.number().optional(),
          }),
        )
        .optional(),

      // 批量更新响应
      updated_records: z
        .array(
          z.object({
            record_id: z.string(),
          }),
        )
        .optional(),

      // 批量删除响应
      deleted_records: z.array(z.string()).optional(),

      // 操作失败的记录
      failed_records: z
        .array(
          z.object({
            record_id: z.string().optional(),
            error_code: z.number(),
            error_msg: z.string(),
          }),
        )
        .optional(),

      // 操作统计
      total_count: z.number().optional(),
      success_count: z.number().optional(),
      failed_count: z.number().optional(),
    }),
  })
  .passthrough();

/**
 * 批量操作结果汇总 Schema - 用于内部统计
 */
export const BatchOperationSummarySchema = z.object({
  operationType: z.enum(['create', 'update', 'delete']),
  totalRequested: z.number().min(0),
  totalSuccessful: z.number().min(0),
  totalFailed: z.number().min(0),
  successRate: z.number().min(0).max(1),
  processingTime: z.number().min(0), // 毫秒
  errors: z.array(
    z.object({
      recordId: z.string().optional(),
      error: z.string(),
    }),
  ),
  timestamp: z.string().datetime(),
});

/**
 * 批量操作配置 Schema
 */
export const BatchOperationConfigSchema = z.object({
  batchSize: z.number().min(1).max(500).default(500),
  concurrency: z.number().min(1).max(10).default(3),
  retryAttempts: z.number().min(0).max(5).default(2),
  retryDelay: z.number().min(0).default(1000),
  enableProgressReporting: z.boolean().default(true),
  enableErrorRecovery: z.boolean().default(true),
});

/**
 * 批量操作进度 Schema - 用于实时状态更新
 */
export const BatchOperationProgressSchema = z.object({
  operationId: z.string().uuid(),
  operationType: z.enum(['create', 'update', 'delete']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    total: z.number().min(0),
    processed: z.number().min(0),
    successful: z.number().min(0),
    failed: z.number().min(0),
    currentBatch: z.number().min(0),
    totalBatches: z.number().min(0),
  }),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  estimatedTimeRemaining: z.number().min(0).optional(), // 毫秒
  errors: z.array(z.string()),
});

// ✅ 类型唯一性：所有 TS 类型从 Schema 生成
export type FeishuBatchCreateRequest = z.infer<
  typeof FeishuBatchCreateRequestSchema
>;
export type FeishuBatchUpdateRequest = z.infer<
  typeof FeishuBatchUpdateRequestSchema
>;
export type FeishuBatchDeleteRequest = z.infer<
  typeof FeishuBatchDeleteRequestSchema
>;
export type FeishuBatchOperationResponse = z.infer<
  typeof FeishuBatchOperationResponseSchema
>;
export type BatchOperationSummary = z.infer<typeof BatchOperationSummarySchema>;
export type BatchOperationConfig = z.infer<typeof BatchOperationConfigSchema>;
export type BatchOperationProgress = z.infer<
  typeof BatchOperationProgressSchema
>;

// Schema 导出 - 移除重复导出，避免与上方 export const 冲突
