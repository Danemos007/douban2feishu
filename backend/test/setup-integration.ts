/**
 * 集成测试环境设置
 *
 * 功能:
 * - 环境变量配置
 * - 全局测试配置
 * - 资源清理设置
 *
 * @author Claude (Senior Software Architect)
 */

import { config } from 'dotenv';
import { join } from 'path';

// 加载测试环境变量（优先级：.env.integration > .env.test > .env）
config({ path: join(__dirname, '..', '.env.integration') });
config({ path: join(__dirname, '..', '.env.test') });
config({ path: join(__dirname, '..', '.env') });

// 全局测试超时
jest.setTimeout(300000); // 5分钟

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试环境标识
process.env.NODE_ENV = 'test';
process.env.IS_INTEGRATION_TEST = 'true';

// Redis测试数据库
process.env.REDIS_DB = '1';

console.log('🧪 集成测试环境已初始化');
console.log(`📊 环境变量:`, {
  NODE_ENV: process.env.NODE_ENV,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_DB: process.env.REDIS_DB,
});
