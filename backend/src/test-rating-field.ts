/**
 * 测试评分字段Rating类型创建
 * 验证系统能否正确创建Rating字段类型
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx'
  }
};

class RatingFieldTest {
  private accessToken: string = '';

  async getAccessToken(): Promise<string> {
    console.log('🔑 获取飞书访问令牌...');
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const responseData = response.data as any;
    if (responseData.code !== 0) {
      throw new Error(`获取飞书令牌失败: ${responseData.msg}`);
    }

    this.accessToken = responseData.tenant_access_token;
    console.log('✅ 飞书令牌获取成功');
    return this.accessToken;
  }

  async createRatingField(): Promise<void> {
    console.log('\\n📊 测试创建Rating类型字段...');
    
    const fieldConfig = {
      field_name: '测试评分字段',
      type: 2, // 评分
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

    console.log('请求配置:', JSON.stringify(fieldConfig, null, 2));

    try {
      const response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        fieldConfig,
        {
          headers: { 
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      console.log('\\n飞书API响应:', JSON.stringify(responseData, null, 2));
      
      if (responseData.code === 0) {
        const newField = responseData.data.field;
        console.log(`\\n✅ Rating字段创建成功!`);
        console.log(`   - 字段ID: ${newField.field_id}`);
        console.log(`   - 字段名: ${newField.field_name}`);
        console.log(`   - 字段类型: ${newField.type}`);
        console.log(`   - UI类型: ${newField.ui_type || '未返回'}`);
        
        if (newField.property) {
          console.log(`   - 评分配置:`, newField.property);
        }
      } else {
        console.log(`❌ Rating字段创建失败: ${responseData.msg}`);
        console.log('错误详情:', responseData);
      }

    } catch (error: any) {
      console.error(`💥 创建Rating字段异常: ${error.message}`);
      if (error.response?.data) {
        console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  async listFields(): Promise<void> {
    console.log('\\n🔍 查看表格所有字段...');
    
    try {
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      if (responseData.code === 0) {
        const fields = responseData.data.items || [];
        console.log(`\\n📋 表格字段列表 (${fields.length}个字段):`);
        
        fields.forEach((field: any, index: number) => {
          console.log(`   ${index + 1}. "${field.field_name}" (类型${field.type}, ${field.ui_type || 'N/A'}) - ${field.field_id}`);
          
          // 特别显示评分相关字段
          if (field.field_name.includes('评分') && field.property) {
            console.log(`      配置: ${JSON.stringify(field.property, null, 6).replace(/\\n/g, ' ')}`);
          }
        });
      }
    } catch (error: any) {
      console.error('获取字段列表失败:', error.message);
    }
  }

  async deleteTestField(): Promise<void> {
    console.log('\\n🗑️ 清理测试字段...');
    
    try {
      // 先获取字段列表找到测试字段
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      if (responseData.code === 0) {
        const testField = (responseData.data.items || []).find((field: any) => 
          field.field_name === '测试评分字段'
        );

        if (testField) {
          console.log(`找到测试字段: ${testField.field_name} (${testField.field_id})`);
          
          const deleteResponse = await axios.delete(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${testField.field_id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            }
          );

          const deleteData = deleteResponse.data as any;
          if (deleteData.code === 0) {
            console.log('✅ 测试字段删除成功');
          } else {
            console.log('❌ 测试字段删除失败:', deleteData);
          }
        } else {
          console.log('⚠️ 未找到测试字段，跳过删除');
        }
      }
    } catch (error: any) {
      console.error('删除测试字段失败:', error.message);
    }
  }
}

async function main() {
  console.log('🧪 Rating字段类型创建测试');
  console.log('============================');
  
  const tester = new RatingFieldTest();
  
  try {
    await tester.getAccessToken();
    await tester.listFields();
    await tester.createRatingField();
    await tester.listFields();
    await tester.deleteTestField();
    
    console.log('\\n✅ 测试完成');
  } catch (error: any) {
    console.error('💥 测试失败:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}