import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { 
  PrismaClient, 
  User,
  UserCredentials, 
  SyncHistory,
  SyncConfig 
} from '../../../generated/prisma';
import { 
  isUser,
  isUserCredentials, 
  isSyncHistory,
  assertIsUser,
  assertIsUserCredentials,
  assertIsSyncHistory
} from '../type-guards';

/**
 * 数据库事务函数类型
 */
type TransactionFunction<T> = (
  prisma: Omit<PrismaClient, "$on" | "$connect" | "$disconnect" | "$transaction" | "$extends">
) => Promise<T>;

/**
 * 清理操作结果接口
 */
interface CleanupResult {
  deletedCount: number;
  operation: string;
  timestamp: Date;
}

/**
 * 数据库健康检查结果
 */
interface HealthCheckResult {
  isHealthy: boolean;
  timestamp: Date;
  responseTime: number;
  error?: string;
}

/**
 * Prisma日志事件接口
 */
interface PrismaLogEvent {
  timestamp: Date;
  query?: string;
  params?: string;
  duration?: number;
  target?: string;
  message?: string;
}

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
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
  private setupLogging(): void {
    try {
      // 查询日志 (开发环境)
      if (typeof this.$on === 'function') {
        (this as any).$on('query', (e: any) => {
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Query: ${e.query || 'N/A'}`);
            this.logger.debug(`Params: ${e.params || 'N/A'}`);
            this.logger.debug(`Duration: ${e.duration || 0}ms`);
          }
        });

        // 错误日志
        (this as any).$on('error', (e: any) => {
          this.logger.error('Database error:', e.message || e.toString());
        });

        // 信息日志  
        (this as any).$on('info', (e: any) => {
          this.logger.log(`Database info: ${e.message || 'No message'}`);
        });

        // 警告日志
        (this as any).$on('warn', (e: any) => {
          this.logger.warn(`Database warning: ${e.message || 'No message'}`);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to setup database logging', error);
    }
  }

  /**
   * 健康检查 - 验证数据库连接
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: true,
        timestamp,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Database health check failed', errorMessage);
      
      return {
        isHealthy: false,
        timestamp,
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 执行事务
   *
   * @param fn 事务函数
   * @returns 事务结果
   */
  async executeTransaction<T>(
    fn: TransactionFunction<T>,
  ): Promise<T> {
    try {
      const result = await this.$transaction(fn);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      this.logger.error('Transaction execution failed', errorMessage);
      throw error;
    }
  }

  /**
   * 清理过期数据 (定期维护)
   */
  async cleanupExpiredData(): Promise<CleanupResult> {
    try {
      // 清理30天前的同步历史记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleteResult = await this.syncHistory.deleteMany({
        where: {
          startedAt: {
            lt: thirtyDaysAgo,
          },
          status: {
            in: ['SUCCESS', 'FAILED', 'CANCELLED'],
          },
        },
      });

      const result: CleanupResult = {
        deletedCount: deleteResult.count,
        operation: 'cleanup_expired_sync_history',
        timestamp: new Date(),
      };

      this.logger.log(
        `Cleaned up ${result.deletedCount} expired sync history records`,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      this.logger.error('Failed to cleanup expired data', errorMessage);
      
      throw new Error(`Cleanup operation failed: ${errorMessage}`);
    }
  }

  // ==============================
  // 类型安全的数据访问方法
  // ==============================

  /**
   * 安全地查找用户（带类型验证）
   */
  async findUserSafely(id: string): Promise<User | null> {
    try {
      const user = await this.user.findUnique({
        where: { id },
      });

      if (user === null) {
        return null;
      }

      // 运行时类型验证
      assertIsUser(user);
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Find user failed';
      this.logger.error('Failed to find user safely', { userId: id, error: errorMessage });
      throw error;
    }
  }

  /**
   * 安全地查找用户凭证（带类型验证）
   */
  async findUserCredentialsSafely(userId: string): Promise<UserCredentials | null> {
    try {
      const credentials = await this.userCredentials.findUnique({
        where: { userId },
      });

      if (credentials === null) {
        return null;
      }

      // 运行时类型验证
      assertIsUserCredentials(credentials);
      return credentials;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Find credentials failed';
      this.logger.error('Failed to find user credentials safely', { userId, error: errorMessage });
      throw error;
    }
  }

  /**
   * 安全地查找同步历史（带类型验证）
   */
  async findSyncHistorySafely(id: string): Promise<SyncHistory | null> {
    try {
      const history = await this.syncHistory.findUnique({
        where: { id },
      });

      if (history === null) {
        return null;
      }

      // 运行时类型验证
      assertIsSyncHistory(history);
      return history;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Find sync history failed';
      this.logger.error('Failed to find sync history safely', { historyId: id, error: errorMessage });
      throw error;
    }
  }

  /**
   * 安全地获取用户的所有同步历史（带类型验证）
   */
  async findUserSyncHistorySafely(
    userId: string,
    take?: number,
    skip?: number,
  ): Promise<SyncHistory[]> {
    try {
      const histories = await this.syncHistory.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take,
        skip,
      });

      // 验证每一条记录
      histories.forEach((history, index) => {
        try {
          assertIsSyncHistory(history);
        } catch (error) {
          this.logger.error('Invalid sync history record found', { 
            userId, 
            index, 
            historyId: history.id 
          });
          throw new Error(`Invalid sync history record at index ${index}`);
        }
      });

      return histories;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Find user sync history failed';
      this.logger.error('Failed to find user sync history safely', { userId, error: errorMessage });
      throw error;
    }
  }

  /**
   * 批量验证用户数据的类型安全性
   */
  async validateUserDataIntegrity(userId: string): Promise<{
    user: { isValid: boolean; error?: string };
    credentials: { isValid: boolean; error?: string };
    syncHistory: { isValid: boolean; invalidCount: number; totalCount: number };
  }> {
    const result: {
      user: { isValid: boolean; error?: string };
      credentials: { isValid: boolean; error?: string };
      syncHistory: { isValid: boolean; invalidCount: number; totalCount: number };
    } = {
      user: { isValid: true },
      credentials: { isValid: true },
      syncHistory: { isValid: true, invalidCount: 0, totalCount: 0 },
    };

    try {
      // 验证用户数据
      const user = await this.user.findUnique({ where: { id: userId } });
      if (user && !isUser(user)) {
        result.user = { isValid: false, error: 'Invalid user data structure' };
      }

      // 验证凭证数据
      const credentials = await this.userCredentials.findUnique({ where: { userId } });
      if (credentials && !isUserCredentials(credentials)) {
        result.credentials = { isValid: false, error: 'Invalid credentials data structure' };
      }

      // 验证同步历史数据
      const histories = await this.syncHistory.findMany({ where: { userId } });
      result.syncHistory.totalCount = histories.length;
      
      histories.forEach((history) => {
        if (!isSyncHistory(history)) {
          result.syncHistory.invalidCount++;
        }
      });

      if (result.syncHistory.invalidCount > 0) {
        result.syncHistory.isValid = false;
      }

      this.logger.log('User data integrity check completed', { 
        userId, 
        result: {
          userValid: result.user.isValid,
          credentialsValid: result.credentials.isValid,
          syncHistoryValid: result.syncHistory.isValid,
          invalidSyncRecords: result.syncHistory.invalidCount,
        }
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Data integrity check failed';
      this.logger.error('Failed to validate user data integrity', { userId, error: errorMessage });
      throw error;
    }
  }
}
