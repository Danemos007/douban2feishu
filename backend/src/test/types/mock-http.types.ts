/**
 * Mock HTTP Client Type Definitions
 * 
 * 提供类型安全的HTTP客户端Mock，支持完整的Axios响应类型
 */

import { jest } from '@jest/globals';
import { AxiosResponse } from 'axios';

/**
 * 标准HTTP响应接口
 * 基于Axios响应格式，确保完整的类型安全
 */
export interface MockHttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

/**
 * ConfigService Mock函数类型定义
 * 为Mock函数提供完整的类型约束
 */
type MockGetFunction = (key: string, defaultValue?: string | number) => string | number | undefined;

/**
 * ConfigService Mock接口
 * 支持严格的配置类型约束，采用泛型优先模式
 */
export interface MockConfigService {
  get: jest.Mock<MockGetFunction>;
}

/**
 * 类型安全的HTTP响应Mock工厂函数
 * @param data 响应数据，支持泛型约束
 * @param status HTTP状态码，默认200
 * @param statusText HTTP状态文本，默认'OK'
 */
export function createMockHttpResponse<T>(
  data: T,
  status: number = 200,
  statusText: string = 'OK'
): MockHttpResponse<T> {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {},
  };
}

/**
 * 类型安全的ConfigService Mock工厂函数
 * 采用泛型优先模式，确保完全类型安全
 */
export function createMockConfigService(): MockConfigService {
  // 定义严格的配置类型映射
  const configMap: Record<string, string | number> = {
    APP_VERSION: '1.0.0-test',
    FEISHU_BASE_URL: 'https://open.feishu.cn',
    FEISHU_TIMEOUT: 30000,
    REDIS_TTL_FIELDS: 3600,
    REDIS_TTL_RECORDS: 300,
  };

  // 使用泛型优先模式创建类型安全的Mock
  const mockGet = jest.fn<MockGetFunction>();
  mockGet.mockImplementation((key, defaultValue) => {
    const value = configMap[key];
    return value ?? defaultValue;
  });

  return {
    get: mockGet,
  };
}

/**
 * Axios Mock响应类型助手
 * 提供与真实Axios响应兼容的类型转换
 */
export function createAxiosCompatibleResponse<T>(
  mockResponse: MockHttpResponse<T>
): AxiosResponse<T> {
  return {
    ...mockResponse,
    config: {
      headers: {},
      ...mockResponse.config,
    },
  } as AxiosResponse<T>;
}

/**
 * 飞书字段定义类型
 * 用于Mock契约验证服务的字段验证
 */
export interface MockFieldDefinition {
  field_name?: string;
  type?: number;
  field_id?: string;
  description?: string;
}

/**
 * 类型安全的契约验证Mock函数类型定义
 */
type MockValidateFunction<T> = (data: T) => T;
type MockFieldValidationFunction = (field: MockFieldDefinition) => boolean;

/**
 * FeishuContractValidatorService Mock接口
 * 提供完整的类型约束，消除any类型使用
 */
export interface MockContractValidatorService {
  validateFieldsResponse: jest.Mock<MockValidateFunction<unknown>>;
  validateAuthResponse: jest.Mock<MockValidateFunction<unknown>>;
  validateRecordsResponse: jest.Mock<MockValidateFunction<unknown>>;
  isRatingFieldValidation: jest.Mock<MockFieldValidationFunction>;
  getValidationStats: jest.Mock<() => {
    totalValidations: number;
    successCount: number;
    failureCount: number;
  }>;
  resetStats: jest.Mock<() => void>;
}

/**
 * 类型安全的ContractValidator Mock工厂函数
 */
export function createMockContractValidator(): MockContractValidatorService {
  // 使用泛型优先模式创建类型安全的Mock
  const validateFieldsResponse = jest.fn<MockValidateFunction<unknown>>();
  validateFieldsResponse.mockImplementation((data) => data);

  const validateAuthResponse = jest.fn<MockValidateFunction<unknown>>();
  validateAuthResponse.mockImplementation((data) => data);

  const validateRecordsResponse = jest.fn<MockValidateFunction<unknown>>();
  validateRecordsResponse.mockImplementation((data) => data);

  const isRatingFieldValidation = jest.fn<MockFieldValidationFunction>();
  isRatingFieldValidation.mockImplementation(
    (field) => field.field_name?.includes('我的评分') === true && field.type === 2,
  );

  const getValidationStats = jest.fn<() => {
    totalValidations: number;
    successCount: number;
    failureCount: number;
  }>();
  getValidationStats.mockReturnValue({
    totalValidations: 0,
    successCount: 0,
    failureCount: 0,
  });

  const resetStats = jest.fn<() => void>();

  return {
    validateFieldsResponse,
    validateAuthResponse,
    validateRecordsResponse,
    isRatingFieldValidation,
    getValidationStats,
    resetStats,
  };
}

/**
 * 类型安全的Redis Mock函数类型定义
 */
type MockRedisGetFunction = (key: string) => Promise<string | null>;
type MockRedisSetFunction = (key: string, value: string) => Promise<string>;
type MockRedisSetexFunction = (key: string, seconds: number, value: string) => Promise<string>;
type MockRedisDelFunction = (key: string) => Promise<number>;
type MockRedisExistsFunction = (key: string) => Promise<number>;
type MockRedisExpireFunction = (key: string, seconds: number) => Promise<number>;
type MockRedisKeysFunction = (pattern: string) => Promise<string[]>;

/**
 * Redis Mock接口
 * 提供完整的类型约束，消除any类型使用
 */
export interface MockRedisService {
  get: jest.Mock<MockRedisGetFunction>;
  set: jest.Mock<MockRedisSetFunction>;
  setex: jest.Mock<MockRedisSetexFunction>;
  del: jest.Mock<MockRedisDelFunction>;
  exists: jest.Mock<MockRedisExistsFunction>;
  expire: jest.Mock<MockRedisExpireFunction>;
  keys: jest.Mock<MockRedisKeysFunction>;
}

/**
 * 类型安全的Redis Mock工厂函数
 */
export function createMockRedisService(): MockRedisService {
  // 使用泛型优先模式创建类型安全的Mock
  const get = jest.fn<MockRedisGetFunction>();
  get.mockResolvedValue(null); // 默认缓存未命中

  const set = jest.fn<MockRedisSetFunction>();
  set.mockResolvedValue('OK');

  const setex = jest.fn<MockRedisSetexFunction>();
  setex.mockResolvedValue('OK');

  const del = jest.fn<MockRedisDelFunction>();
  del.mockResolvedValue(1);

  const exists = jest.fn<MockRedisExistsFunction>();
  exists.mockResolvedValue(0);

  const expire = jest.fn<MockRedisExpireFunction>();
  expire.mockResolvedValue(1);

  const keys = jest.fn<MockRedisKeysFunction>();
  keys.mockResolvedValue([]);

  return {
    get,
    set,
    setex,
    del,
    exists,
    expire,
    keys,
  };
}

/**
 * 类型安全的Axios Mock函数类型定义
 */
type MockAxiosGetFunction = (url: string, config?: Record<string, unknown>) => Promise<AxiosResponse<unknown>>;
type MockAxiosPostFunction = (url: string, data?: unknown, config?: Record<string, unknown>) => Promise<AxiosResponse<unknown>>;

/**
 * Axios Mock实例接口
 * 提供完整的类型约束，消除any类型使用
 */
export interface MockAxiosInstance {
  get: jest.Mock<MockAxiosGetFunction>;
  post: jest.Mock<MockAxiosPostFunction>;
  put: jest.Mock;
  delete: jest.Mock;
  request: jest.Mock;
  interceptors: {
    request: { use: jest.Mock; eject: jest.Mock };
    response: { use: jest.Mock; eject: jest.Mock };
  };
  defaults: Record<string, unknown>;
}

/**
 * 类型安全的Axios Mock工厂函数
 */
export function createMockAxiosInstance(): MockAxiosInstance {
  // 使用泛型优先模式创建类型安全的Mock
  const get = jest.fn<MockAxiosGetFunction>();
  const post = jest.fn<MockAxiosPostFunction>();
  const put = jest.fn();
  const deleteMethod = jest.fn();
  const request = jest.fn();

  return {
    get,
    post,
    put,
    delete: deleteMethod,
    request,
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: {},
  };
}

/**
 * 类型安全的Mock调用参数访问器
 * 适配当前Jest版本 (单泛型参数) + 类型安全的泛型约束
 */
export function getLastMockCall<TArgs extends any[]>(
  mockFn: jest.Mock<any>
): TArgs | undefined {
  const calls = mockFn.mock.calls;
  return calls.length > 0 ? (calls[calls.length - 1] as TArgs) : undefined;
}

/**
 * 类型安全的Mock第一次调用参数访问器
 * 通过泛型约束保证类型正确性，使用安全的类型断言
 */
export function getFirstMockCall<TArgs extends any[]>(
  mockFn: jest.Mock<any>
): TArgs | undefined {
  const calls = mockFn.mock.calls;
  return calls.length > 0 ? (calls[0] as TArgs) : undefined;
}

/**
 * HTTP请求配置类型，包含headers
 */
export interface HttpRequestConfig {
  headers?: {
    Authorization?: string;
    [key: string]: string | undefined;
  };
  [key: string]: unknown;
}