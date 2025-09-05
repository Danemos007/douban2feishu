import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { createHash } from 'crypto';

import { FeishuTableService } from './feishu-table.service';
import { FieldMappingService } from './field-mapping.service';
import { FeishuRecordItem } from '../interfaces/feishu.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * 数据同步引擎 - Subject ID增量同步核心服务
 *
 * 核心功能:
 * - Subject ID作为唯一键的同步逻辑
 * - 增量同步算法（字段变更检测）
 * - 批量操作性能优化
 * - 冲突检测和解决策略
 * - 同步状态跟踪和恢复
 * - 数据一致性保证
 */
@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  // 缓存配置
  private readonly cacheConfig = {
    syncStateTtl: 3600, // 同步状态缓存1小时
    syncStateKeyPrefix: 'feishu:sync_state:',
    recordHashKeyPrefix: 'feishu:record_hash:',
  };

  // 同步配置
  private readonly syncConfig = {
    batchSize: 100, // 单批次处理记录数
    concurrentBatches: 2, // 并发批次数
    conflictStrategy: 'douban_wins' as 'douban_wins' | 'feishu_wins' | 'merge',
    retryAttempts: 3,
    hashAlgorithm: 'sha256',
  };

  constructor(
    private readonly tableService: FeishuTableService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 执行增量同步 - 主入口方法
   */
  async performIncrementalSync(
    userId: string,
    syncConfig: {
      appId: string;
      appSecret: string;
      appToken: string;
      tableId: string;
      dataType: 'books' | 'movies' | 'tv';
      subjectIdField: string; // ~~飞书表格中Subject ID字段的Field ID~~ **Subject ID字段名**
    },
    doubanData: any[],
    options: {
      fullSync?: boolean; // 是否强制全量同步
      onProgress?: (progress: SyncProgress) => void;
      conflictStrategy?: 'douban_wins' | 'feishu_wins' | 'merge';
    } = {},
  ): Promise<SyncResult> {
    try {
      this.logger.log(
        `Starting ${options.fullSync ? 'full' : 'incremental'} sync for ${doubanData.length} records`,
      );

      // 获取或自动配置字段映射
      let fieldMappings = await this.fieldMappingService.getFieldMappings(
        userId,
        syncConfig.appToken,
        syncConfig.tableId,
      );

      // 如果没有字段映射，自动配置
      if (!fieldMappings) {
        this.logger.log('No field mappings found, auto-configuring...');

        options.onProgress?.({
          phase: 'create',
          processed: 0,
          total: 1,
          message: 'Auto-configuring field mappings...',
        });

        const autoConfigResult =
          await this.fieldMappingService.autoConfigureFieldMappings(
            userId,
            syncConfig.appId,
            syncConfig.appSecret,
            syncConfig.appToken,
            syncConfig.tableId,
            syncConfig.dataType,
          );

        fieldMappings = autoConfigResult.mappings;

        this.logger.log(
          `Auto-configuration completed: ${autoConfigResult.matched.length} matched, ${autoConfigResult.created.length} created, ${autoConfigResult.errors.length} errors`,
        );
      }

      // 验证Subject ID映射
      if (!fieldMappings.subjectId) {
        throw new Error(
          'Subject ID field mapping is required for incremental sync. Auto-configuration failed to create this field.',
        );
      }

      // 初始化同步状态
      const syncState = await this.initializeSyncState(
        userId,
        syncConfig.tableId,
      );

      // 获取现有记录状态
      const existingRecords = await this.getExistingRecordsIndex(
        syncConfig.appId,
        syncConfig.appSecret,
        syncConfig.appToken,
        syncConfig.tableId,
        fieldMappings.subjectId,
      );

      // 分析变更
      const changeAnalysis = await this.analyzeChanges(
        doubanData,
        existingRecords,
        fieldMappings,
        options.fullSync || false,
      );

      // 执行同步操作
      const syncResult = await this.executeSyncOperations(
        syncConfig,
        fieldMappings,
        changeAnalysis,
        options,
      );

      // 更新同步状态
      await this.updateSyncState(userId, syncConfig.tableId, syncResult);

      this.logger.log(`Sync completed: ${JSON.stringify(syncResult.summary)}`);
      return syncResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Incremental sync failed:', errorMessage);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 分析数据变更
   */
  private async analyzeChanges(
    doubanData: any[],
    existingRecords: Map<string, FeishuRecordItem>,
    fieldMappings: Record<string, string>,
    fullSync: boolean,
  ): Promise<ChangeAnalysis> {
    const changes: ChangeAnalysis = {
      toCreate: [],
      toUpdate: [],
      toDelete: [], // 可选：删除在豆瓣中不存在但在飞书中存在的记录
      unchanged: [],
    };

    // 创建豆瓣数据索引
    const doubanRecordMap = new Map<string, any>();
    doubanData.forEach((record) => {
      if (record.subjectId) {
        doubanRecordMap.set(record.subjectId, record);
      }
    });

    // 分析每条豆瓣记录
    for (const doubanRecord of doubanData) {
      const subjectId = doubanRecord.subjectId;
      if (!subjectId) {
        this.logger.warn('Skipping record without subject ID:', doubanRecord);
        continue;
      }

      const existingRecord = existingRecords.get(subjectId);

      if (!existingRecord) {
        // 新记录 - 需要创建
        changes.toCreate.push({
          subjectId,
          doubanData: doubanRecord,
          action: 'create',
        });
        continue;
      }

      // 现有记录 - 检查是否需要更新
      if (
        fullSync ||
        (await this.hasRecordChanged(
          doubanRecord,
          existingRecord,
          fieldMappings,
        ))
      ) {
        changes.toUpdate.push({
          subjectId,
          recordId: existingRecord.record_id,
          doubanData: doubanRecord,
          existingData: existingRecord,
          action: 'update',
        });
      } else {
        changes.unchanged.push({
          subjectId,
          recordId: existingRecord.record_id,
          action: 'unchanged',
        });
      }
    }

    // 检测在飞书中存在但豆瓣中不存在的记录（可选删除）
    for (const [subjectId, existingRecord] of existingRecords) {
      if (!doubanRecordMap.has(subjectId)) {
        changes.toDelete.push({
          subjectId,
          recordId: existingRecord.record_id,
          existingData: existingRecord,
          action: 'delete',
        });
      }
    }

    this.logger.log(
      `Change analysis: Create=${changes.toCreate.length}, Update=${changes.toUpdate.length}, Delete=${changes.toDelete.length}, Unchanged=${changes.unchanged.length}`,
    );

    return changes;
  }

  /**
   * 检查记录是否发生变更
   */
  private async hasRecordChanged(
    doubanRecord: any,
    feishuRecord: FeishuRecordItem,
    fieldMappings: Record<string, string>,
  ): Promise<boolean> {
    try {
      // 生成豆瓣记录的哈希值
      const doubanHash = this.generateRecordHash(doubanRecord, fieldMappings);

      // 生成飞书记录的哈希值
      const feishuHash = this.generateFeishuRecordHash(
        feishuRecord,
        fieldMappings,
      );

      // 比较哈希值
      return doubanHash !== feishuHash;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to check record changes for ${doubanRecord.subjectId}:`,
        errorMessage,
      );
      // 出现错误时默认认为记录已变更，进行更新
      return true;
    }
  }

  /**
   * 生成豆瓣记录哈希值
   */
  private generateRecordHash(
    record: any,
    fieldMappings: Record<string, string>,
  ): string {
    // 只对映射的字段生成哈希，确保一致性
    const mappedFields = Object.keys(fieldMappings)
      .filter((key) => !key.startsWith('_')) // 排除元数据
      .sort() // 确保字段顺序一致
      .map((key) => `${key}:${this.normalizeValue(record[key])}`)
      .join('|');

    return createHash(this.syncConfig.hashAlgorithm)
      .update(mappedFields, 'utf8')
      .digest('hex');
  }

  /**
   * 生成飞书记录哈希值
   */
  private generateFeishuRecordHash(
    feishuRecord: FeishuRecordItem,
    fieldMappings: Record<string, string>,
  ): string {
    // ~~反向映射：从Field ID到字段名~~ **字段映射处理**
    const reverseMapping: Record<string, string> = {};
    Object.entries(fieldMappings).forEach(([key, fieldId]) => {
      if (!key.startsWith('_')) {
        reverseMapping[fieldId] = key;
      }
    });

    // 提取对应字段值并生成哈希
    const mappedFields = Object.keys(fieldMappings)
      .filter((key) => !key.startsWith('_'))
      .sort()
      .map((key) => {
        const fieldId = fieldMappings[key];
        const value = feishuRecord.fields[fieldId];
        return `${key}:${this.normalizeValue(value)}`;
      })
      .join('|');

    return createHash(this.syncConfig.hashAlgorithm)
      .update(mappedFields, 'utf8')
      .digest('hex');
  }

  /**
   * 规范化字段值用于哈希计算
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.normalizeValue(item))
        .sort()
        .join(',');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 执行同步操作
   */
  private async executeSyncOperations(
    syncConfig: any,
    fieldMappings: Record<string, string>,
    changes: ChangeAnalysis,
    options: any,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      summary: {
        total:
          changes.toCreate.length +
          changes.toUpdate.length +
          changes.toDelete.length,
        created: 0,
        updated: 0,
        deleted: 0,
        failed: 0,
        unchanged: changes.unchanged.length,
      },
      details: {
        createdRecords: [],
        updatedRecords: [],
        deletedRecords: [],
        failedRecords: [],
      },
      performance: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
      },
    };

    try {
      // 1. 批量创建新记录
      if (changes.toCreate.length > 0) {
        this.logger.log(`Creating ${changes.toCreate.length} new records`);
        const createResult = await this.batchCreateRecords(
          syncConfig,
          fieldMappings,
          changes.toCreate,
          options,
        );
        result.summary.created = createResult.success;
        result.summary.failed += createResult.failed;
        result.details.createdRecords = createResult.details;

        options.onProgress?.({
          phase: 'create',
          processed: createResult.success + createResult.failed,
          total: changes.toCreate.length,
        });
      }

      // 2. 批量更新现有记录
      if (changes.toUpdate.length > 0) {
        this.logger.log(`Updating ${changes.toUpdate.length} existing records`);
        const updateResult = await this.batchUpdateRecords(
          syncConfig,
          fieldMappings,
          changes.toUpdate,
          options,
        );
        result.summary.updated = updateResult.success;
        result.summary.failed += updateResult.failed;
        result.details.updatedRecords = updateResult.details;

        options.onProgress?.({
          phase: 'update',
          processed: updateResult.success + updateResult.failed,
          total: changes.toUpdate.length,
        });
      }

      // 3. 删除不存在的记录（可选）
      if (options.deleteOrphans && changes.toDelete.length > 0) {
        this.logger.log(`Deleting ${changes.toDelete.length} orphaned records`);
        const deleteResult = await this.batchDeleteRecords(
          syncConfig,
          changes.toDelete,
          options,
        );
        result.summary.deleted = deleteResult.success;
        result.summary.failed += deleteResult.failed;
        result.details.deletedRecords = deleteResult.details;

        options.onProgress?.({
          phase: 'delete',
          processed: deleteResult.success + deleteResult.failed,
          total: changes.toDelete.length,
        });
      }

      // 完成时间计算
      result.performance.endTime = new Date();
      result.performance.duration =
        result.performance.endTime.getTime() -
        result.performance.startTime.getTime();

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Sync operations failed:', errorMessage);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 批量创建记录
   */
  private async batchCreateRecords(
    syncConfig: any,
    fieldMappings: Record<string, string>,
    createItems: ChangeItem[],
    options: any,
  ): Promise<BatchOperationResult> {
    const records = createItems.map((item) =>
      this.transformRecordForFeishu(item.doubanData, fieldMappings),
    );

    const result = await this.tableService.batchCreateRecords(
      syncConfig.appId,
      syncConfig.appSecret,
      syncConfig.appToken,
      syncConfig.tableId,
      records,
      fieldMappings,
      {
        skipDuplicates: true,
        validateFields: false, // 已经验证过
      },
    );

    return {
      success: result.success,
      failed: result.failed,
      details: createItems.map((item, index) => ({
        subjectId: item.subjectId,
        action: 'create',
        success: index < result.success,
        error: index >= result.success ? result.errors[0]?.error : undefined,
      })),
    };
  }

  /**
   * 批量更新记录
   */
  private async batchUpdateRecords(
    syncConfig: any,
    fieldMappings: Record<string, string>,
    updateItems: ChangeItem[],
    options: any,
  ): Promise<BatchOperationResult> {
    const updates = updateItems.map((item) => ({
      recordId: item.recordId!,
      fields: this.transformRecordForFeishu(item.doubanData, fieldMappings)
        .fields,
    }));

    const result = await this.tableService.batchUpdateRecords(
      syncConfig.appId,
      syncConfig.appSecret,
      syncConfig.appToken,
      syncConfig.tableId,
      updates,
    );

    return {
      success: result.success,
      failed: result.failed,
      details: updateItems.map((item, index) => ({
        subjectId: item.subjectId,
        recordId: item.recordId,
        action: 'update',
        success: index < result.success,
        error: index >= result.success ? result.errors[0]?.error : undefined,
      })),
    };
  }

  /**
   * 批量删除记录
   */
  private async batchDeleteRecords(
    syncConfig: any,
    deleteItems: ChangeItem[],
    options: any,
  ): Promise<BatchOperationResult> {
    let success = 0;
    let failed = 0;
    const details: Array<{
      subjectId: string;
      recordId: string | undefined;
      action: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const item of deleteItems) {
      try {
        await this.tableService.deleteRecord(
          syncConfig.appId,
          syncConfig.appSecret,
          syncConfig.appToken,
          syncConfig.tableId,
          item.recordId!,
        );
        success++;
        details.push({
          subjectId: item.subjectId,
          recordId: item.recordId,
          action: 'delete',
          success: true,
        });
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        details.push({
          subjectId: item.subjectId,
          recordId: item.recordId,
          action: 'delete',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // 删除操作间的延迟
      await this.delay(500);
    }

    return { success, failed, details };
  }

  /**
   * 获取现有记录索引
   */
  private async getExistingRecordsIndex(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    subjectIdFieldId: string,
  ): Promise<Map<string, FeishuRecordItem>> {
    const recordsMap = new Map<string, FeishuRecordItem>();
    let pageToken: string | undefined;
    let totalFetched = 0;

    do {
      try {
        const response = await this.tableService.searchRecords(
          appId,
          appSecret,
          appToken,
          tableId,
          {
            pageSize: 500, // 最大页面大小
            pageToken,
          },
        );

        for (const record of response.records) {
          const subjectId = record.fields[subjectIdFieldId];
          if (subjectId) {
            recordsMap.set(String(subjectId), record);
            totalFetched++;
          }
        }

        pageToken = response.hasMore ? response.pageToken : undefined;

        // 分页间延迟，避免API限流
        if (pageToken) {
          await this.delay(1000);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to fetch existing records:', errorMessage);
        break;
      }
    } while (pageToken);

    this.logger.log(
      `Fetched ${totalFetched} existing records from Feishu table`,
    );
    return recordsMap;
  }

  /**
   * 转换记录格式用于飞书
   */
  private transformRecordForFeishu(
    record: any,
    fieldMappings: Record<string, string>,
  ): any {
    const fields: Record<string, any> = {};

    Object.entries(fieldMappings).forEach(([doubanField, feishuFieldId]) => {
      if (!doubanField.startsWith('_') && record[doubanField] !== undefined) {
        fields[feishuFieldId] = this.formatValueForFeishu(record[doubanField]);
      }
    });

    return { fields };
  }

  /**
   * 格式化值用于飞书
   */
  private formatValueForFeishu(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value;
    if (value instanceof Date) return Math.floor(value.getTime() / 1000);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * 初始化同步状态
   */
  private async initializeSyncState(
    userId: string,
    tableId: string,
  ): Promise<any> {
    const stateKey = `${this.cacheConfig.syncStateKeyPrefix}${userId}:${tableId}`;

    const syncState = {
      userId,
      tableId,
      startTime: new Date().toISOString(),
      phase: 'initializing',
      processed: 0,
      total: 0,
    };

    await this.redis.setex(
      stateKey,
      this.cacheConfig.syncStateTtl,
      JSON.stringify(syncState),
    );
    return syncState;
  }

  /**
   * 更新同步状态
   */
  private async updateSyncState(
    userId: string,
    tableId: string,
    syncResult: SyncResult,
  ): Promise<void> {
    const stateKey = `${this.cacheConfig.syncStateKeyPrefix}${userId}:${tableId}`;

    const syncState = {
      userId,
      tableId,
      completedAt: syncResult.performance.endTime.toISOString(),
      duration: syncResult.performance.duration,
      summary: syncResult.summary,
    };

    await this.redis.setex(
      stateKey,
      this.cacheConfig.syncStateTtl,
      JSON.stringify(syncState),
    );
  }

  /**
   * 获取同步状态
   */
  async getSyncState(userId: string, tableId: string): Promise<any> {
    try {
      const stateKey = `${this.cacheConfig.syncStateKeyPrefix}${userId}:${tableId}`;
      const state = await this.redis.get(stateKey);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get sync state:', errorMessage);
      return null;
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============= 类型定义 =============

interface ChangeAnalysis {
  toCreate: ChangeItem[];
  toUpdate: ChangeItem[];
  toDelete: ChangeItem[];
  unchanged: ChangeItem[];
}

interface ChangeItem {
  subjectId: string;
  recordId?: string;
  doubanData?: any;
  existingData?: FeishuRecordItem;
  action: 'create' | 'update' | 'delete' | 'unchanged';
}

export interface SyncResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    deleted: number;
    failed: number;
    unchanged: number;
  };
  details: {
    createdRecords: any[];
    updatedRecords: any[];
    deletedRecords: any[];
    failedRecords: any[];
  };
  performance: {
    startTime: Date;
    endTime: Date;
    duration: number;
  };
}

interface BatchOperationResult {
  success: number;
  failed: number;
  details: Array<{
    subjectId: string;
    recordId?: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

interface SyncProgress {
  phase: 'create' | 'update' | 'delete';
  processed: number;
  total: number;
  message?: string;
}
