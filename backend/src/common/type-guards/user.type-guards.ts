/**
 * User模型类型守卫函数
 * 用于运行时验证数据库查询结果的类型安全性
 *
 * @author Claude
 * @date 2025-09-09
 */

import {
  User,
  UserCredentials,
  SyncConfig,
  SyncHistory,
} from '../../../generated/prisma';

/**
 * 验证对象是否符合User类型的所有必需字段和类型约束
 *
 * @description 检查对象是否包含有效的User类型所需的所有字段（id, email, createdAt, lastSyncAt），
 * 并验证每个字段的类型是否正确。这是一个类型守卫函数，在返回true时会将类型收窄为User。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象包含所有必需字段且类型正确时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将obj的类型收窄为User。
 *
 * @example
 * ```typescript
 * const data = await prisma.user.findUnique({ where: { id: userId } });
 * if (isUser(data)) {
 *   // TypeScript现在知道data是User类型
 *   console.log(data.email);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证失败的情况
 * const invalidData = { id: 123, email: 'test@example.com' };
 * if (!isUser(invalidData)) {
 *   console.error('Invalid user data');
 * }
 * ```
 *
 * @see {@link assertIsUser} - 如果需要在验证失败时抛出错误，请使用此函数
 * @see {@link isUserWithRelations} - 如果需要验证包含关联数据的User对象
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
 * 验证对象是否为包含可选关联数据的User类型
 *
 * @description 检查对象是否为有效的User类型，并验证其可选的关联字段（credentials、syncConfigs、syncHistory）
 * 的类型是否正确。这是一个类型守卫函数，适用于使用Prisma include查询返回的User对象。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象是有效的User类型且所有存在的关联字段类型正确时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将obj的类型收窄为User & { credentials?, syncConfigs?, syncHistory? }。
 *
 * @example
 * ```typescript
 * const user = await prisma.user.findUnique({
 *   where: { id: userId },
 *   include: { credentials: true, syncConfigs: true, syncHistory: true }
 * });
 *
 * if (isUserWithRelations(user)) {
 *   // TypeScript现在知道user包含关联数据
 *   if (user.credentials) {
 *     console.log(user.credentials.feishuAppId);
 *   }
 *   if (user.syncHistory) {
 *     console.log(`Found ${user.syncHistory.length} sync records`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 部分关联数据的情况
 * const user = await prisma.user.findUnique({
 *   where: { id: userId },
 *   include: { credentials: true }
 * });
 *
 * if (isUserWithRelations(user)) {
 *   // 只验证存在的关联字段
 *   console.log('User with credentials validated');
 * }
 * ```
 *
 * @see {@link isUser} - 用于验证不包含关联数据的基础User对象
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
    if (
      !Array.isArray(user.syncHistory) ||
      !user.syncHistory.every(isSyncHistory)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 验证数组是否为有效的User类型数组
 *
 * @description 检查给定值是否为数组，并验证数组中的每个元素是否都是有效的User类型。
 * 这是一个类型守卫函数，适用于批量查询返回的用户列表。
 *
 * @param arr - 待验证的未知类型值
 *
 * @returns 当值是数组且所有元素都是有效的User类型时返回true，否则返回false。
 * 这是一个类型守卫，返回true时TypeScript会将arr的类型收窄为User[]。
 *
 * @example
 * ```typescript
 * const users = await prisma.user.findMany();
 * if (isUserArray(users)) {
 *   // TypeScript现在知道users是User[]类型
 *   users.forEach(user => {
 *     console.log(user.email);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 空数组也是有效的
 * const emptyUsers = [];
 * if (isUserArray(emptyUsers)) {
 *   console.log('Valid empty user array');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 验证失败的情况
 * const mixedArray = [validUser, { invalid: 'data' }];
 * if (!isUserArray(mixedArray)) {
 *   console.error('Array contains invalid user data');
 * }
 * ```
 *
 * @see {@link isUser} - 用于验证单个User对象
 */
export function isUserArray(arr: unknown): arr is User[] {
  return Array.isArray(arr) && arr.every(isUser);
}

/**
 * 断言对象为User类型，验证失败时抛出错误
 *
 * @description 验证对象是否为有效的User类型，如果验证失败则抛出包含详细错误信息的Error。
 * 这是一个断言函数，适用于必须保证类型正确的场景。
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 此函数不返回值，但会断言obj的类型为User。如果验证成功，TypeScript会将obj的类型收窄为User。
 *
 * @throws {Error} 当对象不是有效的User类型时，抛出包含接收对象JSON表示的错误信息
 *
 * @example
 * ```typescript
 * const data = await fetchUserData();
 * assertIsUser(data);
 * // 如果执行到这里，TypeScript知道data一定是User类型
 * console.log(data.email); // 类型安全
 * ```
 *
 * @example
 * ```typescript
 * // 错误处理
 * try {
 *   const unknownData = { invalid: 'data' };
 *   assertIsUser(unknownData);
 * } catch (error) {
 *   console.error('User validation failed:', error.message);
 *   // 错误信息包含完整的对象JSON表示
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 在管道中使用
 * const processUser = (data: unknown) => {
 *   assertIsUser(data);
 *   return { ...data, processed: true };
 * };
 * ```
 *
 * @see {@link isUser} - 如果不希望抛出错误，请使用此类型守卫函数
 */
export function assertIsUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error(
      `Object is not a valid User type. Received: ${JSON.stringify(obj, null, 2)}`,
    );
  }
}

/**
 * @description 验证UserCredentials类型的所有必需字段和类型约束
 */
function isUserCredentials(obj: unknown): obj is UserCredentials {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const cred = obj as Record<string, unknown>;

  return (
    typeof cred.userId === 'string' &&
    (cred.doubanCookieEncrypted === null ||
      typeof cred.doubanCookieEncrypted === 'string') &&
    (cred.feishuAppId === null || typeof cred.feishuAppId === 'string') &&
    (cred.feishuAppSecretEncrypted === null ||
      typeof cred.feishuAppSecretEncrypted === 'string') &&
    typeof cred.encryptionIv === 'string' &&
    cred.updatedAt instanceof Date &&
    cred.createdAt instanceof Date
  );
}

/**
 * @description 验证SyncConfig类型的所有必需字段和类型约束，包括mappingType枚举值校验
 */
function isSyncConfig(obj: unknown): obj is SyncConfig {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const config = obj as Record<string, unknown>;

  return (
    typeof config.userId === 'string' &&
    (config.mappingType === 'THREE_TABLES' ||
      config.mappingType === 'FOUR_TABLES') &&
    typeof config.autoSyncEnabled === 'boolean' &&
    config.createdAt instanceof Date &&
    config.updatedAt instanceof Date
  );
}

/**
 * @description 验证SyncHistory类型的所有必需字段和类型约束，包括triggerType和status枚举值校验
 */
function isSyncHistory(obj: unknown): obj is SyncHistory {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const history = obj as Record<string, unknown>;

  return (
    typeof history.id === 'string' &&
    typeof history.userId === 'string' &&
    (history.triggerType === 'MANUAL' || history.triggerType === 'AUTO') &&
    ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'].includes(
      history.status as string,
    ) &&
    history.startedAt instanceof Date &&
    (history.completedAt === null || history.completedAt instanceof Date) &&
    typeof history.itemsSynced === 'number' &&
    (history.errorMessage === null || typeof history.errorMessage === 'string')
  );
}
