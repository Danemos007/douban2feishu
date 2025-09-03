import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

import { SyncService } from './sync.service';
import { DoubanService } from '../douban/douban.service';
import { FeishuService } from '../feishu/feishu.service';
import { SyncEngineService } from '../feishu/services/sync-engine.service';
import { FieldMappingService } from '../feishu/services/field-mapping.service';
import { SyncJobData } from './interfaces/sync.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';

/**
 * 同步任务处理器 - BullMQ任务执行
 * 
 * 功能:
 * - 异步执行豆瓣数据抓取
 * - 批量同步到飞书多维表格
 * - 实时进度报告
 * - 错误处理和重试
 * - 反爬虫延迟控制
 */
@Processor('sync-queue')
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly doubanService: DoubanService,
    private readonly feishuService: FeishuService,
    private readonly syncEngineService: SyncEngineService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 处理豆瓣到飞书同步任务
   */
  @Process('sync-douban-to-feishu')
  async handleSync(job: Job<SyncJobData>) {
    const { syncId, userId, options } = job.data;
    
    this.logger.log(`Starting sync job ${job.id} for user ${userId}`);

    try {
      // 更新状态为运行中
      await this.syncService.updateSyncProgress({
        syncId,
        jobId: job.id?.toString(),
        status: 'RUNNING',
        progress: 0,
        message: 'Starting synchronization...',
      });

      // 第一阶段：从豆瓣抓取数据
      await this.updateProgress(job, 5, 'Fetching user credentials...');
      const userCredentials = await this.getUserCredentials(userId);
      
      await this.updateProgress(job, 10, 'Connecting to Douban...');
      const doubanData = await this.fetchDoubanData(userId, userCredentials, options, job);

      // 第二阶段：同步到飞书
      await this.updateProgress(job, 60, 'Starting Feishu sync...');
      const syncResults = await this.syncToFeishu(userCredentials, doubanData, options, job);

      // 完成同步
      await this.syncService.updateSyncProgress({
        syncId,
        jobId: job.id?.toString(),
        status: 'SUCCESS',
        progress: 100,
        message: `Sync completed successfully. Created: ${syncResults.summary.created}, Updated: ${syncResults.summary.updated}, Failed: ${syncResults.summary.failed}`,
        itemsProcessed: syncResults.totalSynced,
      });

      this.logger.log(`Sync job ${job.id} completed successfully`, {
        summary: syncResults.summary,
        duration: syncResults.performance?.duration,
      });
      
      return {
        success: true,
        itemsProcessed: syncResults.totalSynced,
        summary: syncResults.summary,
        performance: syncResults.performance,
      };

    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed:`, error);
      
      await this.syncService.updateSyncProgress({
        syncId,
        jobId: job.id?.toString(),
        status: 'FAILED',
        progress: 0,
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 获取用户凭证
   */
  private async getUserCredentials(userId: string) {
    try {
      const credentials = await this.prisma.userCredentials.findUnique({
        where: { userId },
      });

      if (!credentials) {
        throw new Error('User credentials not found');
      }

      // 解密凭证
      const doubanCookie = credentials.doubanCookieEncrypted 
        ? await this.cryptoService.decrypt(credentials.doubanCookieEncrypted, userId)
        : null;
      
      const feishuAppSecret = credentials.feishuAppSecretEncrypted
        ? await this.cryptoService.decrypt(credentials.feishuAppSecretEncrypted, userId)
        : null;

      return {
        doubanCookie,
        feishuAppId: credentials.feishuAppId,
        feishuAppSecret,
      };
    } catch (error) {
      this.logger.error(`Failed to get user credentials for ${userId}:`, error);
      throw new Error('Failed to retrieve user credentials');
    }
  }

  /**
   * 从豆瓣抓取数据
   */
  private async fetchDoubanData(userId: string, credentials: any, options: any, job: Job) {
    const categories: ('books' | 'movies' | 'tv')[] = ['books', 'movies', 'tv'];
    const allData: any[] = [];
    let totalProgress = 10;

    for (const category of categories) {
      await this.updateProgress(job, totalProgress, `Fetching ${category} from Douban...`);
      
      try {
        const categoryData = await this.doubanService.fetchUserData({
          userId,
          cookie: credentials.doubanCookie,
          category,
          limit: options.limit || 100,
        });

        allData.push(...categoryData);
        totalProgress += 15;
        
        await this.updateProgress(
          job, 
          totalProgress, 
          `Fetched ${categoryData.length} ${category} items`
        );

        // 反爬虫延迟
        await this.delay(2000 + Math.random() * 3000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to fetch ${category}: ${errorMessage}`);
      }
    }

    return allData;
  }

  /**
   * 同步数据到飞书 - 使用增量同步引擎
   */
  private async syncToFeishu(credentials: any, data: any[], options: any, job: Job) {
    try {
      // 获取同步配置
      const syncConfig = await this.prisma.syncConfig.findUnique({
        where: { userId: job.data.userId },
      });

      if (!syncConfig?.tableMappings) {
        throw new Error('Sync configuration not found. Please configure table mappings first.');
      }

      // 假设使用第一个配置的表格（实际应该根据数据类型选择）
      const tableMappingsData = syncConfig.tableMappings as any;
      const firstTableKey = Object.keys(tableMappingsData)[0];
      
      if (!firstTableKey) {
        throw new Error('No table mappings configured');
      }

      const [appToken, tableId] = firstTableKey.split(':');
      const tableMapping = tableMappingsData[firstTableKey];
      const dataType = tableMapping._metadata?.dataType || 'books';

      await this.updateProgress(job, 65, 'Preparing incremental sync...');

      // 使用增量同步引擎
      const syncResult = await this.syncEngineService.performIncrementalSync(
        job.data.userId,
        {
          appId: credentials.feishuAppId,
          appSecret: credentials.feishuAppSecret,
          appToken,
          tableId,
          dataType,
          subjectIdField: tableMapping.subjectId || tableMapping['subjectId'], // ~~Field ID~~ **字段名**
        },
        data,
        {
          fullSync: options.fullSync || false,
          onProgress: (progress) => {
            const totalProgress = 65 + (progress.processed / progress.total) * 30;
            this.updateProgress(
              job, 
              totalProgress, 
              `${progress.phase}: ${progress.processed}/${progress.total}`
            );
          },
        }
      );

      return {
        totalSynced: syncResult.summary.created + syncResult.summary.updated,
        summary: {
          total: syncResult.summary.total,
          synced: syncResult.summary.created + syncResult.summary.updated,
          failed: syncResult.summary.failed,
          created: syncResult.summary.created,
          updated: syncResult.summary.updated,
          deleted: syncResult.summary.deleted,
          unchanged: syncResult.summary.unchanged,
        },
        performance: syncResult.performance,
      };

    } catch (error) {
      this.logger.error('Feishu sync failed:', error);
      throw error;
    }
  }

  /**
   * 更新任务进度
   */
  private async updateProgress(job: Job, progress: number, message: string) {
    job.progress(progress);
    
    await this.syncService.updateSyncProgress({
      syncId: job.data.syncId,
      jobId: job.id?.toString(),
      status: 'RUNNING',
      progress,
      message,
    });
  }

  /**
   * 创建数据批次
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}