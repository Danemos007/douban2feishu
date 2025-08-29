/**
 * 检查飞书电影表格现有字段并创建缺失字段
 */

import axios from 'axios';

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here', // 电影表格ID
    tableId: 'your_movie_table_id', // table ID
  }
};

// 需要的18个电影字段
const REQUIRED_FIELDS = [
  'Subject ID', '我的标签', '我的状态', '类型', '电影名', 
  '封面图', '豆瓣评分', '我的备注', '片长', '上映日期',
  '剧情简介', '主演', '导演', '编剧', '制片地区', 
  '语言', '我的评分', '标记日期'
];

// 字段类型映射
const FIELD_TYPE_CONFIG = {
  'Subject ID': { type: 1, config: {} }, // 文本
  '我的标签': { type: 1, config: {} }, // 文本
  '我的状态': { type: 1, config: {} }, // 文本
  '类型': { type: 1, config: {} }, // 文本
  '电影名': { type: 1, config: {} }, // 文本
  '封面图': { type: 15, config: {} }, // URL
  '豆瓣评分': { type: 2, config: {} }, // 数字
  '我的备注': { type: 1, config: {} }, // 文本
  '片长': { type: 1, config: {} }, // 文本
  '上映日期': { type: 1, config: {} }, // 文本
  '剧情简介': { type: 1, config: {} }, // 文本
  '主演': { type: 1, config: {} }, // 文本
  '导演': { type: 1, config: {} }, // 文本
  '编剧': { type: 1, config: {} }, // 文本
  '制片地区': { type: 1, config: {} }, // 文本
  '语言': { type: 1, config: {} }, // 文本
  '我的评分': { type: 2, config: {} }, // 数字
  '标记日期': { type: 5, config: {} }, // 日期时间
};

class MovieTableFieldManager {
  private accessToken = '';

  async getAccessToken(): Promise<void> {
    try {
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
    } catch (error: any) {
      console.error('❌ 获取访问令牌失败:', error.message);
      throw error;
    }
  }

  async getExistingFields(): Promise<Array<{field_id: string, field_name: string, type: number}>> {
    try {
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if ((response.data as any).code === 0) {
        const fields = (response.data as any).data.items;
        console.log(`📋 获取到 ${fields.length} 个现有字段:`);
        fields.forEach((field: any, index: number) => {
          console.log(`   ${index + 1}. "${field.field_name}" (ID: ${field.field_id}, Type: ${field.type})`);
        });
        return fields;
      } else {
        throw new Error(`获取字段失败: ${(response.data as any).msg}`);
      }
    } catch (error: any) {
      console.error('❌ 获取现有字段失败:', error.message);
      throw error;
    }
  }

  async createField(fieldName: string): Promise<boolean> {
    try {
      const fieldConfig = FIELD_TYPE_CONFIG[fieldName];
      if (!fieldConfig) {
        console.error(`❌ 未找到字段配置: ${fieldName}`);
        return false;
      }

      console.log(`🔧 创建字段: "${fieldName}" (类型: ${fieldConfig.type})`);

      const response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          field_name: fieldName,
          type: fieldConfig.type,
          property: fieldConfig.config
        },
        {
          headers: { 
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((response.data as any).code === 0) {
        const newField = (response.data as any).data.field;
        console.log(`✅ 字段创建成功: "${fieldName}" -> ${newField.field_id}`);
        return true;
      } else {
        console.error(`❌ 创建字段失败: [${(response.data as any).code}] ${(response.data as any).msg}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ 创建字段 "${fieldName}" 异常:`, error.message);
      if (error.response?.data) {
        console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  async checkAndCreateFields(): Promise<void> {
    try {
      console.log('🎬 检查电影表格字段完整性');
      
      // 获取访问令牌
      await this.getAccessToken();
      
      // 获取现有字段
      const existingFields = await this.getExistingFields();
      const existingFieldNames = existingFields.map(f => f.field_name);
      
      // 找出缺失的字段
      const missingFields = REQUIRED_FIELDS.filter(fieldName => 
        !existingFieldNames.includes(fieldName)
      );
      
      console.log(`\n📊 字段状态分析:`);
      console.log(`✅ 已存在字段: ${existingFieldNames.length} 个`);
      console.log(`❌ 缺失字段: ${missingFields.length} 个`);
      
      if (missingFields.length === 0) {
        console.log('🎉 所有必需字段已存在，无需创建');
        return;
      }
      
      console.log(`\n🔧 需要创建的缺失字段:`);
      missingFields.forEach((fieldName, index) => {
        console.log(`   ${index + 1}. "${fieldName}"`);
      });
      
      // 逐个创建缺失字段
      console.log(`\n🚀 开始创建缺失字段...`);
      let createdCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < missingFields.length; i++) {
        const fieldName = missingFields[i];
        console.log(`\n[${i + 1}/${missingFields.length}] 创建字段: "${fieldName}"`);
        
        const success = await this.createField(fieldName);
        if (success) {
          createdCount++;
        } else {
          failedCount++;
        }
        
        // 添加延迟避免API限流
        if (i < missingFields.length - 1) {
          console.log('⏳ 等待1秒...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 输出最终结果
      console.log(`\n📊 字段创建完成统计:`);
      console.log(`✅ 成功创建: ${createdCount} 个字段`);
      console.log(`❌ 创建失败: ${failedCount} 个字段`);
      
      if (failedCount === 0) {
        console.log('🎉 所有缺失字段创建成功！现在可以进行电影同步了');
      } else {
        console.log('⚠️ 部分字段创建失败，可能影响同步效果');
      }
      
    } catch (error: any) {
      console.error('💥 字段检查和创建过程发生异常:', error.message);
    }
  }
}

// 运行检查和创建
async function main() {
  const manager = new MovieTableFieldManager();
  await manager.checkAndCreateFields();
}

if (require.main === module) {
  main();
}