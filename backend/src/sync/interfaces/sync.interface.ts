/**
 * 豆瓣数据分类类型
 */
export type DoubanDataCategory = 'books' | 'movies' | 'tv' | 'documentary';

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
 * 任务队列状态统计接口
 */
export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}
