/**
 * 电视剧表格字段创建完成测试
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FieldMappingV2Service } from './services/field-mapping-v2.service';

const TV_TABLE_CONFIG = {
  appId: 'cli_a8f5de628bf5500e',
  appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
  appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
  tableId: 'tblLO7EWUWOExQ7P',
  userId: '290244208',
};

async function completeTVTableFields() {
  console.log('🚀 Completing TV Table Field Creation');
  console.log('====================================');

  const app = await NestFactory.create(AppModule);
  const fieldMappingV2Service = app.get(FieldMappingV2Service);

  try {
    console.log('📺 Processing TV table field creation...');
    
    const result = await fieldMappingV2Service.autoConfigureFieldMappings(
      TV_TABLE_CONFIG.userId,
      TV_TABLE_CONFIG.appId,
      TV_TABLE_CONFIG.appSecret,
      TV_TABLE_CONFIG.appToken,
      TV_TABLE_CONFIG.tableId,
      'tv'
    );

    console.log('✅ TV Table Configuration Results:');
    console.log(`   - Matched: ${result.matched.length} fields`);
    console.log(`   - Created: ${result.created.length} fields`);
    console.log(`   - Errors: ${result.errors.length} errors`);
    console.log(`   - Total mappings: ${Object.keys(result.mappings).length}`);

    if (result.created.length > 0) {
      console.log('🆕 Successfully created fields:');
      result.created.forEach(field => {
        console.log(`   - ${field.doubanField} → "${field.chineseName}" (${field.fieldId})`);
      });
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:');
      result.errors.forEach(error => {
        console.log(`   - ${error.doubanField}: ${error.error}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  completeTVTableFields();
}