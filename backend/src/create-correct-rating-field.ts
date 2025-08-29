/**
 * 使用正确的官方文档格式创建评分字段
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

async function createCorrectRatingField() {
  console.log('⭐ 使用正确配置创建评分字段');
  console.log('============================');
  console.log('📖 参考: https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/guide#a040af79');
  console.log('');

  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 删除旧的我的评分字段（如果存在）
    console.log('\n🗑️ 先删除现有的"我的评分"字段...');
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    const existingRatingField = fields.find((f: any) => f.field_name === '我的评分');
    
    if (existingRatingField) {
      console.log(`   找到现有字段 ID: ${existingRatingField.field_id}`);
      try {
        await axios.delete(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${existingRatingField.field_id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        console.log('   ✅ 旧字段删除成功');
      } catch (e) {
        console.log('   ⚠️ 旧字段删除失败，继续创建新字段');
      }
    } else {
      console.log('   ℹ️ 未找到现有的"我的评分"字段');
    }

    // 使用正确的配置创建评分字段
    console.log('\n⭐ 创建正确的评分字段...');
    
    const correctRatingPayload = {
      field_name: '我的评分',
      type: 2,
      ui_type: 'Rating',
      property: {
        formatter: '0',
        min: 1,
        max: 5,
        rating: {
          symbol: 'star'
        }
      }
    };

    console.log('📝 正确请求体:', JSON.stringify(correctRatingPayload, null, 2));

    try {
      const createResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        correctRatingPayload,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((createResponse.data as any).code === 0) {
        const fieldData = (createResponse.data as any).data;
        console.log('   ✅ 评分字段创建成功！');
        console.log(`   🆔 Field ID: ${fieldData.field_id}`);
        console.log(`   📊 类型: ${fieldData.type} | UI: ${fieldData.ui_type}`);
        console.log(`   ⭐ 属性: ${JSON.stringify(fieldData.property, null, 2)}`);
        
        // 等待一下让字段生效
        console.log('\n⏳ 等待字段同步...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🎉 评分字段创建完成！准备测试同步功能...');
        return fieldData.field_id;
        
      } else {
        console.log(`   ❌ 评分字段创建失败: [${(createResponse.data as any).code}] ${(createResponse.data as any).msg}`);
        console.log('   📝 完整响应:', JSON.stringify((createResponse.data as any), null, 2));
        return null;
      }
    } catch (error: any) {
      console.log(`   ❌ 创建异常: ${error.message}`);
      if (error.response?.data) {
        console.log('   📝 API错误:', JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }

  } catch (error: any) {
    console.error('💥 创建失败:', error.message);
    return null;
  }
}

if (require.main === module) {
  createCorrectRatingField();
}