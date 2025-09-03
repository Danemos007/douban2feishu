/**
 * 真实豆瓣数据同步 - 使用现有抓取服务
 */

import { NestFactory } from '@nestjs/core';
import { DoubanService } from './douban/douban.service';
import { AppModule } from './app.module';
import axios from 'axios';

// [SECURITY-FIX] 移除硬编码敏感信息 - 2025-08-31
// 使用环境变量获取配置信息，避免敏感信息泄露
const CONFIG = {
  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    appToken: process.env.FEISHU_APP_TOKEN || '',
    tables: {
      books: process.env.FEISHU_BOOKS_TABLE_ID || 'your_book_table_id',
      movies: process.env.FEISHU_MOVIES_TABLE_ID || 'your_movie_table_id',
      documentary: process.env.FEISHU_DOCUMENTARY_TABLE_ID || 'your_doc_table_id',
      tv: process.env.FEISHU_TV_TABLE_ID || 'your_tv_table_id'
    }
  }
};

// 完整字段映射 - 基于实际豆瓣数据结构
const FIELD_MAPPINGS = {
  books: {
    'subjectId': 'Subject ID',
    'title': '书名',
    'originalTitle': '副标题', // 原标题映射到副标题
    'authors': '作者', // authors数组需要处理
    'translators': '译者', // translators数组需要处理
    'publisher': '出版社',
    'publishDate': '出版年份',
    'isbn': 'ISBN',
    'pages': '页数',
    'price': '价格',
    'rating.average': '豆瓣评分', // 嵌套属性
    'userRating': '我的评分',
    'userTags': '我的标签', // 数组需要处理
    'userComment': '我的备注',
    'summary': '内容简介',
    'coverUrl': '封面图'
  },
  movies: {
    'subjectId': 'Subject ID',
    'title': '电影名',
    'originalTitle': '原名',
    'director': '导演',
    'actors': '主演',
    'screenwriter': '编剧',
    'genre': '类型',
    'releaseDate': '上映日期',
    'duration': '片长',
    'country': '制片国家',
    'language': '语言',
    'doubanRating': '豆瓣评分',
    'myRating': '我的评分',
    'myStatus': '我的状态',
    'myComment': '我的备注',
    'summary': '剧情简介',
    'cover': '海报',
    'watchDate': '观看日期',
    'markDate': '标记日期'
  },
  tv: {
    'subjectId': 'Subject ID',
    'title': '电视剧名',
    'originalTitle': '原名',
    'director': '导演',
    'actors': '主演',
    'screenwriter': '编剧',
    'genre': '类型',
    'releaseDate': '首播日期',
    'episodes': '集数',
    'duration': '单集片长',
    'country': '制片国家',
    'language': '语言',
    'doubanRating': '豆瓣评分',
    'myRating': '我的评分',
    'myStatus': '我的状态',
    'myComment': '我的备注',
    'summary': '剧情简介',
    'cover': '海报',
    'watchDate': '观看日期',
    'markDate': '标记日期'
  },
  documentary: {
    'subjectId': 'Subject ID',
    'title': '纪录片名',
    'originalTitle': '原名',
    'director': '导演',
    'releaseDate': '上映日期',
    'episodes': '集数',
    'duration': '片长',
    'country': '制片国家',
    'language': '语言',
    'doubanRating': '豆瓣评分',
    'myRating': '我的评分',
    'myStatus': '我的状态',
    'myComment': '我的备注',
    'summary': '剧情简介',
    'cover': '海报',
    'watchDate': '观看日期',
    'markDate': '标记日期'
  }
};

async function realDoubanDataSync(userCookie: string, userId: string = 'your_user_id') {
  console.log('🌟 真实豆瓣数据同步');
  console.log('====================');
  console.log(`👤 用户ID: ${userId}`);
  console.log('🎯 获取并同步您的真实豆瓣数据到飞书表格');
  console.log('');

  try {
    // Step 1: 初始化NestJS应用获取DoubanService
    console.log('🚀 初始化豆瓣抓取服务...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const doubanService = app.get(DoubanService);
    
    // Step 2: 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });
    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 飞书访问令牌获取成功');

    // Step 3: 获取真实豆瓣数据
    console.log('\n📚 抓取豆瓣书籍数据...');
    
    const bookData = await doubanService.fetchUserData({
      userId: userId,
      cookie: userCookie,
      category: 'books',
      limit: 50 // 获取50本书籍
    });
    
    console.log(`✅ 获取到 ${bookData.length} 本书籍数据`);

    // Step 4: 同步书籍数据到飞书
    if (bookData.length > 0) {
      console.log('\n📊 同步书籍数据到飞书表格...');
      
      for (const book of bookData.slice(0, 5)) { // 先同步前5本测试
        try {
          // 构建字段数据 - 不包含时间戳，正确处理各种数据类型
          const recordFields: any = {};
          
          Object.entries(FIELD_MAPPINGS.books).forEach(([doubanKey, feishuFieldName]) => {
            let value: any;
            
            // 处理嵌套属性（如 rating.average）
            if (doubanKey.includes('.')) {
              const keys = doubanKey.split('.');
              value = book;
              for (const key of keys) {
                value = value?.[key];
              }
            } else {
              value = (book as any)[doubanKey];
            }
            
            if (value !== undefined && value !== null && value !== '') {
              // 数组字段处理（authors, translators, userTags）
              if (Array.isArray(value)) {
                if (value.length > 0) {
                  recordFields[feishuFieldName] = value.join(', ');
                }
              }
              // 数值字段特殊处理
              else if (doubanKey.includes('Rating') || doubanKey.includes('rating')) {
                recordFields[feishuFieldName] = Number(value);
              } 
              // 日期字段特殊处理
              else if (doubanKey.includes('Date')) {
                if (value instanceof Date) {
                  recordFields[feishuFieldName] = value.toISOString().split('T')[0]; // YYYY-MM-DD格式
                } else {
                  recordFields[feishuFieldName] = String(value);
                }
              }
              // 普通文本字段
              else {
                recordFields[feishuFieldName] = String(value);
              }
            }
          });

          const record = { fields: recordFields };

          // 写入飞书表格
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
            const createdRecord = (writeResponse.data as any).data.record;
            console.log(`✅ 《${book.title}》 同步成功 (记录ID: ${createdRecord.record_id})`);
            console.log(`   📝 写入字段数: ${Object.keys(recordFields).length}/19`);
            
            // 显示部分数据预览
            if (book.authors && book.authors.length > 0) console.log(`   👤 作者: ${book.authors.join(', ')}`);
            if ((book as any).publisher) console.log(`   🏢 出版社: ${(book as any).publisher}`);
            if (book.userRating) console.log(`   ⭐ 我的评分: ${book.userRating}`);
          } else {
            console.log(`❌ 《${book.title}》 同步失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
          }

        } catch (syncError: any) {
          console.log(`❌ 《${book.title}》 同步异常: ${syncError.message}`);
        }

        // 防止API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Step 5: 后续处理电影、电视剧、纪录片数据
    console.log('\n🎬 准备处理电影/电视剧/纪录片数据...');
    console.log('（需要继续提供Cookie以获取更多数据）');

    await app.close();

  } catch (error: any) {
    console.error('💥 真实数据同步失败:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// 命令行使用方式
if (require.main === module) {
  const cookie = process.argv[2];
  const userId = process.argv[3] || 'your_user_id';
  
  if (!cookie) {
    console.log('❌ 请提供豆瓣Cookie');
    console.log('');
    console.log('使用方法:');
    console.log('npx ts-node src/real-douban-data-sync.ts "你的Cookie" "用户ID"');
    console.log('');
    console.log('示例:');
    console.log('npx ts-node src/real-douban-data-sync.ts "bid=abc;dbcl2=xyz;..." "your_user_id"');
    process.exit(1);
  }

  realDoubanDataSync(cookie, userId)
    .then(() => {
      console.log('\n🎉 真实豆瓣数据同步完成!');
    })
    .catch((error) => {
      console.error('\n💥 同步过程异常:', error);
      process.exit(1);
    });
}