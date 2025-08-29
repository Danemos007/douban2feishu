/**
 * 生产就绪的真实豆瓣数据同步 - 避免复杂依赖
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tables: {
      books: 'tblgm24SCh26ZJ0o',
      movies: 'tblj9s2409ur7Rrx',
      documentary: 'tblfv50T41rm6ihv',
      tv: 'tblLO7EWUWOExQ7P'
    }
  }
};

// 反爬虫延迟配置
const ANTI_SPIDER = {
  baseDelay: 4000,    // 基础延迟4秒
  randomDelay: 4000,  // 随机延迟0-4秒
};

// 完整字段映射 - 所有19个字段（暂时排除封面图以避免URL错误）
const FIELD_MAPPINGS = {
  books: {
    'subjectId': 'Subject ID',
    'title': '书名',
    'subtitle': '副标题',
    'author': '作者',
    'translator': '译者',
    'publisher': '出版社',
    'publishYear': '出版年份',
    'isbn': 'ISBN',
    'pages': '页数',
    'price': '价格',
    'doubanRating': '豆瓣评分',
    'myRating': '我的评分',
    'myStatus': '我的状态',
    'myTags': '我的标签',
    'myComment': '我的备注',
    'summary': '内容简介',
    'originalTitle': '原作名'
    // 暂时注释：'cover': '封面图', 'markDate': '标记日期'
  }
};

interface DoubanBook {
  subjectId: string;
  title: string;
  subtitle?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  publishYear?: string;
  isbn?: string;
  pages?: string;
  price?: string;
  doubanRating?: number;
  myRating?: number;
  myStatus?: string;
  myTags?: string;
  myComment?: string;
  summary?: string;
  cover?: string;
  originalTitle?: string;
  markDate?: string;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取随机延迟时间
 */
function getRandomDelay(): number {
  return ANTI_SPIDER.baseDelay + Math.random() * ANTI_SPIDER.randomDelay;
}

/**
 * 获取书籍详细信息
 */
async function getBookDetails(subjectId: string, cookie: string): Promise<Partial<DoubanBook>> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      'Cookie': cookie,
      'Referer': 'https://book.douban.com/',
    };

    const url = `https://book.douban.com/subject/${subjectId}/`;
    console.log(`   🔍 获取详情: ${subjectId}`);
    
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data as string);

    const details: Partial<DoubanBook> = {};

    // 提取详细信息 - 使用正则表达式解析
    const infoText = $('#info').text();
    
    console.log(`   🔍 调试info内容: ${infoText.replace(/\s+/g, ' ').substring(0, 300)}...`);
    
    // 使用正则表达式精确提取字段值
    const patterns = {
      author: /作者:\s*([^\n]+?)(?=\s*(?:译者|出版社|原作名|出版年|页数|定价|装帧|丛书|ISBN|$))/,
      translator: /译者:\s*([^\n]+?)(?=\s*(?:出版社|原作名|出版年|页数|定价|装帧|丛书|ISBN|$))/,
      publisher: /出版社:\s*([^\n]+?)(?=\s*(?:原作名|出版年|页数|定价|装帧|丛书|ISBN|$))/,
      publishYear: /出版年:\s*([^\n]+?)(?=\s*(?:页数|定价|装帧|丛书|ISBN|$))/,
      pages: /页数:\s*([^\n]+?)(?=\s*(?:定价|装帧|丛书|ISBN|$))/,
      price: /定价:\s*([^\n]+?)(?=\s*(?:装帧|丛书|ISBN|$))/,
      isbn: /ISBN:\s*([^\n]+?)(?=\s*$)/,
      originalTitle: /原作名:\s*([^\n]+?)(?=\s*(?:译者|出版年|页数|定价|装帧|丛书|ISBN|$))/,
      subtitle: /副标题:\s*([^\n]+?)(?=\s*(?:作者|译者|出版社|原作名|出版年|页数|定价|装帧|丛书|ISBN|$))/
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = infoText.match(pattern);
      if (match) {
        const value = match[1].trim();
        console.log(`   📊 提取${key}: "${value}"`);
        (details as any)[key] = value;
      }
    });

    // 内容简介
    const summaryElement = $('.intro .all');
    if (summaryElement.length === 0) {
      // 如果没有展开的简介，获取默认的简介
      const defaultSummary = $('.intro').first().text().trim();
      if (defaultSummary && !defaultSummary.includes('展开全部')) {
        details.summary = defaultSummary;
      }
    } else {
      details.summary = summaryElement.text().trim();
    }

    return details;

  } catch (error: any) {
    console.log(`   ❌ 获取详情失败 ${subjectId}:`, error.message);
    return {};
  }
}

/**
 * 获取飞书访问令牌
 */
async function getFeishuAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });

  if ((response.data as any).code !== 0) {
    throw new Error(`飞书令牌获取失败: ${(response.data as any).msg}`);
  }

  return (response.data as any).tenant_access_token;
}

/**
 * 抓取豆瓣书籍数据
 */
async function fetchDoubanBooks(cookie: string, userId: string, limit: number = 10): Promise<DoubanBook[]> {
  console.log(`📚 开始抓取用户 ${userId} 的豆瓣读书数据...`);
  
  const books: DoubanBook[] = [];
  let start = 0;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    'Cookie': cookie,
    'Referer': 'https://book.douban.com/',
  };

  while (books.length < limit) {
    try {
      const url = `https://book.douban.com/people/${userId}/collect?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
      console.log(`🔍 请求: ${url}`);
      
      const response = await axios.get(url, { headers });
      
      // 检查是否被反爬虫拦截
      if ((response.data as string).includes('禁止访问') || (response.data as string).includes('检测到有异常请求')) {
        console.log('❌ 被反爬虫系统拦截，请检查Cookie是否有效');
        break;
      }

      const $ = cheerio.load(response.data as string);
      const bookItems = $('.subject-item');
      
      if (bookItems.length === 0) {
        console.log('📖 没有更多书籍数据');
        break;
      }

      console.log(`📖 找到 ${bookItems.length} 本书籍`);

      for (let i = 0; i < bookItems.length && books.length < limit; i++) {
        try {
          const element = bookItems[i];
          const $item = $(element);
          const titleLink = $item.find('h2 a');
          const href = titleLink.attr('href') || '';
          const subjectId = href.match(/\/(\d+)\//)?.[1] || '';
          
          if (!subjectId) continue;

          const book: DoubanBook = {
            subjectId,
            title: titleLink.attr('title') || titleLink.text().trim(),
            cover: $item.find('.pic img').attr('src'),
          };

          // 获取豆瓣评分 - 尝试多个选择器
          const ratingText1 = $item.find('.rating_nums').text();
          const ratingText2 = $item.find('.star .rating_nums').text(); 
          const ratingText3 = $item.find('.pubdate .rating_nums').text();
          
          if (ratingText1) {
            book.doubanRating = parseFloat(ratingText1);
          } else if (ratingText2) {
            book.doubanRating = parseFloat(ratingText2);
          } else if (ratingText3) {
            book.doubanRating = parseFloat(ratingText3);
          }
          
          console.log(`   🔍 调试评分: rating1="${ratingText1}", rating2="${ratingText2}", rating3="${ratingText3}"`);

          // 提取我的评分
          const myRatingStars = $item.find('.myshort .rating_stars');
          if (myRatingStars.length > 0) {
            const ratingClass = myRatingStars.attr('class') || '';
            const ratingMatch = ratingClass.match(/rating(\d+)-t/);
            if (ratingMatch) {
              book.myRating = parseInt(ratingMatch[1]);
            }
          }

          // 正确提取我的备注 - 尝试多个选择器
          const commentElement1 = $item.find('.comment.comment-item');
          const commentElement2 = $item.find('p.comment');
          const commentElement3 = $item.find('.short-note .comment');
          
          if (commentElement1.length > 0) {
            book.myComment = commentElement1.text().trim();
          } else if (commentElement2.length > 0) {
            book.myComment = commentElement2.text().trim();
          } else if (commentElement3.length > 0) {
            book.myComment = commentElement3.text().trim();
          }
          
          // 如果备注为空，从短评中提取（排除标签和状态信息）
          if (!book.myComment) {
            const shortNote = $item.find('.short-note').text();
            // 简单清理，移除明显的标签和状态信息
            const cleanComment = shortNote
              .replace(/标签:[^]*$/, '') // 移除标签部分
              .replace(/读过|想读|在读/, '') // 移除状态
              .replace(/\d{4}-\d{2}-\d{2}/, '') // 移除日期
              .replace(/修改|删除/, '') // 移除操作按钮
              .trim();
            if (cleanComment && cleanComment.length > 5) {
              book.myComment = cleanComment;
            }
          }

          // 提取标签
          const tagsElement = $item.find('.short-note .tags');
          if (tagsElement.length > 0) {
            book.myTags = tagsElement.text().replace('标签:', '').trim();
          }

          // 从URL判断状态
          if (url.includes('/collect')) {
            book.myStatus = '读过';
          } else if (url.includes('/wish')) {
            book.myStatus = '想读';
          } else if (url.includes('/do')) {
            book.myStatus = '在读';
          }

          // 获取书籍详细信息
          console.log(`📖 解析成功: 《${book.title}》`);
          const bookDetails = await getBookDetails(book.subjectId, cookie);
          
          // 合并详细信息
          Object.assign(book, bookDetails);
          
          books.push(book);
          
          // 调试：显示获取到的书籍数据
          console.log(`   Subject ID: ${book.subjectId}`);
          if (book.author) console.log(`   👤 作者: ${book.author}`);
          if (book.publisher) console.log(`   🏢 出版社: ${book.publisher}`);
          if (book.publishYear) console.log(`   📅 出版年份: ${book.publishYear}`);
          if (book.doubanRating) console.log(`   ⭐ 豆瓣评分: ${book.doubanRating}`);
          if (book.myRating) console.log(`   ⭐ 我的评分: ${book.myRating}`);
          if (book.myComment) console.log(`   💬 我的备注: ${book.myComment}`);
          if (book.myTags) console.log(`   🏷️ 我的标签: ${book.myTags}`);
          if (book.cover) console.log(`   🖼️ 封面: ${book.cover.substring(0, 50)}...`);
          if (book.subtitle) console.log(`   📝 副标题: ${book.subtitle}`);
          if (book.originalTitle) console.log(`   🌐 原作名: ${book.originalTitle}`);
          if (book.summary) console.log(`   📋 简介: ${book.summary.substring(0, 30)}...`);
          if (book.isbn) console.log(`   📚 ISBN: ${book.isbn}`);
          if (book.pages) console.log(`   📄 页数: ${book.pages}`);
          
          // 详情页反爬虫延迟
          await delay(getRandomDelay());
          
        } catch (error) {
          console.log('⚠️ 解析单本书籍失败:', error);
        }
      }

      start += bookItems.length;
      
      // 反爬虫延迟
      const delayTime = getRandomDelay();
      console.log(`⏳ 反爬虫延迟 ${Math.round(delayTime/1000)}秒...`);
      await delay(delayTime);

    } catch (error: any) {
      console.log('❌ 抓取失败:', error.message);
      break;
    }
  }

  return books.slice(0, limit);
}

/**
 * 同步书籍数据到飞书表格
 */
async function syncBooksToFeishu(books: DoubanBook[], accessToken: string): Promise<void> {
  console.log(`\n📊 开始同步 ${books.length} 本书籍到飞书表格...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const book of books) {
    try {
      // 构建字段数据
      const recordFields: any = {};
      
      Object.entries(FIELD_MAPPINGS.books).forEach(([doubanKey, feishuFieldName]) => {
        const value = (book as any)[doubanKey];
        if (value !== undefined && value !== null && value !== '') {
          // 数值字段
          if (doubanKey.includes('Rating')) {
            recordFields[feishuFieldName] = Number(value);
          } 
          // 普通文本字段
          else {
            recordFields[feishuFieldName] = String(value);
          }
        }
      });

      const record = { fields: recordFields };

      // 写入飞书
      const writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.books}/records`,
        record,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((writeResponse.data as any).code === 0) {
        console.log(`✅ 《${book.title}》同步成功`);
        successCount++;
      } else {
        console.log(`❌ 《${book.title}》同步失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
        failCount++;
      }

      // API限制延迟
      await delay(1000);

    } catch (error: any) {
      console.log(`❌ 《${book.title}》同步异常: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 同步完成: ✅${successCount} ❌${failCount}`);
}

/**
 * 主函数
 */
async function main() {
  const userCookie = 'll="118282"; bid=Iv-9zz8BFAE; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="290244208:wI+zvuksP70"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y';
  const userId = '290244208';
  const limit = 5; // 测试5本书，验证所有字段正确同步

  console.log('🚀 生产就绪的豆瓣飞书同步');
  console.log('=========================');
  console.log(`👤 用户ID: ${userId}`);
  console.log(`📖 同步数量: ${limit}本书籍`);
  console.log('');

  try {
    // Step 1: 获取飞书访问令牌
    console.log('🔑 获取飞书访问令牌...');
    const accessToken = await getFeishuAccessToken();
    console.log('✅ 飞书令牌获取成功');

    // Step 2: 抓取豆瓣数据
    const books = await fetchDoubanBooks(userCookie, userId, limit);
    console.log(`✅ 成功抓取 ${books.length} 本书籍数据`);

    if (books.length === 0) {
      console.log('❌ 没有获取到书籍数据，请检查Cookie和用户ID');
      return;
    }

    // Step 3: 同步到飞书
    await syncBooksToFeishu(books, accessToken);

    console.log('\n🎉 同步任务完成!');
    console.log('📊 请检查飞书表格确认数据写入情况');

  } catch (error: any) {
    console.error('💥 同步失败:', error.message);
    if (error.response?.data) {
      console.error('详细错误:', error.response.data);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}