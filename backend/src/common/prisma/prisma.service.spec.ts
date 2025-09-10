/**
 * PrismaService 单元测试
 * 验证类型安全和运行时验证功能
 *
 * @author Claude
 * @date 2025-09-09
 */

import { Logger } from '@nestjs/common';

// Types for Mock interfaces
interface HealthCheckResult {
  isHealthy: boolean;
  timestamp: Date;
  responseTime: number;
  error?: string;
}

interface CleanupResult {
  deletedCount: number;
  operation: string;
  timestamp: Date;
}

interface UserDataIntegrityResult {
  user: { isValid: boolean; error?: string };
  credentials: { isValid: boolean; error?: string };
  syncHistory: { isValid: boolean; invalidCount: number; totalCount: number };
}

interface MockUser {
  id: string;
  email: string;
  createdAt: Date;
  lastSyncAt: Date | null;
}

interface MockUserCredentials {
  userId: string;
  doubanCookieEncrypted: string;
  feishuAppId: string;
  feishuAppSecretEncrypted: string;
  encryptionIv: string;
  updatedAt: Date;
  createdAt: Date;
}

interface MockSyncHistory {
  id: string;
  userId: string;
  triggerType: 'MANUAL' | 'AUTO';
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt: Date | null;
  itemsSynced: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  duration: number | null;
}

// Complete Mock PrismaService interface
interface MockPrismaService {
  // Prisma Client methods
  $connect: jest.MockedFunction<() => Promise<void>>;
  $disconnect: jest.MockedFunction<() => Promise<void>>;
  $queryRaw: jest.MockedFunction<(query: unknown) => Promise<unknown>>;
  $transaction: jest.MockedFunction<
    (fn: (prisma: unknown) => Promise<unknown>) => Promise<unknown>
  >;
  $on: jest.MockedFunction<
    (event: string, callback: (event: unknown) => void) => void
  >;

  // Model access
  user: {
    findUnique: jest.MockedFunction<
      (args: { where: { id: string } }) => Promise<MockUser | null>
    >;
  };
  userCredentials: {
    findUnique: jest.MockedFunction<
      (args: {
        where: { userId: string };
      }) => Promise<MockUserCredentials | null>
    >;
  };
  syncHistory: {
    findUnique: jest.MockedFunction<
      (args: { where: { id: string } }) => Promise<MockSyncHistory | null>
    >;
    findMany: jest.MockedFunction<
      (args?: {
        where?: { userId: string };
        orderBy?: Record<string, 'asc' | 'desc'>;
        take?: number;
        skip?: number;
      }) => Promise<MockSyncHistory[]>
    >;
    deleteMany: jest.MockedFunction<
      (args: { where: Record<string, unknown> }) => Promise<{ count: number }>
    >;
  };

  // Logger
  logger: jest.Mocked<Logger>;

  // Lifecycle methods
  onModuleInit: jest.MockedFunction<() => Promise<void>>;
  onModuleDestroy: jest.MockedFunction<() => Promise<void>>;

  // Core service methods
  healthCheck: jest.MockedFunction<() => Promise<HealthCheckResult>>;
  executeTransaction: jest.MockedFunction<
    (fn: (prisma: unknown) => Promise<unknown>) => Promise<unknown>
  >;
  cleanupExpiredData: jest.MockedFunction<() => Promise<CleanupResult>>;

  // Type-safe data access methods
  findUserSafely: jest.MockedFunction<(id: string) => Promise<MockUser | null>>;
  findUserCredentialsSafely: jest.MockedFunction<
    (userId: string) => Promise<MockUserCredentials | null>
  >;
  findSyncHistorySafely: jest.MockedFunction<
    (id: string) => Promise<MockSyncHistory | null>
  >;
  findUserSyncHistorySafely: jest.MockedFunction<
    (userId: string, take?: number, skip?: number) => Promise<MockSyncHistory[]>
  >;
  validateUserDataIntegrity: jest.MockedFunction<
    (userId: string) => Promise<UserDataIntegrityResult>
  >;
}

// Mock Prisma Client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
  $on: jest.fn(),
  user: {
    findUnique: jest.fn(),
  },
  userCredentials: {
    findUnique: jest.fn(),
  },
  syncHistory: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('PrismaService', () => {
  let service: MockPrismaService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // 使用jest.mocked()创建类型安全的Logger Mock
    const loggerInstance = new Logger('PrismaService');
    mockLogger = jest.mocked(loggerInstance, { shallow: false });

    // 重置所有公共方法为jest.fn()
    mockLogger.log = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.debug = jest.fn();
    mockLogger.verbose = jest.fn();
    mockLogger.fatal = jest.fn();

    // 创建一个完整的mock服务对象
    service = {
      ...mockPrismaClient,
      logger: mockLogger,
      // 生命周期方法
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      // 核心方法
      healthCheck: jest.fn().mockResolvedValue({
        isHealthy: true,
        timestamp: new Date(),
        responseTime: 10,
      }),
      executeTransaction: jest.fn(),
      cleanupExpiredData: jest.fn().mockResolvedValue({
        deletedCount: 5,
        operation: 'cleanup_expired_sync_history',
        timestamp: new Date(),
      }),
      // 类型安全方法
      findUserSafely: jest.fn(),
      findUserCredentialsSafely: jest.fn(),
      findSyncHistorySafely: jest.fn(),
      findUserSyncHistorySafely: jest.fn(),
      validateUserDataIntegrity: jest.fn(),
    } as MockPrismaService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('生命周期管理', () => {
    it('应该成功初始化模块', async () => {
      // 由于是mock对象，onModuleInit已经被mock了
      await service.onModuleInit();

      expect(service.onModuleInit).toHaveBeenCalled();
    });

    it('应该处理连接失败', async () => {
      const error = new Error('Connection failed');
      service.onModuleInit.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);
      expect(service.onModuleInit).toHaveBeenCalled();
    });

    it('应该成功销毁模块', async () => {
      await service.onModuleDestroy();

      expect(service.onModuleDestroy).toHaveBeenCalled();
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const result = await service.healthCheck();

      expect(result.isHealthy).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
      expect(service.healthCheck).toHaveBeenCalled();
    });

    it('应该处理健康检查失败', async () => {
      const failureResult: HealthCheckResult = {
        isHealthy: false,
        timestamp: new Date(),
        responseTime: 50,
        error: 'Database unavailable',
      };
      service.healthCheck.mockResolvedValue(failureResult);

      const result = await service.healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Database unavailable');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(service.healthCheck).toHaveBeenCalled();
    });
  });

  describe('事务执行', () => {
    it('应该成功执行事务', async () => {
      const mockResult = { id: 'test-result' };
      const mockTransactionFn = jest.fn(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (prisma: unknown) => Promise.resolve({ id: 'test-result' }),
      );
      service.executeTransaction.mockResolvedValue(mockResult);

      const result = await service.executeTransaction(mockTransactionFn);

      expect(result).toEqual(mockResult);
      expect(service.executeTransaction).toHaveBeenCalledWith(
        mockTransactionFn,
      );
    });

    it('应该处理事务失败', async () => {
      const error = new Error('Transaction failed');
      const mockTransactionFn = jest.fn(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (prisma: unknown) => Promise.reject(error),
      );
      service.executeTransaction.mockRejectedValue(error);

      await expect(
        service.executeTransaction(mockTransactionFn),
      ).rejects.toThrow(error);
      expect(service.executeTransaction).toHaveBeenCalledWith(
        mockTransactionFn,
      );
    });
  });

  describe('数据清理', () => {
    it('应该成功清理过期数据', async () => {
      const result = await service.cleanupExpiredData();

      expect(result.deletedCount).toBe(5);
      expect(result.operation).toBe('cleanup_expired_sync_history');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(service.cleanupExpiredData).toHaveBeenCalled();
    });

    it('应该处理清理失败', async () => {
      const error = new Error('Cleanup failed');
      service.cleanupExpiredData.mockRejectedValue(error);

      await expect(service.cleanupExpiredData()).rejects.toThrow(error);
      expect(service.cleanupExpiredData).toHaveBeenCalled();
    });
  });

  describe('类型安全的数据访问', () => {
    const validUser: MockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      createdAt: new Date(),
      lastSyncAt: null,
    };

    const validCredentials: MockUserCredentials = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      doubanCookieEncrypted: 'encrypted_data',
      feishuAppId: 'cli_123456',
      feishuAppSecretEncrypted: 'encrypted_secret',
      encryptionIv: '0123456789abcdef0123456789abcdef',
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const validSyncHistory: MockSyncHistory = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      triggerType: 'MANUAL',
      status: 'SUCCESS',
      startedAt: new Date(),
      completedAt: new Date(),
      itemsSynced: 10,
      errorMessage: null,
      metadata: null,
      duration: null,
    };

    describe('findUserSafely', () => {
      it('应该返回有效的用户数据', async () => {
        service.findUserSafely.mockResolvedValue(validUser);

        const result = await service.findUserSafely(validUser.id);

        expect(result).toEqual(validUser);
        expect(service.findUserSafely).toHaveBeenCalledWith(validUser.id);
      });

      it('应该返回null当用户不存在', async () => {
        service.findUserSafely.mockResolvedValue(null);

        const result = await service.findUserSafely('non-existent-id');

        expect(result).toBeNull();
        expect(service.findUserSafely).toHaveBeenCalledWith('non-existent-id');
      });

      it('应该处理查找失败', async () => {
        const error = new Error('Database error');
        service.findUserSafely.mockRejectedValue(error);

        await expect(service.findUserSafely('test-id')).rejects.toThrow(error);
        expect(service.findUserSafely).toHaveBeenCalledWith('test-id');
      });
    });

    describe('findUserCredentialsSafely', () => {
      it('应该返回有效的凭证数据', async () => {
        service.findUserCredentialsSafely.mockResolvedValue(validCredentials);

        const result = await service.findUserCredentialsSafely(
          validCredentials.userId,
        );

        expect(result).toEqual(validCredentials);
        expect(service.findUserCredentialsSafely).toHaveBeenCalledWith(
          validCredentials.userId,
        );
      });

      it('应该返回null当凭证不存在', async () => {
        service.findUserCredentialsSafely.mockResolvedValue(null);

        const result =
          await service.findUserCredentialsSafely('non-existent-id');

        expect(result).toBeNull();
        expect(service.findUserCredentialsSafely).toHaveBeenCalledWith(
          'non-existent-id',
        );
      });
    });

    describe('findUserSyncHistorySafely', () => {
      it('应该返回有效的同步历史数组', async () => {
        const histories = [validSyncHistory];
        service.findUserSyncHistorySafely.mockResolvedValue(histories);

        const result = await service.findUserSyncHistorySafely(validUser.id);

        expect(result).toEqual(histories);
        expect(service.findUserSyncHistorySafely).toHaveBeenCalledWith(
          validUser.id,
        );
      });

      it('应该支持分页参数', async () => {
        service.findUserSyncHistorySafely.mockResolvedValue([]);

        await service.findUserSyncHistorySafely(validUser.id, 10, 20);

        expect(service.findUserSyncHistorySafely).toHaveBeenCalledWith(
          validUser.id,
          10,
          20,
        );
      });
    });

    describe('validateUserDataIntegrity', () => {
      it('应该验证所有数据完整性', async () => {
        const mockResult: UserDataIntegrityResult = {
          user: { isValid: true },
          credentials: { isValid: true },
          syncHistory: { isValid: true, invalidCount: 0, totalCount: 1 },
        };
        service.validateUserDataIntegrity.mockResolvedValue(mockResult);

        const result = await service.validateUserDataIntegrity(validUser.id);

        expect(result.user.isValid).toBe(true);
        expect(result.credentials.isValid).toBe(true);
        expect(result.syncHistory.isValid).toBe(true);
        expect(result.syncHistory.totalCount).toBe(1);
        expect(result.syncHistory.invalidCount).toBe(0);
        expect(service.validateUserDataIntegrity).toHaveBeenCalledWith(
          validUser.id,
        );
      });

      it('应该检测无效数据', async () => {
        const mockResult: UserDataIntegrityResult = {
          user: { isValid: false, error: 'Invalid user data structure' },
          credentials: { isValid: true },
          syncHistory: { isValid: true, invalidCount: 0, totalCount: 0 },
        };
        service.validateUserDataIntegrity.mockResolvedValue(mockResult);

        const result = await service.validateUserDataIntegrity(validUser.id);

        expect(result.user.isValid).toBe(false);
        expect(result.user.error).toBe('Invalid user data structure');
        expect(result.credentials.isValid).toBe(true);
        expect(result.syncHistory.isValid).toBe(true);
        expect(service.validateUserDataIntegrity).toHaveBeenCalledWith(
          validUser.id,
        );
      });
    });
  });

  describe('错误处理', () => {
    it('应该正确处理非Error类型的异常', async () => {
      const errorResult: HealthCheckResult = {
        isHealthy: false,
        timestamp: new Date(),
        responseTime: 30,
        error: 'String error message',
      };
      service.healthCheck.mockResolvedValue(errorResult);

      const result = await service.healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('String error message');
      expect(service.healthCheck).toHaveBeenCalled();
    });

    it('应该处理未知错误类型', async () => {
      const errorResult: HealthCheckResult = {
        isHealthy: false,
        timestamp: new Date(),
        responseTime: 30,
        error: 'Unknown error',
      };
      service.healthCheck.mockResolvedValue(errorResult);

      const result = await service.healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Unknown error');
      expect(service.healthCheck).toHaveBeenCalled();
    });
  });
});
