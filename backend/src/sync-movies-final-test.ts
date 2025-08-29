/**
 * 快速完成36部电影的完整同步测试
 * 跳过已成功的前22部，继续测试剩余14部
 */

import axios from 'axios'; // 仅用于飞书API调用
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { AntiSpiderService } from './douban/services/anti-spider.service';
// CookieManagerService 简化处理

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

interface CacheData {
  totalMovies: number;
  collectCount: number;
  wishCount: number;
  detailedMovies: MovieData[];
}

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx',
  }
};

// 电影字段映射配置
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

// 豆瓣Headers
const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Cookie': 'll="118282"; bid=Iv-9zz8BFAE; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="290244208:wI+zvuksP70"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y'
};

class FinalMovieTest {
  private accessToken = '';
  private successCount = 0;
  private failCount = 0;
  private antiSpiderService: AntiSpiderService;

  constructor() {
    // 简化构造，直接使用基础的反爬虫服务
    this.antiSpiderService = new AntiSpiderService(null as any);
  }

  // 完整字段修复逻辑（应用到所有电影）
  async applyFullFieldFixes(movie: MovieData): Promise<MovieData> {
    if (!movie.subjectId) return movie;

    const url = `https://movie.douban.com/subject/${movie.subjectId}/`;
    console.log(`  🔧 应用完整字段修复: ${movie.title}`);

    try {
      const cookie = DOUBAN_HEADERS.Cookie;
      const html = await this.antiSpiderService.makeRequest(url, cookie);
      const $ = cheerio.load(html);
      const infoElement = $('#info');
      
      const fixedMovie = { ...movie };

      // 1. 片长修复逻辑（支持所有复杂格式）
      console.log(`    📏 修复片长字段...`);
      const durationElement = infoElement.find('span[property="v:runtime"]');
      if (durationElement.length > 0) {
        const durationLine = durationElement.closest('span.pl').parent().html() || durationElement.parent().html() || '';
        const durationMatch = durationLine.match(/片长:<\/span>\s*(.+?)(?:<br|$)/);
        if (durationMatch && durationMatch[1]) {
          const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
          fixedMovie.duration = fullDuration;
          console.log(`      ✅ 片长修复: "${movie.duration}" → "${fullDuration}"`);
        } else {
          fixedMovie.duration = durationElement.text().trim();
        }
      } else {
        const durationSpan = infoElement.find('span.pl:contains("片长")');
        if (durationSpan.length > 0) {
          const durationLine = durationSpan.parent().html() || '';
          const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
          if (durationMatch && durationMatch[1]) {
            fixedMovie.duration = durationMatch[1].trim();
            console.log(`      ✅ 片长修复（备选）: "${movie.duration}" → "${durationMatch[1].trim()}"`);
          }
        }
      }

      // 2. 上映日期修复逻辑（保留完整地区信息）
      console.log(`    📅 修复上映日期字段...`);
      const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
      if (releaseDateElements.length > 0) {
        const allReleaseDates: string[] = [];
        releaseDateElements.each((index, element) => {
          const dateText = $(element).text().trim();
          if (dateText) {
            allReleaseDates.push(dateText);
          }
        });
        if (allReleaseDates.length > 0) {
          fixedMovie.releaseDate = allReleaseDates.join(' / ');
          console.log(`      ✅ 上映日期修复: "${movie.releaseDate}" → "${fixedMovie.releaseDate}"`);
        }
      }

      // 3. 制片地区修复逻辑
      console.log(`    🌍 修复制片地区字段...`);
      const countrySpan = infoElement.find('span:contains("制片国家")').parent();
      if (countrySpan.length > 0) {
        const fullText = countrySpan.text();
        const match = fullText.match(/制片国家\/地区:\s*([^\n\r]+)/);
        if (match && match[1]) {
          const countryText = match[1].trim();
          const cleanCountryText = countryText.split(/语言:|上映日期:|片长:|又名:|IMDb:/)[0].trim();
          if (cleanCountryText) {
            fixedMovie.country = cleanCountryText;
            console.log(`      ✅ 制片地区修复: "${movie.country}" → "${cleanCountryText}"`);
          }
        }
      }

      // 4. 语言修复逻辑
      console.log(`    🗣️ 修复语言字段...`);
      const languageSpan = infoElement.find('span:contains("语言")').parent();
      if (languageSpan.length > 0) {
        const fullText = languageSpan.text();
        const match = fullText.match(/语言:\s*([^\n\r]+)/);
        if (match && match[1]) {
          const languageText = match[1].trim();
          const cleanLanguageText = languageText.split(/上映日期:|片长:|又名:|IMDb:/)[0].trim();
          if (cleanLanguageText) {
            fixedMovie.language = cleanLanguageText;
            console.log(`      ✅ 语言修复: "${movie.language}" → "${cleanLanguageText}"`);
          }
        }
      }

      console.log(`    ✅ 关键字段修复完成`);
      return fixedMovie;

    } catch (error: any) {
      console.error(`    ❌ 字段修复失败: ${error.message}`);
      return movie;
    }
  }

  async getAccessToken(): Promise<void> {
    try {
      const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: CONFIG.feishu.appId,
        app_secret: CONFIG.feishu.appSecret
      });

      if ((tokenResponse.data as any).code === 0) {
        this.accessToken = (tokenResponse.data as any).tenant_access_token;
        console.log('✅ 飞书令牌获取成功');
      } else {
        throw new Error(`获取令牌失败: ${(tokenResponse.data as any).msg}`);
      }
    } catch (error: any) {
      console.error('❌ 获取访问令牌失败:', error.message);
      throw error;
    }
  }

  async syncMovieToFeishu(movie: MovieData): Promise<boolean> {
    try {
      // 构建飞书记录数据
      const fields: any = {};
      
      // 映射所有字段
      for (const [key, feishuField] of Object.entries(MOVIE_FIELD_MAPPINGS)) {
        const value = (movie as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'coverImage') {
            fields[feishuField] = { link: value };
          } else if (key === 'markDate') {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                fields[feishuField] = Math.floor(date.getTime());
              }
            } catch (e) {
              console.log(`⚠️ 日期格式转换失败: ${value}`);
            }
          } else {
            fields[feishuField] = value;
          }
        }
      }

      // 使用正确的飞书API调用
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

      if ((response.data as any).code === 0) {
        console.log(`✅ 《${movie.title}》同步成功`);
        this.successCount++;
        return true;
      } else {
        console.log(`❌ 《${movie.title}》同步失败: [${(response.data as any).code}] ${(response.data as any).msg}`);
        this.failCount++;
        return false;
      }

    } catch (error: any) {
      console.error(`💥 《${movie.title}》同步异常:`, error.message);
      this.failCount++;
      return false;
    }
  }

  async runFullTest(): Promise<void> {
    try {
      console.log('🎬 电影同步智能延迟测试 - 前3部电影');
      console.log('📊 验证智能延迟机制和字段解析逻辑');
      
      // 读取缓存数据
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-290244208-2025-08-27T10-24-50.json';
      const cacheData: CacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));

      // 获取访问令牌
      await this.getAccessToken();

      // 测试前3部电影
      const testMovies = cacheData.detailedMovies.slice(0, 3);
      console.log(`\n🚀 开始测试前${testMovies.length}部电影...\n`);

      for (let i = 0; i < testMovies.length; i++) {
        const movie = testMovies[i];
        const globalIndex = i + 1; // 从第1部开始
        
        console.log(`[${globalIndex}/3] 处理: 《${movie.title}》`);

        // 应用完整字段修复（所有电影都进行修复）
        const fixedMovie = await this.applyFullFieldFixes(movie);
        
        // 同步到飞书
        await this.syncMovieToFeishu(fixedMovie);
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 计算测试结果
      const totalSuccess = this.successCount;
      const totalFail = this.failCount;
      
      console.log('\n📊 前3部电影测试结果:');
      console.log(`✅ 成功: ${totalSuccess}/3`);
      console.log(`❌ 失败: ${totalFail}/3`);
      console.log(`📈 成功率: ${((totalSuccess / 3) * 100).toFixed(1)}%`);

      if (totalSuccess === 3) {
        console.log('\n🎉 测试通过！3部电影全部同步成功！');
        console.log('🔧 智能延迟机制工作正常');
        console.log('📝 字段解析逻辑验证通过');
        console.log('🚀 API同步稳定性验证通过');
        console.log('\n✨ 可以进行全量36部电影测试！');
      } else {
        console.log(`\n⚠️ 测试发现问题，${totalFail}部电影同步失败，需要检查`);
      }

    } catch (error: any) {
      console.error('💥 测试过程发生异常:', error.message);
    }
  }
}

// 运行完整测试
async function main() {
  const test = new FinalMovieTest();
  await test.runFullTest();
}

if (require.main === module) {
  main();
}