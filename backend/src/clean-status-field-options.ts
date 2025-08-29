/**
 * 清理"我的状态"字段中的多余选项
 * 只保留：想读、在读、读过 三个选项
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

async function cleanStatusFieldOptions() {
  console.log('🧹 清理"我的状态"字段选项');
  console.log('===========================');
  
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
      console.log('❌ 未找到"我的状态"字段');
      return;
    }

    console.log(`📋 当前选项: ${statusField.property.options.length}个`);
    statusField.property.options.forEach((opt: any) => {
      console.log(`   - ${opt.name} (${opt.id})`);
    });

    // 识别需要删除的选项 (名称是选项ID的错误选项)
    const badOptions = statusField.property.options.filter((opt: any) => 
      opt.name.startsWith('opt') || opt.id === 'opt2049342679' || opt.id === 'opt400956355'
    );

    if (badOptions.length === 0) {
      console.log('✅ 没有需要清理的错误选项');
      return;
    }

    console.log(`\n🗑️ 发现 ${badOptions.length} 个需要删除的错误选项:`);
    badOptions.forEach((opt: any) => {
      console.log(`   - 删除: "${opt.name}" (${opt.id})`);
    });

    // 构建更新后的选项列表 (只保留正确的3个)
    const validOptions = statusField.property.options.filter((opt: any) => 
      ['想读', '在读', '读过'].includes(opt.name)
    );

    console.log(`\n✨ 保留 ${validOptions.length} 个正确选项:`);
    validOptions.forEach((opt: any) => {
      console.log(`   - 保留: "${opt.name}" (${opt.id})`);
    });

    // 更新字段选项
    const updateData = {
      field_name: '我的状态',
      type: 3,
      ui_type: 'SingleSelect',
      property: {
        options: validOptions
      }
    };

    const updateResponse = await axios.put(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${statusField.field_id}`,
      updateData,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((updateResponse.data as any).code === 0) {
      console.log('\n🎉 状态字段选项清理成功!');
      console.log('📋 最终选项:');
      validOptions.forEach((opt: any) => {
        console.log(`   ✅ ${opt.name} (${opt.id})`);
      });
    } else {
      console.log('\n❌ 清理失败:', (updateResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 清理失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  cleanStatusFieldOptions();
}