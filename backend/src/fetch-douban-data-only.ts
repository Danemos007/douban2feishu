/**
 * 仅抓取豆瓣数据并缓存到文件
 * 用于分离数据抓取和飞书同步，提高测试效率
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface DoubanBook {
  subjectId: string;
  title: string;
  subtitle?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  publishDate?: string;
  pages?: string;
  price?: string;
  binding?: string;
  series?: string;
  isbn?: string;
  doubanRating?: number;
  myRating?: number;
  myStatus?: string;
  myTags?: string;
  myComment?: string;
  summary?: string;
  coverImage?: string;
  originalTitle?: string;
  markDate?: string;
}

// 字段映射配置
const FIELD_MAPPINGS = {
  'subjectId': 'Subject ID',
  'title': '书名',
  'subtitle': '副标题', 
  'author': '作者',
  'translator': '译者',
  'publisher': '出版社',
  'publishDate': '出版年份',
  'pages': '页数',
  'price': '价格',
  'binding': '装帧',
  'series': '丛书',
  'isbn': 'ISBN',
  'doubanRating': '豆瓣评分',
  'myRating': '我的评分',
  'myStatus': '我的状态', 
  'myTags': '我的标签',
  'myComment': '我的备注',
  'summary': '内容简介',
  'coverImage': '封面图',
  'originalTitle': '原作名',
  'markDate': '标记日期'
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取随机延迟时间 (4-8秒)
 */
function getRandomDelay(): number {
  return 4000 + Math.random() * 4000;
}

/**
 * 获取详情页信息 - 复用之前的robust逻辑
 */
async function getBookDetailsRobust(subjectId: string, cookie: string): Promise<Partial<DoubanBook>> {
  try {
    console.log(`   🔍 获取详情: ${subjectId}`);
    
    const detailUrl = `https://book.douban.com/subject/${subjectId}/`;
    const response = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'Cookie': cookie,
        'Referer': 'https://book.douban.com/',
      }
    });

    const $ = cheerio.load(response.data as string);
    const details: Partial<DoubanBook> = {};

    console.log('   📊 使用DOM解析方法提取字段...');

    // 修复的字段解析逻辑 - 避免HTML标签污染
    const extractCleanText = (element: any, selector?: string): string => {
      if (selector) {
        return $(element).find(selector).text().trim();
      } else {
        // 获取紧邻的文本节点，避免包含HTML标签
        const nextSibling = $(element).get(0)?.nextSibling;
        if (nextSibling && (nextSibling as any).nodeValue) {
          return (nextSibling as any).nodeValue.trim();
        }
        
        // 备用方案：获取父元素的文本内容并清理
        const parentText = $(element).parent().text().replace($(element).text(), '').trim();
        return parentText || '';
      }
    };

    $('#info').find('span.pl').each((_, element) => {
      const label = $(element).text().trim();
      let value = '';

      if (label.includes('作者')) {
        // 优先获取链接文本，如果没有则获取纯文本
        value = $(element).siblings('a').first().text().trim() || 
                extractCleanText(element);
        if (value) {
          details.author = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 作者 = "${value}"`);
        }
      }
      else if (label.includes('出版社')) {
        // 优先获取链接文本，如果没有则获取纯文本
        value = $(element).siblings('a').first().text().trim() || 
                extractCleanText(element);
        if (value) {
          details.publisher = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 出版社 = "${value}"`);
        }
      }
      else if (label.includes('副标题')) {
        value = extractCleanText(element);
        if (value) {
          details.subtitle = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 副标题 = "${value}"`);
        }
      }
      else if (label.includes('原作名')) {
        value = extractCleanText(element);
        if (value) {
          details.originalTitle = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 原作名 = "${value}"`);
        }
      }
      else if (label.includes('译者')) {
        value = $(element).siblings('a').first().text().trim() || 
                extractCleanText(element);
        if (value) {
          details.translator = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 译者 = "${value}"`);
        }
      }
      else if (label.includes('出版年')) {
        value = extractCleanText(element);
        if (value) {
          details.publishDate = value.replace(/\s+/g, ' ').trim();
          console.log(`   📝 提取: 出版年 = "${value}"`);
        }
      }
    });

    // 提取书名 (如果列表页未获取到)
    if (!details.title) {
      const titleElement1 = $('h1 span[property="v:itemreviewed"]');
      const titleElement2 = $('h1').first();
      let titleText = '';
      
      if (titleElement1.length > 0) {
        titleText = titleElement1.text().trim();
      } else if (titleElement2.length > 0) {
        titleText = titleElement2.text().trim();
      }
      
      if (titleText) {
        details.title = titleText;
        console.log(`   📖 详情页书名: "${titleText}"`);
      }
    }

    // 提取简介 - 增强版，处理"展开全部"的折叠内容
    let summary = '';
    
    // 方法1: 尝试从script标签中的JSON数据获取完整简介
    try {
      const scriptTags = $('script');
      scriptTags.each((_, script) => {
        const scriptContent = $(script).html() || '';
        if (scriptContent.includes('"intro"') || scriptContent.includes('intro')) {
          // 尝试提取JSON数据中的简介
          const jsonMatch = scriptContent.match(/"intro"\s*:\s*"([^"]+)"/);
          if (jsonMatch && jsonMatch[1] && jsonMatch[1].length > summary.length) {
            summary = jsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            console.log(`   📋 从Script获取简介 (${summary.length}字符)`);
          }
        }
      });
    } catch (e) {
      console.log('   ⚠️ Script简介提取失败');
    }

    // 方法2: 尝试多种选择器获取完整简介
    if (!summary) {
      const summarySelectors = [
        '.intro', 
        '#link-report .intro',
        '.subject-summary', 
        '[data-original-text]', // 有些网站使用这种属性存储原文
        '.all .intro', // 展开后的内容
        '.intro .all'  // 展开后的内容
      ];
      
      for (const selector of summarySelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          // 去除"展开全部"等提示文字
          const cleanText = text
            .replace(/展开全部/g, '')
            .replace(/\(展开全部\)/g, '')
            .replace(/点击展开/g, '')
            .replace(/收起全部/g, '')
            .trim();
          
          if (cleanText && cleanText.length > summary.length) {
            summary = cleanText;
            console.log(`   📋 使用选择器 ${selector} 获取简介 (${summary.length}字符)`);
          }
        }
      }
    }

    // 方法3: 如果还是没有，使用默认方法
    if (!summary) {
      const summaryElement = $('.intro').first();
      if (summaryElement.length > 0) {
        summary = summaryElement.text().trim();
        console.log(`   📋 使用默认方法获取简介 (${summary.length}字符)`);
      }
    }

    // 最终处理和验证
    if (summary && summary.length > 10) {
      // 清理简介内容
      summary = summary
        .replace(/展开全部/g, '')
        .replace(/\(展开全部\)/g, '')
        .replace(/点击展开/g, '')
        .replace(/收起全部/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (summary.length > 10) {
        details.summary = summary;
        console.log(`   📋 最终简介: "${summary.substring(0, 50)}..." (长度: ${summary.length}字符)`);
      }
    } else {
      console.log('   ❌ 未能获取有效简介');
    }

    // 豆瓣评分提取
    try {
      // 方法1: 尝试从评分区域提取
      let rating: number | undefined;
      
      // 常见的评分选择器
      const ratingSelectors = [
        '.rating_num',           // 主要评分显示
        '.ll.rating_num',        // 带样式类的评分
        '[property="v:average"]', // 微数据格式
        '.average.rating_num',   // 平均评分
        '.rating .rating_num'    // 评分区域内的数字
      ];
      
      for (const selector of ratingSelectors) {
        const ratingElement = $(selector).first();
        if (ratingElement.length > 0) {
          const ratingText = ratingElement.text().trim();
          const ratingNumber = parseFloat(ratingText);
          if (!isNaN(ratingNumber) && ratingNumber >= 0 && ratingNumber <= 10) {
            rating = ratingNumber;
            console.log(`   ⭐ 豆瓣评分: ${rating} (选择器: ${selector})`);
            break;
          }
        }
      }
      
      // 方法2: 从script标签中的JSON数据获取评分
      if (!rating) {
        const scriptTags = $('script');
        scriptTags.each((_, script) => {
          const scriptContent = $(script).html() || '';
          if (scriptContent.includes('"rating"') || scriptContent.includes('average')) {
            // 尝试提取JSON数据中的评分
            const avgMatch = scriptContent.match(/"average"\s*:\s*([0-9.]+)/);
            if (avgMatch) {
              const avgRating = parseFloat(avgMatch[1]);
              if (!isNaN(avgRating) && avgRating >= 0 && avgRating <= 10) {
                rating = avgRating;
                console.log(`   ⭐ 豆瓣评分: ${rating} (从Script提取)`);
              }
            }
          }
        });
      }
      
      if (rating) {
        details.doubanRating = rating;
      } else {
        console.log('   ⚠️ 无法获取豆瓣评分');
      }
      
    } catch (error) {
      console.log('   ⚠️ 豆瓣评分提取失败:', (error as Error).message);
    }

    // 用户专属字段提取 - 基于obsidian-douban实现
    try {
      console.log('   👤 提取用户专属字段...');
      
      // 1. 我的评分 (myRating)
      const myRatingInput = $('input#n_rating');
      if (myRatingInput.length > 0) {
        const ratingValue = myRatingInput.val();
        if (ratingValue && ratingValue !== '') {
          const myRatingNum = parseInt(ratingValue.toString(), 10);
          if (!isNaN(myRatingNum) && myRatingNum >= 1 && myRatingNum <= 5) {
            details.myRating = myRatingNum;
            console.log(`   ⭐ 我的评分: ${myRatingNum}星`);
          }
        }
      }

      // 2. 我的标签 (myTags) - 重新分析豆瓣真实HTML结构
      console.log(`   🔍 开始标签提取...`);
      
      // 方法1: 寻找包含"标签:"的span元素 
      let tagsText = '';
      const tagSelectors = [
        'span.color_gray',  // 从您的截图看到的结构
        '.tags span',
        '#db-tags-section span',
        '.subject-tags span'
      ];
      
      for (const selector of tagSelectors) {
        $(selector).each((_, element) => {
          const text = $(element).text().trim();
          if (text.includes('标签:') || text.includes('标签：')) {
            tagsText = text;
            console.log(`   🔍 找到标签元素，使用选择器: ${selector}`);
            console.log(`   🔍 标签原始文本: "${tagsText}"`);
            return false; // 跳出循环
          }
        });
        if (tagsText) break;
      }
      
      // 方法2: 如果上面没找到，搜索所有包含"标签"文字的span
      if (!tagsText) {
        $('span').each((_, element) => {
          const spanText = $(element).text().trim();
          if (spanText.includes('标签:') || spanText.includes('标签：')) {
            tagsText = spanText;
            console.log(`   🔍 通过文本搜索找到标签: "${tagsText}"`);
            return false; // 跳出循环
          }
        });
      }
      
      if (tagsText) {
        // 移除"标签:"或"标签："前缀
        let cleanTagsText = tagsText;
        if (tagsText.includes('标签:')) {
          cleanTagsText = tagsText.replace('标签:', '').trim();
        } else if (tagsText.includes('标签：')) {
          cleanTagsText = tagsText.replace('标签：', '').trim();
        }
        
        if (cleanTagsText && cleanTagsText.length > 0) {
          // 按逗号或换行分割，但保持每个标签内部的斜杠格式
          const tagsArray = cleanTagsText.split(/[,\n]+/).map(tag => tag.trim()).filter(tag => tag.length > 0);
          if (tagsArray.length > 0) {
            details.myTags = tagsArray.join(' ');
            console.log(`   🏷️ 我的标签: ${details.myTags}`);
          }
        } else {
          console.log(`   ℹ️ 标签处理后为空`);
        }
      } else {
        console.log(`   ℹ️ 未找到标签信息`);
      }

      // 3. 我的备注/短评 (myComment) - 基于真实HTML结构精确提取
      console.log(`   🔍 开始备注提取...`);
      
      let comment = '';
      
      // 方法1: 寻找标签后面紧跟的独立span元素（基于您提供的HTML结构）
      $('span.color_gray').each((_, element) => {
        const spanText = $(element).text().trim();
        if (spanText.includes('标签:') || spanText.includes('标签：')) {
          // 找到标签元素，查看其后面的兄弟元素
          const nextElements = $(element).nextAll();
          
          nextElements.each((_, nextElement) => {
            const tagName = $(nextElement).prop('tagName');
            const nextText = $(nextElement).text().trim();
            
            // 寻找紧跟标签的span元素，且不包含特殊内容
            if (tagName === 'SPAN' && 
                nextText && 
                nextText.length > 2 &&
                nextText.length < 500 &&
                !nextText.includes('标签') && 
                !nextText.includes('我读过') &&
                !nextText.includes('我看过') &&
                !nextText.includes('我听过') &&
                !nextText.includes('评价') &&
                !nextText.includes('★') &&
                !nextText.match(/^\d{4}-\d{2}-\d{2}$/)) { // 不是日期格式
              
              comment = nextText;
              console.log(`   🔍 找到标签后的备注元素: "${comment}"`);
              return false; // 跳出内层循环
            }
          });
          
          if (comment) return false; // 跳出外层循环
        }
      });
      
      // 方法2: 如果方法1没找到，尝试通过上下文搜索
      if (!comment) {
        console.log(`   🔍 方法1未找到，尝试方法2...`);
        
        $('span').each((_, element) => {
          const spanText = $(element).text().trim();
          
          // 跳过明显不是备注的内容
          if (!spanText || 
              spanText.includes('标签') || 
              spanText.includes('我读过') ||
              spanText.includes('我看过') ||
              spanText.includes('我听过') ||
              spanText.includes('评价') ||
              spanText.includes('★') ||
              spanText.includes('修改') ||
              spanText.includes('删除') ||
              spanText.match(/^\d{4}-\d{2}-\d{2}$/) ||
              spanText.length < 3 ||
              spanText.length > 500) {
            return true; // 继续下一个
          }
          
          // 检查这个span的兄弟元素或父级元素是否包含标签信息
          const siblings = $(element).siblings();
          const hasTagSibling = siblings.toArray().some(sibling => 
            $(sibling).text().includes('标签')
          );
          
          const parentSiblings = $(element).parent().siblings();
          const hasTagInParentSiblings = parentSiblings.toArray().some(sibling => 
            $(sibling).text().includes('标签')
          );
          
          if (hasTagSibling || hasTagInParentSiblings) {
            comment = spanText;
            console.log(`   🔍 通过上下文搜索找到备注: "${comment}"`);
            return false; // 跳出循环
          }
        });
      }
      
      if (comment && comment.length > 0) {
        details.myComment = comment;
        console.log(`   💭 我的备注: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`);
      } else {
        console.log(`   ℹ️ 未找到个人备注`);
      }

      // 4. 封面图片 (coverImage)
      let coverImageUrl = '';
      
      // 方法1: 从og:image meta标签获取
      const ogImageElement = $('meta[property="og:image"]');
      if (ogImageElement.length > 0) {
        coverImageUrl = ogImageElement.attr('content') || '';
        if (coverImageUrl) {
          console.log(`   🖼️ 从og:image获取封面`);
        }
      }
      
      // 方法2: 从JSON-LD数据获取
      if (!coverImageUrl) {
        try {
          const scriptTags = $('script[type="application/ld+json"]');
          scriptTags.each((_, script) => {
            const scriptContent = $(script).html() || '';
            if (scriptContent.includes('"image"')) {
              const jsonData = JSON.parse(scriptContent.replace(/[\r\n\t]/g, ''));
              if (jsonData.image) {
                coverImageUrl = jsonData.image;
                console.log(`   🖼️ 从JSON-LD获取封面`);
              }
            }
          });
        } catch (e) {
          // JSON解析失败，忽略
        }
      }
      
      // 方法3: 从主要封面图片选择器获取
      if (!coverImageUrl) {
        const imageSelectors = [
          '.subject-pic img',
          '.nbg img', 
          '.pic img',
          '#mainpic img'
        ];
        
        for (const selector of imageSelectors) {
          const imgElement = $(selector).first();
          if (imgElement.length > 0) {
            const imgSrc = imgElement.attr('src') || imgElement.attr('data-src') || '';
            if (imgSrc && imgSrc.includes('douban')) {
              coverImageUrl = imgSrc;
              console.log(`   🖼️ 使用选择器 ${selector} 获取封面`);
              break;
            }
          }
        }
      }
      
      if (coverImageUrl) {
        details.coverImage = coverImageUrl;
        console.log(`   🖼️ 封面图片: ${coverImageUrl}`);
      }
      
    } catch (error) {
      console.log('   ⚠️ 用户专属字段提取失败:', (error as Error).message);
    }

    return details;

  } catch (error: any) {
    console.log(`   ❌ 获取详情失败 ${subjectId}:`, error.message);
    return {};
  }
}

/**
 * 抓取豆瓣书籍数据 - 支持不同状态
 * @param status - 书籍状态: 'wish'(想读), 'do'(在读), 'collect'(读过)
 */
async function fetchDoubanBooksDataByStatus(cookie: string, userId: string, status: 'wish' | 'do' | 'collect', limit: number = 10): Promise<DoubanBook[]> {
  const statusName = status === 'wish' ? '想读' : status === 'do' ? '在读' : '读过';
  console.log(`📚 抓取${statusName}状态书籍...`);
  console.log(`🎯 目标数量: ${limit} 本`);
  console.log(`⏰ 状态: ${status}`);
  
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
      const url = `https://book.douban.com/people/${userId}/${status}?start=${start}&sort=time&rating=all&filter=all&mode=list`;
      console.log(`🔍 请求列表页: ${url}`);
      
      const response = await axios.get(url, { headers });
      
      if ((response.data as string).includes('禁止访问') || (response.data as string).includes('检测到有异常请求')) {
        console.log('❌ 被反爬虫系统拦截，请检查Cookie');
        break;
      }

      const $ = cheerio.load(response.data as string);
      // list模式使用.item-show，grid模式使用.subject-item
      const bookItems = $('.item-show');
      
      if (bookItems.length === 0) {
        console.log('📖 没有更多书籍数据');
        break;
      }

      console.log(`📖 找到 ${bookItems.length} 本书籍`);

      for (let i = 0; i < bookItems.length && books.length < limit; i++) {
        try {
          const element = bookItems[i];
          const $item = $(element);
          
          const book: DoubanBook = {
            subjectId: '',
            title: '',
          };

          // 提取基础信息 - list模式
          const linkElement = $item.find('div.title > a');
          if (linkElement.length > 0) {
            const href = linkElement.attr('href') || '';
            const subjectMatch = href.match(/subject\/(\d+)\//);
            if (subjectMatch) {
              book.subjectId = subjectMatch[1];
            }
          }

          // 书名 - list模式直接从title链接获取
          const titleText = linkElement.text().trim();
          if (titleText) {
            book.title = titleText;
            console.log(`   📖 书名: "${titleText}"`);
          } else {
            console.log(`   ⚠️ 警告: 未能提取书名`);
          }

          // 状态 - 从status参数推断
          book.myStatus = status === 'collect' ? '读过' : status === 'wish' ? '想读' : status === 'do' ? '在读' : '未知';

          // 标记日期 - list模式使用div.date
          const dateElement = $item.find('div.date');
          if (dateElement.length > 0) {
            const dateText = dateElement.text().trim();
            // 尝试提取日期格式
            const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              book.markDate = dateMatch[1];
              console.log(`   📅 标记日期: ${book.markDate}`);
            }
          }

          // 🎯 从列表页提取用户专属字段 - 基于您发现的HTML结构
          const gridId = `grid${book.subjectId}`;
          const gridElement = $(`#${gridId}`);
          
          if (gridElement.length > 0) {
            console.log(`   🔍 找到grid元素: ${gridId}`);
            
            // 我的标签 - 从span.tags提取
            const tagsElement = gridElement.find('span.tags');
            if (tagsElement.length > 0) {
              let tagsText = tagsElement.text().trim();
              console.log(`   🔍 列表页标签原始文本: "${tagsText}"`);
              
              if (tagsText.includes('标签:')) {
                tagsText = tagsText.replace('标签:', '').trim();
              } else if (tagsText.includes('标签：')) {
                tagsText = tagsText.replace('标签：', '').trim();
              }
              
              if (tagsText && tagsText.length > 0) {
                // 按逗号或换行分割，但保持每个标签内部的斜杠格式
                const tagsArray = tagsText.split(/[,\n]+/).map(tag => tag.trim()).filter(tag => tag.length > 0);
                if (tagsArray.length > 0) {
                  book.myTags = tagsArray.join(' ');
                  console.log(`   🏷️ 列表页标签: ${book.myTags}`);
                }
              }
            } else {
              console.log(`   ℹ️ 列表页无标签信息`);
            }
            
            // 我的备注 - 从div.comment提取
            const commentElement = gridElement.find('div.comment');
            if (commentElement.length > 0) {
              const commentText = commentElement.text().trim();
              console.log(`   🔍 列表页备注原始文本: "${commentText}"`);
              
              if (commentText && commentText.length > 0) {
                book.myComment = commentText;
                console.log(`   💭 列表页备注: ${book.myComment}`);
              }
            } else {
              console.log(`   ℹ️ 列表页无备注信息`);
            }
            
            // 我的评分 - 从列表页date元素中提取评分 (修复选择器位置)
            const ratingElement = $item.find('div.date span[class*="rating"][class$="-t"]');
            if (ratingElement.length > 0) {
              const ratingClass = ratingElement.attr('class') || '';
              const ratingMatch = ratingClass.match(/rating(\d+)-t/);
              if (ratingMatch) {
                const rating = parseInt(ratingMatch[1], 10);
                if (rating >= 1 && rating <= 5) {
                  book.myRating = rating;
                  console.log(`   ⭐ 列表页评分: ${rating}星`);
                } else {
                  console.log(`   ⚠️ 评分超出范围: ${rating}`);
                }
              } else {
                console.log(`   ⚠️ 评分正则匹配失败`);
              }
            } else {
              console.log(`   ❌ 未找到评分元素`);
            }
          } else {
            console.log(`   ⚠️ 未找到grid元素: ${gridId}`);
          }

          console.log(`📖 列表页解析完成: 《${book.title}》`);

          // 获取详细信息
          if (book.subjectId) {
            const bookDetails = await getBookDetailsRobust(book.subjectId, cookie);
            // 合并详情数据，但保护列表页已提取的用户专属字段
            Object.keys(bookDetails).forEach(key => {
              const detailValue = (bookDetails as any)[key];
              // 跳过用户专属字段，避免覆盖列表页的正确数据
              const userSpecificFields = ['myRating', 'myTags', 'myComment'];
              if (userSpecificFields.includes(key)) {
                return; // 跳过用户专属字段
              }
              
              if (detailValue && (!book.hasOwnProperty(key) || !(book as any)[key])) {
                (book as any)[key] = detailValue;
              }
            });
            
            // 详情页反爬虫延迟
            await delay(getRandomDelay());
          }
          
          books.push(book);
          
        } catch (error) {
          console.log('⚠️ 解析单本书籍失败:', error);
        }
      }

      start += bookItems.length;
      
      // 列表页反爬虫延迟
      if (books.length < limit) {
        const delayTime = getRandomDelay();
        console.log(`⏳ 反爬虫延迟 ${Math.round(delayTime/1000)}秒...`);
        await delay(delayTime);
      }

    } catch (error: any) {
      console.log('❌ 抓取失败:', error.message);
      break;
    }
  }

  return books.slice(0, limit);
}

/**
 * 抓取所有状态的豆瓣书籍数据 (想读+在读+读过)
 */
async function fetchAllDoubanBooksData(cookie: string, userId: string, maxLimit: number = 60): Promise<DoubanBook[]> {
  console.log('📚 开始抓取用户的所有豆瓣读书数据...');
  console.log(`🎯 最大数量: ${maxLimit} 本书籍`);
  console.log('📊 将按状态分别抓取: 想读 → 在读 → 读过\n');
  
  const allBooks: DoubanBook[] = [];
  
  try {
    // 按顺序抓取：想读 → 在读 → 读过
    const statusList = [
      { status: 'wish', name: '想读', expectedCount: 32 },
      { status: 'do', name: '在读', expectedCount: 1 },
      { status: 'collect', name: '读过', expectedCount: 17 }
    ];
    
    for (const { status, name, expectedCount } of statusList) {
      // 动态计算当前状态的目标数量
      const remaining = maxLimit - allBooks.length;
      const target = Math.min(expectedCount, remaining);
      
      if (target > 0) {
        console.log(`📚 抓取${name}状态书籍...`);
        console.log(`🎯 目标数量: ${target} 本`);
        console.log(`⏰ 状态: ${status}`);
        const books = await fetchDoubanBooksDataByStatus(cookie, userId, status as 'wish' | 'do' | 'collect', target);
        allBooks.push(...books);
        console.log(`✅ ${name}状态完成: ${books.length} 本\n`);
        
        if (allBooks.length >= maxLimit) break;
      }
    }
    
    console.log(`📊 全量抓取结果: ${allBooks.length} 本书籍`);
    const stats = allBooks.reduce((acc, book) => {
      acc[book.myStatus!] = (acc[book.myStatus!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 状态分布: ${Object.entries(stats).map(([k, v]) => `${k}${v}本`).join(', ')}`);
    
    return allBooks.slice(0, maxLimit);
    
  } catch (error: any) {
    console.error('💥 抓取过程中发生错误:', error.message);
    console.log(`📊 已抓取: ${allBooks.length} 本书籍`);
    return allBooks;
  }
}

/**
 * 保存数据到文件
 */
function saveDataToCache(books: DoubanBook[], userId: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `douban-books-${userId}-${timestamp}.json`;
  const filepath = path.join(__dirname, '../cache', filename);
  
  // 确保cache目录存在
  const cacheDir = path.dirname(filepath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(books, null, 2), 'utf8');
  
  console.log(`\n💾 数据已缓存到: ${filepath}`);
  console.log(`📊 书籍数量: ${books.length}`);
  console.log(`📁 文件大小: ${Math.round(fs.statSync(filepath).size / 1024)} KB`);
  
  // 同时保存一个最新版本
  const latestPath = path.join(__dirname, '../cache', `douban-books-${userId}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(books, null, 2), 'utf8');
  console.log(`🔄 最新数据: ${latestPath}`);
}

async function main() {
  console.log('📥 豆瓣数据抓取器 (缓存版)');
  console.log('========================');
  console.log('🎯 目标: 一次抓取，多次使用，提高测试效率');
  console.log('');
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('使用方法:');
    console.log('npm run fetch-douban <status|all> <limit> <userId>');
    console.log('');
    console.log('参数说明:');
    console.log('  status: wish(想读) | do(在读) | collect(读过) | all(全部)');
    console.log('  limit: 抓取数量限制');
    console.log('  userId: 豆瓣用户ID');
    console.log('');
    console.log('示例:');
    console.log('npm run fetch-douban all 50 290244208  # 抓取50本书(32想读+1在读+17读过)');
    console.log('npm run fetch-douban collect 4 290244208  # 仅抓取4本读过的书');
    return;
  }
  
  const [statusOrAll, limitStr, userId] = args;
  const limit = parseInt(limitStr, 10);
  const COOKIE = 'll="118282"; bid=Iv-9zz8BFAE; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="290244208:wI+zvuksP70"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y';
  
  try {
    let books: DoubanBook[];
    
    if (statusOrAll === 'all') {
      // 抓取全部状态
      books = await fetchAllDoubanBooksData(COOKIE, userId, limit);
    } else {
      // 抓取单一状态
      console.log(`🔍 小批量测试: 专门抓取"${getStatusName(statusOrAll)}"状态书籍...`);
      console.log('🎯 重点验证: myComment(我的备注)等用户专属字段');
      books = await fetchDoubanBooksDataByStatus(COOKIE, userId, statusOrAll as 'wish' | 'do' | 'collect', limit);
      console.log(`✅ ${getStatusName(statusOrAll)}状态完成: ${books.length} 本\n`);
      console.log(`📊 小批量测试结果: ${books.length} 本书籍`);
      console.log(`📊 状态分布: ${getStatusName(statusOrAll)}${books.length}本`);
    }
    
    if (books.length > 0) {
      saveDataToCache(books, userId);
      
      console.log('\n🎉 数据抓取完成！');
      console.log('💡 现在可以使用缓存数据进行飞书API测试，无需重复抓取');
      console.log('📋 字段统计:');
      
      const fieldStats: { [key: string]: number } = {};
      books.forEach(book => {
        Object.keys(book).forEach(key => {
          if ((book as any)[key]) {
            fieldStats[key] = (fieldStats[key] || 0) + 1;
          }
        });
      });
      
      Object.entries(fieldStats).forEach(([field, count]) => {
        console.log(`   ${field}: ${count}/${books.length}`);
      });
      
    } else {
      console.log('❌ 未抓取到任何数据，请检查Cookie是否有效');
    }
    
  } catch (error: any) {
    console.error('💥 抓取失败:', error.message);
  }
}

function getStatusName(status: string): string {
  const statusMap: Record<string, string> = {
    'wish': '想读',
    'do': '在读', 
    'collect': '读过'
  };
  return statusMap[status] || status;
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}