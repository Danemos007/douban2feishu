import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  PrismaClient,
  Prisma,
  User,
  UserCredentials,
  SyncHistory,
} from '../../../generated/prisma';
import {
  isUser,
  isUserCredentials,
  isSyncHistory,
  assertIsUser,
  assertIsUserCredentials,
  assertIsSyncHistory,
} from '../type-guards';

/**
 * 数据库事务函数类型
 */
type TransactionFunction<T> = (
  prisma: Omit<
    PrismaClient,
    '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
  >,
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

      // 日志配置 - 使用明确的类型定义确保正确的事件推断
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
      ] as const,

      // 错误格式化
      errorFormat: 'pretty',
    } as const);

    // 设置日志事件监听器
    this.setupLogging();
  }

  /**
   * 模块初始化时建立数据库连接
   *
   * @description 在NestJS模块初始化阶段自动建立与PostgreSQL数据库的连接
   * @returns Promise<void> 连接成功时resolve，连接失败时reject
   * @throws Error 当数据库连接失败时抛出连接错误
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
   * 模块销毁时优雅关闭数据库连接
   *
   * @description 在NestJS模块销毁阶段优雅地关闭与数据库的连接，确保资源正确释放
   * @returns Promise<void> 断开连接后resolve，即使出现错误也会静默处理
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
        // 使用类型安全的方法调用，解决Prisma类型推断问题
        const client = this as unknown as PrismaClient<{
          log: [
            { emit: 'event'; level: 'query' },
            { emit: 'event'; level: 'error' },
            { emit: 'event'; level: 'info' },
            { emit: 'event'; level: 'warn' },
          ];
        }>;

        client.$on('query', (e: Prisma.QueryEvent) => {
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Query: ${e.query || 'N/A'}`);
            this.logger.debug(`Params: ${e.params || 'N/A'}`);
            this.logger.debug(`Duration: ${e.duration || 0}ms`);
          }
        });

        // 错误日志
        client.$on('error', (e: Prisma.LogEvent) => {
          this.logger.error('Database error:', e.message || 'Unknown error');
        });

        // 信息日志
        client.$on('info', (e: Prisma.LogEvent) => {
          this.logger.log(`Database info: ${e.message || 'No message'}`);
        });

        // 警告日志
        client.$on('warn', (e: Prisma.LogEvent) => {
          this.logger.warn(`Database warning: ${e.message || 'No message'}`);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to setup database logging', error);
    }
  }

  /**
   * 执行数据库健康检查并返回连接状态
   *
   * @description 通过执行简单的SQL查询来验证数据库连接状态，记录响应时间和错误信息
   * @returns Promise<HealthCheckResult> 包含健康状态、时间戳、响应时间和可能的错误信息的检查结果
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

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
   * 执行数据库事务并处理错误
   *
   * @description 在事务环境中执行数据库操作，提供完整的错误处理和日志记录
   * @param fn 要在事务中执行的函数，接收事务客户端作为参数
   * @returns Promise<T> 事务函数的执行结果
   * @throws Error 当事务执行失败时抛出原始错误
   */
  async executeTransaction<T>(fn: TransactionFunction<T>): Promise<T> {
    try {
      const result = await this.$transaction(fn);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Transaction failed';
      this.logger.error('Transaction execution failed', errorMessage);
      throw error;
    }
  }

  /**
   * 清理30天前的过期同步历史数据
   *
   * @description 定期维护任务，清理已完成状态且超过30天的同步历史记录以释放存储空间
   * @returns Promise<CleanupResult> 包含删除记录数量、操作类型和时间戳的清理结果
   * @throws Error 当清理操作失败时抛出包含详细错误信息的Error实例
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
      const errorMessage =
        error instanceof Error ? error.message : 'Cleanup failed';
      this.logger.error('Failed to cleanup expired data', errorMessage);

      throw new Error(`Cleanup operation failed: ${errorMessage}`);
    }
  }

  // ==============================
  // 类型安全的数据访问方法
  // ==============================

  /**
   * 安全地根据ID查找用户并进行类型验证
   *
   * @description 查找指定ID的用户，执行运行时类型验证确保数据结构正确
   * @param id 用户的唯一标识符UUID
   * @returns Promise<User | null> 找到的用户对象，不存在时返回null
   * @throws Error 当数据库查询失败或用户数据类型验证失败时抛出错误
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
      const errorMessage =
        error instanceof Error ? error.message : 'Find user failed';
      this.logger.error('Failed to find user safely', {
        userId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 安全地根据用户ID查找用户凭证并进行类型验证
   *
   * @description 查找指定用户的加密凭证信息，执行运行时类型验证确保敏感数据结构正确
   * @param userId 用户的唯一标识符UUID
   * @returns Promise<UserCredentials | null> 找到的用户凭证对象，不存在时返回null
   * @throws Error 当数据库查询失败或凭证数据类型验证失败时抛出错误
   */
  async findUserCredentialsSafely(
    userId: string,
  ): Promise<UserCredentials | null> {
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
      const errorMessage =
        error instanceof Error ? error.message : 'Find credentials failed';
      this.logger.error('Failed to find user credentials safely', {
        userId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 安全地根据ID查找同步历史记录并进行类型验证
   *
   * @description 查找指定ID的同步历史记录，执行运行时类型验证确保数据结构正确
   * @param id 同步历史记录的唯一标识符UUID
   * @returns Promise<SyncHistory | null> 找到的同步历史对象，不存在时返回null
   * @throws Error 当数据库查询失败或同步历史数据类型验证失败时抛出错误
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
      const errorMessage =
        error instanceof Error ? error.message : 'Find sync history failed';
      this.logger.error('Failed to find sync history safely', {
        historyId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 安全地获取用户的所有同步历史记录并进行类型验证
   *
   * @description 查找指定用户的同步历史列表，支持分页，按开始时间倒序排列，对每条记录执行类型验证
   * @param userId 用户的唯一标识符UUID
   * @param take 可选的分页参数，限制返回记录数量
   * @param skip 可选的分页参数，跳过指定数量的记录
   * @returns Promise<SyncHistory[]> 用户的同步历史记录数组，按时间倒序排列
   * @throws Error 当数据库查询失败或任何记录的类型验证失败时抛出错误
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
        } catch {
          this.logger.error('Invalid sync history record found', {
            userId,
            index,
            historyId: history.id,
          });
          throw new Error(`Invalid sync history record at index ${index}`);
        }
      });

      return histories;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Find user sync history failed';
      this.logger.error('Failed to find user sync history safely', {
        userId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 批量验证用户所有相关数据的类型安全性和完整性
   *
   * @description 全面检查用户、凭证和同步历史数据的类型安全性，生成详细的验证报告
   * @param userId 要验证的用户唯一标识符UUID
   * @returns Promise<DataIntegrityResult> 包含用户、凭证和同步历史验证结果的完整报告
   * @throws Error 当数据库查询失败或完整性检查过程中发生错误时抛出错误
   */
  async validateUserDataIntegrity(userId: string): Promise<{
    user: { isValid: boolean; error?: string };
    credentials: { isValid: boolean; error?: string };
    syncHistory: { isValid: boolean; invalidCount: number; totalCount: number };
  }> {
    const result: {
      user: { isValid: boolean; error?: string };
      credentials: { isValid: boolean; error?: string };
      syncHistory: {
        isValid: boolean;
        invalidCount: number;
        totalCount: number;
      };
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
      const credentials = await this.userCredentials.findUnique({
        where: { userId },
      });
      if (credentials && !isUserCredentials(credentials)) {
        result.credentials = {
          isValid: false,
          error: 'Invalid credentials data structure',
        };
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
        },
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Data integrity check failed';
      this.logger.error('Failed to validate user data integrity', {
        userId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
