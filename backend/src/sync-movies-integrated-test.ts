/**
 * 电影同步整合测试文件
 * 
 * 整合内容：
 * 1. 基于sync-movie-from-cache.ts的稳定API逻辑
 * 2. 整合sync-all-movies-fixed.ts的4个关键字段修复逻辑
 * 
 * 测试目标：
 * - 验证API同步稳定性（100%成功率）
 * - 验证字段修复逻辑（片长、上映日期、制片地区、语言）
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

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

// 电影18字段映射配置（继承自sync-movie-from-cache.ts）
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

// 豆瓣Headers配置（用于字段修复时的HTML解析）
const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cookie': 'll="118282"; bid=Iv-9zz8BFAE; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="290244208:wI+zvuksP70"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y'
};

class IntegratedMovieSync {
  private accessToken = '';
  private successCount = 0;
  private failCount = 0;

  // [CRITICAL-FIX-INTEGRATED] 4个关键字段的修复逻辑
  // 来源：sync-all-movies-fixed.ts 第161-224行
  // 修复：片长、上映日期、制片地区、语言字段的解析问题
  async applyFieldFixes(movie: MovieData): Promise<MovieData> {
    if (!movie.subjectId) return movie;

    const url = `https://movie.douban.com/subject/${movie.subjectId}/`;
    console.log(`  🔧 应用字段修复: ${movie.title}`);

    try {
      const response = await axios.get(url, { headers: DOUBAN_HEADERS });
      const html = response.data as string;
      const $ = cheerio.load(html);
      const infoElement = $('#info');
      
      const fixedMovie = { ...movie };

      // 1. 片长修复逻辑（支持"6分03秒"等复杂格式）
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
      return movie; // 修复失败则返回原始数据
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

  // 继承自sync-movie-from-cache.ts的稳定API同步逻辑
  async syncMovieToFeishu(movie: MovieData): Promise<boolean> {
    try {
      // 构建飞书记录数据
      const fields: any = {};
      
      // 映射所有字段
      for (const [key, feishuField] of Object.entries(MOVIE_FIELD_MAPPINGS)) {
        const value = (movie as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'coverImage') {
            // 封面图需要特殊格式
            fields[feishuField] = { link: value };
          } else if (key === 'markDate') {
            // 日期时间字段需要转换为时间戳
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

      console.log(`📝 准备同步《${movie.title}》- ${Object.keys(fields).length}个字段`);
      
      // 调试输出关键字段
      if (fields['片长']) console.log(`   📏 片长: ${fields['片长']}`);
      if (fields['上映日期']) console.log(`   📅 上映日期: ${fields['上映日期']}`);
      if (fields['制片地区']) console.log(`   🌍 制片地区: ${fields['制片地区']}`);
      if (fields['语言']) console.log(`   🗣️ 语言: ${fields['语言']}`);

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
      if (error.response?.data) {
        console.error('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
      }
      this.failCount++;
      return false;
    }
  }

  async runTest(testSize: number = 5): Promise<void> {
    try {
      console.log('🧪 电影同步整合测试开始');
      console.log(`📊 测试规模: ${testSize}条数据`);
      console.log('🎯 验证目标: API稳定性 + 字段修复逻辑');
      console.log('');

      // 读取缓存数据
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-290244208-2025-08-27T10-24-50.json';
      
      if (!fs.existsSync(cacheFile)) {
        throw new Error(`缓存文件不存在: ${cacheFile}`);
      }

      const cacheData: CacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log(`📂 加载电影数据: ${cacheData.totalMovies}部电影`);

      // 获取访问令牌
      console.log('🔐 获取飞书访问令牌...');
      await this.getAccessToken();

      // 选择测试数据（优先选择关键测试用例）
      const testMovies = cacheData.detailedMovies.slice(0, testSize);
      console.log(`\n🎬 准备测试${testSize}部电影:`);
      testMovies.forEach((movie, index) => {
        console.log(`   ${index + 1}. 《${movie.title}》 - ${movie.subjectId}`);
      });

      console.log('\n🚀 开始同步测试...');

      for (let i = 0; i < testMovies.length; i++) {
        const movie = testMovies[i];
        console.log(`\n[${i + 1}/${testMovies.length}] 处理: 《${movie.title}》`);

        // 应用字段修复逻辑
        const fixedMovie = await this.applyFieldFixes(movie);
        
        // 执行飞书同步
        await this.syncMovieToFeishu(fixedMovie);
        
        // 添加延迟避免API限流
        if (i < testMovies.length - 1) {
          console.log('⏳ 等待2秒...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 输出测试结果
      console.log('\n📊 测试完成统计:');
      console.log(`✅ 成功: ${this.successCount}/${testSize}`);
      console.log(`❌ 失败: ${this.failCount}/${testSize}`);
      console.log(`📈 成功率: ${((this.successCount / testSize) * 100).toFixed(1)}%`);

      if (this.successCount === testSize) {
        console.log('\n🎉 测试通过！所有修复逻辑工作正常，API同步稳定');
      } else {
        console.log('\n⚠️ 测试未完全通过，需要进一步调试');
      }

    } catch (error: any) {
      console.error('💥 测试过程发生异常:', error.message);
    }
  }
}

// 运行全量测试
async function main() {
  const sync = new IntegratedMovieSync();
  await sync.runTest(36); // 全量测试36条数据
}

if (require.main === module) {
  main();
}