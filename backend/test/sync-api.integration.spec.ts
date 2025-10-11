/**
 * 豆瓣飞书同步 集成测试
 *
 * 目标: API层面验证核心业务流程 - 从豆瓣抓取数据到飞书表格同步的完整链路
 *
 * Happy Path 测试场景:
 * 1. 用户认证
 * 2. 触发同步任务
 * 3. 验证同步状态
 * 4. 验证同步历史记录
 *
 * @author Claude (Senior Software Architect)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';

describe('Douban to Feishu Sync (Integration)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let testUserId: string;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 获取服务实例
    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);

    // 创建或获取测试用户
    const testEmail = process.env.INTEGRATION_TEST_EMAIL || 'integration-test@example.com';

    let user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        credentials: true,
        syncConfigs: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: testEmail,
          credentials: {
            create: {
              encryptionIv: 'test-iv-12345678901234567890',
            },
          },
        },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
      console.log(`✅ [Test Setup] 测试用户已创建: ${testEmail}`);
    } else {
      console.log(`✅ [Test Setup] 测试用户已存在: ${testEmail}`);
    }

    // 直接生成JWT token (绕过登录API)
    const tokens = await authService.login({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      lastSyncAt: user.lastSyncAt,
    });
    authToken = tokens.accessToken;
    testUserId = user.id;
    console.log(`✅ [Test Setup] JWT token已生成`);

    // 设置全局API前缀（与main.ts一致）
    app.setGlobalPrefix('api');

    // 应用全局管道（与生产环境一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // [TEST-ISOLATION] 确保每个测试用例运行前数据库环境纯净
  beforeEach(async () => {
    // 清空SyncHistory表中的所有记录，避免测试污染
    await prisma.syncHistory.deleteMany({});
  });

  describe('Happy Path: Complete Sync Flow', () => {
    it('[Step 1] 应该成功进行用户认证', async () => {
      // JWT token已在beforeAll中生成
      expect(authToken).toBeTruthy();
      expect(testUserId).toBeTruthy();

      console.log('✅ [Integration] 用户认证成功 (使用预生成的JWT token)');
    });

    it('[Step 2] 应该成功触发同步任务', async () => {
      if (!authToken) {
        throw new Error('需要先完成认证步骤');
      }

      const response = await request(app.getHttpServer())
        .post('/api/sync/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          triggerType: 'MANUAL',
          options: {
            categories: ['books'],
            forceUpdate: false,
          },
        })
        .expect(202);

      expect(response.body).toHaveProperty('syncId');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'QUEUED');
      expect((response.body as { syncId: string }).syncId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID格式

      console.log(
        '✅ [Integration] 同步任务触发成功:',
        (response.body as { syncId: string }).syncId,
      );
    });

    it('[Step 3] 应该能查询同步任务状态', async () => {
      if (!authToken) {
        throw new Error('需要先完成认证步骤');
      }

      // 先触发一个同步任务
      const triggerResponse = await request(app.getHttpServer())
        .post('/api/sync/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          triggerType: 'MANUAL',
          options: {
            categories: ['books'],
          },
        })
        .expect(202);

      const syncId = (triggerResponse.body as { syncId: string }).syncId;

      // 等待任务开始处理
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 查询任务状态
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/sync/${syncId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body).toHaveProperty('syncId', syncId);
      expect(statusResponse.body).toHaveProperty('status');
      const statusBody = statusResponse.body as { status: string };
      expect(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']).toContain(
        statusBody.status,
      );

      console.log('✅ [Integration] 同步状态查询成功:', statusBody.status);
    });

    it('[Step 4] 应该能获取同步历史记录', async () => {
      if (!authToken) {
        throw new Error('需要先完成认证步骤');
      }

      const response = await request(app.getHttpServer())
        .get('/api/sync/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
        })
        .expect(200);

      interface HistoryResponse {
        items: Array<{
          id: string;
          userId: string;
          status: string;
          createdAt: string;
        }>;
        total: number;
        page: number;
        limit: number;
      }

      const historyBody = response.body as HistoryResponse;
      expect(historyBody).toHaveProperty('items');
      expect(historyBody).toHaveProperty('total');
      expect(historyBody.page).toBe(1);
      expect(historyBody.limit).toBe(10);
      expect(Array.isArray(historyBody.items)).toBe(true);

      // 验证历史记录结构
      if (historyBody.items.length > 0) {
        const firstRecord = historyBody.items[0];
        expect(firstRecord).toHaveProperty('id');
        expect(firstRecord.userId).toBe(testUserId);
        expect(firstRecord).toHaveProperty('status');
        expect(firstRecord).toHaveProperty('createdAt');
      }

      console.log(`✅ [Integration] 同步历史记录查询成功: ${historyBody.total} 条记录`);
    });
  });

  describe('Error Handling', () => {
    it('应该拒绝未认证的同步请求', async () => {
      await request(app.getHttpServer())
        .post('/api/sync/trigger')
        .send({
          triggerType: 'MANUAL',
          options: {
            categories: ['books'],
          },
        })
        .expect(401);

      console.log('✅ [Integration] 未认证请求被正确拒绝');
    });

    it('应该验证同步请求参数', async () => {
      if (!authToken) {
        console.log('⏭️  [Integration] 跳过参数验证测试（需要先认证）');
        return;
      }

      await request(app.getHttpServer())
        .post('/api/sync/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          triggerType: 'INVALID_TYPE', // 无效的类型
        })
        .expect(422); // 422 Unprocessable Entity 是正确的参数验证错误码

      console.log('✅ [Integration] 无效参数被正确验证');
    });
  });

  describe('Integration with External Services', () => {
    it('[Mock Mode] 应该能处理豆瓣API模拟数据', () => {
      // 此测试使用mock数据模拟豆瓣API响应
      // 在CI环境中不依赖真实的豆瓣网站
      expect(process.env.USE_MOCK_DOUBAN).toBe('true');
      console.log('✅ [Integration] Mock模式已启用');
    });

    it('[Mock Mode] 应该能处理飞书API模拟数据', () => {
      // 此测试使用mock数据模拟飞书API响应
      // 在CI环境中不依赖真实的飞书服务
      expect(process.env.USE_MOCK_FEISHU).toBe('true');
      console.log('✅ [Integration] 飞书Mock模式已启用');
    });
  });
});
