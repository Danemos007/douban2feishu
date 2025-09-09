/**
 * User模型类型守卫函数
 * 用于运行时验证数据库查询结果的类型安全性
 * 
 * @author Claude
 * @date 2025-09-09
 */

import { User, UserCredentials, SyncConfig, SyncHistory } from '../../../generated/prisma';

/**
 * 检查对象是否为有效的User类型
 * @param obj 待验证的对象
 * @returns 如果是有效的User类型返回true
 */
export function isUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const user = obj as Record<string, unknown>;

  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    user.createdAt instanceof Date &&
    (user.lastSyncAt === null || user.lastSyncAt instanceof Date)
  );
}

/**
 * 检查对象是否为包含关联数据的User类型
 * @param obj 待验证的对象
 * @returns 如果是包含关联的User类型返回true
 */
export function isUserWithRelations(obj: unknown): obj is User & {
  credentials?: UserCredentials | null;
  syncConfigs?: SyncConfig | null;
  syncHistory?: SyncHistory[];
} {
  if (!isUser(obj)) {
    return false;
  }

  const user = obj as Record<string, unknown>;

  // 验证可选的关联字段
  if (user.credentials !== undefined) {
    if (user.credentials !== null && !isUserCredentials(user.credentials)) {
      return false;
    }
  }

  if (user.syncConfigs !== undefined) {
    if (user.syncConfigs !== null && !isSyncConfig(user.syncConfigs)) {
      return false;
    }
  }

  if (user.syncHistory !== undefined) {
    if (!Array.isArray(user.syncHistory) || !user.syncHistory.every(isSyncHistory)) {
      return false;
    }
  }

  return true;
}

/**
 * 检查对象数组是否为有效的User类型数组
 * @param arr 待验证的数组
 * @returns 如果是有效的User数组返回true
 */
export function isUserArray(arr: unknown): arr is User[] {
  return Array.isArray(arr) && arr.every(isUser);
}

/**
 * 安全地转换对象为User类型
 * @param obj 待转换的对象
 * @returns 如果验证成功返回User类型，否则抛出错误
 */
export function assertIsUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error(
      `Object is not a valid User type. Received: ${JSON.stringify(obj, null, 2)}`
    );
  }
}

// 辅助函数：验证UserCredentials类型
function isUserCredentials(obj: unknown): obj is UserCredentials {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const cred = obj as Record<string, unknown>;

  return (
    typeof cred.userId === 'string' &&
    (cred.doubanCookieEncrypted === null || typeof cred.doubanCookieEncrypted === 'string') &&
    (cred.feishuAppId === null || typeof cred.feishuAppId === 'string') &&
    (cred.feishuAppSecretEncrypted === null || typeof cred.feishuAppSecretEncrypted === 'string') &&
    typeof cred.encryptionIv === 'string' &&
    cred.updatedAt instanceof Date &&
    cred.createdAt instanceof Date
  );
}

// 辅助函数：验证SyncConfig类型
function isSyncConfig(obj: unknown): obj is SyncConfig {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const config = obj as Record<string, unknown>;

  return (
    typeof config.userId === 'string' &&
    (config.mappingType === 'THREE_TABLES' || config.mappingType === 'FOUR_TABLES') &&
    typeof config.autoSyncEnabled === 'boolean' &&
    config.createdAt instanceof Date &&
    config.updatedAt instanceof Date
  );
}

// 辅助函数：验证SyncHistory类型
function isSyncHistory(obj: unknown): obj is SyncHistory {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const history = obj as Record<string, unknown>;

  return (
    typeof history.id === 'string' &&
    typeof history.userId === 'string' &&
    (history.triggerType === 'MANUAL' || history.triggerType === 'AUTO') &&
    ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'].includes(history.status as string) &&
    history.startedAt instanceof Date &&
    (history.completedAt === null || history.completedAt instanceof Date) &&
    typeof history.itemsSynced === 'number' &&
    (history.errorMessage === null || typeof history.errorMessage === 'string')
  );
}