/**
 * FieldMappingService集成增强测试
 *
 * 🚀 Phase A2: 集成测试 - TDD红阶段
 *
 * 测试目标：
 * 1. FieldMappingService成功集成FieldAutoCreationServiceV2
 * 2. autoConfigureFieldMappingsEnhanced方法使用新架构
 * 3. 4种内容类型完整流程验证
 * 4. 与现有API完全兼容
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisService } from '../../redis';

import { FieldMappingService } from './field-mapping.service';
import { FieldAutoCreationServiceV2 } from './field-auto-creation.service';
import { FeishuTableService } from './feishu-table.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FeishuFieldType } from '../schemas/field.schema';
import {
  FieldCreationRequest,
  ContentType,
  BatchFieldCreationResult,
} from '../schemas/field-creation.schema';

describe('FieldMappingService - Enhanced Integration', () => {
  let service: FieldMappingService;
  let fieldAutoCreationV2: FieldAutoCreationServiceV2;
  let feishuTableService: FeishuTableService;
  let prismaService: PrismaService;
  let redis: RedisService;

  const mockCredentials = {
    userId: 'user_test_12345',
    appId: 'cli_test12345678901234567890',
    appSecret: 'test_secret_32chars_minimum_length',
    appToken: 'bkn_test_token_12345_abcdef',
    tableId: 'tbl_test_12345678901234567890',
  };

  beforeEach(async () => {
    const mockFieldAutoCreationV2 = {
      batchCreateFieldsWithSmartDelay: jest.fn(),
      createFieldWithContentTypeSupport: jest.fn(),
      checkFieldExists: jest.fn(),
    };

    const mockFeishuTableService = {
      getTableFields: jest.fn(),
      batchCreateFields: jest.fn(), // 旧方法，应该被替换
      ensureFieldConfiguration: jest.fn(),
    };

    const mockPrismaService = {
      syncConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldMappingService,
        {
          provide: FieldAutoCreationServiceV2,
          useValue: mockFieldAutoCreationV2,
        },
        {
          provide: FeishuTableService,
          useValue: mockFeishuTableService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<FieldMappingService>(FieldMappingService);
    fieldAutoCreationV2 = module.get<FieldAutoCreationServiceV2>(
      FieldAutoCreationServiceV2,
    );
    feishuTableService = module.get<FeishuTableService>(FeishuTableService);
    prismaService = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  describe('🎯 集成验证 - 新架构使用', () => {
    it('should integrate FieldAutoCreationServiceV2 successfully', () => {
      // 验证依赖注入成功
      expect(service).toBeDefined();
      expect(fieldAutoCreationV2).toBeDefined();

      // 验证新服务具备关键方法
      expect(typeof fieldAutoCreationV2.batchCreateFieldsWithSmartDelay).toBe(
        'function',
      );
    });

    it('should have autoConfigureFieldMappingsEnhanced method', () => {
      // 验证增强方法存在
      expect(typeof (service as any).autoConfigureFieldMappingsEnhanced).toBe(
        'function',
      );
    });
  });

  describe('🚀 autoConfigureFieldMappingsEnhanced - 新架构集成', () => {
    const mockExistingFields = [
      {
        field_id: 'fld_existing_001',
        field_name: 'Subject ID',
        type: FeishuFieldType.Text,
        ui_type: 'Text',
        is_primary: false,
      },
      {
        field_id: 'fld_existing_002',
        field_name: '书名',
        type: FeishuFieldType.Text,
        ui_type: 'Text',
        is_primary: false,
      },
    ];

    beforeEach(() => {
      // Mock getTableFields - 返回现有字段
      (feishuTableService.getTableFields as jest.Mock).mockResolvedValue(
        mockExistingFields,
      );

      // Mock Prisma操作
      (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});

      // Mock Redis缓存
      (redis.setex as jest.Mock).mockResolvedValue('OK');
    });

    it('should use FieldAutoCreationServiceV2 for field creation', async () => {
      // Mock: 批量创建成功
      const mockBatchResult: BatchFieldCreationResult = {
        success: [
          {
            field_id: 'fld_created_001',
            field_name: '我的状态',
            type: FeishuFieldType.SingleSelect,
            ui_type: 'SingleSelect',
            is_primary: false,
            property: { options: [] },
            description: '阅读状态',
          },
          {
            field_id: 'fld_created_002',
            field_name: '我的评分',
            type: FeishuFieldType.Number, // Rating是Number的UI变体
            ui_type: 'Rating',
            is_primary: false,
            description: '个人评分',
          },
        ],
        failed: [],
        summary: {
          total: 2,
          successCount: 2,
          failedCount: 0,
          processingTime: 1500,
        },
      };

      (
        fieldAutoCreationV2.batchCreateFieldsWithSmartDelay as jest.Mock
      ).mockResolvedValue(mockBatchResult);

      // 执行增强方法
      const result = await (service as any).autoConfigureFieldMappingsEnhanced(
        mockCredentials.userId,
        mockCredentials.appId,
        mockCredentials.appSecret,
        mockCredentials.appToken,
        mockCredentials.tableId,
        'books' as ContentType,
      );

      // 验证使用了新服务
      expect(
        fieldAutoCreationV2.batchCreateFieldsWithSmartDelay,
      ).toHaveBeenCalled();

      // 验证旧方法没有被调用
      expect(feishuTableService.batchCreateFields).not.toHaveBeenCalled();

      // 验证返回结果格式
      expect(result).toHaveProperty('mappings');
      expect(result).toHaveProperty('matched');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('errors');

      // 验证创建的字段被正确映射
      expect(result.created).toHaveLength(2);
      expect(result.created[0].fieldId).toBe('fld_created_001');
      expect(result.created[1].fieldId).toBe('fld_created_002');
    });

    it('should handle field creation failures gracefully', async () => {
      // Mock: 部分创建失败
      const mockBatchResultWithFailures: BatchFieldCreationResult = {
        success: [
          {
            field_id: 'fld_created_001',
            field_name: '我的状态',
            type: FeishuFieldType.SingleSelect,
            ui_type: 'SingleSelect',
            is_primary: false,
            description: '阅读状态',
          },
        ],
        failed: [
          {
            request: {
              fieldName: '我的评分',
              contentType: 'books',
              fieldType: FeishuFieldType.Number, // Rating是Number的UI变体
            } as FieldCreationRequest,
            error: '字段创建失败：重复字段名',
          },
        ],
        summary: {
          total: 2,
          successCount: 1,
          failedCount: 1,
          processingTime: 2000,
        },
      };

      (
        fieldAutoCreationV2.batchCreateFieldsWithSmartDelay as jest.Mock
      ).mockResolvedValue(mockBatchResultWithFailures);

      const result = await (service as any).autoConfigureFieldMappingsEnhanced(
        mockCredentials.userId,
        mockCredentials.appId,
        mockCredentials.appSecret,
        mockCredentials.appToken,
        mockCredentials.tableId,
        'books' as ContentType,
      );

      // 验证错误处理
      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('字段创建失败');
    });
  });

  describe('🔄 4种内容类型完整流程测试', () => {
    const contentTypes: ContentType[] = [
      'books',
      'movies',
      'tv',
      'documentary',
    ];

    contentTypes.forEach((contentType) => {
      it(`should handle ${contentType} content type correctly`, async () => {
        // Mock基础设置
        (feishuTableService.getTableFields as jest.Mock).mockResolvedValue([]);
        (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});
        (redis.setex as jest.Mock).mockResolvedValue('OK');

        // Mock创建成功结果
        const mockBatchResult: BatchFieldCreationResult = {
          success: [
            {
              field_id: 'fld_test_001',
              field_name: '测试字段',
              type: FeishuFieldType.Text,
              ui_type: 'Text',
              is_primary: false,
              description: `${contentType}测试字段`,
            },
          ],
          failed: [],
          summary: {
            total: 1,
            successCount: 1,
            failedCount: 0,
            processingTime: 1000,
          },
        };

        (
          fieldAutoCreationV2.batchCreateFieldsWithSmartDelay as jest.Mock
        ).mockResolvedValue(mockBatchResult);

        // 执行测试
        const result = await (
          service as any
        ).autoConfigureFieldMappingsEnhanced(
          mockCredentials.userId,
          mockCredentials.appId,
          mockCredentials.appSecret,
          mockCredentials.appToken,
          mockCredentials.tableId,
          contentType,
        );

        // 验证内容类型被正确处理
        expect(result).toBeDefined();
        expect(
          fieldAutoCreationV2.batchCreateFieldsWithSmartDelay,
        ).toHaveBeenCalledWith(
          mockCredentials.appId,
          mockCredentials.appSecret,
          mockCredentials.appToken,
          mockCredentials.tableId,
          expect.arrayContaining([
            expect.objectContaining({
              contentType: contentType,
            }),
          ]),
        );
      });
    });
  });

  describe('🛡️ 向后兼容性验证', () => {
    it('should maintain existing autoConfigureFieldMappings API', async () => {
      // 确保原有方法仍然存在和工作
      expect(typeof service.autoConfigureFieldMappings).toBe('function');

      // Mock基础依赖
      (feishuTableService.getTableFields as jest.Mock).mockResolvedValue([]);
      (feishuTableService.batchCreateFields as jest.Mock).mockResolvedValue([]);
      (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      // 验证原方法仍然可以调用
      await expect(
        service.autoConfigureFieldMappings(
          mockCredentials.userId,
          mockCredentials.appId,
          mockCredentials.appSecret,
          mockCredentials.appToken,
          mockCredentials.tableId,
          'books',
        ),
      ).resolves.not.toThrow();
    });

    it('should maintain all existing public methods', () => {
      // 验证所有公开方法仍然存在
      expect(typeof service.getFieldMappings).toBe('function');
      expect(typeof service.setFieldMappings).toBe('function');
      expect(typeof service.previewFieldMappings).toBe('function');
      expect(typeof service.clearMappingsCache).toBe('function');
      expect(typeof service.getMappingStats).toBe('function');
    });
  });

  describe('🧽 缓存管理验证', () => {
    it('should clear mappings cache with correct key format', async () => {
      // 执行缓存清理
      await service.clearMappingsCache(
        mockCredentials.appToken,
        mockCredentials.tableId,
      );

      // 验证Redis del被调用，且使用正确的缓存键格式
      const expectedCacheKey = `feishu:mappings_v2:${mockCredentials.appToken}:${mockCredentials.tableId}`;
      expect(redis.del).toHaveBeenCalledWith(expectedCacheKey);
      expect(redis.del).toHaveBeenCalledTimes(1);
    });

    it('should handle cache clearing errors gracefully', async () => {
      // Mock Redis错误
      (redis.del as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      // 验证错误处理不会抛出异常
      await expect(
        service.clearMappingsCache(
          mockCredentials.appToken,
          mockCredentials.tableId,
        ),
      ).resolves.not.toThrow();

      // 验证Redis del仍然被尝试调用
      expect(redis.del).toHaveBeenCalled();
    });

    it('should clear cache after field mapping changes', async () => {
      // Mock基础设置
      (feishuTableService.getTableFields as jest.Mock).mockResolvedValue([]);
      (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});

      const mockBatchResult: BatchFieldCreationResult = {
        success: [
          {
            field_id: 'fld_test_001',
            field_name: '测试字段',
            type: FeishuFieldType.Text,
            ui_type: 'Text',
            is_primary: false,
            description: '测试字段',
          },
        ],
        failed: [],
        summary: {
          total: 1,
          successCount: 1,
          failedCount: 0,
          processingTime: 1000,
        },
      };

      (
        fieldAutoCreationV2.batchCreateFieldsWithSmartDelay as jest.Mock
      ).mockResolvedValue(mockBatchResult);

      // 执行增强配置方法（应该触发缓存更新）
      await (service as any).autoConfigureFieldMappingsEnhanced(
        mockCredentials.userId,
        mockCredentials.appId,
        mockCredentials.appSecret,
        mockCredentials.appToken,
        mockCredentials.tableId,
        'books' as ContentType,
      );

      // 验证缓存被设置（映射结果缓存）
      expect(redis.setex).toHaveBeenCalled();

      // 验证缓存键格式包含正确的前缀和参数
      const setexCalls = (redis.setex as jest.Mock).mock.calls;
      const cacheKey = setexCalls[0][0];
      expect(cacheKey).toContain('feishu:mappings_v2:');
      expect(cacheKey).toContain(mockCredentials.appToken);
      expect(cacheKey).toContain(mockCredentials.tableId);
    });
  });

  describe('🔧 性能和监控验证', () => {
    it('should provide performance metrics from V2 service', async () => {
      // Mock: 存在需要创建字段的情况，确保batchResult不为null
      const mockExistingFieldsPartial = [
        {
          field_id: 'fld_existing_001',
          field_name: 'Subject ID',
          type: FeishuFieldType.Text,
          ui_type: 'Text',
          is_primary: false,
        },
        // 缺少其他字段，将触发字段创建
      ];

      const mockBatchResult: BatchFieldCreationResult = {
        success: [
          {
            field_id: 'fld_created_001',
            field_name: '我的状态',
            type: FeishuFieldType.SingleSelect,
            ui_type: 'SingleSelect',
            is_primary: false,
            description: '状态字段',
          },
        ],
        failed: [],
        summary: {
          total: 1,
          successCount: 1,
          failedCount: 0,
          processingTime: 2500, // 2.5秒处理时间
        },
      };

      (feishuTableService.getTableFields as jest.Mock).mockResolvedValue(
        mockExistingFieldsPartial,
      );
      (
        fieldAutoCreationV2.batchCreateFieldsWithSmartDelay as jest.Mock
      ).mockResolvedValue(mockBatchResult);
      (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});

      const result = await (service as any).autoConfigureFieldMappingsEnhanced(
        mockCredentials.userId,
        mockCredentials.appId,
        mockCredentials.appSecret,
        mockCredentials.appToken,
        mockCredentials.tableId,
        'books' as ContentType,
      );

      // 验证性能指标被传递
      expect(result).toHaveProperty('performanceMetrics');
      expect(result.performanceMetrics?.processingTime).toBe(2500);
      expect(result.performanceMetrics?.totalFields).toBeGreaterThan(0);
      expect(result.performanceMetrics?.successRate).toBeGreaterThan(0);
      expect(result.performanceMetrics?.enhancedFeatures).toBeInstanceOf(Array);
    });
  });
});
