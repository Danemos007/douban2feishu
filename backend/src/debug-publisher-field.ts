/**
 * 调试出版社字段抓取问题
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const cookie = 'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="your_user_id:example_secret"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y';

async function debugPublisherField() {
  console.log('🔍 调试出版社字段抓取问题');
  console.log('============================');
  
  // 测试几本书的详情页
  const testBooks = [
    { id: '27114418', title: '活下去的理由' },
    { id: '7045735', title: '可可·香奈儿的传奇一生' },
    { id: '33440284', title: '那些活了很久很久的树' }
  ];
  
  for (const book of testBooks) {
    console.log(`\n📖 测试书籍: 《${book.title}》(${book.id})`);
    
    try {
      const detailUrl = `https://book.douban.com/subject/${book.id}/`;
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
      
      console.log('📊 检查所有包含"出版"相关信息的元素:');
      
      // 方法1: 查找所有包含"出版"的文本
      $('*').each((_, element) => {
        const text = $(element).text();
        if (text.includes('出版社') || text.includes('出版') || text.includes('版社')) {
          const tagName = (element as any).tagName || element.type;
          const classList = $(element).attr('class') || '';
          const parentText = $(element).parent().text().trim();
          
          if (text.length < 100) { // 避免输出过长的内容
            console.log(`   ${tagName}.${classList}: "${text.trim()}"`);
            if (parentText !== text && parentText.length < 200) {
              console.log(`     父元素: "${parentText}"`);
            }
          }
        }
      });
      
      console.log('\n🎯 尝试常见的出版社选择器:');
      
      const publisherSelectors = [
        '#info',          // 图书信息区域
        '.subject-meta',  // 元数据区域
        '.pl',           // 标签
        '.attrs',        // 属性区域
        '[title*="出版社"]',
        '*[class*="pub"]',
        '*[class*="publish"]'
      ];
      
      for (const selector of publisherSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`\n   选择器 ${selector} (${elements.length}个元素):`);
          elements.each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('出版') && text.length < 300) {
              console.log(`     [${i}] ${text}`);
            }
          });
        }
      }
      
      console.log('\n📋 检查#info区域的详细结构:');
      const infoElement = $('#info');
      if (infoElement.length > 0) {
        // 查找所有带有"出版"标签的行
        const infoText = infoElement.html() || '';
        const lines = infoText.split('<br>');
        
        lines.forEach((line, index) => {
          const $line = cheerio.load(line);
          const cleanLine = $line.root().text().trim();
          if (cleanLine.includes('出版社') || cleanLine.includes('出版')) {
            console.log(`     行 ${index}: ${cleanLine}`);
            
            // 解析这一行的结构
            $line('*').each((_, el) => {
              const tagName = (el as any).tagName || el.type;
              const className = $line(el).attr('class') || '';
              const text = $line(el).text().trim();
              if (text) {
                console.log(`       ${tagName}.${className}: "${text}"`);
              }
            });
          }
        });
      }

    } catch (error: any) {
      console.error(`❌ 获取详情失败: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // 添加延迟避免被限流
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

if (require.main === module) {
  debugPublisherField();
}