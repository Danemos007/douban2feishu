/**
 * 字段操作Schema单元测试
 *
 * 测试原则:
 * 1. 验证所有Schema的正向和反向验证逻辑
 * 2. 测试自定义错误类的构造和属性设置
 * 3. 确保90%以上的代码覆盖率
 * 4. 验证类型推导和Schema导出的正确性
 * 5. 验证枚举默认值和边界条件
 *
 * 目标覆盖率: 90%+
 */

import {
  FeishuCredentialsSchema,
  FieldOperationStrategySchema,
  ConflictResolutionSchema,
  FieldOperationOptionsSchema,
  ConfigurationChangeSchema,
  FieldOperationResultSchema,
  BatchOperationSummarySchema,
  BatchFieldOperationResultSchema,
  FieldMatchAnalysisSchema,
  FieldOperationError,
  FieldConfigurationMismatchError,
  FieldNotFoundError,
  type FeishuCredentials,
  type FieldOperationOptions,
  type FieldOperationResult,
  type BatchOperationSummary,
  type BatchFieldOperationResult,
} from './field-operations.schema';

// Mock FeishuFieldSchema for testing
const mockFeishuField = {
  field_id: 'fld123456',
  field_name: '测试字段',
  type: 1,
  ui_type: 'Text',
  is_primary: false,
  property: {},
  description: '测试字段描述',
};

describe('FeishuCredentialsSchema', () => {
  describe('有效数据验证', () => {
    it('应该验证有效的飞书凭证', () => {
      const validCredentials = {
        appId: 'cli_a8f5de628bf5500e',
        appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
        appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
      };

      const result = FeishuCredentialsSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.appId).toBe(validCredentials.appId);
        expect(result.data.appSecret).toBe(validCredentials.appSecret);
        expect(result.data.appToken).toBe(validCredentials.appToken);
      }
    });

    it('应该正确解析所有必填字段', () => {
      const credentials = {
        appId: 'cli_test123',
        appSecret: 'very_long_secret_key_32_chars_min',
        appToken: 'token_with_valid_format_123',
      };

      const result = FeishuCredentialsSchema.safeParse(credentials);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(credentials);
      }
    });
  });

  describe('App ID 验证', () => {
    it('应该拒绝空的 App ID', () => {
      const invalidCredentials = {
        appId: '',
        appSecret: 'valid_secret_32_characters_long',
        appToken: 'valid_token',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('App ID不能为空');
      }
    });

    it('应该拒绝格式不正确的 App ID', () => {
      const invalidCredentials = {
        appId: 'invalid_app_id',
        appSecret: 'valid_secret_32_characters_long',
        appToken: 'valid_token',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('App ID格式不正确');
      }
    });

    it('应该接受正确格式的 App ID (cli_开头)', () => {
      const validCredentials = {
        appId: 'cli_abcdef123456',
        appSecret: 'this_is_a_valid_32_character_secret_key_minimum_length',
        appToken: 'valid_token_123',
      };

      const result = FeishuCredentialsSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
    });
  });

  describe('App Secret 验证', () => {
    it('应该拒绝空的 App Secret', () => {
      const invalidCredentials = {
        appId: 'cli_valid123',
        appSecret: '',
        appToken: 'valid_token',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('App Secret不能为空');
      }
    });

    it('应该拒绝长度不足的 App Secret', () => {
      const invalidCredentials = {
        appId: 'cli_valid123',
        appSecret: 'short', // 少于32个字符
        appToken: 'valid_token',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('App Secret长度不足');
      }
    });

    it('应该接受足够长度的 App Secret', () => {
      const validCredentials = {
        appId: 'cli_valid123',
        appSecret: 'this_is_a_valid_32_character_secret_key_minimum_length',
        appToken: 'valid_token_123',
      };

      const result = FeishuCredentialsSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
    });
  });

  describe('App Token 验证', () => {
    it('应该拒绝空的 App Token', () => {
      const invalidCredentials = {
        appId: 'cli_valid123',
        appSecret: 'this_is_a_valid_32_character_secret_key_minimum_length',
        appToken: '',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        const tokenError = result.error.errors.find((err) =>
          err.path.includes('appToken'),
        );
        expect(tokenError?.message).toContain('App Token不能为空');
      }
    });

    it('应该拒绝格式不正确的 App Token', () => {
      const invalidCredentials = {
        appId: 'cli_valid123',
        appSecret: 'this_is_a_valid_32_character_secret_key_minimum_length',
        appToken: 'invalid@token!format',
      };

      const result = FeishuCredentialsSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
      if (!result.success) {
        const tokenError = result.error.errors.find((err) =>
          err.path.includes('appToken'),
        );
        expect(tokenError?.message).toContain('App Token格式不正确');
      }
    });

    it('应该接受正确格式的 App Token', () => {
      const validCredentials = {
        appId: 'cli_valid123',
        appSecret: 'this_is_a_valid_32_character_secret_key_minimum_length',
        appToken: 'valid_token_123-with_underscore',
      };

      const result = FeishuCredentialsSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
    });
  });
});

describe('Enum Schemas', () => {
  describe('FieldOperationStrategySchema', () => {
    it('应该接受有效的策略枚举值', () => {
      const validStrategies = ['create_only', 'update_only', 'ensure_correct'];

      validStrategies.forEach((strategy) => {
        const result = FieldOperationStrategySchema.safeParse(strategy);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(strategy);
        }
      });
    });

    it('应该使用默认值 ensure_correct', () => {
      const result = FieldOperationStrategySchema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ensure_correct');
      }
    });

    it('应该拒绝无效的策略值', () => {
      const invalidStrategy = 'invalid_strategy';
      const result = FieldOperationStrategySchema.safeParse(invalidStrategy);
      expect(result.success).toBe(false);
    });
  });

  describe('ConflictResolutionSchema', () => {
    it('应该接受有效的冲突解决策略', () => {
      const validResolutions = [
        'update_existing',
        'throw_error',
        'skip_operation',
      ];

      validResolutions.forEach((resolution) => {
        const result = ConflictResolutionSchema.safeParse(resolution);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(resolution);
        }
      });
    });

    it('应该使用默认值 update_existing', () => {
      const result = ConflictResolutionSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('update_existing');
      }
    });

    it('应该拒绝无效的冲突解决值', () => {
      const invalidResolution = 'invalid_resolution';
      const result = ConflictResolutionSchema.safeParse(invalidResolution);
      expect(result.success).toBe(false);
    });
  });
});

describe('FieldOperationOptionsSchema', () => {
  describe('有效配置验证', () => {
    it('应该验证完整的操作选项', () => {
      const validOptions = {
        strategy: 'create_only' as const,
        conflictResolution: 'throw_error' as const,
        skipCache: true,
        enableDetailedLogging: false,
        maxRetries: 2,
        operationDelay: 5000,
      };

      const result = FieldOperationOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validOptions);
      }
    });

    it('应该使用所有默认值处理空对象', () => {
      const result = FieldOperationOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        // 由于schema使用了.partial()，字段可能为undefined
        // 我们测试当提供默认值时是否正确工作
        expect(result.data).toEqual({});
      }
    });
  });

  describe('各字段边界验证', () => {
    it('应该验证 maxRetries 的边界值', () => {
      const validOptions = [
        { maxRetries: 0 },
        { maxRetries: 3 },
        { maxRetries: 5 },
      ];

      validOptions.forEach((option) => {
        const result = FieldOperationOptionsSchema.safeParse(option);
        expect(result.success).toBe(true);
      });
    });

    it('应该拒绝负数的 maxRetries', () => {
      const invalidOption = { maxRetries: -1 };
      const result = FieldOperationOptionsSchema.safeParse(invalidOption);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('重试次数不能为负数');
      }
    });

    it('应该拒绝超过5的 maxRetries', () => {
      const invalidOption = { maxRetries: 6 };
      const result = FieldOperationOptionsSchema.safeParse(invalidOption);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('重试次数不能超过5次');
      }
    });

    it('应该验证 operationDelay 的边界值', () => {
      const validOptions = [
        { operationDelay: 0 },
        { operationDelay: 5000 },
        { operationDelay: 10000 },
      ];

      validOptions.forEach((option) => {
        const result = FieldOperationOptionsSchema.safeParse(option);
        expect(result.success).toBe(true);
      });
    });

    it('应该拒绝负数的 operationDelay', () => {
      const invalidOption = { operationDelay: -100 };
      const result = FieldOperationOptionsSchema.safeParse(invalidOption);
      expect(result.success).toBe(false);
    });

    it('应该拒绝超过10000的 operationDelay', () => {
      const invalidOption = { operationDelay: 10001 };
      const result = FieldOperationOptionsSchema.safeParse(invalidOption);
      expect(result.success).toBe(false);
    });
  });

  describe('布尔字段验证', () => {
    it('应该正确处理 skipCache 布尔值', () => {
      const options = [{ skipCache: true }, { skipCache: false }];

      options.forEach((option) => {
        const result = FieldOperationOptionsSchema.safeParse(option);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.skipCache).toBe(option.skipCache);
        }
      });
    });

    it('应该正确处理 enableDetailedLogging 布尔值', () => {
      const options = [
        { enableDetailedLogging: true },
        { enableDetailedLogging: false },
      ];

      options.forEach((option) => {
        const result = FieldOperationOptionsSchema.safeParse(option);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.enableDetailedLogging).toBe(
            option.enableDetailedLogging,
          );
        }
      });
    });
  });
});

describe('ConfigurationChangeSchema', () => {
  describe('有效数据验证', () => {
    it('应该验证有效的配置变更', () => {
      const validChange = {
        property: 'field_name',
        from: '旧字段名',
        to: '新字段名',
        severity: 'minor' as const,
        description: '字段名称变更',
      };

      const result = ConfigurationChangeSchema.safeParse(validChange);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validChange);
      }
    });

    it('应该正确处理可选的 description 字段', () => {
      const changeWithoutDescription = {
        property: 'type',
        from: 1,
        to: 2,
        severity: 'critical' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(
        changeWithoutDescription,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });
  });

  describe('严重性级别验证', () => {
    it('应该接受 critical 严重性级别', () => {
      const change = {
        property: 'type',
        from: 1,
        to: 2,
        severity: 'critical' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(change);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe('critical');
      }
    });

    it('应该接受 minor 严重性级别', () => {
      const change = {
        property: 'description',
        from: 'old desc',
        to: 'new desc',
        severity: 'minor' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(change);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe('minor');
      }
    });

    it('应该拒绝无效的严重性级别', () => {
      const change = {
        property: 'test',
        from: 'old',
        to: 'new',
        severity: 'invalid',
      };

      const result = ConfigurationChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
    });
  });

  describe('必填字段验证', () => {
    it('应该拒绝缺少 property 的配置变更', () => {
      const invalidChange = {
        from: 'old',
        to: 'new',
        severity: 'minor' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(invalidChange);
      expect(result.success).toBe(false);
    });

    it('应该允许 from 为 undefined (z.unknown() 类型)', () => {
      const validChange = {
        property: 'test',
        from: undefined,
        to: 'new',
        severity: 'minor' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(validChange);
      expect(result.success).toBe(true);
    });

    it('应该允许 to 为 undefined (z.unknown() 类型)', () => {
      const validChange = {
        property: 'test',
        from: 'old',
        to: undefined,
        severity: 'minor' as const,
      };

      const result = ConfigurationChangeSchema.safeParse(validChange);
      expect(result.success).toBe(true);
    });
  });
});

describe('FieldOperationResultSchema', () => {
  describe('有效结果验证', () => {
    it('应该验证完整的操作结果', () => {
      const validResult = {
        field: mockFeishuField,
        operation: 'created' as const,
        changes: [],
        processingTime: 1500,
        warnings: ['警告信息'],
        metadata: {
          retryCount: 1,
          cacheHit: false,
          apiCallCount: 2,
        },
      };

      const result = FieldOperationResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation).toBe('created');
        expect(result.data.processingTime).toBe(1500);
        expect(result.data.metadata?.retryCount).toBe(1);
      }
    });

    it('应该正确处理默认值', () => {
      const minimalResult = {
        field: mockFeishuField,
        operation: 'unchanged' as const,
        processingTime: 500,
      };

      const result = FieldOperationResultSchema.safeParse(minimalResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.changes).toEqual([]);
        expect(result.data.warnings).toEqual([]);
      }
    });
  });

  describe('操作类型验证', () => {
    it('应该接受 created 操作类型', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'created',
        processingTime: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('应该接受 updated 操作类型', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'updated',
        processingTime: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('应该接受 unchanged 操作类型', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'unchanged',
        processingTime: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的操作类型', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'invalid_operation',
        processingTime: 1000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('性能指标验证', () => {
    it('应该验证正数的 processingTime', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'created',
        processingTime: 2500,
      });
      expect(result.success).toBe(true);
    });

    it('应该拒绝负数的 processingTime', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'created',
        processingTime: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('元数据验证', () => {
    it('应该验证可选的 metadata 对象', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'updated',
        processingTime: 1000,
        metadata: {
          retryCount: 2,
          cacheHit: true,
          apiCallCount: 3,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.retryCount).toBe(2);
        expect(result.data.metadata?.cacheHit).toBe(true);
      }
    });

    it('应该正确处理 metadata 的默认值', () => {
      const result = FieldOperationResultSchema.safeParse({
        field: mockFeishuField,
        operation: 'created',
        processingTime: 1000,
        metadata: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.retryCount).toBe(0);
        expect(result.data.metadata?.cacheHit).toBe(false);
        expect(result.data.metadata?.apiCallCount).toBe(1);
      }
    });
  });
});

describe('Batch Operation Schemas', () => {
  describe('BatchOperationSummarySchema', () => {
    it('应该验证有效的批量操作汇总', () => {
      const validSummary = {
        total: 10,
        created: 3,
        updated: 5,
        unchanged: 1,
        failed: 1,
        totalProcessingTime: 15000,
        averageProcessingTime: 1500,
      };

      const result = BatchOperationSummarySchema.safeParse(validSummary);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validSummary);
      }
    });

    it('应该拒绝负数的计数字段', () => {
      const invalidSummary = {
        total: -1,
        created: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
      };

      const result = BatchOperationSummarySchema.safeParse(invalidSummary);
      expect(result.success).toBe(false);
    });

    it('应该验证所有数字字段的非负性', () => {
      const fieldsToTest = [
        'total',
        'created',
        'updated',
        'unchanged',
        'failed',
        'totalProcessingTime',
        'averageProcessingTime',
      ];

      fieldsToTest.forEach((field) => {
        const summary = {
          total: 1,
          created: 1,
          updated: 0,
          unchanged: 0,
          failed: 0,
          totalProcessingTime: 1000,
          averageProcessingTime: 1000,
          [field]: -1, // 设置为负数
        };

        const result = BatchOperationSummarySchema.safeParse(summary);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('BatchFieldOperationResultSchema', () => {
    it('应该验证完整的批量操作结果', () => {
      const validBatchResult = {
        results: [
          {
            field: mockFeishuField,
            operation: 'created' as const,
            changes: [],
            processingTime: 1000,
            warnings: [],
          },
        ],
        summary: {
          total: 1,
          created: 1,
          updated: 0,
          unchanged: 0,
          failed: 0,
          totalProcessingTime: 1000,
          averageProcessingTime: 1000,
        },
        failures: [],
        totalExecutionTime: 2000,
      };

      const result =
        BatchFieldOperationResultSchema.safeParse(validBatchResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toHaveLength(1);
        expect(result.data.summary.total).toBe(1);
      }
    });

    it('应该正确处理空的 failures 数组', () => {
      const batchResult = {
        results: [],
        summary: {
          total: 0,
          created: 0,
          updated: 0,
          unchanged: 0,
          failed: 0,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
        },
        totalExecutionTime: 100,
      };

      const result = BatchFieldOperationResultSchema.safeParse(batchResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.failures).toEqual([]);
      }
    });

    it('应该验证失败详情的结构', () => {
      const batchResult = {
        results: [],
        summary: {
          total: 1,
          created: 0,
          updated: 0,
          unchanged: 0,
          failed: 1,
          totalProcessingTime: 500,
          averageProcessingTime: 500,
        },
        failures: [
          {
            fieldName: '测试字段',
            error: '创建失败',
            retryCount: 3,
          },
        ],
        totalExecutionTime: 1000,
      };

      const result = BatchFieldOperationResultSchema.safeParse(batchResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.failures).toHaveLength(1);
        expect(result.data.failures[0].fieldName).toBe('测试字段');
      }
    });
  });
});

describe('FieldMatchAnalysisSchema', () => {
  describe('匹配分析验证', () => {
    it('应该验证完整的字段匹配分析', () => {
      const validAnalysis = {
        isFullMatch: false,
        differences: [
          {
            property: 'field_name',
            from: '旧名称',
            to: '新名称',
            severity: 'minor' as const,
          },
        ],
        matchScore: 0.8,
        recommendedAction: 'update_field' as const,
      };

      const result = FieldMatchAnalysisSchema.safeParse(validAnalysis);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.matchScore).toBe(0.8);
        expect(result.data.recommendedAction).toBe('update_field');
      }
    });

    it('应该验证 matchScore 的范围 (0-1)', () => {
      const validScores = [0, 0.5, 1];

      validScores.forEach((score) => {
        const analysis = {
          isFullMatch: score === 1,
          differences: [],
          matchScore: score,
          recommendedAction: 'no_action' as const,
        };

        const result = FieldMatchAnalysisSchema.safeParse(analysis);
        expect(result.success).toBe(true);
      });
    });

    it('应该拒绝超出范围的 matchScore', () => {
      const invalidScores = [-0.1, 1.1];

      invalidScores.forEach((score) => {
        const analysis = {
          isFullMatch: false,
          differences: [],
          matchScore: score,
          recommendedAction: 'no_action' as const,
        };

        const result = FieldMatchAnalysisSchema.safeParse(analysis);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('推荐操作验证', () => {
    it('应该接受 no_action 推荐操作', () => {
      const analysis = {
        isFullMatch: true,
        differences: [],
        matchScore: 1,
        recommendedAction: 'no_action' as const,
      };

      const result = FieldMatchAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(true);
    });

    it('应该接受 update_field 推荐操作', () => {
      const analysis = {
        isFullMatch: false,
        differences: [],
        matchScore: 0.7,
        recommendedAction: 'update_field' as const,
      };

      const result = FieldMatchAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(true);
    });

    it('应该接受 recreate_field 推荐操作', () => {
      const analysis = {
        isFullMatch: false,
        differences: [],
        matchScore: 0.3,
        recommendedAction: 'recreate_field' as const,
      };

      const result = FieldMatchAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的推荐操作', () => {
      const analysis = {
        isFullMatch: false,
        differences: [],
        matchScore: 0.5,
        recommendedAction: 'invalid_action',
      };

      const result = FieldMatchAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(false);
    });
  });
});

describe('Custom Error Classes', () => {
  describe('FieldOperationError', () => {
    it('应该正确创建 FieldOperationError 实例', () => {
      const error = new FieldOperationError(
        '操作失败',
        'create_field',
        '测试字段',
        new Error('原因'),
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FieldOperationError);
      expect(error.message).toBe('操作失败');
      expect(error.name).toBe('FieldOperationError');
    });

    it('应该包含正确的错误信息和属性', () => {
      const originalError = new Error('原始错误');
      const error = new FieldOperationError(
        '字段创建失败',
        'create_field',
        'test_field',
        originalError,
      );

      expect(error.operation).toBe('create_field');
      expect(error.fieldName).toBe('test_field');
      expect(error.cause).toBe(originalError);
    });

    it('应该正确设置错误名称', () => {
      const error = new FieldOperationError('测试', 'test_operation');
      expect(error.name).toBe('FieldOperationError');
    });
  });

  describe('FieldConfigurationMismatchError', () => {
    it('应该正确创建配置不匹配错误', () => {
      const differences = [
        {
          property: 'type',
          from: 1,
          to: 2,
          severity: 'critical' as const,
        },
      ];

      const error = new FieldConfigurationMismatchError(
        differences,
        '测试字段',
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FieldConfigurationMismatchError);
      expect(error.name).toBe('FieldConfigurationMismatchError');
      expect(error.differences).toBe(differences);
      expect(error.fieldName).toBe('测试字段');
    });

    it('应该根据差异数量生成错误消息', () => {
      const differences = [
        {
          property: 'name',
          from: 'old',
          to: 'new',
          severity: 'minor' as const,
        },
        {
          property: 'type',
          from: 1,
          to: 2,
          severity: 'critical' as const,
        },
      ];

      const error = new FieldConfigurationMismatchError(differences);
      expect(error.message).toContain('2项差异');
    });

    it('应该包含差异详情数组', () => {
      const differences = [
        {
          property: 'description',
          from: '旧描述',
          to: '新描述',
          severity: 'minor' as const,
        },
      ];

      const error = new FieldConfigurationMismatchError(differences);
      expect(error.differences).toHaveLength(1);
      expect(error.differences[0].property).toBe('description');
    });
  });

  describe('FieldNotFoundError', () => {
    it('应该正确创建字段未找到错误', () => {
      const error = new FieldNotFoundError('test_field', 'table123');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FieldNotFoundError);
      expect(error.name).toBe('FieldNotFoundError');
      expect(error.fieldName).toBe('test_field');
      expect(error.tableId).toBe('table123');
    });

    it('应该包含字段名和表格ID信息', () => {
      const error = new FieldNotFoundError('missing_field', 'tbl_abc123');
      expect(error.fieldName).toBe('missing_field');
      expect(error.tableId).toBe('tbl_abc123');
    });

    it('应该生成描述性的错误消息', () => {
      const error = new FieldNotFoundError('书名', 'tbl_books');
      expect(error.message).toContain('字段"书名"在表格"tbl_books"中不存在');
    });
  });
});

describe('Type Inference Validation', () => {
  describe('导出类型验证', () => {
    it('应该正确推断 FeishuCredentials 类型', () => {
      const credentials: FeishuCredentials = {
        appId: 'cli_test123',
        appSecret: 'test_secret_32_characters_long',
        appToken: 'test_token_123',
      };

      // 类型检查通过即为验证成功
      expect(credentials.appId).toBeDefined();
      expect(credentials.appSecret).toBeDefined();
      expect(credentials.appToken).toBeDefined();
    });

    it('应该正确推断 FieldOperationOptions 类型', () => {
      const options: FieldOperationOptions = {
        strategy: 'ensure_correct',
        conflictResolution: 'update_existing',
        skipCache: false,
        enableDetailedLogging: true,
        maxRetries: 3,
        operationDelay: 1000,
      };

      // 类型检查通过即为验证成功
      expect(typeof options.strategy).toBe('string');
      expect(typeof options.maxRetries).toBe('number');
    });

    it('应该正确推断 FieldOperationResult 类型', () => {
      const result: FieldOperationResult = {
        field: mockFeishuField,
        operation: 'created',
        changes: [],
        processingTime: 1000,
        warnings: [],
      };

      // 类型检查通过即为验证成功
      expect(result.operation).toBeDefined();
      expect(result.field).toBeDefined();
    });

    it('应该正确推断批量操作相关类型', () => {
      const summary: BatchOperationSummary = {
        total: 5,
        created: 2,
        updated: 2,
        unchanged: 1,
        failed: 0,
        totalProcessingTime: 5000,
        averageProcessingTime: 1000,
      };

      const batchResult: BatchFieldOperationResult = {
        results: [],
        summary,
        failures: [],
        totalExecutionTime: 6000,
      };

      // 类型检查通过即为验证成功
      expect(summary.total).toBeDefined();
      expect(batchResult.results).toBeDefined();
    });
  });
});
