/**
 * 系统诊断测试 - 检查根本问题
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

async function systemDiagnosisTest() {
  console.log('🔍 系统诊断测试');
  console.log('================');
  console.log('目标: 找出FieldNameNotFound的根本原因');
  console.log('');

  try {
    // Step 1: 验证访问令牌
    console.log('🔑 Step 1: 验证访问令牌');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    if ((tokenResponse.data as any).code !== 0) {
      console.log(`❌ Token获取失败: [${(tokenResponse.data as any).code}] ${(tokenResponse.data as any).msg}`);
      return;
    }

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');
    console.log('');

    // Step 2: 验证应用信息
    console.log('🏢 Step 2: 验证应用信息');
    try {
      const appInfoResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if ((appInfoResponse.data as any).code === 0) {
        const appInfo = (appInfoResponse.data as any).data.app;
        console.log(`✅ 应用验证成功`);
        console.log(`   应用名: ${appInfo.name}`);
        console.log(`   应用ID: ${appInfo.app_id}`);
        console.log(`   版本: ${appInfo.revision || 'N/A'}`);
      } else {
        console.log(`❌ 应用验证失败: [${(appInfoResponse.data as any).code}] ${(appInfoResponse.data as any).msg}`);
      }
    } catch (appError: any) {
      console.log(`❌ 应用验证异常: ${appError.message}`);
    }
    console.log('');

    // Step 3: 验证表格访问权限
    console.log('📊 Step 3: 验证表格访问权限');
    try {
      const tablesResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if ((tablesResponse.data as any).code === 0) {
        const tables = (tablesResponse.data as any).data.items;
        console.log(`✅ 表格列表获取成功，共 ${tables.length} 个表格`);
        
        const targetTable = tables.find((t: any) => t.table_id === CONFIG.feishu.tableId);
        if (targetTable) {
          console.log(`✅ 目标表格找到: "${targetTable.name}" (${targetTable.table_id})`);
        } else {
          console.log(`❌ 目标表格未找到: ${CONFIG.feishu.tableId}`);
          console.log('   可用表格:');
          tables.forEach((t: any) => console.log(`     - ${t.name} (${t.table_id})`));
        }
      } else {
        console.log(`❌ 表格列表获取失败: [${(tablesResponse.data as any).code}] ${(tablesResponse.data as any).msg}`);
      }
    } catch (tableError: any) {
      console.log(`❌ 表格访问异常: ${tableError.message}`);
    }
    console.log('');

    // Step 4: 详细检查字段状态
    console.log('🔍 Step 4: 详细检查字段状态');
    try {
      const fieldsResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if ((fieldsResponse.data as any).code === 0) {
        const fields = (fieldsResponse.data as any).data.items;
        console.log(`✅ 字段获取成功，共 ${fields.length} 个字段`);
        
        // 检查前5个字段的详细信息
        console.log('   前5个字段详情:');
        fields.slice(0, 5).forEach((field: any, index: number) => {
          console.log(`   ${index + 1}. 字段名: "${field.field_name}"`);
          console.log(`      Field ID: ${field.field_id}`);
          console.log(`      类型: ${field.type}`);
          console.log(`      描述: ${field.description || '无'}`);
          console.log(`      是否主键: ${field.is_primary || false}`);
          console.log('');
        });
      } else {
        console.log(`❌ 字段获取失败: [${(fieldsResponse.data as any).code}] ${(fieldsResponse.data as any).msg}`);
      }
    } catch (fieldError: any) {
      console.log(`❌ 字段检查异常: ${fieldError.message}`);
    }

    // Step 5: 尝试最简单的数据写入
    console.log('📝 Step 5: 尝试最简数据写入');
    try {
      // 获取第一个文本字段用于测试
      const fieldsResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const fields = (fieldsResponse.data as any).data.items;
      const textField = fields.find((f: any) => f.type === 1); // 文本类型

      if (textField) {
        console.log(`   使用字段: "${textField.field_name}" (${textField.field_id})`);
        
        const simpleRecord = {
          fields: {
            [textField.field_id]: `系统诊断测试 ${new Date().toLocaleTimeString()}`
          }
        };

        const writeResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          simpleRecord,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((writeResponse.data as any).code === 0) {
          console.log('   ✅ 简单数据写入成功！');
          console.log(`   记录ID: ${(writeResponse.data as any).data.record.record_id}`);
          console.log('   🎉 这证明基本的数据写入功能正常！');
        } else {
          console.log(`   ❌ 简单数据写入失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
          console.log('   完整响应:', JSON.stringify(writeResponse.data, null, 2));
        }
      } else {
        console.log('   ❌ 未找到可用的文本字段');
      }
    } catch (writeError: any) {
      console.log(`   ❌ 数据写入异常: ${writeError.message}`);
      if (writeError.response?.data) {
        console.log('   API响应:', JSON.stringify(writeError.response.data, null, 2));
      }
    }

  } catch (error: any) {
    console.error('💥 系统诊断失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }

  // 结论和建议
  console.log('');
  console.log('🎯 诊断总结');
  console.log('===========');
  console.log('此测试逐步验证了:');
  console.log('1. 访问令牌获取');
  console.log('2. 应用信息验证');  
  console.log('3. 表格访问权限');
  console.log('4. 字段状态检查');
  console.log('5. 基本数据写入');
  console.log('');
  console.log('💡 如果Step 5成功，说明FieldNameNotFound可能是批量操作或字段组合的问题');
  console.log('💡 如果Step 5也失败，说明是更基础的权限或API调用问题');
}

if (require.main === module) {
  systemDiagnosisTest();
}