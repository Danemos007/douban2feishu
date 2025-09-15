/**
 * 飞书 API 响应 Schema 单元测试
 *
 * 测试原则:
 * 1. 验证各种响应格式能正确解析
 * 2. 验证错误响应能被正确识别
 * 3. 测试错误代码映射的准确性
 * 4. 确保类型安全和辅助函数的正确性
 */

import {
  FeishuBaseResponseSchema,
  FeishuSuccessResponseSchema,
  FeishuErrorResponseSchema,
  FeishuPaginatedResponseSchema,
  FeishuSingleItemResponseSchema,
  FeishuOperationResponseSchema,
  FeishuRateLimitInfoSchema,
  FeishuRequestContextSchema,
  FeishuHealthCheckResponseSchema,
  FeishuErrorCodeMap,
  getErrorMessage,
  isSuccessResponse,
  isRateLimitError,
  type FeishuBaseResponse,
  type FeishuSuccessResponse,
  type FeishuErrorResponse,
} from './api-responses.schema';
import { z } from 'zod';

describe('FeishuBaseResponseSchema', () => {
  it('should validate basic response structure', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
    };

    const result = FeishuBaseResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe(0);
      expect(result.data.msg).toBe('success');
    }
  });

  it('should allow additional fields with passthrough', () => {
    const responseWithExtra = {
      code: 0,
      msg: 'success',
      extra_field: 'should be preserved',
      nested: { data: 'test' },
    };

    const result = FeishuBaseResponseSchema.safeParse(responseWithExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra_field).toBe('should be preserved');
      expect(result.data.nested).toEqual({ data: 'test' });
    }
  });

  it('should reject response without required fields', () => {
    const incompleteResponse = { code: 0 };
    const result = FeishuBaseResponseSchema.safeParse(incompleteResponse);
    expect(result.success).toBe(false);
  });
});

describe('FeishuSuccessResponseSchema', () => {
  it('should validate successful response', () => {
    const successResponse = {
      code: 0,
      msg: 'ok',
      data: { some: 'data' },
    };

    const result = FeishuSuccessResponseSchema.safeParse(successResponse);
    expect(result.success).toBe(true);
  });

  it('should reject non-zero code', () => {
    const errorResponse = {
      code: 400,
      msg: 'error',
    };

    const result = FeishuSuccessResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(false);
  });
});

describe('FeishuErrorResponseSchema', () => {
  it('should validate error response with minimal fields', () => {
    const errorResponse = {
      code: 400,
      msg: 'Bad Request',
    };

    const result = FeishuErrorResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(true);
  });

  it('should validate error response with full details', () => {
    const detailedErrorResponse = {
      code: 99991400,
      msg: '请求参数无效',
      error: 'INVALID_PARAMETER',
      details: {
        field: 'app_token',
        reason: 'missing',
      },
      request_id: 'req-123456-789',
      trace_id: 'trace-abc-def',
      rate_limit: {
        quota: 1000,
        quota_consumed: 950,
        rate_limit_status: 'approaching_limit',
        rate_limit_detail: [
          {
            period: 'hour',
            limit: 1000,
            consumed: 950,
          },
        ],
      },
    };

    const result = FeishuErrorResponseSchema.safeParse(detailedErrorResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('INVALID_PARAMETER');
      expect(result.data.rate_limit?.quota).toBe(1000);
      expect(result.data.rate_limit?.rate_limit_detail?.[0].consumed).toBe(950);
    }
  });

  it('should reject zero code (success response)', () => {
    const successResponse = {
      code: 0,
      msg: 'success',
    };

    const result = FeishuErrorResponseSchema.safeParse(successResponse);
    expect(result.success).toBe(false);
  });
});

describe('FeishuPaginatedResponseSchema', () => {
  it('should validate paginated response with items', () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const PaginatedSchema = FeishuPaginatedResponseSchema(ItemSchema);

    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
        total: 2,
        has_more: false,
        page_token: 'next_page_token',
        page_size: 10,
      },
    };

    const result = PaginatedSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.items).toHaveLength(2);
      expect(result.data.data.items[0].id).toBe('1');
      expect(result.data.data.has_more).toBe(false);
    }
  });

  it('should validate empty paginated response', () => {
    const ItemSchema = z.object({ id: z.string() });
    const PaginatedSchema = FeishuPaginatedResponseSchema(ItemSchema);

    const emptyResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [],
        has_more: false,
      },
    };

    const result = PaginatedSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });
});

describe('FeishuSingleItemResponseSchema', () => {
  it('should validate single item response', () => {
    const ItemSchema = z.object({
      field_id: z.string(),
      field_name: z.string(),
    });

    const SingleItemSchema = FeishuSingleItemResponseSchema(ItemSchema);

    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        field_id: 'fld123456',
        field_name: '测试字段',
      },
    };

    const result = SingleItemSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.field_id).toBe('fld123456');
      expect(result.data.data.field_name).toBe('测试字段');
    }
  });
});

describe('FeishuOperationResponseSchema', () => {
  it('should validate operation response', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        success: true,
        affected_count: 5,
        operation_id: 'op_123456789',
        details: {
          created: 3,
          updated: 2,
        },
      },
    };

    const result = FeishuOperationResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.success).toBe(true);
      expect(result.data.data.affected_count).toBe(5);
    }
  });
});

describe('FeishuRateLimitInfoSchema', () => {
  it('should validate complete rate limit info', () => {
    const validInfo = {
      quota_type: 'app_token',
      quota_limit: 10000,
      quota_consumed: 8500,
      quota_remaining: 1500,
      quota_reset_time: 1694764800,
      rate_limit_level: 'app' as const,
    };

    const result = FeishuRateLimitInfoSchema.safeParse(validInfo);
    expect(result.success).toBe(true);
  });

  it('should validate minimal rate limit info', () => {
    const minimalInfo = {
      quota_type: 'tenant_access_token',
      quota_limit: 1000,
      quota_consumed: 100,
      quota_remaining: 900,
    };

    const result = FeishuRateLimitInfoSchema.safeParse(minimalInfo);
    expect(result.success).toBe(true);
  });
});

describe('FeishuRequestContextSchema', () => {
  it('should validate complete request context', () => {
    const validContext = {
      endpoint:
        'https://open.feishu.cn/open-apis/bitable/v1/apps/test/tables/test/records',
      method: 'POST' as const,
      app_token: 'bascnCMII2ORuAUfUn',
      table_id: 'tblsRc9GRRXKqhvW',
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 'ou_123456789',
      tenant_id: '2ed263bf32cf1651',
      timestamp: 1694764800000,
      headers: {
        Authorization: 'Bearer t-xxx',
        'Content-Type': 'application/json',
      },
    };

    const result = FeishuRequestContextSchema.safeParse(validContext);
    expect(result.success).toBe(true);
  });

  it('should validate minimal request context', () => {
    const minimalContext = {
      endpoint:
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST' as const,
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: 1694764800000,
    };

    const result = FeishuRequestContextSchema.safeParse(minimalContext);
    expect(result.success).toBe(true);
  });
});

describe('FeishuHealthCheckResponseSchema', () => {
  it('should validate healthy status response', () => {
    const healthyResponse = {
      status: 'healthy' as const,
      timestamp: '2025-09-08T12:00:00Z',
      version: '1.0.0',
      services: {
        auth: 'up' as const,
        bitable: 'up' as const,
        drive: 'up' as const,
      },
      response_time: 25,
      region: 'us-east-1',
    };

    const result = FeishuHealthCheckResponseSchema.safeParse(healthyResponse);
    expect(result.success).toBe(true);
  });

  it('should validate degraded status response', () => {
    const degradedResponse = {
      status: 'degraded' as const,
      timestamp: '2025-09-08T12:00:00Z',
      version: '1.0.0',
      services: {
        auth: 'up' as const,
        bitable: 'degraded' as const,
      },
      response_time: 150,
    };

    const result = FeishuHealthCheckResponseSchema.safeParse(degradedResponse);
    expect(result.success).toBe(true);
  });
});

describe('Error Code Mapping and Helper Functions', () => {
  it('should map known error codes correctly', () => {
    expect(getErrorMessage(99991663)).toBe('app_token 无效');
    expect(getErrorMessage(99991668)).toBe('tenant_access_token 无效');
    expect(getErrorMessage(99991630)).toBe('API 调用频率超限');
    expect(getErrorMessage(99991500)).toBe('系统内部错误');
  });

  it('should handle unknown error codes', () => {
    expect(getErrorMessage(999999)).toBe('未知错误 (999999)');
  });

  it('should identify success responses correctly', () => {
    const successResponse: FeishuBaseResponse = { code: 0, msg: 'ok' };
    const errorResponse: FeishuBaseResponse = { code: 400, msg: 'error' };

    expect(isSuccessResponse(successResponse)).toBe(true);
    expect(isSuccessResponse(errorResponse)).toBe(false);
  });

  it('should identify rate limit errors correctly', () => {
    const rateLimitResponse: FeishuBaseResponse = {
      code: 99991630,
      msg: 'rate limited',
    };
    const tenantLimitResponse: FeishuBaseResponse = {
      code: 99991631,
      msg: 'tenant limited',
    };
    const normalErrorResponse: FeishuBaseResponse = {
      code: 99991400,
      msg: 'bad request',
    };

    expect(isRateLimitError(rateLimitResponse)).toBe(true);
    expect(isRateLimitError(tenantLimitResponse)).toBe(true);
    expect(isRateLimitError(normalErrorResponse)).toBe(false);
  });
});

describe('Type Safety Integration', () => {
  it('should ensure TypeScript types match Schema inference', () => {
    const baseResponse: FeishuBaseResponse = {
      code: 0,
      msg: 'success',
    };

    const successResponse: FeishuSuccessResponse = {
      code: 0,
      msg: 'success',
    };

    const errorResponse: FeishuErrorResponse = {
      code: 400,
      msg: 'Bad Request',
    };

    // 编译时类型检查 - 如果类型不匹配，TypeScript 会报错
    expect(baseResponse.code).toBe(0);
    expect(successResponse.code).toBe(0);
    expect(errorResponse.code).toBe(400);
  });

  it('should support generic paginated responses', () => {
    // 这应该在编译时通过类型检查
    const createPaginatedResponse = () => {
      const ItemSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      return FeishuPaginatedResponseSchema(ItemSchema);
    };

    const schema = createPaginatedResponse();
    const testResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [{ id: '1', name: 'Test' }],
        has_more: false,
      },
    };

    const result = schema.safeParse(testResponse);
    expect(result.success).toBe(true);
  });

  it('should maintain error code type consistency', () => {
    // 编译时验证错误代码类型的一致性
    const errorCodes = Object.keys(FeishuErrorCodeMap).map(Number);

    expect(errorCodes).toContain(99991663);
    expect(errorCodes).toContain(99991630);
    expect(errorCodes).toContain(99991500);

    // 确保所有错误代码都有对应的消息
    errorCodes.forEach((code) => {
      expect(getErrorMessage(code)).not.toBe(`未知错误 (${code})`);
    });
  });
});
