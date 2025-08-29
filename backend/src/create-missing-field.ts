/**
 * 创建缺失的"上映日期"字段
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_movie_table_id'
  }
};

async function getAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });
  
  return response.data.tenant_access_token;
}

async function createMissingField() {
  console.log('=== 创建缺失的上映日期字段 ===');
  
  try {
    const token = await getAccessToken();
    
    // 1. 检查现有字段
    console.log('📋 检查现有字段...');
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const fields = fieldsResponse.data.data?.items || [];
    const fieldNames = fields.map(f => f.field_name);
    console.log('现有字段:', fieldNames);
    
    if (fieldNames.includes('上映日期')) {
      console.log('✅ 上映日期字段已存在');
      return;
    }

    // 2. 创建"上映日期"字段 (Text类型)
    console.log('\n➕ 创建"上映日期"字段...');
    const createFieldData = {
      field_name: '上映日期',
      type: 1, // Text类型
      property: {
        formatter: ''
      },
      description: '上映日期，包含完整地区信息（如：2010-12-16(中国大陆) / 2010-12-18(美国)）'
    };

    try {
      const createResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        createFieldData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ 上映日期字段创建成功');
      console.log('字段ID:', createResponse.data.data?.field_id);
      
    } catch (error: any) {
      console.log('❌ 上映日期字段创建失败');
      console.log('错误:', error.response?.data || error.message);
    }

    // 3. 验证字段列表
    console.log('\n🔍 验证字段列表...');
    const updatedFieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const updatedFields = updatedFieldsResponse.data.data?.items || [];
    console.log('更新后的字段列表:');
    for (const field of updatedFields) {
      console.log(`- ${field.field_name} (ID: ${field.field_id}, Type: ${field.type})`);
    }

    // 4. 再次测试记录写入
    console.log('\n🧪 测试记录写入...');
    const fieldMap: Record<string, string> = {};
    for (const field of updatedFields) {
      fieldMap[field.field_name] = field.field_id;
    }

    const testData = {
      fields: {
        [fieldMap['Subject ID']]: 'TEST-002',
        [fieldMap['电影名']]: '测试电影2',
        [fieldMap['我的状态']]: '看过',
        [fieldMap['类型']]: '剧情',
        [fieldMap['豆瓣评分']]: 8.5,
        [fieldMap['片长']]: '120分钟',
        [fieldMap['上映日期']]: '2024-01-01(中国大陆)'
      }
    };

    try {
      const createRecordResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        testData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ 测试记录创建成功!');
      
    } catch (error: any) {
      console.log('❌ 测试记录创建失败');
      console.log('错误:', error.response?.data || error.message);
    }

  } catch (error: any) {
    console.log(`❌ 操作失败: ${error.response?.data?.msg || error.message}`);
  }
}

createMissingField();