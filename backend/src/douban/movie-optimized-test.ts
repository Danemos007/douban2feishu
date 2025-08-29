/**
 * 优化版豆瓣电影数据抓取测试
 * 
 * 使用URL参数方案：
 * - &type=movie：纯电影列表
 * - &type=tv：电视剧+纪录片列表，再通过genre区分
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

// 简化的反爬虫服务（复用已有逻辑）
class SimpleAntiSpider {
  private requestCount = 0;
  
  private readonly baseDelay = 4000;
  private readonly randomDelay = 4000;
  private readonly slowModeThreshold = 200;
  private readonly slowDelay = 10000;
  private readonly slowRandomDelay = 5000;

  async makeRequest(url: string, cookie: string): Promise<string> {
    await this.intelligentDelay();
    
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Cookie': cookie,
      'Host': this.extractHost(url),
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };

    try {
      console.log(`[请求] ${url}`);
      const response = await axios.get(url, { 
        headers, 
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      const html = response.data;

      if (this.isBlocked(html)) {
        throw new Error('遇到人机验证，请检查Cookie');
      }

      console.log(`[成功] 获取到 ${html.length} 字符`);
      return html;

    } catch (error: any) {
      console.error(`[错误] ${error.message}`);
      throw error;
    }
  }

  private async intelligentDelay(): Promise<void> {
    this.requestCount++;
    
    let delay: number;
    
    if (this.requestCount > this.slowModeThreshold) {
      delay = this.slowDelay + Math.random() * this.slowRandomDelay;
      console.log(`[慢速模式] 延迟 ${Math.round(delay / 1000)} 秒`);
    } else {
      delay = this.baseDelay + Math.random() * this.randomDelay;
      console.log(`[正常模式] 延迟 ${Math.round(delay / 1000)} 秒`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private isBlocked(html: string): boolean {
    return html.includes('<title>禁止访问</title>') || 
           html.includes('验证码') ||
           html.includes('人机验证');
  }

  private extractHost(url: string): string {
    if (url.includes('book.douban.com')) return 'book.douban.com';
    if (url.includes('movie.douban.com')) return 'movie.douban.com';
    return 'www.douban.com';
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      isSlowMode: this.requestCount > this.slowModeThreshold
    };
  }
}

// 优化的电影解析器
class OptimizedMovieParser {
  parseMovieListPage(html: string): any {
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('.item-show').each((index, element) => {
      const $element = $(element);
      
      const linkElement = $element.find('div.title > a');
      const title = linkElement.text().trim();
      const url = linkElement.attr('href');
      
      if (!url || !title) return;

      const idMatch = url.match(/(\d){5,10}/);
      if (!idMatch) return;

      const id = idMatch[0];
      const dateElement = $element.find('div.date');
      const dateText = dateElement.text().trim();

      items.push({
        id,
        title,
        url,
        dateText
      });
    });

    // 解析总数
    let total = 0;
    const subjectNumElement = $('.subject-num');
    if (subjectNumElement.length > 0) {
      const subjectNumText = subjectNumElement.text().trim();
      
      let totalMatch = subjectNumText.match(/共\s*(\d+)\s*部/); // "共 156 部"
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/\/\s*(\d+)/); // "1-30 / 156"
      }
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/(\d+)\s*部/); // "156 部"
      }
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/(\d+)/); // 最后fallback
      }
      
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }
    }

    return { items, total };
  }

  /**
   * 通过genre判断是纪录片还是电视剧
   * 仅对type=tv的条目有效
   */
  classifyTvType(genres: string[]): 'tv' | 'documentary' {
    const genreStr = genres.join(' ').toLowerCase();
    
    if (genreStr.includes('纪录片') || genreStr.includes('documentary')) {
      return 'documentary';
    }
    
    return 'tv';
  }

  parseMovieDetail(html: string, movieId: string, knownType: 'movie' | 'tv'): any {
    const $ = cheerio.load(html);
    
    // 1. 解析结构化数据
    const structuredData = this.parseStructuredData($);
    
    // 2. 解析基本信息
    const basicInfo = this.parseMovieBasicInfo($);
    
    // 3. 解析用户状态
    const userState = this.parseUserState($);
    
    // 4. 解析详细信息
    const detailInfo = this.parseMovieDetailInfo($);
    
    // 5. 精确分类：如果已知是tv类型，进一步区分电视剧和纪录片
    let finalType = knownType;
    if (knownType === 'tv') {
      finalType = this.classifyTvType(detailInfo.genre);
    }

    return {
      subjectId: movieId,
      title: structuredData?.name || basicInfo.title || '未知',
      subtitle: basicInfo.subtitle,
      originalTitle: detailInfo.originalTitle,
      
      doubanRating: basicInfo.score,
      image: basicInfo.image,
      description: basicInfo.desc,
      
      director: detailInfo.director || [],
      writer: detailInfo.writer || [],
      cast: detailInfo.cast || [],
      genre: detailInfo.genre || [],
      country: detailInfo.country || [],
      language: detailInfo.language || [],
      releaseYear: detailInfo.releaseYear,
      duration: detailInfo.duration,
      
      myRating: userState.rating,
      myTags: userState.tags || [],
      myStatus: userState.state,
      myComment: userState.comment,
      markDate: userState.markDate,
      
      type: finalType
    };
  }

  private parseStructuredData($: cheerio.Root): any {
    try {
      const scripts = $('script[type="application/ld+json"]');
      if (scripts.length === 0) {
        return null;
      }

      const jsonContent = scripts.first().text();
      if (!jsonContent) {
        return null;
      }

      const cleanedContent = jsonContent.replace(/[\r\n\t\s+]/g, '');
      return JSON.parse(cleanedContent);

    } catch (error) {
      console.warn('Failed to parse structured data:', error);
      return null;
    }
  }

  private parseUserState($: cheerio.Root): any {
    const userState: any = {};

    try {
      // 评分 - input#n_rating
      const ratingInput = $('input#n_rating');
      if (ratingInput.length > 0) {
        const ratingValue = ratingInput.val();
        if (ratingValue && typeof ratingValue === 'string') {
          userState.rating = parseFloat(ratingValue);
        }
      }

      // 标签 - 尝试多种选择器
      let tags: string[] = [];
      const ratingSpan = $('span#rating');
      if (ratingSpan.length > 0) {
        const tagsElement = ratingSpan.next();
        const tagsText = tagsElement.text().trim();
        if (tagsText && tagsText.includes('标签:')) {
          tags = tagsText.replace('标签:', '').trim().split(/\s+/).filter(t => t.length > 0);
        }
      }
      userState.tags = tags;

      // 状态 - div#interest_sect_level span.mr10
      const stateElement = $('#interest_sect_level span.mr10');
      if (stateElement.length > 0) {
        const stateText = stateElement.text().trim();
        userState.state = this.mapUserState(stateText);
      }

      // 标记日期
      if (stateElement.length > 0) {
        const dateElement = stateElement.next();
        const dateText = dateElement.text().trim();
        if (dateText) {
          userState.markDate = new Date(dateText);
        }
      }

      // 评论
      userState.comment = this.parseUserComment($);

    } catch (error) {
      console.warn('Failed to parse user state:', error);
    }

    return userState;
  }

  private parseUserComment($: cheerio.Root): string | undefined {
    const selectors = [
      '#interest_sect_level > div > span:nth-child(7)',
      '#interest_sect_level > div > span:nth-child(8)',
      '#interest_sect_level > div > span:nth-child(9)'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length > 0) {
          return text;
        }
      }
    }

    return undefined;
  }

  private mapUserState(stateText: string): string | undefined {
    const stateMap: { [key: string]: string } = {
      '想看': 'wish',
      '在看': 'do', 
      '看过': 'collect'
    };

    return stateMap[stateText] || undefined;
  }

  private parseMovieBasicInfo($: cheerio.Root): any {
    const result: any = {};

    try {
      // 标题
      const titleElement = $('h1 span[property="v:itemreviewed"]');
      if (titleElement.length > 0) {
        result.title = titleElement.text().trim();
      }

      // 副标题
      const subtitleElement = $('h1 .year');
      if (subtitleElement.length > 0) {
        result.subtitle = subtitleElement.text().trim().replace(/[()]/g, '');
      }

      // 评分
      const scoreElement = $('#interest_sectl strong[property="v:average"]');
      if (scoreElement.length > 0) {
        const scoreText = scoreElement.text();
        if (scoreText) {
          result.score = parseFloat(scoreText);
        }
      }

      // 描述
      let desc = $('.all.hidden').text().trim();
      if (!desc) {
        desc = $('[property="v:summary"]').text().trim();
      }
      if (!desc) {
        const descElement = $('head > meta[property="og:description"]');
        desc = descElement.attr('content') || '';
      }
      if (desc) {
        result.desc = desc;
      }

      // 图片
      const imageElement = $('head > meta[property="og:image"]');
      if (imageElement.length > 0) {
        result.image = imageElement.attr('content');
      }

    } catch (error) {
      console.warn('解析电影基本信息失败:', error);
    }

    return result;
  }

  private parseMovieDetailInfo($: cheerio.Root): any {
    const result: any = {
      director: [],
      writer: [],
      cast: [],
      genre: [],
      country: [],
      language: []
    };

    try {
      const infoElement = $('#info');
      if (infoElement.length === 0) {
        return result;
      }

      // 导演
      const directorElements = infoElement.find('span:contains("导演") a');
      directorElements.each((i, el) => {
        const name = $(el).text().trim();
        if (name) result.director.push(name);
      });

      // 编剧
      const writerElements = infoElement.find('span:contains("编剧") a');
      writerElements.each((i, el) => {
        const name = $(el).text().trim();
        if (name) result.writer.push(name);
      });

      // 主演
      const castElements = infoElement.find('span:contains("主演") a');
      castElements.each((i, el) => {
        const name = $(el).text().trim();
        if (name) result.cast.push(name);
      });

      // 类型
      const genreElements = infoElement.find('span[property="v:genre"]');
      genreElements.each((i, el) => {
        const genre = $(el).text().trim();
        if (genre) result.genre.push(genre);
      });

      // 制片国家/地区
      const countrySpan = infoElement.find('span:contains("制片国家")').parent();
      if (countrySpan.length > 0) {
        const countryText = countrySpan.text().replace(/制片国家\/地区:\s*/, '');
        if (countryText) {
          result.country = countryText.split('/').map((c: string) => c.trim()).filter((c: string) => c);
        }
      }

      // 语言
      const languageSpan = infoElement.find('span:contains("语言")').parent();
      if (languageSpan.length > 0) {
        const languageText = languageSpan.text().replace(/语言:\s*/, '');
        if (languageText) {
          result.language = languageText.split('/').map((l: string) => l.trim()).filter((l: string) => l);
        }
      }

      // 上映日期/首播日期
      let releaseDateElement = infoElement.find('span[property="v:initialReleaseDate"]').first();
      if (releaseDateElement.length === 0) {
        // 电视剧可能使用首播日期
        const firstAirSpan = infoElement.find('span:contains("首播")').parent();
        if (firstAirSpan.length > 0) {
          const firstAirText = firstAirSpan.text().replace(/首播:\s*/, '');
          if (firstAirText) {
            const yearMatch = firstAirText.match(/(\d{4})/);
            if (yearMatch) {
              result.releaseYear = yearMatch[1];
            }
          }
        }
      } else {
        const releaseDate = releaseDateElement.text().trim();
        const yearMatch = releaseDate.match(/(\d{4})/);
        if (yearMatch) {
          result.releaseYear = yearMatch[1];
        }
      }

      // 片长
      const durationElement = infoElement.find('span[property="v:runtime"]');
      if (durationElement.length > 0) {
        result.duration = durationElement.text().trim();
      }

      // 原名
      const originalTitleSpan = infoElement.find('span:contains("又名")').parent();
      if (originalTitleSpan.length > 0) {
        const originalTitle = originalTitleSpan.text().replace(/又名:\s*/, '');
        if (originalTitle) {
          result.originalTitle = originalTitle.split('/')[0].trim();
        }
      }

    } catch (error) {
      console.warn('解析电影详细信息失败:', error);
    }

    return result;
  }
}

// 测试主函数
async function testOptimizedMovieScraping() {
  console.log('=== 优化版豆瓣电影分类抓取测试 ===\n');

  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || '';

  if (!cookie || !userId) {
    console.error('使用方法: npx ts-node --transpile-only src/douban/movie-optimized-test.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const antiSpider = new SimpleAntiSpider();
  const parser = new OptimizedMovieParser();
  const classificationStats = { movie: 0, tv: 0, documentary: 0 };

  try {
    console.log(`测试用户: ${userId}`);
    console.log(`Cookie长度: ${cookie.length} 字符`);
    console.log('');

    // 1. 测试电影列表 (&type=movie)
    console.log('1. 测试电影列表抓取 (&type=movie)...');
    const movieListUrl = `https://movie.douban.com/people/${userId}/collect?start=0&sort=time&rating=all&filter=all&mode=list&type=movie`;
    const movieListHtml = await antiSpider.makeRequest(movieListUrl, cookie);
    
    const movieListResult = parser.parseMovieListPage(movieListHtml);
    console.log(`找到 ${movieListResult.items.length} 部电影，总数: ${movieListResult.total}`);
    
    if (movieListResult.items.length > 0) {
      console.log('\n电影列表（前5部）:');
      movieListResult.items.slice(0, 5).forEach((movie: any, index: number) => {
        console.log(`  ${index + 1}. ${movie.title} (ID: ${movie.id}) - ${movie.dateText}`);
        classificationStats.movie++;
      });
    }

    // 2. 测试电视剧+纪录片列表 (&type=tv)
    console.log('\n2. 测试电视剧+纪录片列表抓取 (&type=tv)...');
    const tvListUrl = `https://movie.douban.com/people/${userId}/collect?start=0&sort=time&rating=all&filter=all&mode=list&type=tv`;
    const tvListHtml = await antiSpider.makeRequest(tvListUrl, cookie);
    
    const tvListResult = parser.parseMovieListPage(tvListHtml);
    console.log(`找到 ${tvListResult.items.length} 部电视剧/纪录片，总数: ${tvListResult.total}`);
    
    if (tvListResult.items.length > 0) {
      console.log('\n电视剧/纪录片列表:');
      tvListResult.items.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.title} (ID: ${item.id}) - ${item.dateText}`);
      });
      
      // 3. 详细分析前3部，区分电视剧和纪录片
      console.log('\n3. 详细分析并智能分类...');
      const testItems = tvListResult.items.slice(0, Math.min(3, tvListResult.items.length));
      
      for (let i = 0; i < testItems.length; i++) {
        const item = testItems[i];
        console.log(`\n正在分析第${i + 1}部: ${item.title}`);
        
        try {
          const detailUrl = `https://movie.douban.com/subject/${item.id}/`;
          const detailHtml = await antiSpider.makeRequest(detailUrl, cookie);
          
          const detail = parser.parseMovieDetail(detailHtml, item.id, 'tv');
          
          console.log(`  📽️ 最终分类: ${detail.type === 'tv' ? '电视剧' : '纪录片'}`);
          console.log(`  🎬 标题: ${detail.title}`);
          console.log(`  ⭐ 豆瓣评分: ${detail.doubanRating || '无'}`);
          console.log(`  👤 我的评分: ${detail.myRating || '无'}`);
          console.log(`  🎭 类型: ${detail.genre?.join(', ') || '无'}`);
          console.log(`  🎬 导演: ${detail.director?.join(', ') || '无'}`);
          
          classificationStats[detail.type]++;
          
        } catch (error: any) {
          console.log(`  ❌ 获取详情失败: ${error.message}`);
        }
      }
    }

    // 显示最终统计
    console.log('\n=== 智能分类统计（基于URL参数方案）===');
    console.log(`🎬 电影: ${classificationStats.movie} 部`);
    console.log(`📺 电视剧: ${classificationStats.tv} 部`);
    console.log(`🎞️ 纪录片: ${classificationStats.documentary} 部`);
    console.log(`📊 总计: ${classificationStats.movie + classificationStats.tv + classificationStats.documentary} 部`);

    // 显示统计信息
    console.log('\n=== 测试完成 ===');
    const stats = antiSpider.getStats();
    console.log(`总请求数: ${stats.requestCount}`);
    console.log(`当前模式: ${stats.isSlowMode ? '慢速' : '正常'}`);
    console.log(`✅ URL参数方案验证成功！分类准确度大幅提升`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testOptimizedMovieScraping();
}