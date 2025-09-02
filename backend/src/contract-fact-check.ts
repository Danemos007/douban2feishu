#!/usr/bin/env ts-node

/**
 * 飞书API契约事实核查脚本
 * 
 * 目的：调用真实飞书API，获取准确的响应数据结构，为Schema设计提供事实依据
 * 执行：npx ts-node src/contract-fact-check.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// 测试配置 - 使用项目文档中的飞书测试账号信息
const TEST_CONFIG = {
  appId: 'cli_a8f5de628bf5500e',
  appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
  appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
  tableId: 'tblgm24SCh26ZJ0o', // 书籍表格ID
};

const FEISHU_BASE_URL = 'https://open.feishu.cn';

interface ApiTestResult {
  endpoint: string;
  success: boolean;
  responseData?: any;
  error?: string;
  timestamp: string;
}

class FeishuApiFactChecker {
  private results: ApiTestResult[] = [];

  /**
   * 获取租户访问令牌
   */
  async getTenantAccessToken(): Promise<string> {
    console.log('\n🔑 步骤1: 获取租户访问令牌...');
    
    try {
      const response = await axios.post(
        `${FEISHU_BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`,
        {
          app_id: TEST_CONFIG.appId,
          app_secret: TEST_CONFIG.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      this.logResult('POST /open-apis/auth/v3/tenant_access_token/internal', true, response.data);

      if (response.data.code !== 0) {
        throw new Error(`获取令牌失败: [${response.data.code}] ${response.data.msg}`);
      }

      console.log('✅ 令牌获取成功');
      return response.data.tenant_access_token;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logResult('POST /open-apis/auth/v3/tenant_access_token/internal', false, null, errorMsg);
      console.error('❌ 令牌获取失败:', errorMsg);
      throw error;
    }
  }

  /**
   * 获取表格字段信息 (核心API)
   */
  async getTableFields(accessToken: string): Promise<any> {
    console.log('\n📊 步骤2: 获取表格字段信息 (核心API)...');

    try {
      const response = await axios.get(
        `${FEISHU_BASE_URL}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/fields`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      this.logResult('GET /open-apis/bitable/v1/apps/.../tables/.../fields', true, response.data);

      if (response.data.code !== 0) {
        throw new Error(`获取字段信息失败: [${response.data.code}] ${response.data.msg}`);
      }

      console.log('✅ 字段信息获取成功');
      console.log(`📈 返回字段数量: ${response.data.data?.items?.length || 0}`);
      
      // 打印字段类型分布
      if (response.data.data?.items) {
        const typeDistribution: Record<number, number> = {};
        response.data.data.items.forEach((field: any) => {
          typeDistribution[field.type] = (typeDistribution[field.type] || 0) + 1;
        });
        console.log('📋 字段类型分布:', typeDistribution);
      }

      return response.data;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logResult('GET /open-apis/bitable/v1/apps/.../tables/.../fields', false, null, errorMsg);
      console.error('❌ 字段信息获取失败:', errorMsg);
      throw error;
    }
  }

  /**
   * 测试记录查询API
   */
  async searchRecords(accessToken: string): Promise<any> {
    console.log('\n🔍 步骤3: 测试记录查询API...');

    try {
      const response = await axios.post(
        `${FEISHU_BASE_URL}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/records/search`,
        {
          page_size: 2, // 只获取2条记录作为样本
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      this.logResult('POST /open-apis/bitable/v1/apps/.../tables/.../records/search', true, response.data);

      if (response.data.code !== 0) {
        throw new Error(`记录查询失败: [${response.data.code}] ${response.data.msg}`);
      }

      console.log('✅ 记录查询成功');
      console.log(`📊 返回记录数量: ${response.data.data?.items?.length || 0}`);

      return response.data;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logResult('POST /open-apis/bitable/v1/apps/.../tables/.../records/search', false, null, errorMsg);
      console.error('❌ 记录查询失败:', errorMsg);
      throw error;
    }
  }

  /**
   * 记录测试结果
   */
  private logResult(endpoint: string, success: boolean, responseData?: any, error?: string) {
    this.results.push({
      endpoint,
      success,
      responseData,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 保存结果到文件
   */
  async saveResults() {
    console.log('\n💾 保存测试结果...');

    const outputDir = path.join(__dirname, 'feishu', 'contract', '__fixtures__');
    await fs.promises.mkdir(outputDir, { recursive: true });

    // 保存完整测试结果
    const fullResultsPath = path.join(outputDir, 'fact-check-results.json');
    await fs.promises.writeFile(
      fullResultsPath,
      JSON.stringify(this.results, null, 2)
    );

    // 提取关键API响应作为fixtures
    for (const result of this.results) {
      if (result.success && result.responseData) {
        let filename = '';
        if (result.endpoint.includes('tenant_access_token')) {
          filename = 'auth-response.json';
        } else if (result.endpoint.includes('/fields')) {
          filename = 'fields-response.json';
        } else if (result.endpoint.includes('/records/search')) {
          filename = 'records-response.json';
        }

        if (filename) {
          const fixturePath = path.join(outputDir, filename);
          await fs.promises.writeFile(
            fixturePath,
            JSON.stringify(result.responseData, null, 2)
          );
          console.log(`✅ 已保存: ${filename}`);
        }
      }
    }

    console.log(`📁 测试结果已保存到: ${outputDir}`);
    return outputDir;
  }

  /**
   * 生成分析报告
   */
  generateAnalysisReport(): void {
    console.log('\n📊 === 飞书API响应结构分析报告 ===');
    
    const fieldsResult = this.results.find(r => r.endpoint.includes('/fields') && r.success);
    if (fieldsResult?.responseData?.data?.items) {
      const fields = fieldsResult.responseData.data.items;
      
      console.log(`\n🔍 字段信息分析 (共${fields.length}个字段):`);
      
      // 分析字段结构
      const firstField = fields[0];
      console.log('📋 字段对象结构:', Object.keys(firstField));
      
      // 统计字段类型
      const typeStats: Record<number, { count: number; names: string[] }> = {};
      fields.forEach((field: any) => {
        if (!typeStats[field.type]) {
          typeStats[field.type] = { count: 0, names: [] };
        }
        typeStats[field.type].count++;
        typeStats[field.type].names.push(field.field_name);
      });

      console.log('\n📊 字段类型统计:');
      Object.entries(typeStats).forEach(([type, stats]) => {
        console.log(`  类型 ${type}: ${stats.count}个字段 [${stats.names.slice(0, 3).join(', ')}${stats.names.length > 3 ? '...' : ''}]`);
      });

      // 检查关键字段
      const requiredFields = ['field_id', 'field_name', 'type'];
      console.log('\n🔑 关键字段检查:');
      requiredFields.forEach(fieldName => {
        const hasField = firstField.hasOwnProperty(fieldName);
        console.log(`  ${fieldName}: ${hasField ? '✅ 存在' : '❌ 缺失'}`);
        if (hasField) {
          console.log(`    样例值: ${JSON.stringify(firstField[fieldName])}`);
        }
      });
    }

    // 统计API调用成功率
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    console.log(`\n📈 API调用成功率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始飞书API契约事实核查...\n');
  console.log('📋 测试配置:');
  console.log(`   App ID: ${TEST_CONFIG.appId}`);
  console.log(`   App Token: ${TEST_CONFIG.appToken}`);
  console.log(`   Table ID: ${TEST_CONFIG.tableId}`);

  const checker = new FeishuApiFactChecker();

  try {
    // 步骤1: 获取访问令牌
    const accessToken = await checker.getTenantAccessToken();

    // 步骤2: 获取字段信息 (最重要的API)
    await checker.getTableFields(accessToken);

    // 步骤3: 测试记录查询
    await checker.searchRecords(accessToken);

    // 保存结果
    const outputDir = await checker.saveResults();

    // 生成分析报告
    checker.generateAnalysisReport();

    console.log('\n🎉 契约事实核查完成!');
    console.log(`📁 结果文件位置: ${outputDir}`);

  } catch (error) {
    console.error('\n💥 测试失败:', error);
    
    // 即使失败也保存已有结果
    try {
      await checker.saveResults();
    } catch (saveError) {
      console.error('保存结果失败:', saveError);
    }
    
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}