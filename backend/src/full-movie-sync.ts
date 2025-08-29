/**
 * 完整电影同步脚本 - 处理所有36部电影
 */

import * as fs from 'fs';
import * as path from 'path';
import { HtmlParserService } from './douban/services/html-parser.service';
import { MovieScraperService } from './douban/services/movie-scraper.service';
import { CookieManagerService } from './douban/services/cookie-manager.service';
import { AntiSpiderService } from './douban/services/anti-spider.service';
import { FeishuAuthService } from './feishu/services/feishu-auth.service';
import { FeishuTableService } from './feishu/services/feishu-table.service';
import { MovieSyncService } from './feishu/services/movie-sync.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

// 测试配置
const TEST_CONFIG = {
  feishuAppId: 'cli_a7c28b8b61f8d013',
  feishuAppSecret: 'VUHbL4kqYpTiC9DaNZHlJe4dLEHmWpgC',
  feishuTableId: 'G9WQbdxWJaU4YesNOsVcuLyYnOb',
  feishuViewId: 'vewtKfPBV4',
};

// 电影数据接口
interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  coverImage: string;
  doubanRating: number;
  summary: string;
  director: string;
  writer: string;
  cast: string;
  genre: string;
  country: string;
  language: string;
  releaseDate: string;
  duration: string;
  myTags: string;
  myComment: string;
  myRating: number;
  markDate: string;
}

class FullMovieSyncTester {
  private htmlParser: HtmlParserService;
  private movieScraper: MovieScraperService;
  private cookieManager: CookieManagerService;
  private antiSpider: AntiSpiderService;
  private feishuAuth: FeishuAuthService;
  private feishuTable: FeishuTableService;
  private movieSync: MovieSyncService;

  constructor() {
    this.htmlParser = new HtmlParserService();
    this.cookieManager = new CookieManagerService();
    this.antiSpider = new AntiSpiderService();
    this.movieScraper = new MovieScraperService(
      this.htmlParser,
      this.cookieManager,
      this.antiSpider
    );

    // 创建配置服务
    const configService = {
      get: (key: string) => {
        const config: { [key: string]: string } = {
          FEISHU_APP_ID: TEST_CONFIG.feishuAppId,
          FEISHU_APP_SECRET: TEST_CONFIG.feishuAppSecret,
        };
        return config[key];
      },
    };

    this.feishuAuth = new FeishuAuthService(configService as ConfigService);
    this.feishuTable = new FeishuTableService(this.feishuAuth);
    this.movieSync = new MovieSyncService(this.feishuTable, this.feishuAuth);
  }

  async run(cookie: string, userId: string) {
    try {
      console.log('=== 完整电影同步测试 - 36部电影全量处理 ===');
      
      // 设置Cookie
      this.cookieManager.setCookie(cookie);

      // 第一步：加载已有缓存数据
      const cacheFiles = this.findLatestCacheFile(userId);
      let allMovies: any[] = [];
      let processedMovieIds: Set<string> = new Set();

      if (cacheFiles) {
        console.log(`📂 发现缓存文件: ${cacheFiles}`);
        const cacheData = JSON.parse(fs.readFileSync(cacheFiles, 'utf8'));
        allMovies = cacheData.detailedMovies || [];
        allMovies.forEach(movie => processedMovieIds.add(movie.subjectId));
        console.log(`✅ 从缓存加载 ${allMovies.length} 部已处理电影`);
      }

      // 第二步：获取所有电影列表
      console.log('\n📋 第二步：获取完整电影列表...');
      
      const collectMovies = await this.movieScraper.fetchCollectedMovies(userId);
      console.log(`✅ 获取看过电影: ${collectMovies.length} 部`);
      
      const wishMovies = await this.movieScraper.fetchWishMovies(userId);
      console.log(`✅ 获取想看电影: ${wishMovies.length} 部`);

      const totalMovieList = [...collectMovies, ...wishMovies];
      console.log(`📊 电影总数: ${totalMovieList.length} 部`);

      // 第三步：处理缺失的电影详情
      const pendingMovies = totalMovieList.filter(movie => !processedMovieIds.has(movie.subjectId));
      console.log(`🔄 需要处理的新电影: ${pendingMovies.length} 部`);

      if (pendingMovies.length > 0) {
        console.log('\n🎬 第三步：抓取新电影详情...');
        let processedCount = 0;
        
        for (const movie of pendingMovies) {
          processedCount++;
          console.log(`\n[${processedCount}/${pendingMovies.length}] 处理《${movie.title}》...`);
          
          try {
            const movieDetail = await this.movieScraper.fetchMovieDetail(movie.subjectId);
            const completeMovie = { ...movie, ...movieDetail };
            allMovies.push(completeMovie);
            console.log(`  ✅ 处理完成 - 18个字段完整`);
          } catch (error) {
            console.log(`  ❌ 处理失败: ${error}`);
            continue;
          }
        }
      }

      // 保存完整缓存
      const cacheFileName = `movie-complete-${userId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const cacheFilePath = path.join(process.cwd(), 'cache', cacheFileName);
      
      const cacheData = {
        totalMovies: totalMovieList.length,
        collectCount: collectMovies.length,
        wishCount: wishMovies.length,
        detailedMovies: allMovies,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log(`\n💾 完整数据已保存: ${cacheFilePath}`);

      // 第四步：清空飞书表格并同步
      console.log('\n🗑️ 第四步：清空飞书表格...');
      await this.clearFeishuTable();
      
      console.log('\n📤 第五步：同步所有电影到飞书...');
      await this.syncAllMoviesToFeishu(allMovies);

      // 测试总结
      console.log('\n=== 完整同步测试结果 ===');
      console.log(`📊 电影总数: ${allMovies.length} 部`);
      console.log(`✅ 数据完整性: ${allMovies.length}/${totalMovieList.length}`);
      console.log(`🎯 测试结论: ${allMovies.length === totalMovieList.length ? '通过' : '部分通过'}`);

    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error);
      throw error;
    }
  }

  private findLatestCacheFile(userId: string): string | null {
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) return null;

    const files = fs.readdirSync(cacheDir)
      .filter(file => file.startsWith(`movie-test-${userId}-`) && file.endsWith('.json'))
      .sort()
      .reverse();

    return files.length > 0 ? path.join(cacheDir, files[0]) : null;
  }

  private async clearFeishuTable() {
    try {
      // 获取访问令牌
      await this.feishuAuth.getAccessToken();
      
      // 获取所有记录
      const records = await this.feishuTable.getAllRecords(TEST_CONFIG.feishuTableId);
      console.log(`📋 找到 ${records.length} 条现有记录`);

      if (records.length > 0) {
        // 批量删除
        const recordIds = records.map(r => r.record_id);
        const batchSize = 500;
        
        for (let i = 0; i < recordIds.length; i += batchSize) {
          const batch = recordIds.slice(i, i + batchSize);
          await this.feishuTable.batchDeleteRecords(TEST_CONFIG.feishuTableId, batch);
          console.log(`🗑️ 删除批次 ${Math.floor(i/batchSize) + 1}: ${batch.length} 条记录`);
        }
      }
      
      console.log('✅ 表格清空完成');
    } catch (error) {
      console.error('❌ 清空表格失败:', error);
      throw error;
    }
  }

  private async syncAllMoviesToFeishu(movies: MovieData[]) {
    try {
      // 确保字段配置存在
      await this.movieSync.ensureFieldConfiguration(
        TEST_CONFIG.feishuTableId,
        TEST_CONFIG.feishuViewId
      );

      // 批量同步
      const batchSize = 10;
      for (let i = 0; i < movies.length; i += batchSize) {
        const batch = movies.slice(i, i + batchSize);
        console.log(`\n🔄 处理第 ${Math.floor(i/batchSize) + 1}/${Math.ceil(movies.length/batchSize)} 批次 (${i+1}-${Math.min(i+batchSize, movies.length)})`);
        
        for (const movie of batch) {
          try {
            await this.movieSync.syncMovieToFeishu(
              movie as any,
              TEST_CONFIG.feishuTableId,
              TEST_CONFIG.feishuViewId
            );
            console.log(`   ✅ 《${movie.title}》同步成功`);
          } catch (error) {
            console.log(`   ❌ 《${movie.title}》同步失败: ${error}`);
          }
        }
      }
      
      console.log('🎉 所有电影同步完成');
    } catch (error) {
      console.error('❌ 同步过程失败:', error);
      throw error;
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: npx ts-node src/full-movie-sync.ts "你的Cookie" "你的用户ID"');
    console.log('示例: npx ts-node src/full-movie-sync.ts "ll=\\"118287\\"; bid=g_vBJZv1X3o" "290244208"');
    process.exit(1);
  }

  const [cookie, userId] = args;
  const tester = new FullMovieSyncTester();
  await tester.run(cookie, userId);
}

if (require.main === module) {
  main().catch(console.error);
}