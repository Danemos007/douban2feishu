/**
 * 测试URL字段的正确写入格式
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

async function testUrlFieldFormat() {
  console.log('🧪 测试URL字段写入格式');
  console.log('========================');
  
  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    const testUrl = 'https://img9.doubanio.com/view/subject/l/public/s29636724.jpg';
    
    // 尝试不同的URL字段格式
    const testFormats = [
      {
        name: '纯字符串格式',
        data: testUrl
      },
      {
        name: 'Object格式 {link: "..."}',
        data: { link: testUrl }
      },
      {
        name: 'Object格式 {url: "..."}', 
        data: { url: testUrl }
      },
      {
        name: 'Object格式 {text: "...", link: "..."}',
        data: { text: 'Book Cover', link: testUrl }
      },
      {
        name: '数组格式 [url]',
        data: [testUrl]
      },
      {
        name: 'Object格式 {text: url}',
        data: { text: testUrl }
      }
    ];

    for (const format of testFormats) {
      console.log(`\n🧪 测试格式: ${format.name}`);
      console.log(`📤 数据: ${JSON.stringify(format.data)}`);

      const testRecord = {
        fields: {
          'Subject ID': `url-test-${Date.now()}`,
          '书名': `URL测试-${format.name}`,
          '封面图': format.data
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

      // 添加延迟避免过于频繁的请求
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error: any) {
    console.error('💥 测试失败:', error.message);
  }
}

if (require.main === module) {
  testUrlFieldFormat();
}