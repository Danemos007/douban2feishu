/**
 * 修复"我的状态"字段问题的专用脚本
 * 1. 删除现有的"我的状态"字段
 * 2. 重新创建干净的"我的状态"字段
 * 3. 测试数据写入（少量数据）
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

// 字段映射配置
const FIELD_MAPPINGS = {
  'subjectId': 'Subject ID',
  'title': '书名',
  'subtitle': '副标题', 
  'author': '作者',
  'translator': '译者',
  'publisher': '出版社',
  'publishDate': '出版年份',
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
 * 获取飞书访问令牌
 */
async function getAccessToken(): Promise<string> {
  console.log('🔑 获取飞书访问令牌...');
  const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: CONFIG.feishu.appId,
    app_secret: CONFIG.feishu.appSecret
  });

  const accessToken = (tokenResponse.data as any).tenant_access_token;
  console.log('✅ 飞书令牌获取成功');
  return accessToken;
}

/**
 * 获取现有字段信息
 */
async function getExistingFields(accessToken: string): Promise<any[]> {
  console.log('📋 获取现有字段信息...');
  const fieldsResponse = await axios.get(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const fields = (fieldsResponse.data as any).data.items;
  console.log(`📊 当前字段总数: ${fields.length}`);
  
  return fields;
}

/**
 * 删除"我的状态"字段
 */
async function deleteStatusField(accessToken: string): Promise<void> {
  try {
    console.log('🗑️ 开始删除"我的状态"字段...');
    
    const fields = await getExistingFields(accessToken);
    const statusField = fields.find((f: any) => f.field_name === '我的状态');
    
    if (!statusField) {
      console.log('⚠️ 未找到"我的状态"字段，无需删除');
      return;
    }

    console.log(`🎯 找到"我的状态"字段 ID: ${statusField.field_id}`);
    console.log(`📊 当前选项数量: ${statusField.property?.options?.length || 0}`);
    
    if (statusField.property?.options) {
      console.log('🔍 当前选项详情:');
      statusField.property.options.forEach((opt: any) => {
        console.log(`   - ${opt.name} (${opt.id})`);
      });
    }

    // 删除字段
    const deleteResponse = await axios.delete(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields/${statusField.field_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if ((deleteResponse.data as any).code === 0) {
      console.log('✅ "我的状态"字段删除成功');
    } else {
      console.log('❌ 字段删除失败:', (deleteResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 删除字段失败:', error.message);
  }
}

/**
 * 创建新的"我的状态"字段
 */
async function createCleanStatusField(accessToken: string): Promise<void> {
  try {
    console.log('➕ 创建全新的"我的状态"字段...');
    
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
        console.log(`   ✅ ${opt.name} (${opt.id}) - 颜色${opt.color}`);
      });
    } else {
      console.log('❌ 字段创建失败:', (createResponse.data as any).msg);
    }

  } catch (error: any) {
    console.error('💥 字段创建失败:', error.message);
  }
}

/**
 * 测试数据写入 - 只同步3本书
 */
async function testDataSync(accessToken: string): Promise<void> {
  try {
    console.log('🧪 测试数据写入 - 仅同步3本书...');
    
    // 从缓存加载数据
    const latestPath = path.join(__dirname, '../cache', 'douban-books-your_user_id-latest.json');
    const data = fs.readFileSync(latestPath, 'utf8');
    const books = JSON.parse(data) as DoubanBook[];
    
    // 只取前3本书进行测试
    const testBooks = books.slice(0, 3);
    console.log(`📚 测试书籍: ${testBooks.map(b => `《${b.title}》(${b.myStatus})`).join(', ')}`);
    
    let successCount = 0;
    let failCount = 0;

    for (const book of testBooks) {
      try {
        // 构建字段数据
        const recordFields: any = {};
        
        Object.entries(FIELD_MAPPINGS).forEach(([doubanKey, feishuFieldName]) => {
          const value = (book as any)[doubanKey];
          if (value !== undefined && value !== null && value !== '') {
            
            // 处理不同字段类型的数据格式
            if (feishuFieldName === '我的标签') {
              recordFields[feishuFieldName] = String(value);
            } 
            else if (feishuFieldName === '我的状态') {
              // ✅ 严格验证状态值
              const statusValue = String(value).trim();
              const validStatuses = ['想读', '在读', '读过'];
              if (validStatuses.includes(statusValue)) {
                recordFields[feishuFieldName] = statusValue;
                console.log(`   📋 状态字段写入格式: "${statusValue}" (已验证合法)`);
              } else {
                console.log(`   ⚠️ 跳过无效状态值: "${statusValue}" (不在合法范围内)`);
              }
            }
            else if (feishuFieldName === '我的评分') {
              const rating = Number(value);
              if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                recordFields[feishuFieldName] = rating;
              }
            }
            else if (feishuFieldName === '豆瓣评分') {
              recordFields[feishuFieldName] = Number(value);
            }
            else if (feishuFieldName === '标记日期') {
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
              const url = String(value);
              if (url.startsWith('http://') || url.startsWith('https://')) {
                recordFields[feishuFieldName] = { link: url };
              }
            }
            else {
              recordFields[feishuFieldName] = String(value);
            }
          }
        });

        console.log(`📝 准备同步《${book.title}》- ${Object.keys(recordFields).length}个字段`);
        
        const record = { fields: recordFields };

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

    console.log(`\n📊 测试完成: ✅${successCount} ❌${failCount}`);
    
  } catch (error: any) {
    console.error('💥 测试数据同步失败:', error.message);
  }
}

async function main() {
  console.log('🔧 修复"我的状态"字段问题');
  console.log('==============================');
  console.log('🎯 步骤: 删除现有字段 → 创建新字段 → 测试数据写入');
  console.log('');
  
  try {
    // 1. 获取访问令牌
    const accessToken = await getAccessToken();

    // 2. 显示当前字段状态
    console.log('\n📊 当前字段状态:');
    await getExistingFields(accessToken);

    // 3. 删除现有"我的状态"字段
    console.log('\n🗑️ 步骤1: 删除现有字段');
    await deleteStatusField(accessToken);

    // 4. 重新创建干净的"我的状态"字段
    console.log('\n➕ 步骤2: 创建新字段');
    await createCleanStatusField(accessToken);

    // 5. 测试数据写入
    console.log('\n🧪 步骤3: 测试数据写入');
    await testDataSync(accessToken);

    console.log('\n🎉 修复完成!')
    console.log('💡 请检查飞书表格中"我的状态"字段是否只有3个选项：想读、在读、读过');
    
  } catch (error: any) {
    console.error('💥 修复失败:', error.message);
  }
}

if (require.main === module) {
  main();
}