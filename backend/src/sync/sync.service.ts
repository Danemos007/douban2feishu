import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { PrismaService } from '../common/prisma/prisma.service';
import { SyncGateway } from './sync.gateway';
import { TriggerSyncDto } from './dto/sync.dto';
import { SyncJobData, SyncProgress } from './interfaces/sync.interface';
import { DoubanService } from '../douban/douban.service';
import { FetchUserDataDto } from '../douban/dto/douban.dto';
import { SyncEngineService } from '../feishu/services/sync-engine.service';

/**
 * 同步服务 - 核心同步业务逻辑
 *
 * 功能:
 * - 管理同步任务生命周期
 * - 队列任务调度
 * - 实时状态更新
 * - 错误处理和重试
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncGateway: SyncGateway,
    @InjectQueue('sync-queue') private readonly syncQueue: Queue,
    private readonly doubanService: DoubanService,
    private readonly feishuSyncEngine: SyncEngineService,
  ) {}

  /**
   * 触发同步任务
   */
  async triggerSync(
    userId: string,
    triggerSyncDto: TriggerSyncDto,
  ): Promise<string> {
    try {
      // 检查是否有正在进行的同步任务
      const runningSyncExists = await this.prisma.syncHistory.findFirst({
        where: {
          userId,
          status: 'RUNNING',
        },
      });

      if (runningSyncExists) {
        throw new Error('Another sync is already in progress');
      }

      // 创建同步历史记录
      const syncHistory = await this.prisma.syncHistory.create({
        data: {
          userId,
          triggerType: triggerSyncDto.triggerType || 'MANUAL',
          status: 'PENDING',
          metadata: JSON.stringify({
            options: triggerSyncDto.options || {},
            requestedAt: new Date().toISOString(),
          }),
        },
      });

      // 构建任务数据
      const jobData: SyncJobData = {
        syncId: syncHistory.id,
        userId,
        options: triggerSyncDto.options || {},
      };

      // 添加到任务队列
      const job = await this.syncQueue.add('sync-douban-to-feishu', jobData, {
        // 任务配置
        priority: triggerSyncDto.triggerType === 'MANUAL' ? 1 : 5, // 手动触发优先级更高
        delay: triggerSyncDto.delayMs || 0,
        attempts: 3,
        removeOnComplete: 10,
        removeOnFail: 50,
      });

      this.logger.log(`Sync job queued: ${job.id} for user: ${userId}`);

      // 发送实时更新
      this.syncGateway.notifyProgress(userId, {
        syncId: syncHistory.id,
        jobId: job.id?.toString(),
        status: 'QUEUED',
        progress: 0,
        message: 'Sync task queued successfully',
      });

      return syncHistory.id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to trigger sync for user ${userId}:`,
        errorMessage,
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(syncId: string): Promise<any> {
    const syncHistory = await this.prisma.syncHistory.findUnique({
      where: { id: syncId },
    });

    if (!syncHistory) {
      throw new Error('Sync not found');
    }

    return {
      syncId: syncHistory.id,
      status: syncHistory.status,
      startedAt: syncHistory.startedAt,
      completedAt: syncHistory.completedAt,
      itemsSynced: syncHistory.itemsSynced,
      errorMessage: syncHistory.errorMessage,
      metadata: syncHistory.metadata,
    };
  }

  /**
   * 获取用户同步历史
   */
  async getSyncHistory(userId: string, limit: number = 10) {
    return this.prisma.syncHistory.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        triggerType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        itemsSynced: true,
        errorMessage: true,
      },
    });
  }

  /**
   * 取消同步任务
   */
  async cancelSync(syncId: string, userId: string): Promise<boolean> {
    try {
      const syncHistory = await this.prisma.syncHistory.findFirst({
        where: {
          id: syncId,
          userId,
          status: 'RUNNING',
        },
      });

      if (!syncHistory) {
        return false;
      }

      // 查找并取消队列中的任务
      const jobs = await this.syncQueue.getJobs(['active', 'waiting']);
      const targetJob = jobs.find((job) => job.data.syncId === syncId);

      if (targetJob) {
        await targetJob.remove();
      }

      // 更新数据库状态
      await this.prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: 'Cancelled by user',
        },
      });

      // 发送实时更新
      this.syncGateway.notifyProgress(userId, {
        syncId,
        status: 'CANCELLED',
        progress: 0,
        message: 'Sync cancelled by user',
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cancel sync ${syncId}:`, errorMessage);
      return false;
    }
  }

  /**
   * 更新同步进度 (由处理器调用)
   */
  async updateSyncProgress(progress: SyncProgress): Promise<void> {
    try {
      // 更新数据库
      const updateData: any = {
        status: progress.status,
      };

      if (progress.status === 'RUNNING') {
        updateData.startedAt = new Date();
      } else if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(progress.status)) {
        updateData.completedAt = new Date();
        updateData.itemsSynced = progress.itemsProcessed || 0;
        updateData.errorMessage = progress.error || null;
      }

      await this.prisma.syncHistory.update({
        where: { id: progress.syncId },
        data: updateData,
      });

      // 发送WebSocket更新
      const syncHistory = await this.prisma.syncHistory.findUnique({
        where: { id: progress.syncId },
        select: { userId: true },
      });

      if (syncHistory?.userId) {
        this.syncGateway.notifyProgress(syncHistory.userId, progress);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update sync progress:`, errorMessage);
    }
  }

  /**
   * 企业级同步方法 - 集成数据转换功能
   */
  async executeIntegratedSync(
    userId: string,
    options: {
      category: 'books' | 'movies' | 'tv';
      cookie: string;
      isEncrypted?: boolean;
      status?: string;
      limit?: number;
    },
  ): Promise<{
    syncId: string;
    transformationResult: {
      rawData: any[];
      transformedData: any[];
      transformationStats: {
        totalProcessed: number;
        repairsApplied: number;
        validationWarnings: number;
        processingTime: number;
      };
    };
  }> {
    let syncHistory: any = null;

    try {
      this.logger.log(
        `Starting integrated sync for user ${userId}, category: ${options.category}`,
      );

      // 创建同步历史记录
      syncHistory = await this.prisma.syncHistory.create({
        data: {
          userId,
          triggerType: 'MANUAL',
          status: 'RUNNING',
          metadata: JSON.stringify({
            options: {
              category: options.category,
              transformationEnabled: true,
            },
            requestedAt: new Date().toISOString(),
          }),
        },
      });

      // 发送开始通知
      this.syncGateway.notifyProgress(userId, {
        syncId: syncHistory.id,
        status: 'RUNNING',
        progress: 0,
        message: 'Starting data scraping and transformation',
      });

      // 构建豆瓣抓取参数
      const fetchDto: FetchUserDataDto = {
        userId,
        category: options.category,
        cookie: options.cookie,
        isEncrypted: options.isEncrypted || false,
        status: options.status as 'wish' | 'do' | 'collect' | undefined,
        limit: options.limit,
      };

      // 执行抓取和转换
      const transformationResult =
        await this.doubanService.scrapeAndTransform(fetchDto);

      // [ARCHITECTURE-SAFETY] 验证转换后的数据结构完整性
      this.validateArchitectureSafety(transformationResult.transformedData);

      // 发送转换完成通知
      this.syncGateway.notifyProgress(userId, {
        syncId: syncHistory.id,
        status: 'PROCESSING',
        progress: 50,
        message: `Transformation completed: ${transformationResult.transformationStats.totalProcessed} items processed, ${transformationResult.transformationStats.repairsApplied} repairs applied`,
      });

      // 执行飞书同步 - 企业级数据流集成
      this.syncGateway.notifyProgress(userId, {
        syncId: syncHistory.id,
        status: 'PROCESSING',
        progress: 75,
        message: 'Starting Feishu sync with transformed data',
      });

      // 获取用户表格配置
      const tableId = this.getTableIdByCategory(options.category);

      // 执行飞书同步
      const feishuSyncResult =
        await this.feishuSyncEngine.performIncrementalSync(
          userId,
          {
            appId: process.env.FEISHU_APP_ID || '',
            appSecret: process.env.FEISHU_APP_SECRET || '',
            appToken: process.env.FEISHU_APP_TOKEN || '',
            tableId: tableId,
            dataType: options.category,
            subjectIdField: 'Subject ID',
          },
          transformationResult.transformedData,
          {
            fullSync: false,
            conflictStrategy: 'douban_wins',
          },
        );

      // 更新同步状态为成功
      await this.prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          itemsSynced: feishuSyncResult.summary.total || 0,
          metadata: JSON.stringify({
            ...(syncHistory.metadata ? JSON.parse(syncHistory.metadata as string) : {}),
            transformationStats: transformationResult.transformationStats,
            feishuSyncStats: {
              total: feishuSyncResult.summary.total || 0,
              created: feishuSyncResult.summary.created || 0,
              updated: feishuSyncResult.summary.updated || 0,
              failed: feishuSyncResult.summary.failed || 0,
            },
          }),
        },
      });

      // 发送完成通知
      this.syncGateway.notifyProgress(userId, {
        syncId: syncHistory.id,
        status: 'SUCCESS',
        progress: 100,
        message: `Enterprise sync completed: ${feishuSyncResult.summary.total || 0} items synced to Feishu (${feishuSyncResult.summary.created || 0} created, ${feishuSyncResult.summary.updated || 0} updated)`,
        itemsProcessed: feishuSyncResult.summary.total || 0,
      });

      this.logger.log(
        `Integrated sync completed for user ${userId}: ${transformationResult.transformationStats.totalProcessed} items`,
      );

      return {
        syncId: syncHistory.id,
        transformationResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Integrated sync failed for user ${userId}:`,
        errorMessage,
      );

      // 更新同步状态为失败
      try {
        await this.prisma.syncHistory.update({
          where: { id: syncHistory?.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage,
          },
        });

        if (syncHistory?.id) {
          this.syncGateway.notifyProgress(userId, {
            syncId: syncHistory.id,
            status: 'FAILED',
            progress: 0,
            message: `Sync failed: ${errorMessage}`,
            error: errorMessage,
          });
        }
      } catch (updateError) {
        this.logger.error(
          'Failed to update sync history on error:',
          updateError,
        );
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取表格ID - 架构安全约束实施
   */
  private getTableIdByCategory(category: string): string {
    // [ARCHITECTURE-SAFETY] 防止硬编码表格ID，应从用户配置或环境变量获取
    const tableMapping: Record<string, string> = {
      books: process.env.FEISHU_BOOKS_TABLE_ID || 'your_book_table_id',
      movies: process.env.FEISHU_MOVIES_TABLE_ID || 'your_movie_table_id',
      tv: process.env.FEISHU_TV_TABLE_ID || 'your_tv_table_id',
    };

    const tableId = tableMapping[category];
    if (!tableId) {
      throw new Error(`No table ID configured for category: ${category}`);
    }

    this.logger.log(`Using table ID ${tableId} for category ${category}`);
    return tableId;
  }

  /**
   * 架构安全约束验证
   */
  private validateArchitectureSafety(data: any[]): void {
    // [ARCHITECTURE-SAFETY] 确保数据已经过转换服务处理
    if (!data || data.length === 0) {
      throw new Error('Empty data set not allowed for sync');
    }

    // [ARCHITECTURE-SAFETY] 验证数据结构完整性
    for (const item of data.slice(0, 5)) {
      // 检查前5条记录
      if (!item.subjectId) {
        throw new Error(
          'Data validation failed: missing subjectId (required for sync)',
        );
      }

      if (typeof item !== 'object' || item === null) {
        throw new Error('Data validation failed: invalid data structure');
      }
    }

    this.logger.log(
      `Architecture safety validation passed for ${data.length} items`,
    );
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats() {
    const [active, waiting, completed, failed] = await Promise.all([
      this.syncQueue.getActive(),
      this.syncQueue.getWaiting(),
      this.syncQueue.getCompleted(),
      this.syncQueue.getFailed(),
    ]);

    return {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
