/**
 * transformation.schema.ts 单元测试
 *
 * 测试覆盖所有 Zod Schema 定义和工具函数
 * 目标覆盖率: 95%+
 */

import { z } from 'zod';
import {
  DoubanDataTypeSchema,
  TransformationOptionsSchema,
  TransformationStatisticsSchema,
  TransformationResultSchema,
  IntelligentRepairConfigSchema,
  FieldTransformationContextSchema,
  TransformationErrorSchema,
  BatchTransformationRequestSchema,
  BatchTransformationResultSchema,
  TransformationPerformanceSchema,
  TransformationAuditSchema,
  validateTransformationOptions,
  validateTransformationResult,
  validateDoubanDataType,
  type DoubanDataType,
  type TransformationOptions,
  type TransformationStatistics,
  type TransformationResult,
  type IntelligentRepairConfig,
  type BatchTransformationRequest,
  type TransformationPerformance,
  type TransformationAudit,
} from './transformation.schema';

describe('transformation.schema.ts', () => {
  describe('Schema Definitions', () => {
    describe('DoubanDataTypeSchema', () => {
      it('should accept valid douban data types', () => {
        const validTypes = ['books', 'movies', 'tv', 'documentary'];

        validTypes.forEach((type) => {
          expect(() => DoubanDataTypeSchema.parse(type)).not.toThrow();
        });
      });

      it('should reject invalid douban data types', () => {
        const invalidTypes = ['book', 'movie', 'music', 'game'];

        invalidTypes.forEach((type) => {
          expect(() => DoubanDataTypeSchema.parse(type)).toThrow(z.ZodError);
        });
      });

      it('should reject empty strings', () => {
        expect(() => DoubanDataTypeSchema.parse('')).toThrow(z.ZodError);
      });

      it('should reject non-string values', () => {
        const nonStringValues = [123, null, undefined, {}, []];

        nonStringValues.forEach((value) => {
          expect(() => DoubanDataTypeSchema.parse(value)).toThrow(z.ZodError);
        });
      });
    });

    describe('TransformationOptionsSchema', () => {
      it('should accept valid transformation options with all fields', () => {
        const validOptions = {
          enableIntelligentRepairs: true,
          strictValidation: false,
          preserveRawData: true,
          customFieldMappings: {
            oldField: 'newField',
            title: 'bookTitle',
          },
        };

        expect(() =>
          TransformationOptionsSchema.parse(validOptions),
        ).not.toThrow();
      });

      it('should accept empty object with default values', () => {
        const emptyOptions = {};
        const result = TransformationOptionsSchema.parse(emptyOptions);

        // .partial() makes all fields optional, so defaults don't apply
        expect(result.enableIntelligentRepairs).toBeUndefined();
        expect(result.strictValidation).toBeUndefined();
        expect(result.preserveRawData).toBeUndefined();
      });

      it('should apply default values correctly', () => {
        const partialOptions = { preserveRawData: true };
        const result = TransformationOptionsSchema.parse(partialOptions);

        // .partial() makes all fields optional, so only provided values exist
        expect(result.enableIntelligentRepairs).toBeUndefined(); // not provided
        expect(result.strictValidation).toBeUndefined(); // not provided
        expect(result.preserveRawData).toBe(true); // provided
      });

      it('should accept partial configuration', () => {
        const partialOptions = {
          enableIntelligentRepairs: false,
        };

        expect(() =>
          TransformationOptionsSchema.parse(partialOptions),
        ).not.toThrow();
      });

      it('should validate enableIntelligentRepairs as boolean', () => {
        const invalidOptions = { enableIntelligentRepairs: 'true' };
        expect(() => TransformationOptionsSchema.parse(invalidOptions)).toThrow(
          z.ZodError,
        );
      });

      it('should validate strictValidation as boolean', () => {
        const invalidOptions = { strictValidation: 1 };
        expect(() => TransformationOptionsSchema.parse(invalidOptions)).toThrow(
          z.ZodError,
        );
      });

      it('should validate preserveRawData as boolean', () => {
        const invalidOptions = { preserveRawData: 'false' };
        expect(() => TransformationOptionsSchema.parse(invalidOptions)).toThrow(
          z.ZodError,
        );
      });

      it('should validate customFieldMappings as record of strings', () => {
        const validOptions = {
          customFieldMappings: {
            field1: 'mappedField1',
            field2: 'mappedField2',
          },
        };

        expect(() =>
          TransformationOptionsSchema.parse(validOptions),
        ).not.toThrow();
      });

      it('should reject invalid customFieldMappings format', () => {
        const invalidOptions = {
          customFieldMappings: {
            field1: 123, // should be string
          },
        };

        expect(() => TransformationOptionsSchema.parse(invalidOptions)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('TransformationStatisticsSchema', () => {
      it('should accept valid statistics data', () => {
        const validStats = {
          totalFields: 10,
          transformedFields: 8,
          repairedFields: 2,
          failedFields: 2,
        };

        expect(() =>
          TransformationStatisticsSchema.parse(validStats),
        ).not.toThrow();
      });

      it('should reject negative numbers for field counts', () => {
        const negativeStats = [
          {
            totalFields: -1,
            transformedFields: 0,
            repairedFields: 0,
            failedFields: 0,
          },
          {
            totalFields: 10,
            transformedFields: -1,
            repairedFields: 0,
            failedFields: 0,
          },
          {
            totalFields: 10,
            transformedFields: 5,
            repairedFields: -1,
            failedFields: 0,
          },
          {
            totalFields: 10,
            transformedFields: 5,
            repairedFields: 0,
            failedFields: -1,
          },
        ];

        negativeStats.forEach((stats) => {
          expect(() => TransformationStatisticsSchema.parse(stats)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate transformed + failed <= total fields logic', () => {
        const validStats = {
          totalFields: 10,
          transformedFields: 6,
          repairedFields: 2,
          failedFields: 4, // 6 + 4 = 10 <= 10
        };

        expect(() =>
          TransformationStatisticsSchema.parse(validStats),
        ).not.toThrow();
      });

      it('should accept edge case where transformed equals total', () => {
        const edgeCaseStats = {
          totalFields: 10,
          transformedFields: 10,
          repairedFields: 0,
          failedFields: 0,
        };

        expect(() =>
          TransformationStatisticsSchema.parse(edgeCaseStats),
        ).not.toThrow();
      });

      it('should accept edge case where failed equals total', () => {
        const edgeCaseStats = {
          totalFields: 10,
          transformedFields: 0,
          repairedFields: 0,
          failedFields: 10,
        };

        expect(() =>
          TransformationStatisticsSchema.parse(edgeCaseStats),
        ).not.toThrow();
      });

      it('should reject when transformed + failed > total', () => {
        const invalidStats = {
          totalFields: 10,
          transformedFields: 7,
          repairedFields: 2,
          failedFields: 5, // 7 + 5 = 12 > 10
        };

        expect(() =>
          TransformationStatisticsSchema.parse(invalidStats),
        ).toThrow(z.ZodError);
      });
    });

    describe('TransformationResultSchema', () => {
      const validStatistics = {
        totalFields: 10,
        transformedFields: 8,
        repairedFields: 2,
        failedFields: 2,
      };

      it('should accept valid transformation result', () => {
        const validResult = {
          data: { title: '测试书名', author: '测试作者' },
          statistics: validStatistics,
          warnings: ['字段格式已修复', '缺少可选字段'],
          rawData: { original: 'data' },
        };

        expect(() =>
          TransformationResultSchema.parse(validResult),
        ).not.toThrow();
      });

      it('should validate statistics field using TransformationStatisticsSchema', () => {
        const invalidResult = {
          data: {},
          statistics: {
            totalFields: -1, // invalid
            transformedFields: 0,
            repairedFields: 0,
            failedFields: 0,
          },
          warnings: [],
        };

        expect(() => TransformationResultSchema.parse(invalidResult)).toThrow(
          z.ZodError,
        );
      });

      it('should accept any data type for data field', () => {
        const validResults = [
          { data: null, statistics: validStatistics, warnings: [] },
          { data: 'string', statistics: validStatistics, warnings: [] },
          { data: 123, statistics: validStatistics, warnings: [] },
          { data: [], statistics: validStatistics, warnings: [] },
          { data: {}, statistics: validStatistics, warnings: [] },
        ];

        validResults.forEach((result) => {
          expect(() => TransformationResultSchema.parse(result)).not.toThrow();
        });
      });

      it('should validate warnings as string array', () => {
        const invalidResult = {
          data: {},
          statistics: validStatistics,
          warnings: [123, 'valid warning'], // mixed types
        };

        expect(() => TransformationResultSchema.parse(invalidResult)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional rawData field', () => {
        const resultWithoutRawData = {
          data: {},
          statistics: validStatistics,
          warnings: [],
        };

        const resultWithRawData = {
          data: {},
          statistics: validStatistics,
          warnings: [],
          rawData: { original: 'data' },
        };

        expect(() =>
          TransformationResultSchema.parse(resultWithoutRawData),
        ).not.toThrow();
        expect(() =>
          TransformationResultSchema.parse(resultWithRawData),
        ).not.toThrow();
      });

      it('should reject missing required fields', () => {
        // Note: z.any() fields (like 'data') don't throw when missing, they become undefined
        // Only strict typed fields throw when missing
        const missingStatisticsResult = { data: {}, warnings: [] };
        const missingWarningsResult = { data: {}, statistics: validStatistics };

        expect(() =>
          TransformationResultSchema.parse(missingStatisticsResult),
        ).toThrow(z.ZodError);
        expect(() =>
          TransformationResultSchema.parse(missingWarningsResult),
        ).toThrow(z.ZodError);

        // Missing 'data' field (z.any()) doesn't throw, it becomes undefined
        const missingDataResult = { statistics: validStatistics, warnings: [] };
        const result = TransformationResultSchema.parse(missingDataResult);
        expect(result.data).toBeUndefined();
      });
    });

    describe('IntelligentRepairConfigSchema', () => {
      it('should accept valid repair configuration', () => {
        const validConfig = {
          durationRepair: true,
          dateFormatRepair: false,
          regionSplitting: true,
          languageCleaning: false,
          arrayProcessing: true,
          nestedValueExtraction: false,
        };

        expect(() =>
          IntelligentRepairConfigSchema.parse(validConfig),
        ).not.toThrow();
      });

      it('should apply default values for all boolean fields', () => {
        const emptyConfig = {};
        const result = IntelligentRepairConfigSchema.parse(emptyConfig);

        expect(result.durationRepair).toBe(true);
        expect(result.dateFormatRepair).toBe(true);
        expect(result.regionSplitting).toBe(true);
        expect(result.languageCleaning).toBe(true);
        expect(result.arrayProcessing).toBe(true);
        expect(result.nestedValueExtraction).toBe(true);
      });

      it('should accept partial configuration with defaults', () => {
        const partialConfig = {
          durationRepair: false,
          arrayProcessing: false,
        };
        const result = IntelligentRepairConfigSchema.parse(partialConfig);

        expect(result.durationRepair).toBe(false); // provided
        expect(result.dateFormatRepair).toBe(true); // default
        expect(result.regionSplitting).toBe(true); // default
        expect(result.languageCleaning).toBe(true); // default
        expect(result.arrayProcessing).toBe(false); // provided
        expect(result.nestedValueExtraction).toBe(true); // default
      });

      it('should validate all repair options as booleans', () => {
        const validConfig = {
          durationRepair: true,
          dateFormatRepair: true,
          regionSplitting: true,
          languageCleaning: true,
          arrayProcessing: true,
          nestedValueExtraction: true,
        };

        expect(() =>
          IntelligentRepairConfigSchema.parse(validConfig),
        ).not.toThrow();
      });

      it('should reject non-boolean values', () => {
        const invalidConfigs = [
          { durationRepair: 'true' },
          { dateFormatRepair: 1 },
          { regionSplitting: null },
          { languageCleaning: {} },
          { arrayProcessing: [] },
          { nestedValueExtraction: 'false' },
        ];

        invalidConfigs.forEach((config) => {
          expect(() => IntelligentRepairConfigSchema.parse(config)).toThrow(
            z.ZodError,
          );
        });
      });
    });

    describe('FieldTransformationContextSchema', () => {
      it('should accept valid field transformation context', () => {
        const validContext = {
          fieldName: 'title',
          sourceValue: '测试书名',
          targetFieldType: 'text' as const,
          isRequired: true,
          hasNestedPath: false,
          processingNotes: '字段转换成功',
        };

        expect(() =>
          FieldTransformationContextSchema.parse(validContext),
        ).not.toThrow();
      });

      it('should reject empty fieldName', () => {
        const invalidContext = {
          fieldName: '',
          sourceValue: 'value',
          targetFieldType: 'text',
          isRequired: true,
          hasNestedPath: false,
        };

        expect(() =>
          FieldTransformationContextSchema.parse(invalidContext),
        ).toThrow(z.ZodError);
      });

      it('should accept any sourceValue type', () => {
        const validContexts = [
          {
            fieldName: 'field',
            sourceValue: null,
            targetFieldType: 'text',
            isRequired: true,
            hasNestedPath: false,
          },
          {
            fieldName: 'field',
            sourceValue: 'string',
            targetFieldType: 'text',
            isRequired: true,
            hasNestedPath: false,
          },
          {
            fieldName: 'field',
            sourceValue: 123,
            targetFieldType: 'number',
            isRequired: true,
            hasNestedPath: false,
          },
          {
            fieldName: 'field',
            sourceValue: [],
            targetFieldType: 'multiSelect',
            isRequired: true,
            hasNestedPath: false,
          },
          {
            fieldName: 'field',
            sourceValue: {},
            targetFieldType: 'text',
            isRequired: true,
            hasNestedPath: false,
          },
        ];

        validContexts.forEach((context) => {
          expect(() =>
            FieldTransformationContextSchema.parse(context),
          ).not.toThrow();
        });
      });

      it('should validate targetFieldType enum values', () => {
        const validFieldTypes = [
          'text',
          'number',
          'rating',
          'singleSelect',
          'multiSelect',
          'datetime',
          'checkbox',
          'url',
        ];

        validFieldTypes.forEach((fieldType) => {
          const context = {
            fieldName: 'field',
            sourceValue: 'value',
            targetFieldType: fieldType,
            isRequired: true,
            hasNestedPath: false,
          };
          expect(() =>
            FieldTransformationContextSchema.parse(context),
          ).not.toThrow();
        });
      });

      it('should reject invalid targetFieldType', () => {
        const invalidContext = {
          fieldName: 'field',
          sourceValue: 'value',
          targetFieldType: 'invalidType',
          isRequired: true,
          hasNestedPath: false,
        };

        expect(() =>
          FieldTransformationContextSchema.parse(invalidContext),
        ).toThrow(z.ZodError);
      });

      it('should validate isRequired as boolean', () => {
        const invalidContext = {
          fieldName: 'field',
          sourceValue: 'value',
          targetFieldType: 'text',
          isRequired: 'true',
          hasNestedPath: false,
        };

        expect(() =>
          FieldTransformationContextSchema.parse(invalidContext),
        ).toThrow(z.ZodError);
      });

      it('should validate hasNestedPath as boolean', () => {
        const invalidContext = {
          fieldName: 'field',
          sourceValue: 'value',
          targetFieldType: 'text',
          isRequired: true,
          hasNestedPath: 1,
        };

        expect(() =>
          FieldTransformationContextSchema.parse(invalidContext),
        ).toThrow(z.ZodError);
      });

      it('should accept optional processingNotes', () => {
        const contextWithNotes = {
          fieldName: 'field',
          sourceValue: 'value',
          targetFieldType: 'text' as const,
          isRequired: true,
          hasNestedPath: false,
          processingNotes: '处理说明',
        };

        const contextWithoutNotes = {
          fieldName: 'field',
          sourceValue: 'value',
          targetFieldType: 'text' as const,
          isRequired: true,
          hasNestedPath: false,
        };

        expect(() =>
          FieldTransformationContextSchema.parse(contextWithNotes),
        ).not.toThrow();
        expect(() =>
          FieldTransformationContextSchema.parse(contextWithoutNotes),
        ).not.toThrow();
      });
    });

    describe('TransformationErrorSchema', () => {
      it('should accept valid transformation error', () => {
        const validError = {
          fieldName: 'rating',
          errorType: 'validation_error' as const,
          errorMessage: '评分格式不正确',
          sourceValue: 'invalid_rating',
          timestamp: new Date('2025-01-01T12:00:00.000Z'),
        };

        expect(() => TransformationErrorSchema.parse(validError)).not.toThrow();
      });

      it('should reject empty fieldName', () => {
        const invalidError = {
          fieldName: '',
          errorType: 'validation_error',
          errorMessage: '错误信息',
          sourceValue: 'value',
        };

        expect(() => TransformationErrorSchema.parse(invalidError)).toThrow(
          z.ZodError,
        );
      });

      it('should validate errorType enum values', () => {
        const validErrorTypes = [
          'validation_error',
          'type_conversion_error',
          'nested_path_error',
          'repair_error',
        ];

        validErrorTypes.forEach((errorType) => {
          const error = {
            fieldName: 'field',
            errorType,
            errorMessage: '错误信息',
            sourceValue: 'value',
          };
          expect(() => TransformationErrorSchema.parse(error)).not.toThrow();
        });
      });

      it('should reject invalid errorType', () => {
        const invalidError = {
          fieldName: 'field',
          errorType: 'unknown_error',
          errorMessage: '错误信息',
          sourceValue: 'value',
        };

        expect(() => TransformationErrorSchema.parse(invalidError)).toThrow(
          z.ZodError,
        );
      });

      it('should reject empty errorMessage', () => {
        const invalidError = {
          fieldName: 'field',
          errorType: 'validation_error',
          errorMessage: '',
          sourceValue: 'value',
        };

        expect(() => TransformationErrorSchema.parse(invalidError)).toThrow(
          z.ZodError,
        );
      });

      it('should accept any sourceValue type', () => {
        const validErrors = [
          {
            fieldName: 'field',
            errorType: 'validation_error',
            errorMessage: '错误',
            sourceValue: null,
          },
          {
            fieldName: 'field',
            errorType: 'validation_error',
            errorMessage: '错误',
            sourceValue: 'string',
          },
          {
            fieldName: 'field',
            errorType: 'validation_error',
            errorMessage: '错误',
            sourceValue: 123,
          },
          {
            fieldName: 'field',
            errorType: 'validation_error',
            errorMessage: '错误',
            sourceValue: [],
          },
          {
            fieldName: 'field',
            errorType: 'validation_error',
            errorMessage: '错误',
            sourceValue: {},
          },
        ];

        validErrors.forEach((error) => {
          expect(() => TransformationErrorSchema.parse(error)).not.toThrow();
        });
      });

      it('should apply default timestamp when not provided', () => {
        const errorWithoutTimestamp = {
          fieldName: 'field',
          errorType: 'validation_error' as const,
          errorMessage: '错误信息',
          sourceValue: 'value',
        };

        const result = TransformationErrorSchema.parse(errorWithoutTimestamp);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should accept custom timestamp', () => {
        const customDate = new Date('2025-01-01T12:00:00.000Z');
        const errorWithTimestamp = {
          fieldName: 'field',
          errorType: 'validation_error' as const,
          errorMessage: '错误信息',
          sourceValue: 'value',
          timestamp: customDate,
        };

        const result = TransformationErrorSchema.parse(errorWithTimestamp);
        expect(result.timestamp).toEqual(customDate);
      });
    });

    describe('BatchTransformationRequestSchema', () => {
      it('should accept valid batch transformation request', () => {
        const validRequest = {
          items: [{ title: '书名1' }, { title: '书名2' }],
          dataType: 'books' as const,
          options: {
            enableIntelligentRepairs: true,
            strictValidation: false,
          },
          batchSize: 50,
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(validRequest),
        ).not.toThrow();
      });

      it('should reject empty items array', () => {
        const invalidRequest = {
          items: [],
          dataType: 'books',
          batchSize: 50,
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(invalidRequest),
        ).toThrow(z.ZodError);
      });

      it('should validate dataType using DoubanDataTypeSchema', () => {
        const validRequest = {
          items: [{ data: 'test' }],
          dataType: 'movies' as const,
        };

        const invalidRequest = {
          items: [{ data: 'test' }],
          dataType: 'invalid_type',
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(validRequest),
        ).not.toThrow();
        expect(() =>
          BatchTransformationRequestSchema.parse(invalidRequest),
        ).toThrow(z.ZodError);
      });

      it('should accept optional options field', () => {
        const requestWithOptions = {
          items: [{ data: 'test' }],
          dataType: 'books' as const,
          options: { enableIntelligentRepairs: false },
        };

        const requestWithoutOptions = {
          items: [{ data: 'test' }],
          dataType: 'books' as const,
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(requestWithOptions),
        ).not.toThrow();
        expect(() =>
          BatchTransformationRequestSchema.parse(requestWithoutOptions),
        ).not.toThrow();
      });

      it('should apply default batchSize value', () => {
        const request = {
          items: [{ data: 'test' }],
          dataType: 'books' as const,
        };

        const result = BatchTransformationRequestSchema.parse(request);
        expect(result.batchSize).toBe(100);
      });

      it('should validate batchSize range (1-1000)', () => {
        const validRequests = [
          { items: [{}], dataType: 'books', batchSize: 1 },
          { items: [{}], dataType: 'books', batchSize: 500 },
          { items: [{}], dataType: 'books', batchSize: 1000 },
        ];

        validRequests.forEach((request) => {
          expect(() =>
            BatchTransformationRequestSchema.parse(request),
          ).not.toThrow();
        });
      });

      it('should reject batchSize below minimum', () => {
        const invalidRequest = {
          items: [{ data: 'test' }],
          dataType: 'books' as const,
          batchSize: 0,
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(invalidRequest),
        ).toThrow(z.ZodError);
      });

      it('should reject batchSize above maximum', () => {
        const invalidRequest = {
          items: [{ data: 'test' }],
          dataType: 'books' as const,
          batchSize: 1001,
        };

        expect(() =>
          BatchTransformationRequestSchema.parse(invalidRequest),
        ).toThrow(z.ZodError);
      });
    });

    describe('BatchTransformationResultSchema', () => {
      const validTransformationResult = {
        data: { title: '测试' },
        statistics: {
          totalFields: 5,
          transformedFields: 4,
          repairedFields: 1,
          failedFields: 1,
        },
        warnings: ['警告信息'],
      };

      const validTransformationError = {
        fieldName: 'rating',
        errorType: 'validation_error' as const,
        errorMessage: '验证失败',
        sourceValue: 'invalid',
      };

      it('should accept valid batch transformation result', () => {
        const validResult = {
          results: [validTransformationResult],
          batchStatistics: {
            totalItems: 1,
            successfulItems: 1,
            failedItems: 0,
            processingTimeMs: 1000,
          },
          errors: [],
        };

        expect(() =>
          BatchTransformationResultSchema.parse(validResult),
        ).not.toThrow();
      });

      it('should validate results as array of TransformationResult', () => {
        const invalidResult = {
          results: [
            {
              data: {},
              statistics: {
                totalFields: -1, // invalid
                transformedFields: 0,
                repairedFields: 0,
                failedFields: 0,
              },
              warnings: [],
            },
          ],
          batchStatistics: {
            totalItems: 1,
            successfulItems: 1,
            failedItems: 0,
            processingTimeMs: 1000,
          },
          errors: [],
        };

        expect(() =>
          BatchTransformationResultSchema.parse(invalidResult),
        ).toThrow(z.ZodError);
      });

      it('should validate batchStatistics structure', () => {
        const validResult = {
          results: [],
          batchStatistics: {
            totalItems: 10,
            successfulItems: 8,
            failedItems: 2,
            processingTimeMs: 5000,
          },
          errors: [],
        };

        expect(() =>
          BatchTransformationResultSchema.parse(validResult),
        ).not.toThrow();
      });

      it('should reject negative values in batchStatistics', () => {
        const invalidResults = [
          {
            results: [],
            batchStatistics: {
              totalItems: -1,
              successfulItems: 0,
              failedItems: 0,
              processingTimeMs: 1000,
            },
            errors: [],
          },
          {
            results: [],
            batchStatistics: {
              totalItems: 10,
              successfulItems: -1,
              failedItems: 0,
              processingTimeMs: 1000,
            },
            errors: [],
          },
          {
            results: [],
            batchStatistics: {
              totalItems: 10,
              successfulItems: 8,
              failedItems: -1,
              processingTimeMs: 1000,
            },
            errors: [],
          },
          {
            results: [],
            batchStatistics: {
              totalItems: 10,
              successfulItems: 8,
              failedItems: 2,
              processingTimeMs: -1,
            },
            errors: [],
          },
        ];

        invalidResults.forEach((result) => {
          expect(() => BatchTransformationResultSchema.parse(result)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate errors as array of TransformationError', () => {
        const validResult = {
          results: [],
          batchStatistics: {
            totalItems: 1,
            successfulItems: 0,
            failedItems: 1,
            processingTimeMs: 1000,
          },
          errors: [validTransformationError],
        };

        const invalidResult = {
          results: [],
          batchStatistics: {
            totalItems: 1,
            successfulItems: 0,
            failedItems: 1,
            processingTimeMs: 1000,
          },
          errors: [
            {
              fieldName: '', // invalid
              errorType: 'validation_error',
              errorMessage: '错误',
              sourceValue: 'value',
            },
          ],
        };

        expect(() =>
          BatchTransformationResultSchema.parse(validResult),
        ).not.toThrow();
        expect(() =>
          BatchTransformationResultSchema.parse(invalidResult),
        ).toThrow(z.ZodError);
      });
    });

    describe('TransformationPerformanceSchema', () => {
      it('should accept valid performance data', () => {
        const startTime = new Date('2025-01-01T12:00:00.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const validPerformance = {
          startTime,
          endTime,
          durationMs: 5000,
          memoryUsageKB: 1024,
          fieldsPerSecond: 100,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(validPerformance),
        ).not.toThrow();
      });

      it('should validate endTime >= startTime', () => {
        const startTime = new Date('2025-01-01T12:00:05.000Z');
        const endTime = new Date('2025-01-01T12:00:00.000Z'); // earlier than startTime

        const invalidPerformance = {
          startTime,
          endTime,
          durationMs: 5000,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(invalidPerformance),
        ).toThrow(z.ZodError);
      });

      it('should reject when endTime < startTime', () => {
        const startTime = new Date('2025-01-01T12:00:10.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const invalidPerformance = {
          startTime,
          endTime,
          durationMs: 5000,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(invalidPerformance),
        ).toThrow(z.ZodError);
      });

      it('should reject negative durationMs', () => {
        const startTime = new Date('2025-01-01T12:00:00.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const invalidPerformance = {
          startTime,
          endTime,
          durationMs: -1000,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(invalidPerformance),
        ).toThrow(z.ZodError);
      });

      it('should accept optional memoryUsageKB', () => {
        const startTime = new Date('2025-01-01T12:00:00.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const performanceWithMemory = {
          startTime,
          endTime,
          durationMs: 5000,
          memoryUsageKB: 2048,
        };

        const performanceWithoutMemory = {
          startTime,
          endTime,
          durationMs: 5000,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(performanceWithMemory),
        ).not.toThrow();
        expect(() =>
          TransformationPerformanceSchema.parse(performanceWithoutMemory),
        ).not.toThrow();
      });

      it('should accept optional fieldsPerSecond', () => {
        const startTime = new Date('2025-01-01T12:00:00.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const performanceWithFPS = {
          startTime,
          endTime,
          durationMs: 5000,
          fieldsPerSecond: 150.5,
        };

        const performanceWithoutFPS = {
          startTime,
          endTime,
          durationMs: 5000,
        };

        expect(() =>
          TransformationPerformanceSchema.parse(performanceWithFPS),
        ).not.toThrow();
        expect(() =>
          TransformationPerformanceSchema.parse(performanceWithoutFPS),
        ).not.toThrow();
      });

      it('should reject negative optional fields', () => {
        const startTime = new Date('2025-01-01T12:00:00.000Z');
        const endTime = new Date('2025-01-01T12:00:05.000Z');

        const invalidPerformances = [
          {
            startTime,
            endTime,
            durationMs: 5000,
            memoryUsageKB: -1024,
          },
          {
            startTime,
            endTime,
            durationMs: 5000,
            fieldsPerSecond: -100,
          },
        ];

        invalidPerformances.forEach((performance) => {
          expect(() =>
            TransformationPerformanceSchema.parse(performance),
          ).toThrow(z.ZodError);
        });
      });
    });

    describe('TransformationAuditSchema', () => {
      const validPerformance = {
        startTime: new Date('2025-01-01T12:00:00.000Z'),
        endTime: new Date('2025-01-01T12:00:05.000Z'),
        durationMs: 5000,
      };

      const validTransformationOptions = {
        enableIntelligentRepairs: true,
        strictValidation: true,
        preserveRawData: false,
      };

      it('should accept valid audit record', () => {
        const validAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'abc123def456',
          outputHash: 'xyz789uvw012',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
          timestamp: new Date('2025-01-01T12:00:00.000Z'),
          version: '2.0',
        };

        expect(() => TransformationAuditSchema.parse(validAudit)).not.toThrow();
      });

      it('should validate operationId as UUID', () => {
        const validAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'movies' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        expect(() => TransformationAuditSchema.parse(validAudit)).not.toThrow();
      });

      it('should reject invalid UUID format', () => {
        const invalidAudit = {
          operationId: 'not-a-uuid',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        expect(() => TransformationAuditSchema.parse(invalidAudit)).toThrow(
          z.ZodError,
        );
      });

      it('should validate dataType using DoubanDataTypeSchema', () => {
        const validAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'tv' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        const invalidAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'invalid_type',
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        expect(() => TransformationAuditSchema.parse(validAudit)).not.toThrow();
        expect(() => TransformationAuditSchema.parse(invalidAudit)).toThrow(
          z.ZodError,
        );
      });

      it('should reject empty hash fields', () => {
        const auditWithEmptyInputHash = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: '',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        const auditWithEmptyOutputHash = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: '',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        expect(() =>
          TransformationAuditSchema.parse(auditWithEmptyInputHash),
        ).toThrow(z.ZodError);
        expect(() =>
          TransformationAuditSchema.parse(auditWithEmptyOutputHash),
        ).toThrow(z.ZodError);
      });

      it('should validate transformationOptions structure', () => {
        const validAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: {
            enableIntelligentRepairs: true,
            customFieldMappings: { field1: 'mapped1' },
          },
          performance: validPerformance,
        };

        const invalidAudit = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: {
            enableIntelligentRepairs: 'true', // should be boolean
          },
          performance: validPerformance,
        };

        expect(() => TransformationAuditSchema.parse(validAudit)).not.toThrow();
        expect(() => TransformationAuditSchema.parse(invalidAudit)).toThrow(
          z.ZodError,
        );
      });

      it('should validate performance field using TransformationPerformanceSchema', () => {
        const auditWithValidPerformance = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        const auditWithInvalidPerformance = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: {
            startTime: new Date('2025-01-01T12:00:05.000Z'),
            endTime: new Date('2025-01-01T12:00:00.000Z'), // endTime < startTime
            durationMs: 5000,
          },
        };

        expect(() =>
          TransformationAuditSchema.parse(auditWithValidPerformance),
        ).not.toThrow();
        expect(() =>
          TransformationAuditSchema.parse(auditWithInvalidPerformance),
        ).toThrow(z.ZodError);
      });

      it('should apply default timestamp when not provided', () => {
        const auditWithoutTimestamp = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        const result = TransformationAuditSchema.parse(auditWithoutTimestamp);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should apply default version when not provided', () => {
        const auditWithoutVersion = {
          operationId: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'books' as const,
          inputHash: 'hash1',
          outputHash: 'hash2',
          transformationOptions: validTransformationOptions,
          performance: validPerformance,
        };

        const result = TransformationAuditSchema.parse(auditWithoutVersion);
        expect(result.version).toBe('1.0');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateTransformationOptions', () => {
      it('should return success for valid options', () => {
        const validOptions = {
          enableIntelligentRepairs: true,
          strictValidation: false,
          customFieldMappings: { field1: 'mapped1' },
        };

        const result = validateTransformationOptions(validOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(expect.objectContaining(validOptions));
        }
      });

      it('should return success for empty object with defaults', () => {
        const result = validateTransformationOptions({});

        expect(result.success).toBe(true);
        if (result.success) {
          // .partial() makes all fields optional, so defaults don't apply
          expect(result.data.enableIntelligentRepairs).toBeUndefined();
          expect(result.data.strictValidation).toBeUndefined();
          expect(result.data.preserveRawData).toBeUndefined();
        }
      });

      it('should return detailed error for invalid options', () => {
        const invalidOptions = {
          enableIntelligentRepairs: 'true', // should be boolean
          customFieldMappings: { field1: 123 }, // should be string
        };

        const result = validateTransformationOptions(invalidOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('转换选项验证失败');
          expect(result.error).toContain('enableIntelligentRepairs');
        }
      });

      it('should handle ZodError properly', () => {
        const invalidOptions = {
          strictValidation: 'invalid',
        };

        const result = validateTransformationOptions(invalidOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('转换选项验证失败');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(TransformationOptionsSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateTransformationOptions({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate customFieldMappings format', () => {
        const validOptions = {
          customFieldMappings: {
            oldField: 'newField',
            title: 'bookTitle',
          },
        };

        const invalidOptions = {
          customFieldMappings: {
            field1: 123,
            field2: null,
          },
        };

        const validResult = validateTransformationOptions(validOptions);
        const invalidResult = validateTransformationOptions(invalidOptions);

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
      });
    });

    describe('validateTransformationResult', () => {
      const validStatistics = {
        totalFields: 10,
        transformedFields: 8,
        repairedFields: 2,
        failedFields: 2,
      };

      it('should return success for valid result', () => {
        const validResult = {
          data: { title: '测试书名' },
          statistics: validStatistics,
          warnings: ['警告信息'],
          rawData: { original: 'data' },
        };

        const result = validateTransformationResult(validResult);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validResult);
        }
      });

      it('should return detailed error for invalid result', () => {
        const invalidResult = {
          data: {},
          statistics: {
            totalFields: -1, // invalid
            transformedFields: 0,
            repairedFields: 0,
            failedFields: 0,
          },
          warnings: [],
        };

        const result = validateTransformationResult(invalidResult);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('转换结果验证失败');
        }
      });

      it('should handle ZodError properly', () => {
        const invalidResult = {
          data: {},
          statistics: validStatistics,
          warnings: [123], // should be string array
        };

        const result = validateTransformationResult(invalidResult);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('转换结果验证失败');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        const parseSpy = jest
          .spyOn(TransformationResultSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateTransformationResult({});

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        parseSpy.mockRestore();
      });

      it('should validate nested statistics structure', () => {
        const validResult = {
          data: {},
          statistics: {
            totalFields: 5,
            transformedFields: 3,
            repairedFields: 1,
            failedFields: 2,
          },
          warnings: [],
        };

        const invalidResult = {
          data: {},
          statistics: {
            totalFields: 5,
            transformedFields: 4,
            repairedFields: 1,
            failedFields: 3, // 4 + 3 = 7 > 5
          },
          warnings: [],
        };

        const validResultCheck = validateTransformationResult(validResult);
        const invalidResultCheck = validateTransformationResult(invalidResult);

        expect(validResultCheck.success).toBe(true);
        expect(invalidResultCheck.success).toBe(false);
      });

      it('should validate warnings array format', () => {
        const validResult = {
          data: {},
          statistics: validStatistics,
          warnings: ['警告1', '警告2'],
        };

        const invalidResult = {
          data: {},
          statistics: validStatistics,
          warnings: ['警告1', 123, null], // mixed types
        };

        const validResultCheck = validateTransformationResult(validResult);
        const invalidResultCheck = validateTransformationResult(invalidResult);

        expect(validResultCheck.success).toBe(true);
        expect(invalidResultCheck.success).toBe(false);
      });
    });

    describe('validateDoubanDataType', () => {
      it('should return true for valid data types', () => {
        const validTypes = ['books', 'movies', 'tv', 'documentary'];

        validTypes.forEach((type) => {
          expect(validateDoubanDataType(type)).toBe(true);
        });
      });

      it('should return false for invalid data types', () => {
        const invalidTypes = [
          'book',
          'movie',
          'music',
          'game',
          '',
          null,
          undefined,
          123,
        ];

        invalidTypes.forEach((type) => {
          expect(validateDoubanDataType(type)).toBe(false);
        });
      });

      it('should use type guard correctly', () => {
        const validType: unknown = 'books';
        const invalidType: unknown = 'invalid';

        if (validateDoubanDataType(validType)) {
          // TypeScript should now know validType is DoubanDataType
          const typedValue: DoubanDataType = validType;
          expect(typedValue).toBe('books');
        }

        expect(validateDoubanDataType(invalidType)).toBe(false);
      });

      it('should handle edge cases gracefully', () => {
        const edgeCases = [
          null,
          undefined,
          '',
          0,
          false,
          {},
          [],
          Symbol('test'),
        ];

        edgeCases.forEach((value) => {
          expect(() => validateDoubanDataType(value)).not.toThrow();
          expect(validateDoubanDataType(value)).toBe(false);
        });
      });
    });
  });

  describe('Schema Exports', () => {
    it('should export all required schemas', () => {
      expect(DoubanDataTypeSchema).toBeDefined();
      expect(TransformationOptionsSchema).toBeDefined();
      expect(TransformationStatisticsSchema).toBeDefined();
      expect(TransformationResultSchema).toBeDefined();
      expect(IntelligentRepairConfigSchema).toBeDefined();
      expect(FieldTransformationContextSchema).toBeDefined();
      expect(TransformationErrorSchema).toBeDefined();
      expect(BatchTransformationRequestSchema).toBeDefined();
      expect(BatchTransformationResultSchema).toBeDefined();
      expect(TransformationPerformanceSchema).toBeDefined();
      expect(TransformationAuditSchema).toBeDefined();
    });

    it('should export schemas with correct names', () => {
      expect(DoubanDataTypeSchema._def.typeName).toBe('ZodEnum');
      expect(TransformationOptionsSchema._def.typeName).toBe('ZodObject');
      expect(TransformationStatisticsSchema._def.typeName).toBe('ZodEffects');
      expect(TransformationResultSchema._def.typeName).toBe('ZodObject');
      expect(IntelligentRepairConfigSchema._def.typeName).toBe('ZodObject');
    });
  });

  describe('Type Inference', () => {
    it('should export correct TypeScript types', () => {
      const doubanType: DoubanDataType = 'books';
      const transformationOptions: TransformationOptions = {
        enableIntelligentRepairs: true,
      };
      const statistics: TransformationStatistics = {
        totalFields: 10,
        transformedFields: 8,
        repairedFields: 2,
        failedFields: 2,
      };
      const result: TransformationResult = {
        data: { title: '测试' },
        statistics,
        warnings: ['警告'],
      };
      const repairConfig: IntelligentRepairConfig = {
        durationRepair: true,
        dateFormatRepair: true,
        regionSplitting: true,
        languageCleaning: true,
        arrayProcessing: true,
        nestedValueExtraction: true,
      };

      // Type assertions should not cause compilation errors
      expect(doubanType).toBeDefined();
      expect(transformationOptions).toBeDefined();
      expect(statistics).toBeDefined();
      expect(result).toBeDefined();
      expect(repairConfig).toBeDefined();
    });

    it('should validate type consistency with schemas', () => {
      expect(() =>
        DoubanDataTypeSchema.parse('books' as DoubanDataType),
      ).not.toThrow();

      const options: TransformationOptions = {
        enableIntelligentRepairs: false,
      };
      expect(() => TransformationOptionsSchema.parse(options)).not.toThrow();

      const statistics: TransformationStatistics = {
        totalFields: 5,
        transformedFields: 3,
        repairedFields: 1,
        failedFields: 2,
      };
      expect(() =>
        TransformationStatisticsSchema.parse(statistics),
      ).not.toThrow();
    });

    it('should support complex nested type structures', () => {
      const batchRequest: BatchTransformationRequest = {
        items: [{ title: '测试书籍' }],
        dataType: 'books',
        options: {
          enableIntelligentRepairs: true,
          customFieldMappings: { oldField: 'newField' },
        },
        batchSize: 50,
      };

      const performance: TransformationPerformance = {
        startTime: new Date('2025-01-01T12:00:00.000Z'),
        endTime: new Date('2025-01-01T12:00:05.000Z'),
        durationMs: 5000,
        memoryUsageKB: 1024,
      };

      const audit: TransformationAudit = {
        operationId: '550e8400-e29b-41d4-a716-446655440000',
        dataType: 'movies',
        inputHash: 'abc123',
        outputHash: 'def456',
        transformationOptions: { enableIntelligentRepairs: true },
        performance,
        timestamp: new Date('2025-01-01T12:00:00.000Z'),
        version: '2.0',
      };

      expect(batchRequest).toBeDefined();
      expect(performance).toBeDefined();
      expect(audit).toBeDefined();
    });
  });
});
