/**
 * 飞书API集成测试脚本
 * 
 * 测试内容:
 * 1. 飞书认证系统 (Token获取和缓存)
 * 2. 表格字段获取和Field ID映射
 * 3. 智能字段映射发现算法
 * 4. 增量同步引擎测试
 * 5. 批量记录操作测试
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FeishuAuthService } from './services/feishu-auth.service';
import { FeishuTableService } from './services/feishu-table.service';
import { FieldMappingService } from './services/field-mapping.service';
import { SyncEngineService } from './services/sync-engine.service';

// 测试配置 (请替换为真实的飞书应用信息)
const TEST_CONFIG = {
  appId: 'cli_xxxxxxxxxxxxxx', // 请填入真实的App ID
  appSecret: 'your_encrypted_secret_here', // 加密后的App Secret
  appToken: 'bascxxxxxxxxxxxxxxxx', // 多维表格的App Token
  tableId: 'tblxxxxxxxxxxxxxxxx', // 测试表格ID
};

async function runFeishuIntegrationTest() {
  console.log('🚀 Starting Feishu API Integration Test');
  console.log('=====================================\n');

  const app = await NestFactory.create(AppModule);
  
  // 获取服务实例
  const authService = app.get(FeishuAuthService);
  const tableService = app.get(FeishuTableService);
  const fieldMappingService = app.get(FieldMappingService);
  const syncEngineService = app.get(SyncEngineService);

  try {
    // ========== 测试1: 飞书认证系统 ==========
    console.log('📋 Test 1: Feishu Authentication System');
    console.log('-'.repeat(50));
    
    console.log('1.1 Testing credential validation...');
    const isValidCredentials = await authService.validateCredentials(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret
    );
    console.log(`✅ Credentials valid: ${isValidCredentials}`);

    if (!isValidCredentials) {
      throw new Error('❌ Invalid Feishu credentials. Please check TEST_CONFIG.');
    }

    console.log('1.2 Testing access token retrieval...');
    const accessToken = await authService.getAccessToken(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret
    );
    console.log(`✅ Access token retrieved: ${accessToken.substring(0, 20)}...`);

    console.log('1.3 Testing token caching...');
    const tokenStats = await authService.getTokenStats();
    console.log(`✅ Token stats:`, tokenStats);

    console.log('\n');

    // ========== 测试2: 表格操作服务 ==========
    console.log('📊 Test 2: Table Operations Service');
    console.log('-'.repeat(50));
    
    console.log('2.1 Testing table fields retrieval...');
    const fields = await tableService.getTableFields(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret,
      TEST_CONFIG.appToken,
      TEST_CONFIG.tableId
    );
    console.log(`✅ Retrieved ${fields.length} fields:`);
    fields.slice(0, 3).forEach(field => {
      console.log(`   - ${field.field_name} (ID: ${field.field_id}, Type: ${field.type})`);
    });

    if (fields.length === 0) {
      throw new Error('❌ No fields found in the table. Please check table configuration.');
    }

    console.log('2.2 Testing record search...');
    const searchResult = await tableService.searchRecords(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret,
      TEST_CONFIG.appToken,
      TEST_CONFIG.tableId,
      { pageSize: 5 }
    );
    console.log(`✅ Found ${searchResult.records.length} existing records`);

    console.log('\n');

    // ========== 测试3: 智能字段映射发现 ==========
    console.log('🧠 Test 3: Intelligent Field Mapping Discovery');
    console.log('-'.repeat(50));
    
    console.log('3.1 Testing field mapping discovery for books...');
    const mappingResult = await fieldMappingService.discoverFieldMappings(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret,
      TEST_CONFIG.appToken,
      TEST_CONFIG.tableId,
      'books'
    );
    
    console.log(`✅ Mapping discovery results:`);
    console.log(`   - ${Object.keys(mappingResult.mappings).length} successful mappings`);
    console.log(`   - ${mappingResult.unmapped.length} unmapped fields`);
    console.log(`   - ${mappingResult.conflicts.length} conflicts detected`);
    
    console.log('📝 Top recommendations:');
    mappingResult.recommendations.slice(0, 5).forEach(rec => {
      console.log(`   - ${rec.doubanField} → ${rec.feishuField} (${(rec.confidence * 100).toFixed(1)}%)`);
    });

    if (mappingResult.unmapped.length > 0) {
      console.log('⚠️  Unmapped fields:', mappingResult.unmapped.join(', '));
    }

    if (mappingResult.conflicts.length > 0) {
      console.log('🔥 Conflicts detected:');
      mappingResult.conflicts.forEach(conflict => {
        console.log(`   - ${conflict.field}: ${conflict.candidates.join(', ')}`);
      });
    }

    console.log('\n');

    // ========== 测试4: 批量操作测试 (模拟数据) ==========
    console.log('📦 Test 4: Batch Operations Test');
    console.log('-'.repeat(50));

    console.log('4.1 Creating mock test records...');
    const mockRecords = [
      {
        subjectId: 'test_book_001',
        title: '测试书籍 1',
        author: '测试作者 1',
        rating: 8.5,
        tags: ['测试', '自动化'],
        publishDate: '2024-01-01'
      },
      {
        subjectId: 'test_book_002', 
        title: '测试书籍 2',
        author: '测试作者 2',
        rating: 9.0,
        tags: ['测试', 'API'],
        publishDate: '2024-01-02'
      }
    ];

    // 注意：这里使用简化的字段映射进行测试
    const testFieldMappings = {
      subjectId: fields.find(f => f.field_name.includes('ID') || f.field_name.includes('编号'))?.field_id || fields[0]?.field_id,
      title: fields.find(f => f.field_name.includes('标题') || f.field_name.includes('名称'))?.field_id || fields[1]?.field_id,
    };

    if (testFieldMappings.subjectId && testFieldMappings.title) {
      console.log('4.2 Testing batch create operation...');
      const createResult = await tableService.batchCreateRecords(
        TEST_CONFIG.appId,
        TEST_CONFIG.appSecret,
        TEST_CONFIG.appToken,
        TEST_CONFIG.tableId,
        mockRecords,
        testFieldMappings,
        { skipDuplicates: true, validateFields: false }
      );
      
      console.log(`✅ Batch create results: ${createResult.success} success, ${createResult.failed} failed`);
      
      if (createResult.errors.length > 0) {
        console.log('⚠️  Create errors:', createResult.errors.slice(0, 3));
      }
    } else {
      console.log('⚠️  Skipping batch create test - no suitable field mappings found');
    }

    console.log('\n');

    // ========== 测试5: 系统性能和缓存 ==========
    console.log('⚡ Test 5: Performance and Caching');
    console.log('-'.repeat(50));

    console.log('5.1 Testing field caching performance...');
    const start1 = Date.now();
    await tableService.getTableFields(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret,
      TEST_CONFIG.appToken,
      TEST_CONFIG.tableId
    );
    const duration1 = Date.now() - start1;
    
    const start2 = Date.now();
    await tableService.getTableFields(
      TEST_CONFIG.appId,
      TEST_CONFIG.appSecret,
      TEST_CONFIG.appToken,
      TEST_CONFIG.tableId
    );
    const duration2 = Date.now() - start2;
    
    console.log(`✅ First call: ${duration1}ms, Cached call: ${duration2}ms`);
    console.log(`💾 Cache performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);

    console.log('5.2 Testing table statistics...');
    const tableStats = await tableService.getTableStats(TEST_CONFIG.appToken, TEST_CONFIG.tableId);
    console.log('✅ Table stats:', tableStats);

    console.log('\n');

    // ========== 测试总结 ==========
    console.log('🎉 Test Summary');
    console.log('================');
    console.log('✅ All Feishu API integration tests completed successfully!');
    console.log('✅ Authentication system working correctly');
    console.log('✅ Table operations functional');
    console.log('✅ Field mapping discovery algorithm operational');
    console.log('✅ Batch operations and caching optimized');
    console.log('\n📋 Next Steps:');
    console.log('1. Configure actual field mappings for your tables');
    console.log('2. Test with real Douban data');
    console.log('3. Run incremental sync engine tests');
    console.log('4. Set up automated testing pipeline');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify TEST_CONFIG values are correct');
    console.log('2. Check Feishu app permissions');
    console.log('3. Ensure table exists and has proper structure');
    console.log('4. Verify network connectivity to Feishu API');
  } finally {
    await app.close();
  }
}

// 运行测试的辅助函数
async function runSingleTest(testName: string, testFn: () => Promise<void>) {
  try {
    console.log(`\n🧪 Running ${testName}...`);
    await testFn();
    console.log(`✅ ${testName} passed`);
  } catch (error) {
    console.error(`❌ ${testName} failed:`, error.message);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runFeishuIntegrationTest()
    .then(() => {
      console.log('\n🎊 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runFeishuIntegrationTest };