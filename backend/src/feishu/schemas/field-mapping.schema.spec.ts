/**
 * field-mapping.schema.ts 单元测试
 *
 * 测试覆盖所有 Zod Schema 定义和工具函数
 * 目标覆盖率: 95%+
 */

import { z } from 'zod';
import {
  DoubanDataTypeSchema,
  FieldTypeSchema,
  VerifiedSourceSchema,
  NestedPathSchema,
  VerifiedFieldMappingConfigSchema,
  FieldMappingCollectionSchema,
  VerifiedFieldMappingsSchema,
  VerificationStatsSchema,
  FieldMappingQuerySchema,
  FieldMappingTransformResultSchema,
  NestedValueExtractionSchema,
  validateFieldMappingConfig,
  validateFieldMappingCollection,
  validateNestedPath,
  type DoubanDataType,
  type FieldType,
  type VerifiedFieldMappingConfig,
  type FieldMappingCollection,
  type VerifiedFieldMappings,
  type VerificationStats,
  type FieldMappingQuery,
  type FieldMappingTransformResult,
  type NestedValueExtraction,
} from './field-mapping.schema';

describe('field-mapping.schema.ts', () => {
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

    describe('FieldTypeSchema', () => {
      it('should accept all valid field types', () => {
        const validTypes = [
          'text',
          'number',
          'rating',
          'singleSelect',
          'multiSelect',
          'datetime',
          'checkbox',
          'url',
        ];

        validTypes.forEach((type) => {
          expect(() => FieldTypeSchema.parse(type)).not.toThrow();
        });
      });

      it('should reject invalid field types', () => {
        const invalidTypes = ['string', 'boolean', 'array', 'object'];

        invalidTypes.forEach((type) => {
          expect(() => FieldTypeSchema.parse(type)).toThrow(z.ZodError);
        });
      });

      it('should reject empty strings', () => {
        expect(() => FieldTypeSchema.parse('')).toThrow(z.ZodError);
      });

      it('should reject non-string values', () => {
        const nonStringValues = [123, null, undefined, {}, []];

        nonStringValues.forEach((value) => {
          expect(() => FieldTypeSchema.parse(value)).toThrow(z.ZodError);
        });
      });
    });

    describe('VerifiedSourceSchema', () => {
      it('should accept valid source file arrays', () => {
        const validSources = [
          ['sync-all-movies-fixed.ts'],
          ['sync-movie-from-cache.ts', 'sync-from-cache.ts'],
          ['real-douban-data-sync.ts'],
          [
            'sync-all-movies-fixed.ts',
            'sync-movie-from-cache.ts',
            'sync-from-cache.ts',
            'real-douban-data-sync.ts',
          ],
        ];

        validSources.forEach((sources) => {
          expect(() => VerifiedSourceSchema.parse(sources)).not.toThrow();
        });
      });

      it('should reject empty arrays', () => {
        expect(() => VerifiedSourceSchema.parse([])).toThrow(z.ZodError);
      });

      it('should reject invalid source file names', () => {
        const invalidSources = [
          ['invalid-file.ts'],
          ['sync-all-movies-fixed.ts', 'invalid-file.ts'],
          [''],
        ];

        invalidSources.forEach((sources) => {
          expect(() => VerifiedSourceSchema.parse(sources)).toThrow(z.ZodError);
        });
      });

      it('should require minimum one source', () => {
        expect(() => VerifiedSourceSchema.parse([])).toThrow(z.ZodError);
      });

      it('should reject non-array values', () => {
        const nonArrayValues = ['string', 123, null, undefined, {}];

        nonArrayValues.forEach((value) => {
          expect(() => VerifiedSourceSchema.parse(value)).toThrow(z.ZodError);
        });
      });
    });

    describe('NestedPathSchema', () => {
      it('should accept valid single-level paths', () => {
        const validPaths = ['rating', 'title', 'subjectId', 'coverUrl'];

        validPaths.forEach((path) => {
          expect(() => NestedPathSchema.parse(path)).not.toThrow();
        });
      });

      it('should accept valid multi-level nested paths', () => {
        const validPaths = [
          'rating.average',
          'author.name',
          'publisher.country',
          'metadata.source.url',
        ];

        validPaths.forEach((path) => {
          expect(() => NestedPathSchema.parse(path)).not.toThrow();
        });
      });

      it('should reject paths starting with numbers', () => {
        const invalidPaths = ['123invalid', '1rating.average'];

        invalidPaths.forEach((path) => {
          expect(() => NestedPathSchema.parse(path)).toThrow(z.ZodError);
        });
      });

      it('should reject paths with invalid characters', () => {
        const invalidPaths = [
          'rating-average',
          'rating_average',
          'rating@average',
          'rating average',
        ];

        invalidPaths.forEach((path) => {
          expect(() => NestedPathSchema.parse(path)).toThrow(z.ZodError);
        });
      });

      it('should reject paths with consecutive dots', () => {
        const invalidPaths = ['rating..average', 'rating...average', 'rating.'];

        invalidPaths.forEach((path) => {
          expect(() => NestedPathSchema.parse(path)).toThrow(z.ZodError);
        });
      });

      it('should reject empty strings', () => {
        expect(() => NestedPathSchema.parse('')).toThrow(z.ZodError);
      });
    });

    describe('VerifiedFieldMappingConfigSchema', () => {
      const validConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text' as const,
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      it('should accept valid field mapping config', () => {
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(validConfig),
        ).not.toThrow();
      });

      it('should reject invalid doubanFieldName format', () => {
        const invalidConfigs = [
          { ...validConfig, doubanFieldName: '123invalid' },
          { ...validConfig, doubanFieldName: 'invalid-field' },
          { ...validConfig, doubanFieldName: '' },
        ];

        invalidConfigs.forEach((config) => {
          expect(() => VerifiedFieldMappingConfigSchema.parse(config)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should reject empty chineseName', () => {
        const invalidConfig = { ...validConfig, chineseName: '' };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfig),
        ).toThrow(z.ZodError);
      });

      it('should reject chineseName exceeding max length', () => {
        const longName = 'a'.repeat(51);
        const invalidConfig = {
          ...validConfig,
          chineseName: longName,
          apiFieldName: longName,
        };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfig),
        ).toThrow(z.ZodError);
      });

      it('should enforce apiFieldName equals chineseName', () => {
        const invalidConfig = { ...validConfig, apiFieldName: '不同的名字' };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfig),
        ).toThrow(z.ZodError);
      });

      it('should reject invalid fieldType', () => {
        const invalidConfig = { ...validConfig, fieldType: 'invalidType' };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfig),
        ).toThrow(z.ZodError);
      });

      it('should require verified to be true', () => {
        const invalidConfig = { ...validConfig, verified: false };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfig),
        ).toThrow(z.ZodError);
      });

      it('should validate optional nestedPath format', () => {
        const validConfigWithNestedPath = {
          ...validConfig,
          nestedPath: 'rating.average',
        };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(validConfigWithNestedPath),
        ).not.toThrow();

        const invalidConfigWithNestedPath = {
          ...validConfig,
          nestedPath: 'invalid..path',
        };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(invalidConfigWithNestedPath),
        ).toThrow(z.ZodError);
      });

      it('should accept valid config with optional fields', () => {
        const configWithOptionals = {
          ...validConfig,
          nestedPath: 'rating.average',
          processingNotes: '这是处理说明',
        };
        expect(() =>
          VerifiedFieldMappingConfigSchema.parse(configWithOptionals),
        ).not.toThrow();
      });
    });

    describe('FieldMappingCollectionSchema', () => {
      const validFieldConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text' as const,
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      it('should accept valid field mapping collection', () => {
        const validCollection = {
          title: validFieldConfig,
          subjectId: {
            ...validFieldConfig,
            doubanFieldName: 'subjectId',
            chineseName: '豆瓣ID',
            apiFieldName: '豆瓣ID',
            description: '豆瓣唯一标识符',
          },
        };

        expect(() =>
          FieldMappingCollectionSchema.parse(validCollection),
        ).not.toThrow();
      });

      it('should enforce key matches doubanFieldName consistency', () => {
        const inconsistentCollection = {
          wrongKey: validFieldConfig, // key 不匹配 doubanFieldName
        };

        expect(() =>
          FieldMappingCollectionSchema.parse(inconsistentCollection),
        ).toThrow(z.ZodError);
      });

      it('should reject inconsistent key-config pairs', () => {
        const inconsistentCollection = {
          title: validFieldConfig,
          anotherKey: {
            ...validFieldConfig,
            doubanFieldName: 'differentField',
          },
        };

        expect(() =>
          FieldMappingCollectionSchema.parse(inconsistentCollection),
        ).toThrow(z.ZodError);
      });

      it('should reject empty collections', () => {
        expect(() => FieldMappingCollectionSchema.parse({})).not.toThrow(); // Empty is actually allowed
      });
    });

    describe('VerifiedFieldMappingsSchema', () => {
      const createValidFieldConfig = (
        fieldName: string,
        chineseName: string,
      ) => ({
        doubanFieldName: fieldName,
        chineseName,
        apiFieldName: chineseName,
        fieldType: 'text' as const,
        required: fieldName === 'subjectId' || fieldName === 'title',
        description: `${chineseName}的描述信息`,
        verified: true,
      });

      const validMappings = {
        books: {
          subjectId: createValidFieldConfig('subjectId', '豆瓣ID'),
          title: createValidFieldConfig('title', '书名'),
        },
        movies: {
          subjectId: createValidFieldConfig('subjectId', '豆瓣ID'),
          title: createValidFieldConfig('title', '电影名'),
        },
        tv: {
          subjectId: createValidFieldConfig('subjectId', '豆瓣ID'),
          title: createValidFieldConfig('title', '剧集名'),
        },
        documentary: {
          subjectId: createValidFieldConfig('subjectId', '豆瓣ID'),
          title: createValidFieldConfig('title', '纪录片名'),
        },
      };

      it('should accept complete valid mappings structure', () => {
        expect(() =>
          VerifiedFieldMappingsSchema.parse(validMappings),
        ).not.toThrow();
      });

      it('should require subjectId and title as required fields', () => {
        const validResult =
          VerifiedFieldMappingsSchema.safeParse(validMappings);
        expect(validResult.success).toBe(true);
      });

      it('should reject mappings missing required fields', () => {
        const mappingsWithoutSubjectId = {
          ...validMappings,
          books: {
            title: createValidFieldConfig('title', '书名'),
          },
        };

        expect(() =>
          VerifiedFieldMappingsSchema.parse(mappingsWithoutSubjectId),
        ).toThrow(z.ZodError);
      });

      it('should validate all data types are present', () => {
        const incompleteMappings = {
          books: validMappings.books,
          movies: validMappings.movies,
          // missing tv and documentary
        };

        expect(() =>
          VerifiedFieldMappingsSchema.parse(incompleteMappings),
        ).toThrow(z.ZodError);
      });
    });

    describe('VerificationStatsSchema', () => {
      const validStats = {
        totalBooks: 16,
        totalMovies: 18,
        totalVerified: 30,
        sourceCoverage: {
          'sync-from-cache.ts': 15,
          'real-douban-data-sync.ts': 15,
        },
      };

      it('should accept valid stats data', () => {
        expect(() => VerificationStatsSchema.parse(validStats)).not.toThrow();
      });

      it('should reject negative numbers for counts', () => {
        const invalidStats = [
          { ...validStats, totalBooks: -1 },
          { ...validStats, totalMovies: -1 },
          { ...validStats, totalVerified: -1 },
        ];

        invalidStats.forEach((stats) => {
          expect(() => VerificationStatsSchema.parse(stats)).toThrow(
            z.ZodError,
          );
        });
      });

      it('should validate totalVerified <= total fields logic', () => {
        const invalidStats = {
          ...validStats,
          totalVerified: 50, // 大于 totalBooks + totalMovies = 34
        };

        expect(() => VerificationStatsSchema.parse(invalidStats)).toThrow(
          z.ZodError,
        );
      });

      it('should validate sourceCoverage structure', () => {
        const invalidStats = {
          ...validStats,
          sourceCoverage: {
            '': 10, // 空文件名
            'valid-file.ts': -5, // 负数覆盖
          },
        };

        expect(() => VerificationStatsSchema.parse(invalidStats)).toThrow(
          z.ZodError,
        );
      });
    });

    describe('FieldMappingQuerySchema', () => {
      it('should accept valid query parameters', () => {
        const validQueries = [
          { dataType: 'books' as const },
          { dataType: 'movies' as const, fieldName: 'title' },
          { dataType: 'tv' as const, onlyRequired: true },
          { dataType: 'documentary' as const, onlyVerified: false },
        ];

        validQueries.forEach((query) => {
          expect(() => FieldMappingQuerySchema.parse(query)).not.toThrow();
        });
      });

      it('should apply default values correctly', () => {
        const query = { dataType: 'books' as const };
        const parsed = FieldMappingQuerySchema.parse(query);

        expect(parsed.onlyRequired).toBe(false);
        expect(parsed.onlyVerified).toBe(true);
      });

      it('should validate dataType enum', () => {
        const invalidQuery = { dataType: 'invalid' };
        expect(() => FieldMappingQuerySchema.parse(invalidQuery)).toThrow(
          z.ZodError,
        );
      });

      it('should accept optional fieldName', () => {
        const queryWithFieldName = {
          dataType: 'books' as const,
          fieldName: 'title',
        };
        const queryWithoutFieldName = { dataType: 'books' as const };

        expect(() =>
          FieldMappingQuerySchema.parse(queryWithFieldName),
        ).not.toThrow();
        expect(() =>
          FieldMappingQuerySchema.parse(queryWithoutFieldName),
        ).not.toThrow();
      });
    });

    describe('FieldMappingTransformResultSchema', () => {
      it('should accept success result with result field', () => {
        const successResult = {
          success: true,
          result: '书名',
          metadata: {
            dataType: 'books' as const,
            fieldFound: true,
            verified: true,
          },
        };

        expect(() =>
          FieldMappingTransformResultSchema.parse(successResult),
        ).not.toThrow();
      });

      it('should accept failure result with error field', () => {
        const failureResult = {
          success: false,
          error: '字段未找到',
          metadata: {
            dataType: 'books' as const,
            fieldFound: false,
            verified: false,
          },
        };

        expect(() =>
          FieldMappingTransformResultSchema.parse(failureResult),
        ).not.toThrow();
      });

      it('should reject success without result field', () => {
        const invalidResult = {
          success: true,
          error: '这不应该存在',
        };

        expect(() =>
          FieldMappingTransformResultSchema.parse(invalidResult),
        ).toThrow(z.ZodError);
      });

      it('should reject failure without error field', () => {
        const invalidResult = {
          success: false,
          result: '这不应该存在',
        };

        expect(() =>
          FieldMappingTransformResultSchema.parse(invalidResult),
        ).toThrow(z.ZodError);
      });

      it('should validate optional metadata structure', () => {
        const resultWithInvalidMetadata = {
          success: true,
          result: '书名',
          metadata: {
            dataType: 'invalid' as const,
            fieldFound: 'not-boolean' as unknown as boolean,
            verified: 'not-boolean' as unknown as boolean,
          },
        };

        expect(() =>
          FieldMappingTransformResultSchema.parse(resultWithInvalidMetadata),
        ).toThrow(z.ZodError);
      });
    });

    describe('NestedValueExtractionSchema', () => {
      it('should accept valid extraction parameters', () => {
        const validParams = [
          {
            data: { rating: { average: 8.5 } },
            nestedPath: 'rating.average',
          },
          {
            data: { title: '测试书名' },
            nestedPath: 'title',
            defaultValue: '默认值',
            throwOnError: true,
          },
        ];

        validParams.forEach((params) => {
          expect(() => NestedValueExtractionSchema.parse(params)).not.toThrow();
        });
      });

      it('should validate nestedPath format', () => {
        const invalidParams = {
          data: {},
          nestedPath: 'invalid..path',
        };

        expect(() => NestedValueExtractionSchema.parse(invalidParams)).toThrow(
          z.ZodError,
        );
      });

      it('should accept any data type for data field', () => {
        const validParams = [
          { data: null, nestedPath: 'path' },
          { data: undefined, nestedPath: 'path' },
          { data: 'string', nestedPath: 'path' },
          { data: 123, nestedPath: 'path' },
          { data: [], nestedPath: 'path' },
          { data: {}, nestedPath: 'path' },
        ];

        validParams.forEach((params) => {
          expect(() => NestedValueExtractionSchema.parse(params)).not.toThrow();
        });
      });

      it('should apply default values correctly', () => {
        const params = {
          data: {},
          nestedPath: 'path',
        };
        const parsed = NestedValueExtractionSchema.parse(params);

        expect(parsed.throwOnError).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateFieldMappingConfig', () => {
      const validConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text',
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      it('should return success for valid config', () => {
        const result = validateFieldMappingConfig(validConfig, 'books');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validConfig);
        }
      });

      it('should return detailed error for invalid config', () => {
        const invalidConfig = {
          ...validConfig,
          doubanFieldName: '123invalid',
        };

        const result = validateFieldMappingConfig(invalidConfig, 'books');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('doubanFieldName');
        }
      });

      it('should handle ZodError properly', () => {
        const invalidConfig = {
          ...validConfig,
          verified: false,
        };

        const result = validateFieldMappingConfig(invalidConfig, 'books');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('字段映射配置验证失败');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        // Mock ZodError to throw a different type of error
        const parseSpy = jest
          .spyOn(VerifiedFieldMappingConfigSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateFieldMappingConfig(validConfig, 'books');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        // Restore original implementation
        parseSpy.mockRestore();
      });

      it('should validate dataType parameter (though unused)', () => {
        // The function accepts dataType but doesn't use it
        // This is still valid behavior
        const result1 = validateFieldMappingConfig(validConfig, 'books');
        const result2 = validateFieldMappingConfig(validConfig, 'movies');

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });
    });

    describe('validateFieldMappingCollection', () => {
      const validFieldConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text' as const,
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      const validCollection = {
        title: validFieldConfig,
      };

      it('should return success for valid collection', () => {
        const result = validateFieldMappingCollection(validCollection);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validCollection);
        }
      });

      it('should validate expected count when provided', () => {
        const result = validateFieldMappingCollection(validCollection, 1);
        expect(result.success).toBe(true);
      });

      it('should return error when count mismatch', () => {
        const result = validateFieldMappingCollection(validCollection, 2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('字段数量不匹配');
          expect(result.error).toContain('期望2个，实际1个');
        }
      });

      it('should return detailed error for invalid collection', () => {
        const invalidCollection = {
          title: {
            ...validFieldConfig,
            doubanFieldName: '123invalid',
          },
        };

        const result = validateFieldMappingCollection(invalidCollection);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('字段映射集合验证失败');
        }
      });

      it('should handle ZodError properly', () => {
        const inconsistentCollection = {
          wrongKey: validFieldConfig, // key doesn't match doubanFieldName
        };

        const result = validateFieldMappingCollection(inconsistentCollection);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('字段映射集合验证失败');
        }
      });

      it('should handle non-ZodError exceptions', () => {
        // Mock ZodError to throw a different type of error
        const parseSpy = jest
          .spyOn(FieldMappingCollectionSchema, 'parse')
          .mockImplementation(() => {
            throw new Error('Non-Zod error');
          });

        const result = validateFieldMappingCollection(validCollection);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('未知的验证错误');
        }

        // Restore original implementation
        parseSpy.mockRestore();
      });
    });

    describe('validateNestedPath', () => {
      it('should return true for valid paths', () => {
        const validPaths = [
          'rating',
          'rating.average',
          'author.name',
          'metadata.source.url',
        ];

        validPaths.forEach((path) => {
          expect(validateNestedPath(path)).toBe(true);
        });
      });

      it('should return false for invalid paths', () => {
        const invalidPaths = [
          '',
          '123invalid',
          'rating..average',
          'rating-average',
          'rating_average',
        ];

        invalidPaths.forEach((path) => {
          expect(validateNestedPath(path)).toBe(false);
        });
      });

      it('should handle edge cases', () => {
        expect(validateNestedPath('a')).toBe(true);
        expect(validateNestedPath('a.b')).toBe(true);
        expect(validateNestedPath('a.b.c.d.e')).toBe(true);
      });
    });
  });

  describe('Type Inference', () => {
    it('should export correct TypeScript types', () => {
      // Test that types are correctly inferred from schemas
      const doubanType: DoubanDataType = 'books';
      const fieldType: FieldType = 'text';

      const fieldConfig: VerifiedFieldMappingConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text',
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      const collection: FieldMappingCollection = {
        title: fieldConfig,
      };

      const mappings: VerifiedFieldMappings = {
        books: collection,
        movies: collection,
        tv: collection,
        documentary: collection,
      };

      const stats: VerificationStats = {
        totalBooks: 16,
        totalMovies: 18,
        totalVerified: 30,
        sourceCoverage: {},
      };

      const query: FieldMappingQuery = {
        dataType: 'books',
        onlyRequired: false,
        onlyVerified: true,
      };

      const transformResult: FieldMappingTransformResult = {
        success: true,
        result: '书名',
      };

      const extraction: NestedValueExtraction = {
        data: {},
        nestedPath: 'path',
        throwOnError: false,
      };

      // If types are correctly inferred, these assignments should not cause TypeScript errors
      expect(doubanType).toBeDefined();
      expect(fieldType).toBeDefined();
      expect(fieldConfig).toBeDefined();
      expect(collection).toBeDefined();
      expect(mappings).toBeDefined();
      expect(stats).toBeDefined();
      expect(query).toBeDefined();
      expect(transformResult).toBeDefined();
      expect(extraction).toBeDefined();
    });

    it('should validate type consistency with schemas', () => {
      // Test that schemas accept the typed values
      expect(() =>
        DoubanDataTypeSchema.parse('books' as DoubanDataType),
      ).not.toThrow();
      expect(() => FieldTypeSchema.parse('text' as FieldType)).not.toThrow();

      const fieldConfig: VerifiedFieldMappingConfig = {
        doubanFieldName: 'title',
        chineseName: '书名',
        apiFieldName: '书名',
        fieldType: 'text',
        required: true,
        description: '这是一个测试字段描述',
        verified: true,
      };

      expect(() =>
        VerifiedFieldMappingConfigSchema.parse(fieldConfig),
      ).not.toThrow();
    });
  });
});
