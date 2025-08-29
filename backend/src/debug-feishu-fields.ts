/**
 * 调试飞书字段配置问题
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx'
  }
};

async function getAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });
  
  return response.data.tenant_access_token;
}

async function debugFeishuFields() {
  console.log('=== 调试飞书字段配置 ===');
  
  try {
    const token = await getAccessToken();
    
    // 1. 获取表格字段信息
    console.log('📋 获取表格字段信息...');
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const fields = fieldsResponse.data.data?.items || [];
    console.log(`找到 ${fields.length} 个字段:`);
    
    const fieldMap: Record<string, string> = {};
    for (const field of fields) {
      console.log(`- ${field.field_name} (ID: ${field.field_id}, Type: ${field.type})`);
      fieldMap[field.field_name] = field.field_id;
    }

    // 2. 测试单条记录写入
    console.log('\n🧪 测试单条记录写入...');
    const testData = {
      fields: {
        [fieldMap['Subject ID'] || 'Subject ID']: 'TEST-001',
        [fieldMap['电影名'] || '电影名']: '测试电影',
        [fieldMap['我的状态'] || '我的状态']: '看过',
        [fieldMap['类型'] || '类型']: '测试类型',
        [fieldMap['豆瓣评分'] || '豆瓣评分']: 8.5,
        [fieldMap['片长'] || '片长']: '120分钟',
        [fieldMap['上映日期'] || '上映日期']: '2024-01-01(中国大陆)'
      }
    };

    console.log('测试数据:');
    console.log(JSON.stringify(testData, null, 2));

    try {
      const createResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        testData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ 测试记录创建成功');
      console.log('响应:', JSON.stringify(createResponse.data, null, 2));
      
    } catch (error: any) {
      console.log('❌ 测试记录创建失败');
      console.log('错误:', error.response?.data || error.message);
    }

    // 3. 再次验证记录数
    console.log('\n🔍 验证当前记录数...');
    const recordsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const records = recordsResponse.data.data?.items || [];
    console.log(`📊 当前表格中有 ${records.length} 条记录`);
    
    if (records.length > 0) {
      console.log('最新记录:');
      const latestRecord = records[0];
      console.log(JSON.stringify(latestRecord.fields, null, 2));
    }

  } catch (error: any) {
    console.log(`❌ 调试失败: ${error.response?.data?.msg || error.message}`);
  }
}

debugFeishuFields();