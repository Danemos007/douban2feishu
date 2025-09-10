import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import type { Queue, Job } from 'bull';

import { SyncService } from './sync.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SyncGateway } from './sync.gateway';
import { DoubanService } from '../douban/douban.service';
import { SyncEngineService } from '../feishu/services/sync-engine.service';
import { TriggerSyncDto } from './dto/sync.dto';
import { SyncProgress } from './interfaces/sync.interface';

describe('SyncService', () => {
  let service: SyncService;
  let prismaService: PrismaService;
  let syncGateway: SyncGateway;
  let syncQueue: Queue;
  let doubanService: DoubanService;
  let feishuSyncEngine: SyncEngineService;

  // Mock数据常量
  const mockUserId = 'user-123';
  const mockSyncId = 'sync-456';
  const mockJobId = 789;

  const mockSyncHistory = {
    id: mockSyncId,
    userId: mockUserId,
    triggerType: 'MANUAL' as const,
    status: 'PENDING' as const,
    startedAt: new Date(),
    completedAt: null,
    itemsSynced: 0,
    errorMessage: null,
    metadata: JSON.stringify({
      options: {},
      requestedAt: new Date().toISOString(),
    }),
    duration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJob: Partial<Job> = {
    id: mockJobId,
    data: {
      syncId: mockSyncId,
      userId: mockUserId,
      options: {},
    },
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: {
            syncHistory: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: SyncGateway,
          useValue: {
            notifyProgress: jest.fn(),
          },
        },
        {
          provide: getQueueToken('sync-queue'),
          useValue: {
            add: jest.fn(),
            getJobs: jest.fn(),
            getActive: jest.fn(),
            getWaiting: jest.fn(),
            getCompleted: jest.fn(),
            getFailed: jest.fn(),
          },
        },
        {
          provide: DoubanService,
          useValue: {
            scrapeAndTransform: jest.fn(),
          },
        },
        {
          provide: SyncEngineService,
          useValue: {
            performIncrementalSync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prismaService = module.get<PrismaService>(PrismaService);
    syncGateway = module.get<SyncGateway>(SyncGateway);
    syncQueue = module.get<Queue>(getQueueToken('sync-queue'));
    doubanService = module.get<DoubanService>(DoubanService);
    feishuSyncEngine = module.get<SyncEngineService>(SyncEngineService);

    // 设置环境变量Mock
    process.env.FEISHU_APP_ID = 'test-app-id';
    process.env.FEISHU_APP_SECRET = 'test-app-secret';
    process.env.FEISHU_APP_TOKEN = 'test-app-token';
    process.env.FEISHU_BOOKS_TABLE_ID = 'test-books-table';
    process.env.FEISHU_MOVIES_TABLE_ID = 'test-movies-table';
    process.env.FEISHU_TV_TABLE_ID = 'test-tv-table';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('服务初始化', () => {
    it('应该正确定义服务', () => {
      expect(service).toBeDefined();
    });

    it('应该正确注入所有依赖', () => {
      expect(prismaService).toBeDefined();
      expect(syncGateway).toBeDefined();
      expect(syncQueue).toBeDefined();
      expect(doubanService).toBeDefined();
      expect(feishuSyncEngine).toBeDefined();
    });
  });

  describe('triggerSync', () => {
    const triggerSyncDto: TriggerSyncDto = {
      triggerType: 'MANUAL',
      options: { categories: ['books'] },
    };

    beforeEach(() => {
      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.syncHistory, 'create')
        .mockResolvedValue(mockSyncHistory);
      jest.spyOn(syncQueue, 'add').mockResolvedValue(mockJob as Job);
      jest.spyOn(syncGateway, 'notifyProgress').mockImplementation();
    });

    it('应该成功触发同步任务', async () => {
      const result = await service.triggerSync(mockUserId, triggerSyncDto);

      expect(result).toBe(mockSyncId);
      expect(prismaService.syncHistory.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: 'RUNNING',
        },
      });
      expect(prismaService.syncHistory.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          triggerType: 'MANUAL',
          status: 'PENDING',
          metadata: expect.stringContaining('"options":'),
        },
      });
      expect(syncQueue.add).toHaveBeenCalledWith(
        'sync-douban-to-feishu',
        {
          syncId: mockSyncId,
          userId: mockUserId,
          options: triggerSyncDto.options,
        },
        expect.objectContaining({
          priority: 1,
          delay: 0,
          attempts: 3,
        }),
      );
      expect(syncGateway.notifyProgress).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          syncId: mockSyncId,
          status: 'QUEUED',
          progress: 0,
        }),
      );
    });

    it('应该正确处理AUTO触发类型的优先级', async () => {
      const autoTriggerDto: TriggerSyncDto = {
        triggerType: 'AUTO',
        options: {},
      };

      await service.triggerSync(mockUserId, autoTriggerDto);

      expect(syncQueue.add).toHaveBeenCalledWith(
        'sync-douban-to-feishu',
        expect.any(Object),
        expect.objectContaining({
          priority: 5, // AUTO触发优先级较低
        }),
      );
    });

    it('应该正确处理延迟执行', async () => {
      const delayedTriggerDto: TriggerSyncDto = {
        triggerType: 'MANUAL',
        delayMs: 5000,
        options: {},
      };

      await service.triggerSync(mockUserId, delayedTriggerDto);

      expect(syncQueue.add).toHaveBeenCalledWith(
        'sync-douban-to-feishu',
        expect.any(Object),
        expect.objectContaining({
          delay: 5000,
        }),
      );
    });

    it('当有正在进行的同步时应该抛出错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      jest.spyOn(prismaService.syncHistory, 'findFirst').mockResolvedValue({
        ...mockSyncHistory,
        status: 'RUNNING',
      });

      await expect(
        service.triggerSync(mockUserId, triggerSyncDto),
      ).rejects.toThrow('Another sync is already in progress');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      expect(prismaService.syncHistory.create).not.toHaveBeenCalled();
      expect(syncQueue.add).not.toHaveBeenCalled();
    });

    it('应该正确处理数据库错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const databaseError = new Error('Database connection failed');
      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockRejectedValue(databaseError);

      await expect(
        service.triggerSync(mockUserId, triggerSyncDto),
      ).rejects.toThrow('Database connection failed');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理队列错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const queueError = new Error('Queue unavailable');
      jest.spyOn(syncQueue, 'add').mockRejectedValue(queueError);

      await expect(
        service.triggerSync(mockUserId, triggerSyncDto),
      ).rejects.toThrow('Queue unavailable');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('getSyncStatus', () => {
    it('应该成功返回同步状态', async () => {
      const completedSyncHistory = {
        ...mockSyncHistory,
        status: 'SUCCESS' as const,
        startedAt: new Date(),
        completedAt: new Date(),
        itemsSynced: 50,
      };
      jest
        .spyOn(prismaService.syncHistory, 'findUnique')
        .mockResolvedValue(completedSyncHistory);

      const result = await service.getSyncStatus(mockSyncId);

      expect(result).toEqual({
        syncId: mockSyncId,
        status: 'SUCCESS',
        startedAt: completedSyncHistory.startedAt,
        completedAt: completedSyncHistory.completedAt,
        itemsSynced: 50,
        errorMessage: null,
        metadata: completedSyncHistory.metadata,
      });
      expect(prismaService.syncHistory.findUnique).toHaveBeenCalledWith({
        where: { id: mockSyncId },
      });
    });

    it('当同步不存在时应该抛出错误', async () => {
      jest
        .spyOn(prismaService.syncHistory, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.getSyncStatus(mockSyncId)).rejects.toThrow(
        'Sync not found',
      );
    });

    it('应该正确处理数据库查询错误', async () => {
      const databaseError = new Error('Database query failed');
      jest
        .spyOn(prismaService.syncHistory, 'findUnique')
        .mockRejectedValue(databaseError);

      await expect(service.getSyncStatus(mockSyncId)).rejects.toThrow(
        'Database query failed',
      );
    });
  });

  describe('getSyncHistory', () => {
    it('应该返回用户的同步历史', async () => {
      const mockHistoryList = [
        {
          id: 'sync-1',
          userId: mockUserId,
          triggerType: 'MANUAL' as const,
          status: 'SUCCESS' as const,
          startedAt: new Date(),
          completedAt: new Date(),
          itemsSynced: 25,
          errorMessage: null,
          metadata: JSON.stringify({}),
          duration: 5000,
        },
        {
          id: 'sync-2',
          userId: mockUserId,
          triggerType: 'AUTO' as const,
          status: 'FAILED' as const,
          startedAt: new Date(),
          completedAt: new Date(),
          itemsSynced: 0,
          errorMessage: 'Network error',
          metadata: JSON.stringify({}),
          duration: 2000,
        },
      ];
      jest
        .spyOn(prismaService.syncHistory, 'findMany')
        .mockResolvedValue(mockHistoryList);

      const result = await service.getSyncHistory(mockUserId);

      expect(result).toEqual(mockHistoryList);
      expect(prismaService.syncHistory.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { startedAt: 'desc' },
        take: 10, // 默认限制
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
    });

    it('应该正确处理自定义限制参数', async () => {
      jest.spyOn(prismaService.syncHistory, 'findMany').mockResolvedValue([]);

      await service.getSyncHistory(mockUserId, 5);

      expect(prismaService.syncHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('应该正确处理数据库查询错误', async () => {
      const databaseError = new Error('Database query failed');
      jest
        .spyOn(prismaService.syncHistory, 'findMany')
        .mockRejectedValue(databaseError);

      await expect(service.getSyncHistory(mockUserId)).rejects.toThrow(
        'Database query failed',
      );
    });
  });

  describe('cancelSync', () => {
    beforeEach(() => {
      const runningSyncHistory = {
        ...mockSyncHistory,
        status: 'RUNNING' as const,
      };
      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockResolvedValue(runningSyncHistory);
      jest.spyOn(prismaService.syncHistory, 'update').mockResolvedValue({
        ...runningSyncHistory,
        status: 'CANCELLED' as const,
      });
      jest.spyOn(syncQueue, 'getJobs').mockResolvedValue([mockJob as Job]);
      jest.spyOn(syncGateway, 'notifyProgress').mockImplementation();
    });

    it('应该成功取消运行中的同步', async () => {
      const result = await service.cancelSync(mockSyncId, mockUserId);

      expect(result).toBe(true);
      expect(prismaService.syncHistory.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockSyncId,
          userId: mockUserId,
          status: 'RUNNING',
        },
      });
      expect(syncQueue.getJobs).toHaveBeenCalledWith(['active', 'waiting']);
      expect(mockJob.remove).toHaveBeenCalled();
      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
          errorMessage: 'Cancelled by user',
        },
      });
      expect(syncGateway.notifyProgress).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          syncId: mockSyncId,
          status: 'CANCELLED',
          message: 'Sync cancelled by user',
        }),
      );
    });

    it('当同步不在运行状态时应该返回false', async () => {
      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockResolvedValue(null);

      const result = await service.cancelSync(mockSyncId, mockUserId);

      expect(result).toBe(false);
      expect(syncQueue.getJobs).not.toHaveBeenCalled();
      expect(prismaService.syncHistory.update).not.toHaveBeenCalled();
    });

    it('当队列中没有对应任务时也应该成功取消', async () => {
      jest.spyOn(syncQueue, 'getJobs').mockResolvedValue([]);

      const result = await service.cancelSync(mockSyncId, mockUserId);

      expect(result).toBe(true);
      expect(prismaService.syncHistory.update).toHaveBeenCalled();
    });

    it('应该正确处理取消过程中的错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const cancelError = new Error('Failed to remove job');
      (mockJob.remove as jest.Mock).mockRejectedValue(cancelError);

      const result = await service.cancelSync(mockSyncId, mockUserId);

      // 即使移除任务失败，也应该返回false（表示取消操作失败）
      expect(result).toBe(false);

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('updateSyncProgress', () => {
    const mockProgress: SyncProgress = {
      syncId: mockSyncId,
      jobId: mockJobId.toString(),
      status: 'RUNNING',
      progress: 50,
      message: 'Processing data',
      itemsProcessed: 25,
      totalItems: 50,
    };

    beforeEach(() => {
      jest.spyOn(prismaService.syncHistory, 'update').mockResolvedValue({
        ...mockSyncHistory,
        status: 'RUNNING',
      });
      jest.spyOn(prismaService.syncHistory, 'findUnique').mockResolvedValue({
        ...mockSyncHistory,
        userId: mockUserId,
      });
      jest.spyOn(syncGateway, 'notifyProgress').mockImplementation();
    });

    it('应该成功更新运行中的同步进度', async () => {
      await service.updateSyncProgress(mockProgress);

      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'RUNNING',
          startedAt: expect.any(Date),
        },
      });
      expect(syncGateway.notifyProgress).toHaveBeenCalledWith(
        mockUserId,
        mockProgress,
      );
    });

    it('应该正确处理成功完成的同步', async () => {
      const successProgress: SyncProgress = {
        ...mockProgress,
        status: 'SUCCESS',
        progress: 100,
        itemsProcessed: 50,
      };

      await service.updateSyncProgress(successProgress);

      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'SUCCESS',
          completedAt: expect.any(Date),
          itemsSynced: 50,
          errorMessage: null,
        },
      });
    });

    it('应该正确处理失败的同步', async () => {
      const failedProgress: SyncProgress = {
        ...mockProgress,
        status: 'FAILED',
        progress: 30,
        error: 'Network connection failed',
      };

      await service.updateSyncProgress(failedProgress);

      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
          itemsSynced: 25,
          errorMessage: 'Network connection failed',
        },
      });
    });

    it('应该正确处理取消的同步', async () => {
      const cancelledProgress: SyncProgress = {
        ...mockProgress,
        status: 'CANCELLED',
        progress: 20,
      };

      await service.updateSyncProgress(cancelledProgress);

      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
          itemsSynced: 25,
          errorMessage: null,
        },
      });
    });

    it('当找不到用户ID时应该跳过WebSocket通知', async () => {
      jest
        .spyOn(prismaService.syncHistory, 'findUnique')
        .mockResolvedValue(null);

      await service.updateSyncProgress(mockProgress);

      expect(prismaService.syncHistory.update).toHaveBeenCalled();
      expect(syncGateway.notifyProgress).not.toHaveBeenCalled();
    });

    it('应该正确处理更新过程中的错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const updateError = new Error('Database update failed');
      jest
        .spyOn(prismaService.syncHistory, 'update')
        .mockRejectedValue(updateError);

      // 不应该抛出错误，只是记录日志
      await expect(
        service.updateSyncProgress(mockProgress),
      ).resolves.not.toThrow();

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('executeIntegratedSync', () => {
    const mockOptions = {
      category: 'books' as const,
      cookie: 'test-cookie',
      isEncrypted: false,
      status: 'collect' as const,
      limit: 100,
    };

    const mockTransformationResult = {
      rawData: [
        {
          subjectId: '1',
          title: 'Book 1',
          genres: ['Fiction'],
          doubanUrl: 'https://book.douban.com/subject/1/',
          userTags: [],
          category: 'books' as const,
        },
      ],
      transformedData: [{ subjectId: '1', title: 'Book 1' }],
      transformationStats: {
        totalProcessed: 1,
        repairsApplied: 0,
        validationWarnings: 0,
        processingTime: 1000,
      },
    };

    const mockFeishuSyncResult = {
      success: true,
      itemsProcessed: 1,
      summary: {
        total: 1,
        synced: 1,
        failed: 0,
        created: 1,
        updated: 0,
        deleted: 0,
        unchanged: 0,
      },
      performance: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
      },
    };

    beforeEach(() => {
      jest
        .spyOn(prismaService.syncHistory, 'create')
        .mockResolvedValue(mockSyncHistory);
      jest.spyOn(prismaService.syncHistory, 'update').mockResolvedValue({
        ...mockSyncHistory,
        status: 'SUCCESS',
      });
      jest
        .spyOn(doubanService, 'scrapeAndTransform')
        .mockResolvedValue(mockTransformationResult);
      jest
        .spyOn(feishuSyncEngine, 'performIncrementalSync')
        .mockResolvedValue(mockFeishuSyncResult);
      jest.spyOn(syncGateway, 'notifyProgress').mockImplementation();
    });

    it('应该成功执行集成同步', async () => {
      const result = await service.executeIntegratedSync(
        mockUserId,
        mockOptions,
      );

      expect(result).toEqual({
        syncId: mockSyncId,
        transformationResult: mockTransformationResult,
      });

      // 验证同步历史创建
      expect(prismaService.syncHistory.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          triggerType: 'MANUAL',
          status: 'RUNNING',
          metadata: expect.stringContaining('"transformationEnabled":true'),
        },
      });

      // 验证豆瓣数据抓取和转换
      expect(doubanService.scrapeAndTransform).toHaveBeenCalledWith({
        userId: mockUserId,
        category: 'books',
        cookie: 'test-cookie',
        isEncrypted: false,
        status: 'collect',
        limit: 100,
      });

      // 验证飞书同步
      expect(feishuSyncEngine.performIncrementalSync).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          appId: 'test-app-id',
          tableId: 'test-books-table',
          dataType: 'books',
        }),
        mockTransformationResult.transformedData,
        expect.objectContaining({
          fullSync: false,
          conflictStrategy: 'douban_wins',
        }),
      );

      // 验证最终状态更新
      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'SUCCESS',
          completedAt: expect.any(Date),
          itemsSynced: 1,
          metadata: expect.stringContaining('transformationStats'),
        },
      });

      // 验证WebSocket通知
      expect(syncGateway.notifyProgress).toHaveBeenCalledTimes(4); // 开始、转换完成、飞书同步、完成
    });

    it('应该正确处理不同的数据分类', async () => {
      const movieOptions = { ...mockOptions, category: 'movies' as const };

      await service.executeIntegratedSync(mockUserId, movieOptions);

      expect(feishuSyncEngine.performIncrementalSync).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          tableId: 'test-movies-table',
          dataType: 'movies',
        }),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('应该正确处理电视剧分类', async () => {
      const tvOptions = { ...mockOptions, category: 'tv' as const };

      await service.executeIntegratedSync(mockUserId, tvOptions);

      expect(feishuSyncEngine.performIncrementalSync).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          tableId: 'test-tv-table',
          dataType: 'tv',
        }),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('应该正确验证数据架构安全', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const emptyTransformationResult = {
        ...mockTransformationResult,
        transformedData: [],
      };
      jest
        .spyOn(doubanService, 'scrapeAndTransform')
        .mockResolvedValue(emptyTransformationResult);

      await expect(
        service.executeIntegratedSync(mockUserId, mockOptions),
      ).rejects.toThrow('Empty data set not allowed for sync');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该验证数据结构完整性', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const invalidTransformationResult = {
        ...mockTransformationResult,
        transformedData: [{ title: 'Book without subjectId' }], // 缺少subjectId
      };
      jest
        .spyOn(doubanService, 'scrapeAndTransform')
        .mockResolvedValue(invalidTransformationResult);

      await expect(
        service.executeIntegratedSync(mockUserId, mockOptions),
      ).rejects.toThrow('missing subjectId');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理未配置的表格分类', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      // 使用一个不存在的category来测试
      const invalidOptions = {
        ...mockOptions,
        category: 'invalid-category' as any,
      };

      await expect(
        service.executeIntegratedSync(mockUserId, invalidOptions),
      ).rejects.toThrow(
        'No table ID configured for category: invalid-category',
      );

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理豆瓣抓取错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const scrapeError = new Error('Douban scraping failed');
      jest
        .spyOn(doubanService, 'scrapeAndTransform')
        .mockRejectedValue(scrapeError);

      await expect(
        service.executeIntegratedSync(mockUserId, mockOptions),
      ).rejects.toThrow('Douban scraping failed');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      // 验证错误状态更新
      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
          errorMessage: 'Douban scraping failed',
        },
      });
    });

    it('应该正确处理飞书同步错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      const feishuError = new Error('Feishu sync failed');
      jest
        .spyOn(feishuSyncEngine, 'performIncrementalSync')
        .mockRejectedValue(feishuError);

      await expect(
        service.executeIntegratedSync(mockUserId, mockOptions),
      ).rejects.toThrow('Feishu sync failed');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      // 验证错误状态更新
      expect(prismaService.syncHistory.update).toHaveBeenCalledWith({
        where: { id: mockSyncId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
          errorMessage: 'Feishu sync failed',
        },
      });
    });
  });

  describe('getQueueStats', () => {
    it('应该返回队列统计信息', async () => {
      const mockActiveJobs = [{ id: 1 }, { id: 2 }];
      const mockWaitingJobs = [{ id: 3 }];
      const mockCompletedJobs = [{ id: 4 }, { id: 5 }, { id: 6 }];
      const mockFailedJobs = [{ id: 7 }];

      jest
        .spyOn(syncQueue, 'getActive')
        .mockResolvedValue(mockActiveJobs as Job[]);
      jest
        .spyOn(syncQueue, 'getWaiting')
        .mockResolvedValue(mockWaitingJobs as Job[]);
      jest
        .spyOn(syncQueue, 'getCompleted')
        .mockResolvedValue(mockCompletedJobs as Job[]);
      jest
        .spyOn(syncQueue, 'getFailed')
        .mockResolvedValue(mockFailedJobs as Job[]);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        active: 2,
        waiting: 1,
        completed: 3,
        failed: 1,
      });

      expect(syncQueue.getActive).toHaveBeenCalled();
      expect(syncQueue.getWaiting).toHaveBeenCalled();
      expect(syncQueue.getCompleted).toHaveBeenCalled();
      expect(syncQueue.getFailed).toHaveBeenCalled();
    });

    it('应该正确处理空队列', async () => {
      jest.spyOn(syncQueue, 'getActive').mockResolvedValue([]);
      jest.spyOn(syncQueue, 'getWaiting').mockResolvedValue([]);
      jest.spyOn(syncQueue, 'getCompleted').mockResolvedValue([]);
      jest.spyOn(syncQueue, 'getFailed').mockResolvedValue([]);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
      });
    });

    it('应该正确处理队列查询错误', async () => {
      const queueError = new Error('Queue connection failed');
      jest.spyOn(syncQueue, 'getActive').mockRejectedValue(queueError);

      await expect(service.getQueueStats()).rejects.toThrow(
        'Queue connection failed',
      );
    });
  });

  describe('私有方法测试', () => {
    describe('getTableIdByCategory', () => {
      it('应该返回正确的表格ID', () => {
        // 通过public方法间接测试私有方法
        expect(process.env.FEISHU_BOOKS_TABLE_ID).toBe('test-books-table');
        expect(process.env.FEISHU_MOVIES_TABLE_ID).toBe('test-movies-table');
        expect(process.env.FEISHU_TV_TABLE_ID).toBe('test-tv-table');
      });
    });

    describe('validateArchitectureSafety', () => {
      it('通过executeIntegratedSync测试数据验证', async () => {
        const mockOptions = {
          category: 'books' as const,
          cookie: 'test-cookie',
          isEncrypted: false,
        };

        jest
          .spyOn(prismaService.syncHistory, 'create')
          .mockResolvedValue(mockSyncHistory);

        // 测试无效数据验证 - 使用不包含subjectId的对象
        const invalidData = [{ title: 'Invalid Book' }];
        jest.spyOn(doubanService, 'scrapeAndTransform').mockResolvedValue({
          rawData: [
            {
              subjectId: '1',
              title: 'Book 1',
              genres: ['Fiction'],
              doubanUrl: 'https://book.douban.com/subject/1/',
              userTags: [],
              category: 'books' as const,
            },
          ],
          transformedData: invalidData,
          transformationStats: {
            totalProcessed: 0,
            repairsApplied: 0,
            validationWarnings: 0,
            processingTime: 0,
          },
        });

        // Mock logger to suppress expected error logs in tests
        const loggerErrorSpy = jest
          .spyOn((service as any).logger, 'error')
          .mockImplementation();

        await expect(
          service.executeIntegratedSync(mockUserId, mockOptions),
        ).rejects.toThrow('Data validation failed');

        // Verify error was logged
        expect(loggerErrorSpy).toHaveBeenCalled();
        loggerErrorSpy.mockRestore();
      });
    });
  });

  describe('边界条件测试', () => {
    it('应该正确处理undefined和null值', async () => {
      const triggerSyncDto: TriggerSyncDto = {
        triggerType: undefined, // 应该默认为'MANUAL'
        options: undefined, // 应该默认为空对象
      };

      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.syncHistory, 'create')
        .mockResolvedValue(mockSyncHistory);
      jest.spyOn(syncQueue, 'add').mockResolvedValue(mockJob as Job);
      jest.spyOn(syncGateway, 'notifyProgress').mockImplementation();

      const result = await service.triggerSync(mockUserId, triggerSyncDto);

      expect(result).toBe(mockSyncId);
      expect(syncQueue.add).toHaveBeenCalledWith(
        'sync-douban-to-feishu',
        expect.objectContaining({
          options: {},
        }),
        expect.objectContaining({
          priority: 5, // undefined triggerType 实际会被处理为AUTO (默认值)，优先级为5
        }),
      );
    });

    it('应该正确处理非Error类型的异常', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation();

      jest
        .spyOn(prismaService.syncHistory, 'findFirst')
        .mockRejectedValue('String error');

      await expect(
        service.triggerSync(mockUserId, { triggerType: 'MANUAL' }),
      ).rejects.toThrow('String error');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理极大的limit值', async () => {
      jest.spyOn(prismaService.syncHistory, 'findMany').mockResolvedValue([]);

      await service.getSyncHistory(mockUserId, 999999);

      expect(prismaService.syncHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 999999,
        }),
      );
    });
  });
});
