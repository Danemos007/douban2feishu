/**
 * 豆瓣电影数据抓取测试
 * 
 * 测试电影、电视剧、纪录片的智能分类识别和数据抓取
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

// 简化的HTML解析器 - 电影版本
class SimpleMovieParser {
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
      console.log(`[调试] 总数文本: "${subjectNumText}"`);
      
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

  parseMovieDetail(html: string, movieId: string): any {
    const $ = cheerio.load(html);
    
    // 1. 解析结构化数据
    const structuredData = this.parseStructuredData($);
    
    // 2. 解析基本信息
    const basicInfo = this.parseMovieBasicInfo($);
    
    // 3. 解析用户状态
    const userState = this.parseUserState($);
    
    // 4. 解析详细信息
    const detailInfo = this.parseMovieDetailInfo($);
    
    // 5. 智能分类识别
    const movieType = this.classifyMovieType(detailInfo.genre, detailInfo);

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
      
      type: movieType
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
    // 尝试多个选择器
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

      // 上映日期
      const releaseDateElement = infoElement.find('span[property="v:initialReleaseDate"]').first();
      if (releaseDateElement.length > 0) {
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

      // 集数（电视剧特有）
      const episodeSpan = infoElement.find('span:contains("集数")').parent();
      if (episodeSpan.length > 0) {
        const episodeText = episodeSpan.text().replace(/集数:\s*/, '');
        if (episodeText) {
          result.episodes = episodeText.trim();
        }
      }

      // 单集片长（电视剧特有）
      const singleEpisodeDurationSpan = infoElement.find('span:contains("单集片长")').parent();
      if (singleEpisodeDurationSpan.length > 0) {
        const singleDurationText = singleEpisodeDurationSpan.text().replace(/单集片长:\s*/, '');
        if (singleDurationText) {
          result.singleEpisodeDuration = singleDurationText.trim();
        }
      }

      // 首播日期（电视剧特有）
      const firstAirSpan = infoElement.find('span:contains("首播")').parent();
      if (firstAirSpan.length > 0) {
        const firstAirText = firstAirSpan.text().replace(/首播:\s*/, '');
        if (firstAirText) {
          result.firstAirDate = firstAirText.trim();
          // 同时提取首播年份
          const firstAirYearMatch = firstAirText.match(/(\d{4})/);
          if (firstAirYearMatch) {
            result.releaseYear = firstAirYearMatch[1];
          }
        }
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

  private classifyMovieType(genres: string[], detailInfo?: any): 'movie' | 'tv' | 'documentary' {
    const genreStr = genres.join(' ').toLowerCase();
    
    // 优先识别纪录片
    if (genreStr.includes('纪录片') || genreStr.includes('documentary')) {
      return 'documentary';
    }
    
    // 通过电视剧特有字段识别（这是最可靠的方法）
    if (detailInfo) {
      // 检查是否有集数信息
      if (detailInfo.episodes || detailInfo.singleEpisodeDuration || detailInfo.firstAirDate) {
        return 'tv';
      }
      
      // 检查片长是否包含"分钟"但不是电影的常见时长
      if (detailInfo.duration) {
        const durationStr = detailInfo.duration.toLowerCase();
        // 电视剧通常单集片长在20-80分钟之间
        const durationMatch = durationStr.match(/(\d+)\s*分钟/);
        if (durationMatch) {
          const minutes = parseInt(durationMatch[1]);
          if (minutes <= 80) {
            return 'tv';
          }
        }
      }
    }
    
    // 识别电视剧的关键词
    const tvKeywords = [
      '电视剧', 'tv', 'series', '剧集', '连续剧',
      '情景喜剧', '肥皂剧', '迷你剧', '网剧'
    ];
    
    for (const keyword of tvKeywords) {
      if (genreStr.includes(keyword)) {
        return 'tv';
      }
    }
    
    // 默认为电影
    return 'movie';
  }
}

// 测试主函数
async function testDoubanMovieScraping() {
  console.log('=== 豆瓣电影/电视剧/纪录片抓取测试 ===\n');

  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || '';

  if (!cookie || !userId) {
    console.error('使用方法: npx ts-node --transpile-only src/douban/movie-test.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const antiSpider = new SimpleAntiSpider();
  const parser = new SimpleMovieParser();

  try {
    console.log(`测试用户: ${userId}`);
    console.log(`Cookie长度: ${cookie.length} 字符`);
    console.log('');

    // 测试获取"看过"电影列表页
    console.log('1. 测试获取"看过"电影列表页...');
    const listUrl = `https://movie.douban.com/people/${userId}/collect?start=0&sort=time&rating=all&filter=all&mode=list`;
    const listHtml = await antiSpider.makeRequest(listUrl, cookie);
    
    // 解析列表页
    const listResult = parser.parseMovieListPage(listHtml);
    console.log(`找到 ${listResult.items.length} 部看过的影片，总数: ${listResult.total}`);
    
    if (listResult.items.length === 0) {
      console.log('❌ 未找到看过的影片数据，请检查用户ID和Cookie');
      return;
    }

    // 显示前10部影片
    console.log('\n看过影片列表（前10部）:');
    listResult.items.slice(0, 10).forEach((movie: any, index: number) => {
      console.log(`  ${index + 1}. ${movie.title} (ID: ${movie.id}) - ${movie.dateText}`);
    });

    // 测试获取详情并进行智能分类
    console.log('\n2. 测试影片详情抓取和智能分类...');
    const testMovies = listResult.items.slice(0, 3); // 测试前3部
    const classificationStats = { movie: 0, tv: 0, documentary: 0 };

    for (let i = 0; i < testMovies.length; i++) {
      const movie = testMovies[i];
      console.log(`\n正在分析第${i + 1}部: ${movie.title}`);
      
      try {
        const detailUrl = `https://movie.douban.com/subject/${movie.id}/`;
        const detailHtml = await antiSpider.makeRequest(detailUrl, cookie);
        
        const movieDetail = parser.parseMovieDetail(detailHtml, movie.id);
        
        console.log(`  📽️ 类型识别: ${movieDetail.type === 'movie' ? '电影' : movieDetail.type === 'tv' ? '电视剧' : '纪录片'}`);
        console.log(`  🎬 标题: ${movieDetail.title}`);
        console.log(`  ⭐ 豆瓣评分: ${movieDetail.doubanRating || '无'}`);
        console.log(`  👤 我的评分: ${movieDetail.myRating || '无'}`);
        console.log(`  🏷️ 我的标签: ${movieDetail.myTags?.join(', ') || '无'}`);
        console.log(`  🎭 类型: ${movieDetail.genre?.join(', ') || '无'}`);
        console.log(`  🎬 导演: ${movieDetail.director?.join(', ') || '无'}`);
        console.log(`  🌍 制片国家: ${movieDetail.country?.join(', ') || '无'}`);
        console.log(`  📅 上映年份: ${movieDetail.releaseYear || '无'}`);
        
        classificationStats[movieDetail.type]++;
        
      } catch (error: any) {
        console.log(`  ❌ 获取详情失败: ${error.message}`);
      }
    }

    // 显示分类统计
    console.log('\n=== 智能分类统计 ===');
    console.log(`电影: ${classificationStats.movie} 部`);
    console.log(`电视剧: ${classificationStats.tv} 部`);
    console.log(`纪录片: ${classificationStats.documentary} 部`);

    // 显示统计信息
    console.log('\n=== 测试完成 ===');
    const stats = antiSpider.getStats();
    console.log(`总请求数: ${stats.requestCount}`);
    console.log(`当前模式: ${stats.isSlowMode ? '慢速' : '正常'}`);
    console.log(`验证结果: 成功获取并分类${testMovies.length}部影片数据`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testDoubanMovieScraping();
}