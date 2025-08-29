/**
 * 豆瓣"想读"书籍数据抓取测试
 * 
 * 测试32本"想读"书籍的抓取功能
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

// 简化的反爬虫服务（复用standalone-test的逻辑）
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

// 简化的HTML解析器
class SimpleHtmlParser {
  parseListPage(html: string): any {
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

    // 解析总数 - 想读页面格式可能不同
    let total = 0;
    const subjectNumElement = $('.subject-num');
    if (subjectNumElement.length > 0) {
      const subjectNumText = subjectNumElement.text().trim();
      console.log(`[调试] 总数文本: "${subjectNumText}"`);
      
      // 尝试多种格式
      let totalMatch = subjectNumText.match(/共\s*(\d+)\s*本/); // "共 32 本"
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/\/\s*(\d+)/); // "1-30 / 32"
      }
      if (!totalMatch) {
        totalMatch = subjectNumText.match(/(\d+)\s*本/); // "32 本"
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
}

// 测试主函数
async function testDoubanWishScraping() {
  console.log('=== 豆瓣"想读"书籍抓取测试 ===\n');

  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || '';

  if (!cookie || !userId) {
    console.error('使用方法: npx ts-node --transpile-only src/douban/wish-test.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const antiSpider = new SimpleAntiSpider();
  const parser = new SimpleHtmlParser();

  try {
    console.log(`测试用户: ${userId}`);
    console.log(`Cookie长度: ${cookie.length} 字符`);
    console.log('');

    // 测试获取"想读"书籍列表页
    console.log('1. 测试获取"想读"书籍列表页...');
    const listUrl = `https://book.douban.com/people/${userId}/wish?start=0&sort=time&rating=all&filter=all&mode=list`;
    const listHtml = await antiSpider.makeRequest(listUrl, cookie);
    
    // 解析列表页
    const listResult = parser.parseListPage(listHtml);
    console.log(`找到 ${listResult.items.length} 本想读书籍，总数: ${listResult.total}`);
    
    if (listResult.items.length === 0) {
      console.log('❌ 未找到想读书籍数据，请检查用户ID和Cookie');
      return;
    }

    // 显示所有想读书籍的信息
    console.log('\n想读书籍列表:');
    listResult.items.forEach((book: any, index: number) => {
      console.log(`  ${index + 1}. ${book.title} (ID: ${book.id}) - ${book.dateText}`);
    });

    // 显示统计信息
    console.log('\n=== 测试完成 ===');
    const stats = antiSpider.getStats();
    console.log(`总请求数: ${stats.requestCount}`);
    console.log(`当前模式: ${stats.isSlowMode ? '慢速' : '正常'}`);
    console.log(`验证结果: 成功获取${listResult.items.length}本想读书籍数据`);

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testDoubanWishScraping();
}