/**
 * 飞书批量操作 Schema 单元测试
 *
 * 测试原则:
 * 1. 验证合法数据能正确解析
 * 2. 验证非法数据会被正确拒绝
 * 3. 覆盖边界条件和错误场景
 * 4. 确保类型安全和运行时验证一致性
 */

import {
  FeishuBatchCreateRequestSchema,
  FeishuBatchUpdateRequestSchema,
  FeishuBatchDeleteRequestSchema,
  FeishuBatchOperationResponseSchema,
  BatchOperationSummarySchema,
  BatchOperationConfigSchema,
  BatchOperationProgressSchema,
  type FeishuBatchCreateRequest,
  type FeishuBatchUpdateRequest,
  type FeishuBatchDeleteRequest,
  type FeishuBatchOperationResponse,
} from './batch-operations.schema';

describe('FeishuBatchCreateRequestSchema', () => {
  it('should validate valid batch create request', () => {
    const validRequest = {
      records: [
        {
          fields: {
            书名: '测试书籍',
            'Subject ID': 'test123',
            豆瓣评分: 8.5,
          },
        },
        {
          fields: {
            书名: '另一本书',
            'Subject ID': 'test456',
            豆瓣评分: 9.0,
          },
        },
      ],
    };

    const result = FeishuBatchCreateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.records).toHaveLength(2);
      expect(result.data.records[0].fields['书名']).toBe('测试书籍');
    }
  });

  it('should reject empty records array', () => {
    const invalidRequest = { records: [] };
    const result = FeishuBatchCreateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        '批量创建至少需要一条记录',
      );
    }
  });

  it('should reject request with too many records', () => {
    const records = Array.from({ length: 501 }, (_, i) => ({
      fields: { 书名: `Book ${i}` },
    }));
    const invalidRequest = { records };

    const result = FeishuBatchCreateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        '单次批量创建最多500条记录',
      );
    }
  });

  it('should validate complex field values', () => {
    const validRequest = {
      records: [
        {
          fields: {
            书名: '复杂测试',
            评分: 8,
            标签: ['科幻', '经典'],
            是否推荐: true,
            备注: null,
          },
        },
      ],
    };

    const result = FeishuBatchCreateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });
});

describe('FeishuBatchUpdateRequestSchema', () => {
  it('should validate valid batch update request', () => {
    const validRequest = {
      records: [
        {
          record_id: 'rec123456',
          fields: {
            书名: '更新的书名',
            评分: 9.5,
          },
        },
        {
          record_id: 'rec789012',
          fields: {
            状态: '已读',
          },
        },
      ],
    };

    const result = FeishuBatchUpdateRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject update without record_id', () => {
    const invalidRequest = {
      records: [
        {
          fields: { 书名: '测试' },
        },
      ],
    };

    const result = FeishuBatchUpdateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty record_id', () => {
    const invalidRequest = {
      records: [
        {
          record_id: '',
          fields: { 书名: '测试' },
        },
      ],
    };

    const result = FeishuBatchUpdateRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('FeishuBatchDeleteRequestSchema', () => {
  it('should validate valid batch delete request', () => {
    const validRequest = {
      records: ['rec123456', 'rec789012', 'rec345678'],
    };

    const result = FeishuBatchDeleteRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject empty records array', () => {
    const invalidRequest = { records: [] };
    const result = FeishuBatchDeleteRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty record_id in array', () => {
    const invalidRequest = {
      records: ['rec123456', '', 'rec789012'],
    };

    const result = FeishuBatchDeleteRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('FeishuBatchOperationResponseSchema', () => {
  it('should validate successful batch create response', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        records: [
          {
            record_id: 'rec123456',
            fields: {
              书名: '测试书籍',
              'Subject ID': 'test123',
            },
            created_time: 1694764800000,
          },
        ],
        total_count: 1,
        success_count: 1,
        failed_count: 0,
      },
    };

    const result = FeishuBatchOperationResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate response with failed records', () => {
    const responseWithFailures = {
      code: 0,
      msg: 'partial_success',
      data: {
        records: [
          {
            record_id: 'rec123456',
            fields: { 书名: '成功记录' },
          },
        ],
        failed_records: [
          {
            record_id: 'rec789012',
            error_code: 400,
            error_msg: '字段验证失败',
          },
        ],
        total_count: 2,
        success_count: 1,
        failed_count: 1,
      },
    };

    const result =
      FeishuBatchOperationResponseSchema.safeParse(responseWithFailures);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.failed_records).toHaveLength(1);
      expect(result.data.data.failed_records![0].error_msg).toBe(
        '字段验证失败',
      );
    }
  });

  it('should reject error response', () => {
    const errorResponse = {
      code: 400,
      msg: 'Bad Request',
      data: {},
    };

    const result = FeishuBatchOperationResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('批量操作失败');
    }
  });
});

describe('BatchOperationSummarySchema', () => {
  it('should validate complete operation summary', () => {
    const validSummary = {
      operationType: 'create' as const,
      totalRequested: 100,
      totalSuccessful: 98,
      totalFailed: 2,
      successRate: 0.98,
      processingTime: 5432,
      errors: [
        { recordId: 'rec123', error: 'Validation failed' },
        { error: 'Network timeout' },
      ],
      timestamp: '2025-09-08T12:00:00Z',
    };

    const result = BatchOperationSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it('should reject invalid success rate', () => {
    const invalidSummary = {
      operationType: 'update',
      totalRequested: 10,
      totalSuccessful: 12, // 超过请求数量
      totalFailed: 0,
      successRate: 1.2, // 超过1
      processingTime: 1000,
      errors: [],
      timestamp: '2025-09-08T12:00:00Z',
    };

    const result = BatchOperationSummarySchema.safeParse(invalidSummary);
    expect(result.success).toBe(false);
  });
});

describe('BatchOperationConfigSchema', () => {
  it('should validate default configuration', () => {
    const config = {};
    const result = BatchOperationConfigSchema.safeParse(config);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.batchSize).toBe(500);
      expect(result.data.concurrency).toBe(3);
      expect(result.data.retryAttempts).toBe(2);
      expect(result.data.enableProgressReporting).toBe(true);
    }
  });

  it('should validate custom configuration', () => {
    const customConfig = {
      batchSize: 100,
      concurrency: 5,
      retryAttempts: 3,
      retryDelay: 2000,
      enableProgressReporting: false,
      enableErrorRecovery: false,
    };

    const result = BatchOperationConfigSchema.safeParse(customConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid batch size', () => {
    const invalidConfig = { batchSize: 0 };
    const result = BatchOperationConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);

    const invalidConfig2 = { batchSize: 501 };
    const result2 = BatchOperationConfigSchema.safeParse(invalidConfig2);
    expect(result2.success).toBe(false);
  });
});

describe('BatchOperationProgressSchema', () => {
  it('should validate operation progress', () => {
    const validProgress = {
      operationId: '123e4567-e89b-12d3-a456-426614174000',
      operationType: 'create' as const,
      status: 'running' as const,
      progress: {
        total: 1000,
        processed: 250,
        successful: 245,
        failed: 5,
        currentBatch: 3,
        totalBatches: 10,
      },
      startTime: '2025-09-08T10:00:00Z',
      estimatedTimeRemaining: 12000,
      errors: ['Field validation error', 'Network timeout'],
    };

    const result = BatchOperationProgressSchema.safeParse(validProgress);
    expect(result.success).toBe(true);
  });

  it('should validate completed operation', () => {
    const completedProgress = {
      operationId: '123e4567-e89b-12d3-a456-426614174000',
      operationType: 'update' as const,
      status: 'completed' as const,
      progress: {
        total: 500,
        processed: 500,
        successful: 498,
        failed: 2,
        currentBatch: 5,
        totalBatches: 5,
      },
      startTime: '2025-09-08T10:00:00Z',
      endTime: '2025-09-08T10:05:30Z',
      errors: ['Duplicate record detected', 'Invalid field value'],
    };

    const result = BatchOperationProgressSchema.safeParse(completedProgress);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidProgress = {
      operationId: 'not-a-valid-uuid',
      operationType: 'delete',
      status: 'pending',
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: 0,
      },
      errors: [],
    };

    const result = BatchOperationProgressSchema.safeParse(invalidProgress);
    expect(result.success).toBe(false);
  });
});

describe('Type Safety Integration', () => {
  it('should ensure TypeScript types match Schema inference', () => {
    const createRequest: FeishuBatchCreateRequest = {
      records: [
        {
          fields: {
            测试字段: '测试值',
          },
        },
      ],
    };

    // 编译时类型检查 - 如果类型不匹配，TypeScript 会报错
    const parsedRequest = FeishuBatchCreateRequestSchema.parse(createRequest);
    expect(parsedRequest.records[0].fields['测试字段']).toBe('测试值');
  });

  it('should maintain type safety across all batch operation types', () => {
    const updateRequest: FeishuBatchUpdateRequest = {
      records: [
        {
          record_id: 'rec123',
          fields: { 字段: '值' },
        },
      ],
    };

    const deleteRequest: FeishuBatchDeleteRequest = {
      records: ['rec123', 'rec456'],
    };

    const response: FeishuBatchOperationResponse = {
      code: 0,
      msg: 'success',
      data: {
        records: [
          {
            record_id: 'rec123',
            fields: { 字段: '值' },
          },
        ],
      },
    };

    // 编译时验证 - 这些赋值应该不会出现类型错误
    expect(updateRequest.records[0].record_id).toBe('rec123');
    expect(deleteRequest.records).toHaveLength(2);
    expect(response.code).toBe(0);
  });
});
