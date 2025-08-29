/**
 * 测试状态字段的正确写入格式
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

async function testStatusFormat() {
  console.log('🧪 测试状态字段写入格式');
  console.log('========================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 获取状态字段选项
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
    console.log('📋 现有选项:');
    options.forEach((opt: any) => {
      console.log(`   - ${opt.name}: ${opt.id}`);
    });

    // 尝试不同的格式
    const testFormats = [
      {
        name: '纯字符串格式',
        data: options[2].id // "读过"的ID
      },
      {
        name: 'Object格式 {id: "..."}',
        data: { id: options[2].id }
      },
      {
        name: 'Object格式 {text: "..."}', 
        data: { text: options[2].name }
      },
      {
        name: '数组格式 ["id"]',
        data: [options[2].id]
      },
      {
        name: '数组对象格式 [{id: "..."}]',
        data: [{ id: options[2].id }]
      },
      {
        name: '选项名称字符串',
        data: options[2].name
      }
    ];

    for (const format of testFormats) {
      console.log(`\n🧪 测试格式: ${format.name}`);
      console.log(`📤 数据: ${JSON.stringify(format.data)}`);

      const testRecord = {
        fields: {
          'Subject ID': `test-${Date.now()}`,
          '书名': `测试书籍-${format.name}`,
          '我的状态': format.data
        }
      };

      try {
        const writeResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          testRecord,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((writeResponse.data as any).code === 0) {
          console.log(`✅ ${format.name} 格式成功`);
        } else {
          console.log(`❌ ${format.name} 格式失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
        }
      } catch (error: any) {
        console.log(`❌ ${format.name} 格式异常:`, error.response?.data?.msg || error.message);
      }
    }

  } catch (error: any) {
    console.error('💥 测试失败:', error.message);
  }
}

if (require.main === module) {
  testStatusFormat();
}