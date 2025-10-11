/**
 * 集成测试数据种子脚本
 *
 * 功能：
 * - 创建测试用户
 * - 清理测试数据
 * - 设置测试环境初始状态
 *
 * 使用方法：
 * npx ts-node --require tsconfig-paths/register prisma/seed-integration-test.ts
 *
 * @author Claude (Senior Software Architect)
 */

import { PrismaClient } from '../generated/prisma';
import { config } from 'dotenv';
import { join } from 'path';

// 加载集成测试环境变量
config({ path: join(__dirname, '..', '.env.integration') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化集成测试数据...');

  // 测试用户信息（从环境变量读取）
  const testEmail =
    process.env.INTEGRATION_TEST_EMAIL || 'integration-test@example.com';

  try {
    // 1. 清理现有测试用户（如果存在）
    console.log(`📝 检查测试用户: ${testEmail}`);
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        credentials: true,
        syncConfigs: true,
        syncHistory: true,
      },
    });

    if (existingUser) {
      console.log('🗑️  删除现有测试用户数据...');

      // 删除同步历史
      await prisma.syncHistory.deleteMany({
        where: { userId: existingUser.id },
      });

      // 删除同步配置
      if (existingUser.syncConfigs) {
        await prisma.syncConfig.delete({
          where: { userId: existingUser.id },
        });
      }

      // 删除用户凭证
      if (existingUser.credentials) {
        await prisma.userCredentials.delete({
          where: { userId: existingUser.id },
        });
      }

      // 删除用户
      await prisma.user.delete({
        where: { id: existingUser.id },
      });

      console.log('✅ 现有测试用户已清理');
    }

    // 2. 创建新的测试用户
    console.log('👤 创建新测试用户...');
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        credentials: {
          create: {
            // 生成一个固定的IV用于测试
            encryptionIv: 'test-iv-12345678901234567890',
          },
        },
        syncConfigs: {
          create: {
            mappingType: 'THREE_TABLES',
            autoSyncEnabled: false,
            tableMappings: {
              book: { tableId: 'test-book-table', appToken: 'test-app-token' },
              movie: {
                tableId: 'test-movie-table',
                appToken: 'test-app-token',
              },
              tv: { tableId: 'test-tv-table', appToken: 'test-app-token' },
            },
          },
        },
      },
      include: {
        credentials: true,
        syncConfigs: true,
      },
    });

    console.log('✅ 测试用户创建成功！');
    console.log(`   用户ID: ${testUser.id}`);
    console.log(`   邮箱: ${testUser.email}`);
    console.log(`   创建时间: ${testUser.createdAt.toISOString()}`);

    // 3. 验证创建结果
    const verifyUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        credentials: true,
        syncConfigs: true,
        syncHistory: true,
      },
    });

    if (!verifyUser) {
      throw new Error('测试用户创建验证失败');
    }

    console.log('\n🎉 集成测试数据初始化完成！');
    console.log('\n📊 测试数据统计:');
    console.log(`   用户数: 1`);
    console.log(`   用户凭证: ${verifyUser.credentials ? '已配置' : '未配置'}`);
    console.log(`   同步配置: ${verifyUser.syncConfigs ? '已配置' : '未配置'}`);
    console.log(`   同步历史: ${verifyUser.syncHistory.length} 条`);
  } catch (error) {
    console.error('❌ 测试数据初始化失败:', error);
    throw error;
  }
}

// 执行种子脚本
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
