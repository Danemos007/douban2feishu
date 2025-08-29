/**
 * 简单测试同步 - 只同步核心字段
 */

import axios from 'axios';

const CONFIG = {
  feishu: {
    appId: 'cli_a8f5de628bf5500e',
    appSecret: 'xc6jv0oKSkSkzhszgE661dE8xKefCQwb',
    appToken: 'BKoxbSycmarpbbsAsrrcsOEHnmh',
    tableId: 'tblj9s2409ur7Rrx'
  }
};

async function getAccessToken(): Promise<string> {
  const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });
  
  return response.data.tenant_access_token;
}

async function simpleTestSync() {
  console.log('=== 简单测试同步 ===');
  
  try {
    const token = await getAccessToken();
    
    // 1. 先创建"上映日期"字段
    console.log('➕ 创建上映日期字段...');
    try {
      await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          field_name: '上映日期',
          type: 1, // Text
          description: '上映日期，包含地区信息'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ 上映日期字段创建成功');
    } catch (error: any) {
      if (error.response?.data?.msg?.includes('already exists')) {
        console.log('ℹ️ 上映日期字段已存在');
      } else {
        console.log(`⚠️ 字段创建失败: ${error.response?.data?.msg || error.message}`);
      }
    }
    
    // 2. 获取最新字段列表
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const fields = fieldsResponse.data.data?.items || [];
    const fieldMap: Record<string, string> = {};
    
    console.log('\n📋 当前字段列表:');
    for (const field of fields) {
      fieldMap[field.field_name] = field.field_id;
      console.log(`- ${field.field_name} -> ${field.field_id}`);
    }

    // 3. 测试同步几部关键电影
    const testMovies = [
      {
        subjectId: '26766869',
        title: '鹬 Piper',
        myStatus: '看过',
        genre: '动画/短片',
        duration: '6分03秒',
        releaseDate: '2016-06-17(美国)',
        myRating: 5
      },
      {
        subjectId: '4739952',
        title: '初恋这件小事',
        myStatus: '看过', 
        genre: '剧情/喜剧/爱情',
        duration: '118分钟(泰国) / 100分钟(中国大陆)',
        releaseDate: '2012-06-05(中国大陆) / 2010-08-12(泰国)',
        myRating: 4
      },
      {
        subjectId: '3742360',
        title: '让子弹飞',
        myStatus: '看过',
        genre: '剧情/喜剧/动作/西部', 
        duration: '132分钟',
        releaseDate: '2010-12-16(中国大陆)',
        myRating: 5
      }
    ];

    console.log('\n📤 同步测试电影...');
    
    for (const [index, movie] of testMovies.entries()) {
      const recordData = {
        fields: {}
      };

      // 使用字段ID
      if (fieldMap['Subject ID']) recordData.fields[fieldMap['Subject ID']] = movie.subjectId;
      if (fieldMap['电影名']) recordData.fields[fieldMap['电影名']] = movie.title;
      if (fieldMap['我的状态']) recordData.fields[fieldMap['我的状态']] = movie.myStatus;
      if (fieldMap['类型']) recordData.fields[fieldMap['类型']] = movie.genre;
      if (fieldMap['片长']) recordData.fields[fieldMap['片长']] = movie.duration;
      if (fieldMap['上映日期']) recordData.fields[fieldMap['上映日期']] = movie.releaseDate;
      if (fieldMap['我的评分']) recordData.fields[fieldMap['我的评分']] = movie.myRating;

      try {
        console.log(`[${index + 1}] 同步《${movie.title}》...`);
        console.log(`  片长: ${movie.duration}`);
        console.log(`  上映日期: ${movie.releaseDate}`);
        
        const response = await axios.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
          recordData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ 成功同步《${movie.title}》`);
        
      } catch (error: any) {
        console.log(`❌ 同步失败《${movie.title}》: ${error.response?.data?.msg || error.message}`);
      }
      
      // 延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 4. 验证结果
    console.log('\n🔍 验证同步结果...');
    const recordsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records?page_size=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const records = recordsResponse.data.data?.items || [];
    console.log(`📊 表格中现有 ${records.length} 条记录`);
    
    if (records.length > 0) {
      console.log('\n🎬 记录详情:');
      for (const [index, record] of records.entries()) {
        const fields = record.fields;
        const title = fields[fieldMap['电影名']] || '未知';
        const duration = fields[fieldMap['片长']] || '无';
        const releaseDate = fields[fieldMap['上映日期']] || '无';
        console.log(`${index + 1}. ${title}`);
        console.log(`   片长: ${duration}`);
        console.log(`   上映日期: ${releaseDate}`);
        console.log('');
      }
    }

  } catch (error: any) {
    console.log(`❌ 测试失败: ${error.response?.data?.msg || error.message}`);
  }
}

simpleTestSync();