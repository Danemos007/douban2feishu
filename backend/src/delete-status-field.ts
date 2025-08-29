/**
 * 删除有问题的"我的状态"字段，准备重新创建
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblgm24SCh26ZJ0o'
  }
};

async function deleteStatusField() {
  console.log('🗑️ 删除有问题的"我的状态"字段');
  console.log('===============================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 获取字段信息
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    const statusField = fields.find((f: any) => f.field_name === '我的状态');
    
    if (!statusField) {
      console.log('❓ 未找到"我的状态"字段，可能已被删除');
      return;
    }

    console.log(`📋 找到字段: "${statusField.field_name}" (${statusField.field_id})`);
    console.log(`📊 当前选项: ${statusField.property?.options?.length || 0}个`);
    
    if (statusField.property?.options) {
      statusField.property.options.forEach((opt: any) => {
        console.log(`   - ${opt.name} (${opt.id})`);
      });
    }

    // 删除字段
    const deleteResponse = await axios.delete(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${statusField.field_id}`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if ((deleteResponse.data as any).code === 0) {
      console.log('\n🎉 "我的状态"字段删除成功!');
      console.log('💡 现在可以重新创建干净的状态字段');
    } else {
      console.log('\n❌ 删除失败:', (deleteResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 删除失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  deleteStatusField();
}