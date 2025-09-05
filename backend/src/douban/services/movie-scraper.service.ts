/**
 * 豆瓣电影数据抓取服务
 *
 * 支持电影、电视剧、纪录片的智能分类识别和数据抓取
 */

import { Injectable, Logger } from '@nestjs/common';
import { AntiSpiderService } from './anti-spider.service';
import { HtmlParserService } from './html-parser.service';
import * as cheerio from 'cheerio';

export interface MovieData {
  // 基础信息
  subjectId: string;
  title: string;
  subtitle?: string;
  originalTitle?: string;

  // 豆瓣数据
  doubanRating?: number;
  image?: string;
  description?: string;

  // 影片信息
  director: string[];
  writer: string[];
  cast: string[];
  genre: string[];
  country: string[];
  language: string[];
  releaseYear?: string;
  releaseDate?: string; // 上映日期/首播日期
  duration?: string; // 片长/单集片长
  episodes?: string; // 集数（电视剧/纪录片特有）

  // 用户数据
  myRating?: number;
  myTags: string[];
  myStatus?: string;
  myComment?: string;
  markDate?: Date;

  // 分类信息
  type: 'movie' | 'tv' | 'documentary';
}

@Injectable()
export class MovieScraperService {
  private readonly logger = new Logger(MovieScraperService.name);

  constructor(
    private readonly antiSpiderService: AntiSpiderService,
    private readonly htmlParserService: HtmlParserService,
  ) {}

  /**
   * 获取用户的电影列表数据
   */
  async getUserMovieList(
    userId: string,
    cookie: string,
    page = 0,
    status: 'collect' | 'wish' | 'do' = 'collect',
  ): Promise<{ items: any[]; total: number }> {
    const url = `https://movie.douban.com/people/${userId}/${status}?start=${page * 30}&sort=time&rating=all&filter=all&mode=list`;

    try {
      const html = await this.antiSpiderService.makeRequest(url, cookie);
      return this.parseMovieListPage(html);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`获取电影列表失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 获取用户的完整电影列表数据 (支持分页)
   */
  async getAllUserMovies(
    userId: string,
    cookie: string,
    status: 'collect' | 'wish' | 'do' = 'collect',
    limit = 1000,
  ): Promise<any[]> {
    const allMovies: any[] = [];
    let start = 0;

    while (allMovies.length < limit) {
      const url = `https://movie.douban.com/people/${userId}/${status}?start=${start}&sort=time&rating=all&filter=all&mode=list&type=movie`;

      try {
        this.logger.debug(`请求第${Math.floor(start / 30) + 1}页: ${url}`);
        const html = await this.antiSpiderService.makeRequest(url, cookie);

        // 检查反爬虫
        if (html.includes('禁止访问') || html.includes('检测到有异常请求')) {
          this.logger.warn('被反爬虫系统拦截');
          break;
        }

        const result = this.parseMovieListPage(html);

        if (result.items.length === 0) {
          this.logger.debug('没有更多电影数据');
          break;
        }

        this.logger.debug(
          `第${Math.floor(start / 30) + 1}页: 找到${result.items.length}部电影`,
        );
        allMovies.push(...result.items);

        start += result.items.length; // 智能递增

        // 如果本页少于30部，说明是最后一页
        if (result.items.length < 30) {
          break;
        }

        if (allMovies.length >= limit) {
          break;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `第${Math.floor(start / 30) + 1}页抓取失败: ${errorMessage}`,
        );
        break;
      }
    }

    return allMovies.slice(0, limit);
  }

  /**
   * 获取单个电影的详细信息
   */
  async getMovieDetail(movieId: string, cookie: string): Promise<MovieData> {
    const url = `https://movie.douban.com/subject/${movieId}/`;

    try {
      const html = await this.antiSpiderService.makeRequest(url, cookie);
      return this.parseMovieDetail(html, movieId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`获取电影详情失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 解析电影列表页
   */
  private parseMovieListPage(html: string): { items: any[]; total: number } {
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
        dateText,
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
   * 解析电影详情页
   */
  private parseMovieDetail(html: string, movieId: string): MovieData {
    const $ = cheerio.load(html);

    // 1. 解析结构化数据
    const structuredData = this.htmlParserService.parseStructuredData($ as any);

    // 2. 解析基本信息
    const basicInfo = this.parseMovieBasicInfo($);

    // 3. 解析用户状态
    const userState = this.htmlParserService.parseUserState($ as any);

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
      releaseDate: detailInfo.releaseDate, // 完整上映/首播日期
      duration: detailInfo.duration,
      episodes: detailInfo.episodes, // 集数（电视剧/纪录片特有）

      myRating: userState.rating,
      myTags: userState.tags || [],
      myStatus: userState.state,
      myComment: userState.comment,
      markDate: userState.markDate,

      type: movieType,
    };
  }

  /**
   * 解析电影基本信息
   */
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
      this.logger.warn('解析电影基本信息失败:', error);
    }

    return result;
  }

  /**
   * 解析电影详细信息
   */
  private parseMovieDetailInfo($: cheerio.Root): any {
    const result: any = {
      director: [],
      writer: [],
      cast: [],
      genre: [],
      country: [],
      language: [],
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
      const countrySpan = infoElement
        .find('span:contains("制片国家")')
        .parent();
      if (countrySpan.length > 0) {
        // 获取整行文本，然后提取制片地区信息
        const fullText = countrySpan.text();
        const match = fullText.match(/制片国家\/地区:\s*([^\n\r]+)/);
        if (match && match[1]) {
          const countryText = match[1].trim();
          // 去除可能的后续内容（遇到下一个字段标签就截断）
          const cleanCountryText = countryText
            .split(/语言:|上映日期:|首播日期:|片长:|又名:|IMDb:/)[0]
            .trim();
          if (cleanCountryText) {
            result.country = cleanCountryText
              .split('/')
              .map((c) => c.trim())
              .filter((c) => c);
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
          const cleanLanguageText = languageText
            .split(/上映日期:|首播日期:|片长:|又名:|IMDb:/)[0]
            .trim();
          if (cleanLanguageText) {
            result.language = cleanLanguageText
              .split('/')
              .map((l) => l.trim())
              .filter((l) => l);
          }
        }
      }

      // [CRITICAL-FIX] 上映日期解析修复 - 保留完整地区信息和多地区支持 - 2025-08-28
      // 原因：原逻辑故意去除地区信息，且只取第一个日期，丢失重要信息
      // 修复：保留完整地区信息，支持多地区上映日期
      const releaseDateElements = infoElement.find(
        'span[property="v:initialReleaseDate"]',
      );
      if (releaseDateElements.length > 0) {
        const allReleaseDates: string[] = [];
        let firstYear: string = '';

        releaseDateElements.each((index, element) => {
          const dateText = $(element).text().trim();
          if (dateText) {
            allReleaseDates.push(dateText);
            // 提取第一个日期的年份
            if (!firstYear) {
              const yearMatch = dateText.match(/(\d{4})/);
              if (yearMatch) {
                firstYear = yearMatch[1];
              }
            }
          }
        });

        if (allReleaseDates.length > 0) {
          // 保留完整的多地区上映信息
          result.releaseDate = allReleaseDates.join(' / ');
          result.releaseYear = firstYear;
        }
      } else {
        // 电视剧可能使用首播日期
        const firstAirSpan = infoElement.find('span:contains("首播")').parent();
        if (firstAirSpan.length > 0) {
          const firstAirText = firstAirSpan.text().replace(/首播:\s*/, '');
          if (firstAirText) {
            // 保留完整首播信息（可能也包含地区）
            result.releaseDate = firstAirText.trim();
            // 提取年份
            const yearMatch = firstAirText.match(/(\d{4})/);
            if (yearMatch) {
              result.releaseYear = yearMatch[1];
            }
          }
        }
      }

      // [CRITICAL-FIX] 片长解析修复 - 支持复杂格式如"6分03秒" - 2025-08-28
      // 原因：豆瓣使用复杂HTML结构存储片长信息，简单text()无法处理
      // 修复：使用HTML内容解析 + 正则匹配，支持所有格式
      const durationElement = infoElement.find('span[property="v:runtime"]');
      if (durationElement.length > 0) {
        // 尝试复杂HTML结构解析
        const durationLine =
          durationElement.closest('span.pl').parent().html() ||
          durationElement.parent().html() ||
          '';
        const durationMatch = durationLine.match(
          /片长:<\/span>\s*(.+?)(?:<br|$)/,
        );
        if (durationMatch && durationMatch[1]) {
          const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
          result.duration = fullDuration;
        } else {
          // 降级到简单文本解析
          result.duration = durationElement.text().trim();
        }
      } else {
        // 备选方案：查找不带property属性的片长信息
        const durationSpan = infoElement.find('span.pl:contains("片长")');
        if (durationSpan.length > 0) {
          const durationLine = durationSpan.parent().html() || '';
          const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
          if (durationMatch && durationMatch[1]) {
            result.duration = durationMatch[1].trim();
          }
        } else {
          // 电视剧可能使用单集片长
          const singleEpisodeDurationSpan = infoElement
            .find('span:contains("单集片长")')
            .parent();
          if (singleEpisodeDurationSpan.length > 0) {
            const singleDurationText = singleEpisodeDurationSpan
              .text()
              .replace(/单集片长:\s*/, '');
            if (singleDurationText) {
              result.duration = singleDurationText.trim();
            }
          }
        }
      }

      // 集数（电视剧/纪录片特有）
      const episodeSpan = infoElement.find('span:contains("集数")').parent();
      if (episodeSpan.length > 0) {
        const episodeText = episodeSpan.text().replace(/集数:\s*/, '');
        if (episodeText) {
          result.episodes = episodeText.trim();
        }
      }

      // 原名
      const originalTitleSpan = infoElement
        .find('span:contains("又名")')
        .parent();
      if (originalTitleSpan.length > 0) {
        const originalTitle = originalTitleSpan.text().replace(/又名:\s*/, '');
        if (originalTitle) {
          result.originalTitle = originalTitle.split('/')[0].trim();
        }
      }
    } catch (error) {
      this.logger.warn('解析电影详细信息失败:', error);
    }

    return result;
  }

  /**
   * 智能分类识别：电影/电视剧/纪录片
   */
  private classifyMovieType(
    genres: string[],
    detailInfo?: any,
  ): 'movie' | 'tv' | 'documentary' {
    const genreStr = genres.join(' ').toLowerCase();

    // 优先识别纪录片
    if (genreStr.includes('纪录片') || genreStr.includes('documentary')) {
      return 'documentary';
    }

    // 通过集数信息识别电视剧（这是最可靠的方法）
    if (detailInfo) {
      const infoStr = JSON.stringify(detailInfo).toLowerCase();

      // 查找集数关键词
      if (
        infoStr.includes('集数:') ||
        infoStr.includes('首播:') ||
        infoStr.includes('单集片长:') ||
        infoStr.match(/\d+集/)
      ) {
        return 'tv';
      }

      // 通过片长判断（电视剧通常有多集，时长较短）
      if (detailInfo.duration) {
        const durationStr = detailInfo.duration.toLowerCase();
        if (durationStr.includes('分钟/集') || durationStr.includes('集')) {
          return 'tv';
        }
      }
    }

    // 识别电视剧的关键词
    const tvKeywords = [
      '电视剧',
      'tv',
      'series',
      '剧集',
      '连续剧',
      '情景喜剧',
      '肥皂剧',
      '迷你剧',
      '网剧',
    ];

    for (const keyword of tvKeywords) {
      if (genreStr.includes(keyword)) {
        return 'tv';
      }
    }

    // 默认为电影
    return 'movie';
  }

  /**
   * 根据类型获取对应的字段映射
   */
  getFieldMapping(type: 'movie' | 'tv' | 'documentary'): string[] {
    const baseFields = [
      'Subject ID',
      '我的标签',
      '我的状态',
      '类型',
      '片名',
      '封面图',
      '豆瓣评分',
      '我的备注',
      '剧情简介',
      '我的评分',
      '主演',
      '导演',
      '编剧',
      '制片地区',
      '语言',
      '标记日期',
    ];

    switch (type) {
      case 'movie':
        // 电影：18个字段
        return [...baseFields, '片长', '上映日期'];

      case 'tv':
        // 电视剧：19个字段（比电影多1个字段）
        return [...baseFields, '单集片长', '集数', '首播日期'];

      case 'documentary':
        // 纪录片：19个字段（与电视剧相同）
        return [...baseFields, '单集片长', '集数', '首播日期'];

      default:
        return baseFields;
    }
  }
}
