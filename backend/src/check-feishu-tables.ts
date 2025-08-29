/**
 * 检查飞书多维表格中的所有表格
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_movie_table_id'  // 当前配置的表格ID
  }
};

async function getAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });
  
  return response.data.tenant_access_token;
}

async function checkFeishuTables() {
  console.log('=== 飞书多维表格检查 ===');
  console.log(`📱 应用Token: ${CONFIG.feishu.appToken}`);
  console.log(`📋 当前配置表格ID: ${CONFIG.feishu.tableId}`);
  console.log('');

  try {
    const token = await getAccessToken();
    console.log('🔐 获取访问Token成功');

    // 1. 获取所有表格
    console.log('\n📊 获取所有表格...');
    const tablesResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const tables = tablesResponse.data.data?.items || [];
    console.log(`找到 ${tables.length} 个表格:`);
    
    for (const [index, table] of tables.entries()) {
      const isCurrent = table.table_id === CONFIG.feishu.tableId;
      console.log(`${index + 1}. ${table.name} (${table.table_id}) ${isCurrent ? '← 当前配置' : ''}`);
    }

    // 2. 检查当前配置表格的记录数
    console.log(`\n🔍 检查当前配置表格记录数...`);
    const recordsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const records = recordsResponse.data.data?.items || [];
    console.log(`当前表格中有 ${records.length} 条记录`);

    if (records.length > 0) {
      console.log('\n📋 前3条记录预览:');
      for (const [index, record] of records.slice(0, 3).entries()) {
        const fields = record.fields;
        const title = fields['电影名'] || fields['Subject ID'] || '未知';
        console.log(`${index + 1}. ${title}`);
      }
    } else {
      console.log('❌ 表格为空！');
    }

    // 3. 检查其他表格是否有数据
    console.log('\n🔎 检查其他表格是否有数据...');
    for (const table of tables) {
      if (table.table_id !== CONFIG.feishu.tableId) {
        try {
          const otherRecordsResponse = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${table.table_id}/records?page_size=5`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          const otherRecords = otherRecordsResponse.data.data?.items || [];
          if (otherRecords.length > 0) {
            console.log(`📋 表格 "${table.name}" 中有 ${otherRecords.length}+ 条记录`);
          }
        } catch (error) {
          console.log(`⚠️ 无法访问表格 "${table.name}"`);
        }
      }
    }

  } catch (error: any) {
    console.log(`❌ 检查失败: ${error.response?.data?.msg || error.message}`);
  }
}

checkFeishuTables();