/**
 * 鲁棒的豆瓣数据同步 - 修复所有已知问题
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblgm24SCh26ZJ0o'
  }
};

const ANTI_SPIDER = {
  baseDelay: 4000,
  randomDelay: 4000,
};

// 完整字段映射 - 包含所有字段
const FIELD_MAPPINGS = {
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
  'cover': '封面图',
  'originalTitle': '原作名',
  'markDate': '标记日期'
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(): number {
  return ANTI_SPIDER.baseDelay + Math.random() * ANTI_SPIDER.randomDelay;
}

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
 * 鲁棒的书籍详情获取 - 使用DOM解析而非正则表达式
 */
async function getBookDetailsRobust(subjectId: string, cookie: string): Promise<Partial<DoubanBook>> {
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

    // 方法1: 使用更鲁棒的DOM选择器解析info区域
    console.log(`   📊 使用DOM解析方法提取字段...`);
    
    // 直接解析info区域的每一行
    $('#info').find('span.pl').each((index, element) => {
      const $span = $(element);
      const label = $span.text().trim().replace(':', '');
      
      let value = '';
      
      // 处理不同的值获取方式
      if ($span.next().is('a')) {
        // 如果下一个元素是链接
        value = $span.next().text().trim();
      } else {
        // 获取span后面的文本内容（去除换行和多余空格）
        const nextText = $span.get(0).nextSibling;
        if (nextText && nextText.nodeType === 3) { // 文本节点
          value = nextText.nodeValue?.trim() || '';
        }
      }
      
      // 如果上述方法没获取到值，尝试从父元素获取
      if (!value) {
        const parentText = $span.parent().text();
        const afterLabel = parentText.split(label + ':')[1];
        if (afterLabel) {
          value = afterLabel.split(/\n|作者|译者|出版社|出版年|页数|定价|装帧|丛书|ISBN/)[0].trim();
        }
      }
      
      if (value && value.length > 0) {
        console.log(`   📝 提取: ${label} = "${value}"`);
        
        // 映射到对象字段
        if (label.includes('作者')) details.author = value;
        else if (label.includes('译者')) details.translator = value;
        else if (label.includes('出版社')) details.publisher = value;
        else if (label.includes('出版年')) details.publishYear = value;
        else if (label.includes('页数')) details.pages = value;
        else if (label.includes('定价')) details.price = value;
        else if (label.includes('ISBN')) details.isbn = value;
        else if (label.includes('副标题')) details.subtitle = value;
        else if (label.includes('原作名')) details.originalTitle = value;
      }
    });

    // 方法2: 备用的文本解析方法
    if (!details.author || !details.publisher) {
      console.log(`   🔄 使用备用文本解析方法...`);
      
      const infoText = $('#info').text().replace(/\s+/g, ' ');
      console.log(`   📄 Info文本: ${infoText.substring(0, 200)}...`);
      
      // 更精确的正则表达式匹配
      if (!details.author) {
        const authorMatch = infoText.match(/作者[：:\s]*([^译出页定装丛I\n]+)/);
        if (authorMatch) {
          details.author = authorMatch[1].trim();
          console.log(`   📝 备用提取作者: "${details.author}"`);
        }
      }
      
      if (!details.publisher) {
        const publisherMatch = infoText.match(/出版社[：:\s]*([^原译出页定装丛I\n]+)/);
        if (publisherMatch) {
          details.publisher = publisherMatch[1].trim();
          console.log(`   📝 备用提取出版社: "${details.publisher}"`);
        }
      }
    }

    // 获取内容简介 - 改进的方法
    let summary = '';
    const introAll = $('.intro .all');
    const introDefault = $('.intro');
    
    if (introAll.length > 0) {
      summary = introAll.first().text().trim();
    } else if (introDefault.length > 0) {
      const introText = introDefault.first().text().trim();
      if (!introText.includes('展开全部')) {
        summary = introText;
      }
    }
    
    if (summary && summary.length > 10) {
      details.summary = summary.substring(0, 300); // 限制长度
      console.log(`   📋 提取简介: "${details.summary.substring(0, 50)}..."`);
    }

    return details;

  } catch (error: any) {
    console.log(`   ❌ 获取详情失败 ${subjectId}:`, error.message);
    return {};
  }
}

/**
 * 改进的豆瓣列表页数据抓取
 */
async function fetchDoubanBooksRobust(cookie: string, userId: string, limit: number = 5): Promise<DoubanBook[]> {
  console.log(`📚 开始抓取用户 ${userId} 的豆瓣读书数据 (改进版)...`);
  
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
      
      if ((response.data as string).includes('禁止访问') || (response.data as string).includes('检测到有异常请求')) {
        console.log('❌ 被反爬虫系统拦截');
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
          
          // 基础信息提取
          const titleLink = $item.find('h2 a');
          const href = titleLink.attr('href') || '';
          const subjectId = href.match(/\/(\d+)\//)?.[1] || '';
          
          if (!subjectId) continue;

          const book: DoubanBook = {
            subjectId,
            title: titleLink.attr('title') || titleLink.text().trim(),
          };

          // 封面图
          const coverImg = $item.find('.pic img');
          if (coverImg.length > 0) {
            book.cover = coverImg.attr('src');
            console.log(`   🖼️ 封面: ${book.cover?.substring(0, 50)}...`);
          }

          // 豆瓣评分 - 改进的获取方法
          const ratingSpan = $item.find('.rating_nums');
          if (ratingSpan.length > 0 && ratingSpan.text().trim()) {
            book.doubanRating = parseFloat(ratingSpan.text().trim());
            console.log(`   ⭐ 豆瓣评分: ${book.doubanRating}`);
          }

          // 我的评分 - 改进的获取方法  
          const myRatingElement = $item.find('[class*="rating"][class*="-t"]');
          if (myRatingElement.length > 0) {
            const ratingClass = myRatingElement.attr('class') || '';
            const ratingMatch = ratingClass.match(/rating(\d)(?:0)?-t/);
            if (ratingMatch) {
              book.myRating = parseInt(ratingMatch[1]);
              console.log(`   ⭐ 我的评分: ${book.myRating}星`);
            }
          }

          // 我的备注 - 多种方法尝试
          const shortNoteElement = $item.find('.short-note');
          if (shortNoteElement.length > 0) {
            // 尝试提取纯评论内容，排除其他信息
            let comment = '';
            
            // 方法1: 查找comment类
            const commentElement = shortNoteElement.find('.comment');
            if (commentElement.length > 0) {
              comment = commentElement.text().trim();
            }
            
            // 方法2: 如果没找到，从整个短评中提取
            if (!comment) {
              const fullText = shortNoteElement.text();
              // 简单清理：移除明显的标签和状态信息
              comment = fullText
                .replace(/\d{4}-\d{2}-\d{2}/, '') // 移除日期
                .replace(/读过|想读|在读/, '') // 移除状态
                .replace(/标签:.*/, '') // 移除标签部分
                .replace(/修改|删除/, '') // 移除操作按钮
                .trim();
            }
            
            if (comment && comment.length > 3) {
              book.myComment = comment;
              console.log(`   💬 我的备注: ${book.myComment}`);
            }
          }

          // 我的标签
          const tagsElement = $item.find('.tags');
          if (tagsElement.length > 0) {
            const tagsText = tagsElement.text().replace('标签:', '').trim();
            if (tagsText) {
              book.myTags = tagsText;
              console.log(`   🏷️ 我的标签: ${book.myTags}`);
            }
          }

          // 状态 - 从URL推断
          if (url.includes('/collect')) {
            book.myStatus = '读过';
          } else if (url.includes('/wish')) {
            book.myStatus = '想读';
          } else if (url.includes('/do')) {
            book.myStatus = '在读';
          }

          // 标记日期 - 从短评区域提取日期
          const dateMatch = $item.find('.short-note').text().match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            book.markDate = dateMatch[1];
            console.log(`   📅 标记日期: ${book.markDate}`);
          }

          console.log(`📖 列表页解析完成: 《${book.title}》`);

          // 获取详细信息
          const bookDetails = await getBookDetailsRobust(book.subjectId, cookie);
          Object.assign(book, bookDetails);
          
          books.push(book);
          
          // 详情页反爬虫延迟
          await delay(getRandomDelay());
          
        } catch (error) {
          console.log('⚠️ 解析单本书籍失败:', error);
        }
      }

      start += bookItems.length;
      
      // 列表页反爬虫延迟
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
 * 改进的飞书数据同步 - 处理新的字段类型
 */
async function syncBooksToFeishuRobust(books: DoubanBook[], accessToken: string): Promise<void> {
  console.log(`\n📊 开始同步 ${books.length} 本书籍到飞书表格 (改进版)...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const book of books) {
    try {
      // 构建字段数据 - 处理不同字段类型
      const recordFields: any = {};
      
      Object.entries(FIELD_MAPPINGS).forEach(([doubanKey, feishuFieldName]) => {
        const value = (book as any)[doubanKey];
        if (value !== undefined && value !== null && value !== '') {
          
          // 根据字段名处理不同的数据格式
          if (feishuFieldName === '我的标签') {
            // 文本字段 - 直接使用原始标签文本
            recordFields[feishuFieldName] = String(value);
          } 
          else if (feishuFieldName === '我的状态') {
            // 单选字段 - 需要选项ID
            const statusMapping = {
              '想读': 'optBxCcjgE',
              '在读': 'optdzDUhKn', 
              '读过': 'optyOM8nTZ'
            };
            const statusValue = String(value).trim();
            const optionId = statusMapping[statusValue as keyof typeof statusMapping];
            if (optionId) {
              recordFields[feishuFieldName] = optionId;
            }
          }
          else if (feishuFieldName === '我的评分') {
            // 评分字段 - 现在是数字类型，可以正常使用
            const rating = Number(value);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              recordFields[feishuFieldName] = rating;
            }
          }
          else if (feishuFieldName === '豆瓣评分') {
            // 数值字段
            recordFields[feishuFieldName] = Number(value);
          }
          else if (feishuFieldName === '标记日期') {
            // 日期字段 - 转换为时间戳(毫秒)
            const dateStr = String(value);
            try {
              const timestamp = new Date(dateStr).getTime();
              if (!isNaN(timestamp)) {
                recordFields[feishuFieldName] = timestamp;
              }
            } catch (e) {
              console.log(`   ⚠️ 日期格式转换失败: ${dateStr}`);
            }
          }
          else if (feishuFieldName === '封面图') {
            // URL字段 - 暂时跳过，可能需要特殊处理
            // const url = String(value);
            // if (url.startsWith('http://') || url.startsWith('https://')) {
            //   recordFields[feishuFieldName] = url;
            // }
          }
          else {
            // 普通文本字段
            recordFields[feishuFieldName] = String(value);
          }
        }
      });

      console.log(`📝 准备同步《${book.title}》- ${Object.keys(recordFields).length}个字段`);
      
      // 调试输出
      if (recordFields['我的标签']) console.log(`   🏷️ 标签格式: ${JSON.stringify(recordFields['我的标签'])}`);
      if (recordFields['我的状态']) console.log(`   📊 状态格式: ${JSON.stringify(recordFields['我的状态'])}`);
      if (recordFields['我的评分']) console.log(`   ⭐ 评分格式: ${JSON.stringify(recordFields['我的评分'])}`);
      if (recordFields['封面图']) console.log(`   🖼️ 封面URL: ${recordFields['封面图']}`);

      const record = { fields: recordFields };

      // 写入飞书
      const writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
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
  const limit = 3; // 先测试3本书

  console.log('🚀 鲁棒的豆瓣飞书同步 (完全修复版)');
  console.log('====================================');
  console.log(`👤 用户ID: ${userId}`);
  console.log(`📖 同步数量: ${limit}本书籍`);
  console.log('🔧 修复: 正则表达式→DOM解析, CSS选择器优化, 完整字段逻辑');
  console.log('');

  try {
    // 获取飞书访问令牌
    console.log('🔑 获取飞书访问令牌...');
    const accessToken = await getFeishuAccessToken();
    console.log('✅ 飞书令牌获取成功');

    // 抓取豆瓣数据
    const books = await fetchDoubanBooksRobust(userCookie, userId, limit);
    console.log(`✅ 成功抓取 ${books.length} 本书籍数据`);

    if (books.length === 0) {
      console.log('❌ 没有获取到书籍数据');
      return;
    }

    // 同步到飞书
    await syncBooksToFeishuRobust(books, accessToken);

    console.log('\n🎉 鲁棒同步任务完成!');
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