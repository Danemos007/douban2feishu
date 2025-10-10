#!/usr/bin/env ts-node
/**
 * Fixture自动更新脚本
 *
 * 目的：自动更新测试fixture中的时效性数据（如时间戳），防止CI因过期数据而失败
 * 使用场景：
 *   1. CI环境：在运行测试前自动调用（通过test:ci命令）
 *   2. 本地开发：可手动执行 `npm run update-fixtures`
 *
 * 更新策略：
 *   - fact-check-results.json: 将所有timestamp字段更新为当前时间
 *   - 保持递增间隔：timestamp[0] + 0ms, timestamp[1] + 304ms, timestamp[2] + 901ms
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FactCheckResult {
  endpoint: string;
  success: boolean;
  responseData: unknown;
  timestamp: string;
}

/**
 * 更新fact-check-results.json中的时间戳
 */
function updateFactCheckFixture(): void {
  const fixturePath = join(
    __dirname,
    '../src/feishu/contract/__fixtures__/fact-check-results.json',
  );

  // 读取现有fixture
  const fixtureContent = readFileSync(fixturePath, 'utf-8');
  const factCheckResults = JSON.parse(fixtureContent) as FactCheckResult[];

  // 生成当前时间戳
  const now = new Date();
  const baseTimestamp = now.getTime();

  // 更新时间戳，保持原有的时间间隔模式
  const timeOffsets = [0, 304, 901]; // 原始间隔：0ms, 304ms, 901ms

  factCheckResults.forEach((result, index) => {
    const newTimestamp = new Date(baseTimestamp + timeOffsets[index]);
    result.timestamp = newTimestamp.toISOString();
  });

  // 写回文件（保持格式化）
  writeFileSync(fixturePath, JSON.stringify(factCheckResults, null, 2) + '\n');

  console.log('✅ Fixture更新成功:');
  console.log(`   📁 文件: fact-check-results.json`);
  console.log(
    `   🕐 基准时间: ${new Date(baseTimestamp).toISOString().replace('T', ' ').slice(0, 19)}`,
  );
  factCheckResults.forEach((result, index) => {
    console.log(
      `   ├─ [${index}] ${result.endpoint.substring(0, 50)}... → ${result.timestamp}`,
    );
  });
}

/**
 * 主函数
 */
function main(): void {
  console.log('🔄 开始更新测试fixtures...\n');

  try {
    updateFactCheckFixture();
    console.log('\n✨ 所有fixtures更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fixture更新失败:', error);
    process.exit(1);
  }
}

// 执行脚本
main();
