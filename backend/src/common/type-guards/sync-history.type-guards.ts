/**
 * SyncHistory模型类型守卫函数
 * 用于运行时验证同步历史数据的类型安全性
 *
 * @author Claude
 * @date 2025-09-09
 */

import {
  SyncHistory,
  User,
  TriggerType,
  SyncStatus,
} from '../../../generated/prisma';

/**
 * 有效的触发类型枚举值
 */
const VALID_TRIGGER_TYPES: TriggerType[] = ['MANUAL', 'AUTO'];

/**
 * 有效的同步状态枚举值
 */
const VALID_SYNC_STATUSES: SyncStatus[] = [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
];

/**
 * 检查对象是否为有效的SyncHistory类型
 * @param obj 待验证的对象
 * @returns 如果是有效的SyncHistory类型返回true
 */
export function isSyncHistory(obj: unknown): obj is SyncHistory {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const history = obj as Record<string, unknown>;

  return (
    // 基础字段验证
    typeof history.id === 'string' &&
    typeof history.userId === 'string' &&
    // 枚举类型验证
    isValidTriggerType(history.triggerType) &&
    isValidSyncStatus(history.status) &&
    // 日期字段验证
    history.startedAt instanceof Date &&
    (history.completedAt === null || history.completedAt instanceof Date) &&
    // 数值和可选字段验证
    typeof history.itemsSynced === 'number' &&
    history.itemsSynced >= 0 &&
    (history.errorMessage === null ||
      typeof history.errorMessage === 'string') &&
    (history.duration === null ||
      history.duration === undefined ||
      (typeof history.duration === 'number' && history.duration >= 0)) &&
    // 元数据验证 (可以是任何JSON值)
    (history.metadata === null ||
      history.metadata === undefined ||
      isValidJsonValue(history.metadata))
  );
}

/**
 * 检查对象是否为包含User关联的SyncHistory类型
 * @param obj 待验证的对象
 * @returns 如果是包含User关联的SyncHistory类型返回true
 */
export function isSyncHistoryWithUser(
  obj: unknown,
): obj is SyncHistory & { user: User } {
  if (!isSyncHistory(obj)) {
    return false;
  }

  const history = obj as Record<string, unknown>;

  // 验证User关联是否存在且有效
  return history.user !== undefined && isUser(history.user);
}

/**
 * 检查对象数组是否为有效的SyncHistory类型数组
 * @param arr 待验证的数组
 * @returns 如果是有效的SyncHistory数组返回true
 */
export function isSyncHistoryArray(arr: unknown): arr is SyncHistory[] {
  return Array.isArray(arr) && arr.every(isSyncHistory);
}

/**
 * 安全地转换对象为SyncHistory类型
 * @param obj 待转换的对象
 * @returns 如果验证成功返回SyncHistory类型，否则抛出错误
 */
export function assertIsSyncHistory(obj: unknown): asserts obj is SyncHistory {
  if (!isSyncHistory(obj)) {
    throw new Error(
      `Object is not a valid SyncHistory type. Received: ${JSON.stringify(obj, null, 2)}`,
    );
  }
}

/**
 * 验证同步历史是否处于完成状态（成功或失败）
 * @param history SyncHistory对象
 * @returns 如果同步已完成返回true
 */
export function isSyncHistoryCompleted(history: SyncHistory): boolean {
  return (
    history.status === 'SUCCESS' ||
    history.status === 'FAILED' ||
    history.status === 'CANCELLED'
  );
}

/**
 * 验证同步历史是否处于运行状态
 * @param history SyncHistory对象
 * @returns 如果同步正在运行返回true
 */
export function isSyncHistoryRunning(history: SyncHistory): boolean {
  return history.status === 'RUNNING';
}

/**
 * 验证同步历史的持续时间是否有效
 * @param history SyncHistory对象
 * @returns 如果持续时间计算有效返回true
 */
export function hasValidDuration(history: SyncHistory): boolean {
  if (!history.completedAt || !history.startedAt) {
    return false;
  }

  const calculatedDuration =
    history.completedAt.getTime() - history.startedAt.getTime();
  return (
    calculatedDuration >= 0 &&
    (history.duration === null ||
      history.duration === undefined ||
      Math.abs(calculatedDuration - history.duration) < 1000)
  ); // 允许1秒误差
}

// 辅助函数

/**
 * 检查值是否为有效的TriggerType
 */
function isValidTriggerType(value: unknown): value is TriggerType {
  return (
    typeof value === 'string' &&
    VALID_TRIGGER_TYPES.includes(value as TriggerType)
  );
}

/**
 * 检查值是否为有效的SyncStatus
 */
function isValidSyncStatus(value: unknown): value is SyncStatus {
  return (
    typeof value === 'string' &&
    VALID_SYNC_STATUSES.includes(value as SyncStatus)
  );
}

/**
 * 检查值是否为有效的JSON值
 */
function isValidJsonValue(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
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
    typeof user.email === 'string' &&
    user.createdAt instanceof Date &&
    (user.lastSyncAt === null || user.lastSyncAt instanceof Date)
  );
}
