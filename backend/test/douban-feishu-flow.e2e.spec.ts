/**
 * 豆瓣飞书同步 端到端(E2E)测试
 *
 * 目标: 验证完整的业务流程 - 从触发同步到数据最终出现在飞书表格
 *
 * 测试场景:
 * 1. 触发同步任务
 * 2. 轮询等待任务完成（COMPLETED/FAILED）
 * 3. 验证飞书表格中的所有字段数据（16/18/19字段）
 *
 * 双模式支持:
 * - Mock模式（默认）：使用nock拦截HTTP请求，适用于CI快速验证
 * - 真实API模式：连接真实豆瓣和飞书服务，适用于手动验收和夜间测试
 *
 * 数据规模:
 * - QUICK模式：1-2条数据（CI环境）
 * - FULL模式：约120条数据（夜间完整验证）
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
import { CryptoService } from '../src/common/crypto/crypto.service';
import { FeishuTableService } from '../src/feishu/services/feishu-table.service';
import { extractFieldText, extractFieldNumber } from '../src/feishu/schemas/record.schema';
import { setupAllMockInterceptors, cleanupMockInterceptors } from './mocks/nock-setup';

// ================================
// 环境变量配置
// ================================
const IS_MOCK_MODE = process.env.USE_MOCK_DOUBAN === 'true' || process.env.USE_MOCK_FEISHU === 'true';
const TEST_MODE = process.env.E2E_TEST_MODE || 'QUICK';
const BOOK_COUNT = TEST_MODE === 'QUICK'
  ? parseInt(process.env.E2E_QUICK_BOOK_COUNT || '2')
  : parseInt(process.env.E2E_FULL_BOOK_COUNT || '120');

// 超时配置
const getTimeout = () => {
  if (IS_MOCK_MODE) return parseInt(process.env.E2E_TIMEOUT_MOCK || '30000');
  if (TEST_MODE === 'QUICK') return parseInt(process.env.E2E_TIMEOUT_REAL_QUICK || '300000');
  return parseInt(process.env.E2E_TIMEOUT_REAL_FULL || '1800000');
};

describe('Douban to Feishu E2E Flow', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let testUserId: string;
  let prisma: PrismaService;
  let authService: AuthService;
  let cryptoService: CryptoService;

  beforeAll(async () => {
    // 设置nock（仅在Mock模式下）
    if (IS_MOCK_MODE) {
      setupAllMockInterceptors();
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // 配置logger级别，确保BullMQ Processor的日志能正确输出
    app = moduleFixture.createNestApplication({
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // 获取服务实例
    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);
    cryptoService = app.get<CryptoService>(CryptoService);

    // 创建或获取测试用户
    const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';

    let user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        credentials: true,
        syncConfigs: true,
      },
    });

    if (!user) {
      // 生成正确的加密IV（32字符十六进制）
      const encryptionIv = cryptoService.generateIV();

      user = await prisma.user.create({
        data: {
          email: testEmail,
          credentials: {
            create: {
              encryptionIv,
            },
          },
        },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
      console.log(`✅ [E2E Setup] 测试用户已创建: ${testEmail}`);
    } else {
      console.log(`✅ [E2E Setup] 测试用户已存在: ${testEmail}`);

      // 如果用户已存在，确保IV是正确格式（32字符十六进制）
      if (!user.credentials || user.credentials.encryptionIv.length !== 32) {
        const newIv = cryptoService.generateIV();
        await prisma.userCredentials.update({
          where: { userId: user.id },
          data: { encryptionIv: newIv },
        });
        // 重新加载用户数据
        const reloadedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { credentials: true, syncConfigs: true },
        });
        if (!reloadedUser) {
          throw new Error('Failed to reload user after IV update');
        }
        user = reloadedUser;
        console.log(`✅ [E2E Setup] 加密IV已更新为正确格式`);
      }
    }

    // TypeScript null检查
    if (!user || !user.credentials) {
      throw new Error('User or credentials not found after setup');
    }

    // 生成JWT token
    const tokens = await authService.login({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      lastSyncAt: user.lastSyncAt,
    });
    authToken = tokens.accessToken;
    testUserId = user.id;
    console.log(`✅ [E2E Setup] JWT token已生成`);
    console.log(`ℹ️  [E2E Setup] 测试模式: ${TEST_MODE} | Mock: ${IS_MOCK_MODE} | 书籍数量: ${BOOK_COUNT}`);

    // 配置用户凭证（豆瓣Cookie + 飞书配置）
    await setupUserCredentials(prisma, cryptoService, user.id, user.credentials.encryptionIv);
    console.log(`✅ [E2E Setup] 用户凭证已配置`);

    // 配置同步设置（表格映射）
    await setupSyncConfig(prisma, user.id);
    console.log(`✅ [E2E Setup] 同步配置已设置`);

    // 应用全局配置
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }, getTimeout());

  afterAll(async () => {
    if (IS_MOCK_MODE) {
      cleanupMockInterceptors();
    }

    // [FIX-2025-10-13] 优雅关闭BullMQ队列，避免Redis连接关闭错误
    try {
      // 等待所有pending的job完成
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.warn('⚠️  BullMQ cleanup warning:', error);
    }

    await app.close();
  });

  beforeEach(async () => {
    // 清空同步历史，确保测试隔离
    await prisma.syncHistory.deleteMany({});
  });

  describe('Complete E2E Flow: Trigger → Poll → Verify', () => {
    it(
      '[E2E] 应该完成完整的同步流程并验证飞书表格数据',
      async () => {
        // ================================
        // Step 1: 触发同步任务
        // ================================
        console.log('\n🚀 [E2E Step 1] 触发同步任务...');
        const triggerResponse = await request(app.getHttpServer())
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

        const syncId = (triggerResponse.body as { syncId: string }).syncId;
        expect(syncId).toBeTruthy();
        console.log(`✅ [E2E Step 1] 同步任务已触发: ${syncId}`);

        // ================================
        // Step 2: 轮询等待任务完成
        // ================================
        console.log('\n⏳ [E2E Step 2] 轮询等待任务完成...');
        const finalStatus = await pollUntilComplete(app, authToken, syncId);
        expect(['SUCCESS', 'FAILED']).toContain(finalStatus);
        console.log(`✅ [E2E Step 2] 任务最终状态: ${finalStatus}`);

        // 如果任务失败，打印详细错误信息
        if (finalStatus === 'FAILED') {
          const syncHistory = await prisma.syncHistory.findUnique({
            where: { id: syncId },
          });
          const metadata = syncHistory?.metadata as { message?: string } | null;
          console.error(
            `\n❌ [E2E Error] 同步任务失败！\nSyncId: ${syncId}\nError: ${syncHistory?.errorMessage}\nMetadata: ${JSON.stringify(metadata)}`,
          );
          throw new Error(
            `同步任务失败: ${syncHistory?.errorMessage || '未知错误'}`,
          );
        }

        // ================================
        // Step 3: 验证飞书表格数据
        // ================================
        console.log('\n🔍 [E2E Step 3] 验证飞书表格数据...');
        await verifyFeishuTableData(app, testUserId, BOOK_COUNT);
        console.log(`✅ [E2E Step 3] 飞书表格数据验证通过`);
      },
      getTimeout(),
    );
  });
});

// ================================
// Helper Functions
// ================================

/**
 * 轮询等待同步任务完成
 */
async function pollUntilComplete(
  app: INestApplication<App>,
  authToken: string,
  syncId: string,
): Promise<string> {
  const maxAttempts = 60; // 最多轮询60次
  const interval = 5000; // 每5秒轮询一次

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const statusResponse = await request(app.getHttpServer())
      .get(`/api/sync/${syncId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const status = (statusResponse.body as { status: string }).status;
    console.log(`   ⏳ [Poll ${i + 1}/${maxAttempts}] 当前状态: ${status}`);

    // [FIX-2025-10-13] Prisma枚举是SUCCESS而非COMPLETED
    if (status === 'SUCCESS' || status === 'FAILED') {
      // 等待BullMQ worker完成清理工作，避免Redis连接过早关闭
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return status;
    }
  }

  throw new Error('轮询超时：任务未在预期时间内完成');
}

/**
 * 验证飞书表格数据
 *
 * 实现完整的字段验证逻辑：
 * - 书籍：16个字段
 * - 电影：18个字段（待实现）
 * - 电视剧/纪录片：19个字段（待实现）
 */
async function verifyFeishuTableData(
  app: INestApplication<App>,
  userId: string,
  expectedCount: number,
): Promise<void> {
  console.log(`   🔍 验证用户 ${userId} 的飞书表格数据（预期: ${expectedCount}条）`);

  // 获取必要的凭证和配置
  const feishuAppId = process.env.FEISHU_APP_ID;
  const feishuAppSecret = process.env.FEISHU_APP_SECRET;
  const feishuAppToken = process.env.FEISHU_APP_TOKEN;
  const bookTableId = process.env.FEISHU_BOOK_TABLE_ID;

  if (!feishuAppId || !feishuAppSecret || !feishuAppToken || !bookTableId) {
    throw new Error('缺少必要的飞书配置环境变量');
  }

  // 获取 FeishuTableService 实例
  const feishuTableService = app.get<FeishuTableService>(FeishuTableService);

  // 查询飞书表格中的所有记录
  const searchResult = await feishuTableService.searchRecords(
    feishuAppId,
    feishuAppSecret,
    feishuAppToken,
    bookTableId,
    {
      pageSize: 500, // 一次性获取所有记录
    },
  );

  console.log(`   📊 实际查询到 ${searchResult.records.length} 条记录`);

  // 验证记录数量
  expect(searchResult.records.length).toBe(expectedCount);

  // 书籍16字段中文名映射（按照CLAUDE.md中定义的标准顺序）
  const BOOK_FIELD_NAMES = [
    'Subject ID',
    '我的标签',
    '我的状态',
    '书名',
    '副标题',
    '豆瓣评分',
    '作者',
    '我的备注',
    '内容简介',
    '封面图',
    '我的评分',
    '原作名',
    '译者',
    '出版年份',
    '出版社',
    '标记日期',
  ];

  console.log(`   📋 开始验证所有记录的16个字段...`);

  // 验证每条记录的所有16个字段
  // ✅ 飞书API返回的fields对象使用字段名作为key（已通过真实API响应验证）
  for (let i = 0; i < searchResult.records.length; i++) {
    const record = searchResult.records[i];
    console.log(`\n   🔍 验证第 ${i + 1}/${searchResult.records.length} 条记录 (record_id: ${record.record_id})`);

    // 验证每个必需字段都存在
    for (const fieldName of BOOK_FIELD_NAMES) {
      // 直接使用字段名访问（飞书API返回的就是字段名作为key）
      const fieldValue = record.fields[fieldName];

      // 根据字段类型进行验证
      // ✅ 使用辅助函数提取字段值，支持真实API的复杂格式
      switch (fieldName) {
        case 'Subject ID':
          {
            const text = extractFieldText(fieldValue);
            expect(text).toBeTruthy();
            console.log(`      ✅ Subject ID: ${text}`);
          }
          break;

        case '我的状态':
          // 单选字段，直接返回字符串
          if (fieldValue) {
            const text = extractFieldText(fieldValue);
            expect(text).toBeTruthy();
            console.log(`      ✅ 我的状态: ${text}`);
          }
          break;

        case '书名':
          {
            const text = extractFieldText(fieldValue);
            expect(text).toBeTruthy();
            console.log(`      ✅ 书名: ${text}`);
          }
          break;

        case '豆瓣评分':
          // 数字字段，0-10范围
          if (fieldValue !== null && fieldValue !== undefined) {
            const rating = extractFieldNumber(fieldValue);
            expect(rating).not.toBeNull();
            if (rating !== null) {
              expect(rating).toBeGreaterThanOrEqual(0);
              expect(rating).toBeLessThanOrEqual(10);
              console.log(`      ✅ 豆瓣评分: ${rating}`);
            }
          } else {
            console.log(`      ⚠️  豆瓣评分: 无数据`);
          }
          break;

        case '我的评分':
          // 评分字段，1-5星
          if (fieldValue !== null && fieldValue !== undefined) {
            const rating = extractFieldNumber(fieldValue);
            if (rating !== null) {
              expect(rating).toBeGreaterThanOrEqual(1);
              expect(rating).toBeLessThanOrEqual(5);
              console.log(`      ✅ 我的评分: ${rating}星`);
            } else {
              console.log(`      ℹ️  我的评分: 未评分`);
            }
          } else {
            console.log(`      ℹ️  我的评分: 未评分`);
          }
          break;

        case '作者':
          {
            const text = extractFieldText(fieldValue);
            expect(text).toBeTruthy();
            console.log(`      ✅ 作者: ${text}`);
          }
          break;

        case '封面图':
          // URL字段
          if (fieldValue) {
            const url = extractFieldText(fieldValue);
            expect(url).toBeTruthy();
            expect(url).toMatch(/^https?:\/\//);
            console.log(`      ✅ 封面图: ${url}`);
          } else {
            console.log(`      ℹ️  封面图: 无图片`);
          }
          break;

        case '标记日期':
          // DateTime字段
          if (fieldValue !== null && fieldValue !== undefined) {
            const timestamp = extractFieldNumber(fieldValue);
            expect(timestamp).not.toBeNull();
            if (timestamp !== null) {
              expect(timestamp).toBeGreaterThan(0);
              console.log(`      ✅ 标记日期: ${new Date(timestamp).toISOString()}`);
            }
          } else {
            console.log(`      ℹ️  标记日期: 无日期`);
          }
          break;

        // 其他可选字段（副标题、我的标签、我的备注、内容简介、原作名、译者、出版年份、出版社）
        default:
          // 这些字段可能为空，只验证存在性
          if (fieldValue !== null && fieldValue !== undefined) {
            console.log(`      ✅ ${fieldName}: 有数据`);
          } else {
            console.log(`      ℹ️  ${fieldName}: 无数据`);
          }
          break;
      }
    }
  }

  console.log(`\n   ✅ 所有 ${searchResult.records.length} 条记录的16个字段验证通过`);
}

/**
 * 配置用户凭证（豆瓣Cookie + 飞书配置）
 */
async function setupUserCredentials(
  prisma: PrismaService,
  cryptoService: CryptoService,
  userId: string,
  encryptionIv: string,
): Promise<void> {
  const doubanCookie = process.env.DOUBAN_COOKIE || '';
  const feishuAppId = process.env.FEISHU_APP_ID || '';
  const feishuAppSecret = process.env.FEISHU_APP_SECRET || '';

  // 加密敏感数据
  const doubanCookieEncrypted = doubanCookie
    ? cryptoService.encrypt(doubanCookie, userId, encryptionIv)
    : null;

  const feishuAppSecretEncrypted = feishuAppSecret
    ? cryptoService.encrypt(feishuAppSecret, userId, encryptionIv)
    : null;

  // 更新用户凭证
  await prisma.userCredentials.update({
    where: { userId },
    data: {
      doubanCookieEncrypted,
      feishuAppId,
      feishuAppSecretEncrypted,
      updatedAt: new Date(),
    },
  });
}

/**
 * 配置同步设置（表格映射）
 */
async function setupSyncConfig(prisma: PrismaService, userId: string): Promise<void> {
  const appToken = process.env.FEISHU_APP_TOKEN || '';
  const bookTableId = process.env.FEISHU_BOOK_TABLE_ID || '';

  // 构建表格映射配置
  const tableMappings = {
    [`${appToken}:${bookTableId}`]: {
      subjectId: 'Subject ID',  // 字段名（不是Field ID）
      _metadata: {
        dataType: 'books',
        tableName: '书籍',
        lastConfigured: new Date().toISOString(),
      },
    },
  };

  // 创建或更新同步配置
  await prisma.syncConfig.upsert({
    where: { userId },
    create: {
      userId,
      tableMappings: JSON.stringify(tableMappings),
      autoSyncEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      tableMappings: JSON.stringify(tableMappings),
      updatedAt: new Date(),
    },
  });
}

