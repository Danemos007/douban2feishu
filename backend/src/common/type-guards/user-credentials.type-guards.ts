/**
 * UserCredentials模型类型守卫函数
 * 用于运行时验证用户凭证数据的类型安全性
 *
 * @author Claude
 * @date 2025-09-09
 */

import { UserCredentials, User } from '../../../generated/prisma';

/**
 * 检查对象是否为有效的UserCredentials类型（类型守卫）
 *
 * @description 验证对象是否符合UserCredentials模型的完整结构，包括必需字段验证、UUID格式验证、加密IV格式验证和时间戳逻辑验证
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象满足以下所有条件时返回true，这是一个TypeScript类型守卫：
 * - userId: 必需，string类型，符合UUID v1-v5格式
 * - doubanCookieEncrypted: 可为null或string类型
 * - feishuAppId: 可为null，或非空string类型
 * - feishuAppSecretEncrypted: 可为null或string类型
 * - encryptionIv: 必需，32位十六进制字符串
 * - createdAt: 必需，Date类型
 * - updatedAt: 必需，Date类型，且不早于createdAt
 *
 * @example
 * ```typescript
 * const obj = {
 *   userId: '123e4567-e89b-12d3-a456-426614174000',
 *   doubanCookieEncrypted: 'encrypted_cookie',
 *   feishuAppId: 'cli_your_app_id_here',
 *   feishuAppSecretEncrypted: 'encrypted_secret',
 *   encryptionIv: '0123456789abcdef0123456789abcdef',
 *   createdAt: new Date('2025-01-01T10:00:00Z'),
 *   updatedAt: new Date('2025-01-10T10:00:00Z'),
 * };
 *
 * if (isUserCredentials(obj)) {
 *   // TypeScript现在知道obj是UserCredentials类型
 *   console.log(obj.userId); // 类型安全访问
 * }
 * ```
 *
 * @see {@link assertIsUserCredentials} 用于需要抛出错误的场景
 * @see {@link isUserCredentialsWithUser} 用于验证包含User关联的凭证
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
      (typeof credentials.feishuAppId === 'string' &&
        credentials.feishuAppId.length > 0)) &&
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
 * 检查对象是否为包含User关联的UserCredentials类型（类型守卫）
 *
 * @description 在验证UserCredentials基础上，进一步验证是否包含有效的User关联对象，常用于Prisma查询结果的类型验证
 *
 * @param obj - 待验证的未知类型对象
 *
 * @returns 当对象既是有效的UserCredentials又包含有效的User关联时返回true，这是一个TypeScript类型守卫
 *
 * @example
 * ```typescript
 * // Prisma查询包含关联的场景
 * const result = await prisma.userCredentials.findUnique({
 *   where: { userId: '...' },
 *   include: { user: true }
 * });
 *
 * if (isUserCredentialsWithUser(result)) {
 *   // 类型安全访问User关联
 *   console.log(result.user.email);
 * }
 * ```
 *
 * @see {@link isUserCredentials} 仅验证UserCredentials本身
 */
export function isUserCredentialsWithUser(
  obj: unknown,
): obj is UserCredentials & { user: User } {
  if (!isUserCredentials(obj)) {
    return false;
  }

  const credentials = obj as Record<string, unknown>;

  // 验证User关联是否存在且有效
  return credentials.user !== undefined && isUser(credentials.user);
}

/**
 * 检查数组是否为有效的UserCredentials类型数组（类型守卫）
 *
 * @description 验证数组中的每一个元素都是有效的UserCredentials对象，常用于批量查询结果的类型验证
 *
 * @param arr - 待验证的未知类型数组
 *
 * @returns 当参数是数组且所有元素都是有效的UserCredentials时返回true（空数组返回true），这是一个TypeScript类型守卫
 *
 * @example
 * ```typescript
 * // 批量查询场景
 * const results = await prisma.userCredentials.findMany({
 *   where: { /* ... *\/ }
 * });
 *
 * if (isUserCredentialsArray(results)) {
 *   // 类型安全遍历
 *   results.forEach(cred => {
 *     console.log(cred.userId);
 *   });
 * }
 * ```
 *
 * @see {@link isUserCredentials} 单个对象验证
 */
export function isUserCredentialsArray(arr: unknown): arr is UserCredentials[] {
  return Array.isArray(arr) && arr.every(isUserCredentials);
}

/**
 * 断言对象为UserCredentials类型，验证失败时抛出错误（类型断言）
 *
 * @description 当需要确保对象必须是UserCredentials类型时使用，验证失败会立即抛出错误并包含详细的错误信息，适用于不可恢复的错误场景
 *
 * @param obj - 待验证的未知类型对象
 *
 * @throws {Error} 当对象不是有效的UserCredentials类型时，抛出包含接收对象JSON表示的详细错误信息
 *
 * @example
 * ```typescript
 * // 处理不可信数据源时使用
 * function processCredentials(data: unknown) {
 *   assertIsUserCredentials(data); // 验证失败会抛出错误
 *   // 此后TypeScript知道data是UserCredentials类型
 *   return data.userId;
 * }
 *
 * // 错误处理示例
 * try {
 *   assertIsUserCredentials(untrustedData);
 * } catch (error) {
 *   console.error('Invalid credentials:', error.message);
 * }
 * ```
 *
 * @see {@link isUserCredentials} 用于需要返回布尔值的场景
 */
export function assertIsUserCredentials(
  obj: unknown,
): asserts obj is UserCredentials {
  if (!isUserCredentials(obj)) {
    throw new Error(
      `Object is not a valid UserCredentials type. Received: ${JSON.stringify(obj, null, 2)}`,
    );
  }
}

/**
 * 验证用户凭证是否包含有效的豆瓣配置
 *
 * @description 检查用户是否已配置豆瓣Cookie，用于判断用户是否可以执行豆瓣数据同步功能
 *
 * @param credentials - 已验证的UserCredentials对象
 *
 * @returns 当doubanCookieEncrypted不为null且不为空字符串时返回true，表示用户已配置豆瓣凭证
 *
 * @example
 * ```typescript
 * const credentials = await getUserCredentials(userId);
 *
 * if (hasDoubanCredentials(credentials)) {
 *   // 用户已配置豆瓣，可以执行同步
 *   await syncDoubanData(credentials);
 * } else {
 *   throw new Error('请先配置豆瓣Cookie');
 * }
 * ```
 *
 * @see {@link hasFeishuCredentials} 验证飞书配置
 * @see {@link isUserCredentialsComplete} 验证完整配置（豆瓣+飞书）
 */
export function hasDoubanCredentials(credentials: UserCredentials): boolean {
  return (
    credentials.doubanCookieEncrypted !== null &&
    credentials.doubanCookieEncrypted.length > 0
  );
}

/**
 * 验证用户凭证是否包含有效的飞书配置
 *
 * @description 检查用户是否已配置完整的飞书应用信息（AppId和AppSecret），用于判断用户是否可以执行飞书数据写入功能
 *
 * @param credentials - 已验证的UserCredentials对象
 *
 * @returns 当feishuAppId和feishuAppSecretEncrypted都不为null且不为空字符串时返回true，表示用户已完整配置飞书凭证
 *
 * @example
 * ```typescript
 * const credentials = await getUserCredentials(userId);
 *
 * if (hasFeishuCredentials(credentials)) {
 *   // 用户已配置飞书，可以写入数据
 *   await writeToFeishu(credentials, data);
 * } else {
 *   throw new Error('请先配置飞书应用信息');
 * }
 * ```
 *
 * @see {@link hasDoubanCredentials} 验证豆瓣配置
 * @see {@link isUserCredentialsComplete} 验证完整配置（豆瓣+飞书）
 */
export function hasFeishuCredentials(credentials: UserCredentials): boolean {
  return (
    credentials.feishuAppId !== null &&
    credentials.feishuAppId.length > 0 &&
    credentials.feishuAppSecretEncrypted !== null &&
    credentials.feishuAppSecretEncrypted.length > 0
  );
}

/**
 * 验证用户凭证是否完整配置（同时包含豆瓣和飞书配置）
 *
 * @description 检查用户是否已完成所有必需的配置，包括豆瓣Cookie和飞书应用信息，用于判断用户是否可以执行完整的同步流程
 *
 * @param credentials - 已验证的UserCredentials对象
 *
 * @returns 当同时满足hasDoubanCredentials和hasFeishuCredentials时返回true，表示用户可以执行完整同步
 *
 * @example
 * ```typescript
 * const credentials = await getUserCredentials(userId);
 *
 * if (isUserCredentialsComplete(credentials)) {
 *   // 用户配置完整，可以执行完整同步流程
 *   await executeFullSync(credentials);
 * } else {
 *   // 检查具体缺少哪个配置
 *   const missing = [];
 *   if (!hasDoubanCredentials(credentials)) missing.push('豆瓣Cookie');
 *   if (!hasFeishuCredentials(credentials)) missing.push('飞书应用信息');
 *   throw new Error(`请先配置：${missing.join('、')}`);
 * }
 * ```
 *
 * @see {@link hasDoubanCredentials} 单独验证豆瓣配置
 * @see {@link hasFeishuCredentials} 单独验证飞书配置
 */
export function isUserCredentialsComplete(
  credentials: UserCredentials,
): boolean {
  return hasDoubanCredentials(credentials) && hasFeishuCredentials(credentials);
}

/**
 * 验证加密IV是否格式正确
 *
 * @description 检查加密初始化向量(IV)是否符合AES-256-GCM加密要求（32位十六进制字符串），用于加密操作前的格式验证
 *
 * @param credentials - 已验证的UserCredentials对象
 *
 * @returns 当encryptionIv长度为32且为有效十六进制字符串时返回true，表示IV格式正确可用于加密操作
 *
 * @example
 * ```typescript
 * const credentials = await getUserCredentials(userId);
 *
 * if (!hasValidEncryptionIv(credentials)) {
 *   // IV格式错误，需要重新生成
 *   await regenerateEncryptionIv(credentials);
 * }
 *
 * // IV格式正确，可以安全执行加密操作
 * const decrypted = decryptData(credentials.doubanCookieEncrypted, credentials.encryptionIv);
 * ```
 */
export function hasValidEncryptionIv(credentials: UserCredentials): boolean {
  return (
    credentials.encryptionIv.length === 32 &&
    isValidHex(credentials.encryptionIv)
  );
}

// ============================================================================
// 内部辅助函数 (Internal Helper Functions)
// ============================================================================

/**
 * @description 验证字符串是否符合UUID v1-v5标准格式（8-4-4-4-12，第三段首位为1-5，第四段首位为8/9/a/b）
 */
function isValidUuid(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * @description 验证字符串是否为有效的十六进制（仅包含0-9和a-f字符，不区分大小写）
 */
function isValidHex(str: string): boolean {
  const hexRegex = /^[0-9a-f]+$/i;
  return hexRegex.test(str);
}

/**
 * @description 简化的User类型守卫，避免循环依赖，用于验证UserCredentials的user关联字段
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
 * @description 验证字符串是否为有效的电子邮件格式（基础格式：xxx@xxx.xxx）
 */
function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}
