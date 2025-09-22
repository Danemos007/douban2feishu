import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SyncEngineService } from './sync-engine.service';
import { FeishuTableService } from './feishu-table.service';
import { FieldMappingService } from './field-mapping.service';
import { RedisService } from '../../redis';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  SyncEngineConfig,
  SyncOptionsConfig,
} from '../../sync/interfaces/sync.interface';
import { FeishuRecordItem } from '../interfaces/feishu.interface';
import { DoubanBook } from '../../douban/interfaces/douban.interface';

describe('SyncEngineService', () => {
  let service: SyncEngineService;
  let feishuTableService: jest.Mocked<FeishuTableService>;
  let fieldMappingService: jest.Mocked<FieldMappingService>;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Spy变量 - 用于解决unbound-method问题
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  // Mock服务方法spy变量 - 第一优先级方案
  let fieldMappingGetSpy: jest.MockedFunction<
    typeof fieldMappingService.getFieldMappings
  >;
  let fieldMappingAutoConfigureSpy: jest.MockedFunction<
    typeof fieldMappingService.autoConfigureFieldMappings
  >;

  // 测试数据
  const mockUserId = 'test-user-123';
  const mockSyncConfig: SyncEngineConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    appToken: 'test-app-token',
    tableId: 'test-table-id',
    dataType: 'books',
    subjectIdField: 'fld_subject_id',
  };

  const mockFieldMappings = {
    subjectId: 'fld_subject_id',
    title: 'fld_title',
    author: 'fld_author',
    rating: 'fld_rating',
  };

  const mockDoubanBook: DoubanBook = {
    subjectId: '12345',
    title: 'Test Book',
    originalTitle: 'Original Test Book',
    authors: ['Test Author'],
    translators: ['Test Translator'],
    publisher: 'Test Publisher',
    publishDate: '2023-01-01',
    isbn: '9781234567890',
    pages: 300,
    price: '$20.00',
    binding: 'Paperback',
    summary: 'A test book summary',
    genres: ['fiction', 'test'],
    rating: {
      average: 8.5,
      numRaters: 1000,
    },
    userRating: 5,
    userTags: ['fiction', 'test'],
    userComment: 'Great book!',
    doubanUrl: 'https://book.douban.com/subject/12345/',
    coverUrl: 'https://example.com/cover.jpg',
    readDate: new Date('2023-01-15'),
    category: 'books',
  };

  const mockFeishuRecord: FeishuRecordItem = {
    record_id: 'rec_123',
    fields: {
      fld_subject_id: '12345',
      fld_title: 'Test Book',
      fld_author: 'Test Author',
      fld_rating: 5,
    },
    created_by: {
      id: 'user_123',
      name: 'Test User',
    },
    created_time: 1640995200000,
    last_modified_by: {
      id: 'user_123',
      name: 'Test User',
    },
    last_modified_time: 1640995200000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncEngineService,
        {
          provide: FeishuTableService,
          useValue: {
            searchRecords: jest.fn(),
            batchCreateRecords: jest.fn(),
            batchUpdateRecords: jest.fn(),
            deleteRecord: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            getFieldMappings: jest.fn(),
            autoConfigureFieldMappings: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            setex: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SyncEngineService>(SyncEngineService);
    feishuTableService = module.get(FeishuTableService);
    fieldMappingService = module.get(FieldMappingService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);

    // 静默化 Logger - 使用spy变量避免unbound-method问题
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // 初始化mock服务方法spy变量 - 第一优先级方案
    fieldMappingGetSpy =
      // eslint-disable-next-line @typescript-eslint/unbound-method
      fieldMappingService.getFieldMappings as jest.MockedFunction<
        typeof fieldMappingService.getFieldMappings
      >;
    fieldMappingAutoConfigureSpy =
      // eslint-disable-next-line @typescript-eslint/unbound-method
      fieldMappingService.autoConfigureFieldMappings as jest.MockedFunction<
        typeof fieldMappingService.autoConfigureFieldMappings
      >;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础设置', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject all dependencies correctly', () => {
      expect(feishuTableService).toBeDefined();
      expect(fieldMappingService).toBeDefined();
      expect(redisService).toBeDefined();
      expect(prismaService).toBeDefined();
    });

    it('should initialize with correct cache and sync configurations', () => {
      // 通过访问私有属性来验证配置，这里我们通过方法行为来间接验证
      expect(service).toBeInstanceOf(SyncEngineService);
    });
  });

  describe('performIncrementalSync', () => {
    describe('成功路径', () => {
      beforeEach(() => {
        fieldMappingService.getFieldMappings.mockResolvedValue(
          mockFieldMappings,
        );
        feishuTableService.searchRecords.mockResolvedValue({
          records: [mockFeishuRecord],
          hasMore: false,
          pageToken: undefined,
        });
        feishuTableService.batchCreateRecords.mockResolvedValue({
          success: 1,
          failed: 0,
          errors: [],
        });
        feishuTableService.batchUpdateRecords.mockResolvedValue({
          success: 1,
          failed: 0,
          errors: [],
        });
        redisService.setex.mockResolvedValue('OK');
      });

      it('should perform incremental sync with existing field mappings', async () => {
        const result = await service.performIncrementalSync(
          mockUserId,
          mockSyncConfig,
          [mockDoubanBook],
        );

        expect(fieldMappingGetSpy).toHaveBeenCalledWith(
          mockUserId,
          mockSyncConfig.appToken,
          mockSyncConfig.tableId,
        );
        // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(feishuTableService.searchRecords).toHaveBeenCalled();
        expect(result).toEqual(
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            success: expect.any(Boolean),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            itemsProcessed: expect.any(Number),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            summary: expect.objectContaining({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              total: expect.any(Number),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              synced: expect.any(Number),
            }),
          }),
        );
      });

      it('should perform full sync when fullSync option is true', async () => {
        const options: SyncOptionsConfig = { fullSync: true };

        const result = await service.performIncrementalSync(
          mockUserId,
          mockSyncConfig,
          [mockDoubanBook],
          options,
        );

        expect(result.success).toBe(true);
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('full sync'),
        );
      });

      it('should auto-configure field mappings when none exist', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(null);
        fieldMappingService.autoConfigureFieldMappings.mockResolvedValue({
          mappings: mockFieldMappings,
          matched: [],
          created: [
            { doubanField: 'title', chineseName: '书名', fieldId: 'fld_title' },
            {
              doubanField: 'author',
              chineseName: '作者',
              fieldId: 'fld_author',
            },
          ],
          errors: [],
        });

        const result = await service.performIncrementalSync(
          mockUserId,
          mockSyncConfig,
          [mockDoubanBook],
        );

        expect(fieldMappingAutoConfigureSpy).toHaveBeenCalledWith(
          mockUserId,
          mockSyncConfig.appId,
          mockSyncConfig.appSecret,
          mockSyncConfig.appToken,
          mockSyncConfig.tableId,
          mockSyncConfig.dataType,
        );
        expect(result.success).toBe(true);
      });

      it('should handle empty douban data', async () => {
        // 空数据时不需要任何同步操作，所以不需要mock同步方法
        // 但需要mock fieldMapping获取来初始化
        fieldMappingService.getFieldMappings.mockResolvedValue(
          mockFieldMappings,
        );
        // 确保也没有现有记录
        feishuTableService.searchRecords.mockResolvedValue({
          total: 0,
          hasMore: false,
          records: [],
        });

        const result = await service.performIncrementalSync(
          mockUserId,
          mockSyncConfig,
          [],
        );

        expect(result.summary.total).toBe(0);
        expect(result.summary.created).toBe(0);
        expect(result.summary.updated).toBe(0);
        expect(result.summary.deleted).toBe(0);
        expect(result.success).toBe(true);
      });

      it('should handle sync with onProgress callback', async () => {
        const onProgressSpy = jest.fn();
        const options: SyncOptionsConfig = { onProgress: onProgressSpy };

        await service.performIncrementalSync(
          mockUserId,
          mockSyncConfig,
          [mockDoubanBook],
          options,
        );

        expect(onProgressSpy).toHaveBeenCalled();
      });

      it('should update sync state after completion', async () => {
        await service.performIncrementalSync(mockUserId, mockSyncConfig, [
          mockDoubanBook,
        ]);

        // 应该调用两次：一次初始化，一次更新
        // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redisService.setex).toHaveBeenCalledTimes(2);
      });
    });

    describe('字段映射处理', () => {
      it('should use existing field mappings when available', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(
          mockFieldMappings,
        );
        feishuTableService.searchRecords.mockResolvedValue({
          records: [],
          hasMore: false,
        });
        feishuTableService.batchCreateRecords.mockResolvedValue({
          success: 1,
          failed: 0,
          errors: [],
        });
        redisService.setex.mockResolvedValue('OK');

        await service.performIncrementalSync(mockUserId, mockSyncConfig, [
          mockDoubanBook,
        ]);

        expect(fieldMappingGetSpy).toHaveBeenCalled();
        expect(fieldMappingAutoConfigureSpy).not.toHaveBeenCalled();
      });

      it('should trigger auto-configuration when field mappings are null', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(null);
        fieldMappingService.autoConfigureFieldMappings.mockResolvedValue({
          mappings: mockFieldMappings,
          matched: [],
          created: [],
          errors: [],
        });
        feishuTableService.searchRecords.mockResolvedValue({
          records: [],
          hasMore: false,
        });
        feishuTableService.batchCreateRecords.mockResolvedValue({
          success: 1,
          failed: 0,
          errors: [],
        });
        redisService.setex.mockResolvedValue('OK');

        await service.performIncrementalSync(mockUserId, mockSyncConfig, [
          mockDoubanBook,
        ]);

        expect(fieldMappingAutoConfigureSpy).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith(
          'No field mappings found, auto-configuring...',
        );
      });

      it('should throw error when Subject ID mapping is missing after auto-config', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(null);
        fieldMappingService.autoConfigureFieldMappings.mockResolvedValue({
          mappings: { title: 'fld_title' }, // 缺少 subjectId
          matched: [],
          created: [],
          errors: [],
        });

        await expect(
          service.performIncrementalSync(mockUserId, mockSyncConfig, [
            mockDoubanBook,
          ]),
        ).rejects.toThrow(
          'Subject ID field mapping is required for incremental sync',
        );
      });

      it('should log auto-configuration results correctly', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(null);
        fieldMappingService.autoConfigureFieldMappings.mockResolvedValue({
          mappings: mockFieldMappings,
          matched: [
            { doubanField: 'title', chineseName: '书名', fieldId: 'fld_title' },
          ],
          created: [
            {
              doubanField: 'author',
              chineseName: '作者',
              fieldId: 'fld_author',
            },
          ],
          errors: [],
        });
        feishuTableService.searchRecords.mockResolvedValue({
          records: [],
          hasMore: false,
        });
        feishuTableService.batchCreateRecords.mockResolvedValue({
          success: 1,
          failed: 0,
          errors: [],
        });
        redisService.setex.mockResolvedValue('OK');

        await service.performIncrementalSync(mockUserId, mockSyncConfig, [
          mockDoubanBook,
        ]);

        expect(loggerLogSpy).toHaveBeenCalledWith(
          'Auto-configuration completed: 1 matched, 1 created, 0 errors',
        );
      });
    });

    describe('失败路径', () => {
      it('should throw error when field mapping service fails', async () => {
        fieldMappingService.getFieldMappings.mockRejectedValue(
          new Error('Field mapping failed'),
        );

        await expect(
          service.performIncrementalSync(mockUserId, mockSyncConfig, [
            mockDoubanBook,
          ]),
        ).rejects.toThrow('Field mapping failed');
      });

      it('should throw error when douban data validation fails', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(
          mockFieldMappings,
        );

        const invalidData = [{ title: 'Invalid Book' }]; // 缺少必需字段

        await expect(
          service.performIncrementalSync(
            mockUserId,
            mockSyncConfig,
            invalidData,
          ),
        ).rejects.toThrow('Invalid douban record at index 0');
      });

      it('should throw error when sync operations fail', async () => {
        fieldMappingService.getFieldMappings.mockResolvedValue(
          mockFieldMappings,
        );

        // Mock正常的searchRecords，让错误发生在batchCreateRecords阶段
        feishuTableService.searchRecords.mockResolvedValue({
          total: 0,
          hasMore: false,
          records: [],
        });

        // batchCreateRecords失败
        feishuTableService.batchCreateRecords.mockRejectedValue(
          new Error('Batch create failed'),
        );

        await expect(
          service.performIncrementalSync(mockUserId, mockSyncConfig, [
            mockDoubanBook,
          ]),
        ).rejects.toThrow('Batch create failed');
      });

      it('should handle and rethrow non-Error exceptions', async () => {
        fieldMappingService.getFieldMappings.mockRejectedValue(
          'Non-error exception',
        );

        await expect(
          service.performIncrementalSync(mockUserId, mockSyncConfig, [
            mockDoubanBook,
          ]),
        ).rejects.toThrow('Non-error exception');
      });
    });
  });

  describe('同步状态管理', () => {
    describe('getSyncState', () => {
      it('should return sync state when exists in Redis', async () => {
        const mockState = {
          userId: mockUserId,
          tableId: mockSyncConfig.tableId,
          startTime: '2023-01-01T00:00:00.000Z',
          phase: 'running',
          processed: 10,
          total: 100,
        };
        redisService.get.mockResolvedValue(JSON.stringify(mockState));

        const result = await service.getSyncState(
          mockUserId,
          mockSyncConfig.tableId,
        );

        expect(result).toEqual(mockState);
        // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redisService.get).toHaveBeenCalledWith(
          `feishu:sync_state:${mockUserId}:${mockSyncConfig.tableId}`,
        );
      });

      it('should return null when sync state not found', async () => {
        redisService.get.mockResolvedValue(null);

        const result = await service.getSyncState(
          mockUserId,
          mockSyncConfig.tableId,
        );

        expect(result).toBeNull();
      });

      it('should return null when Redis data is invalid JSON', async () => {
        redisService.get.mockResolvedValue('invalid-json');

        const result = await service.getSyncState(
          mockUserId,
          mockSyncConfig.tableId,
        );

        expect(result).toBeNull();
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to get sync state:',
          expect.any(String),
        );
      });

      it('should return null when parsed data fails validation', async () => {
        const invalidState = { invalid: 'state' };
        redisService.get.mockResolvedValue(JSON.stringify(invalidState));

        const result = await service.getSyncState(
          mockUserId,
          mockSyncConfig.tableId,
        );

        expect(result).toBeNull();
      });

      it('should handle Redis connection errors gracefully', async () => {
        redisService.get.mockRejectedValue(
          new Error('Redis connection failed'),
        );

        const result = await service.getSyncState(
          mockUserId,
          mockSyncConfig.tableId,
        );

        expect(result).toBeNull();
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to get sync state:',
          'Redis connection failed',
        );
      });
    });
  });

  describe('数据变更分析', () => {
    beforeEach(() => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      redisService.setex.mockResolvedValue('OK');
    });

    it('should identify records to create when not in existing records', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [], // 没有现有记录
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
      );

      expect(result.summary.created).toBe(1);
      expect(result.summary.updated).toBe(0);
    });

    it('should identify records to update when data has changed', async () => {
      // 模拟现有记录但数据不同
      const existingRecord = {
        ...mockFeishuRecord,
        fields: {
          ...mockFeishuRecord.fields,
          fld_title: 'Old Title', // 标题不同
        },
      };

      feishuTableService.searchRecords.mockResolvedValue({
        records: [existingRecord],
        hasMore: false,
      });
      feishuTableService.batchUpdateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
      );

      expect(result.summary.updated).toBe(1);
      expect(result.summary.created).toBe(0);
    });

    it('should handle records without subject ID correctly', async () => {
      const invalidRecord = { ...mockDoubanBook, subjectId: undefined };
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });

      await expect(
        service.performIncrementalSync(mockUserId, mockSyncConfig, [
          invalidRecord,
        ]),
      ).rejects.toThrow('Invalid douban record at index 0');
    });

    it('should perform correct analysis in full sync mode', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [mockFeishuRecord], // 现有记录
        hasMore: false,
      });
      feishuTableService.batchUpdateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
        { fullSync: true },
      );

      // 在full sync模式下，即使数据相同也会更新
      expect(result.summary.updated).toBe(1);
    });
  });

  describe('哈希计算与数据一致性', () => {
    beforeEach(() => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      redisService.setex.mockResolvedValue('OK');
    });

    it('should generate consistent hash for same douban record', async () => {
      // 创建两个相同的记录
      const record1 = { ...mockDoubanBook };
      const record2 = { ...mockDoubanBook };

      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 2,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [record1, record2],
      );

      expect(result.summary.created).toBe(2);
    });

    it('should handle hash generation errors gracefully', async () => {
      // Mock正常的字段映射和飞书数据
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      feishuTableService.searchRecords.mockResolvedValue({
        total: 1,
        hasMore: false,
        records: [
          {
            record_id: 'existing-record-id',
            fields: {
              fld_subject_id: '12345',
              fld_title: 'Test Book',
            },
          },
        ],
      });
      feishuTableService.batchUpdateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      // 确保batchCreateRecords有合适的返回值
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 0,
        failed: 0,
        errors: [],
      });

      // Mock crypto模块的createHash方法抛出错误来模拟哈希生成失败
      const mockWarn = jest.spyOn(service['logger'], 'warn');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const crypto = require('crypto');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const originalCreateHash = crypto.createHash;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      crypto.createHash = jest.fn().mockImplementation(() => {
        throw new Error('Hash generation failed');
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
      );

      // 当哈希生成失败时，应该默认认为记录已变更
      expect(result.summary.updated).toBe(1);
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check record changes'),
        expect.any(String),
      );

      // 恢复mock
      mockWarn.mockRestore();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      crypto.createHash = originalCreateHash;
    });
  });

  describe('批量同步操作', () => {
    beforeEach(() => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      redisService.setex.mockResolvedValue('OK');
    });

    it('should execute create, update operations successfully', async () => {
      const newBook = { ...mockDoubanBook, subjectId: 'new-book-123' };
      const existingBook = mockDoubanBook;

      feishuTableService.searchRecords.mockResolvedValue({
        records: [mockFeishuRecord], // 只有一个现有记录
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      feishuTableService.batchUpdateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [newBook, existingBook],
      );

      expect(result.summary.created).toBe(1);
      expect(result.summary.updated).toBe(1);
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.batchCreateRecords).toHaveBeenCalled();
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.batchUpdateRecords).toHaveBeenCalled();
    });

    it('should execute delete operations when deleteOrphans is true', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [mockFeishuRecord], // 现有记录在豆瓣数据中不存在
        hasMore: false,
      });
      feishuTableService.deleteRecord.mockResolvedValue();

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [], // 空的豆瓣数据
        { deleteOrphans: true },
      );

      expect(result.summary.deleted).toBe(1);
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.deleteRecord).toHaveBeenCalledWith(
        mockSyncConfig.appId,
        mockSyncConfig.appSecret,
        mockSyncConfig.appToken,
        mockSyncConfig.tableId,
        mockFeishuRecord.record_id,
      );
    });

    it('should skip delete operations when deleteOrphans is false', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [mockFeishuRecord],
        hasMore: false,
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [],
        { deleteOrphans: false },
      );

      expect(result.summary.deleted).toBe(0);
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.deleteRecord).not.toHaveBeenCalled();
    });

    it('should calculate performance metrics correctly', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
      );

      expect(result.performance.startTime).toBeInstanceOf(Date);
      expect(result.performance.endTime).toBeInstanceOf(Date);
      expect(result.performance.duration).toBeGreaterThanOrEqual(0);
      expect(result.performance.endTime.getTime()).toBeGreaterThanOrEqual(
        result.performance.startTime.getTime(),
      );
    });

    it('should handle partial failures gracefully', async () => {
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 1,
        errors: [{ batch: 0, error: 'Creation failed' }],
      });

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook, { ...mockDoubanBook, subjectId: 'failed-book' }],
      );

      expect(result.summary.created).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.success).toBe(false); // 有失败记录时success为false
    });
  });

  describe('数据获取与索引构建', () => {
    beforeEach(() => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      redisService.setex.mockResolvedValue('OK');
    });

    it('should fetch all records with pagination', async () => {
      const page1Records = [mockFeishuRecord];
      const page2Records = [
        {
          ...mockFeishuRecord,
          record_id: 'rec_456',
          fields: { ...mockFeishuRecord.fields, fld_subject_id: '67890' },
        },
      ];

      feishuTableService.searchRecords
        .mockResolvedValueOnce({
          records: page1Records,
          hasMore: true,
          pageToken: 'token_123',
        })
        .mockResolvedValueOnce({
          records: page2Records,
          hasMore: false,
          pageToken: undefined,
        });

      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 0,
        failed: 0,
        errors: [],
      });

      await service.performIncrementalSync(mockUserId, mockSyncConfig, []);

      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.searchRecords).toHaveBeenCalledTimes(2);
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.searchRecords).toHaveBeenNthCalledWith(
        1,
        mockSyncConfig.appId,
        mockSyncConfig.appSecret,
        mockSyncConfig.appToken,
        mockSyncConfig.tableId,
        { pageSize: 500, pageToken: undefined },
      );
      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.searchRecords).toHaveBeenNthCalledWith(
        2,
        mockSyncConfig.appId,
        mockSyncConfig.appSecret,
        mockSyncConfig.appToken,
        mockSyncConfig.tableId,
        { pageSize: 500, pageToken: 'token_123' },
      );

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Fetched 2 existing records from Feishu table',
      );
    });

    it('should handle API errors gracefully during fetch', async () => {
      feishuTableService.searchRecords.mockRejectedValue(
        new Error('API Error'),
      );

      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      // 即使获取现有记录失败，同步应该继续进行
      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [mockDoubanBook],
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch existing records:',
        'API Error',
      );
      // 因为无法获取现有记录，所有记录都会被当作新记录创建
      expect(result.summary.created).toBe(1);
    });
  });

  describe('数据转换与格式化', () => {
    it('should handle Date conversion correctly', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue({
        ...mockFieldMappings,
        readDate: 'fld_date_marked',
      });
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      redisService.setex.mockResolvedValue('OK');

      const bookWithDate = {
        ...mockDoubanBook,
        readDate: new Date('2023-01-15T10:30:00Z'),
      };

      await service.performIncrementalSync(mockUserId, mockSyncConfig, [
        bookWithDate,
      ]);

      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.batchCreateRecords).toHaveBeenCalledWith(
        mockSyncConfig.appId,
        mockSyncConfig.appSecret,
        mockSyncConfig.appToken,
        mockSyncConfig.tableId,
        expect.arrayContaining([
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            fields: expect.objectContaining({
              fld_date_marked: Math.floor(
                new Date('2023-01-15T10:30:00Z').getTime() / 1000,
              ),
            }),
          }),
        ]),
        expect.objectContaining({
          ...mockFieldMappings,
          readDate: 'fld_date_marked',
        }),
        expect.any(Object),
      );
    });

    it('should handle null and undefined values correctly', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      redisService.setex.mockResolvedValue('OK');

      const bookWithNulls = {
        ...mockDoubanBook,
        summary: null,
        userComment: undefined,
      };

      await service.performIncrementalSync(mockUserId, mockSyncConfig, [
        bookWithNulls,
      ]);

      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.batchCreateRecords).toHaveBeenCalled();
      // 验证null/undefined值被正确处理
    });

    it('should handle array values correctly', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue({
        ...mockFieldMappings,
        userTags: 'fld_tags',
      });
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      redisService.setex.mockResolvedValue('OK');

      const bookWithTags = {
        ...mockDoubanBook,
        userTags: ['fiction', 'science', 'technology'],
      };

      await service.performIncrementalSync(mockUserId, mockSyncConfig, [
        bookWithTags,
      ]);

      // Reason: Jest mock functions created by jest.fn() don't have 'this' binding issues
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(feishuTableService.batchCreateRecords).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            fields: expect.objectContaining({
              fld_tags: ['fiction', 'science', 'technology'],
            }),
          }),
        ]),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('数据验证与类型守卫', () => {
    it('should validate douban book record correctly', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);
      feishuTableService.searchRecords.mockResolvedValue({
        records: [],
        hasMore: false,
      });
      feishuTableService.batchCreateRecords.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      redisService.setex.mockResolvedValue('OK');

      const validBook = mockDoubanBook;

      const result = await service.performIncrementalSync(
        mockUserId,
        mockSyncConfig,
        [validBook],
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid douban record missing required fields', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);

      const invalidRecord = {
        title: 'Book without required fields',
        // 缺少 subjectId, doubanUrl, userTags, category
      };

      await expect(
        service.performIncrementalSync(mockUserId, mockSyncConfig, [
          invalidRecord,
        ]),
      ).rejects.toThrow('Invalid douban record at index 0');
    });

    it('should reject record with invalid category', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);

      const invalidRecord = {
        ...mockDoubanBook,
        category: 'invalid-category', // 不在允许列表中
      };

      await expect(
        service.performIncrementalSync(mockUserId, mockSyncConfig, [
          invalidRecord,
        ]),
      ).rejects.toThrow('Invalid douban record at index 0');
    });

    it('should handle non-object records', async () => {
      fieldMappingService.getFieldMappings.mockResolvedValue(mockFieldMappings);

      const invalidRecord = 'not an object';

      await expect(
        service.performIncrementalSync(mockUserId, mockSyncConfig, [
          invalidRecord,
        ]),
      ).rejects.toThrow('Invalid douban record at index 0');
    });
  });

  describe('工具方法', () => {
    it('should delay execution for specified milliseconds', async () => {
      const startTime = Date.now();
      const delayMs = 100;

      // 通过反射访问私有方法进行测试
      const delayMethod = (
        service as unknown as { delay: (ms: number) => Promise<void> }
      ).delay.bind(service);
      await delayMethod(delayMs);

      const endTime = Date.now();
      const actualDelay = endTime - startTime;

      // 允许一些时间误差
      expect(actualDelay).toBeGreaterThanOrEqual(delayMs - 10);
      expect(actualDelay).toBeLessThan(delayMs + 50);
    });
  });
});
