/**
 * 全局类型定义
 * 为整个应用提供类型安全的基础架构
 */

// ===== 基础工具类型 =====

/**
 * 严格的API响应类型
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * 错误响应类型
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ===== 数据转换类型 =====

/**
 * 数据转换结果类型
 */
export interface DataTransformResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 数据验证结果类型
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

// ===== 数据库操作类型 =====

/**
 * 数据库查询选项
 */
export interface DatabaseQueryOptions {
  select?: Record<string, boolean>;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  include?: Record<string, boolean | object>;
}

// ===== 任务和队列类型 =====

/**
 * 任务状态枚举
 */
export const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * 通用任务类型
 */
export interface Task<TPayload = unknown, TResult = unknown> {
  id: string;
  type: string;
  status: TaskStatusType;
  payload: TPayload;
  result?: TResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ===== 日志和监控类型 =====

/**
 * 日志级别
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * 结构化日志类型
 */
export interface LogEntry {
  level: LogLevelType;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}

// ===== 配置类型 =====

/**
 * 环境变量配置类型
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_URL: string;
  LOG_LEVEL: LogLevelType;
}

// ===== 类型守卫工具 =====

/**
 * 检查值是否为非空
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查值是否为字符串且不为空
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 检查值是否为数字且有效
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 检查对象是否有指定属性
 */
export function hasProperty<K extends string | number | symbol>(
  obj: unknown,
  prop: K,
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

// ===== 导出所有类型 =====
export * from './external-api.types';
export * from './business-domain.types';
