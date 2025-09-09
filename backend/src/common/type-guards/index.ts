/**
 * 类型守卫工具函数
 * 提供运行时类型检查和安全的类型断言
 */

import { z } from 'zod';
import {
  UserSchema,
  SyncConfigSchema,
  FeishuApiResponseSchema,
  DoubanParsedItemSchema,
  ValidationResultSchema,
} from '../schemas';

// ===== 基础类型守卫 =====

/**
 * 检查值是否为非空值
 */
export function isNotNullOrUndefined<T>(
  value: T | null | undefined,
): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查值是否为非空字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 检查值是否为有效数字
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 检查值是否为正整数
 */
export function isPositiveInteger(value: unknown): value is number {
  return isValidNumber(value) && value > 0 && Number.isInteger(value);
}

/**
 * 检查值是否为有效日期
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 检查值是否为有效的UUID
 */
export function isValidUUID(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 检查值是否为有效的邮箱地址
 */
export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * 检查值是否为有效的URL
 */
export function isValidUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// ===== 对象属性检查 =====

/**
 * 检查对象是否具有指定属性
 */
export function hasProperty<K extends string | number | symbol>(
  obj: unknown,
  prop: K,
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * 检查对象是否具有多个属性
 */
export function hasProperties<K extends string>(
  obj: unknown,
  props: K[],
): obj is Record<K, unknown> {
  if (obj === null || typeof obj !== 'object') return false;
  return props.every((prop) => prop in obj);
}

/**
 * 安全获取对象属性
 */
export function safeGetProperty<T>(
  obj: unknown,
  prop: string,
  typeGuard: (value: unknown) => value is T,
): T | undefined {
  if (!hasProperty(obj, prop)) return undefined;
  const value = obj[prop];
  return typeGuard(value) ? value : undefined;
}

// ===== 数组类型守卫 =====

/**
 * 检查是否为非空数组
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 检查数组所有元素是否都符合类型守卫
 */
export function isArrayOf<T>(
  value: unknown,
  typeGuard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(typeGuard);
}

/**
 * 检查是否为字符串数组
 */
export function isStringArray(value: unknown): value is string[] {
  return isArrayOf(value, (item): item is string => typeof item === 'string');
}

/**
 * 检查是否为数字数组
 */
export function isNumberArray(value: unknown): value is number[] {
  return isArrayOf(value, isValidNumber);
}

// ===== 业务领域类型守卫 =====

/**
 * 检查是否为有效用户对象
 */
export function isValidUser(
  value: unknown,
): value is z.infer<typeof UserSchema> {
  try {
    UserSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否为有效同步配置
 */
export function isValidSyncConfig(
  value: unknown,
): value is z.infer<typeof SyncConfigSchema> {
  try {
    SyncConfigSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否为有效飞书API响应
 */
export function isValidFeishuResponse<T = unknown>(
  value: unknown,
): value is z.infer<typeof FeishuApiResponseSchema> & { data?: T } {
  try {
    FeishuApiResponseSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查飞书响应是否成功
 */
export function isFeishuResponseSuccess<T>(
  response: unknown,
): response is z.infer<typeof FeishuApiResponseSchema> & { data: T } {
  if (!isValidFeishuResponse(response)) return false;
  return response.code === 0 && response.data !== undefined;
}

/**
 * 检查是否为有效豆瓣解析结果
 */
export function isValidDoubanItem(
  value: unknown,
): value is z.infer<typeof DoubanParsedItemSchema> {
  try {
    DoubanParsedItemSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否为有效验证结果
 */
export function isValidationResult<T>(
  value: unknown,
): value is z.infer<typeof ValidationResultSchema> {
  try {
    ValidationResultSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ===== 错误处理类型守卫 =====

/**
 * 检查是否为Error对象
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * 检查是否为Zod验证错误
 */
export function isZodError(value: unknown): value is z.ZodError {
  return value instanceof z.ZodError;
}

/**
 * 安全的错误消息提取
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (isZodError(error)) return error.issues.map((e) => e.message).join(', ');
  if (typeof error === 'string') return error;
  return '未知错误';
}

// ===== 辅助工具函数 =====

/**
 * 创建自定义类型守卫
 */
export function createTypeGuard<T>(
  schema: z.ZodType<T>,
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    try {
      schema.parse(value);
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * 安全的类型转换
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const data = schema.parse(value);
    return { success: true, data };
  } catch (error) {
    if (isZodError(error)) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * 带默认值的安全解析
 */
export function parseWithDefault<T>(
  schema: z.ZodType<T>,
  value: unknown,
  defaultValue: T,
): T {
  try {
    return schema.parse(value);
  } catch {
    return defaultValue;
  }
}
