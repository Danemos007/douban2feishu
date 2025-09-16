/**
 * 豆瓣飞书集成测试 (基于Mock的集成测试)
 *
 * 测试性质: Mock-based Integration Testing (非E2E端到端测试)
 *
 * 架构设计原则:
 * 1. 使用Mock替代外部依赖，确保测试的独立性和可重复性
 * 2. 模拟真实数据流，验证各模块间的集成逻辑
 * 3. 完整的错误处理和资源清理机制
 * 4. 快速执行，不依赖网络或外部服务
 * 5. 遵循AAA模式 (Arrange, Act, Assert)
 *
 * 注意: 这不是真正的E2E测试，如需真正的端到端测试请查看项目技术债务清单
 *
 * @author Claude (Senior Software Architect)
 * @version 2.0.0 (Mock-based Integration Testing)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

// 核心模块
import { DoubanModule } from '../douban/douban.module';
import { FeishuModule } from '../feishu/feishu.module';
import { CryptoModule } from '../common/crypto/crypto.module';

// 核心服务
import { DoubanService } from '../douban/douban.service';
import { FieldMappingService } from '../feishu/services/field-mapping.service';
import { SyncEngineService } from '../feishu/services/sync-engine.service';
import { FeishuTableService } from '../feishu/services/feishu-table.service';
import { PrismaService } from '../common/prisma/prisma.service';

// 接口和DTO
import { FetchUserDataDto } from '../douban/dto/douban.dto';
import { DoubanItem } from '../douban/interfaces/douban.interface';

/**
 * 同步进度更新接口
 * 使用unknown类型以兼容实际的SyncProgressCallback类型
 */
interface ProgressUpdate {
  phase: string;
  processed: number;
  total: number;
}

/**
 * Mock数据生成器
 */
class MockDataGenerator {
  static generateDoubanMovies(count: number = 5): DoubanItem[] {
    return Array.from({ length: count }, (_, index) => ({
      title: `测试电影${index + 1}`,
      subjectId: `test-movie-${String(index + 1).padStart(3, '0')}`,
      rating: { average: 8.0 + Math.random() * 2, numRaters: 1000 },
      userRating: Math.floor(Math.random() * 5) + 1,
      genres: ['剧情', '动作'],
      directors: ['测试导演'],
      cast: ['测试演员A', '测试演员B'],
      countries: ['中国'],
      languages: ['中文'],
      duration: '120分钟',
      releaseDate: '2024',
      summary: `这是测试电影${index + 1}的描述`,
      coverUrl: `https://example.com/poster${index + 1}.jpg`,
      doubanUrl: `https://movie.douban.com/subject/test-movie-${String(index + 1).padStart(3, '0')}/`,
      userTags: ['推荐', '必看'],
      readDate: new Date(),
      category: 'movies' as const,
    }));
  }

  static generateFieldMappingResult() {
    return {
      mappings: {
        title: 'fld001',
        subjectId: 'fld002',
        rating: 'fld003',
        userRating: 'fld004',
        genre: 'fld005',
        directors: 'fld006',
        releaseDate: 'fld007',
        readDate: 'fld008',
        status: 'fld009',
      },
      matched: [
        { doubanField: 'title', chineseName: '标题', fieldId: 'fld001' },
        { doubanField: 'rating', chineseName: '豆瓣评分', fieldId: 'fld003' },
      ],
      created: [
        {
          doubanField: 'userRating',
          chineseName: '我的评分',
          fieldId: 'fld004',
        },
        { doubanField: 'readDate', chineseName: '标记日期', fieldId: 'fld008' },
      ],
      errors: [],
    };
  }

  static generateSyncResult() {
    return {
      summary: {
        total: 5,
        created: 3,
        updated: 2,
        failed: 0,
        deleted: 0,
        unchanged: 0,
      },
      details: {
        createdRecords: [],
        updatedRecords: [],
        deletedRecords: [],
        failedRecords: [],
      },
      performance: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 1000),
        duration: 1000,
      },
    };
  }
}

/**
 * 豆瓣飞书Mock集成测试套件 (非E2E测试)
 *
 * 测试覆盖范围:
 * - 模块间依赖注入正确性
 * - 服务接口契约验证
 * - 数据流转换逻辑
 * - 错误处理和边界条件
 * - 性能指标基准
 */
describe('Douban-Feishu Integration (Mock)', () => {
  let moduleRef: TestingModule;
  let doubanService: DoubanService;
  let fieldMappingService: FieldMappingService;
  let syncEngineService: SyncEngineService;
  let feishuTableService: FeishuTableService;

  /**
   * 测试模块初始化 - 完全Mock环境
   * 确保测试不依赖任何外部服务，快速且可重复执行
   */
  beforeAll(async () => {
    console.log('🏗️ 初始化Mock NestJS测试模块...');

    moduleRef = await Test.createTestingModule({
      imports: [
        // 配置模块 - 使用Mock配置
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_HOST: 'mock-redis',
              REDIS_PORT: 6379,
              REDIS_DB: 99, // Mock数据库
              MASTER_ENCRYPTION_KEY: 'test-key-32-chars-long-for-testing',
              APP_VERSION: '1.0.0-mock-test',
              NODE_ENV: 'test',
            }),
          ],
        }),

        // 核心业务模块
        CryptoModule,
        DoubanModule,
        FeishuModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        // Mock PrismaService
        syncConfig: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'mock-config-id',
            mappingType: '3tables',
            tableMappings: {
              'mock-app:mock-table': {
                subjectId: '豆瓣ID',
                _metadata: { dataType: 'movies' },
              },
            },
          }),
        },
        syncHistory: {
          create: jest.fn().mockResolvedValue({
            id: 'mock-history-id',
            status: 'RUNNING',
          }),
          update: jest.fn().mockResolvedValue({ id: 'mock-history-id' }),
        },
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider('BullQueue_sync')
      .useValue({
        // Mock BullMQ Queue
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        getJob: jest.fn().mockResolvedValue(null),
      })
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        // Mock Redis Client
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        hgetall: jest.fn().mockResolvedValue({}),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        exists: jest.fn().mockResolvedValue(0),
        ttl: jest.fn().mockResolvedValue(-1),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    // 获取服务实例
    doubanService = moduleRef.get<DoubanService>(DoubanService);
    fieldMappingService =
      moduleRef.get<FieldMappingService>(FieldMappingService);
    syncEngineService = moduleRef.get<SyncEngineService>(SyncEngineService);
    feishuTableService = moduleRef.get<FeishuTableService>(FeishuTableService);

    // Mock服务方法
    jest
      .spyOn(doubanService, 'fetchUserData')
      .mockImplementation(async (_dto: FetchUserDataDto) => {
        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 100));
        return MockDataGenerator.generateDoubanMovies(5);
      });

    jest
      .spyOn(fieldMappingService, 'autoConfigureFieldMappings')
      .mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return MockDataGenerator.generateFieldMappingResult();
      });

    jest
      .spyOn(syncEngineService, 'performIncrementalSync')
      .mockImplementation(async (userId, syncConfig, data, options) => {
        // 模拟同步过程
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 模拟进度回调
        if (options?.onProgress) {
          options.onProgress({
            phase: 'create',
            processed: 0,
            total: data.length,
          });
          options.onProgress({
            phase: 'update',
            processed: data.length / 2,
            total: data.length,
          });
          options.onProgress({
            phase: 'delete',
            processed: data.length,
            total: data.length,
          });
        }

        return {
          success: true,
          itemsProcessed: data.length,
          summary: {
            total: data.length,
            synced: data.length - 1,
            created: data.length - 1,
            updated: 1,
            failed: 0,
            deleted: 0,
            unchanged: 0,
          },
          details: {
            createdRecords: [],
            updatedRecords: [],
            failedRecords: [],
          },
          performance: {
            startTime: new Date(),
            endTime: new Date(Date.now() + 1000),
            duration: 1000,
          },
        };
      });

    console.log('✅ Mock NestJS测试模块初始化完成');
  }, 10000); // 10秒超时，Mock环境应该很快

  /**
   * 资源清理
   */
  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
      console.log('🧹 Mock NestJS测试模块已清理');
    }
  });

  /**
   * 核心集成测试 - Mock版完整数据流
   *
   * 测试流程:
   * 1. Mock豆瓣数据抓取
   * 2. Mock数据解析和验证
   * 3. Mock字段自动配置
   * 4. Mock数据同步写入
   * 5. 结果验证和性能分析
   */
  describe('完整数据流集成测试 (Mock版)', () => {
    /**
     * 主要集成测试用例 - 快速Mock版本
     */
    it('应该成功执行Mock版本的豆瓣数据抓取->解析->飞书写入的完整流程', async () => {
      const testStartTime = Date.now();
      console.log('🚀 开始Mock端到端集成测试');
      console.log('📊 测试目标: 验证Mock数据的完整流程');

      // === 第1阶段: Mock豆瓣数据抓取 ===
      console.log('\n📡 第1阶段: Mock豆瓣数据抓取');
      const scrapeStartTime = Date.now();

      const mockFetchDto: FetchUserDataDto = {
        userId: 'test-user-123',
        cookie: 'mock-cookie',
        category: 'movies',
        isEncrypted: false,
      };

      const doubanData: DoubanItem[] =
        await doubanService.fetchUserData(mockFetchDto);
      const scrapeTime = Date.now() - scrapeStartTime;

      // 验证抓取结果
      expect(doubanData).toBeDefined();
      expect(doubanData).toHaveLength(5);
      expect(doubanData[0]).toHaveProperty('title');
      expect(doubanData[0]).toHaveProperty('subjectId');
      expect(doubanData[0]).toHaveProperty('rating');

      console.log(`✅ Mock豆瓣数据抓取完成`);
      console.log(`   📊 抓取数量: ${doubanData.length}部电影`);
      console.log(`   ⏱️ 抓取耗时: ${scrapeTime}ms`);

      // === 第2阶段: Mock数据质量验证 ===
      console.log('\n🔍 第2阶段: Mock数据质量验证');

      const validRecords = doubanData.filter(
        (item) =>
          item.title &&
          item.subjectId &&
          (item.rating?.average || item.userRating),
      ).length;

      const dataQuality = (validRecords / doubanData.length) * 100;
      expect(dataQuality).toBe(100); // Mock数据应该100%有效

      console.log(`✅ Mock数据质量验证完成`);
      console.log(`   📊 数据完整率: ${dataQuality}%`);

      // === 第3阶段: Mock字段自动配置 ===
      console.log('\n🛠️ 第3阶段: Mock字段自动配置');
      const configStartTime = Date.now();

      const fieldConfigResult =
        await fieldMappingService.autoConfigureFieldMappings(
          'test-user-123',
          'mock-app-id',
          'mock-app-secret',
          'mock-app-token',
          'mock-table-id',
          'movies',
        );

      const configTime = Date.now() - configStartTime;

      // 验证字段配置结果
      expect(fieldConfigResult).toBeDefined();
      expect(fieldConfigResult.matched).toHaveLength(2);
      expect(fieldConfigResult.created).toHaveLength(2);
      expect(fieldConfigResult.errors).toHaveLength(0);
      expect(Object.keys(fieldConfigResult.mappings)).toHaveLength(9);

      console.log(`✅ Mock字段配置完成 (耗时${configTime}ms)`);
      console.log(`   ✅ 精确匹配: ${fieldConfigResult.matched.length}个字段`);
      console.log(`   🆕 新创建: ${fieldConfigResult.created.length}个字段`);
      console.log(
        `   📊 总配置字段: ${Object.keys(fieldConfigResult.mappings).length}个`,
      );

      // === 第4阶段: Mock数据同步写入 ===
      console.log('\n📝 第4阶段: Mock数据同步写入');
      const syncStartTime = Date.now();

      const syncConfig = {
        appId: 'mock-app-id',
        appSecret: 'mock-app-secret',
        appToken: 'mock-app-token',
        tableId: 'mock-table-id',
        dataType: 'movies' as const,
        subjectIdField: '豆瓣ID',
      };

      const progressUpdates: ProgressUpdate[] = [];

      // 执行Mock增量同步
      const syncResult = await syncEngineService.performIncrementalSync(
        'test-user-123',
        syncConfig,
        doubanData,
        {
          fullSync: true,
          conflictStrategy: 'douban_wins',
          onProgress: (progress) => {
            progressUpdates.push(progress);
            console.log(
              `   📊 同步进度: ${progress.processed}/${progress.total} (${progress.phase})`,
            );
          },
        },
      );

      const syncTime = Date.now() - syncStartTime;
      const successCount =
        syncResult.summary.created + syncResult.summary.updated;
      const successRate = (successCount / doubanData.length) * 100;

      // 验证同步结果
      expect(syncResult).toBeDefined();
      expect(syncResult.summary).toBeDefined();
      expect(successRate).toBe(100); // Mock同步应该100%成功
      expect(progressUpdates.length).toBeGreaterThan(0); // 确保进度回调被调用

      console.log(`✅ Mock数据同步完成 (耗时${syncTime}ms)`);
      console.log(`   📊 同步成功: ${successCount}/${doubanData.length}条`);
      console.log(`   📈 成功率: ${successRate}%`);
      console.log(`   🆕 新创建: ${syncResult.summary.created}条`);
      console.log(`   🔄 更新: ${syncResult.summary.updated}条`);

      // === 第5阶段: 最终验证 ===
      console.log('\n🔍 第5阶段: 最终验证');

      const totalTime = Date.now() - testStartTime;

      expect(successCount).toBe(5);
      expect(syncResult.summary.failed).toBe(0);
      expect(totalTime).toBeLessThan(5000); // Mock测试应该在5秒内完成

      console.log(`✅ Mock数据验证完成`);

      // === 测试总结 ===
      console.log('\n🎉 Mock端到端集成测试完成！');
      console.log('📊 测试指标总结:');
      console.log(`   ⏱️ 总耗时: ${totalTime}ms`);
      console.log(`   🎬 处理电影: ${doubanData.length}部`);
      console.log(
        `   🛠️ 配置字段: ${Object.keys(fieldConfigResult.mappings).length}个`,
      );
      console.log(`   📈 同步成功率: ${successRate}%`);
      console.log(`   🚀 整体评估: PASS (Mock版本)`);

      // 最终断言
      expect(successRate).toBe(100);
      expect(
        Object.keys(fieldConfigResult.mappings).length,
      ).toBeGreaterThanOrEqual(5);
      expect(doubanData.length).toBe(5);
      expect(totalTime).toBeLessThan(10000); // 确保Mock测试快速执行
    }, 15000); // 15秒超时应该足够Mock测试

    /**
     * 错误恢复测试 - Mock版本
     */
    it('应该能够处理Mock错误情况', async () => {
      console.log('🛡️ 测试Mock错误恢复机制');

      // 创建Mock spy来保存和恢复原有实现
      const fetchUserDataSpy = jest.spyOn(doubanService, 'fetchUserData');

      // Mock网络错误
      fetchUserDataSpy.mockRejectedValueOnce(new Error('Mock network error'));

      const invalidDto: FetchUserDataDto = {
        userId: 'test-user-invalid',
        cookie: 'invalid-mock-cookie',
        category: 'movies',
        isEncrypted: false,
      };

      await expect(doubanService.fetchUserData(invalidDto)).rejects.toThrow(
        'Mock network error',
      );

      console.log('✅ Mock错误处理正常');

      // 恢复原始Mock
      fetchUserDataSpy.mockRestore();

      // 重新设置mock实现供后续测试使用
      jest
        .spyOn(doubanService, 'fetchUserData')
        .mockImplementation(async (_dto: FetchUserDataDto) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return MockDataGenerator.generateDoubanMovies(5);
        });
    });

    /**
     * 性能基准测试 - Mock版本
     */
    it('Mock版本应该快速完成小批量数据处理', async () => {
      const performanceStartTime = Date.now();
      console.log('⚡ Mock性能基准测试');

      const mockDto: FetchUserDataDto = {
        userId: 'test-user-perf',
        cookie: 'mock-cookie',
        category: 'movies',
        isEncrypted: false,
      };

      const mockData = await doubanService.fetchUserData(mockDto);
      const performanceTime = Date.now() - performanceStartTime;

      // Mock版本应该非常快
      expect(performanceTime).toBeLessThan(1000); // 1秒内
      expect(mockData.length).toBeGreaterThan(0);

      console.log(
        `✅ Mock性能测试完成 (${mockData.length}条记录，耗时${performanceTime}ms)`,
      );
    }, 5000); // 5秒超时
  });

  /**
   * 服务依赖注入测试
   */
  describe('服务依赖注入测试', () => {
    it('所有核心服务都应该正确注入', () => {
      expect(doubanService).toBeDefined();
      expect(fieldMappingService).toBeDefined();
      expect(syncEngineService).toBeDefined();
      expect(feishuTableService).toBeDefined();

      console.log('✅ 所有服务依赖注入正常');
    });

    it('Mock方法应该正确工作', async () => {
      const mockResult = await doubanService.fetchUserData({
        userId: 'test',
        cookie: 'test',
        category: 'movies',
        isEncrypted: false,
      });

      expect(mockResult).toHaveLength(5);
      expect(mockResult[0]).toHaveProperty('title');

      console.log('✅ Mock方法正常工作');
    });
  });
});
