import { z } from 'zod';
import type { DoubanItem } from '../../douban/interfaces/douban.interface';

/**
 * 豆瓣数据分类类型
 */
export type DoubanDataCategory = 'books' | 'movies' | 'tv' | 'documentary';

/**
 * 豆瓣数据项类型 - 联合类型定义
 */
export type DoubanDataItem = DoubanItem;

/**
 * 飞书表格记录类型定义
 * 基于实际飞书API字段类型的严格定义
 */
export interface FeishuTableRecord {
  [fieldName: string]:
    | string
    | number
    | boolean
    | Date
    | string[]
    | null
    | undefined;
}

/**
 * 同步触发类型
 */
export type SyncTriggerType = 'MANUAL' | 'AUTO';

/**
 * 同步状态类型
 */
export type SyncStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

/**
 * 同步任务选项接口
 */
export interface SyncJobOptions {
  categories?: DoubanDataCategory[];
  limit?: number;
  forceUpdate?: boolean;
  tableMapping?: Record<string, string>;
  fullSync?: boolean;
  conflictStrategy?: 'douban_wins' | 'feishu_wins' | 'merge';
}

/**
 * 同步任务数据接口 - 强类型版本
 */
export interface SyncJobData {
  syncId: string;
  userId: string;
  options: SyncJobOptions;
}

/**
 * 同步阶段类型
 */
export type SyncPhase =
  | 'create'
  | 'update'
  | 'delete'
  | 'validate'
  | 'transform';

/**
 * 同步进度元数据接口
 */
export interface SyncProgressMetadata {
  phase?: SyncPhase;
  category?: DoubanDataCategory;
  batchSize?: number;
  currentBatch?: number;
  totalBatches?: number;
  timestamp?: string;
  performance?: {
    startTime?: Date;
    duration?: number;
  };
}

/**
 * 同步进度接口 - 强类型版本
 */
export interface SyncProgress {
  syncId: string;
  jobId?: string;
  status: SyncStatus;
  progress: number; // 0-100
  message: string;
  itemsProcessed?: number;
  totalItems?: number;
  error?: string;
  metadata?: SyncProgressMetadata;
}

/**
 * 同步操作统计接口
 */
export interface SyncOperationSummary {
  total: number;
  synced: number;
  failed: number;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  categories?: Record<DoubanDataCategory, number>;
}

/**
 * 同步性能统计接口
 */
export interface SyncPerformanceStats {
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  throughput?: number; // items per second
  apiCalls?: number;
  errorRate?: number; // percentage
}

/**
 * 同步结果接口 - 企业级版本
 */
export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  summary: SyncOperationSummary;
  performance: SyncPerformanceStats;
  errors?: string[];
  warnings?: string[];
  details?: {
    createdRecords: Array<{ subjectId: string; recordId: string }>;
    updatedRecords: Array<{ subjectId: string; recordId: string }>;
    failedRecords: Array<{ subjectId: string; error: string }>;
  };
}

/**
 * 同步引擎配置接口
 */
export interface SyncEngineConfig {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  dataType: DoubanDataCategory;
  subjectIdField: string;
}

/**
 * 同步选项配置接口
 */
export interface SyncOptionsConfig {
  fullSync?: boolean;
  conflictStrategy?: 'douban_wins' | 'feishu_wins' | 'merge';
  deleteOrphans?: boolean;
  batchSize?: number;
  concurrentBatches?: number;
  onProgress?: (progress: SyncProgressCallback) => void;
}

/**
 * 同步进度回调接口
 */
export interface SyncProgressCallback {
  phase: SyncPhase;
  processed: number;
  total: number;
  message?: string;
}

/**
 * WebSocket事件负载基础接口
 */
export interface WebSocketEventPayload {
  timestamp: string;
  eventId?: string;
}

/**
 * 同步进度WebSocket事件
 */
export interface SyncProgressEvent extends WebSocketEventPayload {
  type: 'sync-progress';
  data: SyncProgress;
}

/**
 * 同步错误WebSocket事件
 */
export interface SyncErrorEvent extends WebSocketEventPayload {
  type: 'sync-error';
  data: {
    syncId?: string;
    message: string;
    code?: string;
    severity: 'warning' | 'error' | 'critical';
  };
}

/**
 * 系统消息WebSocket事件
 */
export interface SystemMessageEvent extends WebSocketEventPayload {
  type: 'system-message';
  data: {
    message: string;
    level: 'info' | 'warning' | 'error';
  };
}

/**
 * WebSocket事件联合类型
 */
export type WebSocketEvent =
  | SyncProgressEvent
  | SyncErrorEvent
  | SystemMessageEvent;

/**
 * 数据转换统计接口
 */
export interface DataTransformationStats {
  totalProcessed: number;
  repairsApplied: number;
  validationWarnings: number;
  processingTime: number;
}

/**
 * 飞书同步统计接口
 */
export interface FeishuSyncStats {
  total: number;
  created: number;
  updated: number;
  failed: number;
}

/**
 * 同步元数据 Zod Schema - 企业级数据边界验证
 * 单一事实来源：从此Schema自动生成TypeScript类型
 */
export const SyncMetadataSchema = z
  .object({
    options: z
      .object({
        category: z.enum(['books', 'movies', 'tv', 'documentary']).optional(),
        transformationEnabled: z.boolean().optional(),
      })
      .catchall(z.unknown())
      .optional(),
    requestedAt: z.string().optional(),
    transformationStats: z
      .object({
        totalProcessed: z.number(),
        repairsApplied: z.number(),
        validationWarnings: z.number(),
        processingTime: z.number(),
      })
      .optional(),
    feishuSyncStats: z
      .object({
        total: z.number(),
        created: z.number(),
        updated: z.number(),
        failed: z.number(),
      })
      .optional(),
    performance: z
      .object({
        startTime: z.date().optional(),
        duration: z.number().optional(),
      })
      .optional(),
  })
  .catchall(z.unknown()); // 允许扩展字段但保持类型安全

/**
 * 同步元数据类型 - 从Zod Schema自动推导
 * 确保类型定义与运行时验证完全一致
 */
export type SyncMetadata = z.infer<typeof SyncMetadataSchema>;

/**
 * 数据转换结果接口 - 企业级类型安全版本
 */
export interface DataTransformationResult<
  T = DoubanDataItem,
  U = FeishuTableRecord,
> {
  rawData: T[];
  transformedData: U[];
  transformationStats: DataTransformationStats;
}

/**
 * 任务队列状态统计接口
 */
export interface QueueStats {
  // 基础统计字段（所有实现都应包含）
  active: number;
  waiting: number;
  completed: number;
  failed: number;

  // 扩展统计字段（可选，根据具体实现决定）
  delayed?: number;
  paused?: number;
  totalProcessed?: number;
  averageProcessingTime?: number;
  lastProcessedAt?: Date;
}
