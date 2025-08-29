/**
 * Basic API Test - Minimal test to check if Feishu API is working
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

async function basicApiTest() {
  console.log('🔧 Basic API Test');
  console.log('=================');

  try {
    // Step 1: Get Access Token
    console.log('1. Getting access token...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    }, {
      timeout: 10000
    });

    if ((tokenResponse.data as any).code !== 0) {
      console.log('❌ Token request failed:', (tokenResponse.data as any));
      return;
    }

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('   ✅ Access token obtained');

    // Step 2: Try the most basic API call - get app info
    console.log('\n2. Testing basic API call...');
    
    try {
      const basicResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000
        }
      );
      
      if ((basicResponse.data as any).code === 0) {
        console.log('   ✅ Basic API call works');
        console.log(`   App: ${(basicResponse.data as any).data?.app?.name}`);
        return true;
      } else {
        console.log('   ❌ Basic API call failed');
        console.log('   Response:', basicResponse.data);
        return false;
      }
    } catch (apiError: any) {
      console.log('   ❌ Basic API call error:', apiError.message);
      if (apiError.response?.data) {
        console.log('   Response:', apiError.response.data);
      }
      return false;
    }

  } catch (error: any) {
    console.error('💥 Basic test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Network connection issue');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   DNS resolution issue');
    }
    return false;
  }
}

if (require.main === module) {
  basicApiTest();
}