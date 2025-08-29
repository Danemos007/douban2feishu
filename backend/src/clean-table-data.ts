/**
 * 清空飞书表格中的数据，用于重新测试
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

async function cleanTableData() {
  console.log('🧹 清空飞书表格数据');
  console.log('====================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 获取表格中的所有记录
    let pageToken = '';
    let allRecords: any[] = [];

    do {
      const recordsUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`;
      
      const recordsResponse = await axios.get(recordsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const data = (recordsResponse.data as any).data;
      allRecords.push(...data.items);
      pageToken = data.page_token || '';
      
    } while (pageToken);

    console.log(`📊 找到 ${allRecords.length} 条记录`);

    if (allRecords.length === 0) {
      console.log('✅ 表格已为空，无需清理');
      return;
    }

    // 批量删除记录
    const recordIds = allRecords.map(record => record.record_id);
    const batchSize = 100; // 飞书API限制批量操作数量

    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      
      try {
        const deleteResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/batch_delete`,
          {
            records: batch
          },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((deleteResponse.data as any).code === 0) {
          console.log(`✅ 删除了第 ${i + 1}-${Math.min(i + batchSize, recordIds.length)} 条记录`);
        } else {
          console.log(`❌ 删除第 ${i + 1}-${Math.min(i + batchSize, recordIds.length)} 条记录失败:`, (deleteResponse.data as any).msg);
        }
      } catch (error) {
        console.log(`⚠️ 删除批次失败:`, error);
      }
    }

    console.log('\n🎉 表格数据清理完成!');

  } catch (error: any) {
    console.error('💥 清理失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  cleanTableData();
}