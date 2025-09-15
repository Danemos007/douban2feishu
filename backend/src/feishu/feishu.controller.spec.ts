import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FeishuController } from './feishu.controller';
import { FeishuService } from './feishu.service';
import { FeishuAuthService } from './services/feishu-auth.service';
import { FeishuTableService } from './services/feishu-table.service';
import { FieldMappingService } from './services/field-mapping.service';
import { SyncEngineService } from './services/sync-engine.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

// [TDD-TEST] 尝试导入SyncResult类型 - 这个导入应该失败
import { SyncResult } from '../sync/interfaces/sync.interface';

describe('FeishuController - SyncResult Type Export Issue', () => {
  let controller: FeishuController;
  let syncEngineService: SyncEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      controllers: [FeishuController],
      providers: [
        {
          provide: FeishuService,
          useValue: {
            getTableFields: jest.fn(),
            batchCreateRecords: jest.fn(),
          },
        },
        {
          provide: FeishuAuthService,
          useValue: {
            getAccessToken: jest.fn(),
            validateCredentials: jest.fn(),
            getTokenStats: jest.fn(),
            clearTokenCache: jest.fn(),
          },
        },
        {
          provide: FeishuTableService,
          useValue: {
            getTableFields: jest.fn(),
            batchCreateRecords: jest.fn(),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            getMappingStats: jest.fn(),
            setFieldMappings: jest.fn(),
            autoConfigureFieldMappings: jest.fn(),
            previewFieldMappings: jest.fn(),
          },
        },
        {
          provide: SyncEngineService,
          useValue: {
            performIncrementalSync: jest.fn(),
            getSyncState: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: CryptoService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<FeishuController>(FeishuController);
    syncEngineService = module.get<SyncEngineService>(SyncEngineService);
  });

  describe('performIncrementalSync', () => {
    it('should have correct return type SyncResult', async () => {
      // [TDD-TEST] 验证方法返回类型可以正确赋值给SyncResult类型
      const mockSyncResult: SyncResult = {
        success: true,
        itemsProcessed: 9,
        summary: {
          total: 10,
          synced: 9,
          created: 5,
          updated: 3,
          deleted: 1,
          failed: 0,
          unchanged: 1,
        },
        details: {
          createdRecords: [],
          updatedRecords: [],
          failedRecords: [],
        },
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
        },
      };

      // Mock返回值
      jest
        .spyOn(syncEngineService, 'performIncrementalSync')
        .mockResolvedValue(mockSyncResult);

      const mockUser: AuthenticatedUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        lastSyncAt: null,
      };
      const mockBody = {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        appToken: 'test-app-token',
        tableId: 'test-table-id',
        dataType: 'books' as const,
        subjectIdField: 'Subject ID',
        doubanData: [],
      };

      // [TDD-TEST] 调用方法并验证返回类型
      const result = await controller.performIncrementalSync(
        mockUser,
        mockBody,
      );

      // 类型验证：如果SyncResult没有正确导出，这里会编译失败
      const typedResult: SyncResult = result;

      expect(typedResult.summary.total).toBe(10);
      expect(typedResult.summary.created).toBe(5);
    });
  });
});
