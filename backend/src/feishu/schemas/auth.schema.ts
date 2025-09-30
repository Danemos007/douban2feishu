/**
 * 飞书认证API Schema定义
 *
 * 基于真实API响应设计 (2025-09-02 事实核查)
 * Fixture样本: __fixtures__/auth-response.json
 * 设计原则: "宽进严出" + "类型唯一性"
 */

import { z } from 'zod';

/**
 * 飞书认证请求Schema
 *
 * @description 验证飞书应用认证请求的数据结构和有效性
 *
 * 验证规则：
 * - app_id: 必须为非空字符串
 * - app_secret: 必须为非空字符串
 *
 * @example
 * ```typescript
 * const request = {
 *   app_id: "cli_your_app_id_here",
 *   app_secret: "your_app_secret_here"
 * };
 * const result = FeishuAuthRequestSchema.safeParse(request);
 * ```
 */
const FeishuAuthRequestSchema = z.object({
  app_id: z.string().min(1, 'app_id不能为空'),
  app_secret: z.string().min(1, 'app_secret不能为空'),
});

/**
 * 飞书Token响应Schema - 基于真实API响应
 *
 * @description 验证飞书认证API返回的Token响应数据结构和有效性
 *
 * 验证规则：
 * - code: 必须严格等于0（表示成功）
 * - msg: 必须为字符串类型的状态信息
 * - tenant_access_token: 必须为非空字符串的访问令牌
 * - expire: 必须为正数的令牌过期时间（秒）
 * - 允许额外字段通过（passthrough模式）
 *
 * 真实API响应结构:
 * ```json
 * {
 *   "code": 0,
 *   "expire": 7199,
 *   "msg": "ok",
 *   "tenant_access_token": "t-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3"
 * }
 * ```
 *
 * @example
 * ```typescript
 * const response = {
 *   code: 0,
 *   expire: 7199,
 *   msg: "ok",
 *   tenant_access_token: "t-xxx"
 * };
 * const result = FeishuTokenResponseSchema.safeParse(response);
 * ```
 */
const FeishuTokenResponseSchema = z
  .object({
    // API状态：严格验证
    code: z.literal(0),
    msg: z.string(),

    // 核心Token数据：严格验证
    tenant_access_token: z.string().min(1, 'tenant_access_token不能为空'),
    expire: z.number().positive('expire必须为正数'),
  })
  .passthrough(); // 允许其他字段

/**
 * Token缓存信息Schema - 用于内部缓存管理
 *
 * @description 验证Token缓存对象的数据结构，确保缓存信息的完整性和有效性
 *
 * 验证规则：
 * - token: 必须为非空字符串的访问令牌
 * - expiresAt: 必须为正数的过期时间戳（毫秒）
 * - createdAt: 必须为正数的创建时间戳（毫秒）
 * - appId: 必须为非空字符串的应用ID
 *
 * @example
 * ```typescript
 * const cacheInfo = {
 *   token: "t-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3",
 *   expiresAt: Date.now() + 7200000, // 2小时后过期
 *   createdAt: Date.now(),
 *   appId: "cli_your_app_id_here"
 * };
 * const result = TokenCacheInfoSchema.safeParse(cacheInfo);
 * ```
 */
const TokenCacheInfoSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.number().positive(),
  createdAt: z.number().positive(),
  appId: z.string().min(1),
});

/**
 * Token统计信息Schema - 用于Token管理监控
 *
 * @description 验证Token管理系统的统计数据结构，用于监控和报告Token使用情况
 *
 * 验证规则：
 * - totalApps: 必须为非负整数，表示系统中管理的应用总数
 * - cachedTokens: 必须为非负整数，表示当前缓存中的Token数量
 * - expiringSoon: 必须为非负整数，表示即将过期的Token数量
 *
 * @example
 * ```typescript
 * const stats = {
 *   totalApps: 5,       // 管理5个应用
 *   cachedTokens: 3,    // 缓存3个Token
 *   expiringSoon: 1     // 1个Token即将过期
 * };
 * const result = TokenStatsSchema.safeParse(stats);
 * ```
 */
const TokenStatsSchema = z.object({
  totalApps: z.number().min(0),
  cachedTokens: z.number().min(0),
  expiringSoon: z.number().min(0),
});

// ✅ 类型唯一性：所有TS类型从Schema生成

/**
 * @description 飞书认证请求的TypeScript类型定义
 *
 * 从FeishuAuthRequestSchema自动推导生成，确保类型与Schema验证规则完全同步
 *
 * @example
 * ```typescript
 * const request: FeishuAuthRequest = {
 *   app_id: "cli_your_app_id_here",
 *   app_secret: "your_app_secret_here"
 * };
 * ```
 */
export type FeishuAuthRequest = z.infer<typeof FeishuAuthRequestSchema>;

/**
 * @description 飞书Token响应的TypeScript类型定义
 *
 * 从FeishuTokenResponseSchema自动推导生成，包含所有必需字段和可选的额外字段
 *
 * @example
 * ```typescript
 * const response: FeishuTokenResponse = {
 *   code: 0,
 *   msg: "ok",
 *   tenant_access_token: "t-xxx",
 *   expire: 7199
 * };
 * ```
 */
export type FeishuTokenResponse = z.infer<typeof FeishuTokenResponseSchema>;

/**
 * @description Token缓存信息的TypeScript类型定义
 *
 * 从TokenCacheInfoSchema自动推导生成，用于内部Token缓存管理
 *
 * @example
 * ```typescript
 * const cacheInfo: TokenCacheInfo = {
 *   token: "t-xxx",
 *   expiresAt: Date.now() + 7200000,
 *   createdAt: Date.now(),
 *   appId: "cli_xxx"
 * };
 * ```
 */
export type TokenCacheInfo = z.infer<typeof TokenCacheInfoSchema>;

/**
 * @description Token统计信息的TypeScript类型定义
 *
 * 从TokenStatsSchema自动推导生成，用于Token管理系统的监控和报告
 *
 * @example
 * ```typescript
 * const stats: TokenStats = {
 *   totalApps: 5,
 *   cachedTokens: 3,
 *   expiringSoon: 1
 * };
 * ```
 */
export type TokenStats = z.infer<typeof TokenStatsSchema>;

// Schema导出
export {
  FeishuAuthRequestSchema,
  FeishuTokenResponseSchema,
  TokenCacheInfoSchema,
  TokenStatsSchema,
};

/**
 * 计算Token的实际过期时间戳，考虑安全缓冲时间
 *
 * @description 根据飞书API返回的expire秒数计算Token的实际过期时间戳，并提前1分钟作为安全缓冲
 *
 * @param response - 飞书Token响应对象，必须包含expire字段
 * @param response.expire - Token的有效期时间（秒），通常为7199秒（约2小时）
 *
 * @returns 计算后的过期时间戳（毫秒），已减去60秒安全缓冲时间
 *
 * @example
 * ```typescript
 * const tokenResponse: FeishuTokenResponse = {
 *   code: 0,
 *   msg: "ok",
 *   tenant_access_token: "t-xxx",
 *   expire: 7200 // 2小时
 * };
 *
 * const expiryTime = calculateTokenExpiry(tokenResponse);
 * // 返回: 当前时间 + 7200000毫秒 - 60000毫秒（1分钟缓冲）
 * ```
 *
 * @throws 不会抛出异常，但依赖Date.now()的系统时间准确性
 */
export function calculateTokenExpiry(response: FeishuTokenResponse): number {
  return Date.now() + response.expire * 1000 - 60000; // 提前1分钟过期
}

/**
 * 检查Token是否即将过期，用于主动刷新策略
 *
 * @description 根据缓存信息中的过期时间戳和当前时间，判断Token是否在指定阈值内即将过期
 *
 * @param cacheInfo - Token缓存信息对象
 * @param cacheInfo.expiresAt - Token的过期时间戳（毫秒）
 * @param cacheInfo.token - Token字符串（用于验证缓存有效性）
 * @param cacheInfo.createdAt - Token创建时间戳（毫秒）
 * @param cacheInfo.appId - 关联的应用ID
 * @param thresholdMs - 即将过期的时间阈值（毫秒），默认为300000（5分钟）
 *
 * @returns 如果Token在阈值时间内即将过期或已过期，返回true；否则返回false
 *
 * @example
 * ```typescript
 * const cacheInfo: TokenCacheInfo = {
 *   token: "t-xxx",
 *   expiresAt: Date.now() + 240000, // 4分钟后过期
 *   createdAt: Date.now() - 3600000, // 1小时前创建
 *   appId: "cli_xxx"
 * };
 *
 * // 使用默认5分钟阈值
 * const willExpire = isTokenExpiringSoon(cacheInfo);
 * console.log(willExpire); // true (4分钟 < 5分钟)
 *
 * // 使用自定义3分钟阈值
 * const willExpireSoon = isTokenExpiringSoon(cacheInfo, 180000);
 * console.log(willExpireSoon); // false (4分钟 > 3分钟)
 * ```
 *
 * @throws 不会抛出异常，但依赖Date.now()的系统时间准确性
 */
export function isTokenExpiringSoon(
  cacheInfo: TokenCacheInfo,
  thresholdMs = 300000,
): boolean {
  return cacheInfo.expiresAt - Date.now() < thresholdMs; // 默认5分钟
}
