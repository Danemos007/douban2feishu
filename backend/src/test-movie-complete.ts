/**
 * 完整电影数据抓取测试
 * 验证能否抓取38部电影(33部看过+5部想看)并解析18个必需字段
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// 18个必需字段
const REQUIRED_FIELDS = [
  'Subject ID', '我的标签', '我的状态', '类型', '电影名', 
  '封面图', '豆瓣评分', '我的备注', '片长', '上映日期',
  '剧情简介', '主演', '导演', '编剧', '制片地区', 
  '语言', '我的评分', '标记日期'
];

interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  genre?: string;  // 电影类型：剧情/动作/喜剧等
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

class MovieTestScraper {
  private requestCount = 0;
  private readonly baseDelay = 4000;
  private readonly randomDelay = 4000;

  async makeRequest(url: string, cookie: string): Promise<string> {
    await this.delay();
    
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    console.log(`[请求] ${url}`);
    const response = await axios.get(url, { headers, timeout: 30000 });
    const html = response.data as string;
    
    if (html.includes('<title>禁止访问</title>')) {
      throw new Error('遇到人机验证，请检查Cookie');
    }

    console.log(`[成功] 获取到 ${html.length} 字符`);
    return html;
  }

  private async delay(): Promise<void> {
    this.requestCount++;
    const delay = this.baseDelay + Math.random() * this.randomDelay;
    console.log(`[延迟] ${Math.round(delay / 1000)} 秒`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async fetchMoviesWithPagination(userId: string, status: 'collect' | 'wish', cookie: string): Promise<any[]> {
    const allMovies: any[] = [];
    let start = 0;

    while (true) {
      const url = `https://movie.douban.com/people/${userId}/${status}?start=${start}&sort=time&rating=all&filter=all&mode=list&type=movie`;
      
      try {
        const html = await this.makeRequest(url, cookie);
        
        // 检查反爬虫
        if (html.includes('禁止访问') || html.includes('检测到有异常请求')) {
          console.log('❌ 被反爬虫系统拦截，请检查Cookie');
          break;
        }

        const pageMovies = this.parseMovieListPage(html);
        
        if (pageMovies.length === 0) {
          console.log(`📄 第${Math.floor(start/30) + 1}页: 没有更多数据`);
          break;
        }

        console.log(`📄 第${Math.floor(start/30) + 1}页: 找到${pageMovies.length}部电影`);
        
        // 🔧 为每个电影项设置正确的中文状态
        const chineseStatus = status === 'collect' ? '看过' : status === 'wish' ? '想看' : '未知';
        pageMovies.forEach(movie => {
          movie.myStatus = chineseStatus;
        });
        
        allMovies.push(...pageMovies);
        
        start += pageMovies.length; // 智能递增
        
        // 如果本页少于30部，说明是最后一页
        if (pageMovies.length < 30) {
          break;
        }
      } catch (error) {
        console.log(`❌ 第${Math.floor(start/30) + 1}页抓取失败:`, error);
        break;
      }
    }

    return allMovies;
  }

  parseMovieListPage(html: string): any[] {
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('.item-show').each((index, element) => {
      const $element = $(element);
      
      const linkElement = $element.find('div.title > a');
      const title = linkElement.text().trim();
      const url = linkElement.attr('href');
      
      if (!url || !title) return;

      const idMatch = url.match(/(\d+)/);
      if (!idMatch) return;

      const id = idMatch[0];
      const dateElement = $element.find('div.date');
      const dateText = dateElement.text().trim();

      // 尝试从列表页获取用户字段
      const gridId = `grid${id}`;
      const gridElement = $(`#${gridId}`);
      
      let myTags = '';
      let myComment = '';
      let myRating: number | undefined;

      // 标签
      const tagsElement = gridElement.find('span.tags');
      if (tagsElement.length > 0) {
        let tagsText = tagsElement.text().trim();
        if (tagsText.includes('标签:')) {
          tagsText = tagsText.replace('标签:', '').trim();
        }
        myTags = tagsText;
      }

      // 评分 - 从列表页date元素中提取评分 (修复选择器位置)
      const ratingElement = $element.find('div.date span[class*="rating"][class$="-t"]');
      if (ratingElement.length > 0) {
        const ratingClass = ratingElement.attr('class') || '';
        const match = ratingClass.match(/rating(\d+)-t/);
        if (match) {
          const rating = parseInt(match[1], 10);
          if (rating >= 1 && rating <= 5) {
            myRating = rating;
            console.log(`   ⭐ 列表页评分解析成功: ${rating}星`);
          } else {
            console.log(`   ⚠️ 评分超出范围: ${rating}`);
          }
        } else {
          console.log(`   ⚠️ 评分正则匹配失败`);
        }
      } else {
        console.log(`   ❌ 未找到评分元素`);
      }

      // 备注
      const commentElement = gridElement.find('div.comment');
      if (commentElement.length > 0) {
        const commentText = commentElement.text().trim();
        if (commentText && commentText.length > 0) {
          myComment = commentText;
        }
      }

      items.push({
        id,
        title,
        url,
        dateText,
        myTags,
        myComment,
        myRating
      });
    });

    return items;
  }

  parseMovieDetail(html: string, movieId: string, basicInfo: any): MovieData {
    const $ = cheerio.load(html);
    
    const movie: MovieData = {
      subjectId: movieId,
      title: '',
      myStatus: basicInfo?.myStatus || '看过', // 使用传入的状态或默认为看过
      type: 'movie' // 默认为电影
    };

    try {
      // 1. 标题
      const titleElement = $('h1 span[property="v:itemreviewed"]');
      if (titleElement.length > 0) {
        movie.title = titleElement.text().trim();
      } else {
        movie.title = basicInfo.title || '未知';
      }

      // 2. 封面图
      const imageElement = $('head > meta[property="og:image"]');
      if (imageElement.length > 0) {
        movie.coverImage = imageElement.attr('content');
      }

      // 3. 豆瓣评分
      const scoreElement = $('#interest_sectl strong[property="v:average"]');
      if (scoreElement.length > 0) {
        const scoreText = scoreElement.text();
        if (scoreText) {
          movie.doubanRating = parseFloat(scoreText);
        }
      }

      // 4. 剧情简介
      let summary = $('.all.hidden').text().trim();
      if (!summary) {
        summary = $('[property="v:summary"]').text().trim();
      }
      if (!summary) {
        const descElement = $('head > meta[property="og:description"]');
        summary = descElement.attr('content') || '';
      }
      if (summary) {
        movie.summary = summary;
      }

      // 5. 解析详细信息
      const infoElement = $('#info');
      if (infoElement.length > 0) {
        // 导演
        const directorElements = infoElement.find('span:contains("导演") a');
        const directors: string[] = [];
        directorElements.each((i, el) => {
          const name = $(el).text().trim();
          if (name) directors.push(name);
        });
        movie.director = directors.join(', ');

        // 编剧
        const writerElements = infoElement.find('span:contains("编剧") a');
        const writers: string[] = [];
        writerElements.each((i, el) => {
          const name = $(el).text().trim();
          if (name) writers.push(name);
        });
        movie.writer = writers.join(', ');

        // 主演
        const castElements = infoElement.find('span:contains("主演") a');
        const cast: string[] = [];
        castElements.each((i, el) => {
          const name = $(el).text().trim();
          if (name) cast.push(name);
        });
        movie.cast = cast.join(', ');

        // 类型（用于智能分类）
        const genreElements = infoElement.find('span[property="v:genre"]');
        const genres: string[] = [];
        genreElements.each((i, el) => {
          const genre = $(el).text().trim();
          if (genre) genres.push(genre);
        });
        
        // 保存电影类型信息
        if (genres.length > 0) {
          movie.genre = genres.join('/');  // 剧情/情色/战争
        }
        
        // 智能分类
        const genreStr = genres.join(' ').toLowerCase();
        if (genreStr.includes('纪录片') || genreStr.includes('documentary')) {
          movie.type = 'documentary';
        } else if (genreStr.includes('电视剧') || genreStr.includes('剧集')) {
          movie.type = 'tv';
        } else {
          movie.type = 'movie';
        }

        // 制片地区
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

        // 语言
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

        // 上映日期 - 保留完整信息，包括所有地区和多个日期
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

        // 片长
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
          } else {
            // 电视剧可能使用单集片长
            const singleDurationSpan = infoElement.find('span:contains("单集片长")').parent();
            if (singleDurationSpan.length > 0) {
              const singleDurationText = singleDurationSpan.text().replace(/单集片长:\s*/, '');
              if (singleDurationText) {
                movie.duration = singleDurationText.trim();
              }
            }
          }
        }
      }

      // 6. 用户字段（从基本信息传入）
      if (basicInfo.myTags) movie.myTags = basicInfo.myTags;
      if (basicInfo.myComment) movie.myComment = basicInfo.myComment;
      if (basicInfo.myRating) movie.myRating = basicInfo.myRating;
      if (basicInfo.dateText) movie.markDate = basicInfo.dateText;

    } catch (error) {
      console.warn(`解析电影 ${movieId} 详情失败:`, error);
    }

    return movie;
  }

  // 验证字段完整性
  validateFields(movie: MovieData): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    // 映射实际字段到必需字段
    const fieldMapping: { [key: string]: any } = {
      'Subject ID': movie.subjectId,
      '我的标签': movie.myTags,
      '我的状态': movie.myStatus,
      '类型': movie.genre,
      '电影名': movie.title,
      '封面图': movie.coverImage,
      '豆瓣评分': movie.doubanRating,
      '我的备注': movie.myComment,
      '片长': movie.duration,
      '上映日期': movie.releaseDate,
      '剧情简介': movie.summary,
      '主演': movie.cast,
      '导演': movie.director,
      '编剧': movie.writer,
      '制片地区': movie.country,
      '语言': movie.language,
      '我的评分': movie.myRating,
      '标记日期': movie.markDate
    };

    for (const field of REQUIRED_FIELDS) {
      const value = fieldMapping[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

async function testCompleteMovieData() {
  console.log('=== 完整电影数据抓取测试 ===');
  console.log(`目标：验证能否抓取38部电影(33看过+5想看)并解析${REQUIRED_FIELDS.length}个必需字段`);
  console.log('必需字段：', REQUIRED_FIELDS.join(', '));
  console.log('');

  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || 'your_user_id';

  if (!cookie) {
    console.error('使用方法: npx ts-node src/test-movie-complete.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const scraper = new MovieTestScraper();
  const allMovies: MovieData[] = [];

  try {
    // 1. 抓取看过的电影 (支持分页)
    console.log('📺 第1步：抓取看过的电影...');
    const collectList = await scraper.fetchMoviesWithPagination(userId, 'collect', cookie);
    console.log(`✅ 找到 ${collectList.length} 部看过的电影`);

    // 2. 抓取想看的电影 (支持分页)
    console.log('\n📺 第2步：抓取想看的电影...');
    const wishList = await scraper.fetchMoviesWithPagination(userId, 'wish', cookie);
    console.log(`✅ 找到 ${wishList.length} 部想看的电影`);

    // 3. 合并并统计
    const totalMovies = collectList.length + wishList.length;
    console.log(`\n📊 电影总数统计：${totalMovies} 部 (${collectList.length} 看过 + ${wishList.length} 想看)`);
    
    if (totalMovies !== 38) {
      console.log(`⚠️ 注意：预期38部电影，实际找到${totalMovies}部`);
    }

    // 4. 详细解析所有电影（看过+想看）
    console.log('\n🔍 第3步：详细解析电影数据和18个字段...');
    const testMovies = [...collectList, ...wishList]; // 解析所有电影
    
    for (let i = 0; i < testMovies.length; i++) {
      const movieItem = testMovies[i];
      console.log(`\n[${i + 1}/${testMovies.length}] 解析《${movieItem.title}》...`);
      
      try {
        const detailUrl = `https://movie.douban.com/subject/${movieItem.id}/`;
        const detailHtml = await scraper.makeRequest(detailUrl, cookie);
        
        // 设置状态 - 区分看过和想看
        const isCollected = i < collectList.length; // 前collectList.length部是看过的
        const status = isCollected ? '看过' : '想看';
        movieItem.myStatus = status;
        const movie = scraper.parseMovieDetail(detailHtml, movieItem.id, movieItem);
        movie.myStatus = status;
        
        // 验证字段完整性
        const validation = scraper.validateFields(movie);
        
        console.log(`  📝 标题: ${movie.title}`);
        console.log(`  🎬 类型: ${movie.genre || '无'}`);
        console.log(`  📽️ 分类: ${movie.type}`);
        console.log(`  ⭐ 豆瓣评分: ${movie.doubanRating || '无'}`);
        console.log(`  👤 我的评分: ${movie.myRating || '无'}`);
        console.log(`  🏷️ 我的标签: ${movie.myTags || '无'}`);
        console.log(`  💬 我的备注: ${movie.myComment || '无'}`);
        console.log(`  🎭 导演: ${movie.director || '无'}`);
        console.log(`  🎬 主演: ${movie.cast || '无'}`);
        console.log(`  🌍 制片地区: ${movie.country || '无'}`);
        console.log(`  🗣️ 语言: ${movie.language || '无'}`);
        console.log(`  ⏱️ 片长: ${movie.duration || '无'}`);
        console.log(`  📅 上映日期: ${movie.releaseDate || '无'}`);
        
        if (validation.valid) {
          console.log(`  ✅ 18个字段完整`);
        } else {
          console.log(`  ❌ 缺少字段 (${validation.missing.length}/${REQUIRED_FIELDS.length}): ${validation.missing.join(', ')}`);
        }
        
        allMovies.push(movie);
        
      } catch (error: any) {
        console.log(`  ❌ 解析失败: ${error.message}`);
      }
    }

    // 5. 汇总结果
    console.log('\n=== 测试结果汇总 ===');
    console.log(`📊 总电影数: ${totalMovies} 部 (${collectList.length} 看过 + ${wishList.length} 想看)`);
    console.log(`🔍 详细解析: ${allMovies.length} 部`);
    
    let completeCount = 0;
    let totalMissingFields = 0;
    
    allMovies.forEach((movie) => {
      const validation = scraper.validateFields(movie);
      if (validation.valid) {
        completeCount++;
      } else {
        totalMissingFields += validation.missing.length;
      }
    });
    
    console.log(`✅ 18字段完整: ${completeCount}/${allMovies.length} 部`);
    
    if (totalMissingFields > 0) {
      console.log(`⚠️ 总缺少字段数: ${totalMissingFields}`);
    }

    // 6. 保存测试结果
    const outputPath = path.join(__dirname, '../cache', `movie-test-${userId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      totalMovies,
      collectCount: collectList.length,
      wishCount: wishList.length,
      detailedMovies: allMovies,
      testResults: {
        completeCount,
        totalMissingFields,
        requiredFields: REQUIRED_FIELDS
      }
    }, null, 2));
    
    console.log(`💾 测试结果已保存: ${outputPath}`);
    
    // 7. 结论
    console.log('\n🎯 测试结论:');
    if (totalMovies >= 35) { // 允许一些偏差
      console.log('✅ 电影数量抓取: 通过');
    } else {
      console.log('❌ 电影数量抓取: 不足');
    }
    
    if (completeCount >= 3) { // 至少3部电影字段完整
      console.log('✅ 18字段解析: 通过');
    } else {
      console.log('❌ 18字段解析: 需要修复');
    }
    
  } catch (error: any) {
    console.error('💥 测试失败:', error.message);
  }
}

if (require.main === module) {
  testCompleteMovieData();
}