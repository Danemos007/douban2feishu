/**
 * 同步任务数据接口
 */
export interface SyncJobData {
  syncId: string;
  userId: string;
  options: {
    categories?: string[];
    limit?: number;
    forceUpdate?: boolean;
    tableMapping?: Record<string, string>;
  };
}

/**
 * 同步进度接口
 */
export interface SyncProgress {
  syncId: string;
  jobId?: string;
  status:
    | 'QUEUED'
    | 'RUNNING'
    | 'PROCESSING'
    | 'SUCCESS'
    | 'FAILED'
    | 'CANCELLED';
  progress: number; // 0-100
  message: string;
  itemsProcessed?: number;
  totalItems?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 同步结果接口
 */
export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  summary: {
    total: number;
    synced: number;
    failed: number;
    categories?: Record<string, number>;
  };
  errors?: string[];
}
