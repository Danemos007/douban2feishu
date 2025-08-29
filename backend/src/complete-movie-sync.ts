/**
 * 完整电影数据同步测试
 * 抓取所有36部电影(33看过+3想看)并同步到飞书多维表格
 * 全面验证电影代码的鲁棒性
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
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

class CompleteMovieSync {
  private requestCount = 0;
  private readonly baseDelay = 4000;
  private readonly randomDelay = 4000;
  private readonly slowModeThreshold = 200;
  private readonly slowDelay = 10000;
  private readonly slowRandomDelay = 5000;
  private accessToken: string = '';

  async getAccessToken(): Promise<string> {
    console.log('🔑 获取飞书访问令牌...');
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const responseData = response.data as any;
    if (responseData.code !== 0) {
      throw new Error(`获取飞书令牌失败: ${responseData.msg}`);
    }

    this.accessToken = responseData.tenant_access_token;
    console.log('✅ 飞书令牌获取成功');
    return this.accessToken;
  }

  async makeRequest(url: string, cookie: string): Promise<string> {
    this.requestCount++;
    
    // 动态延迟策略
    const isSlowMode = this.requestCount > this.slowModeThreshold;
    const baseDelay = isSlowMode ? this.slowDelay : this.baseDelay;
    const randomDelay = isSlowMode ? this.slowRandomDelay : this.randomDelay;
    const delay = baseDelay + Math.random() * randomDelay;
    
    console.log(`[延迟] ${Math.round(delay / 1000)} 秒${isSlowMode ? ' (慢速模式)' : ''}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`[请求] ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Cookie': cookie
      },
      timeout: 30000
    });

    // 检测人机验证
    if (response.data.includes('<title>禁止访问</title>') || 
        response.data.includes('验证码') || 
        response.data.includes('机器人')) {
      throw new Error('触发豆瓣反爬虫机制，请更新Cookie');
    }

    console.log(`[成功] 获取到 ${response.data.length} 字符`);
    return response.data;
  }

  // 抓取电影列表
  async fetchMovieList(cookie: string, userId: string, status: 'collect' | 'wish'): Promise<any[]> {
    console.log(`\\n📺 抓取${status === 'collect' ? '看过' : '想看'}的电影...`);
    
    let allMovies = [];
    let page = 0;
    
    while (true) {
      const start = page * 30;
      const url = `https://movie.douban.com/people/${userId}/${status}?start=${start}&sort=time&rating=all&filter=all&mode=list&type=movie`;
      
      const html = await this.makeRequest(url, cookie);
      const $ = cheerio.load(html);
      
      // 解析电影列表
      const movies = [];
      $('#wrapper #content .item').each((i, element) => {
        const $element = $(element);
        
        // 提取电影ID和标题
        const titleLink = $element.find('.info .title a');
        const href = titleLink.attr('href');
        const title = titleLink.text().trim();
        
        if (href && title) {
          const idMatch = href.match(/subject\/(\d+)\//);
          if (idMatch) {
            const movieData: any = {
              id: idMatch[1],
              title: title,
              myStatus: status === 'collect' ? '看过' : '想看'
            };
            
            // 尝试解析评分
            const ratingElement = $element.find('div.date span[class*="rating"][class$="-t"]');
            if (ratingElement.length > 0) {
              const ratingClass = ratingElement.attr('class') || '';
              const match = ratingClass.match(/rating(\\d+)-t/);
              if (match) {
                const rating = parseInt(match[1], 10);
                if (rating >= 1 && rating <= 5) {
                  movieData.myRating = rating;
                  console.log(`   ⭐ ${title}: ${rating}星`);
                }
              }
            }
            
            movies.push(movieData);
          }
        }
      });
      
      console.log(`📄 第${page + 1}页: 找到${movies.length}部电影`);
      
      if (movies.length === 0) break;
      
      allMovies = allMovies.concat(movies);
      page++;
      
      // 避免无限循环
      if (page > 20) {
        console.log('⚠️ 达到最大页数限制，停止抓取');
        break;
      }
    }
    
    console.log(`✅ 找到 ${allMovies.length} 部${status === 'collect' ? '看过' : '想看'}的电影`);
    return allMovies;
  }

  // 解析电影详情
  parseMovieDetail(html: string, movieId: string, movieItem: any): MovieData {
    const $ = cheerio.load(html);
    const infoElement = $('#info');
    
    const movie: MovieData = {
      subjectId: movieId,
      title: movieItem.title,
      myStatus: movieItem.myStatus,
      type: 'movie'
    };

    // 解析封面图
    const posterImg = $('#mainpic img');
    if (posterImg.length > 0) {
      movie.coverImage = posterImg.attr('src');
    }

    // 解析豆瓣评分
    const ratingElement = $('strong.rating_num');
    if (ratingElement.length > 0) {
      const rating = parseFloat(ratingElement.text().trim());
      if (!isNaN(rating)) {
        movie.doubanRating = rating;
      }
    }

    // 解析我的评分
    if (movieItem.myRating) {
      movie.myRating = movieItem.myRating;
    }

    // 解析剧情简介
    const summarySpan = $('span[property="v:summary"]');
    if (summarySpan.length > 0) {
      movie.summary = summarySpan.text().trim();
    }

    // 解析导演
    const directorElements = infoElement.find('span:contains("导演") a');
    const directors = [];
    directorElements.each((i, el) => {
      const name = $(el).text().trim();
      if (name) directors.push(name);
    });
    if (directors.length > 0) {
      movie.director = directors.join(', ');
    }

    // 解析编剧
    const writerElements = infoElement.find('span:contains("编剧") a');
    const writers = [];
    writerElements.each((i, el) => {
      const name = $(el).text().trim();
      if (name) writers.push(name);
    });
    if (writers.length > 0) {
      movie.writer = writers.join(', ');
    }

    // 解析主演
    const castElements = infoElement.find('span:contains("主演") a');
    const cast = [];
    castElements.each((i, el) => {
      const name = $(el).text().trim();
      if (name) cast.push(name);
    });
    if (cast.length > 0) {
      movie.cast = cast.join(', ');
    }

    // 解析类型
    const genreElements = infoElement.find('span[property="v:genre"]');
    const genres = [];
    genreElements.each((i, el) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });
    if (genres.length > 0) {
      movie.genre = genres.join('/');
    }

    // 解析制片地区
    const countrySpan = infoElement.find('span:contains("制片国家")').parent();
    if (countrySpan.length > 0) {
      const fullText = countrySpan.text();
      const match = fullText.match(/制片国家\/地区:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const countryText = match[1].trim();
        const cleanCountryText = countryText.split(/语言:|上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanCountryText) {
          movie.country = cleanCountryText;
        }
      }
    }

    // 解析语言
    const languageSpan = infoElement.find('span:contains("语言")').parent();
    if (languageSpan.length > 0) {
      const fullText = languageSpan.text();
      const match = fullText.match(/语言:\s*([^\n\r]+)/);
      if (match && match[1]) {
        const languageText = match[1].trim();
        const cleanLanguageText = languageText.split(/上映日期:|片长:|又名:|IMDb:/)[0].trim();
        if (cleanLanguageText) {
          movie.language = cleanLanguageText;
        }
      }
    }

    // 解析上映日期
    const releaseDateElement = infoElement.find('span[property="v:initialReleaseDate"]').first();
    if (releaseDateElement.length > 0) {
      let dateText = releaseDateElement.text().trim();
      const dateMatch = dateText.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        movie.releaseDate = dateMatch[1];
      } else {
        const yearMatch = dateText.match(/(\d{4})/);
        if (yearMatch) {
          movie.releaseDate = yearMatch[1];
        }
      }
    }

    // 解析片长
    const durationElement = infoElement.find('span[property="v:runtime"]');
    if (durationElement.length > 0) {
      movie.duration = durationElement.text().trim();
    }

    return movie;
  }

  // 同步电影到飞书
  async syncMovieToFeishu(movie: MovieData): Promise<boolean> {
    try {
      const fields: any = {};
      
      for (const [key, feishuField] of Object.entries(MOVIE_FIELD_MAPPINGS)) {
        const value = (movie as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'coverImage') {
            fields[feishuField] = { link: value };
          } else if (key === 'releaseDate') {
            // 上映日期转换为时间戳
            try {
              let dateValue = value;
              if (/^\d{4}$/.test(dateValue)) {
                dateValue = `${dateValue}-01-01`;
              }
              
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                fields[feishuField] = date.getTime();
              }
            } catch (error) {
              console.log(`   ⚠️ 日期转换失败: ${value}`);
            }
          } else {
            fields[feishuField] = value;
          }
        }
      }

      console.log(`📝 同步《${movie.title}》- ${Object.keys(fields).length}个字段`);
      
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

      const responseData = response.data as any;
      if (responseData.code !== 0) {
        console.log(`❌ 《${movie.title}》同步失败: ${responseData.msg}`);
        return false;
      }

      console.log(`✅ 《${movie.title}》同步成功`);
      return true;

    } catch (error: any) {
      console.log(`❌ 《${movie.title}》同步异常: ${error.message}`);
      return false;
    }
  }

  // 清理现有数据
  async clearExistingData(): Promise<void> {
    console.log('\\n🗑️ 清理飞书表格中的现有数据...');
    
    try {
      // 获取所有记录
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=500`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      if (responseData.code === 0 && responseData.data.items.length > 0) {
        console.log(`找到 ${responseData.data.items.length} 条现有记录`);
        
        // 批量删除记录
        const recordIds = responseData.data.items.map((item: any) => item.record_id);
        
        for (const recordId of recordIds) {
          try {
            await axios.delete(
              `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records/${recordId}`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`
                }
              }
            );
          } catch (error) {
            console.log(`⚠️ 删除记录 ${recordId} 失败`);
          }
          
          // 删除间隔
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ 现有数据清理完成');
      } else {
        console.log('ℹ️ 表格中没有现有数据');
      }
    } catch (error: any) {
      console.log(`⚠️ 清理数据时出错: ${error.message}`);
    }
  }
}

async function main() {
  if (process.argv.length < 4) {
    console.log('使用方法: npx ts-node complete-movie-sync.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const cookie = process.argv[2];
  const userId = process.argv[3];

  console.log('🎬 完整电影数据同步测试');
  console.log('==========================');
  console.log('目标: 抓取36部电影并全量同步到飞书多维表格');
  
  const syncer = new CompleteMovieSync();
  
  try {
    // 获取飞书token
    await syncer.getAccessToken();
    
    // 清理现有数据
    await syncer.clearExistingData();
    
    // 抓取所有电影
    const collectMovies = await syncer.fetchMovieList(cookie, userId, 'collect');
    const wishMovies = await syncer.fetchMovieList(cookie, userId, 'wish');
    const allMovies = [...collectMovies, ...wishMovies];
    
    console.log(`\\n📊 电影总数统计：${allMovies.length} 部 (${collectMovies.length} 看过 + ${wishMovies.length} 想看)`);
    
    // 抓取详细数据并同步
    console.log('\\n🔍 开始详细解析和同步...');
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < allMovies.length; i++) {
      const movieItem = allMovies[i];
      console.log(`\\n[${i + 1}/${allMovies.length}] 处理《${movieItem.title}》...`);
      
      try {
        const detailUrl = `https://movie.douban.com/subject/${movieItem.id}/`;
        const detailHtml = await syncer.makeRequest(detailUrl, cookie);
        const movie = syncer.parseMovieDetail(detailHtml, movieItem.id, movieItem);
        
        const success = await syncer.syncMovieToFeishu(movie);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // 同步间隔
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.log(`❌ 处理《${movieItem.title}》失败: ${error.message}`);
        failCount++;
        
        // 如果是反爬虫错误，停止执行
        if (error.message.includes('触发豆瓣反爬虫机制')) {
          console.log('\\n🛑 检测到反爬虫机制，停止执行');
          break;
        }
      }
    }
    
    console.log('\\n=== 完整同步测试结果 ===');
    console.log(`📊 总计: ${allMovies.length} 部电影`);
    console.log(`✅ 成功: ${successCount} 部`);
    console.log(`❌ 失败: ${failCount} 部`);
    console.log(`📈 成功率: ${((successCount / allMovies.length) * 100).toFixed(1)}%`);
    
    // 保存测试报告
    const report = {
      testDate: new Date().toISOString(),
      totalMovies: allMovies.length,
      collectMovies: collectMovies.length,
      wishMovies: wishMovies.length,
      successCount,
      failCount,
      successRate: ((successCount / allMovies.length) * 100).toFixed(1) + '%',
      processedMovies: allMovies.slice(0, successCount + failCount)
    };
    
    const reportPath = path.join(__dirname, '../reports', `complete-movie-sync-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\\n📋 测试报告已保存: ${reportPath}`);
    
  } catch (error: any) {
    console.error('💥 同步测试失败:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}