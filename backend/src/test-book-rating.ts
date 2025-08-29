/**
 * 书籍"我的评分"字段解析测试
 * 专门测试"读过"书籍的前5本是否能成功解析到"我的评分"
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface BookRatingTest {
  subjectId: string;
  title: string;
  myRating?: number;
  myTags?: string;
  myComment?: string;
  markDate?: string;
  ratingSource: 'listPage' | 'detailPage' | 'both' | 'none';
}

class BookRatingTester {
  private requestCount = 0;

  async makeRequest(url: string, cookie: string): Promise<string> {
    await this.delay();
    
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    console.log(`[请求] ${url}`);
    const response = await axios.get(url, { headers, timeout: 30000 });
    const html = response.data as string;
    
    if (html.includes('<title>禁止访问</title>')) {
      throw new Error('遇到人机验证，请检查Cookie');
    }

    console.log(`[成功] 获取到 ${html.length} 字符`);
    return html;
  }

  private async delay(): Promise<void> {
    this.requestCount++;
    const delay = 4000 + Math.random() * 4000;
    console.log(`[延迟] ${Math.round(delay / 1000)} 秒`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  parseBookListPage(html: string): any[] {
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('.item-show').each((index, element) => {
      if (index >= 5) return false; // 只取前5本
      
      const $element = $(element);
      
      const linkElement = $element.find('div.title > a');
      const title = linkElement.text().trim();
      const url = linkElement.attr('href');
      
      if (!url || !title) return;

      const idMatch = url.match(/(\d+)/);
      if (!idMatch) return;

      const id = idMatch[0];
      const dateElement = $element.find('div.date');
      const dateText = dateElement.text().trim();

      // 从列表页提取用户字段
      const gridId = `grid${id}`;
      const gridElement = $(`#${gridId}`);
      
      let myTags = '';
      let myComment = '';
      let listPageRating: number | undefined;

      console.log(`\n🔍 分析《${title}》(ID: ${id}) 的列表页数据...`);

      // 标签
      const tagsElement = gridElement.find('span.tags');
      if (tagsElement.length > 0) {
        let tagsText = tagsElement.text().trim();
        if (tagsText.includes('标签:')) {
          tagsText = tagsText.replace('标签:', '').trim();
        }
        myTags = tagsText;
        console.log(`   🏷️ 列表页标签: ${myTags}`);
      }

      // 评分 - 关键测试点（修复选择器位置）
      console.log(`   🔍 查找评分元素...`);
      const ratingElement = $element.find('div.date span[class*="rating"][class$="-t"]');
      console.log(`   🔍 找到评分元素数量: ${ratingElement.length}`);
      
      if (ratingElement.length > 0) {
        const ratingClass = ratingElement.attr('class') || '';
        console.log(`   🔍 评分CSS类: "${ratingClass}"`);
        
        const ratingMatch = ratingClass.match(/rating(\d+)-t/);
        if (ratingMatch) {
          const rating = parseInt(ratingMatch[1], 10);
          if (rating >= 1 && rating <= 5) {
            listPageRating = rating;
            console.log(`   ⭐ 列表页评分解析成功: ${rating}星`);
          } else {
            console.log(`   ⚠️ 评分超出范围: ${rating}`);
          }
        } else {
          console.log(`   ⚠️ 评分正则匹配失败`);
        }
      } else {
        console.log(`   ❌ 未找到评分元素`);
      }

      // 备注
      const commentElement = gridElement.find('div.comment');
      if (commentElement.length > 0) {
        const commentText = commentElement.text().trim();
        if (commentText && commentText.length > 0) {
          myComment = commentText;
          console.log(`   💬 列表页备注: ${myComment}`);
        }
      }

      items.push({
        id,
        title,
        url,
        dateText,
        myTags,
        myComment,
        listPageRating
      });
    });

    return items;
  }

  parseBookDetail(html: string, bookId: string, basicInfo: any): BookRatingTest {
    const $ = cheerio.load(html);
    
    const book: BookRatingTest = {
      subjectId: bookId,
      title: basicInfo.title,
      myTags: basicInfo.myTags,
      myComment: basicInfo.myComment,
      markDate: basicInfo.dateText,
      ratingSource: 'none'
    };

    console.log(`\n🔍 分析详情页的"我的评分"...`);

    let detailPageRating: number | undefined;

    try {
      // 详情页评分解析 - 使用书籍代码的逻辑
      const myRatingInput = $('input#n_rating');
      console.log(`   🔍 找到评分输入框数量: ${myRatingInput.length}`);
      
      if (myRatingInput.length > 0) {
        const ratingValue = myRatingInput.val();
        console.log(`   🔍 评分输入框值: "${ratingValue}"`);
        
        if (ratingValue && ratingValue !== '') {
          const myRatingNum = parseInt(ratingValue.toString(), 10);
          if (!isNaN(myRatingNum) && myRatingNum >= 1 && myRatingNum <= 5) {
            detailPageRating = myRatingNum;
            console.log(`   ⭐ 详情页评分解析成功: ${myRatingNum}星`);
          } else {
            console.log(`   ⚠️ 详情页评分超出范围: ${myRatingNum}`);
          }
        } else {
          console.log(`   ❌ 评分输入框值为空`);
        }
      } else {
        console.log(`   ❌ 未找到评分输入框`);
      }

    } catch (error) {
      console.log(`   💥 详情页评分解析异常: ${error}`);
    }

    // 确定最终评分和来源
    if (basicInfo.listPageRating && detailPageRating) {
      book.myRating = basicInfo.listPageRating; // 优先使用列表页
      book.ratingSource = 'both';
      console.log(`   ✅ 两种方式都获取到评分，使用列表页评分: ${book.myRating}星`);
    } else if (basicInfo.listPageRating) {
      book.myRating = basicInfo.listPageRating;
      book.ratingSource = 'listPage';
      console.log(`   ✅ 仅列表页获取到评分: ${book.myRating}星`);
    } else if (detailPageRating) {
      book.myRating = detailPageRating;
      book.ratingSource = 'detailPage';
      console.log(`   ✅ 仅详情页获取到评分: ${book.myRating}星`);
    } else {
      book.ratingSource = 'none';
      console.log(`   ❌ 两种方式都未获取到评分`);
    }

    return book;
  }
}

async function testBookRatingParsing() {
  console.log('=== 书籍"我的评分"字段解析测试 ===');
  console.log('目标：测试"读过"书籍前5本的评分解析是否正常');
  console.log('');

  const cookie = process.argv[2] || '';
  const userId = process.argv[3] || 'your_user_id';

  if (!cookie) {
    console.error('使用方法: npx ts-node src/test-book-rating.ts "你的Cookie" "你的用户ID"');
    return;
  }

  const tester = new BookRatingTester();
  const testResults: BookRatingTest[] = [];

  try {
    // 1. 抓取读过的书籍列表页
    console.log('📚 第1步：抓取读过的书籍列表页...');
    const collectUrl = `https://book.douban.com/people/${userId}/collect?start=0&sort=time&rating=all&filter=all&mode=list`;
    const collectHtml = await tester.makeRequest(collectUrl, cookie);
    const bookList = tester.parseBookListPage(collectHtml);
    
    console.log(`✅ 找到 ${bookList.length} 本读过的书籍（前5本）`);

    // 2. 逐个获取详情页并解析评分
    console.log('\n📖 第2步：逐个解析书籍详情和评分...');
    
    for (let i = 0; i < bookList.length; i++) {
      const bookItem = bookList[i];
      console.log(`\n[${i + 1}/5] ========== 《${bookItem.title}》 ==========`);
      
      try {
        const detailUrl = `https://book.douban.com/subject/${bookItem.id}/`;
        const detailHtml = await tester.makeRequest(detailUrl, cookie);
        
        const bookResult = tester.parseBookDetail(detailHtml, bookItem.id, bookItem);
        testResults.push(bookResult);
        
      } catch (error: any) {
        console.log(`❌ 解析失败: ${error.message}`);
        testResults.push({
          subjectId: bookItem.id,
          title: bookItem.title,
          ratingSource: 'none'
        });
      }
    }

    // 3. 汇总测试结果
    console.log('\n=== 测试结果汇总 ===');
    
    let successCount = 0;
    let listPageCount = 0;
    let detailPageCount = 0;
    let bothCount = 0;
    let failCount = 0;

    testResults.forEach((book, index) => {
      console.log(`\n📖 [${index + 1}] 《${book.title}》:`);
      console.log(`   📋 Subject ID: ${book.subjectId}`);
      
      if (book.myRating) {
        console.log(`   ⭐ 我的评分: ${book.myRating}星 (来源: ${book.ratingSource})`);
        successCount++;
        
        switch (book.ratingSource) {
          case 'listPage': listPageCount++; break;
          case 'detailPage': detailPageCount++; break;
          case 'both': bothCount++; break;
        }
      } else {
        console.log(`   ❌ 我的评分: 解析失败`);
        failCount++;
      }
      
      if (book.myTags) console.log(`   🏷️ 我的标签: ${book.myTags}`);
      if (book.myComment) console.log(`   💬 我的备注: ${book.myComment}`);
    });

    console.log(`\n📊 统计结果:`);
    console.log(`✅ 评分解析成功: ${successCount}/5 本 (${(successCount/5*100).toFixed(1)}%)`);
    console.log(`❌ 评分解析失败: ${failCount}/5 本`);
    console.log(`\n📍 评分来源分布:`);
    console.log(`   📄 仅列表页: ${listPageCount} 本`);
    console.log(`   📖 仅详情页: ${detailPageCount} 本`);
    console.log(`   📋 两种都有: ${bothCount} 本`);

    // 4. 结论
    console.log(`\n🎯 测试结论:`);
    if (successCount >= 3) {
      console.log('✅ 书籍"我的评分"解析: 基本正常');
    } else {
      console.log('❌ 书籍"我的评分"解析: 存在问题，需要修复');
    }

    // 5. 为后续写入飞书做准备，保存测试结果
    (global as any).bookRatingTestResults = testResults.filter(book => book.myRating); // 只保存有评分的
    console.log(`\n💾 已保存${(global as any).bookRatingTestResults.length}本有效书籍数据，供后续写入飞书使用`);
    
  } catch (error: any) {
    console.error('💥 测试失败:', error.message);
  }
}

if (require.main === module) {
  testBookRatingParsing();
}