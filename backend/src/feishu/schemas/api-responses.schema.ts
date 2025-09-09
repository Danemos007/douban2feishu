/**
 * 飞书 API 通用响应 Schema 定义
 *
 * 基于真实 API 响应设计，提供标准化的响应结构验证
 * 设计原则: "未来优先" + "类型唯一性" + "错误处理完善"
 */

import { z } from 'zod';

/**
 * 飞书 API 基础响应 Schema
 */
export const FeishuBaseResponseSchema = z
  .object({
    code: z.number(),
    msg: z.string(),
  })
  .passthrough();

/**
 * 飞书 API 成功响应 Schema
 */
export const FeishuSuccessResponseSchema = FeishuBaseResponseSchema.extend({
  code: z.literal(0),
}).passthrough();

/**
 * 飞书 API 错误响应 Schema - 基于真实错误响应结构
 */
export const FeishuErrorResponseSchema = z
  .object({
    code: z
      .number()
      .refine((val) => val !== 0, { message: '这不是一个错误响应' }),
    msg: z.string().min(1),

    // 详细错误信息（某些 API 会提供）
    error: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),

    // 请求追踪信息
    request_id: z.string().optional(),
    trace_id: z.string().optional(),

    // 限流相关信息
    rate_limit: z
      .object({
        quota: z.number(),
        quota_consumed: z.number(),
        rate_limit_status: z.string(),
        rate_limit_detail: z
          .array(
            z.object({
              period: z.string(),
              limit: z.number(),
              consumed: z.number(),
            }),
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

/**
 * 飞书 API 分页响应 Schema - 通用分页结构
 */
export const FeishuPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  FeishuSuccessResponseSchema.extend({
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().min(0).optional(),
      has_more: z.boolean(),
      page_token: z.string().optional(),
      page_size: z.number().min(1).optional(),
    }),
  });

/**
 * 飞书 API 单项响应 Schema - 通用单项结构
 */
export const FeishuSingleItemResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  FeishuSuccessResponseSchema.extend({
    data: itemSchema,
  });

/**
 * 飞书 API 操作响应 Schema - 通用操作结果
 */
export const FeishuOperationResponseSchema = FeishuSuccessResponseSchema.extend(
  {
    data: z.object({
      success: z.boolean(),
      affected_count: z.number().min(0).optional(),
      operation_id: z.string().optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  },
);

/**
 * 飞书 API 限流信息 Schema
 */
export const FeishuRateLimitInfoSchema = z.object({
  quota_type: z.string(),
  quota_limit: z.number(),
  quota_consumed: z.number(),
  quota_remaining: z.number(),
  quota_reset_time: z.number().optional(), // Unix timestamp
  rate_limit_level: z.enum(['app', 'tenant', 'user']).optional(),
});

/**
 * 飞书 API 请求上下文 Schema - 用于内部请求追踪
 */
export const FeishuRequestContextSchema = z
  .object({
    endpoint: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    app_token: z.string().optional(),
    table_id: z.string().optional(),
    request_id: z.string().uuid(),
    user_id: z.string().optional(),
    tenant_id: z.string().optional(),
    timestamp: z.number(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

/**
 * 飞书 API 响应元数据 Schema - 用于响应分析和监控
 */
export const FeishuResponseMetadataSchema = z
  .object({
    request_id: z.string(),
    response_time: z.number().min(0), // 毫秒
    status_code: z.number().min(100).max(599),
    content_length: z.number().min(0).optional(),
    rate_limit_info: FeishuRateLimitInfoSchema.optional(),
    cache_status: z.enum(['hit', 'miss', 'bypass']).optional(),
    server_region: z.string().optional(),
    api_version: z.string().optional(),
  })
  .passthrough();

/**
 * 飞书 API 健康检查响应 Schema
 */
export const FeishuHealthCheckResponseSchema = z
  .object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string().datetime(),
    version: z.string(),
    services: z.object({
      auth: z.enum(['up', 'down', 'degraded']),
      bitable: z.enum(['up', 'down', 'degraded']),
      drive: z.enum(['up', 'down', 'degraded']).optional(),
    }),
    response_time: z.number().min(0),
    region: z.string().optional(),
  })
  .passthrough();

/**
 * 通用错误代码映射 - 基于飞书 API 文档
 */
export const FeishuErrorCodeMap = {
  // 认证相关错误
  99991663: 'app_token 无效',
  99991668: 'tenant_access_token 无效',
  99991664: 'user_access_token 无效',

  // 权限相关错误
  99991001: '无权限访问',
  99991002: '应用未开通权限',
  99991003: '用户未授权',

  // 参数相关错误
  99991400: '请求参数无效',
  99991404: '资源不存在',
  99991405: '请求方法不支持',
  99991413: '请求体过大',

  // 限流相关错误
  99991630: 'API 调用频率超限',
  99991631: '租户级别限流',
  99991632: '应用级别限流',

  // 系统相关错误
  99991500: '系统内部错误',
  99991503: '服务不可用',
  99991504: '请求超时',
} as const;

// ✅ 类型唯一性：所有 TS 类型从 Schema 生成
export type FeishuBaseResponse = z.infer<typeof FeishuBaseResponseSchema>;
export type FeishuSuccessResponse = z.infer<typeof FeishuSuccessResponseSchema>;
export type FeishuErrorResponse = z.infer<typeof FeishuErrorResponseSchema>;
export type FeishuOperationResponse = z.infer<
  typeof FeishuOperationResponseSchema
>;
export type FeishuRateLimitInfo = z.infer<typeof FeishuRateLimitInfoSchema>;
export type FeishuRequestContext = z.infer<typeof FeishuRequestContextSchema>;
export type FeishuResponseMetadata = z.infer<
  typeof FeishuResponseMetadataSchema
>;
export type FeishuHealthCheckResponse = z.infer<
  typeof FeishuHealthCheckResponseSchema
>;

// 泛型类型
export type FeishuPaginatedResponse<T> = z.infer<
  ReturnType<typeof FeishuPaginatedResponseSchema<z.ZodType<T>>>
>;
export type FeishuSingleItemResponse<T> = z.infer<
  ReturnType<typeof FeishuSingleItemResponseSchema<z.ZodType<T>>>
>;

// Schema 导出 - 移除重复导出，避免与上方 export const 冲突

/**
 * 辅助函数：错误代码转换为用户友好的错误信息
 */
export function getErrorMessage(code: number): string {
  return (
    FeishuErrorCodeMap[code as keyof typeof FeishuErrorCodeMap] ||
    `未知错误 (${code})`
  );
}

/**
 * 辅助函数：判断响应是否成功
 */
export function isSuccessResponse(
  response: FeishuBaseResponse,
): response is FeishuSuccessResponse {
  return response.code === 0;
}

/**
 * 辅助函数：判断是否为限流错误
 */
export function isRateLimitError(response: FeishuBaseResponse): boolean {
  return [99991630, 99991631, 99991632].includes(response.code);
}
