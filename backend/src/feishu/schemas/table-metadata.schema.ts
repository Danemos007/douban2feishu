/**
 * 飞书多维表格元数据 API Schema 定义
 * 
 * 基于真实 API 响应设计，支持表格信息、视图配置等元数据操作
 * 设计原则: "未来优先" + "类型唯一性" + "完整覆盖"
 */

import { z } from 'zod';

/**
 * 表格基本信息 Schema
 */
export const FeishuTableInfoSchema = z.object({
  table_id: z.string().min(1, 'table_id不能为空'),
  table_name: z.string().min(1, 'table_name不能为空'),
  revision: z.number().optional(),
  created_time: z.number().optional(),
  last_modified_time: z.number().optional(),
  created_by: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  last_modified_by: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
}).passthrough();

/**
 * App/多维表格应用信息 Schema
 */
export const FeishuAppInfoSchema = z.object({
  app_token: z.string().min(1, 'app_token不能为空'),
  app_name: z.string().min(1, 'app_name不能为空'),
  folder_token: z.string().optional(),
  url: z.string().url().optional(),
  created_time: z.number().optional(),
  last_modified_time: z.number().optional(),
  created_by: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  last_modified_by: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
}).passthrough();

/**
 * 表格列表响应 Schema
 */
export const FeishuTablesListResponseSchema = z.object({
  code: z.number().refine((val) => val === 0, { message: '获取表格列表失败' }),
  msg: z.string(),
  data: z.object({
    tables: z.array(FeishuTableInfoSchema),
    total: z.number().min(0),
    has_more: z.boolean(),
    page_token: z.string().optional(),
  }),
}).passthrough();

/**
 * App信息响应 Schema
 */
export const FeishuAppInfoResponseSchema = z.object({
  code: z.number().refine((val) => val === 0, { message: '获取App信息失败' }),
  msg: z.string(),
  data: z.object({
    app: FeishuAppInfoSchema,
  }),
}).passthrough();

/**
 * 视图信息 Schema
 */
export const FeishuViewSchema = z.object({
  view_id: z.string().min(1, 'view_id不能为空'),
  view_name: z.string().min(1, 'view_name不能为空'),
  view_type: z.string().optional(), // grid, kanban, gallery, gantt, etc.
  property: z.object({
    filter_info: z.object({
      conjunction: z.enum(['and', 'or']).optional(),
      conditions: z.array(z.object({
        field_id: z.string(),
        operator: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      })).optional(),
    }).optional(),
    sort_info: z.array(z.object({
      field_id: z.string(),
      desc: z.boolean().optional(),
    })).optional(),
    group_info: z.array(z.object({
      field_id: z.string(),
      desc: z.boolean().optional(),
    })).optional(),
  }).passthrough().optional(),
}).passthrough();

/**
 * 视图列表响应 Schema
 */
export const FeishuViewsListResponseSchema = z.object({
  code: z.number().refine((val) => val === 0, { message: '获取视图列表失败' }),
  msg: z.string(),
  data: z.object({
    views: z.array(FeishuViewSchema),
    total: z.number().min(0),
    has_more: z.boolean(),
    page_token: z.string().optional(),
  }),
}).passthrough();

/**
 * 表格统计信息 Schema
 */
export const FeishuTableStatsSchema = z.object({
  table_id: z.string(),
  record_count: z.number().min(0),
  field_count: z.number().min(0),
  view_count: z.number().min(0),
  last_activity_time: z.number().optional(),
  storage_usage: z.number().min(0).optional(), // 字节
}).passthrough();

/**
 * 权限信息 Schema
 */
export const FeishuPermissionSchema = z.object({
  role: z.enum(['owner', 'editor', 'reader', 'commenter']).optional(),
  can_read: z.boolean(),
  can_write: z.boolean(),
  can_delete: z.boolean(),
  can_share: z.boolean(),
  can_manage: z.boolean(),
}).passthrough();

/**
 * 协作者信息 Schema
 */
export const FeishuCollaboratorSchema = z.object({
  member_type: z.enum(['user', 'app', 'chat']).optional(),
  member_id: z.string(),
  member_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  permission: FeishuPermissionSchema.optional(),
}).passthrough();

/**
 * 协作者列表响应 Schema
 */
export const FeishuCollaboratorsResponseSchema = z.object({
  code: z.number().refine((val) => val === 0, { message: '获取协作者列表失败' }),
  msg: z.string(),
  data: z.object({
    collaborators: z.array(FeishuCollaboratorSchema),
    total: z.number().min(0),
  }),
}).passthrough();

/**
 * 表格配置信息 Schema - 用于内部管理
 */
export const TableConfigurationSchema = z.object({
  appToken: z.string().min(1),
  tableId: z.string().min(1),
  tableName: z.string().min(1),
  primaryFieldId: z.string().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(), // fieldName -> fieldId
  lastSyncTime: z.string().datetime().optional(),
  syncStatus: z.enum(['active', 'paused', 'error']).default('active'),
  recordCount: z.number().min(0).optional(),
  healthScore: z.number().min(0).max(100).optional(), // 表格健康度评分
}).passthrough();

// ✅ 类型唯一性：所有 TS 类型从 Schema 生成
export type FeishuTableInfo = z.infer<typeof FeishuTableInfoSchema>;
export type FeishuAppInfo = z.infer<typeof FeishuAppInfoSchema>;
export type FeishuTablesListResponse = z.infer<typeof FeishuTablesListResponseSchema>;
export type FeishuAppInfoResponse = z.infer<typeof FeishuAppInfoResponseSchema>;
export type FeishuView = z.infer<typeof FeishuViewSchema>;
export type FeishuViewsListResponse = z.infer<typeof FeishuViewsListResponseSchema>;
export type FeishuTableStats = z.infer<typeof FeishuTableStatsSchema>;
export type FeishuPermission = z.infer<typeof FeishuPermissionSchema>;
export type FeishuCollaborator = z.infer<typeof FeishuCollaboratorSchema>;
export type FeishuCollaboratorsResponse = z.infer<typeof FeishuCollaboratorsResponseSchema>;
export type TableConfiguration = z.infer<typeof TableConfigurationSchema>;

// Schema 导出 - 移除重复导出，避免与上方 export const 冲突