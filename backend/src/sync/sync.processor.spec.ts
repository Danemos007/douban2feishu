import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bull';
import type { JsonValue } from '@prisma/client/runtime/library';

import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';
import { DoubanService } from '../douban/douban.service';
import { FeishuService } from '../feishu/feishu.service';
import { SyncEngineService } from '../feishu/services/sync-engine.service';
import { FieldMappingService } from '../feishu/services/field-mapping.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { SyncJobData, SyncPhase } from './interfaces/sync.interface';
import { DoubanItem } from '../douban/interfaces/douban.interface';

describe('SyncProcessor', () => {
  let processor: SyncProcessor;
  let syncService: SyncService;
  let doubanService: DoubanService;
  let feishuService: FeishuService;
  let syncEngineService: SyncEngineService;
  let fieldMappingService: FieldMappingService;
  let prismaService: PrismaService;
  let cryptoService: CryptoService;

  // Spy variables for unbound-method compliance
  let updateSyncProgressSpy: jest.SpyInstance;
  let userCredentialsFindUniqueSpy: jest.SpyInstance;
  let cryptoDecryptSpy: jest.SpyInstance;
  let doubanFetchUserDataSpy: jest.SpyInstance;
  let syncEnginePerformIncrementalSyncSpy: jest.SpyInstance;

  // Mock数据常量
  const mockUserId = 'user-123';
  const mockSyncId = 'sync-456';
  const mockJobId = 789;

  const mockJobData: SyncJobData = {
    syncId: mockSyncId,
    userId: mockUserId,
    options: {
      categories: ['books'],
      limit: 100,
      fullSync: false,
    },
  };

  const mockJob: Partial<Job<SyncJobData>> = {
    id: mockJobId,
    data: mockJobData,
    progress: jest.fn(),
  };

  const mockUserCredentials = {
    userId: mockUserId,
    doubanCookieEncrypted: 'encrypted-douban-cookie',
    feishuAppId: 'test-app-id',
    feishuAppSecretEncrypted: 'encrypted-feishu-secret',
    encryptionIv: 'test-iv',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Removed unused mockDecryptedCredentials

  const mockDoubanData: DoubanItem[] = [
    {
      subjectId: '1',
      title: 'Book 1',
      category: 'books',
      genres: ['Fiction'],
      doubanUrl: 'https://book.douban.com/subject/1/',
      userTags: [],
    },
    {
      subjectId: '2',
      title: 'Book 2',
      category: 'books',
      genres: ['Non-fiction'],
      doubanUrl: 'https://book.douban.com/subject/2/',
      userTags: [],
    },
  ];

  const mockSyncConfig = {
    userId: mockUserId,
    mappingType: 'THREE_TABLES' as const,
    autoSyncEnabled: true,
    syncSchedule: {},
    tableMappings: {
      'test-token:test-table': {
        subjectId: 'Subject ID',
        title: 'Title',
        _metadata: {
          dataType: 'books',
        },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSyncResult = {
    success: true,
    itemsProcessed: 2,
    summary: {
      total: 2,
      synced: 2,
      failed: 0,
      created: 1,
      updated: 1,
      deleted: 0,
      unchanged: 0,
    },
    performance: {
      startTime: new Date(),
      endTime: new Date(),
      duration: 5000,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncProcessor,
        {
          provide: SyncService,
          useValue: {
            updateSyncProgress: jest.fn(),
          },
        },
        {
          provide: DoubanService,
          useValue: {
            fetchUserData: jest.fn(),
          },
        },
        {
          provide: FeishuService,
          useValue: {
            createRecord: jest.fn(),
            updateRecord: jest.fn(),
          },
        },
        {
          provide: SyncEngineService,
          useValue: {
            performIncrementalSync: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            mapFields: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            userCredentials: {
              findUnique: jest.fn(),
            },
            syncConfig: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: CryptoService,
          useValue: {
            decrypt: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<SyncProcessor>(SyncProcessor);
    syncService = module.get<SyncService>(SyncService);
    doubanService = module.get<DoubanService>(DoubanService);
    feishuService = module.get<FeishuService>(FeishuService);
    syncEngineService = module.get<SyncEngineService>(SyncEngineService);
    fieldMappingService = module.get<FieldMappingService>(FieldMappingService);
    prismaService = module.get<PrismaService>(PrismaService);
    cryptoService = module.get<CryptoService>(CryptoService);

    // 设置基础Mock行为
    updateSyncProgressSpy = jest
      .spyOn(syncService, 'updateSyncProgress')
      .mockResolvedValue();
    userCredentialsFindUniqueSpy = jest
      .spyOn(prismaService.userCredentials, 'findUnique')
      .mockResolvedValue(mockUserCredentials);
    cryptoDecryptSpy = jest
      .spyOn(cryptoService, 'decrypt')
      .mockImplementation((encryptedData: string) => {
        if (encryptedData === 'encrypted-douban-cookie')
          return 'decrypted-douban-cookie';
        if (encryptedData === 'encrypted-feishu-secret')
          return 'decrypted-feishu-secret';
        return 'decrypted-value';
      });
    doubanFetchUserDataSpy = jest
      .spyOn(doubanService, 'fetchUserData')
      .mockResolvedValue(mockDoubanData);
    jest
      .spyOn(prismaService.syncConfig, 'findUnique')
      .mockResolvedValue(mockSyncConfig);
    syncEnginePerformIncrementalSyncSpy = jest
      .spyOn(syncEngineService, 'performIncrementalSync')
      .mockResolvedValue(mockSyncResult);

    // Mock delay method to avoid actual delays in tests
    jest
      .spyOn(
        processor as unknown as { delay: (ms: number) => Promise<void> },
        'delay',
      )
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('处理器初始化', () => {
    it('应该正确定义处理器', () => {
      expect(processor).toBeDefined();
    });

    it('应该正确注入所有依赖', () => {
      expect(syncService).toBeDefined();
      expect(doubanService).toBeDefined();
      expect(feishuService).toBeDefined();
      expect(syncEngineService).toBeDefined();
      expect(fieldMappingService).toBeDefined();
      expect(prismaService).toBeDefined();
      expect(cryptoService).toBeDefined();
    });
  });

  describe('handleSync', () => {
    beforeEach(() => {
      // 重置所有Mock的默认行为
      jest.clearAllMocks();
      jest.spyOn(syncService, 'updateSyncProgress').mockResolvedValue();
      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockResolvedValue(mockUserCredentials);
      jest
        .spyOn(cryptoService, 'decrypt')
        .mockImplementation((encryptedData: string) => {
          if (encryptedData === 'encrypted-douban-cookie')
            return 'decrypted-douban-cookie';
          if (encryptedData === 'encrypted-feishu-secret')
            return 'decrypted-feishu-secret';
          return 'decrypted-value';
        });
      jest
        .spyOn(doubanService, 'fetchUserData')
        .mockResolvedValue(mockDoubanData);
      jest
        .spyOn(prismaService.syncConfig, 'findUnique')
        .mockResolvedValue(mockSyncConfig);
      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockResolvedValue(mockSyncResult);
    });

    it('应该成功执行完整的同步流程', async () => {
      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result).toEqual({
        success: true,
        itemsProcessed: 2,
        summary: {
          total: 2,
          synced: 2,
          failed: 0,
          created: 1,
          updated: 1,
          deleted: 0,
          unchanged: 0,
        },
        performance: mockSyncResult.performance,
      });

      // 验证初始状态更新
      expect(updateSyncProgressSpy).toHaveBeenCalledWith({
        syncId: mockSyncId,
        jobId: mockJobId.toString(),
        status: 'RUNNING',
        progress: 0,
        message: 'Starting synchronization...',
      });

      // 验证凭证获取
      expect(userCredentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      // 验证解密操作
      expect(cryptoDecryptSpy).toHaveBeenCalledTimes(2);
      expect(cryptoDecryptSpy).toHaveBeenCalledWith(
        'encrypted-douban-cookie',
        mockUserId,
      );
      expect(cryptoDecryptSpy).toHaveBeenCalledWith(
        'encrypted-feishu-secret',
        mockUserId,
      );

      // 验证豆瓣数据抓取
      expect(doubanFetchUserDataSpy).toHaveBeenCalledTimes(3); // books, movies, tv

      // 验证飞书同步
      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          appId: 'test-app-id',
          appSecret: 'decrypted-feishu-secret',
          appToken: 'test-token',
          tableId: 'test-table',
          dataType: 'books',
          subjectIdField: 'Subject ID',
        }),
        expect.any(Array),
        expect.objectContaining({
          fullSync: false,
          onProgress: expect.any(Function) as unknown as (progress: {
            processed: number;
            total: number;
            phase: string;
          }) => void,
        }),
      );

      // 验证最终成功状态更新
      expect(updateSyncProgressSpy).toHaveBeenLastCalledWith({
        syncId: mockSyncId,
        jobId: mockJobId.toString(),
        status: 'SUCCESS',
        progress: 100,
        message: expect.stringContaining(
          'Sync completed successfully',
        ) as string,
        itemsProcessed: 2,
      });
    });

    it('应该正确处理用户凭证不存在的情况', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Failed to retrieve user credentials');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          message: expect.stringContaining(
            'Failed to retrieve user credentials',
          ) as string,
        }),
      );
    });

    it('应该正确处理解密失败的情况', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      const decryptError = new Error('Decryption failed');
      jest.spyOn(cryptoService, 'decrypt').mockImplementation(() => {
        throw decryptError;
      });

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Failed to retrieve user credentials');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          message: expect.stringContaining(
            'Failed to retrieve user credentials',
          ) as string,
        }),
      );
    });

    it('应该正确处理豆瓣数据抓取失败', async () => {
      const fetchError = new Error('Douban fetch failed');
      const loggerWarnSpy = jest.spyOn(
        (processor as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      );
      jest.spyOn(doubanService, 'fetchUserData').mockRejectedValue(fetchError);

      // 应该继续执行并完成，只记录警告
      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.success).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch books: Douban fetch failed',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch movies: Douban fetch failed',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch tv: Douban fetch failed',
      );

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });

    it('应该正确处理同步配置不存在的情况', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      jest
        .spyOn(prismaService.syncConfig, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Sync configuration not found');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          message: expect.stringContaining(
            'Sync configuration not found',
          ) as string,
        }),
      );
    });

    it('应该正确处理表格映射配置缺失', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      jest.spyOn(prismaService.syncConfig, 'findUnique').mockResolvedValue({
        ...mockSyncConfig,
        tableMappings: null,
      });

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Sync configuration not found');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理空的表格映射', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      jest.spyOn(prismaService.syncConfig, 'findUnique').mockResolvedValue({
        ...mockSyncConfig,
        tableMappings: {} as unknown as JsonValue,
      });

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('No table mappings configured');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理飞书同步失败', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      const syncError = new Error('Feishu sync failed');
      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockRejectedValue(syncError);

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Feishu sync failed');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          error: 'Feishu sync failed',
        }),
      );
    });

    it('应该正确处理非Error类型的异常', async () => {
      // 重置Mock确保前面的测试不会影响这个测试
      jest.clearAllMocks();
      jest.spyOn(syncService, 'updateSyncProgress').mockResolvedValue();
      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockResolvedValue(mockUserCredentials);
      jest
        .spyOn(cryptoService, 'decrypt')
        .mockImplementation((encryptedData: string) => {
          if (encryptedData === 'encrypted-douban-cookie')
            return 'decrypted-douban-cookie';
          if (encryptedData === 'encrypted-feishu-secret')
            return 'decrypted-feishu-secret';
          return 'decrypted-value';
        });

      jest
        .spyOn(doubanService, 'fetchUserData')
        .mockRejectedValue('String error');

      const loggerWarnSpy = jest.spyOn(
        (processor as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      );

      // 应该继续执行并完成，只记录警告
      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.success).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch books: String error',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch movies: String error',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch tv: String error',
      );

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });
  });

  describe('getUserCredentials (通过handleSync间接测试)', () => {
    it('应该成功获取和解密用户凭证', async () => {
      await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(userCredentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      expect(cryptoDecryptSpy).toHaveBeenCalledWith(
        'encrypted-douban-cookie',
        mockUserId,
      );
      expect(cryptoDecryptSpy).toHaveBeenCalledWith(
        'encrypted-feishu-secret',
        mockUserId,
      );
    });

    it('应该正确处理缺失的加密字段', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockResolvedValue({
          ...mockUserCredentials,
          doubanCookieEncrypted: null,
          feishuAppSecretEncrypted: null,
        });

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Feishu App Secret is required for sync operation');

      // 不应该调用decrypt，因为字段为null
      expect(cryptoDecryptSpy).not.toHaveBeenCalled();

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('应该正确处理数据库查询错误', async () => {
      // Mock logger to suppress expected error logs in tests
      const loggerErrorSpy = jest
        .spyOn(
          (processor as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation();

      const dbError = new Error('Database connection failed');
      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockRejectedValue(dbError);

      await expect(
        processor.handleSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('Failed to retrieve user credentials');

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('fetchDoubanData (通过handleSync间接测试)', () => {
    it('应该成功抓取所有分类的数据', async () => {
      await processor.handleSync(mockJob as Job<SyncJobData>);

      // 验证抓取了三个分类
      expect(doubanFetchUserDataSpy).toHaveBeenCalledTimes(3);
      expect(doubanFetchUserDataSpy).toHaveBeenNthCalledWith(1, {
        userId: mockUserId,
        cookie: 'decrypted-douban-cookie',
        category: 'books',
        limit: 100,
      });
      expect(doubanFetchUserDataSpy).toHaveBeenNthCalledWith(2, {
        userId: mockUserId,
        cookie: 'decrypted-douban-cookie',
        category: 'movies',
        limit: 100,
      });
      expect(doubanFetchUserDataSpy).toHaveBeenNthCalledWith(3, {
        userId: mockUserId,
        cookie: 'decrypted-douban-cookie',
        category: 'tv',
        limit: 100,
      });
    });

    it('应该正确处理部分分类抓取失败', async () => {
      jest
        .spyOn(doubanService, 'fetchUserData')
        .mockResolvedValueOnce(mockDoubanData) // books 成功
        .mockRejectedValueOnce(new Error('Movies fetch failed')) // movies 失败
        .mockResolvedValueOnce(mockDoubanData); // tv 成功

      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      // 应该继续执行，即使部分分类失败
      expect(result.success).toBe(true);
      expect(doubanFetchUserDataSpy).toHaveBeenCalledTimes(3);
    });

    it('应该使用自定义的limit参数', async () => {
      const customJob = {
        ...mockJob,
        data: {
          ...mockJobData,
          options: { ...mockJobData.options, limit: 50 },
        },
      };

      await processor.handleSync(customJob as Job<SyncJobData>);

      expect(doubanFetchUserDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        }),
      );
    });

    it('应该使用默认limit当options中没有指定时', async () => {
      const customJob = {
        ...mockJob,
        data: {
          ...mockJobData,
          options: {},
        },
      };

      await processor.handleSync(customJob as Job<SyncJobData>);

      expect(doubanFetchUserDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // 默认值
        }),
      );
    });
  });

  describe('syncToFeishu (通过handleSync间接测试)', () => {
    it('应该成功执行增量同步', async () => {
      await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        mockUserId,
        {
          appId: 'test-app-id',
          appSecret: 'decrypted-feishu-secret',
          appToken: 'test-token',
          tableId: 'test-table',
          dataType: 'books',
          subjectIdField: 'Subject ID',
        },
        expect.any(Array), // 合并后的所有豆瓣数据
        {
          fullSync: false,
          onProgress: expect.any(Function) as unknown as (progress: {
            processed: number;
            total: number;
            phase: string;
          }) => void,
        },
      );
    });

    it('应该正确处理fullSync选项', async () => {
      const fullSyncJob = {
        ...mockJob,
        data: {
          ...mockJobData,
          options: { ...mockJobData.options, fullSync: true },
        },
      };

      await processor.handleSync(fullSyncJob as Job<SyncJobData>);

      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
        expect.objectContaining({
          fullSync: true,
        }),
      );
    });

    it('应该正确处理进度回调', async () => {
      let progressCallback:
        | ((progress: {
            processed: number;
            total: number;
            phase: SyncPhase;
          }) => void)
        | undefined;

      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockImplementation((_userId, _config, _data, options) => {
          progressCallback = options?.onProgress;
          return Promise.resolve(mockSyncResult);
        });

      await processor.handleSync(mockJob as Job<SyncJobData>);

      // 测试进度回调
      expect(progressCallback).toBeDefined();
      if (progressCallback) {
        progressCallback({
          phase: 'create',
          processed: 1,
          total: 2,
        });

        expect(updateSyncProgressSpy).toHaveBeenCalledWith({
          syncId: mockSyncId,
          jobId: mockJobId.toString(),
          status: 'RUNNING',
          progress: 80, // 65 + (1/2) * 30
          message: 'create: 1/2',
        });
      }
    });

    it('应该正确处理复杂的表格映射配置', async () => {
      const complexMappingConfig = {
        ...mockSyncConfig,
        tableMappings: {
          'app-token-1:table-id-1': {
            subjectId: 'Subject ID',
            title: 'Title',
            _metadata: { dataType: 'books' },
          },
        },
      };

      jest
        .spyOn(prismaService.syncConfig, 'findUnique')
        .mockResolvedValue(complexMappingConfig);

      await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          appToken: 'app-token-1',
          tableId: 'table-id-1',
          subjectIdField: 'Subject ID',
        }),
        expect.any(Array),
        expect.any(Object),
      );
    });
  });

  describe('updateProgress (通过handleSync间接测试)', () => {
    it('应该正确更新任务进度', async () => {
      await processor.handleSync(mockJob as Job<SyncJobData>);

      // 验证job.progress被调用
      expect(mockJob.progress).toHaveBeenCalled();

      // 验证进度更新服务被调用多次
      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          syncId: mockSyncId,
          jobId: mockJobId.toString(),
          status: 'RUNNING',
        }),
      );
    });

    it('应该在不同阶段更新不同的进度值', async () => {
      await processor.handleSync(mockJob as Job<SyncJobData>);

      // 验证初始进度
      expect(updateSyncProgressSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          progress: 0,
          message: 'Starting synchronization...',
        }),
      );

      // 验证中间进度更新（会有多次调用）
      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number) as number,
          message: expect.any(String) as string,
        }),
      );

      // 验证最终进度
      expect(updateSyncProgressSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          progress: 100,
          status: 'SUCCESS',
        }),
      );
    });
  });

  describe('私有方法辅助功能', () => {
    describe('createBatches (通过逻辑推断测试)', () => {
      it('应该具备批次创建能力', () => {
        // 由于createBatches是私有方法，我们通过其他测试间接验证批次处理逻辑的存在
        // 这里主要测试处理器能够处理大量数据的情况
        expect(processor).toBeDefined();
        expect(typeof processor['createBatches']).toBe('function');
      });
    });

    describe('delay (通过行为推断测试)', () => {
      it('应该具备延迟功能以避免反爬虫', () => {
        // 验证delay方法存在且为函数
        expect(typeof processor['delay']).toBe('function');

        // 验证delay方法能够被正确调用（通过spy验证）
        const delaySpy = jest.spyOn(
          processor as unknown as { delay: (ms: number) => Promise<void> },
          'delay',
        );

        // 验证delay方法返回Promise
        const delayResult = processor['delay'](1000);
        expect(delayResult).toBeInstanceOf(Promise);

        delaySpy.mockRestore();
      });
    });
  });

  describe('边界条件测试', () => {
    it('应该正确处理空的豆瓣数据', async () => {
      jest.spyOn(doubanService, 'fetchUserData').mockResolvedValue([]);

      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.success).toBe(true);
      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        [], // 空数据数组
        expect.any(Object),
      );
    });

    it('应该正确处理jobId为null的情况', async () => {
      const jobWithoutId = {
        ...mockJob,
        id: null as unknown as number,
      };

      await processor.handleSync(jobWithoutId as unknown as Job<SyncJobData>);

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: undefined,
        }),
      );
    });

    it('应该正确处理jobId为undefined的情况', async () => {
      const jobWithoutId = {
        ...mockJob,
        id: undefined as unknown as number,
      };

      await processor.handleSync(jobWithoutId as unknown as Job<SyncJobData>);

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: undefined,
        }),
      );
    });

    it('应该正确处理复杂的嵌套错误', async () => {
      // 重置Mock确保前面的测试不会影响这个测试
      jest.clearAllMocks();
      jest.spyOn(syncService, 'updateSyncProgress').mockResolvedValue();
      jest
        .spyOn(prismaService.userCredentials, 'findUnique')
        .mockResolvedValue(mockUserCredentials);
      jest
        .spyOn(cryptoService, 'decrypt')
        .mockImplementation((encryptedData: string) => {
          if (encryptedData === 'encrypted-douban-cookie')
            return 'decrypted-douban-cookie';
          if (encryptedData === 'encrypted-feishu-secret')
            return 'decrypted-feishu-secret';
          return 'decrypted-value';
        });

      const nestedError = new Error('Root cause');
      (nestedError as unknown as { cause: Error }).cause = new Error(
        'Nested cause',
      );

      jest.spyOn(doubanService, 'fetchUserData').mockRejectedValue(nestedError);

      const loggerWarnSpy = jest.spyOn(
        (processor as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      );

      // 应该继续执行并完成，只记录警告
      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.success).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch books: Root cause',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch movies: Root cause',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch tv: Root cause',
      );

      expect(updateSyncProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });

    it('应该正确处理表格映射中缺少_metadata的情况', async () => {
      const configWithoutMetadata = {
        ...mockSyncConfig,
        tableMappings: JSON.stringify({
          'test-token:test-table': {
            subjectId: 'Subject ID',
            title: 'Title',
            // 缺少 _metadata
          },
        }),
      };

      jest
        .spyOn(prismaService.syncConfig, 'findUnique')
        .mockResolvedValue(configWithoutMetadata);

      await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          dataType: 'books', // 应该使用默认值
        }),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('应该正确处理极大的数据量', async () => {
      const largeDataSet: DoubanItem[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          subjectId: `${i + 1}`,
          title: `Item ${i + 1}`,
          category: 'books' as const,
          genres: ['Fiction'],
          doubanUrl: `https://book.douban.com/subject/${i + 1}/`,
          userTags: [],
        }),
      );

      jest
        .spyOn(doubanService, 'fetchUserData')
        .mockResolvedValue(largeDataSet);

      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.success).toBe(true);
      expect(syncEnginePerformIncrementalSyncSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.arrayContaining(largeDataSet),
        expect.any(Object),
      );
    });
  });

  describe('同步结果处理', () => {
    it('应该正确计算totalSynced', async () => {
      const customSyncResult = {
        ...mockSyncResult,
        summary: {
          ...mockSyncResult.summary,
          created: 3,
          updated: 2,
        },
      };

      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockResolvedValue(customSyncResult);

      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.itemsProcessed).toBe(5); // 3 + 2
      expect(result.summary.synced).toBe(5);
    });

    it('应该正确传递性能统计信息', async () => {
      const performanceStats = {
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        duration: 300000,
      };

      const syncResultWithPerformance = {
        ...mockSyncResult,
        performance: performanceStats,
      };

      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockResolvedValue(syncResultWithPerformance);

      const result = await processor.handleSync(mockJob as Job<SyncJobData>);

      expect(result.performance).toEqual(performanceStats);
    });
  });
});
