/**
 * 字段逐个调试测试 - 找出具体问题字段
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

async function fieldByFieldDebug() {
  console.log('🔬 字段逐个调试测试');
  console.log('==================');
  console.log('🎯 目标: 找出导致 FieldNameNotFound 的具体字段');
  console.log('');

  try {
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    
    // 获取所有字段
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    console.log(`📋 找到 ${fields.length} 个字段，开始逐个测试...`);
    console.log('');

    const testFields = [
      { name: 'Subject ID', testValue: 'TEST_001' },
      { name: '书名', testValue: '测试书名' },
      { name: '副标题', testValue: '测试副标题' },
      { name: '作者', testValue: '测试作者' },
      { name: '译者', testValue: '测试译者' },
      { name: '出版社', testValue: '测试出版社' },
      { name: '出版年份', testValue: '2024' }, // 问题字段
      { name: '豆瓣评分', testValue: 8.5 },
      { name: '我的评分', testValue: 4 },
      { name: '我的状态', testValue: '想读' },
      { name: '我的标签', testValue: '测试标签' },
      { name: '我的备注', testValue: '测试备注' }
    ];

    let successCount = 0;
    let failCount = 0;
    const workingFields: string[] = [];
    const problematicFields: { name: string, fieldId: string, error: string }[] = [];

    for (const testField of testFields) {
      const field = fields.find((f: any) => f.field_name === testField.name);
      
      if (!field) {
        console.log(`⚠️  字段 "${testField.name}" 不存在，跳过`);
        continue;
      }

      console.log(`🧪 测试字段: "${testField.name}" (${field.field_id})`);
      console.log(`   类型: ${field.type}, 值: ${testField.testValue}`);
      
      try {
        const record = {
          fields: {
            [field.field_id]: testField.testValue
          }
        };

        const writeResponse = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          record,
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if ((writeResponse.data as any).code === 0) {
          console.log(`   ✅ 成功! 记录ID: ${(writeResponse.data as any).data.record.record_id}`);
          successCount++;
          workingFields.push(testField.name);
        } else {
          console.log(`   ❌ 失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
          failCount++;
          problematicFields.push({
            name: testField.name,
            fieldId: field.field_id,
            error: (writeResponse.data as any).msg
          });
        }
      } catch (error: any) {
        console.log(`   ❌ 异常: ${error.message}`);
        failCount++;
        problematicFields.push({
          name: testField.name,
          fieldId: field.field_id,
          error: error.message
        });
      }
      
      console.log(''); // 空行分隔
      
      // 短暂延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 汇总报告
    console.log('📊 字段测试汇总报告');
    console.log('==================');
    console.log(`✅ 成功字段: ${successCount}`);
    console.log(`❌ 失败字段: ${failCount}`);
    console.log('');

    if (workingFields.length > 0) {
      console.log('🟢 工作正常的字段:');
      workingFields.forEach(name => console.log(`   ✅ ${name}`));
      console.log('');
    }

    if (problematicFields.length > 0) {
      console.log('🔴 有问题的字段:');
      problematicFields.forEach(field => {
        console.log(`   ❌ ${field.name} (${field.fieldId})`);
        console.log(`      错误: ${field.error}`);
      });
      console.log('');
    }

    // 给出具体建议
    if (successCount > 0 && failCount > 0) {
      console.log('💡 分析结论:');
      console.log('   • 部分字段工作正常，说明权限和基础配置没问题');
      console.log('   • 特定字段存在问题，可能是字段类型或数据格式问题');
      console.log('   • 建议: 只使用工作正常的字段进行数据写入');
      
      console.log('\n🛠️  建议的修复方案:');
      console.log('   1. 使用工作正常的字段创建最小可行记录');
      console.log('   2. 逐步添加其他字段，找出具体问题');
      console.log('   3. 检查问题字段的类型定义和数据格式要求');
    } else if (successCount === 0) {
      console.log('💡 分析结论:');
      console.log('   • 所有字段都失败，可能是系统性问题');
      console.log('   • 需要进一步检查表格权限或字段状态');
    } else {
      console.log('💡 分析结论:');
      console.log('   • 所有字段都工作正常！');
      console.log('   • 问题可能在于多字段组合或数据格式');
    }

  } catch (error: any) {
    console.error('💥 调试测试失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', error.response.data);
    }
  }
}

if (require.main === module) {
  fieldByFieldDebug();
}