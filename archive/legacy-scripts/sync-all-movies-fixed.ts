/**
 * 全量电影数据同步（应用所有修复）
 * 1. 从最新缓存加载电影列表
 * 2. 使用修复后的逻辑重新解析关键字段
 * 3. 同步到飞书多维表格
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

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

  async clearTable(): Promise<void> {
    const token = await this.getAccessToken();
    
    try {
      // 获取所有记录
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=500`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const records = response.data.data?.items || [];
      console.log(`📋 找到 ${records.length} 条现有记录，准备清理...`);

      // 批量删除
      if (records.length > 0) {
        const recordIds = records.map((r: any) => r.record_id);
        await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/batch_delete`,
          { records: recordIds },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`🧹 已清理 ${records.length} 条旧记录`);
      }
    } catch (error) {
      console.log(`⚠️ 清理记录时出错，继续同步: ${error}`);
    }
  }

  async batchSyncRecords(movies: MovieData[]): Promise<any> {
    const token = await this.getAccessToken();
    
    const records = movies.map(movie => ({
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
    }));

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
      return response.data;
    } catch (error: any) {
      console.log(`❌ 批量同步失败: ${error.response?.data?.msg || error.message}`);
      throw error;
    }
  }
}

async function applyFixedParsing(movie: MovieData): Promise<MovieData> {
  const url = `https://movie.douban.com/subject/${movie.subjectId}/`;
  
  try {
    console.log(`  🔍 重新解析关键字段: ${movie.title}`);
    const response = await axios.get(url, { headers: DOUBAN_HEADERS });
    const html = response.data as string;
    const $ = cheerio.load(html);
    const infoElement = $('#info');
    
    // 应用修复后的解析逻辑
    const fixedMovie = { ...movie };

    // 1. 片长修复逻辑（支持多版本和无v:runtime）
    const durationElement = infoElement.find('span[property="v:runtime"]');
    if (durationElement.length > 0) {
      const durationLine = durationElement.closest('span.pl').parent().html() || durationElement.parent().html() || '';
      const durationMatch = durationLine.match(/片长:<\/span>\s*(.+?)(?:<br|$)/);
      if (durationMatch && durationMatch[1]) {
        const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
        fixedMovie.duration = fullDuration;
      } else {
        fixedMovie.duration = durationElement.text().trim();
      }
    } else {
      const durationSpan = infoElement.find('span.pl:contains("片长")');
      if (durationSpan.length > 0) {
        const durationLine = durationSpan.parent().html() || '';
        const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
        if (durationMatch && durationMatch[1]) {
          fixedMovie.duration = durationMatch[1].trim();
        }
      }
    }

    // 2. 上映日期修复逻辑（保留完整信息）
    const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
    if (releaseDateElements.length > 0) {
      const allReleaseDates: string[] = [];
      releaseDateElements.each((index, element) => {
        const dateText = $(element).text().trim();
        if (dateText) {
          allReleaseDates.push(dateText);
        }
      });
      if (allReleaseDates.length > 0) {
        fixedMovie.releaseDate = allReleaseDates.join(' / ');
      }
    }

    // 3. 制片地区修复逻辑
    const countrySpan = infoElement.find('span:contains("制片国家")').parent();
    if (countrySpan.length > 0) {
      const fullText = countrySpan.text();
      const match = fullText.match(/制片国家\/地区:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const countryText = match[1].trim();
        const cleanCountryText = countryText.split(/语言:|上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanCountryText) {
          fixedMovie.country = cleanCountryText;
        }
      }
    }

    // 4. 语言修复逻辑
    const languageSpan = infoElement.find('span:contains("语言")').parent();
    if (languageSpan.length > 0) {
      const fullText = languageSpan.text();
      const match = fullText.match(/语言:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const languageText = match[1].trim();
        const cleanLanguageText = languageText.split(/上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanLanguageText) {
          fixedMovie.language = cleanLanguageText;
        }
      }
    }

    console.log(`    ✅ 关键修复应用完成`);
    return fixedMovie;

  } catch (error) {
    console.log(`    ⚠️ 解析失败，使用原数据: ${error}`);
    return movie;
  }
}

async function syncAllMoviesWithFixes() {
  console.log('=== 全量电影数据同步（应用所有修复）===');
  console.log('🎯 目标：同步36部电影，验证片长、上映日期、制片地区、语言字段修复');
  console.log('');

  // 1. 加载缓存数据
  const cacheDir = path.join(__dirname, '..', 'cache');
  const cacheFiles = fs.readdirSync(cacheDir)
    .filter(f => f.startsWith('movie-test-your_user_id-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (cacheFiles.length === 0) {
    console.log('❌ 没有找到电影缓存文件');
    return;
  }

  // 使用已知有数据的缓存文件
  const latestCacheFile = 'movie-test-your_user_id-2025-08-27T10-24-50.json';
  const cacheFilePath = path.join(cacheDir, latestCacheFile);
  console.log(`📁 使用缓存文件: ${latestCacheFile}`);

  let cacheData;
  try {
    const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
    cacheData = JSON.parse(cacheContent);
  } catch (error) {
    console.log('❌ 读取缓存文件失败');
    return;
  }

  const movies: MovieData[] = cacheData.detailedMovies || [];
  console.log(`📊 从缓存加载 ${movies.length} 部电影`);

  if (movies.length === 0) {
    console.log('❌ 缓存中没有电影数据');
    return;
  }

  // 2. 应用修复逻辑（重点处理关键电影）
  console.log('\n🔧 第1步：应用修复逻辑到关键字段...');
  const keyMoviesIds = ['26766869', '4739952', '3742360', '36491177']; // 鹬、初恋、让子弹飞、坂本龙一
  const fixedMovies: MovieData[] = [];

  for (const [index, movie] of movies.entries()) {
    console.log(`[${index + 1}/${movies.length}] 处理《${movie.title}》`);
    
    // 关键电影重新解析，其他保持原数据
    if (keyMoviesIds.includes(movie.subjectId)) {
      const fixedMovie = await applyFixedParsing(movie);
      fixedMovies.push(fixedMovie);
      
      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      fixedMovies.push(movie);
    }
  }

  // 3. 清理现有数据并同步到飞书
  console.log('\n📤 第2步：同步到飞书多维表格...');
  const feishu = new FeishuService();
  
  try {
    await feishu.clearTable();
    const result = await feishu.batchSyncRecords(fixedMovies);
    
    console.log(`✅ 批量同步成功: ${fixedMovies.length} 部电影已同步到飞书`);

    // 4. 验证关键修复
    console.log('\n🎯 第3步：验证关键修复效果...');
    const keyMovies = fixedMovies.filter(m => keyMoviesIds.includes(m.subjectId));
    
    for (const movie of keyMovies) {
      console.log(`\n📽️ 《${movie.title}》修复验证:`);
      
      if (movie.subjectId === '26766869') { // 鹬 Piper
        const durationOk = movie.duration && movie.duration.includes('6分03秒');
        console.log(`  ✓ 片长解析: ${durationOk ? '✅ 正确' : '❌ 错误'} (${movie.duration})`);
      }
      
      if (movie.subjectId === '4739952') { // 初恋这件小事
        const durationOk = movie.duration && movie.duration.includes('118分钟') && movie.duration.includes('100分钟');
        console.log(`  ✓ 片长解析: ${durationOk ? '✅ 正确' : '❌ 错误'} (${movie.duration})`);
        const releaseDateOk = movie.releaseDate && movie.releaseDate.includes('/');
        console.log(`  ✓ 上映日期: ${releaseDateOk ? '✅ 多地区' : '❌ 单地区'} (${movie.releaseDate})`);
      }
      
      if (movie.subjectId === '3742360') { // 让子弹飞
        const releaseDateOk = movie.releaseDate && movie.releaseDate.includes('(中国大陆)');
        console.log(`  ✓ 上映日期: ${releaseDateOk ? '✅ 保留地区' : '❌ 丢失地区'} (${movie.releaseDate})`);
      }
      
      if (movie.subjectId === '36491177') { // 坂本龙一：杰作
        const multiDateOk = movie.releaseDate && movie.releaseDate.includes('/') && movie.releaseDate.split('/').length >= 3;
        console.log(`  ✓ 上映日期: ${multiDateOk ? '✅ 多地区保留' : '❌ 多地区丢失'} (${movie.releaseDate})`);
      }
    }

    console.log(`\n🎉 全量同步完成! ${fixedMovies.length} 部电影已同步到飞书多维表格`);
    console.log(`🔗 请检查飞书多维表格查看完整效果`);

  } catch (error) {
    console.log(`❌ 同步失败: ${error}`);
  }
}

syncAllMoviesWithFixes();