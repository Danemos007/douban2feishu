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
import { RedisService } from '../../redis';

import { FieldMappingService } from './field-mapping.service';
import { FieldAutoCreationServiceV2 } from './field-auto-creation.service';
import { FeishuTableService } from './feishu-table.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCreationConfigManager } from './field-creation-config';
import { FeishuAuthService } from './feishu-auth.service';
import { FeishuContractValidatorService } from '../contract/validator.service';
import { ConfigService } from '@nestjs/config';
import { FeishuFieldType } from '../schemas/field.schema';
import {
  FieldCreationRequest,
  ContentType,
  BatchFieldCreationResult,
} from '../schemas/field-creation.schema';

// 🚀 Jest 自动模拟：让 Jest 为我们生成完整的 Mock 结构
jest.mock('./field-auto-creation.service');
jest.mock('./feishu-table.service');
jest.mock('../../common/prisma/prisma.service');
jest.mock('../../redis');
jest.mock('./field-creation-config');
jest.mock('./feishu-auth.service');
jest.mock('../contract/validator.service');
jest.mock('@nestjs/config');

// 🎯 Jest泛型工厂：创建类型安全的Mock服务
function createMockService<T>(): jest.Mocked<T> {
  return {} as jest.Mocked<T>;
}

describe('FieldMappingService - Enhanced Integration', () => {
  let service: FieldMappingService;
  // 🎯 使用 jest.Mocked<T> 类型声明 - 现在Mock对象已补全！
  let fieldAutoCreationV2: jest.Mocked<FieldAutoCreationServiceV2>;
  let feishuTableService: jest.Mocked<FeishuTableService>;
  let prismaService: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  // 🚀 类型安全的Mock方法引用 - 使用jest.fn<>泛型避免unbound-method错误
  let mockBatchCreateFieldsWithSmartDelay: jest.MockedFunction<
    typeof fieldAutoCreationV2.batchCreateFieldsWithSmartDelay
  >;
  let mockBatchCreateFields: jest.MockedFunction<
    typeof feishuTableService.batchCreateFields
  >;
  let mockRedisDel: jest.MockedFunction<typeof redis.del>;
  let mockRedisSetex: jest.MockedFunction<typeof redis.setex>;

  const mockCredentials = {
    userId: 'user_test_12345',
    appId: 'cli_test12345678901234567890',
    appSecret: 'test_secret_32chars_minimum_length',
    appToken: 'bkn_test_token_12345_abcdef',
    tableId: 'tbl_test_12345678901234567890',
  };

  beforeEach(async () => {
    // 🚀 专业方案：使用泛型工厂创建类型安全的Mock实例
    // 避免 null as any，确保类型系统完整性
    const mockFieldAutoCreationV2 = new FieldAutoCreationServiceV2(
      createMockService<FieldCreationConfigManager>(),
      createMockService<FeishuTableService>(),
    ) as jest.Mocked<FieldAutoCreationServiceV2>;

    const mockFeishuTableService = new FeishuTableService(
      createMockService<ConfigService>(),
      createMockService<FeishuAuthService>(),
      createMockService<FeishuContractValidatorService>(),
      createMockService<RedisService>(),
    ) as jest.Mocked<FeishuTableService>;

    const mockPrismaService = new PrismaService() as jest.Mocked<PrismaService>;

    const mockRedis = new RedisService(
      createMockService<ConfigService>(),
    ) as jest.Mocked<RedisService>;

    // 🎯 类型安全的嵌套属性Mock配置
    // 使用Object.assign避免unsafe member access，提供类型安全的扩展
    Object.assign(mockPrismaService, {
      syncConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    });

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
    // 🚀 获取自动生成的Mock实例 - 结构完整且类型安全！
    fieldAutoCreationV2 = module.get<FieldAutoCreationServiceV2>(
      FieldAutoCreationServiceV2,
    ) as jest.Mocked<FieldAutoCreationServiceV2>;
    feishuTableService = module.get<FeishuTableService>(
      FeishuTableService,
    ) as jest.Mocked<FeishuTableService>;
    prismaService = module.get<PrismaService>(
      PrismaService,
    ) as jest.Mocked<PrismaService>;
    redis = module.get<RedisService>(RedisService) as jest.Mocked<RedisService>;

    // 🎯 初始化类型安全的Mock方法引用
    // Jest Mock系统要求从对象中分离方法引用，与ESLint unbound-method规则冲突
    mockBatchCreateFieldsWithSmartDelay = jest.mocked(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      fieldAutoCreationV2.batchCreateFieldsWithSmartDelay,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    mockBatchCreateFields = jest.mocked(feishuTableService.batchCreateFields);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    mockRedisDel = jest.mocked(redis.del);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    mockRedisSetex = jest.mocked(redis.setex);
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
      // 验证增强方法存在 - 使用类型安全的私有方法访问
      const serviceWithPrivateMethods = service as FieldMappingService & {
        autoConfigureFieldMappingsEnhanced: (
          userId: string,
          appId: string,
          appSecret: string,
          appToken: string,
          tableId: string,
          contentType: ContentType,
        ) => Promise<unknown>;
      };
      expect(
        typeof serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced,
      ).toBe('function');
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

      mockBatchCreateFieldsWithSmartDelay.mockResolvedValue(mockBatchResult);

      // 执行增强方法 - 使用类型安全的私有方法访问
      const serviceWithPrivateMethods = service as FieldMappingService & {
        autoConfigureFieldMappingsEnhanced: (
          userId: string,
          appId: string,
          appSecret: string,
          appToken: string,
          tableId: string,
          contentType: ContentType,
        ) => Promise<{
          mappings: Record<string, string>;
          matched: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          created: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          errors: Array<{ field: string; error: string }>;
          performanceMetrics?: {
            processingTime: number;
            totalFields: number;
            successRate: number;
            enhancedFeatures: string[];
          };
        }>;
      };
      const result =
        await serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced(
          mockCredentials.userId,
          mockCredentials.appId,
          mockCredentials.appSecret,
          mockCredentials.appToken,
          mockCredentials.tableId,
          'books' as ContentType,
        );

      // 验证使用了新服务
      expect(mockBatchCreateFieldsWithSmartDelay).toHaveBeenCalled();

      // 验证旧方法没有被调用
      expect(mockBatchCreateFields).not.toHaveBeenCalled();

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

      mockBatchCreateFieldsWithSmartDelay.mockResolvedValue(
        mockBatchResultWithFailures,
      );

      const serviceWithPrivateMethods = service as FieldMappingService & {
        autoConfigureFieldMappingsEnhanced: (
          userId: string,
          appId: string,
          appSecret: string,
          appToken: string,
          tableId: string,
          contentType: ContentType,
        ) => Promise<{
          mappings: Record<string, string>;
          matched: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          created: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          errors: Array<{ field: string; error: string }>;
        }>;
      };
      const result =
        await serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced(
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

        mockBatchCreateFieldsWithSmartDelay.mockResolvedValue(mockBatchResult);

        // 执行测试 - 使用类型安全的私有方法访问
        const serviceWithPrivateMethods = service as FieldMappingService & {
          autoConfigureFieldMappingsEnhanced: (
            userId: string,
            appId: string,
            appSecret: string,
            appToken: string,
            tableId: string,
            contentType: ContentType,
          ) => Promise<{
            mappings: Record<string, string>;
            matched: Array<{
              doubanField: string;
              fieldId: string;
              fieldName: string;
            }>;
            created: Array<{
              doubanField: string;
              fieldId: string;
              fieldName: string;
            }>;
            errors: Array<{ field: string; error: string }>;
          }>;
        };
        const result =
          await serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced(
            mockCredentials.userId,
            mockCredentials.appId,
            mockCredentials.appSecret,
            mockCredentials.appToken,
            mockCredentials.tableId,
            contentType,
          );

        // 验证内容类型被正确处理
        expect(result).toBeDefined();
        expect(mockBatchCreateFieldsWithSmartDelay).toHaveBeenCalledWith(
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
      expect(mockRedisDel).toHaveBeenCalledWith(expectedCacheKey);
      expect(mockRedisDel).toHaveBeenCalledTimes(1);
    });

    it('should handle cache clearing errors gracefully', async () => {
      // Mock Redis错误
      mockRedisDel.mockRejectedValue(new Error('Redis connection failed'));

      // 验证错误处理不会抛出异常
      await expect(
        service.clearMappingsCache(
          mockCredentials.appToken,
          mockCredentials.tableId,
        ),
      ).resolves.not.toThrow();

      // 验证Redis del仍然被尝试调用
      expect(mockRedisDel).toHaveBeenCalled();
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

      // 执行增强配置方法（应该触发缓存更新） - 使用类型安全的私有方法访问
      const serviceWithPrivateMethods = service as FieldMappingService & {
        autoConfigureFieldMappingsEnhanced: (
          userId: string,
          appId: string,
          appSecret: string,
          appToken: string,
          tableId: string,
          contentType: ContentType,
        ) => Promise<unknown>;
      };
      await serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced(
        mockCredentials.userId,
        mockCredentials.appId,
        mockCredentials.appSecret,
        mockCredentials.appToken,
        mockCredentials.tableId,
        'books' as ContentType,
      );

      // 验证缓存被设置（映射结果缓存）
      expect(mockRedisSetex).toHaveBeenCalled();

      // 验证缓存键格式包含正确的前缀和参数
      const setexCalls = mockRedisSetex.mock.calls;
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
      mockBatchCreateFieldsWithSmartDelay.mockResolvedValue(mockBatchResult);
      (prismaService.syncConfig.upsert as jest.Mock).mockResolvedValue({});

      const serviceWithPrivateMethods = service as FieldMappingService & {
        autoConfigureFieldMappingsEnhanced: (
          userId: string,
          appId: string,
          appSecret: string,
          appToken: string,
          tableId: string,
          contentType: ContentType,
        ) => Promise<{
          mappings: Record<string, string>;
          matched: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          created: Array<{
            doubanField: string;
            fieldId: string;
            fieldName: string;
          }>;
          errors: Array<{ field: string; error: string }>;
          performanceMetrics?: {
            processingTime: number;
            totalFields: number;
            successRate: number;
            enhancedFeatures: string[];
          };
        }>;
      };
      const result =
        await serviceWithPrivateMethods.autoConfigureFieldMappingsEnhanced(
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
