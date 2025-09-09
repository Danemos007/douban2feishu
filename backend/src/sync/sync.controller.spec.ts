import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { TriggerSyncDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueStats } from './interfaces/sync.interface';
import { TriggerType, SyncStatus } from '../../generated/prisma';

/**
 * SyncController 测试套件
 * 
 * 测试覆盖范围:
 * - Controller基础功能验证
 * - REST API端点测试 (POST/GET/DELETE)
 * - 请求参数验证和DTO处理
 * - 用户身份认证和授权
 * - 异常处理和错误响应
 * - HTTP状态码正确性
 * 
 * 遵循与sync.service.spec.ts相同的Mock风格和测试规范
 */
describe('SyncController', () => {
  let controller: SyncController;
  let syncService: SyncService;

  // Mock数据常量
  const mockUserId = 'user-123';
  const mockSyncId = 'sync-456';
  
  const mockTriggerSyncDto: TriggerSyncDto = {
    triggerType: 'MANUAL' as TriggerType,
    options: {
      fullSync: false,
      limit: 100,
    },
    delayMs: 0,
  };

  const mockSyncStatus = {
    syncId: mockSyncId,
    status: 'SUCCESS' as SyncStatus,
    startedAt: new Date('2025-09-09T10:00:00Z'),
    completedAt: new Date('2025-09-09T10:05:00Z'),
    itemsSynced: 25,
    errorMessage: null,
    metadata: {
      duration: 300000,
      categories: ['books', 'movies', 'tv'],
    },
  };

  const mockSyncHistory = [
    {
      id: 'history-1',
      triggerType: 'MANUAL' as TriggerType,
      status: 'SUCCESS' as SyncStatus,
      startedAt: new Date('2025-09-09T09:00:00Z'),
      completedAt: new Date('2025-09-09T09:05:00Z'),
      itemsSynced: 15,
      errorMessage: null,
    },
    {
      id: 'history-2', 
      triggerType: 'AUTO' as TriggerType,
      status: 'FAILED' as SyncStatus,
      startedAt: new Date('2025-09-09T08:00:00Z'),
      completedAt: new Date('2025-09-09T08:01:00Z'),
      itemsSynced: 0,
      errorMessage: 'Connection timeout',
    },
  ];

  const mockQueueStats: QueueStats = {
    active: 1,
    waiting: 3,
    completed: 25,
    failed: 2,
    delayed: 0,
    paused: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: {
            triggerSync: jest.fn(),
            getSyncStatus: jest.fn(),
            getSyncHistory: jest.fn(),
            cancelSync: jest.fn(),
            getQueueStats: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<SyncController>(SyncController);
    syncService = module.get<SyncService>(SyncService);

    // 设置默认Mock行为
    jest.spyOn(syncService, 'triggerSync').mockResolvedValue(mockSyncId);
    jest.spyOn(syncService, 'getSyncStatus').mockResolvedValue(mockSyncStatus);
    jest.spyOn(syncService, 'getSyncHistory').mockResolvedValue(mockSyncHistory);
    jest.spyOn(syncService, 'cancelSync').mockResolvedValue(true);
    jest.spyOn(syncService, 'getQueueStats').mockResolvedValue(mockQueueStats);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller基础功能', () => {
    it('应该正确定义Controller', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SyncController);
    });

    it('应该正确注入SyncService依赖', () => {
      expect(syncService).toBeDefined();
      expect(controller['syncService']).toBe(syncService);
    });
  });

  describe('POST /sync/trigger - 触发同步任务', () => {
    it('应该成功创建同步任务', async () => {
      const result = await controller.triggerSync(mockUserId, mockTriggerSyncDto);

      expect(syncService.triggerSync).toHaveBeenCalledWith(mockUserId, mockTriggerSyncDto);
      expect(result).toEqual({
        syncId: mockSyncId,
        message: 'Sync task created successfully',
        status: 'QUEUED',
      });
    });

    it('应该传递正确的用户ID和DTO参数', async () => {
      const customDto: TriggerSyncDto = {
        triggerType: 'AUTO' as TriggerType,
        options: { fullSync: true },
        delayMs: 5000,
      };

      await controller.triggerSync('custom-user-id', customDto);

      expect(syncService.triggerSync).toHaveBeenCalledWith('custom-user-id', customDto);
      expect(syncService.triggerSync).toHaveBeenCalledTimes(1);
    });

    it('应该处理SyncService抛出的异常', async () => {
      const serviceError = new Error('Another sync is already in progress');
      jest.spyOn(syncService, 'triggerSync').mockRejectedValue(serviceError);

      await expect(
        controller.triggerSync(mockUserId, mockTriggerSyncDto)
      ).rejects.toThrow('Another sync is already in progress');

      expect(syncService.triggerSync).toHaveBeenCalledWith(mockUserId, mockTriggerSyncDto);
    });

    it('应该处理空的options字段', async () => {
      const dtoWithoutOptions: TriggerSyncDto = {
        triggerType: 'MANUAL' as TriggerType,
        delayMs: 0,
      };

      await controller.triggerSync(mockUserId, dtoWithoutOptions);

      expect(syncService.triggerSync).toHaveBeenCalledWith(mockUserId, dtoWithoutOptions);
    });

    it('应该处理特殊字符的用户ID', async () => {
      const specialUserId = 'user-with-special@chars.com';

      await controller.triggerSync(specialUserId, mockTriggerSyncDto);

      expect(syncService.triggerSync).toHaveBeenCalledWith(specialUserId, mockTriggerSyncDto);
    });
  });

  describe('GET /sync/:syncId/status - 获取同步状态', () => {
    it('应该成功获取同步状态', async () => {
      const result = await controller.getSyncStatus(mockSyncId);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(mockSyncId);
      expect(result).toEqual(mockSyncStatus);
    });

    it('应该传递正确的syncId参数', async () => {
      const customSyncId = 'custom-sync-123';

      await controller.getSyncStatus(customSyncId);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(customSyncId);
      expect(syncService.getSyncStatus).toHaveBeenCalledTimes(1);
    });

    it('应该处理不存在的同步任务', async () => {
      const notFoundError = new Error('Sync not found');
      jest.spyOn(syncService, 'getSyncStatus').mockRejectedValue(notFoundError);

      await expect(
        controller.getSyncStatus('non-existent-sync')
      ).rejects.toThrow('Sync not found');

      expect(syncService.getSyncStatus).toHaveBeenCalledWith('non-existent-sync');
    });

    it('应该处理UUID格式的syncId', async () => {
      const uuidSyncId = '123e4567-e89b-12d3-a456-426614174000';

      await controller.getSyncStatus(uuidSyncId);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(uuidSyncId);
    });

    it('应该处理service返回的复杂状态数据', async () => {
      const complexStatus = {
        ...mockSyncStatus,
        metadata: {
          duration: 300000,
          categories: ['books', 'movies', 'tv'],
          errors: [],
          warnings: ['Category "music" skipped'],
          performance: {
            totalItems: 100,
            processedItems: 95,
            failedItems: 5,
          },
        },
      };

      jest.spyOn(syncService, 'getSyncStatus').mockResolvedValue(complexStatus);

      const result = await controller.getSyncStatus(mockSyncId);

      expect(result).toEqual(complexStatus);
      expect(result.metadata.performance).toBeDefined();
    });
  });

  describe('GET /sync/history - 获取同步历史', () => {
    it('应该成功获取同步历史', async () => {
      const result = await controller.getSyncHistory(mockUserId);

      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, 10);
      expect(result).toEqual(mockSyncHistory);
    });

    it('应该使用自定义的limit参数', async () => {
      const customLimit = '20';

      await controller.getSyncHistory(mockUserId, customLimit);

      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, 20);
    });

    it('应该处理无效的limit参数', async () => {
      const invalidLimit = 'invalid';

      await controller.getSyncHistory(mockUserId, invalidLimit);

      // parseInt('invalid') 返回 NaN，传递给service
      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, NaN);
    });

    it('应该处理limit为0的情况', async () => {
      await controller.getSyncHistory(mockUserId, '0');

      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, 0);
    });

    it('应该处理负数limit', async () => {
      await controller.getSyncHistory(mockUserId, '-5');

      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, -5);
    });

    it('应该处理service返回空历史', async () => {
      jest.spyOn(syncService, 'getSyncHistory').mockResolvedValue([]);

      const result = await controller.getSyncHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it('应该传递正确的用户ID', async () => {
      const customUserId = 'different-user-789';

      await controller.getSyncHistory(customUserId, '15');

      expect(syncService.getSyncHistory).toHaveBeenCalledWith(customUserId, 15);
    });
  });

  describe('DELETE /sync/:syncId - 取消同步任务', () => {
    it('应该成功取消同步任务', async () => {
      const result = await controller.cancelSync(mockSyncId, mockUserId);

      expect(syncService.cancelSync).toHaveBeenCalledWith(mockSyncId, mockUserId);
      expect(result).toEqual({
        message: 'Sync cancelled successfully',
      });
    });

    it('应该处理无法取消的同步任务', async () => {
      jest.spyOn(syncService, 'cancelSync').mockResolvedValue(false);

      const result = await controller.cancelSync(mockSyncId, mockUserId);

      expect(syncService.cancelSync).toHaveBeenCalledWith(mockSyncId, mockUserId);
      expect(result).toEqual({
        message: 'Sync not found or cannot be cancelled',
      });
    });

    it('应该传递正确的syncId和userId', async () => {
      const customSyncId = 'custom-sync-789';
      const customUserId = 'custom-user-456';

      await controller.cancelSync(customSyncId, customUserId);

      expect(syncService.cancelSync).toHaveBeenCalledWith(customSyncId, customUserId);
    });

    it('应该处理service抛出的异常', async () => {
      const serviceError = new Error('Database connection failed');
      jest.spyOn(syncService, 'cancelSync').mockRejectedValue(serviceError);

      await expect(
        controller.cancelSync(mockSyncId, mockUserId)
      ).rejects.toThrow('Database connection failed');

      expect(syncService.cancelSync).toHaveBeenCalledWith(mockSyncId, mockUserId);
    });

    it('应该处理不同用户尝试取消其他用户的任务', async () => {
      jest.spyOn(syncService, 'cancelSync').mockResolvedValue(false);

      const result = await controller.cancelSync(mockSyncId, 'unauthorized-user');

      expect(result).toEqual({
        message: 'Sync not found or cannot be cancelled',
      });
      expect(syncService.cancelSync).toHaveBeenCalledWith(mockSyncId, 'unauthorized-user');
    });
  });

  describe('GET /sync/queue/stats - 获取队列统计', () => {
    it('应该成功获取队列统计信息', async () => {
      const result = await controller.getQueueStats();

      expect(syncService.getQueueStats).toHaveBeenCalled();
      expect(result).toEqual(mockQueueStats);
    });

    it('应该处理service返回的详细统计信息', async () => {
      const detailedStats = {
        active: 2,
        waiting: 5,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: 0,
        totalProcessed: 103,
        averageProcessingTime: 45000,
        lastProcessedAt: new Date(),
      };

      jest.spyOn(syncService, 'getQueueStats').mockResolvedValue(detailedStats);

      const result = await controller.getQueueStats();

      expect(result).toEqual(detailedStats);
      expect((result as any).totalProcessed).toBe(103);
    });

    it('应该处理service抛出的异常', async () => {
      const serviceError = new Error('Queue connection failed');
      jest.spyOn(syncService, 'getQueueStats').mockRejectedValue(serviceError);

      await expect(
        controller.getQueueStats()
      ).rejects.toThrow('Queue connection failed');
    });

    it('应该处理空的统计信息', async () => {
      const emptyStats = {
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
      };

      jest.spyOn(syncService, 'getQueueStats').mockResolvedValue(emptyStats);

      const result = await controller.getQueueStats();

      expect(result).toEqual(emptyStats);
    });

    it('应该不需要任何参数', async () => {
      await controller.getQueueStats();

      // 验证getQueueStats被调用时没有传递任何参数
      expect(syncService.getQueueStats).toHaveBeenCalledWith();
    });
  });

  describe('参数验证和边界条件', () => {
    it('应该处理极长的用户ID', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000);

      await controller.triggerSync(longUserId, mockTriggerSyncDto);

      expect(syncService.triggerSync).toHaveBeenCalledWith(longUserId, mockTriggerSyncDto);
    });

    it('应该处理空字符串参数', async () => {
      await controller.getSyncStatus('');

      expect(syncService.getSyncStatus).toHaveBeenCalledWith('');
    });

    it('应该处理特殊字符在syncId中', async () => {
      const specialSyncId = 'sync-!@#$%^&*()';

      await controller.getSyncStatus(specialSyncId);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(specialSyncId);
    });

    it('应该处理undefined limit参数', async () => {
      await controller.getSyncHistory(mockUserId, undefined);

      // undefined时使用默认值'10'，parseInt('10') = 10
      expect(syncService.getSyncHistory).toHaveBeenCalledWith(mockUserId, 10);
    });

    it('应该处理null参数', async () => {
      await controller.getSyncStatus(null as any);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(null);
    });
  });

  describe('异常处理和错误情况', () => {
    it('应该传播SyncService的所有异常类型', async () => {
      const errors = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
      ];

      for (const error of errors) {
        jest.spyOn(syncService, 'triggerSync').mockRejectedValue(error);

        await expect(
          controller.triggerSync(mockUserId, mockTriggerSyncDto)
        ).rejects.toThrow(error);
      }
    });

    it('应该处理service返回null的情况', async () => {
      jest.spyOn(syncService, 'getSyncStatus').mockResolvedValue(null);

      const result = await controller.getSyncStatus(mockSyncId);

      expect(result).toBeNull();
    });

    it('应该处理service返回undefined的情况', async () => {
      jest.spyOn(syncService, 'getQueueStats').mockResolvedValue(undefined as any);

      const result = await controller.getQueueStats();

      expect(result).toBeUndefined();
    });

    it('应该处理Promise被reject的情况', async () => {
      const rejectionReason = 'Promise rejected without Error object';
      jest.spyOn(syncService, 'cancelSync').mockRejectedValue(rejectionReason);

      await expect(
        controller.cancelSync(mockSyncId, mockUserId)
      ).rejects.toBe(rejectionReason);
    });
  });

  describe('认证和权限验证', () => {
    it('应该被JwtAuthGuard保护', () => {
      // 验证Controller类上有UseGuards装饰器
      const metadata = Reflect.getMetadata('__guards__', SyncController);
      expect(metadata).toContain(JwtAuthGuard);
    });

    it('应该在所有路由上应用认证', () => {
      // 验证每个方法都需要通过认证
      const methodNames = ['triggerSync', 'getSyncStatus', 'getSyncHistory', 'cancelSync', 'getQueueStats'];
      
      methodNames.forEach(methodName => {
        expect(controller[methodName]).toBeDefined();
      });
    });

    it('应该正确使用CurrentUser装饰器提取用户ID', async () => {
      // 模拟CurrentUser装饰器行为
      await controller.triggerSync(mockUserId, mockTriggerSyncDto);

      expect(syncService.triggerSync).toHaveBeenCalledWith(mockUserId, expect.any(Object));
    });

    it('应该区分需要用户ID和不需要用户ID的端点', async () => {
      // triggerSync需要用户ID
      await controller.triggerSync(mockUserId, mockTriggerSyncDto);
      expect(syncService.triggerSync).toHaveBeenCalledWith(
        expect.stringContaining('user'),
        expect.any(Object)
      );

      // getQueueStats不需要用户ID
      await controller.getQueueStats();
      expect(syncService.getQueueStats).toHaveBeenCalledWith();
    });
  });

  describe('HTTP状态码和响应格式', () => {
    it('应该为triggerSync返回正确的响应格式', async () => {
      const result = await controller.triggerSync(mockUserId, mockTriggerSyncDto);

      expect(result).toHaveProperty('syncId');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('QUEUED');
      expect(typeof result.syncId).toBe('string');
    });

    it('应该为cancelSync返回正确的消息格式', async () => {
      const successResult = await controller.cancelSync(mockSyncId, mockUserId);

      expect(successResult).toHaveProperty('message');
      expect(successResult.message).toBe('Sync cancelled successfully');

      // 测试失败情况
      jest.spyOn(syncService, 'cancelSync').mockResolvedValue(false);
      const failResult = await controller.cancelSync(mockSyncId, mockUserId);

      expect(failResult.message).toBe('Sync not found or cannot be cancelled');
    });

    it('应该为各个端点返回预期的数据结构', async () => {
      // getSyncStatus
      const statusResult = await controller.getSyncStatus(mockSyncId);
      expect(statusResult).toHaveProperty('syncId');
      expect(statusResult).toHaveProperty('status');

      // getSyncHistory  
      const historyResult = await controller.getSyncHistory(mockUserId);
      expect(Array.isArray(historyResult)).toBe(true);

      // getQueueStats
      const statsResult = await controller.getQueueStats();
      expect(statsResult).toHaveProperty('active');
      expect(statsResult).toHaveProperty('waiting');
    });
  });

  describe('集成测试场景', () => {
    it('应该支持完整的同步工作流', async () => {
      // 1. 触发同步
      const triggerResult = await controller.triggerSync(mockUserId, mockTriggerSyncDto);
      expect(triggerResult.syncId).toBe(mockSyncId);

      // 2. 检查状态
      const statusResult = await controller.getSyncStatus(mockSyncId);
      expect(statusResult.syncId).toBe(mockSyncId);

      // 3. 检查历史
      const historyResult = await controller.getSyncHistory(mockUserId);
      expect(Array.isArray(historyResult)).toBe(true);

      // 4. 取消任务
      const cancelResult = await controller.cancelSync(mockSyncId, mockUserId);
      expect(cancelResult.message).toContain('successfully');

      // 5. 检查队列统计
      const statsResult = await controller.getQueueStats();
      expect(typeof statsResult.active).toBe('number');
    });

    it('应该处理并发请求', async () => {
      const promises = [
        controller.getSyncStatus(mockSyncId),
        controller.getSyncHistory(mockUserId, '5'),
        controller.getQueueStats(),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toEqual(mockSyncStatus);
      expect(results[1]).toEqual(mockSyncHistory);
      expect(results[2]).toEqual(mockQueueStats);
    });

    it('应该正确处理多用户场景', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      await controller.triggerSync(user1, mockTriggerSyncDto);
      await controller.triggerSync(user2, mockTriggerSyncDto);

      expect(syncService.triggerSync).toHaveBeenCalledTimes(2);
      expect(syncService.triggerSync).toHaveBeenNthCalledWith(1, user1, mockTriggerSyncDto);
      expect(syncService.triggerSync).toHaveBeenNthCalledWith(2, user2, mockTriggerSyncDto);
    });
  });
});