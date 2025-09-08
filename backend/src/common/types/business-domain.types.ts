/**
 * 业务领域类型定义
 * 定义应用核心业务逻辑的类型
 */

// ===== 用户和认证类型 =====

/**
 * 用户基础信息
 */
export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

/**
 * JWT Token载荷
 */
export interface JwtPayload {
  sub: string; // 用户ID
  email: string;
  iat: number;
  exp: number;
}

/**
 * 认证用户信息
 */
export interface AuthenticatedUser extends User {
  accessToken: string;
  refreshToken: string;
}

// ===== 同步和配置类型 =====

/**
 * 同步状态枚举
 */
export const SyncStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type SyncStatusType = typeof SyncStatus[keyof typeof SyncStatus];

/**
 * 同步配置
 */
export interface SyncConfig {
  userId: string;
  doubanCookie: string;
  feishuAppId: string;
  feishuAppSecret: string;
  feishuAppToken: string;
  tableMappings: {
    books: string;
    movies: string;
    tv: string;
    documentary: string;
  };
  autoSync: boolean;
  syncSchedule?: string; // Cron表达式
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 同步任务
 */
export interface SyncTask {
  id: string;
  userId: string;
  type: 'manual' | 'scheduled';
  status: SyncStatusType;
  config: SyncConfig;
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
  result?: SyncResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 同步结果
 */
export interface SyncResult {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  itemsByCategory: {
    books: number;
    movies: number;
    tv: number;
    documentary: number;
  };
  errors: Array<{
    itemId: string;
    error: string;
    category: string;
  }>;
  duration: number; // 毫秒
}

// ===== 数据处理类型 =====

/**
 * 数据转换选项
 */
export interface DataTransformOptions {
  enableIntelligentRepair: boolean;
  validateOutput: boolean;
  includeMetadata: boolean;
  repairConfig?: {
    fixDuration: boolean;
    fixReleaseDate: boolean;
    fixLanguage: boolean;
    fixCountry: boolean;
  };
}

/**
 * 字段映射配置
 */
export interface FieldMapping {
  doubanField: string;
  feishuFieldName: string;
  feishuFieldId?: string;
  fieldType: number;
  isRequired: boolean;
  defaultValue?: unknown;
  transformer?: string; // 转换器函数名
}

/**
 * 表格配置
 */
export interface TableConfig {
  tableId: string;
  tableName: string;
  category: 'books' | 'movies' | 'tv' | 'documentary';
  fieldMappings: FieldMapping[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 缓存和性能类型 =====

/**
 * 缓存条目
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  lastAccessed: Date;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  requestCount: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: Date;
}

// ===== WebSocket事件类型 =====

/**
 * WebSocket事件类型枚举
 */
export const WebSocketEventType = {
  SYNC_STARTED: 'sync_started',
  SYNC_PROGRESS: 'sync_progress',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  SYNC_CANCELLED: 'sync_cancelled',
} as const;

export type WebSocketEventTypeEnum = typeof WebSocketEventType[keyof typeof WebSocketEventType];

/**
 * WebSocket事件载荷
 */
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventTypeEnum;
  userId: string;
  taskId: string;
  payload: T;
  timestamp: Date;
}

// ===== 类型守卫工具 =====

/**
 * 检查是否为有效用户
 */
export function isValidUser(user: unknown): user is User {
  return (
    user !== null &&
    typeof user === 'object' &&
    'id' in user &&
    'email' in user &&
    typeof (user as User).id === 'string' &&
    typeof (user as User).email === 'string'
  );
}

/**
 * 检查是否为有效同步配置
 */
export function isValidSyncConfig(config: unknown): config is SyncConfig {
  return (
    config !== null &&
    typeof config === 'object' &&
    'userId' in config &&
    'doubanCookie' in config &&
    'feishuAppId' in config &&
    typeof (config as SyncConfig).userId === 'string' &&
    typeof (config as SyncConfig).doubanCookie === 'string'
  );
}

/**
 * 检查同步状态是否为最终状态
 */
export function isFinalSyncStatus(status: SyncStatusType): boolean {
  return [SyncStatus.SUCCESS, SyncStatus.FAILED, SyncStatus.CANCELLED].includes(status as any);
}