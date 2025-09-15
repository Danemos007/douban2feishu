/**
 * 飞书API响应接口定义
 *
 * 企业级架构：集中管理所有飞书服务的公共返回类型
 * 确保Controller方法的返回类型可以被TypeScript正确命名
 */

/**
 * 同步状态接口
 * 来源：sync-engine.service.ts
 */
export interface SyncState {
  userId: string;
  tableId: string;
  startTime: string;
  phase: string;
  processed: number;
  total: number;
}

/**
 * 字段映射统计接口
 * 来源：field-mapping.service.ts
 */
export interface MappingStats {
  totalTables: number;
  mappings: Array<{
    appToken: string;
    tableId: string;
    dataType?: string;
    strategy: string;
    version: string;
    fieldCount: number;
    lastUpdated?: string;
  }>;
}

/**
 * 表格统计结果接口
 * 来源：feishu-table.service.ts
 */
export interface TableStatsResult {
  tableId: string;
  fieldsCached: boolean;
  cacheExpiry: number | null;
}
