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
 */
const FeishuAuthRequestSchema = z.object({
  app_id: z.string().min(1, 'app_id不能为空'),
  app_secret: z.string().min(1, 'app_secret不能为空'),
});

/**
 * 飞书Token响应Schema - 基于真实API响应
 *
 * 真实API响应结构:
 * {
 *   "code": 0,
 *   "expire": 7199,
 *   "msg": "ok",
 *   "tenant_access_token": "t-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3"
 * }
 */
const FeishuTokenResponseSchema = z
  .object({
    // API状态：严格验证
    code: z.number().refine((val) => val === 0, { message: '飞书认证失败' }),
    msg: z.string(),

    // 核心Token数据：严格验证
    tenant_access_token: z.string().min(1, 'tenant_access_token不能为空'),
    expire: z.number().positive('expire必须为正数'),
  })
  .passthrough(); // 允许其他字段

/**
 * Token缓存信息Schema - 用于内部缓存管理
 */
const TokenCacheInfoSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.number().positive(),
  createdAt: z.number().positive(),
  appId: z.string().min(1),
});

/**
 * Token统计信息Schema - 用于Token管理监控
 */
const TokenStatsSchema = z.object({
  totalApps: z.number().min(0),
  cachedTokens: z.number().min(0),
  expiringSoon: z.number().min(0),
});

// ✅ 类型唯一性：所有TS类型从Schema生成
export type FeishuAuthRequest = z.infer<typeof FeishuAuthRequestSchema>;
export type FeishuTokenResponse = z.infer<typeof FeishuTokenResponseSchema>;
export type TokenCacheInfo = z.infer<typeof TokenCacheInfoSchema>;
export type TokenStats = z.infer<typeof TokenStatsSchema>;

// Schema导出
export {
  FeishuAuthRequestSchema,
  FeishuTokenResponseSchema,
  TokenCacheInfoSchema,
  TokenStatsSchema,
};

/**
 * 辅助函数：计算Token过期时间戳
 */
export function calculateTokenExpiry(response: FeishuTokenResponse): number {
  return Date.now() + response.expire * 1000 - 60000; // 提前1分钟过期
}

/**
 * 辅助函数：检查Token是否即将过期
 */
export function isTokenExpiringSoon(
  cacheInfo: TokenCacheInfo,
  thresholdMs = 300000,
): boolean {
  return cacheInfo.expiresAt - Date.now() < thresholdMs; // 默认5分钟
}
