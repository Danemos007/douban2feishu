/**
 * 修复字段类型：删除错误类型的字段，重新创建正确类型
 */

import axios from 'axios';

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx',
  }
};

interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
}

class FieldTypeFixer {
  private accessToken = '';

  // 需要特殊类型的字段（而不是文本类型）
  private specialFields = [
    '我的状态',    // 单选
    '我的评分',    // 评分
    '豆瓣评分',    // 数字
    '封面图',      // URL
    '标记日期'     // 日期时间
  ];

  async getAccessToken(): Promise<void> {
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    if ((tokenResponse.data as any).code === 0) {
      this.accessToken = (tokenResponse.data as any).tenant_access_token;
      console.log('✅ 飞书令牌获取成功');
    } else {
      throw new Error(`获取令牌失败: ${(tokenResponse.data as any).msg}`);
    }
  }

  async getTableFields(): Promise<FeishuField[]> {
    const response = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((response.data as any).code === 0) {
      return (response.data as any).data.items;
    } else {
      throw new Error(`获取字段失败: ${(response.data as any).msg}`);
    }
  }

  async deleteField(fieldId: string, fieldName: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${fieldId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((response.data as any).code === 0) {
        console.log(`🗑️ 删除字段成功: ${fieldName} (${fieldId})`);
        return true;
      } else {
        console.log(`❌ 删除字段失败: ${fieldName} - [${(response.data as any).code}] ${(response.data as any).msg}`);
        return false;
      }
    } catch (error: any) {
      console.error(`💥 删除字段异常: ${fieldName} - ${error.message}`);
      return false;
    }
  }

  async createFieldWithCorrectType(fieldName: string): Promise<boolean> {
    try {
      console.log(`\n➕ 重新创建字段: ${fieldName}`);
      
      let fieldConfig: any;

      switch (fieldName) {
        case '我的状态':
          fieldConfig = {
            field_name: '我的状态',
            type: 3, // 单选
            ui_type: 'SingleSelect',
            property: {
              options: [
                { name: '想看', color: 5 },
                { name: '看过', color: 0 }
              ]
            }
          };
          break;

        case '我的评分':
          fieldConfig = {
            field_name: '我的评分',
            type: 2, // 评分
            ui_type: 'Rating',
            property: {
              formatter: '0',
              min: 1,
              max: 5,
              rating: { symbol: 'star' }
            }
          };
          break;

        case '豆瓣评分':
          fieldConfig = {
            field_name: '豆瓣评分',
            type: 2, // 数字  
            ui_type: 'Number',
            property: {
              range: { min: 0, max: 10 },
              precision: 1
            }
          };
          break;

        case '封面图':
          fieldConfig = {
            field_name: '封面图',
            type: 15, // URL
            ui_type: 'Url'
          };
          break;

        case '标记日期':
          fieldConfig = {
            field_name: '标记日期',
            type: 5, // 日期时间
            ui_type: 'DateTime'
          };
          break;

        default:
          console.log(`⚠️ 非特殊字段: ${fieldName}`);
          return false;
      }

      const response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        fieldConfig,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((response.data as any).code === 0) {
        const fieldId = (response.data as any).data?.field_id;
        console.log(`✅ ${fieldName} 重新创建成功 (${fieldId}) - 类型: ${fieldConfig.type}`);
        return true;
      } else {
        console.log(`❌ ${fieldName} 重新创建失败: [${(response.data as any).code}] ${(response.data as any).msg}`);
        return false;
      }

    } catch (error: any) {
      console.error(`💥 ${fieldName} 重新创建异常: ${error.message}`);
      return false;
    }
  }

  async run(): Promise<void> {
    try {
      console.log('🔧 修复字段类型');
      console.log('🎯 目标: 删除错误类型的字段，重新创建正确类型');
      console.log('');

      // 获取访问令牌
      await this.getAccessToken();

      // 获取当前字段
      console.log('📋 检查当前字段...');
      const fields = await this.getTableFields();
      
      // 找出需要修复的字段
      const fieldsToFix: FeishuField[] = [];
      fields.forEach(field => {
        if (this.specialFields.includes(field.field_name) && field.type === 1) {
          fieldsToFix.push(field);
        }
      });

      console.log(`📊 发现 ${fieldsToFix.length} 个需要修复的字段:`);
      fieldsToFix.forEach(field => {
        console.log(`   - ${field.field_name} (当前类型: ${field.type}, 应该是特殊类型)`);
      });

      if (fieldsToFix.length === 0) {
        console.log('✅ 所有字段类型都正确，无需修复');
        return;
      }

      console.log(`\n🚀 开始修复 ${fieldsToFix.length} 个字段...`);
      
      let successCount = 0;
      let failCount = 0;

      for (const field of fieldsToFix) {
        console.log(`\n🔄 修复字段: ${field.field_name}`);
        
        // 1. 删除错误的字段
        console.log(`  1. 删除错误类型字段 (${field.field_id})`);
        const deleted = await this.deleteField(field.field_id, field.field_name);
        
        if (deleted) {
          // 等待一下确保删除完成
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 2. 重新创建正确类型的字段
          console.log(`  2. 重新创建正确类型字段`);
          const created = await this.createFieldWithCorrectType(field.field_name);
          
          if (created) {
            successCount++;
            console.log(`  ✅ ${field.field_name} 修复成功`);
          } else {
            failCount++;
            console.log(`  ❌ ${field.field_name} 重新创建失败`);
          }
        } else {
          failCount++;
          console.log(`  ❌ ${field.field_name} 删除失败`);
        }
        
        // 操作间隔
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`\n📊 字段类型修复结果:`);
      console.log(`✅ 修复成功: ${successCount}个`);
      console.log(`❌ 修复失败: ${failCount}个`);

      if (successCount > 0) {
        console.log(`\n🎉 字段类型修复完成！现在可以进行正确格式的数据同步了`);
        console.log(`📋 特殊字段类型:`);
        this.specialFields.forEach(fieldName => {
          console.log(`   - ${fieldName}: 已修复为正确类型`);
        });
      }

    } catch (error: any) {
      console.error('💥 字段类型修复失败:', error.message);
    }
  }
}

async function main() {
  const fixer = new FieldTypeFixer();
  await fixer.run();
}

if (require.main === module) {
  main();
}