/**
 * 飞书契约验证器服务测试
 *
 * TDD测试驱动开发 - 先写测试，再实现功能
 * 测试策略：基于真实Fixture数据的契约验证
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { FeishuContractValidatorService } from './validator.service';
import { FeishuFieldsResponse } from '../schemas/field.schema';
import { FeishuTokenResponse } from '../schemas/auth.schema';

// 导入真实fixtures
const fieldsFixture = require('./__fixtures__/fields-response.json');
const authFixture = require('./__fixtures__/auth-response.json');

describe('FeishuContractValidatorService', () => {
  let service: FeishuContractValidatorService;
  let loggerErrorSpy: jest.SpyInstance;

  // 测试环境变量模拟
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeishuContractValidatorService],
    }).compile();

    service = module.get<FeishuContractValidatorService>(
      FeishuContractValidatorService,
    );

    // Mock Logger
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  describe('validateFieldsResponse', () => {
    describe('开发环境 - 严格验证', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('应该成功验证真实的字段响应数据', () => {
        // Arrange & Act
        const result = service.validateFieldsResponse(
          fieldsFixture,
          'test-endpoint',
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.code).toBe(0);
        expect(result.data.items).toHaveLength(16);
        expect(result.data.total).toBe(16);
        expect(result.data.has_more).toBe(false);
      });

      it('应该验证字段结构的完整性', () => {
        // Act
        const result = service.validateFieldsResponse(
          fieldsFixture,
          'test-endpoint',
        );

        // Assert - 检查第一个字段的结构
        const firstField = result.data.items[0];
        expect(firstField.field_id).toBe('fldFOzkZ68');
        expect(firstField.field_name).toBe('Subject ID');
        expect(firstField.type).toBe(1);
        expect(firstField.ui_type).toBe('Text');
        expect(firstField.is_primary).toBe(true);
      });

      it('应该正确识别Rating字段', () => {
        // Act
        const result = service.validateFieldsResponse(
          fieldsFixture,
          'test-endpoint',
        );

        // Assert - 找到"我的评分"字段
        const ratingField = result.data.items.find(
          (field) => field.field_name === '我的评分',
        );
        expect(ratingField).toBeDefined();
        expect(ratingField!.type).toBe(2); // Number类型
        expect(ratingField!.ui_type).toBe('Rating'); // UI显示为Rating
        expect(ratingField!.property?.rating?.symbol).toBe('star');
      });

      it('遇到无效数据时应抛出ZodError', () => {
        // Arrange
        const invalidData = { code: 1, msg: 'error' }; // 缺少data字段

        // Act & Assert
        expect(() => {
          service.validateFieldsResponse(invalidData, 'test-endpoint');
        }).toThrow();
      });

      it('遇到未知字段类型时应抛出错误', () => {
        // Arrange
        const invalidFieldsData = {
          ...fieldsFixture,
          data: {
            ...fieldsFixture.data,
            items: [
              {
                field_id: 'test',
                field_name: 'test',
                type: 999, // 未知类型
                ui_type: 'Unknown',
                is_primary: false,
                property: null,
              },
            ],
          },
        };

        // Act & Assert
        expect(() => {
          service.validateFieldsResponse(invalidFieldsData, 'test-endpoint');
        }).toThrow('发现未知的字段类型，需要更新Schema');
      });
    });

    describe('生产环境 - 软验证', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('验证成功时应返回正确数据', () => {
        // Act
        const result = service.validateFieldsResponse(
          fieldsFixture,
          'test-endpoint',
        );

        // Assert
        expect(result.code).toBe(0);
        expect(result.data.items).toHaveLength(16);
        expect(loggerErrorSpy).not.toHaveBeenCalled();
      });

      it('验证失败时应记录错误但不抛出异常', () => {
        // Arrange
        const invalidData = { invalid: 'data' };

        // Act
        const result = service.validateFieldsResponse(
          invalidData,
          'test-endpoint',
        );

        // Assert
        expect(result).toBe(invalidData); // 返回原始数据
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          '契约验证失败 - test-endpoint',
          expect.objectContaining({
            endpoint: 'test-endpoint',
            errors: expect.any(Array),
            actualData: expect.any(String),
          }),
        );
      });
    });
  });

  describe('validateAuthResponse', () => {
    describe('开发环境 - 严格验证', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('应该成功验证真实的认证响应数据', () => {
        // Act
        const result = service.validateAuthResponse(
          authFixture,
          'auth-endpoint',
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.code).toBe(0);
        expect(result.tenant_access_token).toBe(
          't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
        );
        expect(result.expire).toBe(7199);
        expect(result.msg).toBe('ok');
      });

      it('遇到认证失败响应时应抛出错误', () => {
        // Arrange
        const failedAuthData = { code: 1, msg: 'auth failed' };

        // Act & Assert
        expect(() => {
          service.validateAuthResponse(failedAuthData, 'auth-endpoint');
        }).toThrow('Invalid literal value, expected 0');
      });
    });

    describe('生产环境 - 软验证', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('验证失败时应记录错误但返回原始数据', () => {
        // Arrange
        const invalidAuthData = { invalid: 'auth_data' };

        // Act
        const result = service.validateAuthResponse(
          invalidAuthData,
          'auth-endpoint',
        );

        // Assert
        expect(result).toBe(invalidAuthData);
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('isRatingFieldValidation', () => {
    it('应该正确识别Rating字段', () => {
      // Arrange
      const response = service.validateFieldsResponse(fieldsFixture, 'test');
      const ratingField = response.data.items.find(
        (f) => f.field_name === '我的评分',
      );

      // Act
      const isRating = service.isRatingFieldValidation(ratingField!);

      // Assert
      expect(isRating).toBe(true);
    });

    it('应该正确排除非Rating字段', () => {
      // Arrange
      const response = service.validateFieldsResponse(fieldsFixture, 'test');
      const textField = response.data.items.find(
        (f) => f.field_name === 'Subject ID',
      );

      // Act
      const isRating = service.isRatingFieldValidation(textField!);

      // Assert
      expect(isRating).toBe(false);
    });
  });

  describe('getValidationStats', () => {
    it('应该返回验证统计信息', () => {
      // Arrange - 执行一些验证操作
      service.validateFieldsResponse(fieldsFixture, 'test1');
      service.validateAuthResponse(authFixture, 'test2');

      // Act
      const stats = service.getValidationStats();

      // Assert
      expect(stats.totalValidations).toBeGreaterThan(0);
      expect(stats.successCount).toBeGreaterThan(0);
      expect(stats.failureCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTodayFailureStats', () => {
    it('应该返回有效的统计信息结构', async () => {
      // Act
      const stats = await service.getTodayFailureStats();

      // Assert - 验证返回结构的正确性，而非具体数值
      expect(stats).toBeDefined();
      expect(typeof stats?.totalFailures).toBe('number');
      expect(stats?.totalFailures).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats?.affectedEndpoints)).toBe(true);
      expect(
        stats?.latestFailureTime === null ||
          typeof stats?.latestFailureTime === 'string',
      ).toBe(true);
    });

    it('应该优雅处理日志文件不存在的情况', async () => {
      // Act
      const stats = await service.getTodayFailureStats();

      // Assert - 即使文件不存在也应该返回有效统计
      expect(stats).not.toBeNull();
      expect(typeof stats?.totalFailures).toBe('number');
      expect(Array.isArray(stats?.affectedEndpoints)).toBe(true);
    });
  });
});
