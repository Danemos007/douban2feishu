/**
 * Diagnose Table Issue - Check permissions and table state
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblgm24SCh26ZJ0o' // Books table
  }
};

async function diagnoseTableIssue() {
  console.log('🔍 Diagnose Table Issue');
  console.log('=======================');

  try {
    // Step 1: Get Access Token
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ Access token obtained');

    // Step 2: Check App Info
    try {
      const appInfoResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('✅ App info accessible');
      console.log(`   App Name: ${(appInfoResponse.data as any).data?.app?.name}`);
    } catch (appError) {
      console.log('❌ Cannot access app info:', (appError as any).response?.data || (appError as any).message);
    }

    // Step 3: List Tables
    try {
      const tablesResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('✅ Tables listing accessible');
      const tables = (tablesResponse.data as any).data?.items || [];
      console.log(`   Found ${tables.length} tables:`);
      tables.forEach((table: any) => {
        const status = table.table_id === CONFIG.feishu.tableId ? '🎯' : '  ';
        console.log(`   ${status} ${table.name} (${table.table_id})`);
      });
    } catch (tablesError) {
      console.log('❌ Cannot list tables:', (tablesError as any).response?.data || (tablesError as any).message);
    }

    // Step 4: Check Table Permissions
    try {
      const tableInfoResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('✅ Target table info accessible');
      console.log(`   Table Name: ${(tableInfoResponse.data as any).data?.name}`);
    } catch (tableError) {
      console.log('❌ Cannot access target table:', (tableError as any).response?.data || (tableError as any).message);
      return;
    }

    // Step 5: Check Records Read Permission
    try {
      const recordsResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=1`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log('✅ Records read permission confirmed');
      const items = (recordsResponse.data as any).data?.items || [];
      console.log(`   Found ${items.length} existing records`);
    } catch (readError) {
      console.log('❌ Cannot read records:', (readError as any).response?.data || (readError as any).message);
    }

    // Step 6: Try Different API Versions/Endpoints
    console.log('\n🔬 Testing different API approaches:');
    
    // Test V1 API
    console.log('   Testing v1 batch_create...');
    try {
      const v1Response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/batch_create`,
        {
          records: [{
            fields: {
              'fldFOzkZ68': 'V1_TEST_001'
            }
          }]
        },
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('   ✅ V1 batch_create works!');
    } catch (v1Error) {
      console.log('   ❌ V1 batch_create failed:', (v1Error as any).response?.data?.msg || (v1Error as any).message);
    }

    // Test single record create
    console.log('   Testing single record create...');
    try {
      const singleResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        {
          fields: {
            'fldFOzkZ68': 'SINGLE_TEST_001'
          }
        },
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('   ✅ Single record create works!');
    } catch (singleError) {
      console.log('   ❌ Single record create failed:', (singleError as any).response?.data?.msg || (singleError as any).message);
    }

    // Step 7: Check if this is a new vs old field issue
    console.log('\n🆕 Checking if this is about new vs original fields...');
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    const fields = (fieldsResponse.data as any).data.items;
    console.log('   Field creation dates (if available):');
    fields.slice(0, 5).forEach((field: any) => {
      console.log(`   - ${field.field_name} (${field.field_id})`);
      if (field.created_time) {
        console.log(`     Created: ${new Date(field.created_time).toISOString()}`);
      }
    });

  } catch (error: any) {
    console.error('💥 Diagnosis failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

if (require.main === module) {
  diagnoseTableIssue();
}