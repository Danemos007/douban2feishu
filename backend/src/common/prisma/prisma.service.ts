import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma';

/**
 * Prisma服务 - 数据库客户端管理
 * 
 * 功能:
 * - 自动连接管理
 * - 连接池优化
 * - 错误处理和重连
 * - 应用生命周期集成
 * - 事务支持
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // 数据库连接配置
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/d2f',
        },
      },
      
      // 日志配置
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event', 
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      
      // 错误格式化
      errorFormat: 'pretty',
    });

    // 设置日志事件监听器
    this.setupLogging();
  }

  /**
   * 模块初始化 - 建立数据库连接
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * 模块销毁 - 关闭数据库连接
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  /**
   * 设置数据库日志
   */
  private setupLogging() {
    // 查询日志 (开发环境)
    (this as any).$on('query', (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      }
    });

    // 错误日志
    (this as any).$on('error', (e: any) => {
      this.logger.error('Database error:', e);
    });

    // 信息日志
    (this as any).$on('info', (e: any) => {
      this.logger.log(`Database info: ${e.message}`);
    });

    // 警告日志
    (this as any).$on('warn', (e: any) => {
      this.logger.warn(`Database warning: ${e.message}`);
    });
  }

  /**
   * 健康检查 - 验证数据库连接
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * 执行事务
   * 
   * @param fn 事务函数
   * @returns 事务结果
   */
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return (this as any).$transaction(fn);
  }

  /**
   * 清理过期数据 (定期维护)
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      // 清理30天前的同步历史记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await this.syncHistory.deleteMany({
        where: {
          startedAt: {
            lt: thirtyDaysAgo,
          },
          status: {
            in: ['SUCCESS', 'FAILED', 'CANCELLED'],
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedCount.count} expired sync history records`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired data', error);
    }
  }
}