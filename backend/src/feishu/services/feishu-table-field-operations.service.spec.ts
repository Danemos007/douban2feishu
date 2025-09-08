/**
 * FeishuTableFieldOperations 统一字段操作测试套件
 *
 * TDD红阶段：定义智能核心逻辑的期望行为
 *
 * 测试覆盖：
 * - ensureFieldConfiguration: 核心智能逻辑
 * - batchEnsureFieldConfigurations: 批量处理
 * - findFieldByName: 字段查找
 * - analyzeFieldConfiguration: 配置分析
 * - 错误处理和边界情况
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRedisToken } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

// 引入统一接口和新类型
import {
  FeishuCredentials,
  FieldOperationOptions,
  FieldOperationResult,
  BatchFieldOperationResult,
  FieldMatchAnalysis,
  FieldOperationError,
  FieldConfigurationMismatchError,
  FieldNotFoundError,
} from '../contract/field-operations.schema';

import { FieldCreationConfig } from '../contract/field-creation.schema';
import { FeishuField, FeishuFieldType } from '../contract/field.schema';
import { FeishuTableService } from './feishu-table.service';
import { FeishuAuthService } from './feishu-auth.service';
import { FeishuContractValidatorService } from '../contract/validator.service';

describe('FeishuTableService - 统一字段操作接口', () => {
  let service: FeishuTableService;
  let authService: FeishuAuthService;
  let contractValidator: FeishuContractValidatorService;
  let redis: Redis;

  // 🧪 测试数据和Mock
  const mockCredentials: FeishuCredentials = {
    appId: 'cli_test12345678901234567890',
    appSecret: 'test_secret_32chars_minimum_length',
    appToken: 'bkn_test_token_12345_abcdef',
  };

  const mockTableId = 'tbl_test_12345678901234567890';

  const mockBookStatusConfig: FieldCreationConfig = {
    field_name: '我的状态',
    type: FeishuFieldType.SingleSelect,
    ui_type: 'SingleSelect',
    property: {
      options: [
        { id: 'opt1', name: '想读', color: 5 },
        { id: 'opt2', name: '在读', color: 4 },
        { id: 'opt3', name: '读过', color: 0 },
      ],
    },
  };

  const mockExistingCorrectField: FeishuField = {
    field_id: 'fld12345678901234567890',
    field_name: '我的状态',
    type: FeishuFieldType.SingleSelect,
    ui_type: 'SingleSelect',
    is_primary: false,
    property: {
      options: [
        { id: 'opt1', name: '想读', color: 5 },
        { id: 'opt2', name: '在读', color: 4 },
        { id: 'opt3', name: '读过', color: 0 },
      ],
    },
  };

  const mockExistingWrongTypeField: FeishuField = {
    field_id: 'fld09876543210987654321',
    field_name: '我的状态',
    type: FeishuFieldType.Text, // ❌ 错误类型
    ui_type: 'Text',
    is_primary: false,
    property: {},
  };

  const mockRatingFieldConfig: FieldCreationConfig = {
    field_name: '我的评分',
    type: FeishuFieldType.Number,
    ui_type: 'Rating',
    property: {
      formatter: '0',
      min: 1,
      max: 5,
      rating: { symbol: 'star' },
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      getAccessToken: jest.fn().mockResolvedValue('mock_access_token_12345'),
    };

    const mockContractValidator = {
      validateResponse: jest
        .fn()
        .mockImplementation((data) => Promise.resolve(data)),
    };

    const mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeishuTableService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
        {
          provide: FeishuAuthService,
          useValue: mockAuthService,
        },
        {
          provide: FeishuContractValidatorService,
          useValue: mockContractValidator,
        },
        {
          provide: getRedisToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<FeishuTableService>(FeishuTableService);
    authService = module.get<FeishuAuthService>(FeishuAuthService);
    contractValidator = module.get<FeishuContractValidatorService>(
      FeishuContractValidatorService,
    );
    redis = module.get<Redis>(getRedisToken('default'));

    // 设置测试所需的方法mocks
    jest.spyOn(service, 'getTableFields').mockImplementation();
    jest.spyOn(service, 'createTableField').mockImplementation();
    
    // Mock私有方法
    jest.spyOn(service as any, 'updateFieldInternal').mockImplementation();
    jest.spyOn(service as any, 'clearFieldCache').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureFieldConfiguration - 核心智能逻辑', () => {
    describe('场景A：字段不存在 → 创建新字段', () => {
      it('should create new SingleSelect field when field does not exist', async () => {
        // Mock: 字段不存在
        jest.spyOn(service, 'findFieldByName').mockResolvedValue(null);

        // Mock: 成功创建字段
        jest
          .spyOn(service as any, 'createFieldInternal')
          .mockResolvedValue(mockExistingCorrectField);

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
        );

        // ✅ 验证操作结果
        expect(result.operation).toBe('created');
        expect(result.field.field_name).toBe('我的状态');
        expect(result.field.type).toBe(FeishuFieldType.SingleSelect);
        expect(result.changes).toHaveLength(0);
        expect(typeof result.processingTime).toBe('number');

        // ✅ 验证方法调用
        expect(service.findFieldByName).toHaveBeenCalledWith(
          mockCredentials,
          mockTableId,
          '我的状态',
        );
        expect(service['createFieldInternal']).toHaveBeenCalledWith(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
        );
      });

      it('should throw error when strategy is update_only but field does not exist', async () => {
        // Mock: 字段不存在
        jest.spyOn(service, 'findFieldByName').mockResolvedValue(null);

        const options: FieldOperationOptions = {
          strategy: 'update_only',
        };

        await expect(
          service.ensureFieldConfiguration(
            mockCredentials,
            mockTableId,
            mockBookStatusConfig,
            options,
          ),
        ).rejects.toThrow(FieldNotFoundError);
      });
    });

    describe('场景B：字段存在且配置完全匹配 → 返回现有字段', () => {
      it('should return existing field when configuration matches perfectly', async () => {
        // Mock: 字段存在且配置匹配
        jest
          .spyOn(service, 'findFieldByName')
          .mockResolvedValue(mockExistingCorrectField);
        jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValue({
          isFullMatch: true,
          differences: [],
          matchScore: 1.0,
          recommendedAction: 'no_action',
        });

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
        );

        // ✅ 验证操作结果
        expect(result.operation).toBe('unchanged');
        expect(result.field.field_id).toBe('fld12345678901234567890');
        expect(result.changes).toHaveLength(0);
        expect(typeof result.processingTime).toBe('number');

        // ✅ 验证没有执行更新操作
        expect(service['updateFieldInternal']).not.toHaveBeenCalled();
      });
    });

    describe('场景C：字段存在但配置不匹配 → 智能更新', () => {
      it('should update field when configuration mismatches', async () => {
        // Mock: 字段存在但类型不匹配
        jest
          .spyOn(service, 'findFieldByName')
          .mockResolvedValue(mockExistingWrongTypeField);

        const mockAnalysisResult: FieldMatchAnalysis = {
          isFullMatch: false,
          differences: [
            {
              property: 'type',
              from: FeishuFieldType.Text,
              to: FeishuFieldType.SingleSelect,
              severity: 'critical',
            },
            {
              property: 'ui_type',
              from: 'Text',
              to: 'SingleSelect',
              severity: 'critical',
            },
          ],
          matchScore: 0.3,
          recommendedAction: 'update_field',
        };

        jest
          .spyOn(service, 'analyzeFieldConfiguration')
          .mockResolvedValue(mockAnalysisResult);
        jest
          .spyOn(service as any, 'updateFieldInternal')
          .mockResolvedValue(mockExistingCorrectField);

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
        );

        // ✅ 验证操作结果
        expect(result.operation).toBe('updated');
        expect(result.field.field_name).toBe('我的状态');
        expect(result.changes).toHaveLength(2);
        expect(result.changes[0].property).toBe('type');
        expect(result.changes[0].severity).toBe('critical');

        // ✅ 验证更新调用
        expect(service['updateFieldInternal']).toHaveBeenCalledWith(
          mockCredentials,
          mockTableId,
          mockExistingWrongTypeField.field_id,
          mockBookStatusConfig,
          mockAnalysisResult.differences,
        );
      });

      it('should throw error when conflictResolution is throw_error', async () => {
        // Mock: 字段存在但配置不匹配
        jest
          .spyOn(service, 'findFieldByName')
          .mockResolvedValue(mockExistingWrongTypeField);
        jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValue({
          isFullMatch: false,
          differences: [
            {
              property: 'type',
              from: FeishuFieldType.Text,
              to: FeishuFieldType.SingleSelect,
              severity: 'critical',
            },
          ],
          matchScore: 0.3,
          recommendedAction: 'update_field',
        });

        const options: FieldOperationOptions = {
          conflictResolution: 'throw_error',
        };

        await expect(
          service.ensureFieldConfiguration(
            mockCredentials,
            mockTableId,
            mockBookStatusConfig,
            options,
          ),
        ).rejects.toThrow(FieldConfigurationMismatchError);
      });

      it('should skip update when conflictResolution is skip_operation', async () => {
        // Mock: 字段存在但配置不匹配
        jest
          .spyOn(service, 'findFieldByName')
          .mockResolvedValue(mockExistingWrongTypeField);
        jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValue({
          isFullMatch: false,
          differences: [
            {
              property: 'type',
              from: FeishuFieldType.Text,
              to: FeishuFieldType.SingleSelect,
              severity: 'critical',
            },
          ],
          matchScore: 0.3,
          recommendedAction: 'update_field',
        });

        const options: FieldOperationOptions = {
          conflictResolution: 'skip_operation',
        };

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
          options,
        );

        // ✅ 验证跳过更新
        expect(result.operation).toBe('unchanged');
        expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('字段配置不匹配')]));
        expect(service['updateFieldInternal']).not.toHaveBeenCalled();
      });
    });

    describe('错误处理和重试机制', () => {
      it('should handle API errors with intelligent retry', async () => {
        // Mock: API错误
        jest
          .spyOn(service, 'findFieldByName')
          .mockRejectedValueOnce(new Error('API限流'));

        const options: FieldOperationOptions = {
          maxRetries: 3,
        };

        await expect(
          service.ensureFieldConfiguration(
            mockCredentials,
            mockTableId,
            mockBookStatusConfig,
            options,
          ),
        ).rejects.toThrow('API限流');

        // ✅ 验证调用发生
        expect(service.findFieldByName).toHaveBeenCalled();
      });

      it('should fail after max retries exceeded', async () => {
        // Mock: 持续失败
        jest
          .spyOn(service, 'findFieldByName')
          .mockRejectedValue(new Error('持续API错误'));

        const options: FieldOperationOptions = {
          maxRetries: 2,
        };

        await expect(
          service.ensureFieldConfiguration(
            mockCredentials,
            mockTableId,
            mockBookStatusConfig,
            options,
          ),
        ).rejects.toThrow('持续API错误');

        expect(service.findFieldByName).toHaveBeenCalled(); // 至少调用一次
      });
    });

    describe('性能和缓存控制', () => {
      it('should clear cache after successful field creation', async () => {
        // Mock: 创建新字段
        jest.spyOn(service, 'findFieldByName').mockResolvedValue(null);
        jest
          .spyOn(service as any, 'createFieldInternal')
          .mockResolvedValue(mockExistingCorrectField);

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
        );

        // ✅ 验证字段创建成功
        expect(result.operation).toBe('created');
        expect(result.field.field_name).toBe('我的状态');
      });

      it('should skip cache when skipCache option is true', async () => {
        // Mock: 字段存在
        jest
          .spyOn(service, 'findFieldByName')
          .mockResolvedValue(mockExistingCorrectField);
        jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValue({
          isFullMatch: true,
          differences: [],
          matchScore: 1.0,
          recommendedAction: 'no_action',
        });

        const options: FieldOperationOptions = {
          skipCache: true,
        };

        const result = await service.ensureFieldConfiguration(
          mockCredentials,
          mockTableId,
          mockBookStatusConfig,
          options,
        );

        // ✅ 验证缓存控制
        expect(result.metadata?.cacheHit).toBe(false);
        expect(service.findFieldByName).toHaveBeenCalledWith(
          mockCredentials,
          mockTableId,
          '我的状态',
        );
      });
    });
  });

  describe('batchEnsureFieldConfigurations - 批量处理', () => {
    const mockMultipleConfigs = [
      mockBookStatusConfig,
      mockRatingFieldConfig,
      {
        field_name: '标记日期',
        type: FeishuFieldType.DateTime,
        ui_type: 'DateTime',
      },
    ];

    it('should process multiple fields with mixed operations', async () => {
      // Mock不同场景：创建、更新、不变
      jest
        .spyOn(service, 'ensureFieldConfiguration')
        .mockResolvedValueOnce({
          field: mockExistingCorrectField,
          operation: 'created',
          changes: [],
          processingTime: 1000,
          warnings: [],
        })
        .mockResolvedValueOnce({
          field: mockExistingCorrectField,
          operation: 'updated',
          changes: [
            {
              property: 'formatter',
              from: undefined,
              to: '0',
              severity: 'minor',
            },
          ],
          processingTime: 1200,
          warnings: [],
        })
        .mockResolvedValueOnce({
          field: mockExistingCorrectField,
          operation: 'unchanged',
          changes: [],
          processingTime: 800,
          warnings: [],
        });

      const result = await service.batchEnsureFieldConfigurations(
        mockCredentials,
        mockTableId,
        mockMultipleConfigs,
      );

      // ✅ 验证批量结果
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.created).toBe(1);
      expect(result.summary.updated).toBe(1);
      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.totalProcessingTime).toBe(3000);
      expect(result.summary.averageProcessingTime).toBe(1000);
    });

    it('should handle partial failures gracefully', async () => {
      // Mock: 部分成功部分失败
      jest
        .spyOn(service, 'ensureFieldConfiguration')
        .mockResolvedValueOnce({
          field: mockExistingCorrectField,
          operation: 'created',
          changes: [],
          processingTime: 1000,
          warnings: [],
        })
        .mockRejectedValueOnce(new Error('字段创建失败'))
        .mockResolvedValueOnce({
          field: mockExistingCorrectField,
          operation: 'unchanged',
          changes: [],
          processingTime: 800,
          warnings: [],
        });

      const result = await service.batchEnsureFieldConfigurations(
        mockCredentials,
        mockTableId,
        mockMultipleConfigs,
      );

      // ✅ 验证失败处理
      expect(result.results).toHaveLength(2); // 只有成功的
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]).toEqual({
        fieldName: '我的评分',
        error: '字段创建失败',
        retryCount: 0,
      });
      expect(result.summary.total).toBe(3);
      expect(result.summary.created).toBe(1);
      expect(result.summary.failed).toBe(1);
    });

    it('should respect operation delay for API rate limiting', async () => {
      jest.spyOn(service, 'ensureFieldConfiguration').mockResolvedValue({
        field: mockExistingCorrectField,
        operation: 'created',
        changes: [],
        processingTime: 1000,
        warnings: [],
      });

      const delaySpy = jest
        .spyOn(service as any, 'delay')
        .mockResolvedValue(undefined);

      const options: FieldOperationOptions = {
        operationDelay: 2000,
      };

      await service.batchEnsureFieldConfigurations(
        mockCredentials,
        mockTableId,
        mockMultipleConfigs,
        options,
      );

      // ✅ 验证延迟控制（除最后一个字段外）
      expect(delaySpy).toHaveBeenCalledTimes(2);
      expect(delaySpy).toHaveBeenCalledWith(2000);
    });
  });

  describe('findFieldByName - 字段查找', () => {
    it('should find existing field by name', async () => {
      // Mock: 表格有多个字段
      const mockFields = [
        mockExistingCorrectField,
        {
          ...mockExistingCorrectField,
          field_name: '其他字段',
          field_id: 'fld999',
        },
      ];

      jest.spyOn(service, 'getTableFields').mockResolvedValue(mockFields);

      const result = await service.findFieldByName(
        mockCredentials,
        mockTableId,
        '我的状态',
      );

      // ✅ 验证查找结果
      expect(result).not.toBeNull();
      expect(result?.field_name).toBe('我的状态');
      expect(result?.field_id).toBe('fld12345678901234567890');
    });

    it('should return null when field does not exist', async () => {
      // Mock: 表格没有目标字段
      jest.spyOn(service, 'getTableFields').mockResolvedValue([]);

      const result = await service.findFieldByName(
        mockCredentials,
        mockTableId,
        '不存在的字段',
      );

      // ✅ 验证未找到
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      // Mock: API调用失败
      jest
        .spyOn(service, 'getTableFields')
        .mockRejectedValue(new Error('API调用失败'));

      await expect(
        service.findFieldByName(mockCredentials, mockTableId, '我的状态'),
      ).rejects.toThrow('API调用失败');
    });
  });

  describe('analyzeFieldConfiguration - 配置分析', () => {
    it('should detect perfect match', async () => {
      const result = await service.analyzeFieldConfiguration(
        mockExistingCorrectField,
        mockBookStatusConfig,
      );

      // ✅ 验证完全匹配
      expect(result.isFullMatch).toBe(true);
      expect(result.differences).toHaveLength(0);
      expect(result.matchScore).toBe(1.0);
      expect(result.recommendedAction).toBe('no_action');
    });

    it('should detect critical type differences', async () => {
      const result = await service.analyzeFieldConfiguration(
        mockExistingWrongTypeField,
        mockBookStatusConfig,
      );

      // ✅ 验证差异检测
      expect(result.isFullMatch).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0].severity).toBe('critical');
      expect(result.matchScore).toBeLessThan(1.0);
      expect(result.recommendedAction).toBe('recreate_field');
    });

    it('should detect property-level differences', async () => {
      const fieldWithWrongOptions: FeishuField = {
        ...mockExistingCorrectField,
        property: {
          options: [
            { id: 'opt1', name: '想读', color: 5 },
            { id: 'opt4', name: '读完了', color: 0 }, // ❌ 错误的选项名
          ],
        },
      };

      const result = await service.analyzeFieldConfiguration(
        fieldWithWrongOptions,
        mockBookStatusConfig,
      );

      // ✅ 验证属性级差异
      expect(result.isFullMatch).toBe(false);
      expect(
        result.differences.some((diff) => diff.property.includes('options')),
      ).toBe(true);
      expect(result.recommendedAction).toBe('recreate_field');
    });
  });

  describe('Integration Tests - 端到端场景', () => {
    it('should handle complete field lifecycle: create → update → unchanged', async () => {
      // 场景1：创建新字段
      jest.spyOn(service, 'findFieldByName').mockResolvedValueOnce(null);
      jest
        .spyOn(service as any, 'createFieldInternal')
        .mockResolvedValueOnce(mockExistingCorrectField);

      const createResult = await service.ensureFieldConfiguration(
        mockCredentials,
        mockTableId,
        mockBookStatusConfig,
      );

      expect(createResult.operation).toBe('created');

      // 场景2：字段存在但需更新
      jest
        .spyOn(service, 'findFieldByName')
        .mockResolvedValueOnce(mockExistingWrongTypeField);
      jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValueOnce({
        isFullMatch: false,
        differences: [
          {
            property: 'type',
            from: FeishuFieldType.Text,
            to: FeishuFieldType.SingleSelect,
            severity: 'critical',
          },
        ],
        matchScore: 0.5,
        recommendedAction: 'update_field',
      });
      jest
        .spyOn(service as any, 'updateFieldInternal')
        .mockResolvedValueOnce(mockExistingCorrectField);

      const updateResult = await service.ensureFieldConfiguration(
        mockCredentials,
        mockTableId,
        mockBookStatusConfig,
      );

      expect(updateResult.operation).toBe('updated');

      // 场景3：字段已经正确，无需更改
      jest
        .spyOn(service, 'findFieldByName')
        .mockResolvedValueOnce(mockExistingCorrectField);
      jest.spyOn(service, 'analyzeFieldConfiguration').mockResolvedValueOnce({
        isFullMatch: true,
        differences: [],
        matchScore: 1.0,
        recommendedAction: 'no_action',
      });

      const unchangedResult = await service.ensureFieldConfiguration(
        mockCredentials,
        mockTableId,
        mockBookStatusConfig,
      );

      expect(unchangedResult.operation).toBe('unchanged');
    });
  });
});
