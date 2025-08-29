/**
 * 豆瓣数据抓取模拟测试
 * 
 * 使用模拟的HTML数据验证解析器逻辑，无需真实Cookie
 */

import * as cheerio from 'cheerio';

// 模拟豆瓣书籍列表页HTML
const mockBookListHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>我读过的书</title>
</head>
<body>
  <div class="subject-num">共 156 本</div>
  
  <div class="item-show">
    <div class="title">
      <a href="https://book.douban.com/subject/2567698/">三体</a>
    </div>
    <div class="date">2023-12-15</div>
  </div>
  
  <div class="item-show">
    <div class="title">
      <a href="https://book.douban.com/subject/1041040/">百年孤独</a>
    </div>
    <div class="date">2023-11-28</div>
  </div>
  
  <div class="item-show">
    <div class="title">
      <a href="https://book.douban.com/subject/5299764/">1984</a>
    </div>
    <div class="date">2023-10-12</div>
  </div>
</body>
</html>
`;

// 模拟豆瓣书籍详情页HTML
const mockBookDetailHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>三体 (豆瓣)</title>
  <meta property="og:image" content="https://img9.doubanio.com/view/subject/s/public/s2768378.jpg" />
  <meta property="og:description" content="文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。但在按下发射键的那一刻，历史的车轮偏向了一个全新的轨道。" />
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": "三体",
    "author": [{"@type": "Person", "name": "刘慈欣"}],
    "isbn": "9787229030896",
    "url": "https://book.douban.com/subject/2567698/"
  }
  </script>
</head>
<body>
  <!-- 豆瓣评分 -->
  <div id="interest_sectl">
    <div class="rating_self clearfix">
      <strong property="v:average">8.8</strong>
    </div>
  </div>
  
  <!-- 用户个人数据 -->
  <div id="interest_sect_level">
    <div class="a_stars">
      <span class="mr10">读过</span>
      <span>2023-12-15</span>
    </div>
  </div>
  
  <input id="n_rating" value="9" />
  <span id="rating"></span>
  <span>标签: 科幻 小说 刘慈欣</span>
  <span></span>
  <span>很精彩的硬科幻小说，想象力丰富。</span>
  
  <!-- 详细信息 -->
  <div id="info">
    <span class="pl">作者</span><span>:</span><span> 刘慈欣</span><br/>
    <span class="pl">出版社:</span> 重庆出版社<br/>
    <span class="pl">出版年:</span> 2008-1<br/>
    <span class="pl">页数:</span> 302<br/>
    <span class="pl">定价:</span> 23.00元<br/>
    <span class="pl">装帧:</span> 平装<br/>
    <span class="pl">ISBN:</span> 9787229030896<br/>
    <span class="pl">译者</span>
    <a href="/search/李四">李四</a>
    <a href="/search/王五">王五</a>
  </div>
  
  <!-- 内容简介 -->
  <div class="intro">
    <p>文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。但在按下发射键的那一刻，历史的车轮偏向了一个全新的轨道。四光年外，"三体文明"正苦苦挣扎——三颗无规则运行的太阳主导下的百余次毁灭与重生逼迫他们逃离母星。</p>
  </div>
</body>
</html>
`;

// 模拟HTML解析器（复制我们的解析逻辑）
class MockHtmlParser {
  parseListPage(html: string): any {
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('.item-show').each((index, element) => {
      const $element = $(element);
      
      const linkElement = $element.find('div.title > a');
      const title = linkElement.text().trim();
      const url = linkElement.attr('href');
      
      if (!url || !title) return;

      const idMatch = url.match(/(\d){5,10}/);
      if (!idMatch) return;

      const id = idMatch[0];
      const dateElement = $element.find('div.date');
      const dateText = dateElement.text().trim();

      items.push({
        id,
        title,
        url,
        dateText
      });
    });

    // 解析总数
    let total = 0;
    const subjectNumElement = $('.subject-num');
    if (subjectNumElement.length > 0) {
      const subjectNumText = subjectNumElement.text().trim();
      const totalMatch = subjectNumText.match(/(\d+)/);
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }
    }

    return { items, total };
  }

  parseStructuredData($: any): any {
    try {
      const scripts = $('script[type="application/ld+json"]');
      if (scripts.length === 0) {
        return null;
      }

      const jsonContent = scripts.first().text();
      if (!jsonContent) {
        return null;
      }

      const cleanedContent = jsonContent.replace(/[\r\n\t\s+]/g, '');
      return JSON.parse(cleanedContent);

    } catch (error) {
      console.warn('Failed to parse structured data:', error);
      return null;
    }
  }

  parseUserState($: any): any {
    const userState: any = {};

    try {
      // 评分 - input#n_rating
      const ratingInput = $('input#n_rating');
      if (ratingInput.length > 0) {
        const ratingValue = ratingInput.val();
        if (ratingValue && typeof ratingValue === 'string') {
          userState.rating = parseFloat(ratingValue);
        }
      }

      // 标签 - span#rating + next()
      const ratingSpan = $('span#rating');
      if (ratingSpan.length > 0) {
        const tagsText = ratingSpan.next().text().trim();
        if (tagsText && tagsText.includes('标签:')) {
          const tagsStr = tagsText.replace('标签:', '').trim();
          userState.tags = tagsStr.split(' ').filter(tag => tag.length > 0);
        }
      }

      // 状态 - div#interest_sect_level span.mr10
      const stateElement = $('#interest_sect_level span.mr10');
      if (stateElement.length > 0) {
        const stateText = stateElement.text().trim();
        userState.state = this.mapUserState(stateText);
      }

      // 标记日期
      if (stateElement.length > 0) {
        const dateElement = stateElement.next();
        const dateText = dateElement.text().trim();
        if (dateText) {
          userState.markDate = new Date(dateText);
        }
      }

      // 评论
      userState.comment = this.parseUserComment($);

    } catch (error) {
      console.warn('Failed to parse user state:', error);
    }

    return userState;
  }

  private parseUserComment($: any): string | undefined {
    // 尝试多个选择器
    const selectors = [
      '#interest_sect_level > div > span:nth-child(7)',
      '#interest_sect_level > div > span:nth-child(8)',
      '#interest_sect_level > div > span:nth-child(9)'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length > 0) {
          return text;
        }
      }
    }

    // 备用方案
    const ratingSpan = $('span#rating');
    if (ratingSpan.length > 0) {
      const commentElement = ratingSpan.next().next().next();
      const commentText = commentElement.text().trim();
      if (commentText && commentText.length > 0) {
        return commentText;
      }
    }

    return undefined;
  }

  private mapUserState(stateText: string): string | undefined {
    const stateMap: { [key: string]: string } = {
      '想读': 'wish',
      '在读': 'do', 
      '读过': 'collect'
    };

    return stateMap[stateText] || undefined;
  }

  parseBasicInfo($: any): any {
    const result: any = {};

    try {
      // 评分
      const scoreElement = $('#interest_sectl strong[property="v:average"]');
      if (scoreElement.length > 0) {
        const scoreText = scoreElement.text();
        if (scoreText) {
          result.score = parseFloat(scoreText);
        }
      }

      // 描述
      let desc = $('.intro p').text().trim();
      if (!desc) {
        const descElement = $('head > meta[property="og:description"]');
        desc = descElement.attr('content') || '';
      }
      if (desc) {
        result.desc = desc;
      }

      // 图片
      const imageElement = $('head > meta[property="og:image"]');
      if (imageElement.length > 0) {
        result.image = imageElement.attr('content');
      }

    } catch (error) {
      console.warn('Failed to parse basic info:', error);
    }

    return result;
  }

  parseInfoSection($: any): Record<string, any> {
    const infoMap = new Map<string, any>();

    try {
      const infoElement = $('#info');
      if (infoElement.length === 0) {
        return {};
      }

      // 解析span.pl元素
      infoElement.find('span.pl').each((index, element) => {
        const $element = $(element);
        const key = $element.text().trim();
        
        let value: any;

        if (key.includes('译者')) {
          // 译者：提取链接数组
          value = [];
          $element.parent().find('a').each((i, link) => {
            const linkText = $(link).text().trim();
            if (linkText) {
              value.push(linkText);
            }
          });
        } else if (key.includes('作者') || key.includes('丛书') || key.includes('出版社') || key.includes('出品方')) {
          // 这些字段取next().next()的内容
          const nextElement = $element.next();
          if (nextElement.length > 0) {
            const nextNextElement = nextElement.next();
            if (nextNextElement.length > 0) {
              value = nextNextElement.text()?.trim();
            }
          }
        } else {
          // 其他字段取next()的内容
          const nextElement = $element.next();
          if (nextElement.length > 0) {
            value = nextElement.text()?.trim();
          }
        }

        // 清理key并映射
        const cleanKey = this.mapInfoKey(key);
        if (cleanKey && value) {
          infoMap.set(cleanKey, value);
        }
      });

    } catch (error) {
      console.warn('Failed to parse info section:', error);
    }

    return Object.fromEntries(infoMap);
  }

  private mapInfoKey(key: string): string | undefined {
    const keyMap: { [key: string]: string } = {
      '作者': 'author',
      '出版社:': 'publisher',
      '原作名:': 'originalTitle',
      '出版年:': 'datePublished',
      '页数:': 'totalPage',
      '定价:': 'price',
      '装帧:': 'binding',
      'ISBN:': 'isbn',
      '译者': 'translator'
    };

    return keyMap[key];
  }
}

// 测试函数
function runMockTest() {
  console.log('=== 豆瓣数据抓取模拟测试 ===\n');
  
  const parser = new MockHtmlParser();
  let testsPassed = 0;
  let totalTests = 0;

  // 测试1: 列表页解析
  console.log('1. 测试书籍列表页解析...');
  totalTests++;
  
  try {
    const listResult = parser.parseListPage(mockBookListHtml);
    
    console.log(`  ✓ 找到 ${listResult.items.length} 本书籍`);
    console.log(`  ✓ 总数: ${listResult.total}`);
    
    // 验证具体数据
    const expectedBooks = ['三体', '百年孤独', '1984'];
    const actualBooks = listResult.items.map((book: any) => book.title);
    
    if (JSON.stringify(expectedBooks) === JSON.stringify(actualBooks)) {
      console.log('  ✓ 书籍标题解析正确');
      testsPassed++;
    } else {
      console.log('  ❌ 书籍标题解析错误');
      console.log('    期望:', expectedBooks);
      console.log('    实际:', actualBooks);
    }
  } catch (error: any) {
    console.log(`  ❌ 列表页解析失败: ${error.message}`);
  }

  // 测试2: 详情页解析
  console.log('\n2. 测试书籍详情页解析...');
  totalTests++;
  
  try {
    const $ = cheerio.load(mockBookDetailHtml);
    
    // JSON-LD解析
    const structuredData = parser.parseStructuredData($);
    console.log('  ✓ JSON-LD解析:', structuredData?.name || '失败');
    
    // 用户状态解析
    const userState = parser.parseUserState($);
    console.log('  ✓ 用户评分:', userState.rating || '无');
    console.log('  ✓ 用户标签:', userState.tags?.join(', ') || '无');
    console.log('  ✓ 用户状态:', userState.state || '无');
    
    // 基本信息解析
    const basicInfo = parser.parseBasicInfo($);
    console.log('  ✓ 豆瓣评分:', basicInfo.score || '无');
    console.log('  ✓ 描述长度:', basicInfo.desc?.length || 0);
    
    // 详细信息解析
    const infoData = parser.parseInfoSection($);
    console.log('  ✓ ISBN:', infoData.isbn || '无');
    console.log('  ✓ 出版社:', infoData.publisher || '无');
    console.log('  ✓ 译者:', infoData.translator || '无');
    
    // 验证关键数据
    if (structuredData?.name === '三体' && 
        userState.rating === 9 &&
        basicInfo.score === 8.8 &&
        infoData.isbn === '9787229030896') {
      console.log('  ✓ 详情页核心数据解析正确');
      testsPassed++;
    } else {
      console.log('  ❌ 详情页核心数据解析有误');
    }
    
  } catch (error: any) {
    console.log(`  ❌ 详情页解析失败: ${error.message}`);
  }

  // 测试结果
  console.log('\n=== 测试结果 ===');
  console.log(`通过测试: ${testsPassed}/${totalTests}`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 所有测试通过！代码逻辑验证成功。');
    console.log('\n下一步: 可以使用真实数据进行测试');
  } else {
    console.log('⚠️ 部分测试失败，需要修复代码');
  }
  
  // 展示完整解析结果
  console.log('\n=== 完整解析结果展示 ===');
  const $ = cheerio.load(mockBookDetailHtml);
  const fullResult = {
    title: parser.parseStructuredData($)?.name || '三体',
    score: parser.parseBasicInfo($).score,
    image: parser.parseBasicInfo($).image,
    desc: parser.parseBasicInfo($).desc,
    author: parser.parseStructuredData($)?.author?.map((a: any) => a.name) || [],
    isbn: parser.parseStructuredData($)?.isbn,
    publisher: parser.parseInfoSection($).publisher,
    translator: parser.parseInfoSection($).translator || [],
    myRating: parser.parseUserState($).rating,
    myTags: parser.parseUserState($).tags,
    myState: parser.parseUserState($).state,
    myComment: parser.parseUserState($).comment,
  };
  
  console.log('完整书籍数据:', JSON.stringify(fullResult, null, 2));
}

// 运行测试
if (require.main === module) {
  runMockTest();
}