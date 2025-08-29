/**
 * Debug Field Mapping Issue - Isolated test
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

interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property?: any;
  description?: {
    content: string;
  };
}

async function debugFieldMapping() {
  console.log('🔍 Debug Field Mapping Issue');
  console.log('============================');

  try {
    // Step 1: Get Access Token
    console.log('1. Getting access token...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    if ((tokenResponse.data as any).code !== 0) {
      throw new Error(`Token request failed: ${(tokenResponse.data as any).msg}`);
    }

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log(`   ✅ Access token obtained: ${accessToken.substring(0, 20)}...`);

    // Step 2: Get Table Fields
    console.log('\n2. Getting table fields...');
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if ((fieldsResponse.data as any).code !== 0) {
      throw new Error(`Fields request failed: ${(fieldsResponse.data as any).msg}`);
    }

    const fields: FeishuField[] = (fieldsResponse.data as any).data.items;
    console.log(`   ✅ Found ${fields.length} fields`);
    
    // Find key fields
    const subjectIdField = fields.find(f => f.field_name === 'Subject ID');
    const titleField = fields.find(f => f.field_name === '书名');
    const authorField = fields.find(f => f.field_name === '作者');

    if (!subjectIdField || !titleField || !authorField) {
      console.log('   ❌ Core fields not found:');
      console.log(`     Subject ID: ${subjectIdField ? '✅' : '❌'}`);
      console.log(`     书名: ${titleField ? '✅' : '❌'}`);
      console.log(`     作者: ${authorField ? '✅' : '❌'}`);
      
      console.log('\n   Available fields:');
      fields.forEach(f => {
        console.log(`     - "${f.field_name}" (${f.field_id})`);
      });
      return;
    }

    console.log(`   ✅ Core fields found:`);
    console.log(`     Subject ID: ${subjectIdField.field_id}`);
    console.log(`     书名: ${titleField.field_id}`);
    console.log(`     作者: ${authorField.field_id}`);

    // Step 3: Try to write data using correct format
    console.log('\n3. Writing test record...');
    
    const testRecord = {
      fields: {
        [subjectIdField.field_id]: 'TEST123456',
        [titleField.field_id]: '测试书籍标题',
        [authorField.field_id]: '测试作者'
      }
    };

    console.log('   📝 Record data:');
    console.log(JSON.stringify(testRecord, null, 4));
    
    // Let's also check the current table structure
    console.log('\n   🔍 Verifying field existence in real-time:');
    const verifyResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    const currentFields: FeishuField[] = (verifyResponse.data as any).data.items;
    const usedFieldIds = Object.keys(testRecord.fields);
    console.log('   📋 Checking used field IDs:');
    usedFieldIds.forEach(fieldId => {
      const field = currentFields.find(f => f.field_id === fieldId);
      if (field) {
        console.log(`     ✅ ${fieldId} -> "${field.field_name}" (type: ${field.type})`);
        // Show full field details for debugging
        if (field.property) {
          console.log(`       Property: ${JSON.stringify(field.property)}`);
        }
        if (field.description) {
          console.log(`       Description: ${field.description.content}`);
        }
      } else {
        console.log(`     ❌ ${fieldId} -> NOT FOUND`);
      }
    });
    
    // Let's also try to understand if field types require specific formats
    console.log('   🔍 All fields in table:');
    currentFields.forEach(field => {
      console.log(`     - ${field.field_id}: "${field.field_name}" (type: ${field.type})`);
    });

    // Let's first check if there are any existing records to see the structure
    console.log('\n   📖 Checking existing records structure:');
    try {
      const recordsResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=1`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      const existingRecords = (recordsResponse.data as any).data?.items || [];
      if (existingRecords.length > 0) {
        console.log('   📋 Example existing record structure:');
        console.log(JSON.stringify(existingRecords[0], null, 4));
      } else {
        console.log('   📝 No existing records found');
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch existing records:', (error as any).message);
    }

    // Let me try a simpler approach - just one field first
    console.log('\n   📝 Trying with only one field (Subject ID)...');
    const minimalRecord = {
      fields: {
        [subjectIdField.field_id]: 'TEST123456'
      }
    };
    
    let writeResponse;
    try {
      writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        minimalRecord,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('   ✅ Single field worked! Let me test each field individually...');
      
      // Test title field  
      try {
        const titleRecord = {
          fields: {
            [subjectIdField.field_id]: 'TEST123456',
            [titleField.field_id]: '测试书籍标题'
          }
        };
        
        const titleResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          titleRecord,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('   ✅ Title field also works!');
        
        // Test author field
        const authorRecord = {
          fields: {
            [subjectIdField.field_id]: 'TEST234567',
            [authorField.field_id]: '测试作者'
          }
        };
        
        const authorResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          authorRecord,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('   ✅ Author field also works!');
        console.log('   🤔 All individual fields work, testing 3-field combination...');
        
        // Now test all 3 fields together with single API
        const allThreeFields = {
          fields: {
            [subjectIdField.field_id]: 'TEST345678',
            [titleField.field_id]: '完整测试书籍',
            [authorField.field_id]: '完整测试作者'
          }
        };
        
        const fullResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          allThreeFields,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if ((fullResponse.data as any).code === 0) {
          console.log('   🎉 THREE FIELDS WORK WITH SINGLE API!');
          console.log('   🔍 Issue must be specifically with BATCH API');
          writeResponse = fullResponse;
        } else {
          console.log('   ❌ Three field combination failed even with single API');
          console.log('   📊 Response:', (fullResponse.data as any));
        }
        
      } catch (fieldTestError) {
        console.log('   ❌ Individual field test failed:', (fieldTestError as any).response?.data || (fieldTestError as any).message);
      }
    } catch (minimalError) {
      console.log('   ❌ Even single field failed:', (minimalError as any).response?.data || (minimalError as any).message);
      
      // Still try the full record for comparison
      try {
        writeResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          testRecord,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (fullError) {
        console.log('   ❌ Full record also failed, trying batch API...');
        writeResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/batch_create`,
          {
            records: [testRecord]
          },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    console.log('\n   📊 Write Response:');
    console.log(`     Status: ${writeResponse.status}`);
    console.log(`     Code: ${(writeResponse.data as any).code}`);
    console.log(`     Message: ${(writeResponse.data as any).msg}`);

    if ((writeResponse.data as any).code === 0) {
      console.log('   🎉 SUCCESS! Record written successfully!');
      console.log(`     Records created: ${(writeResponse.data as any).data?.records?.length || 'unknown'}`);
    } else {
      console.log('   ❌ FAILED! Write operation failed');
      console.log(`     Error: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
    }

  } catch (error: any) {
    console.error('\n💥 Debug failed:', error.message);
    if (error.response?.data) {
      console.error('   API Response:', error.response.data);
    }
  }
}

if (require.main === module) {
  debugFieldMapping();
}