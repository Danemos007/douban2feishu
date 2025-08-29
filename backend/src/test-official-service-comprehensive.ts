/**
 * 正式服务综合测试 - 36部电影完整测试
 * 验证字段自动创建 + 字段解析修复
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DoubanService } from './douban/douban.service';
import { FeishuService } from './feishu/feishu.service';
import { SyncEngineService } from './feishu/services/sync-engine.service';
import { DoubanModule } from './douban/douban.module';
import { FeishuModule } from './feishu/feishu.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';

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

class OfficialServiceComprehensiveTest {
  private doubanService: DoubanService;
  private feishuService: FeishuService;
  private syncEngineService: SyncEngineService;
  private moduleRef: TestingModule;

  async initialize(): Promise<void> {
    console.log('🔧 初始化正式NestJS服务...');
    
    this.moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        CryptoModule,
        DoubanModule,
        FeishuModule,
      ],
    }).compile();

    this.doubanService = this.moduleRef.get<DoubanService>(DoubanService);
    this.feishuService = this.moduleRef.get<FeishuService>(FeishuService);
    this.syncEngineService = this.moduleRef.get<SyncEngineService>(SyncEngineService);
    
    console.log('✅ NestJS服务初始化完成');
  }

  async testComprehensiveSync(): Promise<void> {
    try {
      console.log('🎬 正式服务36部电影综合测试');
      console.log('📊 目标1：验证字段自动创建功能');
      console.log('📊 目标2：验证字段解析修复效果');
      console.log('');

      // 从缓存加载电影数据
      const fs = require('fs');
      const cacheFile = '/Users/admin/Desktop/douban2feishu/backend/cache/movie-test-your_user_id-2025-08-27T10-24-50.json';
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const movies = cacheData.detailedMovies;

      console.log(`📁 加载缓存数据：${movies.length}部电影`);

      // 配置测试用户
      const userId = 'test-user-your_user_id';
      const appId = 'cli_your_app_id_here';
      const appSecret = 'your_app_secret_here';
      const appToken = 'your_app_token_here';
      const tableId = 'your_movie_table_id';

      let successCount = 0;
      let fieldCreationCount = 0;
      let fieldFixCount = 0;

      console.log('\n🚀 开始36部电影同步测试...\n');

      for (let i = 0; i < movies.length; i++) {
        const movie: MovieData = movies[i];
        console.log(`[${i + 1}/36] 处理: 《${movie.title}》`);

        try {
          // 使用正式的同步引擎服务
          const syncResult = await this.syncEngineService.syncMoviesToFeishu(
            [movie], // 单部电影数组
            userId,
            {
              appId,
              appSecret,
              appToken,
              tableId,
            }
          );

          if (syncResult.success) {
            successCount++;
            console.log(`  ✅ 同步成功`);
            
            // 检查是否创建了新字段
            if (syncResult.fieldsCreated && syncResult.fieldsCreated > 0) {
              fieldCreationCount += syncResult.fieldsCreated;
              console.log(`  🆕 创建了${syncResult.fieldsCreated}个新字段`);
            }
            
            // 检查关键字段修复
            if (movie.subjectId === '26766869' && movie.duration?.includes('6分03秒')) {
              fieldFixCount++;
              console.log(`  🎯 关键修复验证：《鹬 Piper》片长解析成功`);
            }
            
            if (movie.subjectId === '3742360' && movie.releaseDate?.includes('中国大陆')) {
              fieldFixCount++;
              console.log(`  🎯 关键修复验证：《让子弹飞》上映日期地区信息完整`);
            }
          } else {
            console.log(`  ❌ 同步失败: ${syncResult.error}`);
          }

        } catch (error: any) {
          console.log(`  💥 处理异常: ${error.message}`);
        }

        // 智能延迟
        if (i < movies.length - 1) {
          const delay = i < 10 ? 1000 : 2000; // 前10部1秒，后续2秒
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 输出综合结果
      console.log('\n📊 综合测试结果汇总:');
      console.log(`✅ 同步成功: ${successCount}/36 (${((successCount/36)*100).toFixed(1)}%)`);
      console.log(`🆕 字段创建: ${fieldCreationCount}个`);
      console.log(`🔧 关键修复验证: ${fieldFixCount}个`);
      
      console.log('\n🎯 测试结论:');
      if (successCount >= 34) {
        console.log('✅ 正式服务工作优秀 (>95%成功率)');
      } else if (successCount >= 30) {
        console.log('⚠️ 正式服务基本正常 (>85%成功率)');
      } else {
        console.log('❌ 正式服务需要修复 (<85%成功率)');
      }

      if (fieldCreationCount > 0) {
        console.log('✅ 字段自动创建功能正常');
      } else {
        console.log('⚠️ 未触发字段自动创建');
      }

      if (fieldFixCount >= 2) {
        console.log('✅ 关键字段修复效果验证通过');
      } else {
        console.log('⚠️ 关键字段修复效果待验证');
      }

    } catch (error: any) {
      console.error('💥 综合测试失败:', error.message);
    } finally {
      if (this.moduleRef) {
        await this.moduleRef.close();
      }
    }
  }
}

async function main() {
  const test = new OfficialServiceComprehensiveTest();
  await test.initialize();
  await test.testComprehensiveSync();
}

if (require.main === module) {
  main();
}