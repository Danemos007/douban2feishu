/**
 * UserCredentials模型类型守卫函数
 * 用于运行时验证用户凭证数据的类型安全性
 * 
 * @author Claude
 * @date 2025-09-09
 */

import { UserCredentials, User } from '../../../generated/prisma';

/**
 * 检查对象是否为有效的UserCredentials类型
 * @param obj 待验证的对象
 * @returns 如果是有效的UserCredentials类型返回true
 */
export function isUserCredentials(obj: unknown): obj is UserCredentials {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const credentials = obj as Record<string, unknown>;

  return (
    // 用户ID验证（必需且为UUID格式）
    typeof credentials.userId === 'string' &&
    isValidUuid(credentials.userId) &&
    
    // 加密字段验证（可为null）
    (credentials.doubanCookieEncrypted === null || 
     typeof credentials.doubanCookieEncrypted === 'string') &&
    
    // 飞书应用ID验证（可为null，如果存在必须为字符串）
    (credentials.feishuAppId === null || 
     (typeof credentials.feishuAppId === 'string' && credentials.feishuAppId.length > 0)) &&
    
    // 飞书应用密钥验证（可为null）
    (credentials.feishuAppSecretEncrypted === null || 
     typeof credentials.feishuAppSecretEncrypted === 'string') &&
    
    // 加密IV验证（必需且为32位字符串）
    typeof credentials.encryptionIv === 'string' &&
    credentials.encryptionIv.length === 32 &&
    isValidHex(credentials.encryptionIv) &&
    
    // 时间戳验证
    credentials.updatedAt instanceof Date &&
    credentials.createdAt instanceof Date &&
    credentials.createdAt <= credentials.updatedAt
  );
}

/**
 * 检查对象是否为包含User关联的UserCredentials类型
 * @param obj 待验证的对象
 * @returns 如果是包含User关联的UserCredentials类型返回true
 */
export function isUserCredentialsWithUser(obj: unknown): obj is UserCredentials & { user: User } {
  if (!isUserCredentials(obj)) {
    return false;
  }

  const credentials = obj as Record<string, unknown>;
  
  // 验证User关联是否存在且有效
  return credentials.user !== undefined && isUser(credentials.user);
}

/**
 * 检查对象数组是否为有效的UserCredentials类型数组
 * @param arr 待验证的数组
 * @returns 如果是有效的UserCredentials数组返回true
 */
export function isUserCredentialsArray(arr: unknown): arr is UserCredentials[] {
  return Array.isArray(arr) && arr.every(isUserCredentials);
}

/**
 * 安全地转换对象为UserCredentials类型
 * @param obj 待转换的对象
 * @returns 如果验证成功返回UserCredentials类型，否则抛出错误
 */
export function assertIsUserCredentials(obj: unknown): asserts obj is UserCredentials {
  if (!isUserCredentials(obj)) {
    throw new Error(
      `Object is not a valid UserCredentials type. Received: ${JSON.stringify(obj, null, 2)}`
    );
  }
}

/**
 * 验证用户凭证是否包含豆瓣配置
 * @param credentials UserCredentials对象
 * @returns 如果包含有效豆瓣配置返回true
 */
export function hasDoubanCredentials(credentials: UserCredentials): boolean {
  return credentials.doubanCookieEncrypted !== null && 
         credentials.doubanCookieEncrypted.length > 0;
}

/**
 * 验证用户凭证是否包含飞书配置
 * @param credentials UserCredentials对象
 * @returns 如果包含有效飞书配置返回true
 */
export function hasFeishuCredentials(credentials: UserCredentials): boolean {
  return credentials.feishuAppId !== null && 
         credentials.feishuAppId.length > 0 &&
         credentials.feishuAppSecretEncrypted !== null && 
         credentials.feishuAppSecretEncrypted.length > 0;
}

/**
 * 验证用户凭证是否完整（包含豆瓣和飞书配置）
 * @param credentials UserCredentials对象
 * @returns 如果凭证完整返回true
 */
export function isUserCredentialsComplete(credentials: UserCredentials): boolean {
  return hasDoubanCredentials(credentials) && hasFeishuCredentials(credentials);
}

/**
 * 验证加密IV是否格式正确
 * @param credentials UserCredentials对象
 * @returns 如果IV格式正确返回true
 */
export function hasValidEncryptionIv(credentials: UserCredentials): boolean {
  return credentials.encryptionIv.length === 32 && 
         isValidHex(credentials.encryptionIv);
}

// 辅助函数

/**
 * 检查字符串是否为有效的UUID格式
 */
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 检查字符串是否为有效的十六进制
 */
function isValidHex(str: string): boolean {
  const hexRegex = /^[0-9a-f]+$/i;
  return hexRegex.test(str);
}

/**
 * 简化的User类型检查（避免循环依赖）
 */
function isUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const user = obj as Record<string, unknown>;

  return (
    typeof user.id === 'string' &&
    isValidUuid(user.id) &&
    typeof user.email === 'string' &&
    isValidEmail(user.email) &&
    user.createdAt instanceof Date &&
    (user.lastSyncAt === null || user.lastSyncAt instanceof Date)
  );
}

/**
 * 检查字符串是否为有效的电子邮件格式
 */
function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}