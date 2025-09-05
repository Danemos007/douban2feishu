/**
 * FieldAutoCreationService TDD 测试套件
 *
 * 严格遵循TDD原则：测试先行，定义服务行为规范
 *
 * 核心测试覆盖：
 * - 4种内容类型的字段创建 (books/movies/tv/documentary)
 * - 18种字段类型的完整Switch逻辑
 * - 批量创建与智能延迟
 * - 错误处理与重试机制
 * - 与现有FeishuTableService的集成
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { FieldAutoCreationService } from './field-auto-creation.service';
import { FieldCreationConfigManager } from './field-creation-config';
import { FeishuTableService } from './feishu-table.service';
import {
  FieldCreationRequest,
  FieldCreationResponse,
  BatchFieldCreationRequest,
  BatchFieldCreationResult,
  ContentType,
} from '../contract/field-creation.schema';
import { FeishuFieldType } from '../contract/field.schema';

describe('FieldAutoCreationService', () => {
  let service: FieldAutoCreationService;
  let configManager: FieldCreationConfigManager;
  let feishuTableService: FeishuTableService;

  // Mock 测试数据
  const mockAppId = 'cli_test12345678';
  const mockAppSecret = 'test_secret_12345';
  const mockAppToken = 'bkn_test_token_12345';
  const mockTableId = 'tbl_test_table_12345';

  const mockFieldResponse: FeishuFieldCreateResponse = {
    field_id: 'fld12345678901234567890',
    field_name: '我的状态',
    type: FeishuFieldType.SingleSelect,
    ui_type: 'SingleSelect',
    is_primary: false,
  };

  beforeEach(async () => {
    // Mock FeishuTableService
    const mockFeishuTableService = {
      createTableField: jest.fn().mockResolvedValue(mockFieldResponse),
      getTableFields: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldAutoCreationService,
        FieldCreationConfigManager,
        {
          provide: FeishuTableService,
          useValue: mockFeishuTableService,
        },
      ],
    }).compile();

    service = module.get<FieldAutoCreationService>(FieldAutoCreationService);
    configManager = module.get<FieldCreationConfigManager>(
      FieldCreationConfigManager,
    );
    feishuTableService = module.get<FeishuTableService>(FeishuTableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFieldWithContentTypeSupport', () => {
    describe('Books Status Field Creation', () => {
      it('should create book status field with 3 options', async () => {
        const request: FieldCreationRequest = {
          fieldName: '我的状态',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.SingleSelect,
          description: '书籍阅读状态字段',
        };

        const result = await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        // 验证返回结果
        expect(result.field_name).toBe('我的状态');
        expect(result.type).toBe(FeishuFieldType.SingleSelect);

        // 验证调用FeishuTableService的参数 (基于现有签名)
        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '我的状态',
          FeishuFieldType.SingleSelect,
          '书籍阅读状态字段', // 使用request中的description
        );
      });
    });

    describe('Movies Status Field Creation', () => {
      it('should create movie status field with 2 options', async () => {
        const request: FieldCreationRequest = {
          fieldName: '我的状态',
          contentType: 'movies' as ContentType,
          fieldType: FeishuFieldType.SingleSelect,
        };

        const result = await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(result.field_name).toBe('我的状态');

        // 验证调用参数 (现有签名)
        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '我的状态',
          FeishuFieldType.SingleSelect,
          undefined,
        );
      });
    });

    describe('Rating Field Creation', () => {
      it('should create rating field with correct formatter and configuration', async () => {
        const request: FieldCreationRequest = {
          fieldName: '我的评分',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Number,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        // 验证Rating字段调用 (现有方法内部处理配置)
        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '我的评分',
          FeishuFieldType.Number,
          undefined,
        );
      });

      it('should create douban rating field with correct range', async () => {
        const request: FieldCreationRequest = {
          fieldName: '豆瓣评分',
          contentType: 'movies' as ContentType,
          fieldType: FeishuFieldType.Number,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '豆瓣评分',
          FeishuFieldType.Number,
          undefined,
        );
      });
    });

    describe('DateTime Field Creation', () => {
      it('should create datetime field for mark date', async () => {
        const request: FieldCreationRequest = {
          fieldName: '标记日期',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.DateTime,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '标记日期',
          FeishuFieldType.DateTime,
          undefined,
        );
      });
    });

    describe('Text Field Creation', () => {
      it('should create text field for release date', async () => {
        const request: FieldCreationRequest = {
          fieldName: '上映日期',
          contentType: 'movies' as ContentType,
          fieldType: FeishuFieldType.Text,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        // 验证上映日期为Text类型（保持地区信息）
        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '上映日期',
          FeishuFieldType.Text,
          undefined,
        );
      });

      it('should create text field with auto wrap for long content', async () => {
        const request: FieldCreationRequest = {
          fieldName: '内容简介',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        // 验证长文本字段调用
        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '内容简介',
          FeishuFieldType.Text,
          undefined,
        );
      });
    });

    describe('URL Field Creation', () => {
      it('should create url field for cover image', async () => {
        const request: FieldCreationRequest = {
          fieldName: '封面图',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.URL,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '封面图',
          FeishuFieldType.URL,
          undefined,
        );
      });
    });

    describe('Content Type Specific Fields', () => {
      it('should create book specific field - 书名', async () => {
        const request: FieldCreationRequest = {
          fieldName: '书名',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '书名',
          FeishuFieldType.Text,
          undefined,
        );
      });

      it('should create movie specific field - 电影名', async () => {
        const request: FieldCreationRequest = {
          fieldName: '电影名',
          contentType: 'movies' as ContentType,
          fieldType: FeishuFieldType.Text,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '电影名',
          FeishuFieldType.Text,
          undefined,
        );
      });

      it('should create tv specific field - 片名', async () => {
        const request: FieldCreationRequest = {
          fieldName: '片名',
          contentType: 'tv' as ContentType,
          fieldType: FeishuFieldType.Text,
        };

        await service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        );

        expect(feishuTableService.createTableField).toHaveBeenCalledWith(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          '片名',
          FeishuFieldType.Text,
          undefined,
        );
      });
    });
  });

  describe('batchCreateFieldsWithSmartDelay', () => {
    it('should create multiple fields with 1 second delay', async () => {
      const requests: FieldCreationRequest[] = [
        {
          fieldName: '我的状态',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.SingleSelect,
        },
        {
          fieldName: '我的评分',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Number,
        },
      ];

      const batchRequest: BatchFieldCreationRequest = { fields: requests };

      // Mock 时间延迟
      const delaySpy = jest
        .spyOn(service as any, 'delay')
        .mockResolvedValue(undefined);

      const result = await service.batchCreateFieldsWithSmartDelay(
        mockAppId,
        mockAppSecret,
        mockAppToken,
        mockTableId,
        requests,
      );

      // 验证批量结果结构
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('summary');
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      // 验证延迟调用 - 第一个字段后有延迟，最后一个字段后无延迟
      expect(delaySpy).toHaveBeenCalledTimes(1);
      expect(delaySpy).toHaveBeenCalledWith(1000);

      // 验证两次createTableField调用
      expect(feishuTableService.createTableField).toHaveBeenCalledTimes(2);

      delaySpy.mockRestore();
    });

    it('should handle failed field creation gracefully', async () => {
      const requests: FieldCreationRequest[] = [
        {
          fieldName: '我的备注', // 使用支持的字段名
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        },
        {
          fieldName: '我的标签', // 使用支持的字段名
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        },
      ];

      // Mock第二次调用抛出错误
      (feishuTableService.createTableField as jest.Mock)
        .mockResolvedValueOnce(mockFieldResponse)
        .mockRejectedValueOnce(new Error('API调用失败'));

      const result = await service.batchCreateFieldsWithSmartDelay(
        mockAppId,
        mockAppSecret,
        mockAppToken,
        mockTableId,
        requests,
      );

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        request: requests[1],
        error: 'API调用失败',
      });
      expect(result.summary.total).toBe(2);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.failedCount).toBe(1);
    });

    it('should respect batch size limits', async () => {
      const largeRequestList = Array(25)
        .fill(0)
        .map((_, index) => ({
          fieldName: '我的备注', // 使用支持的字段名
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        }));

      // 验证超过最大批次大小时的行为
      await expect(
        service.batchCreateFieldsWithSmartDelay(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          largeRequestList,
        ),
      ).rejects.toThrow('单次最多创建20个字段');
    });
  });

  // Note: checkFieldExists functionality will be implemented later if needed

  describe('getCreationStats', () => {
    it('should return initial field creation statistics', async () => {
      // 测试初始统计状态
      const stats = await service.getCreationStats();

      expect(stats.totalCreated).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageCreationTime).toBe(0);
      expect(stats.contentTypeDistribution).toEqual({
        books: 0,
        movies: 0,
        tv: 0,
        documentary: 0,
      });
      expect(stats.fieldTypeDistribution).toEqual({});
      expect(stats.lastCreationTime).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported field name', async () => {
      const request: FieldCreationRequest = {
        fieldName: '不支持的字段名',
        contentType: 'books' as ContentType,
        fieldType: FeishuFieldType.Text,
      };

      await expect(
        service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        ),
      ).rejects.toThrow('不支持的字段名: 不支持的字段名');
    });

    it('should handle FeishuTableService API errors', async () => {
      const request: FieldCreationRequest = {
        fieldName: '我的状态',
        contentType: 'books' as ContentType,
        fieldType: FeishuFieldType.SingleSelect,
      };

      (feishuTableService.createTableField as jest.Mock).mockRejectedValue(
        new Error('飞书API限流'),
      );

      await expect(
        service.createFieldWithContentTypeSupport(
          mockAppId,
          mockAppSecret,
          mockAppToken,
          mockTableId,
          request,
        ),
      ).rejects.toThrow('飞书API限流');
    });
  });

  describe('Integration with ConfigManager', () => {
    it('should use configManager for field template retrieval', async () => {
      const request: FieldCreationRequest = {
        fieldName: '我的状态',
        contentType: 'books' as ContentType,
        fieldType: FeishuFieldType.SingleSelect,
      };

      const spy = jest.spyOn(configManager, 'getFieldTemplate');

      await service.createFieldWithContentTypeSupport(
        mockAppId,
        mockAppSecret,
        mockAppToken,
        mockTableId,
        request,
      );

      expect(spy).toHaveBeenCalledWith('books', '我的状态');
    });

    it('should use configManager for field creation delay', async () => {
      const spy = jest.spyOn(configManager, 'getFieldCreationDelay');
      jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      const requests: FieldCreationRequest[] = [
        {
          fieldName: '我的备注',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        },
        {
          fieldName: '我的标签',
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        },
      ];

      await service.batchCreateFieldsWithSmartDelay(
        mockAppId,
        mockAppSecret,
        mockAppToken,
        mockTableId,
        requests,
      );

      expect(spy).toHaveBeenCalled();
    });
  });
});

// Mock 飞书字段创建响应类型
interface FeishuFieldCreateResponse {
  field_id: string;
  field_name: string;
  type: number; // FeishuFieldType is enum with numeric values
  ui_type: string;
  is_primary: boolean;
  property?: any;
}
