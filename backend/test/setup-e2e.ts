/**
 * E2E测试全局Setup
 * 加载环境变量并配置测试环境
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载E2E测试专用的环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

// 确保测试环境标识
process.env.NODE_ENV = 'test';
process.env.IS_E2E_TEST = 'true';

// 日志输出当前配置
console.log('🔧 [E2E Setup] 环境变量已加载');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   USE_MOCK_DOUBAN: ${process.env.USE_MOCK_DOUBAN}`);
console.log(`   USE_MOCK_FEISHU: ${process.env.USE_MOCK_FEISHU}`);
console.log(`   E2E_TEST_MODE: ${process.env.E2E_TEST_MODE}`);
