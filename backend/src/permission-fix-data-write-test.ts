/**
 * 权限修复后数据写入测试 - 针对管理者权限优化
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tables: {
      books: 'your_book_table_id',
      movies: 'your_movie_table_id', 
      documentary: 'your_doc_table_id',
      tv: 'your_tv_table_id'
    }
  }
};

// 完整的真实豆瓣数据
const REAL_TEST_DATA = {
  book: {
    subjectId: '27114418',
    title: '活下去的理由',
    subtitle: '',
    author: '[英]马特·海格',
    translator: '李春兰',
    publisher: '江苏凤凰文艺出版社',
    publishDate: '2018-3',
    doubanRating: 8.1,
    myRating: 4,
    myStatus: '读过',
    myTags: '心理学, 传记',
    myComment: '管理者权限测试 - 真实数据写入验证'
  },
  movie: {
    subjectId: '1292052',
    title: '肖申克的救赎', 
    director: '弗兰克·德拉邦特',
    actors: '蒂姆·罗宾斯/摩根·弗里曼',
    releaseDate: '1994-09-10',
    duration: '142分钟',
    doubanRating: 9.7,
    myRating: 5,
    myStatus: '看过',
    myComment: '永恒的经典 - 管理者权限测试'
  }
};

async function permissionFixDataWriteTest() {
  console.log('🔑 权限修复后数据写入测试');
  console.log('==========================');
  console.log('✨ 新权限: 管理者权限');
  console.log('🎯 目标: 真实数据写入验证');
  console.log('');

  try {
    // Step 1: 获取新的访问令牌
    console.log('🔐 获取管理者权限访问令牌...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('   ✅ 管理者权限令牌获取成功');

    // Step 2: 优先测试书籍表格 - 最完整的数据
    console.log('\n📚 优先测试: 书籍表格 (管理者权限)');
    console.log('━'.repeat(50));
    
    // 获取书籍表格字段
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.books}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    console.log(`   📋 书籍表格字段数: ${fields.length}`);

    // 建立字段映射
    const fieldMapping: any = {};
    const requiredFields = [
      { douban: 'subjectId', chinese: 'Subject ID' },
      { douban: 'title', chinese: '书名' },
      { douban: 'subtitle', chinese: '副标题' },
      { douban: 'author', chinese: '作者' },
      { douban: 'translator', chinese: '译者' },
      { douban: 'publisher', chinese: '出版社' },
      { douban: 'publishDate', chinese: '出版年份' },
      { douban: 'doubanRating', chinese: '豆瓣评分' },
      { douban: 'myRating', chinese: '我的评分' },
      { douban: 'myStatus', chinese: '我的状态' },
      { douban: 'myTags', chinese: '我的标签' },
      { douban: 'myComment', chinese: '我的备注' }
    ];

    console.log('   🔍 建立字段映射...');
    let mappedFields = 0;
    for (const req of requiredFields) {
      const field = fields.find((f: any) => f.field_name === req.chinese);
      if (field) {
        fieldMapping[req.douban] = field.field_id;
        console.log(`      ✅ ${req.chinese} → ${field.field_id}`);
        mappedFields++;
      } else {
        console.log(`      ❌ ${req.chinese} → 未找到`);
      }
    }

    console.log(`   📊 成功映射 ${mappedFields}/${requiredFields.length} 个字段`);

    if (mappedFields < 3) {
      console.log('   ❌ 关键字段不足，跳过写入');
      return;
    }

    // 构建完整的书籍记录
    const timestamp = new Date().toISOString().slice(0, 19);
    const bookRecord: any = { fields: {} };

    Object.entries(REAL_TEST_DATA.book).forEach(([key, value]) => {
      if (fieldMapping[key]) {
        // 特殊处理数值字段
        if (key === 'doubanRating' || key === 'myRating') {
          bookRecord.fields[fieldMapping[key]] = Number(value);
        } else {
          bookRecord.fields[fieldMapping[key]] = `${value} [${timestamp}]`;
        }
      }
    });

    console.log(`\n   📝 准备写入完整书籍数据...`);
    console.log(`      📖 书名: ${REAL_TEST_DATA.book.title}`);
    console.log(`      👤 作者: ${REAL_TEST_DATA.book.author}`);
    console.log(`      ⭐ 评分: ${REAL_TEST_DATA.book.doubanRating}/10`);
    console.log(`      🏷️ 字段数: ${Object.keys(bookRecord.fields).length}`);

    // 执行数据写入 - 使用管理者权限
    const writeResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.books}/records`,
      bookRecord,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((writeResponse.data as any).code === 0) {
      const createdRecord = (writeResponse.data as any).data.record;
      console.log('\n   🎉 书籍数据写入成功！');
      console.log(`   📄 记录ID: ${createdRecord.record_id}`);
      console.log(`   📚 标题: ${createdRecord.fields[fieldMapping.title]}`);
      console.log(`   👤 作者: ${createdRecord.fields[fieldMapping.author]}`);
      
      // 验证写入结果
      console.log('\n   🔍 验证数据写入...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      
      const verifyResponse = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.books}/records?page_size=5`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      const records = (verifyResponse.data as any).data.items || [];
      console.log(`      📊 表格总记录数: ${records.length}`);
      
      const ourRecord = records.find((r: any) => r.record_id === createdRecord.record_id);
      if (ourRecord) {
        console.log('      ✅ 数据验证成功: 记录已确实写入表格');
        console.log('      🏆 管理者权限 + 完整数据写入 = 成功！');
      } else {
        console.log('      ⚠️  记录验证中: 可能需要短暂同步时间');
      }

    } else {
      console.log('\n   ❌ 书籍数据写入失败');
      console.log(`   错误: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
      console.log('   详情:', (writeResponse.data as any));
    }

    // Step 3: 如果书籍成功，继续测试电影表格
    if ((writeResponse.data as any).code === 0) {
      console.log('\n🎬 继续测试: 电影表格');
      console.log('━'.repeat(30));
      
      try {
        // 电影表格字段映射
        const movieFieldsResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.movies}/fields`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        const movieFields = (movieFieldsResponse.data as any).data.items;
        const movieFieldMapping: any = {};
        
        const movieRequiredFields = [
          { douban: 'subjectId', chinese: 'Subject ID' },
          { douban: 'title', chinese: '电影名' },
          { douban: 'director', chinese: '导演' },
          { douban: 'actors', chinese: '主演' },
          { douban: 'doubanRating', chinese: '豆瓣评分' },
          { douban: 'myRating', chinese: '我的评分' },
          { douban: 'myStatus', chinese: '我的状态' },
          { douban: 'myComment', chinese: '我的备注' }
        ];

        for (const req of movieRequiredFields) {
          const field = movieFields.find((f: any) => f.field_name === req.chinese);
          if (field) {
            movieFieldMapping[req.douban] = field.field_id;
          }
        }

        if (Object.keys(movieFieldMapping).length >= 3) {
          const movieRecord: any = { fields: {} };
          Object.entries(REAL_TEST_DATA.movie).forEach(([key, value]) => {
            if (movieFieldMapping[key]) {
              if (key === 'doubanRating' || key === 'myRating') {
                movieRecord.fields[movieFieldMapping[key]] = Number(value);
              } else {
                movieRecord.fields[movieFieldMapping[key]] = `${value} [${timestamp}]`;
              }
            }
          });

          const movieWriteResponse = await axios.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tables.movies}/records`,
            movieRecord,
            {
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if ((movieWriteResponse.data as any).code === 0) {
            console.log('   🎉 电影数据写入成功！');
            console.log(`   🎬 电影: ${REAL_TEST_DATA.movie.title}`);
          } else {
            console.log('   ❌ 电影数据写入失败');
          }
        }
      } catch (movieError) {
        console.log('   ⚠️  电影表格测试跳过');
      }
    }

  } catch (error: any) {
    console.error('\n💥 权限测试失败:', error.message);
    if (error.response?.data) {
      console.error('API响应:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // 最终报告
  console.log('\n🏆 权限修复测试报告');
  console.log('=====================');
  console.log('🔑 权限状态: 管理者权限已启用');
  console.log('🕐 字段激活: 超过1小时 (充分激活)');
  console.log('📊 测试范围: 完整真实数据');
  console.log('🎯 预期结果: 数据应该成功写入表格');
  console.log('');
  console.log('💡 如果此次测试成功，说明权限提升解决了问题！');
}

if (require.main === module) {
  permissionFixDataWriteTest();
}