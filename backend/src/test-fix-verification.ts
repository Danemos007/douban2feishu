/**
 * 验证片长修复效果 - 重新抓取《鹬 Piper》和《初恋这件小事》
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// 测试配置
const TEST_CONFIG = {
  feishuAppId: 'cli_a7c28b8b61f8d013',
  feishuAppSecret: 'VUHbL4kqYpTiC9DaNZHlJe4dLEHmWpgC',
  feishuTableId: 'G9WQbdxWJaU4YesNOsVcuLyYnOb',
  feishuViewId: 'vewtKfPBV4',
};

const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cookie': process.argv[2] || ''
};

// 电影数据接口
interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  coverImage?: string;
  doubanRating?: number;
  summary?: string;
  director?: string;
  writer?: string;
  cast?: string;
  genre?: string;
  country?: string;
  language?: string;
  releaseDate?: string;
  duration?: string;
  myTags?: string;
  myComment?: string;
  myRating?: number;
  markDate?: string;
}

class FixVerificationTester {
  async run(cookie: string, userId: string) {
    try {
      console.log('=== 片长修复效果验证测试 ===');
      console.log('🎯 目标：重新抓取《鹬 Piper》和《初恋这件小事》验证修复效果\n');

      // 测试电影信息
      const testMovies = [
        {
          subjectId: '26766869',
          title: '鹬 Piper',
          myStatus: '看过',
          myRating: 5,
          myTags: '温情',
          myComment: '无',
          expectedDuration: '6分03秒'
        },
        {
          subjectId: '4739952', 
          title: '初恋这件小事',
          myStatus: '看过',
          myRating: 4,
          myTags: '无',
          myComment: '无',
          expectedDuration: '118分钟(泰国) / 100分钟(中国大陆)'
        }
      ];

      const results: any[] = [];

      for (let i = 0; i < testMovies.length; i++) {
        const testMovie = testMovies[i];
        console.log(`\n[${i + 1}/${testMovies.length}] 🎬 重新抓取《${testMovie.title}》...`);

        try {
          // 添加请求延迟
          if (i > 0) {
            console.log('[延迟] 5 秒');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          const url = `https://movie.douban.com/subject/${testMovie.subjectId}/`;
          console.log(`[请求] ${url}`);

          const response = await axios.get(url, { headers: { ...DOUBAN_HEADERS, Cookie: cookie } });
          const html = response.data as string;
          console.log(`[成功] 获取到 ${html.length} 字符`);

          // 解析电影详情
          const movieData = await this.parseMovieDetail(html, testMovie.subjectId, testMovie as any);
          
          console.log(`  📝 标题: ${movieData.title}`);
          console.log(`  🎬 类型: ${movieData.genre || '无'}`);
          console.log(`  📽️ 分类: ${movieData.type}`);
          console.log(`  ⭐ 豆瓣评分: ${movieData.doubanRating || '无'}`);
          console.log(`  👤 我的评分: ${movieData.myRating || '无'}`);
          console.log(`  🏷️ 我的标签: ${movieData.myTags || '无'}`);
          console.log(`  💬 我的备注: ${movieData.myComment || '无'}`);
          console.log(`  ⏱️ 片长: ${movieData.duration || '无'}`);
          console.log(`  📅 上映日期: ${movieData.releaseDate || '无'}`);
          
          // 验证片长修复效果
          const durationFixed = movieData.duration === testMovie.expectedDuration;
          console.log(`  🔧 片长修复: ${durationFixed ? '✅ 成功' : '❌ 失败'}`);
          if (!durationFixed) {
            console.log(`     期望: ${testMovie.expectedDuration}`);
            console.log(`     实际: ${movieData.duration || '无'}`);
          }

          results.push({
            ...movieData,
            expectedDuration: testMovie.expectedDuration,
            durationFixed
          });

        } catch (error) {
          console.log(`  ❌ 抓取失败: ${error}`);
          continue;
        }
      }

      // 保存结果
      const resultPath = path.join(process.cwd(), 'cache', `fix-verification-${userId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
      fs.writeFileSync(resultPath, JSON.stringify({
        testDate: new Date().toISOString(),
        userId,
        movies: results,
        summary: {
          total: results.length,
          fixed: results.filter(m => m.durationFixed).length
        }
      }, null, 2), 'utf8');

      console.log(`\n💾 测试结果已保存: ${resultPath}`);

      // 同步到飞书
      console.log('\n📤 开始同步到飞书多维表格...');
      await this.syncToFeishu(results);

      // 总结
      const fixedCount = results.filter(m => m.durationFixed).length;
      console.log(`\n=== 修复效果验证结果 ===`);
      console.log(`📊 总测试电影: ${results.length} 部`);
      console.log(`✅ 修复成功: ${fixedCount} 部`);
      console.log(`❌ 修复失败: ${results.length - fixedCount} 部`);
      console.log(`🎯 修复成功率: ${Math.round(fixedCount / results.length * 100)}%`);

    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error);
      throw error;
    }
  }

  private async parseMovieDetail(html: string, movieId: string, basicInfo: any): Promise<MovieData> {
    const $ = cheerio.load(html);
    const movie: MovieData = {
      subjectId: movieId,
      title: basicInfo.title || '',
      myStatus: basicInfo.myStatus || '',
      type: 'movie'
    };

    try {
      const infoElement = $('#info');

      // 1. 基本信息
      const titleElement = $('h1 span[property="v:itemreviewed"]');
      if (titleElement.length > 0) {
        movie.title = titleElement.text().trim();
      }

      // 2. 评分
      const ratingElement = $('strong.rating_num');
      if (ratingElement.length > 0) {
        movie.doubanRating = parseFloat(ratingElement.text().trim());
      }

      // 3. 封面图
      const posterElement = $('#mainpic img');
      if (posterElement.length > 0) {
        movie.coverImage = posterElement.attr('src') || '';
      }

      // 4. 剧情简介
      const summaryElements = $('span[property="v:summary"]');
      if (summaryElements.length > 0) {
        movie.summary = summaryElements.text().replace(/\s+/g, ' ').trim();
      }

      // 5. 详细信息解析
      if (infoElement.length > 0) {
        // 导演
        const directorElements = infoElement.find('a[rel="v:directedBy"]');
        if (directorElements.length > 0) {
          movie.director = directorElements.map((_, el) => $(el).text().trim()).get().join(', ');
        }

        // 编剧
        const writerSpan = infoElement.find('span.pl:contains("编剧")').parent();
        if (writerSpan.length > 0) {
          const writerLinks = writerSpan.find('a');
          if (writerLinks.length > 0) {
            movie.writer = writerLinks.map((_, el) => $(el).text().trim()).get().join(', ');
          }
        }

        // 主演
        const castElements = infoElement.find('a[rel="v:starring"]');
        if (castElements.length > 0) {
          movie.cast = castElements.map((_, el) => $(el).text().trim()).get().join(', ');
        }

        // 类型
        const genreElements = infoElement.find('span[property="v:genre"]');
        if (genreElements.length > 0) {
          movie.genre = genreElements.map((_, el) => $(el).text().trim()).get().join('/');
        }

        // 制片地区
        const countrySpan = infoElement.find('span.pl:contains("制片国家/地区")').parent();
        if (countrySpan.length > 0) {
          const countryText = countrySpan.text().replace(/制片国家\/地区:\s*/, '');
          const cleanCountryText = countryText.split(/语言:|上映日期:|片长:|又名:|IMDb:/)[0].trim();
          if (cleanCountryText) {
            movie.country = cleanCountryText;
          }
        }

        // 语言
        const languageSpan = infoElement.find('span.pl:contains("语言")').parent();
        if (languageSpan.length > 0) {
          const languageText = languageSpan.text().replace(/语言:\s*/, '');
          const cleanLanguageText = languageText.split(/上映日期:|片长:|又名:|IMDb:/)[0].trim();
          if (cleanLanguageText) {
            movie.language = cleanLanguageText;
          }
        }

        // 上映日期
        const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
        if (releaseDateElements.length > 0) {
          const firstReleaseDate = releaseDateElements.first().text().trim();
          const dateText = firstReleaseDate.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateText) {
            movie.releaseDate = dateText[1];
          }
        }

        // 片长 - 使用修复后的逻辑
        const durationElement = infoElement.find('span[property="v:runtime"]');
        if (durationElement.length > 0) {
          // 获取包含片长信息的完整行，可能有多个版本如 "118分钟(泰国) / 100分钟(中国大陆)"
          const durationLine = durationElement.closest('span.pl').parent().html() || durationElement.parent().html() || '';
          const durationMatch = durationLine.match(/片长:<\/span>\s*(.+?)(?:<br|$)/);
          if (durationMatch && durationMatch[1]) {
            // 清理HTML标签，保留完整的片长信息
            const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
            movie.duration = fullDuration;
          } else {
            // 如果正则匹配失败，使用原来的方法作为备选
            movie.duration = durationElement.text().trim();
          }
        } else {
          // 尝试从一般信息中查找片长
          const durationSpan = infoElement.find('span.pl:contains("片长")');
          if (durationSpan.length > 0) {
            // 获取片长标签后面的内容
            const durationLine = durationSpan.parent().html() || '';
            // 提取 <span class="pl">片长:</span> 后面的内容
            const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
            if (durationMatch && durationMatch[1]) {
              movie.duration = durationMatch[1].trim();
            }
          }
        }
      }

      // 6. 用户字段（从基本信息传入）
      if (basicInfo.myTags) movie.myTags = basicInfo.myTags;
      if (basicInfo.myComment) movie.myComment = basicInfo.myComment;
      if (basicInfo.myRating) movie.myRating = basicInfo.myRating;
      movie.markDate = new Date().toISOString().slice(0, 10);

    } catch (error) {
      console.warn(`解析电影 ${movieId} 详情失败:`, error);
    }

    return movie;
  }

  private async syncToFeishu(movies: any[]) {
    try {
      // 获取飞书访问令牌
      console.log('🔑 获取飞书访问令牌...');
      const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
        app_id: TEST_CONFIG.feishuAppId,
        app_secret: TEST_CONFIG.feishuAppSecret
      });

      const accessToken = (tokenResponse.data as any).tenant_access_token;
      console.log('✅ 飞书令牌获取成功');

      // 同步每部电影
      for (const movie of movies) {
        console.log(`\n📝 同步《${movie.title}》到飞书...`);
        
        // 查找现有记录
        const searchResponse = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${TEST_CONFIG.feishuTableId}/tables/${TEST_CONFIG.feishuViewId}/records/search`, {
          filter: {
            conditions: [{
              field_name: 'Subject ID',
              operator: 'is',
              value: [movie.subjectId]
            }],
            conjunction: 'and'
          }
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const existingRecords = (searchResponse.data as any)?.data?.items || [];
        
        // 准备同步数据
        const syncData = {
          'Subject ID': movie.subjectId,
          '电影名': movie.title,
          '我的状态': movie.myStatus,
          '类型': movie.genre || '',
          '片长': movie.duration || '',
          '豆瓣评分': movie.doubanRating || 0,
          '我的评分': movie.myRating || 0,
          '我的标签': movie.myTags || '',
          '我的备注': movie.myComment || '',
          '上映日期': movie.releaseDate ? new Date(movie.releaseDate).getTime() : null,
          '导演': movie.director || '',
          '主演': movie.cast || '',
          '制片地区': movie.country || '',
          '语言': movie.language || '',
          '封面图': movie.coverImage ? { link: movie.coverImage } : null,
          '剧情简介': movie.summary || '',
          '标记日期': movie.markDate ? new Date(movie.markDate).getTime() : null
        };

        if (existingRecords.length > 0) {
          // 更新现有记录
          const recordId = existingRecords[0].record_id;
          await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${TEST_CONFIG.feishuTableId}/tables/${TEST_CONFIG.feishuViewId}/records/${recordId}`, {
            fields: syncData
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`   ✅ 《${movie.title}》更新成功 - 片长: ${movie.duration || '无'}`);
        } else {
          // 创建新记录
          await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${TEST_CONFIG.feishuTableId}/tables/${TEST_CONFIG.feishuViewId}/records`, {
            fields: syncData
          }, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`   ✅ 《${movie.title}》创建成功 - 片长: ${movie.duration || '无'}`);
        }

        // 批次间延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('\n🎉 所有电影同步完成！');
    } catch (error) {
      console.error('❌ 同步到飞书失败:', (error as any).response?.data || (error as any).message);
      throw error;
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: npx ts-node src/test-fix-verification.ts "你的Cookie" "你的用户ID"');
    console.log('示例: npx ts-node src/test-fix-verification.ts "ll=\\"118287\\"; bid=g_vBJZv1X3o" "290244208"');
    process.exit(1);
  }

  const [cookie, userId] = args;
  const tester = new FixVerificationTester();
  await tester.run(cookie, userId);
}

if (require.main === module) {
  main().catch(console.error);
}