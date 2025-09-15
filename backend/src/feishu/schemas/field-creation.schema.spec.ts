/**
 * 字段自动创建 Schema 测试套件
 *
 * TDD原则: 测试先行，验证Schema的完整性和边界条件
 * 测试覆盖: 输入验证、类型安全、错误处理、边界值测试
 */

import {
  FieldCreationRequestSchema,
  FieldCreationResponseSchema,
  BatchFieldCreationRequestSchema,
  BatchFieldCreationResultSchema,
  ContentTypeConfigSchema,
  FieldCreationStatsSchema,
  StatusOptionSchema,
  FieldPropertySchema,
  ContentTypeSchema,
  ContentType,
  FieldCreationRequest,
  FieldCreationResponse,
} from './field-creation.schema';

import { FeishuFieldType } from './field.schema';

describe('Field Creation Schema Tests', () => {
  describe('ContentTypeSchema', () => {
    it('should accept valid content types', () => {
      const validTypes = ['books', 'movies', 'tv', 'documentary'];

      validTypes.forEach((type) => {
        expect(() => ContentTypeSchema.parse(type)).not.toThrow();
      });
    });

    it('should reject invalid content types', () => {
      const invalidTypes = [
        'book',
        'movie',
        'series',
        '',
        null,
        undefined,
        123,
      ];

      invalidTypes.forEach((type) => {
        expect(() => ContentTypeSchema.parse(type)).toThrow();
      });
    });
  });

  describe('FieldCreationRequestSchema', () => {
    const validBaseRequest = {
      fieldName: '我的状态',
      contentType: 'books' as ContentType,
      fieldType: FeishuFieldType.SingleSelect,
    };

    describe('Valid inputs', () => {
      it('should accept valid field creation request', () => {
        const result = FieldCreationRequestSchema.parse(validBaseRequest);

        expect(result.fieldName).toBe('我的状态');
        expect(result.contentType).toBe('books');
        expect(result.fieldType).toBe(FeishuFieldType.SingleSelect);
      });

      it('should accept request with optional description', () => {
        const requestWithDescription = {
          ...validBaseRequest,
          description: '用户阅读状态字段',
        };

        const result = FieldCreationRequestSchema.parse(requestWithDescription);
        expect(result.description).toBe('用户阅读状态字段');
      });

      it('should accept various Chinese field names', () => {
        const chineseFieldNames = [
          '我的评分',
          '豆瓣评分',
          '标记日期',
          '书名',
          '电影名',
          '剧情简介',
        ];

        chineseFieldNames.forEach((fieldName) => {
          const request = { ...validBaseRequest, fieldName };
          expect(() => FieldCreationRequestSchema.parse(request)).not.toThrow();
        });
      });

      it('should accept all valid content types', () => {
        const contentTypes: ContentType[] = [
          'books',
          'movies',
          'tv',
          'documentary',
        ];

        contentTypes.forEach((contentType) => {
          const request = { ...validBaseRequest, contentType };
          expect(() => FieldCreationRequestSchema.parse(request)).not.toThrow();
        });
      });

      it('should accept all valid field types', () => {
        const fieldTypes = [
          FeishuFieldType.Text,
          FeishuFieldType.Number,
          FeishuFieldType.SingleSelect,
          FeishuFieldType.DateTime,
          FeishuFieldType.URL,
        ];

        fieldTypes.forEach((fieldType) => {
          const request = { ...validBaseRequest, fieldType };
          expect(() => FieldCreationRequestSchema.parse(request)).not.toThrow();
        });
      });
    });

    describe('Invalid inputs - fieldName', () => {
      it('should reject empty field name', () => {
        const invalidRequest = { ...validBaseRequest, fieldName: '' };
        expect(() => FieldCreationRequestSchema.parse(invalidRequest)).toThrow(
          '字段名不能为空',
        );
      });

      it('should reject field name that is too long', () => {
        const longFieldName = 'a'.repeat(51);
        const invalidRequest = {
          ...validBaseRequest,
          fieldName: longFieldName,
        };
        expect(() => FieldCreationRequestSchema.parse(invalidRequest)).toThrow(
          '字段名长度不能超过50个字符',
        );
      });

      it('should reject field name with invalid characters', () => {
        const invalidFieldNames = [
          'field@name',
          'field#name',
          'field$name',
          'field%name',
          'field&name',
        ];

        invalidFieldNames.forEach((fieldName) => {
          const invalidRequest = { ...validBaseRequest, fieldName };
          expect(() =>
            FieldCreationRequestSchema.parse(invalidRequest),
          ).toThrow('字段名只能包含中文、英文、数字、下划线和空格');
        });
      });
    });

    describe('Invalid inputs - contentType', () => {
      it('should reject invalid content type', () => {
        const invalidRequest = {
          ...validBaseRequest,
          contentType: 'invalid' as ContentType,
        };
        expect(() =>
          FieldCreationRequestSchema.parse(invalidRequest),
        ).toThrow();
      });
    });

    describe('Invalid inputs - description', () => {
      it('should reject description that is too long', () => {
        const longDescription = 'a'.repeat(201);
        const invalidRequest = {
          ...validBaseRequest,
          description: longDescription,
        };
        expect(() => FieldCreationRequestSchema.parse(invalidRequest)).toThrow(
          '描述长度不能超过200个字符',
        );
      });
    });
  });

  describe('StatusOptionSchema', () => {
    it('should accept valid status option', () => {
      const validOption = { name: '想读', color: 5 };
      const result = StatusOptionSchema.parse(validOption);

      expect(result.name).toBe('想读');
      expect(result.color).toBe(5);
    });

    it('should reject empty option name', () => {
      const invalidOption = { name: '', color: 5 };
      expect(() => StatusOptionSchema.parse(invalidOption)).toThrow(
        '选项名称不能为空',
      );
    });

    it('should reject invalid color values', () => {
      const invalidColors = [-1, 16, 1.5, NaN];

      invalidColors.forEach((color) => {
        const invalidOption = { name: '想读', color };
        expect(() => StatusOptionSchema.parse(invalidOption)).toThrow();
      });
    });

    it('should accept valid color range 0-15', () => {
      const validColors = [0, 5, 10, 15];

      validColors.forEach((color) => {
        const validOption = { name: '想读', color };
        expect(() => StatusOptionSchema.parse(validOption)).not.toThrow();
      });
    });
  });

  describe('FieldPropertySchema', () => {
    it('should accept Rating field properties', () => {
      const ratingProperty = {
        formatter: '0',
        min: 1,
        max: 5,
        rating: { symbol: 'star' },
      };

      const result = FieldPropertySchema.parse(ratingProperty);
      expect(result.formatter).toBe('0');
      expect(result.rating?.symbol).toBe('star');
    });

    it('should accept SingleSelect field properties', () => {
      const selectProperty = {
        options: [
          { name: '想读', color: 5 },
          { name: '在读', color: 4 },
          { name: '读过', color: 0 },
        ],
      };

      const result = FieldPropertySchema.parse(selectProperty);
      expect(result.options).toHaveLength(3);
      expect(result.options?.[0].name).toBe('想读');
    });

    it('should accept Text field properties', () => {
      const textProperty = { auto_wrap: true };
      const result = FieldPropertySchema.parse(textProperty);
      expect(result.auto_wrap).toBe(true);
    });

    it('should accept Number field properties', () => {
      const numberProperty = {
        range: { min: 0, max: 10 },
        precision: 1,
      };

      const result = FieldPropertySchema.parse(numberProperty);
      expect(result.range?.min).toBe(0);
      expect(result.precision).toBe(1);
    });
  });

  describe('FieldCreationResponseSchema', () => {
    it('should accept valid field creation response', () => {
      const validResponse = {
        field_id: 'fldabcdefg1234567890',
        field_name: '我的状态',
        type: FeishuFieldType.SingleSelect,
        ui_type: 'SingleSelect',
        is_primary: false,
      };

      const result = FieldCreationResponseSchema.parse(validResponse);
      expect(result.field_id).toBe('fldabcdefg1234567890');
      expect(result.field_name).toBe('我的状态');
    });

    it('should reject invalid field_id format', () => {
      const invalidResponse = {
        field_id: 'invalid-id',
        field_name: '我的状态',
        type: FeishuFieldType.SingleSelect,
        ui_type: 'SingleSelect',
      };

      expect(() => FieldCreationResponseSchema.parse(invalidResponse)).toThrow(
        'Field ID格式不正确',
      );
    });

    it('should accept valid field_id formats', () => {
      const validFieldIds = [
        'fld12345678901234567890',
        'fldAbCdEfGhIjKlMnOpQr',
        'fld123AbC456DeF789',
      ];

      validFieldIds.forEach((field_id) => {
        const response = {
          field_id,
          field_name: '测试字段',
          type: FeishuFieldType.Text,
          ui_type: 'Text',
        };

        expect(() => FieldCreationResponseSchema.parse(response)).not.toThrow();
      });
    });
  });

  describe('BatchFieldCreationRequestSchema', () => {
    it('should accept valid batch request', () => {
      const validBatchRequest = {
        fields: [
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
        ],
      };

      const result = BatchFieldCreationRequestSchema.parse(validBatchRequest);
      expect(result.fields).toHaveLength(2);
    });

    it('should reject empty fields array', () => {
      const invalidBatchRequest = { fields: [] };
      expect(() =>
        BatchFieldCreationRequestSchema.parse(invalidBatchRequest),
      ).toThrow('至少需要创建一个字段');
    });

    it('should reject too many fields', () => {
      const fields = Array(21)
        .fill(0)
        .map((_, index) => ({
          fieldName: `字段${index}`,
          contentType: 'books' as ContentType,
          fieldType: FeishuFieldType.Text,
        }));

      const invalidBatchRequest = { fields };
      expect(() =>
        BatchFieldCreationRequestSchema.parse(invalidBatchRequest),
      ).toThrow('单次最多创建20个字段');
    });
  });

  describe('BatchFieldCreationResultSchema', () => {
    it('should accept valid batch result', () => {
      const validResult = {
        success: [
          {
            field_id: 'fld12345678901234567890',
            field_name: '我的状态',
            type: FeishuFieldType.SingleSelect,
            ui_type: 'SingleSelect',
          },
        ],
        failed: [
          {
            request: {
              fieldName: '无效字段',
              contentType: 'books' as ContentType,
              fieldType: FeishuFieldType.Text,
            },
            error: '创建失败：字段名重复',
          },
        ],
        summary: {
          total: 2,
          successCount: 1,
          failedCount: 1,
          processingTime: 5000,
        },
      };

      const result = BatchFieldCreationResultSchema.parse(validResult);
      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.summary.total).toBe(2);
    });
  });

  describe('ContentTypeConfigSchema', () => {
    it('should accept valid content type configuration', () => {
      const validConfig = {
        statusOptions: [
          { name: '想读', color: 5 },
          { name: '在读', color: 4 },
          { name: '读过', color: 0 },
        ],
        fieldTemplates: {
          我的状态: {
            field_name: '我的状态',
            type: FeishuFieldType.SingleSelect,
            ui_type: 'SingleSelect',
            property: {
              options: [
                { name: '想读', color: 5 },
                { name: '在读', color: 4 },
                { name: '读过', color: 0 },
              ],
            },
          },
        },
      };

      const result = ContentTypeConfigSchema.parse(validConfig);
      expect(result.statusOptions).toHaveLength(3);
      expect(result.fieldTemplates['我的状态']).toBeDefined();
    });
  });

  describe('FieldCreationStatsSchema', () => {
    it('should accept valid field creation statistics', () => {
      const validStats = {
        totalCreated: 100,
        successRate: 95.5,
        averageCreationTime: 1200,
        contentTypeDistribution: {
          books: 40,
          movies: 35,
          tv: 20,
          documentary: 5,
        },
        fieldTypeDistribution: {
          Text: 50,
          SingleSelect: 25,
          Number: 15,
          DateTime: 10,
        },
        lastCreationTime: '2025-09-04T10:30:00Z',
      };

      const result = FieldCreationStatsSchema.parse(validStats);
      expect(result.totalCreated).toBe(100);
      expect(result.successRate).toBe(95.5);
      expect(result.contentTypeDistribution.books).toBe(40);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain type consistency between Request and Response', () => {
      const request: FieldCreationRequest = {
        fieldName: '我的评分',
        contentType: 'movies',
        fieldType: FeishuFieldType.Number,
        description: '用户对电影的评分',
      };

      const response: FieldCreationResponse = {
        field_id: 'fld12345678901234567890',
        field_name: request.fieldName,
        type: request.fieldType,
        ui_type: 'Rating',
      };

      // 验证类型一致性
      expect(response.field_name).toBe(request.fieldName);
      expect(response.type).toBe(request.fieldType);
    });

    it('should support all 4 content types', () => {
      const contentTypes: ContentType[] = [
        'books',
        'movies',
        'tv',
        'documentary',
      ];

      contentTypes.forEach((contentType) => {
        const request = {
          fieldName: '我的状态',
          contentType,
          fieldType: FeishuFieldType.SingleSelect,
        };

        expect(() => FieldCreationRequestSchema.parse(request)).not.toThrow();
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error messages for validation failures', () => {
      try {
        FieldCreationRequestSchema.parse({
          fieldName: '',
          contentType: 'invalid',
          fieldType: 999,
        });
      } catch (error: unknown) {
        // 类型安全的错误处理：确保 error 是 Error 实例并具有 message 属性
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('字段名不能为空');
      }
    });
  });
});
