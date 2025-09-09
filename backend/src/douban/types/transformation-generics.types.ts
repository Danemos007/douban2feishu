/**
 * 数据转换服务泛型类型定义
 * 
 * 提供严格的泛型接口，提升复用性和类型安全性
 * 
 * 设计原则：
 * 1. 泛型优先 - 所有核心函数使用泛型
 * 2. 类型约束 - 明确输入输出边界
 * 3. 复用性 - 支持多种数据类型转换
 */

import { 
  DoubanDataType, 
  TransformationOptions,
  TransformationStatistics 
} from '../contract/transformation.schema';
import { VerifiedFieldMappingConfig } from '../../feishu/config/douban-field-mapping.config';

/**
 * 原始数据接口约束
 */
export interface RawDataInput {
  html?: string;
  [key: string]: unknown;
}

/**
 * 转换后数据接口约束
 */
export interface TransformedDataOutput {
  [fieldName: string]: unknown;
}

/**
 * 泛型转换结果接口
 */
export interface GenericTransformationResult<TOutput extends TransformedDataOutput = TransformedDataOutput> {
  data: TOutput;
  statistics: TransformationStatistics;
  warnings: string[];
  rawData?: RawDataInput;
}

/**
 * 泛型转换器接口
 */
export interface GenericTransformer<TInput extends RawDataInput, TOutput extends TransformedDataOutput> {
  /**
   * 执行数据转换
   */
  transform(
    input: TInput,
    dataType: DoubanDataType,
    options?: TransformationOptions
  ): Promise<GenericTransformationResult<TOutput>>;
}

/**
 * 字段转换器泛型接口
 */
export interface FieldTransformer<TInput = unknown, TOutput = unknown> {
  /**
   * 转换单个字段值
   */
  transformField(
    value: TInput,
    fieldConfig: VerifiedFieldMappingConfig
  ): Promise<TOutput>;
}

/**
 * 嵌套值提取器泛型接口
 */
export interface NestedValueExtractor<TInput extends RawDataInput = RawDataInput, TOutput = unknown> {
  /**
   * 提取嵌套属性值
   */
  extractValue(
    data: TInput,
    fieldConfig: VerifiedFieldMappingConfig
  ): Promise<TOutput>;
}

/**
 * 数组处理器泛型接口
 */
export interface ArrayProcessor<TInput = unknown[], TOutput = string | unknown[]> {
  /**
   * 处理数组字段
   */
  processArray(
    value: TInput,
    fieldConfig: VerifiedFieldMappingConfig
  ): Promise<TOutput>;
}

/**
 * 智能修复器泛型接口
 */
export interface IntelligentRepairer<TData extends TransformedDataOutput = TransformedDataOutput> {
  /**
   * 应用智能修复
   */
  applyRepairs(
    data: TData,
    dataType: DoubanDataType,
    options?: { enableIntelligentRepairs?: boolean }
  ): Promise<TData>;
}

/**
 * 数据验证器泛型接口
 */
export interface DataValidator<TData extends TransformedDataOutput = TransformedDataOutput> {
  /**
   * 验证转换后的数据
   */
  validateData(
    data: TData,
    dataType: DoubanDataType
  ): Promise<TData>;
}

/**
 * 统计收集器泛型接口
 */
export interface StatisticsCollector<TStats extends TransformationStatistics = TransformationStatistics> {
  /**
   * 生成统计信息
   */
  generateStats(): TStats;
  
  /**
   * 重置统计
   */
  resetStats(): void;
  
  /**
   * 更新统计
   */
  updateStats(partial: Partial<TStats>): void;
}

/**
 * 豆瓣书籍数据类型
 */
export interface DoubanBookData extends RawDataInput {
  title?: string;
  subtitle?: string;
  author?: string[] | string;
  publisher?: string;
  publishDate?: string;
  isbn?: string;
  rating?: { average?: number };
  doubanRating?: number;
  myRating?: number;
  myStatus?: string;
  myTags?: string[] | string;
  html?: string;
}

/**
 * 豆瓣电影数据类型
 */
export interface DoubanMovieData extends RawDataInput {
  title?: string;
  duration?: string;
  releaseDate?: string;
  country?: string;
  language?: string;
  director?: string[] | string;
  actor?: string[] | string;
  genre?: string[] | string;
  doubanRating?: number;
  myRating?: number;
  myStatus?: string;
  myTags?: string[] | string;
  html?: string;
}

/**
 * 转换后豆瓣数据联合类型
 */
export type TransformedDoubanData = DoubanBookData | DoubanMovieData;

/**
 * 字段修复器泛型类型
 */
export type FieldRepairer<TInput = string, TOutput = string> = (
  value: TInput
) => TOutput | Promise<TOutput>;

/**
 * 修复器映射类型
 */
export interface RepairerMap {
  duration: FieldRepairer<string, string>;
  releaseDate: FieldRepairer<string, string>;
  publishDate: FieldRepairer<string, string>;
  author: FieldRepairer<string, string[]>;
  country: FieldRepairer<string, string>;
  language: FieldRepairer<string, string>;
  publisher: FieldRepairer<string, string>;
  isbn: FieldRepairer<string, string>;
}

/**
 * 泛型转换上下文
 */
export interface TransformationContext<TInput extends RawDataInput = RawDataInput> {
  rawData: TInput;
  dataType: DoubanDataType;
  options: TransformationOptions;
  warnings: string[];
  statistics: Partial<TransformationStatistics>;
}

/**
 * 转换步骤结果类型
 */
export interface TransformationStepResult<TOutput = TransformedDataOutput> {
  data: TOutput;
  warnings: string[];
  statistics: Partial<TransformationStatistics>;
}