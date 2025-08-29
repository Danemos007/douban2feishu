/**
 * 使用正式服务测试3部电影的抓取和同步
 * 验证智能延迟机制和字段解析逻辑
 */

import axios from 'axios'; // 仅用于飞书API调用
import * as fs from 'fs';
import { AntiSpiderService } from './douban/services/anti-spider.service';
import { CookieManagerService } from './douban/services/cookie-manager.service';
import { MovieScraperService } from './douban/services/movie-scraper.service';
import { HtmlParserService } from './douban/services/html-parser.service';
import { CryptoService } from './common/crypto/crypto.service';

// 飞书配置
const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_movie_table_id',
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

// 用户豆瓣Cookie (从CLAUDE.md配置)
const USER_COOKIE = 'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="your_user_id:example_secret"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y';

class OfficialMovieServiceTest {
  private movieScraperService: MovieScraperService;
  private accessToken = '';
  private successCount = 0;
  private failCount = 0;

  constructor() {
    // 构建完整的依赖链 (模拟NestJS的依赖注入)
    const cryptoService = new CryptoService();
    const cookieManager = new CookieManagerService(cryptoService);
    const antiSpiderService = new AntiSpiderService(cookieManager);
    const htmlParserService = new HtmlParserService();
    
    this.movieScraperService = new MovieScraperService(
      antiSpiderService,
      htmlParserService
    );
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

  async syncMovieToFeishu(movie: any): Promise<boolean> {
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

      console.log(`📝 准备同步《${movie.title}》- ${Object.keys(fields).length}个字段`);

      // 使用飞书API
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

  async runTest(): Promise<void> {
    try {
      console.log('🎬 使用正式服务测试前3部电影');
      console.log('🔧 验证智能延迟机制和字段解析逻辑');
      console.log('');

      // 读取缓存数据获取前3部电影的ID
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-your_user_id-2025-08-27T10-24-50.json';
      
      if (!fs.existsSync(cacheFile)) {
        throw new Error(`缓存文件不存在: ${cacheFile}`);
      }

      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const testMovieIds = ['26766869']; // 鹬 Piper - 关键测试用例
      
      console.log('📋 准备测试关键用例:');
      console.log('   1. 26766869 - 《鹬 Piper》- 验证"6分03秒"片长解析');

      // 获取访问令牌
      console.log('\n🔐 获取飞书访问令牌...');
      await this.getAccessToken();

      console.log('\n🚀 开始使用正式服务抓取和解析...');
      
      // 处理关键测试用例
      for (let i = 0; i < testMovieIds.length; i++) {
        const movieId = testMovieIds[i];
        console.log(`\n[${i + 1}/1] 处理关键测试用例: ${movieId}`);
        
        try {
          // 使用正式的MovieScraperService获取电影详情
          console.log('  🕷️ 使用AntiSpiderService智能延迟抓取...');
          const movieDetail = await this.movieScraperService.getMovieDetail(movieId, USER_COOKIE);
          
          console.log(`  📝 解析完成: 《${movieDetail.title}》`);
          console.log(`      片长: ${movieDetail.duration || '未获取'}`);
          console.log(`      上映日期: ${movieDetail.releaseDate || '未获取'}`);
          console.log(`      制片地区: ${movieDetail.country || '未获取'}`);
          console.log(`      语言: ${movieDetail.language || '未获取'}`);
          
          // 同步到飞书
          console.log('  📤 同步到飞书...');
          await this.syncMovieToFeishu(movieDetail);
          
        } catch (error: any) {
          console.error(`  💥 处理失败: ${error.message}`);
          this.failCount++;
        }
        
        // 添加间隔 (AntiSpiderService内部已有智能延迟，这里只是状态显示间隔)
        if (i < testMovieIds.length - 1) {
          console.log('  ⏳ 等待下一个...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 输出测试结果
      console.log('\n📊 测试结果统计:');
      console.log(`✅ 成功: ${this.successCount}/3`);
      console.log(`❌ 失败: ${this.failCount}/3`);
      console.log(`📈 成功率: ${((this.successCount / 3) * 100).toFixed(1)}%`);

      if (this.successCount === 3) {
        console.log('\n🎉 测试通过！智能延迟机制工作正常');
        console.log('🔧 正式服务的字段解析逻辑验证通过');
        console.log('🚀 可以进行全量36部电影测试了！');
      } else {
        console.log(`\n⚠️ 测试发现问题，需要检查失败原因`);
      }

    } catch (error: any) {
      console.error('💥 测试过程发生异常:', error.message);
    }
  }
}

// 运行测试
async function main() {
  const test = new OfficialMovieServiceTest();
  await test.runTest();
}

if (require.main === module) {
  main();
}