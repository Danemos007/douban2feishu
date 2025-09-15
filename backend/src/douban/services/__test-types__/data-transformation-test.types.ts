/**
 * DataTransformationService 测试专用类型定义
 *
 * 🎯 解决测试文件中所有类型安全问题的根本原因
 * 为测试数据和 Mock 对象提供完整的类型支持
 */

import { DataTransformationService } from '../data-transformation.service';
import {
  TransformationStatistics,
  DoubanDataType,
  TransformationOptions,
} from '../../contract/transformation.schema';
import {
  DoubanBookData,
  GenericTransformationResult,
  TransformedDataOutput,
  RawDataInput,
} from '../../types/transformation-generics.types';
import { VerifiedFieldMappingConfig } from '../../../feishu/config/douban-field-mapping.config';

// 测试用的完整类型化服务接口 - 独立定义避免继承冲突
export interface TypedDataTransformationService {
  // 公共方法 (来自原服务) - 严格对齐实际服务签名
  transformDoubanData<
    TInput extends RawDataInput,
    TOutput extends TransformedDataOutput,
  >(
    rawData: TInput,
    dataType: DoubanDataType,
    options?: TransformationOptions,
  ): GenericTransformationResult<TOutput>;

  // 公开私有方法进行测试 (使用类型安全的方式)
  extractNestedValue(
    obj: Record<string, unknown>,
    fieldConfig: VerifiedFieldMappingConfig,
  ): unknown;
  processArrayField(
    value: unknown,
    fieldConfig: VerifiedFieldMappingConfig,
  ): string;
  applyGeneralTransformation(
    rawData: Record<string, unknown>,
    fieldMappings: Record<string, VerifiedFieldMappingConfig>,
  ): Record<string, unknown>;
  generateTransformationStats(): TransformationStatistics;
  collectWarnings(): string[];
  validateSelectField(
    value: unknown,
    fieldName: string,
    dataType: string,
  ): unknown;
  validateRatingField(value: unknown): unknown;
  validateDateTimeField(value: unknown): unknown;
}

// 测试数据类型定义
export interface TestRawData {
  subjectId: string;
  title: string;
  [key: string]: unknown;
}

export interface TestBookData extends TestRawData {
  author?: string | string[];
  publisher?: string;
  publishDate?: string;
  rating?: {
    average?: number | string;
    numRaters?: number;
  };
}

export interface TestMovieData extends TestRawData {
  director?: string | string[];
  cast?: string | string[];
  duration?: string;
  releaseDate?: string;
  country?: string;
  language?: string;
}

// 测试结果类型
export interface TypedTestResult<
  T extends TransformedDataOutput = Record<string, unknown>,
> extends GenericTransformationResult<T> {
  data: T;
  statistics: TransformationStatistics;
  warnings: string[];
  rawData?: Record<string, unknown>;
}

// 测试用的完整书籍结果类型 - 简化为兼容DoubanBookData
export interface TypedBookResult extends TypedTestResult<DoubanBookData> {
  data: DoubanBookData;
}

// 安全的测试参数类型 - 兼容RawDataInput
export type SafeTestInput = Record<string, unknown>;

// Mock 服务类型守卫函数
export function createTypedMockService(
  service: DataTransformationService,
): TypedDataTransformationService {
  return service as unknown as TypedDataTransformationService;
}

// 类型安全的测试数据创建函数
export function createTestBookData(
  overrides?: Partial<TestBookData>,
): TestBookData {
  return {
    subjectId: '12345',
    title: '测试书籍',
    ...overrides,
  };
}

export function createTestMovieData(
  overrides?: Partial<TestMovieData>,
): TestMovieData {
  return {
    subjectId: '67890',
    title: '测试电影',
    ...overrides,
  };
}

// 安全的null/undefined测试类型
export type NullishTestInput = null | undefined;

// 类型安全的数组测试数据
export interface TestArrayData {
  authors: string[];
  directors: string[];
  actors: string[];
}

export function createTestArrayData(): TestArrayData {
  return {
    authors: ['作者1', '作者2'],
    directors: ['导演1', '导演2'],
    actors: ['演员1', '演员2', '演员3'],
  };
}

// 复杂嵌套数据测试类型
export interface TestNestedData {
  level1: {
    level2: {
      level3: {
        value: string;
      };
    };
  };
  rating: {
    average: number;
  };
  details: {
    info: string;
  };
}

export function createTestNestedData(): TestNestedData {
  return {
    level1: {
      level2: {
        level3: {
          value: 'deep-value',
        },
      },
    },
    rating: {
      average: 8.5,
    },
    details: {
      info: 'test-info',
    },
  };
}

// 错误测试数据类型
export interface TestErrorData {
  maliciousData: {
    subjectId: string;
    title: null;
    author: Record<string, never>;
    rating: {
      average: string; // 故意错误类型
    };
  };
  circularData: Record<string, unknown> & {
    self?: unknown;
  };
  largeData: {
    subjectId: string;
    title: string;
    summary: string;
  };
}

export function createTestErrorData(): TestErrorData {
  const circularData: Record<string, unknown> = {
    subjectId: '123',
    title: '测试',
  };
  circularData.self = circularData;

  return {
    maliciousData: {
      subjectId: '<script>alert("xss")</script>',
      title: null,
      author: {},
      rating: {
        average: 'not-a-number',
      },
    },
    circularData,
    largeData: {
      subjectId: '123',
      title: '测试',
      summary: 'x'.repeat(100000),
    },
  };
}
