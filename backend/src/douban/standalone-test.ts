/**
 * 豆瓣数据抓取独立测试脚本
 * 
 * 这个脚本独立于NestJS框架，直接测试核心抓取功能
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

// 简化的反爬虫服务
class SimpleAntiSpider {
  private requestCount = 0;
  
  // 反爬虫配置
  private readonly baseDelay = 4000;
  private readonly randomDelay = 4000;
  private readonly slowModeThreshold = 200;
  private readonly slowDelay = 10000;
  private readonly slowRandomDelay = 5000;

  async makeRequest(url: string, cookie: string): Promise<string> {
    // 智能延迟
    await this.intelligentDelay();
    
    // 配置Headers
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

      // 检查人机验证
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

// 简化的HTML解析器
class SimpleHtmlParser {
  parseListPage(html: string): any[] {
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
      
      // 尝试多种格式
      let totalMatch = subjectNumText.match(/共\s*(\d+)\s*本/); // "共 156 本"
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/\/\s*(\d+)/); // "1-30 / 156"
      }
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/(\d+)\s*本/); // "156 本"
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

  parseBookDetail(html: string): any {
    const $ = cheerio.load(html);
    
    // 1. 尝试解析JSON-LD
    let structuredData = null;
    try {
      const jsonScript = $('script[type="application/ld+json"]').first().text();
      if (jsonScript) {
        const cleanJson = jsonScript.replace(/[\r\n\t\s+]/g, '');
        structuredData = JSON.parse(cleanJson);
      }
    } catch (error) {
      console.warn('JSON-LD解析失败:', error);
    }

    // 2. 解析Meta标签
    const image = $('head > meta[property="og:image"]').attr('content');
    const description = $('head > meta[property="og:description"]').attr('content');

    // 3. 解析用户状态
    const rating = $('input#n_rating').val();
    
    // 标签解析 - 尝试多种选择器
    let tags: string[] = [];
    
    // 方法1: span#rating的兄弟元素
    const ratingSpan = $('span#rating');
    if (ratingSpan.length > 0) {
      const tagsElement = ratingSpan.next();
      const tagsText = tagsElement.text().trim();
      if (tagsText && tagsText.includes('标签:')) {
        tags = tagsText.replace('标签:', '').trim().split(/\s+/).filter(t => t.length > 0);
      }
    }
    
    // 方法2: 备用选择器
    if (tags.length === 0) {
      $('#interest_sect_level span').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('标签:')) {
          tags = text.replace('标签:', '').trim().split(/\s+/).filter(t => t.length > 0);
        }
      });
    }

    // 4. 解析基本信息
    const score = $('#interest_sectl strong[property="v:average"]').text();

    return {
      title: structuredData?.name || '未知',
      score: score ? parseFloat(score) : undefined,
      image,
      description,
      author: structuredData?.author?.map((a: any) => a.name || a) || [],
      isbn: structuredData?.isbn,
      myRating: rating ? parseFloat(rating as string) : undefined,
      myTags: tags,
      rawStructuredData: structuredData
    };
  }
}

// 测试主函数
async function testDoubanScraping() {
  console.log('=== 豆瓣数据抓取独立测试 ===\n');

  // 这里需要替换为真实的Cookie和用户ID
  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || '';

  if (!cookie || !userId) {
    console.error('使用方法: npm run test:douban "你的Cookie" "你的用户ID"');
    console.error('例如: npm run test:douban "bid=abc123;dbcl2=..." "123456789"');
    return;
  }

  const antiSpider = new SimpleAntiSpider();
  const parser = new SimpleHtmlParser();

  try {
    console.log(`测试用户: ${userId}`);
    console.log(`Cookie长度: ${cookie.length} 字符`);
    console.log('');

    // 1. 测试获取书籍列表页
    console.log('1. 测试获取书籍列表页...');
    const listUrl = `https://book.douban.com/people/${userId}/collect?start=0&sort=time&rating=all&filter=all&mode=list`;
    const listHtml = await antiSpider.makeRequest(listUrl, cookie);
    
    // 解析列表页
    const listResult = parser.parseListPage(listHtml);
    console.log(`找到 ${listResult.items.length} 本书籍，总数: ${listResult.total}`);
    
    if (listResult.items.length === 0) {
      console.log('❌ 未找到书籍数据，请检查用户ID和Cookie');
      return;
    }

    // 显示前3本书的信息
    console.log('\n前3本书籍:');
    listResult.items.slice(0, 3).forEach((book: any, index: number) => {
      console.log(`  ${index + 1}. ${book.title} (ID: ${book.id})`);
    });

    // 2. 测试获取单本书的详情
    console.log('\n2. 测试获取书籍详情...');
    const firstBook = listResult.items[0];
    const detailUrl = `https://book.douban.com/subject/${firstBook.id}/`;
    const detailHtml = await antiSpider.makeRequest(detailUrl, cookie);
    
    // 解析详情页
    const bookDetail = parser.parseBookDetail(detailHtml);
    console.log('\n书籍详情:');
    console.log(`  标题: ${bookDetail.title}`);
    console.log(`  评分: ${bookDetail.score || '无'}`);
    console.log(`  作者: ${bookDetail.author.join(', ') || '无'}`);
    console.log(`  ISBN: ${bookDetail.isbn || '无'}`);
    console.log(`  我的评分: ${bookDetail.myRating || '无'}`);
    console.log(`  我的标签: ${bookDetail.myTags?.join(', ') || '无'}`);

    // 3. 显示统计信息
    console.log('\n=== 测试完成 ===');
    const stats = antiSpider.getStats();
    console.log(`总请求数: ${stats.requestCount}`);
    console.log(`当前模式: ${stats.isSlowMode ? '慢速' : '正常'}`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    
    if (error.message.includes('人机验证')) {
      console.error('\n可能的解决方案:');
      console.error('1. 重新获取Cookie');
      console.error('2. 等待一段时间后再试');
      console.error('3. 检查网络连接');
    }
  }
}

// 运行测试
if (require.main === module) {
  testDoubanScraping();
}