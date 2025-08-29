/**
 * 修复电影数据同步 - 确保数据正确写入到🎬电影表格
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  genre?: string;
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
}

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx'  // 🎬 电影表格
  }
};

class FeishuService {
  private token = '';

  async getAccessToken(): Promise<string> {
    if (this.token) return this.token;
    
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });
    
    this.token = response.data.tenant_access_token;
    return this.token;
  }

  async syncSingleRecord(movie: MovieData, index: number): Promise<any> {
    const token = await this.getAccessToken();
    
    const data = {
      fields: {
        'Subject ID': movie.subjectId,
        '电影名': movie.title,
        '我的状态': movie.myStatus,
        '类型': movie.genre || '',
        '封面图': movie.coverImage || '',
        '豆瓣评分': movie.doubanRating || 0,
        '我的备注': movie.myComment || '',
        '片长': movie.duration || '',
        '上映日期': movie.releaseDate || '',
        '剧情简介': movie.summary || '',
        '主演': movie.cast || '',
        '导演': movie.director || '',
        '编剧': movie.writer || '',
        '制片地区': movie.country || '',
        '语言': movie.language || '',
        '我的评分': movie.myRating || 0,
        '我的标签': movie.myTags || '',
        '标记日期': movie.markDate ? new Date(movie.markDate).getTime() : Date.now()
      }
    };

    try {
      console.log(`[${index + 1}] 同步《${movie.title}》...`);
      const response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ 成功: ${movie.title}`);
      return response.data;
    } catch (error: any) {
      console.log(`❌ 失败: ${movie.title} - ${error.response?.data?.msg || error.message}`);
      throw error;
    }
  }

  async verifyRecords(): Promise<number> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const records = response.data.data?.items || [];
      console.log(`📊 表格中现有 ${records.length} 条记录`);
      
      if (records.length > 0) {
        console.log('前5条记录:');
        for (const [index, record] of records.slice(0, 5).entries()) {
          const title = record.fields['电影名'] || '未知标题';
          const duration = record.fields['片长'] || '无';
          const releaseDate = record.fields['上映日期'] || '无';
          console.log(`${index + 1}. ${title} | 片长: ${duration} | 上映: ${releaseDate}`);
        }
      }
      
      return records.length;
    } catch (error: any) {
      console.log(`❌ 验证失败: ${error.response?.data?.msg || error.message}`);
      return 0;
    }
  }
}

async function fixMovieSync() {
  console.log('=== 修复电影数据同步到🎬电影表格 ===');
  console.log(`🎯 目标表格: 🎬 电影 (${CONFIG.feishu.tableId})`);
  console.log('');

  // 1. 加载缓存数据
  const cacheDir = path.join(__dirname, '..', 'cache');
  const cacheFilePath = path.join(cacheDir, 'movie-test-290244208-2025-08-27T10-24-50.json');
  
  let cacheData;
  try {
    const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
    cacheData = JSON.parse(cacheContent);
    console.log(`📁 成功加载缓存文件`);
  } catch (error) {
    console.log('❌ 读取缓存文件失败');
    return;
  }

  const movies: MovieData[] = cacheData.detailedMovies || [];
  console.log(`📊 缓存中有 ${movies.length} 部电影`);

  if (movies.length === 0) {
    console.log('❌ 缓存中没有电影数据');
    return;
  }

  const feishu = new FeishuService();

  // 2. 验证当前表格状态
  console.log('\n🔍 检查当前表格状态...');
  const currentCount = await feishu.verifyRecords();
  
  if (currentCount > 0) {
    console.log(`⚠️ 表格中已有 ${currentCount} 条记录，建议先清理`);
  }

  // 3. 逐条同步（确保成功率）
  console.log('\n📤 开始逐条同步电影数据...');
  let successCount = 0;
  let failCount = 0;

  for (const [index, movie] of movies.entries()) {
    try {
      await feishu.syncSingleRecord(movie, index);
      successCount++;
      
      // 延迟避免请求过快
      if (index < movies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      failCount++;
    }
  }

  // 4. 最终验证
  console.log('\n🎯 最终验证...');
  const finalCount = await feishu.verifyRecords();
  
  console.log('\n=== 同步结果汇总 ===');
  console.log(`📊 预期电影数: ${movies.length}`);
  console.log(`✅ 成功同步: ${successCount}`);
  console.log(`❌ 失败同步: ${failCount}`);
  console.log(`📋 表格记录数: ${finalCount}`);
  console.log('');
  
  if (finalCount === movies.length) {
    console.log('🎉 同步完成！请刷新飞书表格查看数据');
  } else {
    console.log('⚠️ 记录数不匹配，请检查同步结果');
  }
}

fixMovieSync();