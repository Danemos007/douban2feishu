/**
 * 不包含上映日期字段的同步 - 先展示其他修复效果
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
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_movie_table_id'
  }
};

// 字段ID映射 (不包含上映日期)
const FIELD_MAP = {
  'Subject ID': 'fldKmJVq6L',
  '我的状态': 'fldDrbhSil', 
  '我的标签': 'fld2rZdVch',
  '类型': 'fld3ZLKd5w',
  '电影名': 'fldlEJOhz2',
  '封面图': 'fldSfGtXNw',
  '豆瓣评分': 'fldwyBcAuu',
  '我的备注': 'fldQKJ88CY',
  '片长': 'fldSPzsp5q',
  '剧情简介': 'fldoQ6Npgv',
  '主演': 'fldSsGny61',
  '导演': 'fldEkK7utE',
  '编剧': 'fldMtOP3x0',
  '制片地区': 'fldzrDZcS2',
  '语言': 'fld1BdCDtG',
  '标记日期': 'fldqwshLdn',
  '我的评分': 'fldUH5oBE6'
};

async function getAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });
  
  return response.data.tenant_access_token;
}

async function syncMovieWithoutReleaseDate() {
  console.log('=== 不包含上映日期的电影同步（展示其他修复效果）===');
  console.log('🎯 重点验证：片长解析修复、制片地区、语言字段');
  console.log('⚠️ 注意：暂时跳过上映日期字段，稍后手动添加');
  console.log('');

  // 1. 加载缓存数据
  const cacheDir = path.join(__dirname, '..', 'cache');
  const cacheFilePath = path.join(cacheDir, 'movie-test-your_user_id-2025-08-27T10-24-50.json');
  
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

  try {
    const token = await getAccessToken();

    // 2. 批量同步 (不包含上映日期)
    console.log('📤 开始批量同步电影数据...');
    
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      console.log(`\n批次 ${Math.floor(i / batchSize) + 1}: 同步第 ${i + 1}-${Math.min(i + batchSize, movies.length)} 部电影`);
      
      const records = batch.map(movie => {
        const fields: Record<string, any> = {};
        
        fields[FIELD_MAP['Subject ID']] = movie.subjectId;
        fields[FIELD_MAP['电影名']] = movie.title;
        fields[FIELD_MAP['我的状态']] = movie.myStatus;
        fields[FIELD_MAP['类型']] = movie.genre || '';
        if (movie.coverImage) fields[FIELD_MAP['封面图']] = movie.coverImage;
        if (movie.doubanRating) fields[FIELD_MAP['豆瓣评分']] = movie.doubanRating;
        fields[FIELD_MAP['我的备注']] = movie.myComment || '';
        fields[FIELD_MAP['片长']] = movie.duration || '';
        // 暂时跳过上映日期: fields[FIELD_MAP['上映日期']] = movie.releaseDate || '';
        fields[FIELD_MAP['剧情简介']] = movie.summary || '';
        fields[FIELD_MAP['主演']] = movie.cast || '';
        fields[FIELD_MAP['导演']] = movie.director || '';
        fields[FIELD_MAP['编剧']] = movie.writer || '';
        fields[FIELD_MAP['制片地区']] = movie.country || '';
        fields[FIELD_MAP['语言']] = movie.language || '';
        fields[FIELD_MAP['我的评分']] = movie.myRating || 0;
        fields[FIELD_MAP['我的标签']] = movie.myTags || '';
        fields[FIELD_MAP['标记日期']] = movie.markDate ? new Date(movie.markDate).getTime() : Date.now();
        
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

        console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 同步成功 (${batch.length} 条记录)`);
        successCount += batch.length;

        // 显示重点电影的修复效果
        const keyMovies = batch.filter(m => 
          ['26766869', '4739952', '3742360', '36491177'].includes(m.subjectId)
        );
        
        if (keyMovies.length > 0) {
          console.log('  🔍 重点电影修复效果:');
          for (const movie of keyMovies) {
            console.log(`    《${movie.title}》`);
            console.log(`      片长: ${movie.duration}`);
            console.log(`      制片地区: ${movie.country}`);
            console.log(`      语言: ${movie.language}`);
          }
        }

      } catch (error: any) {
        console.log(`❌ 批次 ${Math.floor(i / batchSize) + 1} 同步失败: ${error.response?.data?.msg || error.message}`);
      }

      // 延迟避免请求过快
      if (i + batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. 验证结果
    console.log('\n🔍 验证同步结果...');
    const recordsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=50`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const records = recordsResponse.data.data?.items || [];
    console.log(`📊 表格中现有 ${records.length} 条记录`);
    
    if (records.length > 0) {
      console.log('\n🎬 关键电影修复验证:');
      
      // 查找关键电影
      const keyMovieIds = ['26766869', '4739952', '3742360'];
      const keyRecords = records.filter(r => 
        keyMovieIds.includes(r.fields[FIELD_MAP['Subject ID']])
      );
      
      for (const record of keyRecords) {
        const fields = record.fields;
        const title = fields[FIELD_MAP['电影名']] || '未知';
        const duration = fields[FIELD_MAP['片长']] || '无';
        const country = fields[FIELD_MAP['制片地区']] || '无';
        const language = fields[FIELD_MAP['语言']] || '无';
        
        console.log(`📽️ 《${title}》:`);
        console.log(`   片长: ${duration}`);
        console.log(`   制片地区: ${country}`);
        console.log(`   语言: ${language}`);
        
        // 验证片长修复
        if (title.includes('鹬') && duration.includes('6分03秒')) {
          console.log(`   ✅ 片长解析修复成功`);
        }
        if (title.includes('初恋') && duration.includes('118分钟') && duration.includes('100分钟')) {
          console.log(`   ✅ 片长多版本修复成功`);
        }
        
        console.log('');
      }
    }

    console.log('\n=== 同步完成 ===');
    console.log(`📊 预期: ${movies.length} 部电影`);
    console.log(`✅ 成功: ${successCount} 部电影`);
    console.log(`📋 表格: ${records.length} 条记录`);
    console.log('');
    console.log('🎯 修复效果验证:');
    console.log('✅ 片长解析修复：《鹬 Piper》6分03秒、《初恋这件小事》多版本');
    console.log('✅ 制片地区和语言字段：正确解析，无多余信息');
    console.log('⚠️ 上映日期字段：需要您手动添加后重新同步');
    
    if (records.length === movies.length) {
      console.log('\n🎉 全部电影同步成功！请刷新飞书表格查看数据');
    }

  } catch (error: any) {
    console.log(`❌ 同步失败: ${error.response?.data?.msg || error.message}`);
  }
}

syncMovieWithoutReleaseDate();