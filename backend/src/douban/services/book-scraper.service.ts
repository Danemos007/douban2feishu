import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { AntiSpiderService } from './anti-spider.service';
import {
  HtmlParserService,
  ParsedUserState,
  ParsedListPage,
} from './html-parser.service';
import {
  BookCompleteSchema,
  validateBookComplete,
  type BookComplete,
  type UserStatus,
} from '../schemas';

export interface BookData {
  // 基础字段
  subjectId: string;
  title: string;
  subTitle?: string;
  originalTitle?: string;
  score?: number;
  desc?: string;
  image?: string;
  url: string;

  // 书籍特有字段
  author: string[];
  translator: string[];
  publisher?: string;
  datePublished?: Date;
  isbn?: string;
  totalPage?: number;
  series?: string;
  price?: number;
  binding?: string;
  producer?: string;

  // 用户数据
  myRating?: number;
  myTags?: string[];
  myState?: 'wish' | 'do' | 'collect';
  myComment?: string;
  markDate?: Date;
}

/**
 * 书籍数据抓取服务 - 基于obsidian-douban的书籍解析策略
 */
@Injectable()
export class BookScraperService {
  private readonly logger = new Logger(BookScraperService.name);

  constructor(
    private readonly antiSpider: AntiSpiderService,
    private readonly htmlParser: HtmlParserService,
  ) {}

  /**
   * 抓取用户的书籍数据
   */
  async fetchUserBooks(
    userId: string,
    cookie: string,
    options: {
      status?: 'wish' | 'do' | 'collect';
      limit?: number;
    } = {},
  ): Promise<BookData[]> {
    const { status = 'collect', limit = 100 } = options;

    this.logger.log(`Starting to fetch ${status} books for user ${userId}`);

    try {
      // 1. 获取列表页数据
      const listItems = await this.fetchBookList(userId, cookie, status, limit);

      this.logger.log(`Found ${listItems.length} book list items`);

      // 2. 获取每本书的详情
      const books: BookData[] = [];

      for (const item of listItems) {
        try {
          const bookDetail = await this.fetchBookDetail(item.id, cookie);
          if (bookDetail) {
            books.push(bookDetail);
            this.logger.debug(`Fetched book detail: ${bookDetail.title}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to fetch detail for book ${item.id}:`,
            errorMessage,
          );
          // 继续处理其他书籍
        }
      }

      this.logger.log(
        `Successfully fetched ${books.length} complete book records`,
      );
      return books;
    } catch (error) {
      this.logger.error(`Failed to fetch books for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 获取书籍列表页
   */
  private async fetchBookList(
    userId: string,
    cookie: string,
    status: string,
    limit: number,
  ): Promise<{ id: string; title: string; url: string }[]> {
    const items = [];
    let start = 0;
    const pageSize = 30;

    while (items.length < limit) {
      const url = this.buildListUrl(userId, status, start);

      try {
        const html = await this.antiSpider.makeRequest(url, cookie);
        const $ = cheerio.load(html);

        const listPage = this.htmlParser.parseListPage($ as any);

        if (listPage.items.length === 0) {
          this.logger.debug(`No more items found at start=${start}`);
          break;
        }

        (items as any[]).push(...listPage.items);

        // 检查是否还有更多页面
        if (!listPage.hasMore || listPage.items.length < pageSize) {
          break;
        }

        start += pageSize;
      } catch (error) {
        this.logger.error(
          `Failed to fetch list page at start=${start}:`,
          error,
        );
        break;
      }
    }

    return items.slice(0, limit);
  }

  /**
   * 获取单本书的详细信息
   */
  private async fetchBookDetail(
    bookId: string,
    cookie: string,
  ): Promise<BookData> {
    const url = `https://book.douban.com/subject/${bookId}/`;

    try {
      const html = await this.antiSpider.makeRequest(url, cookie);
      const $ = cheerio.load(html);

      return this.parseBookDetail($, bookId, url);
    } catch (error) {
      this.logger.error(`Failed to fetch book detail ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * 解析书籍详情页 - 基于obsidian-douban的解析策略
   */
  private parseBookDetail(
    $: cheerio.Root,
    bookId: string,
    url: string,
  ): BookData {
    try {
      // 1. 解析JSON-LD结构化数据
      const structuredData = this.htmlParser.parseStructuredData($ as any);

      // 2. 解析Meta标签
      const metaTags = this.htmlParser.parseMetaTags($ as any);

      // 3. 解析基础信息
      const basicInfo = this.htmlParser.parseBasicInfo($ as any);

      // 4. 解析用户状态
      const userState = this.htmlParser.parseUserState($ as any);

      // 5. 解析#info区域的详细信息
      const infoData = this.htmlParser.parseInfoSection($ as any);

      // 6. 组合数据
      const bookData: BookData = {
        subjectId: bookId,
        url: url,
        title: structuredData?.name || metaTags.title || '',
        subTitle: infoData.subTitle,
        originalTitle: infoData.originalTitle,
        score: basicInfo.score,
        desc: basicInfo.desc || metaTags.description,
        image: metaTags.image,

        // 书籍特有字段
        author: this.extractAuthors(structuredData, infoData),
        translator: infoData.translator || [],
        publisher: infoData.publisher,
        datePublished: this.parsePublishDate(infoData.datePublished),
        isbn: structuredData?.isbn || infoData.isbn,
        totalPage: this.parseNumber(infoData.totalPage),
        series: infoData.series,
        price: this.parsePrice(infoData.price),
        binding: infoData.binding,
        producer: infoData.producer,

        // 用户数据
        myRating: userState.rating,
        myTags: userState.tags,
        myState: userState.state,
        myComment: userState.comment,
        markDate: userState.markDate,
      };

      this.logger.debug(`Parsed book: ${bookData.title}`);
      return bookData;
    } catch (error) {
      this.logger.error(`Failed to parse book detail for ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * 提取作者信息
   */
  private extractAuthors(structuredData: any, infoData: any): string[] {
    // 优先使用JSON-LD数据
    if (structuredData?.author) {
      if (Array.isArray(structuredData.author)) {
        return structuredData.author.map((a) => a.name || a).filter(Boolean);
      } else if (structuredData.author.name) {
        return [structuredData.author.name];
      }
    }

    // 备用：从info数据提取
    if (infoData.author) {
      if (Array.isArray(infoData.author)) {
        return infoData.author;
      } else {
        return [infoData.author];
      }
    }

    return [];
  }

  /**
   * 解析出版日期
   */
  private parsePublishDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    try {
      // 处理各种日期格式
      const patterns = [
        /^(\d{4})-(\d{1,2})$/, // 2020-1
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 2020-1-1
        /^(\d{4})年(\d{1,2})月$/, // 2020年1月
        /^(\d{4})$/, // 2020
      ];

      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          const year = parseInt(match[1]);
          const month = match[2] ? parseInt(match[2]) - 1 : 0; // JS月份从0开始
          const day = match[3] ? parseInt(match[3]) : 1;

          return new Date(year, month, day);
        }
      }

      // 直接解析
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error) {
      this.logger.warn(`Failed to parse publish date: ${dateStr}`);
      return undefined;
    }
  }

  /**
   * 解析数字字段
   */
  private parseNumber(value: string): number | undefined {
    if (!value) return undefined;

    const num = parseInt(value.replace(/[^\d]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  /**
   * 解析价格
   */
  private parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;

    try {
      // 移除货币符号和单位，提取数字
      const numStr = priceStr.replace(/[^\d.]/g, '');
      const price = parseFloat(numStr);

      return isNaN(price) ? undefined : price;
    } catch (error) {
      this.logger.warn(`Failed to parse price: ${priceStr}`);
      return undefined;
    }
  }

  /**
   * 构建列表页URL
   */
  private buildListUrl(userId: string, status: string, start: number): string {
    const baseParams = `start=${start}&sort=time&rating=all&filter=all&mode=list`;
    return `https://book.douban.com/people/${userId}/${status}?${baseParams}`;
  }

  /**
   * 解析书籍目录 (如果需要)
   */
  private parseBookMenu($: cheerio.Root, bookId: string): string[] {
    const menu: string[] = [];

    try {
      // 查找目录元素
      const menuElement = $(`#dir_${bookId}_full, #dir_${bookId}_short`);

      if (menuElement.length > 0) {
        const menuText = menuElement.text().trim();
        if (menuText) {
          const menuLines = menuText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          // 移除最后的"展开全部"等链接文字
          if (menuLines.length > 0) {
            const lastLine = menuLines[menuLines.length - 1];
            if (lastLine.includes('展开') || lastLine.includes('收起')) {
              menuLines.pop();
            }
          }

          menu.push(...menuLines);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse book menu for ${bookId}:`,
        errorMessage,
      );
    }

    return menu;
  }

  /**
   * 验证书籍数据完整性 - 类型安全版本
   */
  validateBookData(data: unknown): { success: boolean; data?: BookComplete; errors: string[] } {
    const result = validateBookComplete(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        errors: [],
      };
    } else {
      this.logger.warn('Book data validation failed:', result.error);
      return {
        success: false,
        errors: [result.error],
      };
    }
  }

  /**
   * 验证书籍数据完整性 - 向后兼容版本
   * @deprecated 请使用 validateBookData(data: unknown)，此方法仅用于兼容现有代码
   */
  private validateBookDataLegacy(book: BookData): boolean {
    const required = ['subjectId', 'title'];

    for (const field of required) {
      if (!book[field]) {
        this.logger.warn(`Book data missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 获取抓取统计信息
   */
  getScrapingStats() {
    return this.antiSpider.getRequestStats();
  }

  /**
   * 批量验证书籍数据
   */
  batchValidateBooks(books: unknown[]): {
    valid: BookComplete[];
    invalid: Array<{ index: number; data: unknown; errors: string[] }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      successRate: number;
    };
  } {
    const valid: BookComplete[] = [];
    const invalid: Array<{ index: number; data: unknown; errors: string[] }> = [];

    books.forEach((book, index) => {
      const validation = this.validateBookData(book);
      if (validation.success && validation.data) {
        valid.push(validation.data);
      } else {
        invalid.push({
          index,
          data: book,
          errors: validation.errors,
        });
      }
    });

    const summary = {
      total: books.length,
      valid: valid.length,
      invalid: invalid.length,
      successRate: books.length > 0 ? (valid.length / books.length) * 100 : 0,
    };

    this.logger.log(
      `Batch validation: ${summary.valid}/${summary.total} valid (${summary.successRate.toFixed(1)}%)`,
    );

    return { valid, invalid, summary };
  }
}
