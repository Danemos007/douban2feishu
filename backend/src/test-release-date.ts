/**
 * 测试上映日期解析 - 检查单个和多个上映日期的结构
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const DOUBAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cookie': process.argv[2] || ''
};

async function testReleaseDates() {
  console.log('=== 上映日期解析结构测试 ===');
  
  const testMovies = [
    {
      id: '3742360',
      title: '让子弹飞',
      description: '单个上映日期'
    },
    {
      id: '36491177', 
      title: '坂本龙一：杰作',
      description: '多个上映日期'
    }
  ];

  for (const movie of testMovies) {
    try {
      console.log(`\n🎬 检查《${movie.title}》(${movie.description})...`);
      const url = `https://movie.douban.com/subject/${movie.id}/`;
      console.log(`[请求] ${url}`);
      
      const response = await axios.get(url, { headers: DOUBAN_HEADERS });
      const html = response.data as string;
      const $ = cheerio.load(html);
      const infoElement = $('#info');
      
      console.log(`[成功] 获取到 ${html.length} 字符`);
      
      // 方法1：查看所有 v:initialReleaseDate 元素
      const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
      console.log(`📅 找到 ${releaseDateElements.length} 个上映日期元素:`);
      releaseDateElements.each((index, element) => {
        const text = $(element).text().trim();
        console.log(`   ${index + 1}. ${text}`);
      });
      
      // 方法2：查看上映日期行的完整HTML结构
      const releaseDateSpan = infoElement.find('span.pl:contains("上映日期")');
      if (releaseDateSpan.length > 0) {
        const releaseDateLine = releaseDateSpan.parent().html() || '';
        console.log(`\n📋 上映日期行HTML结构:`);
        console.log(releaseDateLine);
        
        // 提取所有上映日期文本
        const allReleaseDatesMatch = releaseDateLine.match(/上映日期:<\/span>\s*(.+?)(?:<br|$)/);
        if (allReleaseDatesMatch && allReleaseDatesMatch[1]) {
          const fullReleaseDateText = allReleaseDatesMatch[1].replace(/<[^>]*>/g, '').trim();
          console.log(`\n🔍 完整上映日期文本: ${fullReleaseDateText}`);
        }
      }
      
      // 方法3：当前解析逻辑结果
      const currentLogicElement = infoElement.find('span[property="v:initialReleaseDate"]').first();
      if (currentLogicElement.length > 0) {
        let dateText = currentLogicElement.text().trim();
        const dateMatch = dateText.match(/^(\d{4}-\d{2}-\d{2})/);
        const currentResult = dateMatch ? dateMatch[1] : dateText;
        console.log(`\n⚙️ 当前解析逻辑结果: ${currentResult}`);
      }

      console.log('\n' + '='.repeat(50));
      
    } catch (error) {
      console.log(`  ❌ 获取失败: ${error}`);
    }
  }
}

// 运行测试
testReleaseDates();