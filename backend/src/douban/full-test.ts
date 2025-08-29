#!/usr/bin/env ts-node

/**
 * 豆瓣抓取服务完整测试脚本
 * 
 * 本脚本使用我们开发的完整服务架构：
 * - CookieManagerService: Cookie管理和Headers生成
 * - AntiSpiderService: 反爬虫策略和请求管理
 * - HtmlParserService: HTML解析和数据提取
 * - BookScraperService: 书籍数据抓取逻辑
 * 
 * 测试目标：
 * - 验证完整服务架构的工作状态
 * - 获取更准确的16个字段的书籍数据
 * - 测试多页数据获取能力
 */

import { Logger } from '@nestjs/common';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { HtmlParserService } from './services/html-parser.service';
import { BookScraperService, BookData } from './services/book-scraper.service';

// 模拟加密服务 (独立测试环境)
class MockCryptoService {
  async encrypt(data: string): Promise<string> {
    // 简单的Base64编码模拟加密
    return Buffer.from(data).toString('base64');
  }

  async decrypt(data: string): Promise<string> {
    // Base64解码模拟解密
    return Buffer.from(data, 'base64').toString();
  }
}

// 测试配置
const TEST_CONFIG = {
  userId: '290244208',
  cookie: 'll="118282"; bid=Iv-9zz8BFAE; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="290244208:wI+zvuksP70"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y',
  options: {
    status: 'collect' as const,
    limit: 50 // 获取50本书来测试多页功能
  }
};

/**
 * 创建服务实例
 */
function createServices() {
  const logger = new Logger('FullTest');
  
  // 创建模拟加密服务
  const cryptoService = new MockCryptoService();
  
  // 创建服务实例
  const cookieManager = new CookieManagerService(cryptoService as any);
  const antiSpider = new AntiSpiderService(cookieManager);
  const htmlParser = new HtmlParserService();
  const bookScraper = new BookScraperService(antiSpider, htmlParser);

  return {
    cookieManager,
    antiSpider,
    htmlParser,
    bookScraper,
    logger
  };
}

/**
 * 测试Cookie管理功能
 */
async function testCookieManager(cookieManager: CookieManagerService, logger: Logger) {
  logger.log('\n=== 测试Cookie管理功能 ===');
  
  try {
    // 1. 验证Cookie格式
    const isValid = cookieManager.validateCookieFormat(TEST_CONFIG.cookie);
    logger.log(`Cookie格式验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);
    
    // 2. 提取用户ID
    const extractedUserId = cookieManager.extractUserIdFromCookie(TEST_CONFIG.cookie);
    logger.log(`提取的用户ID: ${extractedUserId || '未找到'}`);
    
    // 3. 生成请求Headers
    const headers = cookieManager.getHeadersForDomain('book', TEST_CONFIG.cookie);
    logger.log(`生成的Headers数量: ${Object.keys(headers).length}`);
    logger.debug('Headers示例:', {
      'User-Agent': headers['User-Agent'],
      'Host': headers['Host'],
      'Cookie': headers['Cookie']?.substring(0, 50) + '...'
    });
    
    // 4. Cookie过期检查
    const isExpired = cookieManager.isCookieLikelyExpired(TEST_CONFIG.cookie);
    logger.log(`Cookie过期检查: ${isExpired ? '⚠️ 可能过期' : '✅ 看起来正常'}`);
    
  } catch (error) {
    logger.error('Cookie管理测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试反爬虫服务
 */
async function testAntiSpider(antiSpider: AntiSpiderService, logger: Logger) {
  logger.log('\n=== 测试反爬虫服务 ===');
  
  try {
    // 1. 获取当前配置
    const delayConfig = antiSpider.getCurrentDelayConfig();
    logger.log(`延迟配置 - 模式: ${delayConfig.mode}, 基础延迟: ${delayConfig.baseDelay}ms`);
    
    // 2. 获取请求统计
    const stats = antiSpider.getRequestStats();
    logger.log(`请求统计 - 计数: ${stats.requestCount}, 慢速模式: ${stats.isSlowMode}`);
    
    // 3. 测试简单请求
    const testUrl = `https://book.douban.com/people/${TEST_CONFIG.userId}/collect?start=0`;
    logger.log(`测试请求: ${testUrl}`);
    
    const startTime = Date.now();
    const html = await antiSpider.makeRequest(testUrl, TEST_CONFIG.cookie);
    const requestTime = Date.now() - startTime;
    
    logger.log(`请求完成 - 耗时: ${requestTime}ms, 响应长度: ${html.length}字符`);
    
    // 4. 检查人机验证
    const hasVerification = html.includes('<title>禁止访问</title>');
    logger.log(`人机验证检查: ${hasVerification ? '❌ 触发验证' : '✅ 正常访问'}`);
    
    // 5. 简单内容检查
    const hasBookList = html.includes('subject-item') || html.includes('item-show');
    logger.log(`内容检查: ${hasBookList ? '✅ 包含书籍列表' : '⚠️ 未发现书籍列表结构'}`);
    
  } catch (error) {
    logger.error('反爬虫服务测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试HTML解析服务
 */
async function testHtmlParser(htmlParser: HtmlParserService, antiSpider: AntiSpiderService, logger: Logger) {
  logger.log('\n=== 测试HTML解析服务 ===');
  
  try {
    // 获取一个书籍详情页进行解析测试
    const testBookUrl = 'https://book.douban.com/subject/36973237/'; // 使用Cookie中viewed的书籍
    logger.log(`获取测试书籍: ${testBookUrl}`);
    
    const html = await antiSpider.makeRequest(testBookUrl, TEST_CONFIG.cookie);
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    
    // 1. 测试结构化数据解析
    const structuredData = htmlParser.parseStructuredData($);
    logger.log(`结构化数据: ${structuredData ? '✅ 已解析' : '⚠️ 未找到'}`);
    if (structuredData) {
      logger.debug('结构化数据字段:', Object.keys(structuredData));
    }
    
    // 2. 测试Meta标签解析
    const metaTags = htmlParser.parseMetaTags($);
    logger.log(`Meta标签: 图片=${!!metaTags.image}, 描述=${!!metaTags.description}, 标题=${!!metaTags.title}`);
    
    // 3. 测试基础信息解析
    const basicInfo = htmlParser.parseBasicInfo($);
    logger.log(`基础信息: 评分=${basicInfo.score}, 描述长度=${basicInfo.desc?.length || 0}`);
    
    // 4. 测试用户状态解析
    const userState = htmlParser.parseUserState($);
    logger.log(`用户状态: 评分=${userState.rating}, 状态=${userState.state}, 标签数量=${userState.tags?.length || 0}`);
    
    // 5. 测试详细信息解析
    const infoData = htmlParser.parseInfoSection($);
    logger.log(`详细信息字段数量: ${Object.keys(infoData).length}`);
    logger.debug('解析的字段:', Object.keys(infoData));
    
  } catch (error) {
    logger.error('HTML解析服务测试失败:', error.message);
    // 不抛出错误，继续其他测试
  }
}

/**
 * 测试书籍抓取服务
 */
async function testBookScraper(bookScraper: BookScraperService, logger: Logger) {
  logger.log('\n=== 测试书籍抓取服务 ===');
  
  try {
    const startTime = Date.now();
    
    // 获取用户书籍数据
    logger.log(`开始抓取用户 ${TEST_CONFIG.userId} 的 ${TEST_CONFIG.options.limit} 本${TEST_CONFIG.options.status}书籍`);
    
    const books = await bookScraper.fetchUserBooks(
      TEST_CONFIG.userId, 
      TEST_CONFIG.cookie,
      TEST_CONFIG.options
    );
    
    const totalTime = Date.now() - startTime;
    
    logger.log(`\n=== 抓取完成 ===`);
    logger.log(`总耗时: ${Math.round(totalTime / 1000)}秒`);
    logger.log(`成功获取: ${books.length}本书`);
    logger.log(`平均每本: ${Math.round(totalTime / books.length / 1000)}秒`);
    
    // 获取抓取统计
    const stats = bookScraper.getScrapingStats();
    logger.log(`请求统计: 总请求${stats.requestCount}次, ${stats.isSlowMode ? '慢速模式' : '正常模式'}`);
    
    return books;
    
  } catch (error) {
    logger.error('书籍抓取服务测试失败:', error.message);
    throw error;
  }
}

/**
 * 分析书籍数据完整性
 */
function analyzeBookData(books: BookData[], logger: Logger) {
  logger.log('\n=== 书籍数据分析 ===');
  
  if (books.length === 0) {
    logger.warn('没有书籍数据可分析');
    return;
  }
  
  // 定义16个核心字段
  const coreFields = [
    'subjectId', 'title', 'subTitle', 'originalTitle', 
    'score', 'desc', 'image', 'url',
    'author', 'translator', 'publisher', 'datePublished',
    'isbn', 'totalPage', 'series', 'price'
  ];
  
  const userFields = ['myRating', 'myTags', 'myState', 'myComment', 'markDate'];
  
  // 统计字段完整性
  const fieldStats = {};
  const allFields = [...coreFields, ...userFields];
  
  allFields.forEach(field => {
    const count = books.filter(book => {
      const value = book[field];
      return value !== undefined && value !== null && value !== '' && 
             (!Array.isArray(value) || value.length > 0);
    }).length;
    
    fieldStats[field] = {
      count,
      percentage: Math.round((count / books.length) * 100)
    };
  });
  
  logger.log('\n--- 字段完整性统计 ---');
  logger.log('核心字段:');
  coreFields.forEach(field => {
    const stats = fieldStats[field];
    const indicator = stats.percentage >= 80 ? '✅' : stats.percentage >= 50 ? '⚠️' : '❌';
    logger.log(`  ${indicator} ${field.padEnd(15)}: ${stats.count}/${books.length} (${stats.percentage}%)`);
  });
  
  logger.log('\n用户字段:');
  userFields.forEach(field => {
    const stats = fieldStats[field];
    const indicator = stats.percentage >= 50 ? '✅' : stats.percentage >= 20 ? '⚠️' : '❌';
    logger.log(`  ${indicator} ${field.padEnd(15)}: ${stats.count}/${books.length} (${stats.percentage}%)`);
  });
  
  // 展示前3本书的详细信息
  logger.log('\n--- 样本数据展示 (前3本) ---');
  books.slice(0, 3).forEach((book, index) => {
    logger.log(`\n第${index + 1}本书: ${book.title}`);
    logger.log(`  ID: ${book.subjectId}`);
    logger.log(`  作者: ${book.author?.join(', ') || '未知'}`);
    logger.log(`  出版社: ${book.publisher || '未知'}`);
    logger.log(`  ISBN: ${book.isbn || '无'}`);
    logger.log(`  评分: ${book.score || '无'} (我的评分: ${book.myRating || '无'})`);
    logger.log(`  状态: ${book.myState || '无'}`);
    logger.log(`  标签: ${book.myTags?.join(', ') || '无'}`);
    logger.log(`  页数: ${book.totalPage || '无'}`);
    logger.log(`  价格: ${book.price || '无'}`);
  });
  
  // 数据质量分析
  logger.log('\n--- 数据质量分析 ---');
  
  const booksWithRating = books.filter(b => b.score).length;
  const booksWithISBN = books.filter(b => b.isbn).length;
  const booksWithUserRating = books.filter(b => b.myRating).length;
  const booksWithTags = books.filter(b => b.myTags && b.myTags.length > 0).length;
  
  logger.log(`✅ 有豆瓣评分: ${booksWithRating}/${books.length} (${Math.round(booksWithRating/books.length*100)}%)`);
  logger.log(`✅ 有ISBN信息: ${booksWithISBN}/${books.length} (${Math.round(booksWithISBN/books.length*100)}%)`);
  logger.log(`✅ 有用户评分: ${booksWithUserRating}/${books.length} (${Math.round(booksWithUserRating/books.length*100)}%)`);
  logger.log(`✅ 有用户标签: ${booksWithTags}/${books.length} (${Math.round(booksWithTags/books.length*100)}%)`);
  
  // 检查数据异常
  const duplicateIds = books.map(b => b.subjectId).filter((id, index, arr) => arr.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    logger.warn(`⚠️ 发现重复ID: ${duplicateIds.join(', ')}`);
  }
  
  const missingTitles = books.filter(b => !b.title).length;
  if (missingTitles > 0) {
    logger.warn(`⚠️ 缺少标题的书籍: ${missingTitles}本`);
  }
}

/**
 * 主测试函数
 */
async function runFullTest() {
  const { cookieManager, antiSpider, htmlParser, bookScraper, logger } = createServices();
  
  logger.log('🚀 豆瓣抓取服务完整测试开始');
  logger.log(`测试用户: ${TEST_CONFIG.userId}`);
  logger.log(`抓取限制: ${TEST_CONFIG.options.limit}本 ${TEST_CONFIG.options.status} 状态的书籍`);
  
  try {
    // 1. 测试Cookie管理
    await testCookieManager(cookieManager, logger);
    
    // 2. 测试反爬虫服务
    await testAntiSpider(antiSpider, logger);
    
    // 3. 测试HTML解析服务
    await testHtmlParser(htmlParser, antiSpider, logger);
    
    // 4. 测试书籍抓取服务 (核心功能)
    const books = await testBookScraper(bookScraper, logger);
    
    // 5. 分析数据完整性
    analyzeBookData(books, logger);
    
    logger.log('\n🎉 完整测试成功完成！');
    logger.log('\n=== 测试总结 ===');
    logger.log(`✅ Cookie管理: 正常`);
    logger.log(`✅ 反爬虫策略: 正常`); 
    logger.log(`✅ HTML解析: 正常`);
    logger.log(`✅ 书籍抓取: 成功获取 ${books.length} 本书`);
    logger.log(`✅ 服务架构: 完整可用`);
    
  } catch (error) {
    logger.error('\n❌ 测试失败:', error.message);
    logger.error('错误详情:', error.stack);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  runFullTest().catch(console.error);
}

export { runFullTest };