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
 * 验证对象是否符合SyncHistory类型的所有必需字段和类型约束
 *
 * @description 检查对象是否包含有效的SyncHistory类型所需的所有字段，并验证每个字段的类型和业务规则
 * （如itemsSynced和duration必须非负，triggerType和status必须是有效枚举值，metadata必须可JSON序列化）。
 * 这是一个类型守卫函数，在返回true时会将类型收窄为SyncHistory。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象包含所有必需字段且类型正确时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将obj的类型收窄为SyncHistory。
 *
 * @example
 * ```typescript
 * const data = await prisma.syncHistory.findUnique({ where: { id: historyId } });
 * if (isSyncHistory(data)) {
 *   // TypeScript现在知道data是SyncHistory类型
 *   console.log(`Synced ${data.itemsSynced} items`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证包含可选字段的SyncHistory
 * const history = {
 *   id: 'uuid',
 *   userId: 'user-uuid',
 *   triggerType: 'MANUAL',
 *   status: 'SUCCESS',
 *   startedAt: new Date(),
 *   completedAt: new Date(),
 *   itemsSynced: 100,
 *   errorMessage: null,
 *   duration: 5000,
 *   metadata: { source: 'api' }
 * };
 * if (isSyncHistory(history)) {
 *   console.log('Valid sync history');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证失败的情况
 * const invalidData = { id: 'uuid', itemsSynced: -1 }; // 负数无效
 * if (!isSyncHistory(invalidData)) {
 *   console.error('Invalid sync history data');
 * }
 * ```
 *
 * @see {@link assertIsSyncHistory} - 如果需要在验证失败时抛出错误，请使用此函数
 * @see {@link isSyncHistoryWithUser} - 如果需要验证包含User关联的SyncHistory对象
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
 * 验证对象是否为包含User关联数据的SyncHistory类型
 *
 * @description 检查对象是否为有效的SyncHistory类型，并验证其user关联字段是否存在且为有效的User类型。
 * 这是一个类型守卫函数，适用于使用Prisma include查询返回的SyncHistory对象。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象是有效的SyncHistory类型且包含有效的user关联时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将obj的类型收窄为SyncHistory & { user: User }。
 *
 * @example
 * ```typescript
 * const history = await prisma.syncHistory.findUnique({
 *   where: { id: historyId },
 *   include: { user: true }
 * });
 *
 * if (isSyncHistoryWithUser(history)) {
 *   // TypeScript现在知道history包含user关联
 *   console.log(`User: ${history.user.email}`);
 *   console.log(`Synced ${history.itemsSynced} items`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证失败的情况 - 缺少user关联
 * const historyWithoutUser = await prisma.syncHistory.findUnique({
 *   where: { id: historyId }
 * });
 * if (!isSyncHistoryWithUser(historyWithoutUser)) {
 *   console.error('History does not include user data');
 * }
 * ```
 *
 * @see {@link isSyncHistory} - 用于验证不包含关联数据的基础SyncHistory对象
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
 * 验证数组是否为有效的SyncHistory类型数组
 *
 * @description 检查给定值是否为数组，并验证数组中的每个元素是否都是有效的SyncHistory类型。
 * 这是一个类型守卫函数，适用于批量查询返回的同步历史列表。
 *
 * @param arr - 待验证的未知类型值
 *
 * @returns 当值是数组且所有元素都是有效的SyncHistory类型时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将arr的类型收窄为SyncHistory[]。
 *
 * @example
 * ```typescript
 * const histories = await prisma.syncHistory.findMany({
 *   where: { userId: userId }
 * });
 * if (isSyncHistoryArray(histories)) {
 *   // TypeScript现在知道histories是SyncHistory[]类型
 *   histories.forEach(history => {
 *     console.log(`Sync at ${history.startedAt}: ${history.status}`);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 空数组也是有效的
 * const emptyHistories = [];
 * if (isSyncHistoryArray(emptyHistories)) {
 *   console.log('Valid empty sync history array');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证失败的情况
 * const mixedArray = [validHistory, { invalid: 'data' }];
 * if (!isSyncHistoryArray(mixedArray)) {
 *   console.error('Array contains invalid sync history data');
 * }
 * ```
 *
 * @see {@link isSyncHistory} - 用于验证单个SyncHistory对象
 */
export function isSyncHistoryArray(arr: unknown): arr is SyncHistory[] {
  return Array.isArray(arr) && arr.every(isSyncHistory);
}

/**
 * 断言对象为SyncHistory类型，验证失败时抛出错误
 *
 * @description 验证对象是否为有效的SyncHistory类型，如果验证失败则抛出包含详细错误信息的Error。
 * 这是一个断言函数，适用于必须保证类型正确的场景。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 此函数不返回值，但会断言obj的类型为SyncHistory。如果验证成功，TypeScript会将obj的类型收窄为SyncHistory。
 *
 * @throws {Error} 当对象不是有效的SyncHistory类型时，抛出包含接收对象JSON表示的错误信息
 *
 * @example
 * ```typescript
 * const data = await fetchSyncHistoryData();
 * assertIsSyncHistory(data);
 * // 如果执行到这里，TypeScript知道data一定是SyncHistory类型
 * console.log(data.itemsSynced); // 类型安全
 * ```
 *
 * @example
 * ```typescript
 * // 错误处理
 * try {
 *   const unknownData = { invalid: 'data' };
 *   assertIsSyncHistory(unknownData);
 * } catch (error) {
 *   console.error('Sync history validation failed:', error.message);
 *   // 错误信息包含完整的对象JSON表示
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 在管道中使用
 * const processSyncHistory = (data: unknown) => {
 *   assertIsSyncHistory(data);
 *   return { ...data, processed: true };
 * };
 * ```
 *
 * @see {@link isSyncHistory} - 如果不希望抛出错误，请使用此类型守卫函数
 */
export function assertIsSyncHistory(obj: unknown): asserts obj is SyncHistory {
  if (!isSyncHistory(obj)) {
    throw new Error(
      `Object is not a valid SyncHistory type. Received: ${JSON.stringify(obj, null, 2)}`,
    );
  }
}

/**
 * 判断同步历史是否处于已完成状态
 *
 * @description 检查同步历史的状态是否为终态（SUCCESS、FAILED或CANCELLED），
 * 即同步任务已经结束（无论成功或失败）。此函数用于业务逻辑中判断同步任务是否可以被归档或清理。
 *
 * @param history - SyncHistory对象
 *
 * @returns 当同步状态为SUCCESS、FAILED或CANCELLED时返回true，表示同步已完成；
 * 当状态为PENDING或RUNNING时返回false，表示同步尚未完成。
 *
 * @example
 * ```typescript
 * const history = await prisma.syncHistory.findUnique({ where: { id: historyId } });
 * if (isSyncHistory(history) && isSyncHistoryCompleted(history)) {
 *   console.log(`Sync completed with status: ${history.status}`);
 *   // 可以安全地归档或清理该同步记录
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 批量清理已完成的同步记录
 * const histories = await prisma.syncHistory.findMany();
 * const completedHistories = histories.filter(h =>
 *   isSyncHistory(h) && isSyncHistoryCompleted(h)
 * );
 * console.log(`Found ${completedHistories.length} completed syncs`);
 * ```
 *
 * @see {@link isSyncHistoryRunning} - 用于判断同步是否正在运行
 */
export function isSyncHistoryCompleted(history: SyncHistory): boolean {
  return (
    history.status === 'SUCCESS' ||
    history.status === 'FAILED' ||
    history.status === 'CANCELLED'
  );
}

/**
 * 判断同步历史是否处于运行状态
 *
 * @description 检查同步历史的状态是否为RUNNING，即同步任务正在执行中。
 * 此函数用于业务逻辑中判断是否需要等待同步完成，或防止重复启动同步任务。
 *
 * @param history - SyncHistory对象
 *
 * @returns 当同步状态为RUNNING时返回true，表示同步正在执行；
 * 其他状态（PENDING、SUCCESS、FAILED、CANCELLED）时返回false。
 *
 * @example
 * ```typescript
 * const history = await prisma.syncHistory.findUnique({ where: { id: historyId } });
 * if (isSyncHistory(history) && isSyncHistoryRunning(history)) {
 *   console.log('Sync is currently running, please wait...');
 *   // 可以显示进度条或禁用同步按钮
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 检查用户是否有正在进行的同步任务
 * const runningSync = await prisma.syncHistory.findFirst({
 *   where: { userId: userId, status: 'RUNNING' }
 * });
 * if (runningSync && isSyncHistoryRunning(runningSync)) {
 *   throw new Error('Cannot start new sync: another sync is already running');
 * }
 * ```
 *
 * @see {@link isSyncHistoryCompleted} - 用于判断同步是否已完成
 */
export function isSyncHistoryRunning(history: SyncHistory): boolean {
  return history.status === 'RUNNING';
}

/**
 * 验证同步历史的持续时间数据是否有效
 *
 * @description 检查同步历史的时间数据（startedAt、completedAt、duration）是否一致且有效。
 * 具体验证规则：1) completedAt必须存在且晚于或等于startedAt；2) 如果duration字段存在，
 * 其值必须与计算出的时间差（completedAt - startedAt）在1秒误差范围内一致。
 * 此函数用于数据完整性校验和异常检测。
 *
 * @param history - SyncHistory对象
 *
 * @returns 当时间数据一致且有效时返回true；当completedAt不存在、时间倒序、
 * 或duration与计算值相差超过1秒时返回false。
 *
 * @example
 * ```typescript
 * const history = await prisma.syncHistory.findUnique({ where: { id: historyId } });
 * if (isSyncHistory(history) && hasValidDuration(history)) {
 *   console.log(`Sync took ${history.duration}ms`);
 * } else {
 *   console.warn('Sync duration data is inconsistent or invalid');
 *   // 可能需要重新计算duration字段
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 数据完整性校验
 * const histories = await prisma.syncHistory.findMany({
 *   where: { status: 'SUCCESS' }
 * });
 * const invalidHistories = histories.filter(h =>
 *   isSyncHistory(h) && !hasValidDuration(h)
 * );
 * if (invalidHistories.length > 0) {
 *   console.error(`Found ${invalidHistories.length} histories with invalid duration data`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 允许1秒误差的情况
 * const history = {
 *   startedAt: new Date('2025-01-15T10:00:00.000Z'),
 *   completedAt: new Date('2025-01-15T10:05:00.500Z'),
 *   duration: 300000, // 5分钟，实际是300500ms
 *   // 其他字段...
 * };
 * if (hasValidDuration(history)) {
 *   console.log('Duration is valid (within 1 second tolerance)');
 * }
 * ```
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
 * @description 检查值是否为有效的TriggerType枚举值 (MANUAL 或 AUTO)
 */
function isValidTriggerType(value: unknown): value is TriggerType {
  return (
    typeof value === 'string' &&
    VALID_TRIGGER_TYPES.includes(value as TriggerType)
  );
}

/**
 * @description 检查值是否为有效的SyncStatus枚举值 (PENDING, RUNNING, SUCCESS, FAILED, CANCELLED)
 */
function isValidSyncStatus(value: unknown): value is SyncStatus {
  return (
    typeof value === 'string' &&
    VALID_SYNC_STATUSES.includes(value as SyncStatus)
  );
}

/**
 * @description 检查值是否可以被JSON.stringify序列化（排除循环引用等不可序列化的对象）
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
 * @description 简化的User类型检查，用于避免循环依赖，验证User的基本字段
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
