/**
 * 测试《初恋这件小事》片长解析问题
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

async function testChuLianDuration() {
  console.log('=== 测试《初恋这件小事》片长解析 ===');
  
  try {
    const url = 'https://movie.douban.com/subject/4739952/';
    console.log(`[请求] ${url}`);
    
    const response = await axios.get(url, { headers: DOUBAN_HEADERS });
    const html = response.data as string;
    const $ = cheerio.load(html);
    const infoElement = $('#info');
    
    console.log(`[成功] 获取到 ${html.length} 字符`);
    
    // 方法1: 查找 v:runtime 属性（原逻辑）
    const durationElement = infoElement.find('span[property="v:runtime"]');
    console.log(`方法1 - v:runtime 属性（原逻辑）: ${durationElement.length > 0 ? durationElement.text().trim() : '未找到'}`);
    
    // 方法1.5: 查找 v:runtime 属性（新修复的逻辑）
    if (durationElement.length > 0) {
      const durationLine = durationElement.closest('span.pl').parent().html() || durationElement.parent().html() || '';
      console.log(`DEBUG - 完整片长行HTML: ${durationLine}`);
      const durationMatch = durationLine.match(/片长:<\/span>\s*(.+?)(?:<br|$)/);
      if (durationMatch && durationMatch[1]) {
        const fullDuration = durationMatch[1].replace(/<[^>]*>/g, '').trim();
        console.log(`方法1.5 - v:runtime 属性（新修复逻辑）: ${fullDuration}`);
      } else {
        console.log('方法1.5 - v:runtime 属性（新修复逻辑）: 正则匹配失败');
      }
    }
    
    // 方法2: 从一般信息中查找片长
    const durationSpan = infoElement.find('span.pl:contains("片长")');
    if (durationSpan.length > 0) {
      const durationLine = durationSpan.parent().html() || '';
      console.log(`DEBUG - 完整HTML行: ${durationLine}`);
      const durationMatch = durationLine.match(/片长:<\/span>\s*([^<]+)/);
      if (durationMatch && durationMatch[1]) {
        console.log(`方法2 - 一般信息片长: ${durationMatch[1].trim()}`);
      } else {
        console.log('方法2 - 一般信息片长: 正则匹配失败');
      }
    } else {
      console.log('方法2 - 一般信息片长: 未找到span');
    }
    
    // 方法3: 查看完整的info区域文本
    console.log('\n=== 调试信息 ===');
    console.log('info区域包含的文本:');
    console.log(infoElement.text());
    
    // 方法4: 查看HTML结构中的片长行
    console.log('\n=== HTML结构调试 ===');
    const pianzhanLines = infoElement.html()?.split('\n').filter(line => line.includes('片长')) || [];
    pianzhanLines.forEach((line, index) => {
      console.log(`片长相关行 ${index + 1}: ${line.trim()}`);
    });
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testChuLianDuration();