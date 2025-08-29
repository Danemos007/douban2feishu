/**
 * 清理状态字段中的错误选项
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_book_table_id'
  }
};

async function cleanStatusOptions() {
  console.log('🧹 清理状态字段错误选项');
  console.log('========================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 获取状态字段信息
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

    const options = statusField.property.options;
    console.log('📋 当前选项:');
    options.forEach((opt: any, index: number) => {
      console.log(`   ${index + 1}. ${opt.name} (${opt.id})`);
    });

    // 找出需要删除的选项（非正常状态的选项）
    const validStatusOptions = ['想读', '在读', '读过'];
    const optionsToKeep = options.filter((opt: any) => 
      validStatusOptions.includes(opt.name)
    );
    
    const optionsToDelete = options.filter((opt: any) => 
      !validStatusOptions.includes(opt.name)
    );

    if (optionsToDelete.length === 0) {
      console.log('✅ 没有需要删除的错误选项');
      return;
    }

    console.log('\n🗑️ 需要删除的选项:');
    optionsToDelete.forEach((opt: any) => {
      console.log(`   - ${opt.name} (${opt.id})`);
    });

    // 更新字段，只保留正确的选项
    const updateFieldData = {
      field_name: '我的状态',
      type: 3,
      ui_type: 'SingleSelect',
      property: {
        options: optionsToKeep
      }
    };

    const updateResponse = await axios.put(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${statusField.field_id}`,
      updateFieldData,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((updateResponse.data as any).code === 0) {
      console.log('\n✅ 状态字段选项清理成功');
      console.log('📋 保留的选项:');
      optionsToKeep.forEach((opt: any) => {
        console.log(`   - ${opt.name} (${opt.id})`);
      });
    } else {
      console.log('\n❌ 字段更新失败:', (updateResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 清理失败:', error.response?.data?.msg || error.message);
  }
}

if (require.main === module) {
  cleanStatusOptions();
}