/**
 * FieldMappingService TDD测试套件 - Phase 2增强功能
 *
 * 测试目标：
 * 1. 嵌套属性值提取功能 (extractNestedValue)
 * 2. 字段映射配置校验功能 (validateFieldMappings - 增强版)
 * 3. 与验证配置系统的集成
 *
 * TDD原则：先写失败的测试，再实现功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRedisToken } from '@liaoliaots/nestjs-redis';
import { Logger } from '@nestjs/common';

import { FieldMappingService } from './field-mapping.service';
import { FeishuTableService } from './feishu-table.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  VERIFIED_FIELD_MAPPINGS,
  getVerifiedFieldMapping,
  VerifiedFieldMappingConfig,
} from '../config/douban-field-mapping-verified.config';

describe('FieldMappingService - Phase 2 TDD Enhancement', () => {
  let service: FieldMappingService;
  let mockTableService: jest.Mocked<FeishuTableService>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockRedis: any;

  beforeEach(async () => {
    // Mock dependencies
    const mockTableServiceObj = {
      getTableFields: jest.fn(),
      batchCreateFields: jest.fn(),
    };

    const mockPrismaServiceObj = {
      syncConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockRedisObj = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldMappingService,
        {
          provide: FeishuTableService,
          useValue: mockTableServiceObj,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaServiceObj,
        },
        {
          provide: getRedisToken('default'),
          useValue: mockRedisObj,
        },
      ],
    }).compile();

    service = module.get<FieldMappingService>(FieldMappingService);
    mockTableService = module.get(FeishuTableService);
    mockPrismaService = module.get(PrismaService);
    mockRedis = module.get(getRedisToken('default'));

    // 禁用日志输出
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🎯 Phase 2.1: 嵌套属性值提取功能 (extractNestedValue)', () => {
    describe('基础功能测试', () => {
      it('应该能够提取简单属性值', async () => {
        // 🔥 TDD: 这个测试会失败，因为extractNestedValue方法还不存在
        const data = { title: '肖申克的救赎' };
        const fieldConfig = {
          doubanFieldName: 'title',
          chineseName: '电影名',
          apiFieldName: '电影名',
          fieldType: 'text',
          required: true,
          description: '电影标题',
          verified: true,
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe('肖申克的救赎');
      });

      it('应该能够提取嵌套属性值', async () => {
        // 🔥 TDD: 测试嵌套属性解析 - rating.average
        const data = {
          title: '红楼梦',
          rating: {
            average: 9.6,
            numRaters: 15000,
          },
        };

        const fieldConfig = {
          doubanFieldName: 'doubanRating',
          chineseName: '豆瓣评分',
          apiFieldName: '豆瓣评分',
          fieldType: 'number',
          required: false,
          description: '豆瓣平均评分',
          verified: true,
          nestedPath: 'rating.average', // 🔥 关键：嵌套路径
          verifiedSource: ['sync-from-cache.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe(9.6);
      });

      it('应该能够提取深度嵌套属性值', async () => {
        const data = {
          metadata: {
            ratings: {
              douban: {
                score: 8.7,
                count: 50000,
              },
            },
          },
        };

        const fieldConfig = {
          doubanFieldName: 'deepRating',
          chineseName: '深度评分',
          apiFieldName: '深度评分',
          fieldType: 'number',
          required: false,
          description: '深度嵌套评分',
          verified: true,
          nestedPath: 'metadata.ratings.douban.score', // 深度嵌套
          verifiedSource: ['test-config.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe(8.7);
      });

      it('应该正确处理不存在的嵌套路径', async () => {
        const data = {
          title: '肖申克的救赎',
          // 缺少rating属性
        };

        const fieldConfig = {
          doubanFieldName: 'doubanRating',
          chineseName: '豆瓣评分',
          apiFieldName: '豆瓣评分',
          fieldType: 'number',
          required: false,
          description: '豆瓣平均评分',
          verified: true,
          nestedPath: 'rating.average',
          verifiedSource: ['sync-from-cache.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBeUndefined();
      });

      it('应该在无嵌套路径时返回直接属性值', async () => {
        const data = { director: '弗兰克·德拉邦特' };
        const fieldConfig = {
          doubanFieldName: 'director',
          chineseName: '导演',
          apiFieldName: '导演',
          fieldType: 'text',
          required: false,
          description: '导演姓名',
          verified: true,
          // 无nestedPath属性
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe('弗兰克·德拉邦特');
      });
    });

    describe('边界情况和错误处理', () => {
      it('应该正确处理null数据', async () => {
        const data = null;
        const fieldConfig = {
          doubanFieldName: 'title',
          chineseName: '电影名',
          apiFieldName: '电影名',
          fieldType: 'text',
          required: true,
          description: '电影标题',
          verified: true,
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBeUndefined();
      });

      it('应该正确处理undefined数据', async () => {
        const data = undefined;
        const fieldConfig = {
          doubanFieldName: 'title',
          chineseName: '电影名',
          apiFieldName: '电影名',
          fieldType: 'text',
          required: true,
          description: '电影标题',
          verified: true,
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBeUndefined();
      });

      it('应该正确处理空字符串嵌套路径', async () => {
        const data = { title: '测试电影' };
        const fieldConfig = {
          doubanFieldName: 'title',
          chineseName: '电影名',
          apiFieldName: '电影名',
          fieldType: 'text',
          required: true,
          description: '电影标题',
          verified: true,
          nestedPath: '', // 空字符串
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe('测试电影');
      });

      it('应该正确处理单点路径（不含点号）', async () => {
        const data = { title: '测试电影' };
        const fieldConfig = {
          doubanFieldName: 'title',
          chineseName: '电影名',
          apiFieldName: '电影名',
          fieldType: 'text',
          required: true,
          description: '电影标题',
          verified: true,
          nestedPath: 'title', // 单属性，不含点号
          verifiedSource: ['sync-all-movies-fixed.ts'],
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(
          data,
          fieldConfig,
        );

        expect(result).toBe('测试电影');
      });
    });
  });

  describe('🎯 Phase 2.2: 字段映射配置校验功能 (validateFieldMappingsEnhanced)', () => {
    describe('基础校验功能', () => {
      it('应该通过有效的字段映射配置校验', async () => {
        // 🔥 TDD: 这个测试会失败，因为validateFieldMappingsEnhanced方法还不存在
        const mappings = {
          subjectId: 'fldABC123456789012',
          title: 'fldDEF123456789012',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('应该检测出未知的豆瓣字段名', async () => {
        const mappings = {
          unknownField: 'fldABC123456789012', // 不存在的字段
          title: 'fldDEF123456789012',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('未知字段: unknownField');
      });

      it('应该检测出字段映射不匹配的情况', async () => {
        const mappings = {
          title: 'fldABC123456789012', // Field ID正确
        };

        // Mock飞书API返回的字段信息
        const mockFields = [
          {
            field_id: 'fldABC123456789012',
            field_name: '错误的中文名', // 与配置中的'电影名'不匹配
            type: 1,
            ui_type: 'Text',
            is_primary: false,
            property: null,
            description: '测试字段',
          },
        ];

        mockTableService.getTableFields.mockResolvedValue(mockFields);

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
          'test_app_id',
          'test_app_secret',
          'test_app_token',
          'test_table_id',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          '字段映射不匹配: title -> 错误的中文名, 期望: 电影名',
        );
      });

      it('应该验证必需字段存在性', async () => {
        const mappings = {
          // 缺少必需字段 'subjectId' 和 'title'
          director: 'fldABC123456789012',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('缺少必需字段: subjectId');
        expect(result.errors).toContain('缺少必需字段: title');
      });

      it('应该检测Field ID格式错误', async () => {
        const mappings = {
          title: 'invalid-field-id', // 错误的Field ID格式
          subjectId: 'fldABC123456789012',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Field ID格式错误: invalid-field-id');
      });
    });

    describe('集成验证配置系统', () => {
      it('应该使用VERIFIED_FIELD_MAPPINGS进行校验', async () => {
        // 使用真实的验证配置
        const validMovieMapping = {
          subjectId: 'fldSUBJECT123456789',
          title: 'fldTITLE1234567890',
          coverImage: 'fldCOVER1234567890',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          validMovieMapping,
          'movies',
        );

        expect(result.isValid).toBe(true);
        expect(result.validatedFields).toEqual([
          'subjectId',
          'title',
          'coverImage',
        ]);
      });

      it('应该支持不同数据类型的校验', async () => {
        const validBookMapping = {
          subjectId: 'fldSUBJECT123456789',
          title: 'fldTITLE1234567890',
          author: 'fldAUTHOR123456789',
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          validBookMapping,
          'books', // 书籍类型
        );

        expect(result.isValid).toBe(true);
        expect(result.validatedFields).toEqual([
          'subjectId',
          'title',
          'author',
        ]);
      });

      it('应该验证嵌套路径字段的特殊处理', async () => {
        const mappingWithNestedPath = {
          subjectId: 'fldSUBJECT123456789', // 必需字段
          title: 'fldTITLE1234567890', // 必需字段
          doubanRating: 'fldRATING123456789', // 这个字段有nestedPath: 'rating.average'
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappingWithNestedPath,
          'books',
        );

        expect(result.isValid).toBe(true);
        expect(result.nestedPathFields).toContain('doubanRating');
      });
    });

    describe('高级校验功能', () => {
      it('应该提供详细的校验统计信息', async () => {
        const mixedMapping = {
          subjectId: 'fldSUBJECT123456789', // 有效
          title: 'fldTITLE1234567890', // 有效
          unknownField: 'fldUNKNOWN1234567', // 无效
          director: 'invalid-format', // Field ID格式错误
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mixedMapping,
          'movies',
        );

        expect(result.isValid).toBe(false);
        expect(result.statistics).toEqual({
          totalFields: 4,
          validFields: 2,
          invalidFields: 2,
          missingRequiredFields: 0, // 已有subjectId和title
          fieldsWithNestedPath: 0,
        });
      });

      it('应该支持严格模式校验', async () => {
        const mappings = {
          subjectId: 'fldSUBJECT123456789',
          title: 'fldTITLE1234567890',
          // 在严格模式下，应该包含所有18个电影字段
        };

        const result = await (service as any).validateFieldMappingsEnhanced(
          mappings,
          'movies',
          null,
          null,
          null,
          null, // 不进行飞书API校验
          { strict: true }, // 🔥 严格模式选项
        );

        expect(result.isValid).toBe(false);
        expect(result.warnings).toContain(
          '严格模式: 期望18个字段，实际只有2个',
        );
      });
    });
  });

  describe('🎯 Phase 2.3: 增强功能集成测试', () => {
    it('应该在extractNestedValue中使用验证配置', async () => {
      // 测试两个功能的集成：使用验证配置中的nestedPath
      const data = {
        title: '红楼梦',
        rating: { average: 9.6 },
      };

      const verifiedConfig = getVerifiedFieldMapping('books');
      const ratingConfig = verifiedConfig['doubanRating']; // 应该有nestedPath: 'rating.average'

      const result = await (service as any).extractNestedValue(
        data,
        ratingConfig,
      );

      expect(result).toBe(9.6);
      expect(ratingConfig.nestedPath).toBe('rating.average');
    });

    it('应该在字段配置校验中考虑处理说明', async () => {
      const mappings = {
        subjectId: 'fldSUBJECT123456789', // 必需字段
        title: 'fldTITLE1234567890', // 必需字段
        markDate: 'fldMARKDATE123456789', // 这个字段应该有时间戳处理说明
      };

      const result = await (service as any).validateFieldMappingsEnhanced(
        mappings,
        'movies',
      );

      expect(result.isValid).toBe(true);
      expect(result.processingNotes['markDate']).toContain('时间戳');
    });
  });
});
