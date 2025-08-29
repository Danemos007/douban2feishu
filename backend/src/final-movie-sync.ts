/**
 * 最终电影数据同步 - 使用Field ID确保准确性
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
    tableId: 'tblj9s2409ur7Rrx'
  }
};

class FeishuService {
  private token = '';
  private fieldMap: Record<string, string> = {};

  async getAccessToken(): Promise<string> {
    if (this.token) return this.token;
    
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });
    
    this.token = response.data.tenant_access_token;
    return this.token;
  }

  async loadFieldMap(): Promise<void> {
    const token = await this.getAccessToken();
    
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const fields = fieldsResponse.data.data?.items || [];
    
    this.fieldMap = {};
    for (const field of fields) {
      this.fieldMap[field.field_name] = field.field_id;
    }
    
    console.log('📋 字段映射加载完成:');
    Object.entries(this.fieldMap).forEach(([name, id]) => {
      console.log(`  ${name} -> ${id}`);
    });
  }

  async batchSyncMovies(movies: MovieData[]): Promise<void> {
    const token = await this.getAccessToken();
    
    // 分批处理，每批10条
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      console.log(`\n📤 同步第 ${Math.floor(i / batchSize) + 1} 批 (${i + 1}-${Math.min(i + batchSize, movies.length)}/${movies.length})`);
      
      const records = batch.map(movie => {
        // 使用Field ID而不是字段名
        const fields: Record<string, any> = {};
        
        if (this.fieldMap['Subject ID']) fields[this.fieldMap['Subject ID']] = movie.subjectId;
        if (this.fieldMap['电影名']) fields[this.fieldMap['电影名']] = movie.title;
        if (this.fieldMap['我的状态']) fields[this.fieldMap['我的状态']] = movie.myStatus;
        if (this.fieldMap['类型']) fields[this.fieldMap['类型']] = movie.genre || '';
        if (this.fieldMap['封面图']) fields[this.fieldMap['封面图']] = movie.coverImage || '';
        if (this.fieldMap['豆瓣评分']) fields[this.fieldMap['豆瓣评分']] = movie.doubanRating || 0;
        if (this.fieldMap['我的备注']) fields[this.fieldMap['我的备注']] = movie.myComment || '';
        if (this.fieldMap['片长']) fields[this.fieldMap['片长']] = movie.duration || '';
        if (this.fieldMap['上映日期']) fields[this.fieldMap['上映日期']] = movie.releaseDate || '';
        if (this.fieldMap['剧情简介']) fields[this.fieldMap['剧情简介']] = movie.summary || '';
        if (this.fieldMap['主演']) fields[this.fieldMap['主演']] = movie.cast || '';
        if (this.fieldMap['导演']) fields[this.fieldMap['导演']] = movie.director || '';
        if (this.fieldMap['编剧']) fields[this.fieldMap['编剧']] = movie.writer || '';
        if (this.fieldMap['制片地区']) fields[this.fieldMap['制片地区']] = movie.country || '';
        if (this.fieldMap['语言']) fields[this.fieldMap['语言']] = movie.language || '';
        if (this.fieldMap['我的评分']) fields[this.fieldMap['我的评分']] = movie.myRating || 0;
        if (this.fieldMap['我的标签']) fields[this.fieldMap['我的标签']] = movie.myTags || '';
        if (this.fieldMap['标记日期']) fields[this.fieldMap['标记日期']] = movie.markDate ? new Date(movie.markDate).getTime() : Date.now();
        
        return { fields };
      });

      try {
        const response = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/batch_create`,
          { records },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ 第 ${Math.floor(i / batchSize) + 1} 批同步成功 (${batch.length} 条记录)`);
        successCount += batch.length;

      } catch (error: any) {
        console.log(`❌ 第 ${Math.floor(i / batchSize) + 1} 批同步失败: ${error.response?.data?.msg || error.message}`);
        
        // 批量失败时尝试单条同步
        console.log('🔄 尝试单条同步...');
        for (const movie of batch) {
          try {
            const singleRecord = records.find(r => r.fields[this.fieldMap['电影名']] === movie.title);
            await axios.post(
              `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
              singleRecord,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`  ✅ ${movie.title}`);
            successCount++;
          } catch (singleError: any) {
            console.log(`  ❌ ${movie.title}: ${singleError.response?.data?.msg || singleError.message}`);
          }
        }
      }

      // 延迟避免请求过快
      if (i + batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎯 批量同步完成: ${successCount}/${movies.length} 条记录成功`);
  }

  async verifyFinalResult(): Promise<number> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const records = response.data.data?.items || [];
      console.log(`\n📊 最终验证: 表格中现有 ${records.length} 条记录`);
      
      if (records.length > 0) {
        console.log('\n🎬 部分记录预览:');
        for (const [index, record] of records.slice(0, 5).entries()) {
          const fields = record.fields;
          const title = fields[this.fieldMap['电影名']] || '未知标题';
          const duration = fields[this.fieldMap['片长']] || '无';
          const releaseDate = fields[this.fieldMap['上映日期']] || '无';
          console.log(`${index + 1}. ${title}`);
          console.log(`   片长: ${duration} | 上映日期: ${releaseDate}`);
        }
      }
      
      return records.length;
    } catch (error: any) {
      console.log(`❌ 验证失败: ${error.response?.data?.msg || error.message}`);
      return 0;
    }
  }
}

async function finalMovieSync() {
  console.log('=== 最终电影数据同步（应用所有修复） ===');
  console.log('🎯 目标：36部电影完整同步，验证片长、上映日期修复');
  console.log('');

  // 1. 加载缓存数据
  const cacheDir = path.join(__dirname, '..', 'cache');
  const cacheFilePath = path.join(cacheDir, 'movie-test-290244208-2025-08-27T10-24-50.json');
  
  let cacheData;
  try {
    const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
    cacheData = JSON.parse(cacheContent);
    console.log(`📁 成功加载缓存文件: ${cacheData.totalMovies} 部电影`);
  } catch (error) {
    console.log('❌ 读取缓存文件失败');
    return;
  }

  const movies: MovieData[] = cacheData.detailedMovies || [];

  if (movies.length === 0) {
    console.log('❌ 缓存中没有电影数据');
    return;
  }

  const feishu = new FeishuService();

  // 2. 加载字段映射
  console.log('🔧 加载字段映射...');
  await feishu.loadFieldMap();

  // 3. 批量同步电影数据
  console.log('\n📤 开始批量同步电影数据...');
  await feishu.batchSyncMovies(movies);

  // 4. 最终验证
  const finalCount = await feishu.verifyFinalResult();
  
  console.log('\n=== 同步完成 ===');
  if (finalCount === movies.length) {
    console.log('🎉 完美！36部电影全部同步成功');
    console.log('🔗 请刷新飞书表格查看完整数据和修复效果');
  } else {
    console.log(`⚠️ 部分同步: ${finalCount}/${movies.length} 部电影`);
  }
}

finalMovieSync();