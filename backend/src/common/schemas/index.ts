/**
 * 全局Zod验证schemas
 * 为运行时类型验证提供完整的schema定义
 */

import { z } from 'zod';

// ===== 基础schema =====

/**
 * API响应schema
 */
export const ApiResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

/**
 * 分页响应schema
 */
export const PaginatedResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(z.unknown()),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

/**
 * 错误响应schema
 */
export const ApiErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// ===== 用户和认证schema =====

/**
 * 用户schema
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastSyncAt: z.coerce.date().optional(),
});

/**
 * JWT载荷schema
 */
export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
});

/**
 * 认证用户schema
 */
export const AuthenticatedUserSchema = UserSchema.extend({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// ===== 同步配置schema =====

/**
 * 同步状态schema
 */
export const SyncStatusSchema = z.enum([
  'idle',
  'pending',
  'running',
  'success',
  'failed',
  'cancelled',
] as const);

/**
 * 同步配置schema
 */
export const SyncConfigSchema = z.object({
  userId: z.string().uuid(),
  doubanCookie: z.string().min(1),
  feishuAppId: z.string().min(1),
  feishuAppSecret: z.string().min(1),
  feishuAppToken: z.string().min(1),
  tableMappings: z.object({
    books: z.string().min(1),
    movies: z.string().min(1),
    tv: z.string().min(1),
    documentary: z.string().min(1),
  }),
  autoSync: z.boolean(),
  syncSchedule: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * 同步任务schema
 */
export const SyncTaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['manual', 'scheduled'] as const),
  status: SyncStatusSchema,
  config: SyncConfigSchema,
  progress: z
    .object({
      current: z.number(),
      total: z.number(),
      stage: z.string(),
    })
    .optional(),
  result: z
    .object({
      totalItems: z.number(),
      successfulItems: z.number(),
      failedItems: z.number(),
      skippedItems: z.number(),
      itemsByCategory: z.object({
        books: z.number(),
        movies: z.number(),
        tv: z.number(),
        documentary: z.number(),
      }),
      errors: z.array(
        z.object({
          itemId: z.string(),
          error: z.string(),
          category: z.string(),
        }),
      ),
      duration: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

// ===== 外部API schema =====

/**
 * 飞书API响应schema
 */
export const FeishuApiResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.unknown().optional(),
});

/**
 * 飞书Token响应schema
 */
export const FeishuTokenResponseSchema = z.object({
  tenant_access_token: z.string(),
  expire: z.number(),
});

/**
 * 飞书字段schema
 */
export const FeishuFieldSchema = z.object({
  field_id: z.string(),
  field_name: z.string(),
  type: z.number(),
  property: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
});

/**
 * 飞书字段列表响应schema
 */
export const FeishuFieldListResponseSchema = z.object({
  items: z.array(FeishuFieldSchema),
  has_more: z.boolean(),
  page_token: z.string().optional(),
  total: z.number(),
});

// ===== 豆瓣数据schema =====

/**
 * 豆瓣解析条目schema
 */
export const DoubanParsedItemSchema = z.object({
  subjectId: z.string(),
  title: z.string(),
  originalTitle: z.string().optional(),
  year: z.number().optional(),
  rating: z
    .object({
      average: z.number(),
      numRaters: z.number(),
    })
    .optional(),
  genres: z.array(z.string()),
  summary: z.string().optional(),
  coverUrl: z.string().url().optional(),
  doubanUrl: z.string().url(),
  userRating: z.number().min(1).max(5).optional(),
  userComment: z.string().optional(),
  userTags: z.array(z.string()),
  readDate: z.coerce.date().optional(),
  category: z.enum(['books', 'movies', 'tv', 'documentary'] as const),
});

// ===== 数据转换schema =====

/**
 * 数据转换选项schema
 */
export const DataTransformOptionsSchema = z.object({
  enableIntelligentRepair: z.boolean(),
  validateOutput: z.boolean(),
  includeMetadata: z.boolean(),
  repairConfig: z
    .object({
      fixDuration: z.boolean(),
      fixReleaseDate: z.boolean(),
      fixLanguage: z.boolean(),
      fixCountry: z.boolean(),
    })
    .optional(),
});

/**
 * 验证结果schema
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  data: z.unknown().optional(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string().optional(),
    }),
  ),
});

// ===== 导出类型推断 =====
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
export type User = z.infer<typeof UserSchema>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type SyncTask = z.infer<typeof SyncTaskSchema>;
export type FeishuApiResponse = z.infer<typeof FeishuApiResponseSchema>;
export type FeishuField = z.infer<typeof FeishuFieldSchema>;
export type DoubanParsedItem = z.infer<typeof DoubanParsedItemSchema>;
export type DataTransformOptions = z.infer<typeof DataTransformOptionsSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ===== 导出所有schema =====
// 注意：以下导出在需要时取消注释
// export * from './feishu.schemas';
// export * from './douban.schemas';
// export * from './auth.schemas';
