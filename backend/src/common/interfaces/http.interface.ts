/**
 * HTTP通用类型定义
 * 为项目中所有HTTP相关操作提供类型安全保障
 */

import {
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * 扩展的Axios请求配置
 * 支持重试机制和自定义属性
 */
export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
  __startTime?: number;
  __operationType?: string;
}

/**
 * HTTP响应状态枚举
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * 通用API响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * API错误响应接口
 */
export interface ApiErrorResponse {
  code: number;
  msg: string;
  details?: any;
}

/**
 * HTTP重试配置
 */
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: boolean;
  retryCondition?: (error: AxiosError) => boolean;
}

/**
 * HTTP客户端配置
 */
export interface HttpClientConfig {
  baseURL?: string;
  timeout: number;
  retryConfig: RetryConfig;
  headers?: Record<string, string>;
}

/**
 * 请求拦截器上下文
 */
export interface RequestInterceptorContext {
  method: string;
  url: string;
  startTime: number;
  operationType?: string;
}

/**
 * 响应拦截器上下文
 */
export interface ResponseInterceptorContext {
  method: string;
  url: string;
  status: number;
  duration: number;
  operationType?: string;
}

/**
 * HTTP错误上下文
 */
export interface HttpErrorContext {
  method: string;
  url: string;
  status?: number;
  code?: number;
  message: string;
  operationType?: string;
}
