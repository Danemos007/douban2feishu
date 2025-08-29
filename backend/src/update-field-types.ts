/**
 * 更新飞书字段类型
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

async function updateFieldTypes() {
  console.log('🔧 更新飞书字段类型');
  console.log('==================');
  console.log('目标: 我的标签→多选, 我的状态→单选, 我的评分→评分');
  console.log('');

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
    
    // 找到需要更新的字段
    const myTagsField = fields.find((f: any) => f.field_name === '我的标签');
    const myStatusField = fields.find((f: any) => f.field_name === '我的状态');
    const myRatingField = fields.find((f: any) => f.field_name === '我的评分');

    console.log('\n📋 当前字段状态:');
    if (myTagsField) console.log(`我的标签: 类型${myTagsField.type} (${myTagsField.ui_type})`);
    if (myStatusField) console.log(`我的状态: 类型${myStatusField.type} (${myStatusField.ui_type})`);
    if (myRatingField) console.log(`我的评分: 类型${myRatingField.type} (${myRatingField.ui_type})`);

    // 1. 更新"我的标签"为多选类型
    if (myTagsField) {
      console.log('\n🏷️ 更新"我的标签"字段为多选类型...');
      
      const updateTagsPayload = {
        field_name: '我的标签',
        type: 4, // 多选类型 (修正: type 4 是多选，type 3 是单选)
        property: {
          options: [
            { name: '心理学', color: 1 },
            { name: '传记', color: 2 },
            { name: '自然科普', color: 3 },
            { name: '健康', color: 4 },
            { name: '认知心理学', color: 5 },
            { name: '脑科学', color: 6 },
            { name: '文学', color: 7 },
            { name: '小说', color: 8 },
            { name: '政治学', color: 9 },
            { name: '经济学', color: 10 }
          ]
        }
      };

      try {
        const updateTagsResponse = await axios.put(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${myTagsField.field_id}`,
          updateTagsPayload,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((updateTagsResponse.data as any).code === 0) {
          console.log('   ✅ 我的标签字段更新成功 (多选类型)');
        } else {
          console.log(`   ❌ 我的标签字段更新失败: [${(updateTagsResponse.data as any).code}] ${(updateTagsResponse.data as any).msg}`);
        }
      } catch (error: any) {
        console.log(`   ❌ 我的标签字段更新异常: ${error.message}`);
      }
    }

    // 2. 更新"我的状态"为单选类型
    if (myStatusField) {
      console.log('\n📊 更新"我的状态"字段为单选类型...');
      
      const updateStatusPayload = {
        field_name: '我的状态',
        type: 3, // 单选类型 (修正: type 3 是单选，type 4 是多选)
        property: {
          options: [
            { name: '想读', color: 1 },
            { name: '在读', color: 2 },
            { name: '读过', color: 3 }
          ]
        }
      };

      try {
        const updateStatusResponse = await axios.put(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${myStatusField.field_id}`,
          updateStatusPayload,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((updateStatusResponse.data as any).code === 0) {
          console.log('   ✅ 我的状态字段更新成功 (单选类型)');
        } else {
          console.log(`   ❌ 我的状态字段更新失败: [${(updateStatusResponse.data as any).code}] ${(updateStatusResponse.data as any).msg}`);
        }
      } catch (error: any) {
        console.log(`   ❌ 我的状态字段更新异常: ${error.message}`);
      }
    }

    // 3. 更新"我的评分"为评分类型
    if (myRatingField) {
      console.log('\n⭐ 更新"我的评分"字段为评分类型...');
      
      const updateRatingPayload = {
        field_name: '我的评分',
        type: 2, // 数字类型
        property: {
          formatter: '0',
          rating_icon: 'star',
          max: 5
        }
      };

      try {
        const updateRatingResponse = await axios.put(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${myRatingField.field_id}`,
          updateRatingPayload,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((updateRatingResponse.data as any).code === 0) {
          console.log('   ✅ 我的评分字段更新成功 (评分类型)');
        } else {
          console.log(`   ❌ 我的评分字段更新失败: [${(updateRatingResponse.data as any).code}] ${(updateRatingResponse.data as any).msg}`);
          console.log('   📝 请求payload:', JSON.stringify(updateRatingPayload, null, 2));
        }
      } catch (error: any) {
        console.log(`   ❌ 我的评分字段更新异常: ${error.message}`);
        if (error.response?.data) {
          console.log('   📝 API响应:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n🎯 字段类型更新完成');
    console.log('建议: 等待几分钟让飞书系统同步字段更改');

  } catch (error: any) {
    console.error('💥 字段类型更新失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  updateFieldTypes();
}