/**
 * 检查飞书表格字段类型
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

async function checkFeishuFieldTypes() {
  console.log('🔍 检查飞书表格字段类型');
  console.log('=========================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功\n');

    // 获取字段信息
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    console.log(`📋 找到 ${fields.length} 个字段\n`);

    // 显示所有字段的类型信息
    console.log('字段详细信息:');
    console.log('='.repeat(80));
    
    fields.forEach((field: any, index: number) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. 字段名: "${field.field_name}"`);
      console.log(`    Field ID: ${field.field_id}`);
      console.log(`    类型代码: ${field.type}`);
      console.log(`    UI类型: ${field.ui_type || 'undefined'}`);
      console.log(`    描述: ${field.description || '无'}`);
      console.log(`    属性: ${JSON.stringify(field.property || {}, null, 4)}`);
      console.log('');
    });

    // 特别关注封面图字段
    const coverField = fields.find((f: any) => f.field_name === '封面图');
    if (coverField) {
      console.log('🖼️ 封面图字段详细信息:');
      console.log('========================');
      console.log(`字段名: ${coverField.field_name}`);
      console.log(`Field ID: ${coverField.field_id}`);
      console.log(`类型代码: ${coverField.type}`);
      console.log(`UI类型: ${coverField.ui_type}`);
      console.log(`属性: ${JSON.stringify(coverField.property, null, 2)}`);
      
      // 根据类型判断应该如何写入数据
      if (coverField.type === 15) {
        console.log('✅ 这是URL字段类型，应该可以直接写入URL字符串');
      } else if (coverField.type === 17) {
        console.log('⚠️ 这是附件字段类型，需要先上传文件再关联');
      } else {
        console.log(`❓ 未知字段类型: ${coverField.type}`);
      }
    } else {
      console.log('❌ 未找到"封面图"字段');
    }

  } catch (error: any) {
    console.error('💥 检查失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  checkFeishuFieldTypes();
}