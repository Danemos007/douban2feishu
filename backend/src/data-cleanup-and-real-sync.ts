/**
 * 数据清理和真实豆瓣数据同步
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

async function dataCleanupAndRealSync() {
  console.log('🧹 数据清理和真实豆瓣数据同步');
  console.log('===============================');
  console.log('🎯 目标: 清理测试数据，写入您的真实豆瓣数据');
  console.log('');

  try {
    // Step 1: 获取访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 访问令牌获取成功');

    // Step 2: 清理现有测试数据
    console.log('\n🧹 清理现有测试数据...');
    
    const tableIds = Object.values(CONFIG.feishu.tables);
    for (const tableId of tableIds) {
      try {
        // 获取现有记录
        const recordsResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${tableId}/records`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        const records = (recordsResponse.data as any).data.items || [];
        console.log(`   表格 ${tableId}: 找到 ${records.length} 条记录`);

        // 删除包含时间戳的测试记录
        for (const record of records) {
          const hasTestData = Object.values(record.fields).some((value: any) => 
            typeof value === 'string' && (value.includes('[17:') || value.includes('测试') || value.includes('系统诊断'))
          );

          if (hasTestData) {
            try {
              await axios.delete(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${tableId}/records/${record.record_id}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` }
                }
              );
              console.log(`   🗑️ 删除测试记录: ${record.record_id}`);
            } catch (deleteError) {
              console.log(`   ⚠️ 删除记录失败: ${record.record_id}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ 表格 ${tableId} 清理失败`);
      }
    }

    // Step 3: 等待用户提供真实豆瓣数据
    console.log('\n📋 准备写入真实豆瓣数据');
    console.log('=======================');
    console.log('');
    console.log('❗ 重要提醒:');
    console.log('   1. 我需要访问您的真实豆瓣数据（用户ID: your_user_id）');
    console.log('   2. 请提供您的豆瓣Cookie以获取真实的读书/观影记录');
    console.log('   3. 或者您可以直接告诉我具体要写入哪些书籍/电影/电视剧/纪录片');
    console.log('');
    console.log('🔧 接下来的步骤:');
    console.log('   1. 获取您的真实豆瓣数据');
    console.log('   2. 完善字段映射（包含所有19-20个字段）');
    console.log('   3. 清理时间戳，写入纯净数据');
    console.log('   4. 验证所有字段都正确写入');

    // Step 4: 显示完整字段映射
    console.log('\n📊 完整字段映射表');
    console.log('==================');
    
    const completeFieldMappings = {
      books: {
        'subjectId': 'Subject ID',
        'title': '书名',
        'subtitle': '副标题',
        'author': '作者', 
        'translator': '译者',
        'publisher': '出版社',
        'publishDate': '出版年份',
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
      }
    };

    Object.entries(completeFieldMappings).forEach(([type, mapping]) => {
      console.log(`\n${type === 'books' ? '📚 书籍' : '🎬 电影'}表格字段映射 (${Object.keys(mapping).length}字段):`);
      Object.entries(mapping).forEach(([key, value], index) => {
        console.log(`   ${(index + 1).toString().padStart(2, '0')}. ${key.padEnd(15)} → ${value}`);
      });
    });

  } catch (error: any) {
    console.error('💥 数据清理失败:', error.message);
  }

  console.log('\n🎯 下一步行动');
  console.log('==============');
  console.log('请您提供:');
  console.log('1. 豆瓣Cookie（用于获取真实数据）');
  console.log('2. 或者直接告诉我要写入的具体书籍/电影列表');
  console.log('3. 我将修复所有字段映射问题，确保完整数据写入');
}

if (require.main === module) {
  dataCleanupAndRealSync();
}