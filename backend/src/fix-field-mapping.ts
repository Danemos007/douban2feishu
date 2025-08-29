/**
 * Fix Field Mapping - Address the specific fld8wROCff issue
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_book_table_id' // Books table
  }
};

async function fixFieldMapping() {
  console.log('🔧 Fix Field Mapping - Target fld8wROCff issue');
  console.log('================================================');

  try {
    // Step 1: Get Fresh Access Token
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ Fresh access token obtained');

    // Step 2: Get Fresh Field List
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    console.log(`✅ Retrieved ${fields.length} fields freshly`);

    // Step 3: Find Author Field by Name (fresh lookup)
    const authorField = fields.find((f: any) => f.field_name === '作者');
    const subjectIdField = fields.find((f: any) => f.field_name === 'Subject ID');
    const titleField = fields.find((f: any) => f.field_name === '书名');

    if (!authorField) {
      console.log('❌ Author field not found by name!');
      console.log('Available fields:');
      fields.forEach((f: any) => console.log(`  - "${f.field_name}" (${f.field_id})`));
      return;
    }

    console.log(`✅ Fresh field lookup:`);
    console.log(`   Subject ID: ${subjectIdField.field_id}`);
    console.log(`   书名: ${titleField.field_id}`);
    console.log(`   作者: ${authorField.field_id}`);

    // Step 4: Check if fld8wROCff still exists or has changed
    if (authorField.field_id === 'fld8wROCff') {
      console.log('⚠️  Field ID is still fld8wROCff - same as before');
    } else {
      console.log(`🔄 Field ID CHANGED! Old: fld8wROCff, New: ${authorField.field_id}`);
    }

    // Step 5: Hypothesis - Test with Only Original Fields
    console.log('\n💡 Hypothesis: Issue with newly created fields');
    console.log('   Let me find the first few fields (likely original)...');
    
    fields.slice(0, 5).forEach((f: any) => {
      console.log(`   - ${f.field_name} (${f.field_id}) - type: ${f.type}`);
    });

    // Test with just the first field (most likely to be original)
    const firstField = fields[0];
    const simpleTestRecord = {
      fields: {
        [firstField.field_id]: 'SIMPLE_TEST_001'
      }
    };

    console.log(`\n🧪 Testing with just first field: "${firstField.field_name}" (${firstField.field_id})`);

    const simpleResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
      simpleTestRecord,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((simpleResponse.data as any).code === 0) {
      console.log('✅ First field works! Now testing combinations...');
      
      // Try adding fields one by one to see where it breaks
      console.log('\n🔍 Testing field combinations to find the breaking point:');
      
      for (let i = 1; i < Math.min(5, fields.length); i++) {
        const testFields: any = {};
        for (let j = 0; j <= i; j++) {
          testFields[fields[j].field_id] = `TEST_${j}_${Date.now()}`;
        }
        
        console.log(`   Testing with ${i + 1} fields...`);
        
        try {
          const combinationResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
            { fields: testFields },
            {
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if ((combinationResponse.data as any).code === 0) {
            console.log(`     ✅ ${i + 1} fields works`);
          } else {
            console.log(`     ❌ ${i + 1} fields FAILED - Field that broke: ${fields[i].field_name} (${fields[i].field_id})`);
            console.log(`     Error:`, (combinationResponse.data as any).msg);
            break;
          }
        } catch (combError) {
          console.log(`     ❌ ${i + 1} fields ERROR:`, (combError as any).response?.data || (combError as any).message);
          break;
        }
      }
      
    } else {
      console.log('❌ Even first field failed');
      console.log('Response:', (simpleResponse.data as any));
    }

  } catch (error: any) {
    console.error('💥 Fix attempt failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

if (require.main === module) {
  fixFieldMapping();
}