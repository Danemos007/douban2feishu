/**
 * Field ID有效性验证测试
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

async function fieldIdValidationTest() {
  console.log('🔍 Field ID 有效性验证测试');
  console.log('============================');
  console.log('目标: 验证Field ID是否真的有效并可以用于写入');
  console.log('');

  try {
    // 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // 获取字段详情
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    console.log(`✅ 字段获取成功，共 ${fields.length} 个字段\n`);

    // 详细检查每个字段的属性
    console.log('📋 所有字段详细信息:');
    console.log('='.repeat(50));
    
    fields.forEach((field: any, index: number) => {
      console.log(`${index + 1}. 字段信息:`);
      console.log(`   名称: "${field.field_name}"`);
      console.log(`   ID: ${field.field_id}`);
      console.log(`   类型: ${field.type}`);
      console.log(`   是否主键: ${field.is_primary || false}`);
      console.log(`   描述: ${field.description || '无'}`);
      console.log(`   UI类型: ${field.ui_type || 'undefined'}`);
      console.log(`   属性: ${JSON.stringify(field.property || {})}`);
      console.log('');
    });

    // 尝试使用不同的API来单独验证某个字段
    console.log('🔍 单独验证字段 API:');
    console.log('-'.repeat(30));
    
    const targetFieldId = 'fldFOzkZ68'; // Subject ID field
    
    try {
      // 使用字段详情API验证单个字段
      const fieldDetailResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${targetFieldId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if ((fieldDetailResponse.data as any).code === 0) {
        console.log('✅ 字段详情API验证成功');
        console.log('字段详情:', JSON.stringify((fieldDetailResponse.data as any).data, null, 2));
      } else {
        console.log(`❌ 字段详情API失败: [${(fieldDetailResponse.data as any).code}] ${(fieldDetailResponse.data as any).msg}`);
      }
    } catch (fieldDetailError: any) {
      console.log('❌ 字段详情API异常:', fieldDetailError.message);
    }

    console.log('\n🧪 尝试不同的写入格式:');
    console.log('-'.repeat(35));

    // 测试1: 使用字段名而不是Field ID
    const subjectIdField = fields.find((f: any) => f.field_name === 'Subject ID');
    if (subjectIdField) {
      console.log(`\n测试1: 使用字段名 "${subjectIdField.field_name}"`);
      
      try {
        const recordWithFieldName = {
          fields: {
            [subjectIdField.field_name]: `测试_字段名_${Date.now()}`
          }
        };

        const writeResponse1 = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          recordWithFieldName,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((writeResponse1.data as any).code === 0) {
          console.log('   ✅ 使用字段名写入成功!');
          console.log(`   记录ID: ${(writeResponse1.data as any).data.record.record_id}`);
        } else {
          console.log(`   ❌ 使用字段名写入失败: [${(writeResponse1.data as any).code}] ${(writeResponse1.data as any).msg}`);
        }
      } catch (error: any) {
        console.log(`   ❌ 使用字段名写入异常: ${error.message}`);
      }
    }

    // 测试2: 尝试其他字段的Field ID
    console.log(`\n测试2: 尝试其他字段的Field ID`);
    
    // 找一个非主键的文本字段
    const nonPrimaryTextField = fields.find((f: any) => f.type === 1 && !f.is_primary);
    if (nonPrimaryTextField) {
      console.log(`使用字段: "${nonPrimaryTextField.field_name}" (${nonPrimaryTextField.field_id})`);
      
      try {
        const recordWithOtherFieldId = {
          fields: {
            [nonPrimaryTextField.field_id]: `测试_其他字段ID_${Date.now()}`
          }
        };

        const writeResponse2 = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          recordWithOtherFieldId,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((writeResponse2.data as any).code === 0) {
          console.log('   ✅ 使用其他Field ID写入成功!');
          console.log(`   记录ID: ${(writeResponse2.data as any).data.record.record_id}`);
        } else {
          console.log(`   ❌ 使用其他Field ID写入失败: [${(writeResponse2.data as any).code}] ${(writeResponse2.data as any).msg}`);
        }
      } catch (error: any) {
        console.log(`   ❌ 使用其他Field ID写入异常: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('💥 Field ID验证测试失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }

  console.log('\n🎯 结论分析');
  console.log('===========');
  console.log('如果字段名写入成功，说明问题在于Field ID的使用方式');
  console.log('如果所有方式都失败，说明可能是权限或表格状态问题');
}

if (require.main === module) {
  fieldIdValidationTest();
}