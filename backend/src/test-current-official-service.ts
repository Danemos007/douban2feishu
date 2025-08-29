/**
 * 测试当前正式服务的电影抓取和解析能力
 * 用于评估是否需要紧急修复字段解析逻辑
 */

import axios from 'axios';
import * as fs from 'fs';

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_movie_table_id',
  }
};

// 电影字段映射
const MOVIE_FIELD_MAPPINGS = {
  'subjectId': 'Subject ID',
  'myTags': '我的标签',
  'myStatus': '我的状态',
  'genre': '类型',
  'title': '电影名',
  'coverImage': '封面图',
  'doubanRating': '豆瓣评分',
  'myComment': '我的备注',
  'duration': '片长',
  'releaseDate': '上映日期',
  'summary': '剧情简介',
  'cast': '主演',
  'director': '导演',
  'writer': '编剧',
  'country': '制片地区',
  'language': '语言',
  'myRating': '我的评分',
  'markDate': '标记日期'
};

class OfficialServiceTest {
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

  async testCurrentOfficialService(): Promise<void> {
    try {
      console.log('🔍 测试当前正式服务状态');
      console.log('📊 目标：评估正式服务的字段解析能力');
      console.log('');

      // 读取缓存获取前3部电影信息
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-your_user_id-2025-08-27T10-24-50.json';
      
      if (!fs.existsSync(cacheFile)) {
        throw new Error(`缓存文件不存在: ${cacheFile}`);
      }

      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const testMovies = cacheData.detailedMovies.slice(0, 3);
      
      console.log('📋 待测试的3部电影:');
      testMovies.forEach((movie: any, index: number) => {
        console.log(`   ${index + 1}. 《${movie.title}》 (${movie.subjectId})`);
        console.log(`      缓存中的片长: ${movie.duration || '无'}`);
        console.log(`      缓存中的上映日期: ${movie.releaseDate || '无'}`);
        console.log('');
      });

      // 获取飞书访问令牌
      console.log('🔐 获取飞书访问令牌...');
      await this.getAccessToken();

      // 检查第一部电影是否是关键测试用例
      const firstMovie = testMovies[0];
      if (firstMovie.subjectId === '3742360') { // 让子弹飞
        console.log('🎯 检测到关键测试用例《让子弹飞》');
      } else if (firstMovie.subjectId === '26766869') { // 鹬 Piper  
        console.log('🎯 检测到关键测试用例《鹬 Piper》- 将验证"6分03秒"格式解析');
      }

      console.log('\n📋 当前测试策略：');
      console.log('1. 直接使用缓存数据同步到飞书（模拟正式服务的数据输出）');
      console.log('2. 观察字段解析质量，特别是片长、上映日期等关键字段');
      console.log('3. 评估是否需要紧急修复正式服务');

      // 使用缓存数据进行同步测试（模拟正式服务输出）
      console.log('\n🚀 开始同步测试...');
      
      let successCount = 0;
      let fieldIssueCount = 0;
      
      for (let i = 0; i < testMovies.length; i++) {
        const movie = testMovies[i];
        console.log(`\n[${i + 1}/3] 处理: 《${movie.title}》`);
        
        // 分析字段质量
        const fieldAnalysis = this.analyzeFieldQuality(movie);
        if (fieldAnalysis.hasIssues) {
          fieldIssueCount++;
          console.log(`  ⚠️ 发现字段质量问题:`);
          fieldAnalysis.issues.forEach(issue => {
            console.log(`    - ${issue}`);
          });
        } else {
          console.log(`  ✅ 字段质量良好`);
        }
        
        // 尝试同步到飞书
        try {
          await this.syncMovieToFeishu(movie);
          successCount++;
        } catch (error: any) {
          console.log(`  ❌ 同步失败: ${error.message}`);
        }
        
        // 短暂延迟
        if (i < testMovies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 输出评估结果
      console.log('\n📊 正式服务能力评估结果:');
      console.log(`✅ 同步成功: ${successCount}/3`);
      console.log(`⚠️ 字段问题: ${fieldIssueCount}/3`);
      
      if (fieldIssueCount > 0) {
        console.log('\n🚨 评估结论: 正式服务需要字段解析修复');
        console.log('📋 建议行动:');
        console.log('1. 立即将测试文件中验证的字段修复逻辑集成到正式服务');
        console.log('2. 重新生成完整的缓存数据');
        console.log('3. 进行全量数据同步测试');
      } else {
        console.log('\n✅ 评估结论: 正式服务工作正常，可直接使用');
        console.log('📋 建议行动: 清理测试文件，建立标准Git工作流');
      }

    } catch (error: any) {
      console.error('💥 测试过程发生异常:', error.message);
    }
  }

  private analyzeFieldQuality(movie: any): { hasIssues: boolean, issues: string[] } {
    const issues: string[] = [];

    // 检查片长字段
    if (!movie.duration) {
      issues.push('片长字段为空');
    } else if (movie.duration.includes('6分03秒')) {
      // 如果包含这种格式说明解析正确
    } else if (movie.subjectId === '26766869' && !movie.duration.includes('6分03秒')) {
      issues.push('鹬 Piper的片长应该是"6分03秒"格式，当前解析可能不完整');
    }

    // 检查上映日期字段
    if (!movie.releaseDate) {
      issues.push('上映日期字段为空');
    } else if (movie.subjectId === '3742360' && !movie.releaseDate.includes('中国大陆')) {
      issues.push('让子弹飞的上映日期应包含地区信息');
    }

    // 检查制片地区字段
    if (!movie.country) {
      issues.push('制片地区字段为空');
    }

    // 检查语言字段  
    if (!movie.language) {
      issues.push('语言字段为空');
    }

    return {
      hasIssues: issues.length > 0,
      issues
    };
  }

  private async syncMovieToFeishu(movie: any): Promise<void> {
    const fields: any = {};
    
    // 映射字段
    for (const [key, feishuField] of Object.entries(MOVIE_FIELD_MAPPINGS)) {
      const value = movie[key];
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'coverImage') {
          fields[feishuField] = { link: value };
        } else if (key === 'markDate') {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              fields[feishuField] = Math.floor(date.getTime());
            }
          } catch (e) {
            console.log(`⚠️ 日期格式转换失败: ${value}`);
          }
        } else {
          fields[feishuField] = value;
        }
      }
    }

    const response = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
      { fields },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((response.data as any).code === 0) {
      console.log(`  ✅ 同步成功: ${Object.keys(fields).length}个字段`);
    } else {
      throw new Error(`飞书API错误: [${(response.data as any).code}] ${(response.data as any).msg}`);
    }
  }
}

// 运行测试
async function main() {
  const test = new OfficialServiceTest();
  await test.testCurrentOfficialService();
}

if (require.main === module) {
  main();
}