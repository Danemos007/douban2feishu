import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookScraperService } from './services/book-scraper.service';
import { AntiSpiderService } from './services/anti-spider.service';

/**
 * 豆瓣测试控制器 - 用于调试和验证抓取功能
 */
@ApiTags('豆瓣测试')
@Controller('douban/test')
export class TestDoubanController {
  private readonly logger = new Logger(TestDoubanController.name);

  constructor(
    private readonly bookScraper: BookScraperService,
    private readonly antiSpider: AntiSpiderService,
  ) {}

  /**
   * 测试Cookie有效性
   */
  @Post('validate-cookie')
  @ApiOperation({ summary: '测试Cookie有效性' })
  @ApiResponse({ status: 200, description: 'Cookie验证结果' })
  async validateCookie(
    @Body() body: { userId: string; cookie: string }
  ) {
    try {
      const result = await this.antiSpider.validateCookie(body.userId, body.cookie);
      return {
        success: true,
        data: result,
        message: result.isValid ? 'Cookie有效' : 'Cookie无效'
      };
    } catch (error) {
      this.logger.error('Cookie validation failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Cookie验证失败'
      };
    }
  }

  /**
   * 测试抓取少量书籍
   */
  @Post('fetch-books-sample')
  @ApiOperation({ summary: '抓取少量书籍样本' })
  @ApiResponse({ status: 200, description: '书籍抓取结果' })
  async fetchBooksSample(
    @Body() body: {
      userId: string;
      cookie: string;
      status?: 'wish' | 'do' | 'collect';
      limit?: number;
    }
  ) {
    try {
      const { userId, cookie, status = 'collect', limit = 3 } = body;

      this.logger.log(`Testing book scraping for user ${userId}, status: ${status}, limit: ${limit}`);

      const books = await this.bookScraper.fetchUserBooks(userId, cookie, {
        status,
        limit
      });

      return {
        success: true,
        data: {
          books,
          count: books.length,
          stats: this.antiSpider.getRequestStats()
        },
        message: `成功抓取${books.length}本书籍`
      };

    } catch (error) {
      this.logger.error('Book scraping failed:', error);
      return {
        success: false,
        error: error.message,
        message: '书籍抓取失败'
      };
    }
  }

  /**
   * 获取抓取统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取抓取统计信息' })
  @ApiResponse({ status: 200, description: '统计信息' })
  async getStats() {
    return {
      success: true,
      data: {
        antiSpider: this.antiSpider.getRequestStats(),
        delayConfig: this.antiSpider.getCurrentDelayConfig()
      },
      message: '获取统计信息成功'
    };
  }

  /**
   * 重置请求计数器
   */
  @Post('reset-counter')
  @ApiOperation({ summary: '重置请求计数器' })
  @ApiResponse({ status: 200, description: '重置结果' })
  async resetCounter() {
    try {
      this.antiSpider.resetRequestCount();
      return {
        success: true,
        message: '请求计数器已重置'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '重置失败'
      };
    }
  }

  /**
   * 测试单本书籍详情抓取
   */
  @Post('fetch-single-book')
  @ApiOperation({ summary: '测试抓取单本书籍详情' })
  @ApiResponse({ status: 200, description: '单本书籍详情' })
  async fetchSingleBook(
    @Body() body: {
      bookId: string;
      cookie: string;
    }
  ) {
    try {
      const { bookId, cookie } = body;

      this.logger.log(`Testing single book fetch: ${bookId}`);

      // 直接调用反爬虫服务获取页面
      const url = `https://book.douban.com/subject/${bookId}/`;
      const html = await this.antiSpider.makeRequest(url, cookie);

      // 这里可以返回HTML长度或其他调试信息
      return {
        success: true,
        data: {
          bookId,
          url,
          htmlLength: html.length,
          containsTitle: html.includes('<title>'),
          containsRating: html.includes('rating_self'),
          stats: this.antiSpider.getRequestStats()
        },
        message: '单本书籍页面获取成功'
      };

    } catch (error) {
      this.logger.error('Single book fetch failed:', error);
      return {
        success: false,
        error: error.message,
        message: '单本书籍获取失败'
      };
    }
  }

  /**
   * 测试获取书籍列表页
   */
  @Post('fetch-book-list')
  @ApiOperation({ summary: '测试获取书籍列表页' })
  @ApiResponse({ status: 200, description: '书籍列表页面信息' })
  async fetchBookList(
    @Body() body: {
      userId: string;
      cookie: string;
      status?: 'wish' | 'do' | 'collect';
    }
  ) {
    try {
      const { userId, cookie, status = 'collect' } = body;

      this.logger.log(`Testing book list fetch for user ${userId}, status: ${status}`);

      // 构造列表页URL
      const url = `https://book.douban.com/people/${userId}/${status}?start=0&sort=time&rating=all&filter=all&mode=list`;
      const html = await this.antiSpider.makeRequest(url, cookie);

      // 分析页面内容
      const hasItems = html.includes('item-show');
      const hasSubjectNum = html.includes('subject-num');
      const needsLogin = html.includes('登录');

      return {
        success: true,
        data: {
          userId,
          status,
          url,
          htmlLength: html.length,
          hasItems,
          hasSubjectNum,
          needsLogin,
          stats: this.antiSpider.getRequestStats()
        },
        message: '书籍列表页获取成功'
      };

    } catch (error) {
      this.logger.error('Book list fetch failed:', error);
      return {
        success: false,
        error: error.message,
        message: '书籍列表页获取失败'
      };
    }
  }
}