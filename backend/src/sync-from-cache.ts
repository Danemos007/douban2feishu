/**
 * 从缓存文件读取数据并同步到飞书
 * 专注测试飞书API，无需重复抓取豆瓣
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface DoubanBook {
  subjectId: string;
  title: string;
  subtitle?: string;
  author?: string;
  translator?: string;
  publisher?: string;
  publishDate?: string;
  pages?: string;
  price?: string;
  binding?: string;
  series?: string;
  isbn?: string;
  doubanRating?: number;
  myRating?: number;
  myStatus?: string;
  myTags?: string;
  myComment?: string;
  summary?: string;
  coverImage?: string;
  originalTitle?: string;
  markDate?: string;
}

const CONFIG = {
  feishu: {
    appId: 'cli_your_app_id_here',
    appSecret: 'your_app_secret_here',
    appToken: 'your_app_token_here',
    tableId: 'your_book_table_id'
  }
};

// 字段映射配置 (仅映射飞书表格中实际存在的字段)
const FIELD_MAPPINGS = {
  'subjectId': 'Subject ID',
  'title': '书名',
  'subtitle': '副标题', 
  'author': '作者',
  'translator': '译者',
  'publisher': '出版社',
  'publishDate': '出版年份',
  // 'pages': '页数',      // 飞书表格中不存在
  // 'price': '价格',      // 飞书表格中不存在
  // 'binding': '装帧',    // 飞书表格中不存在
  // 'series': '丛书',     // 飞书表格中不存在
  // 'isbn': 'ISBN',       // 飞书表格中不存在
  'doubanRating': '豆瓣评分',
  'myRating': '我的评分',
  'myStatus': '我的状态', 
  'myTags': '我的标签',
  'myComment': '我的备注',
  'summary': '内容简介',
  'coverImage': '封面图',
  'originalTitle': '原作名',
  'markDate': '标记日期'
};

/**
 * 从缓存文件加载数据
 */
function loadDataFromCache(userId: string): DoubanBook[] {
  const latestPath = path.join(__dirname, '../cache', `douban-books-${userId}-latest.json`);
  
  if (!fs.existsSync(latestPath)) {
    console.log('❌ 未找到缓存文件，请先运行数据抓取器');
    console.log(`📁 预期路径: ${latestPath}`);
    return [];
  }

  try {
    const data = fs.readFileSync(latestPath, 'utf8');
    const books = JSON.parse(data) as DoubanBook[];
    
    console.log(`✅ 从缓存加载 ${books.length} 本书籍数据`);
    console.log(`📁 缓存文件: ${latestPath}`);
    console.log(`📊 文件大小: ${Math.round(fs.statSync(latestPath).size / 1024)} KB`);
    
    return books;
  } catch (error: any) {
    console.log(`❌ 读取缓存失败: ${error.message}`);
    return [];
  }
}

/**
 * 确保"我的状态"字段存在，如不存在则创建
 */
async function ensureStatusField(accessToken: string): Promise<void> {
  try {
    console.log('\n🔍 检查"我的状态"字段...');
    
    // 获取现有字段
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    const statusField = fields.find((f: any) => f.field_name === '我的状态');
    
    if (statusField) {
      console.log('✅ "我的状态"字段已存在');
      return;
    }

    console.log('➕ 创建"我的状态"字段...');
    
    // 创建单选字段
    const createFieldData = {
      field_name: '我的状态',
      type: 3,
      ui_type: 'SingleSelect',
      property: {
        options: [
          {
            name: '想读',
            color: 5  // 粉色 💗
          },
          {
            name: '在读', 
            color: 4  // 薄荷绿 💚
          },
          {
            name: '读过',
            color: 0  // 蓝紫色 💜
          }
        ]
      }
    };

    const createResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      createFieldData,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if ((createResponse.data as any).code === 0) {
      const newField = (createResponse.data as any).data.field;
      console.log('✅ "我的状态"字段创建成功');
      console.log(`📋 字段ID: ${newField.field_id}`);
      console.log('📊 选项配置:');
      newField.property.options.forEach((opt: any) => {
        console.log(`   ✅ ${opt.name} (${opt.id})`);
      });
    } else {
      console.log('❌ 字段创建失败:', (createResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 字段检查/创建失败:', error.message);
  }
}

/**
 * 获取状态字段的选项映射
 */
async function getStatusFieldOptions(accessToken: string): Promise<{[key: string]: string}> {
  try {
    const fieldsResponse = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const fields = (fieldsResponse.data as any).data.items;
    const statusField = fields.find((f: any) => f.field_name === '我的状态');
    
    if (!statusField || !statusField.property?.options) {
      return {};
    }

    const mapping: {[key: string]: string} = {};
    
    // 🔧 只包含正确的状态选项，排除错误选项
    const validStatusOptions = ['想读', '在读', '读过'];
    statusField.property.options.forEach((opt: any) => {
      if (validStatusOptions.includes(opt.name)) {
        mapping[opt.name] = opt.id;
      } else {
        console.log(`⚠️ 跳过错误选项: ${opt.name} (${opt.id})`);
      }
    });

    console.log('📋 状态字段选项映射:');
    Object.entries(mapping).forEach(([name, id]) => {
      console.log(`   ${name} → ${id}`);
    });

    return mapping;
  } catch (error) {
    console.error('❌ 获取状态字段选项失败:', error);
    return {};
  }
}

/**
 * 飞书数据同步 (从robust版本复制)
 */
async function syncBooksToFeishu(books: DoubanBook[], accessToken: string, limit?: number): Promise<void> {
  const booksToSync = limit ? books.slice(0, limit) : books;
  console.log(`\n📊 开始同步 ${booksToSync.length} 本书籍到飞书表格...`);
  
  // 状态字段现在直接使用选项名称，无需映射
  await getStatusFieldOptions(accessToken); // 仅用于日志输出
  
  let successCount = 0;
  let failCount = 0;

  for (const book of booksToSync) {
    try {
      // 构建字段数据
      const recordFields: any = {};
      
      Object.entries(FIELD_MAPPINGS).forEach(([doubanKey, feishuFieldName]) => {
        const value = (book as any)[doubanKey];
        if (value !== undefined && value !== null && value !== '') {
          
          // 处理不同字段类型的数据格式
          if (feishuFieldName === '我的标签') {
            // 文本字段 - 直接使用原始标签文本
            recordFields[feishuFieldName] = String(value);
          } 
          else if (feishuFieldName === '我的状态') {
            // 单选字段 - 使用正确的字符串格式（选项名称）
            const statusValue = String(value).trim();
            // ✅ 添加严格验证，只允许合法值
            const validStatuses = ['想读', '在读', '读过'];
            if (validStatuses.includes(statusValue)) {
              recordFields[feishuFieldName] = statusValue;
              console.log(`   📋 状态字段写入格式: "${statusValue}" (已验证合法)`);
            } else {
              console.log(`   ⚠️ 跳过无效状态值: "${statusValue}" (不在合法范围内)`);
            }
          }
          else if (feishuFieldName === '我的评分') {
            // 评分字段 - 数字类型 (1-5)
            const rating = Number(value);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              recordFields[feishuFieldName] = rating;
            }
          }
          else if (feishuFieldName === '豆瓣评分') {
            // 数值字段
            recordFields[feishuFieldName] = Number(value);
          }
          else if (feishuFieldName === '标记日期') {
            // 日期字段 - 时间戳
            const dateStr = String(value);
            try {
              const timestamp = new Date(dateStr).getTime();
              if (!isNaN(timestamp)) {
                recordFields[feishuFieldName] = timestamp;
              }
            } catch (e) {
              console.log(`   ⚠️ 日期格式转换失败: ${dateStr}`);
            }
          }
          else if (feishuFieldName === '封面图') {
            // URL字段 - 使用正确的对象格式
            const url = String(value);
            if (url.startsWith('http://') || url.startsWith('https://')) {
              recordFields[feishuFieldName] = { link: url };
              console.log(`   🖼️ 封面图: ${JSON.stringify({ link: url })}`);
            }
          }
          else {
            // 普通文本字段
            recordFields[feishuFieldName] = String(value);
          }
        }
      });

      console.log(`📝 准备同步《${book.title}》- ${Object.keys(recordFields).length}个字段`);
      
      // 调试输出关键字段
      if (recordFields['我的标签']) console.log(`   🏷️ 标签: ${JSON.stringify(recordFields['我的标签'])}`);
      if (recordFields['我的状态']) console.log(`   📊 状态: ${recordFields['我的状态']}`);
      if (recordFields['我的评分']) console.log(`   ⭐ 评分: ${recordFields['我的评分']}`);

      const record = { fields: recordFields };

      // 🔍 调试：输出完整的API请求载荷
      console.log(`\n🔍 [DEBUG] 《${book.title}》完整API载荷:`);
      console.log('📤 Request Payload:', JSON.stringify(record, null, 2));
      
      // 特别检查状态字段
      if (recordFields['我的状态']) {
        console.log(`📋 [重点] 状态字段具体内容: ${JSON.stringify(recordFields['我的状态'])}`);
        console.log(`📋 [重点] 状态字段类型: ${typeof recordFields['我的状态']} ${Array.isArray(recordFields['我的状态']) ? '(Array)' : ''}`);
      }

      // 写入飞书
      const writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        record,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((writeResponse.data as any).code === 0) {
        console.log(`✅ 《${book.title}》同步成功`);
        successCount++;
      } else {
        console.log(`❌ 《${book.title}》同步失败: [${(writeResponse.data as any).code}] ${(writeResponse.data as any).msg}`);
        failCount++;
      }

    } catch (error: any) {
      console.log(`❌ 《${book.title}》同步异常: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 同步完成: ✅${successCount} ❌${failCount}`);
}

async function main() {
  console.log('🚀 从缓存同步到飞书 (全量同步版)');
  console.log('==============================');
  console.log('⚡ 优势: 无需重复抓取豆瓣，50本书籍完整同步');
  console.log('');
  
  const USER_ID = 'your_user_id';
  const SYNC_LIMIT = 50; // 全量同步：50本书籍
  
  try {
    // 1. 从缓存加载数据
    const books = loadDataFromCache(USER_ID);
    if (books.length === 0) {
      console.log('💡 请先运行: npm run fetch-douban');
      return;
    }

    // 2. 获取飞书访问令牌
    console.log('\n🔑 获取飞书访问令牌...');
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const accessToken = (tokenResponse.data as any).tenant_access_token;
    console.log('✅ 飞书令牌获取成功');

    // 2.5 确保字段存在
    await ensureStatusField(accessToken);

    // 3. 同步数据到飞书
    await syncBooksToFeishu(books, accessToken, SYNC_LIMIT);

    console.log('\n🎉 缓存同步完成!');
    console.log('💡 修改飞书字段配置后，可直接重新运行此脚本测试');
    
  } catch (error: any) {
    console.error('💥 同步失败:', error.message);
  }
}

if (require.main === module) {
  main();
}