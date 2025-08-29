import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { PrismaService } from '@/common/prisma/prisma.service';
import { SyncGateway } from './sync.gateway';
import { TriggerSyncDto } from './dto/sync.dto';
import { SyncJobData, SyncProgress } from './interfaces/sync.interface';

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
  ) {}

  /**
   * 触发同步任务
   */
  async triggerSync(userId: string, triggerSyncDto: TriggerSyncDto): Promise<string> {
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
          metadata: {
            options: triggerSyncDto.options || {},
            requestedAt: new Date().toISOString(),
          },
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
      this.logger.error(`Failed to trigger sync for user ${userId}:`, error);
      throw error;
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
      const targetJob = jobs.find(job => job.data.syncId === syncId);
      
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
      this.logger.error(`Failed to cancel sync ${syncId}:`, error);
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
      this.logger.error(`Failed to update sync progress:`, error);
    }
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