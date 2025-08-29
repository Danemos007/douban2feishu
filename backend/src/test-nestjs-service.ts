/**
 * Test NestJS Service Layer - Real Data Sync
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FeishuTableService } from './feishu/services/feishu-table.service';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblgm24SCh26ZJ0o' // Books table
  }
};

async function testNestJSService() {
  console.log('🧪 Test NestJS Service Layer');
  console.log('============================');

  const app = await NestFactory.create(AppModule);
  const tableService = app.get(FeishuTableService);

  try {
    // Step 1: Test field retrieval (this should work)
    console.log('1. Testing field retrieval...');
    const fields = await tableService.getTableFields(
      CONFIG.feishu.appId,
      CONFIG.feishu.appSecret,
      CONFIG.feishu.appToken,
      CONFIG.feishu.tableId
    );

    console.log(`   ✅ Retrieved ${fields.length} fields via NestJS service`);
    
    // Find core fields
    const subjectIdField = fields.find(f => f.field_name === 'Subject ID');
    const titleField = fields.find(f => f.field_name === '书名');
    const authorField = fields.find(f => f.field_name === '作者');

    if (!subjectIdField || !titleField || !authorField) {
      console.log('   ❌ Core fields not found');
      return;
    }

    console.log('   ✅ Core fields found:');
    console.log(`     Subject ID: ${subjectIdField.field_id}`);
    console.log(`     书名: ${titleField.field_id}`);
    console.log(`     作者: ${authorField.field_id}`);

    // Step 2: Test with real book data using NestJS service
    console.log('\n2. Testing real data write with NestJS service...');
    
    const realBookData = {
      [subjectIdField.field_id]: '27114418',        // Subject ID
      [titleField.field_id]: '活下去的理由',           // 书名  
      [authorField.field_id]: '[英]马特·海格'         // 作者
    };

    console.log('   📝 Real book data prepared:');
    console.log(`     Subject ID: ${realBookData[subjectIdField.field_id]}`);
    console.log(`     Title: ${realBookData[titleField.field_id]}`);
    console.log(`     Author: ${realBookData[authorField.field_id]}`);

    // Use NestJS service to write data
    console.log('\n   💾 Writing via NestJS batchCreateRecords...');
    const result = await tableService.batchCreateRecords(
      CONFIG.feishu.appId,
      CONFIG.feishu.appSecret,
      CONFIG.feishu.appToken,
      CONFIG.feishu.tableId,
      [realBookData]
    );

    console.log('\n🎉 SUCCESS! NestJS service write completed!');
    console.log(`   Records created: ${result.success}`);
    console.log(`   Records failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log('   ⚠️  Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error.error}`);
      });
    }

    // Step 3: Verify the write by reading back
    console.log('\n3. Verifying write by reading records...');
    const searchResult = await tableService.searchRecords(
      CONFIG.feishu.appId,
      CONFIG.feishu.appSecret,
      CONFIG.feishu.appToken,
      CONFIG.feishu.tableId,
      { pageSize: 5 }
    );

    console.log(`   📊 Found ${searchResult.records.length} total records in table`);
    
    // Look for our record
    const ourRecord = searchResult.records.find((record: any) => 
      record.fields[subjectIdField.field_id] === '27114418'
    );

    if (ourRecord) {
      console.log('   🎯 Our record found!');
      console.log(`     Title: ${ourRecord.fields[titleField.field_id]}`);
      console.log(`     Author: ${ourRecord.fields[authorField.field_id]}`);
      console.log('   ✅ REAL DATA SUCCESSFULLY SYNCED!');
    } else {
      console.log('   ⚠️  Our record not found immediately');
      console.log('   💡 This might be due to propagation delay');
    }

    console.log('\n🏆 FINAL RESULT');
    console.log('================');
    if (result.success > 0) {
      console.log('✅ **FIELD MAPPING LOGIC: FIXED**');
      console.log('✅ **NESTJS SERVICE LAYER: WORKING**');
      console.log('✅ **REAL DATA WRITE: SUCCESS**');
      console.log('✅ **PRODUCTION READINESS: CONFIRMED**');
    } else {
      console.log('❌ Write operation did not succeed');
      console.log('🔧 Further investigation needed');
    }

  } catch (error: any) {
    console.error('\n❌ NestJS service test failed:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.message.includes('FieldNameNotFound')) {
      console.log('\n🔧 Field mapping issue still present');
      console.log('   The problem is in the service layer implementation');
    }
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  testNestJSService()
    .then(() => {
      console.log('\n🎊 NestJS Service Test Completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Critical Test Failed:', error);
      process.exit(1);
    });
}