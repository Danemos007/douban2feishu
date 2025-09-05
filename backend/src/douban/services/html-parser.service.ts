import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface ParsedUserState {
  rating?: number;
  tags?: string[];
  state?: 'wish' | 'do' | 'collect';
  comment?: string;
  markDate?: Date;
}

export interface ParsedListItem {
  id: string;
  url: string;
  title: string;
  updateDate?: Date;
}

export interface ParsedListPage {
  items: ParsedListItem[];
  total: number;
  hasMore: boolean;
}

/**
 * HTML解析服务 - 基于obsidian-douban的解析策略
 *
 * 解析优先级:
 * 1. JSON-LD结构化数据
 * 2. Meta标签
 * 3. DOM选择器
 */
@Injectable()
export class HtmlParserService {
  private readonly logger = new Logger(HtmlParserService.name);

  /**
   * 解析JSON-LD结构化数据
   */
  parseStructuredData($: cheerio.CheerioAPI): any {
    try {
      const scripts = $('script[type="application/ld+json"]');
      if (scripts.length === 0) {
        return null;
      }

      const jsonContent = scripts.first().text();
      if (!jsonContent) {
        return null;
      }

      // 清理JSON内容 - 移除多余空白字符
      const cleanedContent = jsonContent.replace(/[\r\n\t\s+]/g, '');
      const structuredData = JSON.parse(cleanedContent);

      this.logger.debug('Structured data parsed successfully');
      return structuredData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to parse structured data:', errorMessage);
      return null;
    }
  }

  /**
   * 解析Meta标签信息
   */
  parseMetaTags($: cheerio.CheerioAPI): {
    image?: string;
    description?: string;
    title?: string;
  } {
    const result = {};

    // 图片
    const imageElement = $('head > meta[property="og:image"]');
    if (imageElement.length > 0) {
      result['image'] = imageElement.attr('content');
    }

    // 描述
    const descElement = $('head > meta[property="og:description"]');
    if (descElement.length > 0) {
      result['description'] = descElement.attr('content');
    }

    // 标题
    const titleElement = $('head > meta[property="og:title"]');
    if (titleElement.length > 0) {
      result['title'] = titleElement.attr('content');
    }

    return result;
  }

  /**
   * 解析用户状态 - 基于obsidian-douban的用户状态解析
   */
  parseUserState($: cheerio.CheerioAPI): ParsedUserState {
    const userState: ParsedUserState = {};

    try {
      // 评分 - 支持详情页和列表页两种解析方式
      // 方法1: 详情页input#n_rating
      const ratingInput = $('input#n_rating');
      if (ratingInput.length > 0) {
        const ratingValue = ratingInput.val();
        if (ratingValue && typeof ratingValue === 'string') {
          userState.rating = parseFloat(ratingValue);
          this.logger.debug(
            `Found rating from detail page input: ${userState.rating}`,
          );
        }
      }

      // 方法2: 列表页评分星级 (如果详情页没有找到评分)
      if (!userState.rating) {
        const ratingElement = $('div.date span[class*="rating"][class$="-t"]');
        if (ratingElement.length > 0) {
          const ratingClass = ratingElement.attr('class') || '';
          const ratingMatch = ratingClass.match(/rating(\d+)-t/);
          if (ratingMatch) {
            const rating = parseInt(ratingMatch[1], 10);
            if (rating >= 1 && rating <= 5) {
              userState.rating = rating;
              this.logger.debug(`Found rating from list page: ${rating} stars`);
            }
          }
        }
      }

      // 标签 - span#rating + next()
      const ratingSpan = $('span#rating');
      if (ratingSpan.length > 0) {
        const tagsText = ratingSpan.next().text().trim();
        if (tagsText && tagsText.includes('标签:')) {
          const tagsStr = tagsText.replace('标签:', '').trim();
          userState.tags = tagsStr.split(' ').filter((tag) => tag.length > 0);
        }
      }

      // 状态 - div#interest_sect_level span.mr10
      const stateElement = $('div#interest_sect_level span.mr10');
      if (stateElement.length > 0) {
        const stateText = stateElement.text().trim();
        userState.state = this.mapUserState(stateText);
      }

      // 标记日期 - span.mr10的下一个元素
      if (stateElement.length > 0) {
        const dateElement = stateElement.next();
        const dateText = dateElement.text().trim();
        if (dateText) {
          userState.markDate = this.parseDate(dateText);
        }
      }

      // 评论/备注
      userState.comment = this.parseUserComment($);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to parse user state:', errorMessage);
    }

    return userState;
  }

  /**
   * 解析用户评论 - 多选择器策略
   */
  private parseUserComment($: cheerio.CheerioAPI): string | undefined {
    // 尝试多个选择器，基于obsidian-douban的策略
    const selectors = [
      '#interest_sect_level > div > span:nth-child(7)',
      '#interest_sect_level > div > span:nth-child(8)',
      '#interest_sect_level > div > span:nth-child(9)',
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

    // 备用方案：span#rating的后续元素
    const ratingSpan = $('span#rating');
    if (ratingSpan.length > 0) {
      const commentElement = ratingSpan.next().next().next();
      const commentText = commentElement.text().trim();
      if (commentText && commentText.length > 0) {
        return commentText;
      }
    }

    return undefined;
  }

  /**
   * 映射用户状态文字到标准状态
   */
  private mapUserState(
    stateText: string,
  ): 'wish' | 'do' | 'collect' | undefined {
    const stateMap = {
      // 书籍
      想读: 'wish',
      在读: 'do',
      读过: 'collect',
      // 电影/电视剧
      想看: 'wish',
      在看: 'do',
      看过: 'collect',
      // 音乐
      想听: 'wish',
      在听: 'do',
      听过: 'collect',
    };

    return stateMap[stateText] || undefined;
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateText: string): Date | undefined {
    try {
      // 尝试多种日期格式
      const formats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{4})年(\d{1,2})月(\d{1,2})日/, // YYYY年MM月DD日
        /(\d{1,2})-(\d{1,2})/, // MM-DD (当年)
      ];

      for (const format of formats) {
        const match = dateText.match(format);
        if (match) {
          if (match.length === 4) {
            // 完整日期
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
            );
          } else if (match.length === 3) {
            // 仅月日，使用当年
            const currentYear = new Date().getFullYear();
            return new Date(
              currentYear,
              parseInt(match[1]) - 1,
              parseInt(match[2]),
            );
          }
        }
      }

      // 直接尝试解析
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to parse date: ${dateText}`, errorMessage);
      return undefined;
    }
  }

  /**
   * 解析列表页 - 基于obsidian-douban的列表解析
   */
  parseListPage($: cheerio.CheerioAPI): ParsedListPage {
    const items: ParsedListItem[] = [];

    try {
      // 解析条目列表 - .item-show
      $('.item-show').each((index, element) => {
        const $element = $(element);

        // 标题和链接
        const linkElement = $element.find('div.title > a');
        const title = linkElement.text().trim();
        const url = linkElement.attr('href');

        if (!url || !title) {
          return; // 跳过无效条目
        }

        // 提取ID - 正则匹配 /(\d){5,10}/
        const idMatch = url.match(/(\d){5,10}/);
        if (!idMatch) {
          this.logger.warn(`Failed to extract ID from URL: ${url}`);
          return;
        }
        const id = idMatch[0];

        // 更新日期
        const dateElement = $element.find('div.date');
        const dateText = dateElement.text().trim();
        const updateDate = this.parseDate(dateText);

        items.push({
          id,
          url,
          title,
          updateDate,
        });
      });

      // 解析总数 - .subject-num
      let total = 0;
      const subjectNumElement = $('.subject-num');
      if (subjectNumElement.length > 0) {
        const subjectNumText = subjectNumElement.text().trim();
        const totalMatch = subjectNumText.match(/\/\s*(\d+)/);
        if (totalMatch) {
          total = parseInt(totalMatch[1], 10);
        }
      }

      // 判断是否还有更多
      const hasMore = items.length === 30; // 每页30条

      this.logger.debug(
        `Parsed list page: ${items.length} items, total: ${total}`,
      );

      return {
        items,
        total,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Failed to parse list page:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * 解析详情页的基本信息
   */
  parseBasicInfo($: cheerio.CheerioAPI): {
    score?: number;
    desc?: string;
    image?: string;
  } {
    const result = {};

    try {
      // 评分 - #interest_sectl strong[property='v:average']
      const scoreElement = $('#interest_sectl strong[property="v:average"]');
      if (scoreElement.length > 0) {
        const scoreText = scoreElement.text();
        if (scoreText) {
          result['score'] = parseFloat(scoreText);
        }
      }

      // 描述 - 优先使用.intro，备用meta标签
      let desc = $('.intro p').text().trim();
      if (!desc) {
        const metaTags = this.parseMetaTags($);
        desc = metaTags.description || '';
      }
      if (desc) {
        result['desc'] = desc;
      }

      // 图片
      const metaTags = this.parseMetaTags($);
      if (metaTags.image) {
        result['image'] = metaTags.image;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to parse basic info:', errorMessage);
    }

    return result;
  }

  /**
   * 解析#info区域的详细信息
   */
  parseInfoSection($: cheerio.CheerioAPI): Record<string, any> {
    const infoMap = new Map<string, any>();

    try {
      const infoElement = $('#info');
      if (infoElement.length === 0) {
        return {};
      }

      // 解析span.pl元素 - 基于obsidian-douban的解析策略
      infoElement.find('span.pl').each((index, element) => {
        const $element = $(element);
        const key = $element.text().trim();

        let value: any;

        if (
          key.includes('译者') ||
          key.includes('导演') ||
          key.includes('编剧') ||
          key.includes('主演') ||
          key.includes('类型') ||
          key.includes('制片国家') ||
          key.includes('语言')
        ) {
          // 多值字段：提取链接数组或文本数组
          value = [];

          // 首先尝试从链接中提取
          $element
            .parent()
            .find('a')
            .each((i, link) => {
              const linkText = $(link).text().trim();
              if (linkText) {
                value.push(linkText);
              }
            });

          // 如果没有链接，则从文本中提取（用斜杠分隔）
          if (value.length === 0) {
            const nextElement = $element.next();
            if (nextElement.length > 0) {
              const textContent = nextElement.text()?.trim();
              if (textContent) {
                // 处理用斜杠或逗号分隔的多值
                value = textContent
                  .split(/[\/,、]/)
                  .map((item) => item.trim())
                  .filter(Boolean);
              }
            }
          }
        } else if (
          key.includes('作者') ||
          key.includes('丛书') ||
          key.includes('出版社') ||
          key.includes('出品方')
        ) {
          // 这些字段取next().next()的内容
          const nextElement = $element.next();
          if (nextElement.length > 0) {
            const nextNextElement = nextElement.next();
            if (nextNextElement.length > 0) {
              value = nextNextElement.text()?.trim();
            }
          }
        } else {
          // 其他字段取next()的内容
          const nextElement = $element.next();
          if (nextElement.length > 0) {
            value = nextElement.text()?.trim();
          }
        }

        // 清理key并映射
        const cleanKey = this.mapInfoKey(key);
        if (cleanKey && value) {
          infoMap.set(cleanKey, value);
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to parse info section:', errorMessage);
    }

    return Object.fromEntries(infoMap);
  }

  /**
   * 映射info区域的key到标准字段名
   */
  private mapInfoKey(key: string): string | undefined {
    const keyMap = {
      作者: 'author',
      '出版社:': 'publisher',
      '原作名:': 'originalTitle',
      '出版年:': 'datePublished',
      '页数:': 'totalPage',
      '定价:': 'price',
      '装帧:': 'binding',
      '丛书:': 'series',
      'ISBN:': 'isbn',
      译者: 'translator',
      '副标题:': 'subTitle',
      '出品方:': 'producer',
      // 电影相关
      '导演:': 'director',
      '编剧:': 'writer',
      '主演:': 'actor',
      '类型:': 'genre',
      '制片国家/地区:': 'country',
      '语言:': 'language',
      '上映日期:': 'releaseDate',
      '片长:': 'duration',
      '集数:': 'episodes',
      '单集片长:': 'episodeDuration',
    };

    return keyMap[key];
  }

  /**
   * HTML解码
   */
  htmlDecode(str: string): string {
    const entityMap = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '=',
    };

    return str.replace(/&[#\w\d]+;/g, (entity) => {
      return entityMap[entity] || entity;
    });
  }
}
