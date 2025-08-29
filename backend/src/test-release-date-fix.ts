/**
 * 测试修复后的上映日期解析逻辑
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
};

async function testReleaseDateFix() {
  console.log('=== 测试修复后的上映日期解析逻辑 ===');
  
  const testMovies = [
    {
      id: '3742360',
      title: '让子弹飞',
      description: '单个上映日期',
      expectedFormat: 'YYYY-MM-DD(地区)'
    },
    {
      id: '36491177', 
      title: '坂本龙一：杰作',
      description: '多个上映日期',
      expectedFormat: 'YYYY-MM-DD(地区1) / YYYY-MM-DD(地区2) / YYYY-MM-DD(地区3)'
    }
  ];

  for (const movie of testMovies) {
    try {
      console.log(`\n🎬 测试《${movie.title}》(${movie.description})...`);
      const url = `https://movie.douban.com/subject/${movie.id}/`;
      console.log(`[请求] ${url}`);
      
      const response = await axios.get(url, { headers: DOUBAN_HEADERS });
      const html = response.data as string;
      const $ = cheerio.load(html);
      const infoElement = $('#info');
      
      console.log(`[成功] 获取到 ${html.length} 字符`);
      
      // 使用修复后的解析逻辑
      const releaseDateElements = infoElement.find('span[property="v:initialReleaseDate"]');
      console.log(`📅 找到 ${releaseDateElements.length} 个上映日期元素`);
      
      if (releaseDateElements.length > 0) {
        // 收集所有上映日期，保留完整的地区信息
        const allReleaseDates: string[] = [];
        releaseDateElements.each((index, element) => {
          const dateText = $(element).text().trim();
          if (dateText) {
            allReleaseDates.push(dateText);
            console.log(`   ${index + 1}. ${dateText}`);
          }
        });
        
        // 用 " / " 连接所有上映日期，与豆瓣页面显示格式一致
        if (allReleaseDates.length > 0) {
          const finalReleaseDate = allReleaseDates.join(' / ');
          console.log(`\n✅ 修复后的解析结果: ${finalReleaseDate}`);
          console.log(`📋 期望格式: ${movie.expectedFormat}`);
          
          // 验证格式
          if (allReleaseDates.length === 1) {
            const singleDateMatch = finalReleaseDate.match(/^\d{4}-\d{2}-\d{2}\(.+\)$/);
            console.log(`🔍 单日期格式检查: ${singleDateMatch ? '✅ 正确' : '❌ 错误'}`);
          } else {
            const multiDateMatch = finalReleaseDate.match(/^\d{4}-\d{2}-\d{2}\(.+\)(\s\/\s\d{4}-\d{2}-\d{2}\(.+\))+$/);
            console.log(`🔍 多日期格式检查: ${multiDateMatch ? '✅ 正确' : '❌ 错误'}`);
          }
        }
      } else {
        console.log(`❌ 未找到上映日期元素`);
      }

      console.log('\n' + '='.repeat(50));
      
    } catch (error) {
      console.log(`  ❌ 获取失败: ${error}`);
    }
  }
}

// 运行测试
testReleaseDateFix();