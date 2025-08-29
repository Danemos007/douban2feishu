/**
 * 简化的数据写入测试 - 只测试核心字段
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FeishuTableService } from './feishu/services/feishu-table.service';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblgm24SCh26ZJ0o'
  }
};

async function simpleWriteTest() {
  console.log('🧪 Simple Write Test - Core Fields Only');
  console.log('=======================================');

  const app = await NestFactory.create(AppModule);
  const tableService = app.get(FeishuTableService);

  try {
    // Step 1: 获取字段信息
    const fields = await tableService.getTableFields(
      CONFIG.feishu.appId,
      CONFIG.feishu.appSecret,
      CONFIG.feishu.appToken,
      CONFIG.feishu.tableId
    );

    console.log('📋 Available Fields:');
    fields.forEach(field => {
      console.log(`   ${field.field_name} (${field.field_id}) - Type: ${field.type}`);
    });

    // Step 2: 只使用最基本的字段进行测试
    const subjectIdField = fields.find(f => f.field_name === 'Subject ID');
    const titleField = fields.find(f => f.field_name === '书名');
    const authorField = fields.find(f => f.field_name === '作者');

    if (!subjectIdField || !titleField || !authorField) {
      throw new Error('Required fields not found');
    }

    console.log(`\\n🎯 Using Core Fields:`);
    console.log(`   Subject ID: ${subjectIdField.field_id}`);
    console.log(`   Title: ${titleField.field_id}`);
    console.log(`   Author: ${authorField.field_id}`);

    // Step 3: 创建简单记录
    const simpleRecord = {
      [subjectIdField.field_id]: 'TEST123456',
      [titleField.field_id]: '测试书籍标题',
      [authorField.field_id]: '测试作者'
    };

    console.log(`\\n💾 Writing simple record...`);
    console.log(`   Record:`, JSON.stringify(simpleRecord, null, 2));

    const result = await tableService.batchCreateRecords(
      CONFIG.feishu.appId,
      CONFIG.feishu.appSecret,
      CONFIG.feishu.appToken,
      CONFIG.feishu.tableId,
      [simpleRecord]
    );

    if (result && result.success > 0) {
      console.log(`\\n🎉 SUCCESS! Record written:`);
      console.log(`   Records Created: ${result.success}`);
      console.log(`   Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.log(`   Errors:`, result.errors);
      }
    } else {
      console.log(`\\n❌ Write failed or returned no results`);
      console.log(`   Result:`, result);
    }

  } catch (error: any) {
    console.error(`\\n❌ Test failed:`, error.message);
    console.error('Details:', error);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  simpleWriteTest();
}