/**
 * 测试关键电影的修复效果并同步到飞书
 * 重点验证：片长解析、上映日期完整信息、字段类型
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

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

// 关键测试电影
const KEY_MOVIES = [
  {
    subjectId: '26766869',
    title: '鹬 Piper',
    myStatus: '看过',
    myRating: 5,
    myTags: '温情',
    myComment: '无',
    markDate: '2025-08-27',
    testFocus: '片长解析修复（6分03秒）'
  },
  {
    subjectId: '4739952', 
    title: '初恋这件小事',
    myStatus: '看过',
    myRating: 4,
    myTags: '无',
    myComment: '无',
    markDate: '2025-08-27',
    testFocus: '片长解析修复（多版本：118分钟(泰国) / 100分钟(中国大陆)）'
  },
  {
    subjectId: '3742360',
    title: '让子弹飞', 
    myStatus: '看过',
    myRating: 5,
    myTags: '政治',
    myComment: 'GZM推荐',
    markDate: '2025-08-27',
    testFocus: '上映日期单个地区（2010-12-16(中国大陆)）'
  },
  {
    subjectId: '36491177',
    title: '坂本龙一：杰作',
    myStatus: '看过', 
    myRating: 4,
    myTags: '音乐',
    myComment: '纪录片',
    markDate: '2025-08-27',
    testFocus: '上映日期多个地区（3个不同地区上映日期）'
  }
];

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

  async syncRecord(movie: MovieData): Promise<any> {
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
      return response.data;
    } catch (error: any) {
      console.log(`❌ 同步失败: ${error.response?.data?.msg || error.message}`);
      throw error;
    }
  }
}

async function parseMovieDetails(subjectId: string): Promise<Partial<MovieData>> {
  const url = `https://movie.douban.com/subject/${subjectId}/`;
  console.log(`[请求] ${url}`);
  
  const response = await axios.get(url, { headers: DOUBAN_HEADERS });
  const html = response.data as string;
  const $ = cheerio.load(html);
  const infoElement = $('#info');
  
  const movie: Partial<MovieData> = {};
  
  // 使用修复后的解析逻辑
  try {
    // 封面图
    const posterElement = $('a.nbgnbg img');
    if (posterElement.length > 0) {
      movie.coverImage = posterElement.attr('src')?.replace(/s_ratio_poster/, 'l_ratio_poster') || '';
    }

    // 豆瓣评分
    const ratingElement = $('.rating_num');
    if (ratingElement.length > 0) {
      const ratingText = ratingElement.text().trim();
      if (ratingText && ratingText !== '') {
        movie.doubanRating = parseFloat(ratingText);
      }
    }

    // 剧情简介
    const summaryElement = $('#link-report .all');
    if (summaryElement.length > 0) {
      movie.summary = summaryElement.text().trim().replace(/\s+/g, ' ');
    } else {
      const shortSummaryElement = $('#link-report [property="v:summary"]');
      if (shortSummaryElement.length > 0) {
        movie.summary = shortSummaryElement.text().trim().replace(/\s+/g, ' ');
      }
    }

    // 导演
    const directorElement = infoElement.find('a[rel="v:directedBy"]');
    if (directorElement.length > 0) {
      const directors: string[] = [];
      directorElement.each((index, element) => {
        directors.push($(element).text().trim());
      });
      movie.director = directors.join(', ');
    }

    // 编剧
    const writerSpan = infoElement.find('span.pl:contains("编剧")');
    if (writerSpan.length > 0) {
      const writerLinks = writerSpan.next('.attrs').find('a');
      if (writerLinks.length > 0) {
        const writers: string[] = [];
        writerLinks.each((index, element) => {
          writers.push($(element).text().trim());
        });
        movie.writer = writers.join(', ');
      }
    }

    // 主演
    const castElement = infoElement.find('a[rel="v:starring"]');
    if (castElement.length > 0) {
      const cast: string[] = [];
      castElement.each((index, element) => {
        cast.push($(element).text().trim());
      });
      movie.cast = cast.join(', ');
    }

    // 类型（Genre）- 修复后的逻辑
    const genreElements = infoElement.find('span[property="v:genre"]');
    if (genreElements.length > 0) {
      const genres: string[] = [];
      genreElements.each((index, element) => {
        genres.push($(element).text().trim());
      });
      movie.genre = genres.join('/');
    }

    // 制片地区 - 使用正确的修复逻辑
    const countrySpan = infoElement.find('span:contains("制片国家")').parent();
    if (countrySpan.length > 0) {
      // 获取整行文本，然后提取制片地区信息
      const fullText = countrySpan.text();
      const match = fullText.match(/制片国家\/地区:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const countryText = match[1].trim();
        // 去除可能的后续内容（遇到下一个字段标签就截断）
        const cleanCountryText = countryText.split(/语言:|上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanCountryText) {
          movie.country = cleanCountryText;
        }
      }
    }

    // 语言 - 使用正确的修复逻辑
    const languageSpan = infoElement.find('span:contains("语言")').parent();
    if (languageSpan.length > 0) {
      // 获取整行文本，然后提取语言信息
      const fullText = languageSpan.text();
      const match = fullText.match(/语言:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const languageText = match[1].trim();
        // 去除可能的后续内容（遇到下一个字段标签就截断）
        const cleanLanguageText = languageText.split(/上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanLanguageText) {
          movie.language = cleanLanguageText;
        }
      }
    }

    // 上映日期 - 修复后的逻辑（保留完整信息，包括所有地区和多个日期）
    const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
    if (releaseDateElements.length > 0) {
      // 收集所有上映日期，保留完整的地区信息
      const allReleaseDates: string[] = [];
      releaseDateElements.each((index, element) => {
        const dateText = $(element).text().trim();
        if (dateText) {
          allReleaseDates.push(dateText);
        }
      });
      
      // 用 " / " 连接所有上映日期，与豆瓣页面显示格式一致
      if (allReleaseDates.length > 0) {
        movie.releaseDate = allReleaseDates.join(' / ');
      }
    } else {
      // 电视剧可能使用首播日期 - 同样保留完整信息
      const firstAirSpan = infoElement.find('span:contains("首播")').parent();
      if (firstAirSpan.length > 0) {
        let firstAirText = firstAirSpan.text().replace(/首播:\s*/, '');
        if (firstAirText) {
          // 保留完整的首播日期信息，包括地区
          movie.releaseDate = firstAirText;
        }
      }
    }

    // 片长 - 修复后的逻辑（支持多版本和无v:runtime属性的情况）
    const durationElement = infoElement.find('span[property="v:runtime"]');
    if (durationElement.length > 0) {
      // 获取包含片长信息的完整行，可能有多个版本如 "118分钟(泰国) / 100分钟(中国大陆)"
      const durationLine = durationElement.closest('span.pl').parent().html() || durationElement.parent().html() || '';
      const durationMatch = durationLine.match(/片长:<\/span>\s*(.+?)(?:<br|$)/);
      if (durationMatch && durationMatch[1]) {
        // 清理HTML标签，保留完整的片长信息
        const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
        movie.duration = fullDuration;
      } else {
        // 如果正则匹配失败，使用原来的方法作为备选
        movie.duration = durationElement.text().trim();
      }
    } else {
      // 尝试从一般信息中查找片长
      const durationSpan = infoElement.find('span.pl:contains("片长")');
      if (durationSpan.length > 0) {
        // 获取片长标签后面的内容
        const durationLine = durationSpan.parent().html() || '';
        // 提取 <span class="pl">片长:</span> 后面的内容
        const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
        if (durationMatch && durationMatch[1]) {
          movie.duration = durationMatch[1].trim();
        }
      }
    }

  } catch (error) {
    console.log(`⚠️ 解析部分字段失败: ${error}`);
  }

  return movie;
}

async function testKeyMovieFixes() {
  console.log('=== 关键电影修复效果测试 ===');
  console.log(`🎯 测试重点：片长解析、上映日期完整信息、飞书字段类型`);
  console.log('');

  const feishu = new FeishuService();
  const results: Array<{movie: any, parsed: any, syncResult?: any}> = [];

  for (const [index, keyMovie] of KEY_MOVIES.entries()) {
    console.log(`🎬 [${index + 1}/4] 测试《${keyMovie.title}》`);
    console.log(`📌 测试焦点: ${keyMovie.testFocus}`);
    
    try {
      // 解析详细数据
      console.log(`🔍 正在解析电影详细信息...`);
      const parsed = await parseMovieDetails(keyMovie.subjectId);
      
      // 合并基础数据
      const finalMovie: MovieData = {
        ...keyMovie,
        ...parsed
      } as MovieData;

      console.log(`✅ 解析完成:`);
      console.log(`   片长: ${finalMovie.duration || '未获取'}`);
      console.log(`   上映日期: ${finalMovie.releaseDate || '未获取'}`);
      console.log(`   类型: ${finalMovie.genre || '未获取'}`);
      console.log(`   制片地区: ${finalMovie.country || '未获取'}`);
      console.log(`   语言: ${finalMovie.language || '未获取'}`);

      // 同步到飞书
      console.log(`📤 正在同步到飞书多维表格...`);
      const syncResult = await feishu.syncRecord(finalMovie);
      console.log(`✅ 同步成功: ${syncResult.data?.record?.record_id || '已创建'}`);

      results.push({
        movie: keyMovie,
        parsed: finalMovie,
        syncResult: syncResult
      });

      // 延迟避免请求过快
      if (index < KEY_MOVIES.length - 1) {
        console.log(`⏱️ 延迟3秒...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.log(`❌ 测试失败: ${error}`);
      results.push({
        movie: keyMovie,
        parsed: {},
        syncResult: { error: error }
      });
    }
    
    console.log('');
  }

  console.log('=== 测试结果汇总 ===');
  for (const [index, result] of results.entries()) {
    const movie = result.movie;
    const parsed = result.parsed;
    
    console.log(`${index + 1}. 《${movie.title}》`);
    console.log(`   测试焦点: ${movie.testFocus}`);
    
    // 片长检查
    if (movie.title === '鹬 Piper') {
      const durationOk = parsed.duration && parsed.duration.includes('6分03秒');
      console.log(`   ✓ 片长解析: ${durationOk ? '✅ 正确' : '❌ 错误'} (${parsed.duration})`);
    } else if (movie.title === '初恋这件小事') {
      const durationOk = parsed.duration && parsed.duration.includes('118分钟') && parsed.duration.includes('100分钟');
      console.log(`   ✓ 片长解析: ${durationOk ? '✅ 正确' : '❌ 错误'} (${parsed.duration})`);
    }
    
    // 上映日期检查
    if (movie.title === '让子弹飞') {
      const releaseDateOk = parsed.releaseDate && parsed.releaseDate.includes('(中国大陆)');
      console.log(`   ✓ 上映日期: ${releaseDateOk ? '✅ 保留地区' : '❌ 丢失地区'} (${parsed.releaseDate})`);
    } else if (movie.title === '坂本龙一：杰作') {
      const multiDateOk = parsed.releaseDate && parsed.releaseDate.includes('/') && parsed.releaseDate.split('/').length >= 3;
      console.log(`   ✓ 上映日期: ${multiDateOk ? '✅ 多地区保留' : '❌ 多地区丢失'} (${parsed.releaseDate})`);
    }
    
    // 同步结果
    const syncOk = result.syncResult && !result.syncResult.error;
    console.log(`   ✓ 飞书同步: ${syncOk ? '✅ 成功' : '❌ 失败'}`);
    console.log('');
  }

  const successCount = results.filter(r => r.syncResult && !r.syncResult.error).length;
  console.log(`🎯 总结: ${successCount}/${KEY_MOVIES.length} 部电影修复验证完成`);
}

testKeyMovieFixes();