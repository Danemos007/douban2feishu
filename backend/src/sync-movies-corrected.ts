/**
 * 修复后的电影同步测试 - 使用正确的单条记录API方法
 * 
 * 修复内容：
 * 1. 使用 /records 而非 /records/batch_create
 * 2. 使用字段名而非Field ID映射
 * 3. 参考成功的sync-from-cache.ts方法
 */

import axios from 'axios';
import * as fs from 'fs';

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here', // 用户提供的电影表格ID
    tableId: 'your_movie_table_id', // 用户提供的table ID
  }
};

// 18个电影字段的中文映射
const MOVIE_FIELD_MAPPING = {
  subjectId: 'Subject ID',
  myTags: '我的标签',
  myStatus: '我的状态', 
  type: '类型',
  title: '电影名',
  coverImage: '封面图',
  doubanRating: '豆瓣评分',
  myComment: '我的备注',
  duration: '片长',
  releaseDate: '上映日期',
  summary: '剧情简介',
  cast: '主演',
  director: '导演',
  writer: '编剧',
  country: '制片地区',
  language: '语言',
  myRating: '我的评分',
  markDate: '标记日期'
};

interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  coverImage?: string;
  doubanRating?: number;
  myComment?: string;
  duration?: string;
  releaseDate?: string;
  summary?: string;
  cast?: string;
  director?: string;
  writer?: string;
  country?: string;
  language?: string;
  myRating?: number;
  myTags?: string;
  markDate?: string;
  genre?: string;
}

interface CacheData {
  totalMovies: number;
  collectCount: number;
  wishCount: number;
  detailedMovies: MovieData[];
}

class CorrectedMovieSync {
  private successCount = 0;
  private failCount = 0;
  
  async getAccessToken(): Promise<string> {
    try {
      const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: CONFIG.feishu.appId,
        app_secret: CONFIG.feishu.appSecret
      });

      if ((tokenResponse.data as any).code === 0) {
        const accessToken = (tokenResponse.data as any).tenant_access_token;
        console.log('✅ 飞书令牌获取成功');
        return accessToken;
      } else {
        throw new Error(`获取令牌失败: ${(tokenResponse.data as any).msg}`);
      }
    } catch (error: any) {
      console.error('❌ 获取访问令牌失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据成功的sync-from-cache.ts方法构建记录字段
   */
  private buildRecordFields(movie: MovieData): Record<string, any> {
    const recordFields: Record<string, any> = {};

    Object.entries(MOVIE_FIELD_MAPPING).forEach(([movieField, feishuFieldName]) => {
      const value = (movie as any)[movieField];
      
      if (value !== undefined && value !== null && value !== '') {
        // 特殊字段处理（参考sync-from-cache.ts）
        if (feishuFieldName === '标记日期') {
          // 日期字段 - 转换为时间戳格式
          if (typeof value === 'string') {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                const timestamp = Math.floor(date.getTime());
                recordFields[feishuFieldName] = timestamp;
                console.log(`   📅 日期字段: ${value} -> ${timestamp}`);
              }
            } catch (e) {
              console.log(`   ⚠️ 日期格式转换失败: ${value}`);
            }
          }
        }
        else if (feishuFieldName === '封面图') {
          // URL字段 - 使用正确的对象格式
          const url = String(value);
          if (url.startsWith('http://') || url.startsWith('https://')) {
            recordFields[feishuFieldName] = { link: url };
            console.log(`   🖼️ 封面图: ${JSON.stringify({ link: url })}`);
          }
        }
        else if (feishuFieldName === '我的评分') {
          // 评分字段 - 确保数字格式
          const rating = Number(value);
          if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            recordFields[feishuFieldName] = rating;
            console.log(`   ⭐ 我的评分: ${rating}`);
          }
        }
        else if (feishuFieldName === '豆瓣评分') {
          // 豆瓣评分字段 - 确保数字格式
          const rating = Number(value);
          if (!isNaN(rating) && rating > 0) {
            recordFields[feishuFieldName] = rating;
            console.log(`   📊 豆瓣评分: ${rating}`);
          }
        }
        else {
          // 普通文本字段
          recordFields[feishuFieldName] = String(value);
        }
      }
    });

    return recordFields;
  }

  /**
   * 使用正确的单条记录API同步电影
   */
  async syncMovie(movie: MovieData, accessToken: string): Promise<boolean> {
    try {
      const recordFields = this.buildRecordFields(movie);
      
      console.log(`\n📝 准备同步《${movie.title}》- ${Object.keys(recordFields).length}个字段`);
      
      // 调试输出关键字段
      if (recordFields['我的标签']) console.log(`   🏷️ 标签: ${recordFields['我的标签']}`);
      if (recordFields['我的状态']) console.log(`   📊 状态: ${recordFields['我的状态']}`);
      if (recordFields['我的评分']) console.log(`   ⭐ 评分: ${recordFields['我的评分']}`);

      const record = { fields: recordFields };

      // 🔍 调试：输出完整的API请求载荷
      console.log(`\n🔍 [DEBUG] 《${movie.title}》完整API载荷:`);
      console.log('📤 Request Payload:', JSON.stringify(record, null, 2));

      // ✅ 使用正确的单条记录API
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
        console.log(`✅ 《${movie.title}》同步成功`);
        this.successCount++;
        return true;
      } else {
        console.log(`❌ 《${movie.title}》同步失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
        this.failCount++;
        return false;
      }

    } catch (error: any) {
      console.error(`💥 《${movie.title}》同步异常:`, error.message);
      if (error.response?.data) {
        console.error('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
      }
      this.failCount++;
      return false;
    }
  }

  async syncAllMovies(): Promise<void> {
    try {
      console.log('🎬 开始修复后的电影同步测试');
      console.log('🔧 使用正确的单条记录API方法');
      
      // 读取电影缓存数据
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-your_user_id-2025-08-27T10-24-50.json';
      
      if (!fs.existsSync(cacheFile)) {
        throw new Error(`缓存文件不存在: ${cacheFile}`);
      }

      const cacheData: CacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log(`📊 加载电影数据: ${cacheData.totalMovies}部 (${cacheData.collectCount}部看过 + ${cacheData.wishCount}部想看)`);

      // 获取访问令牌
      console.log('\n🔐 获取访问令牌...');
      const accessToken = await this.getAccessToken();

      // 逐条同步电影
      console.log('\n🚀 开始同步电影数据...');
      
      for (let i = 0; i < cacheData.detailedMovies.length; i++) {
        const movie = cacheData.detailedMovies[i];
        console.log(`\n[${i + 1}/${cacheData.detailedMovies.length}] 处理: 《${movie.title}》`);
        
        await this.syncMovie(movie, accessToken);
        
        // 添加延迟避免API限流
        if (i < cacheData.detailedMovies.length - 1) {
          console.log('⏳ 等待2秒...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 输出最终结果
      console.log('\n📊 同步完成统计:');
      console.log(`✅ 成功: ${this.successCount}部`);
      console.log(`❌ 失败: ${this.failCount}部`);
      console.log(`📈 成功率: ${((this.successCount / cacheData.totalMovies) * 100).toFixed(1)}%`);

    } catch (error: any) {
      console.error('💥 同步过程发生异常:', error.message);
    }
  }
}

// 运行测试
async function main() {
  const sync = new CorrectedMovieSync();
  await sync.syncAllMovies();
}

if (require.main === module) {
  main();
}