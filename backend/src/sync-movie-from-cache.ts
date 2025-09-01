/**
 * 电影数据从缓存同步到飞书多维表格
 * 专门处理18个电影字段的数据写入
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface MovieData {
  subjectId: string;
  title: string;
  myStatus: string;
  type: string;
  genre?: string;  // 电影类型：剧情/动作/喜剧等
  coverImage?: string;
  doubanRating?: number;
  myComment?: string;
  duration?: string;
  releaseDate?: string;
  summary?: string;
  cast?: string;
  director?: string;
  writer?: string;
  country?: string;
  language?: string;
  myRating?: number;
  myTags?: string;
  markDate?: string;
}

// [SECURITY-FIX] 移除硬编码敏感信息 - 2025-08-31
// 使用环境变量获取配置信息，避免敏感信息泄露
const CONFIG = {
  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    appToken: process.env.FEISHU_APP_TOKEN || '',
    tableId: process.env.FEISHU_MOVIE_TABLE_ID || 'your_movie_table_id'
  }
};

// 电影18字段映射配置
const MOVIE_FIELD_MAPPINGS = {
  'subjectId': 'Subject ID',
  'myTags': '我的标签',
  'myStatus': '我的状态',
  'genre': '类型',
  'title': '电影名',
  'coverImage': '封面图',
  'doubanRating': '豆瓣评分',
  'myComment': '我的备注',
  'duration': '片长',
  'releaseDate': '上映日期',
  'summary': '剧情简介',
  'cast': '主演',
  'director': '导演',
  'writer': '编剧',
  'country': '制片地区',
  'language': '语言',
  'myRating': '我的评分',
  'markDate': '标记日期'
};

class MovieFeishuSync {
  private accessToken: string = '';

  async getAccessToken(): Promise<string> {
    console.log('🔑 获取飞书访问令牌...');
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });

    const responseData = response.data as any;
    if (responseData.code !== 0) {
      throw new Error(`获取飞书令牌失败: ${responseData.msg}`);
    }

    this.accessToken = responseData.tenant_access_token;
    console.log('✅ 飞书令牌获取成功');
    return this.accessToken;
  }

  async checkTableFields(): Promise<void> {
    console.log('🔍 检查电影表格字段配置...');
    
    try {
      const response = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      if (responseData.code !== 0) {
        console.log(`⚠️ 获取字段信息失败: ${responseData.msg}`);
        return;
      }

      const existingFields = responseData.data.items || [];
      console.log(`📋 表格现有字段数量: ${existingFields.length}`);

      // 检查18个必需字段的配置
      const expectedFields = Object.values(MOVIE_FIELD_MAPPINGS);
      const foundFields: string[] = [];
      const missingFields: string[] = [];

      expectedFields.forEach(expectedField => {
        const found = existingFields.find((field: any) => field.field_name === expectedField);
        if (found) {
          foundFields.push(`${expectedField} (${found.type})`);
        } else {
          missingFields.push(expectedField);
        }
      });

      console.log(`✅ 已配置字段 (${foundFields.length}/18):`);
      foundFields.forEach(field => console.log(`   - ${field}`));

      if (missingFields.length > 0) {
        console.log(`❌ 缺失字段 (${missingFields.length}):`);
        missingFields.forEach(field => console.log(`   - ${field}`));
        
        // 🔧 自动创建所有缺失字段
        await this.createMissingFields(missingFields);
        
        // 字段创建后重新检查
        console.log('\n🔄 字段创建完成，重新检查字段配置...');
        const recheckResponse = await axios.get(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const newExistingFields = (recheckResponse.data as any).data.items || [];
        console.log(`📋 更新后字段数量: ${newExistingFields.length}`);
      }

      // 显示完整字段列表供参考
      console.log('\n📊 表格所有字段:');
      existingFields.forEach((field: any) => {
        console.log(`   - "${field.field_name}" (${field.type})`);
      });

    } catch (error: any) {
      console.log(`⚠️ 检查字段配置时出错: ${error.message}`);
    }
  }

  async createMissingFields(missingFields: string[]): Promise<void> {
    console.log(`\n🔧 开始创建 ${missingFields.length} 个缺失字段...`);

    for (const fieldName of missingFields) {
      await this.createSingleField(fieldName);
      // 字段创建间隔，避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ 字段创建完成！');
  }

  async createSingleField(fieldName: string): Promise<void> {
    try {
      console.log(`\n➕ 创建字段: ${fieldName}`);
      
      let fieldConfig: any;

      // 根据字段名确定字段类型和配置
      switch (fieldName) {
        case '我的状态':
          fieldConfig = {
            field_name: '我的状态',
            type: 3, // 单选
            ui_type: 'SingleSelect',
            property: {
              options: [
                { name: '想看', color: 5 },
                { name: '看过', color: 0 }
              ]
            }
          };
          break;

        case '我的评分':
          fieldConfig = {
            field_name: '我的评分',
            type: 2, // 评分
            ui_type: 'Rating',
            property: {
              formatter: '0',
              min: 1,
              max: 5,
              rating: {
                symbol: 'star'
              }
            }
          };
          break;

        case '豆瓣评分':
          fieldConfig = {
            field_name: '豆瓣评分',
            type: 2, // 数字  
            ui_type: 'Number',
            property: {
              range: { min: 0, max: 10 },
              precision: 1
            }
          };
          break;

        case '封面图':
          fieldConfig = {
            field_name: '封面图',
            type: 15, // URL
            ui_type: 'Url'
          };
          break;

        case '标记日期':
          fieldConfig = {
            field_name: '标记日期',
            type: 5, // 日期时间
            ui_type: 'DateTime'
          };
          break;

        case '上映日期':
          fieldConfig = {
            field_name: '上映日期',
            type: 5, // 日期时间
            ui_type: 'DateTime'
          };
          break;

        // 文本字段
        case '我的标签':
        case '类型':
        case '电影名':
        case '我的备注':
        case '片长':
        case '上映日期':
        case '主演':
        case '导演':
        case '编剧':
        case '制片地区':
        case '语言':
          fieldConfig = {
            field_name: fieldName,
            type: 1, // 多行文本
            ui_type: 'Text'
          };
          break;

        case '剧情简介':
          fieldConfig = {
            field_name: '剧情简介',
            type: 1, // 多行文本
            ui_type: 'Text',
            property: {
              auto_wrap: true
            }
          };
          break;

        default:
          console.log(`⚠️ 未知字段类型: ${fieldName}`);
          return;
      }

      const createResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/fields`,
        fieldConfig,
        {
          headers: { 
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if ((createResponse.data as any).code === 0) {
        const newField = (createResponse.data as any).data.field;
        console.log(`✅ ${fieldName} 创建成功 (${newField.field_id})`);
        
        // 对于选择字段，显示选项
        if (fieldConfig.property?.options) {
          newField.property.options.forEach((opt: any) => {
            console.log(`   📋 ${opt.name} (${opt.id})`);
          });
        }
      } else {
        console.log(`❌ ${fieldName} 创建失败: ${(createResponse.data as any).msg}`);
      }

    } catch (error: any) {
      console.error(`💥 ${fieldName} 创建异常: ${error.message}`);
    }
  }

  async syncMovieToFeishu(movie: MovieData): Promise<boolean> {
    try {
      // 构建飞书记录数据
      const fields: any = {};
      
      // 映射所有字段
      for (const [key, feishuField] of Object.entries(MOVIE_FIELD_MAPPINGS)) {
        const value = (movie as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'coverImage') {
            // 封面图需要特殊格式
            fields[feishuField] = { link: value };
          } else if (key === 'markDate') {
            // 标记日期转换为时间戳
            const date = new Date(value);
            fields[feishuField] = date.getTime();
          } else if (key === 'releaseDate') {
            // 上映日期转换为时间戳
            try {
              // 处理多种日期格式: "2010-12-16", "2010", "1992-12-23"
              let dateValue = value;
              if (/^\d{4}$/.test(dateValue)) {
                // 只有年份，设置为该年1月1日
                dateValue = `${dateValue}-01-01`;
              } else if (/^\d{4}-\d{2}$/.test(dateValue)) {
                // 年-月，设置为该月1日
                dateValue = `${dateValue}-01`;
              }
              
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                fields[feishuField] = date.getTime();
                console.log(`   📅 上映日期转换: "${value}" → ${date.toISOString().split('T')[0]}`);
              } else {
                console.log(`   ⚠️ 跳过无效上映日期: "${value}"`);
              }
            } catch (error) {
              console.log(`   ⚠️ 上映日期转换失败: "${value}"`);
            }
          } else if (key === 'myStatus') {
            // 🔧 电影状态字段转换和验证逻辑
            const statusValue = String(value).trim();
            let chineseStatus = '';
            
            // 处理可能的英文状态（兼容性）或直接使用中文状态
            if (statusValue === 'collect') {
              chineseStatus = '看过';
              console.log(`   📋 电影状态转换: "${statusValue}" → "${chineseStatus}"`);
            } else if (statusValue === 'wish') {
              chineseStatus = '想看';
              console.log(`   📋 电影状态转换: "${statusValue}" → "${chineseStatus}"`);
            } else if (statusValue === '看过' || statusValue === '想看') {
              // 已经是正确的中文状态
              chineseStatus = statusValue;
              console.log(`   ✅ 电影状态已为中文: "${chineseStatus}"`);
            } else {
              console.log(`   ⚠️ 跳过无效电影状态: "${statusValue}"`);
              continue;
            }
            
            // 验证状态值
            const validMovieStatuses = ['想看', '看过'];
            if (validMovieStatuses.includes(chineseStatus)) {
              fields[feishuField] = chineseStatus;
            } else {
              console.log(`   ⚠️ 跳过无效状态值: "${chineseStatus}"`);
            }
          } else {
            fields[feishuField] = value;
          }
        }
      }

      console.log(`📝 准备同步《${movie.title}》- ${Object.keys(fields).length}个字段`);
      if (movie.myTags) console.log(`   🏷️ 标签: "${movie.myTags}"`);
      if (movie.myStatus) console.log(`   📊 状态: ${movie.myStatus}`);
      if (movie.myRating) console.log(`   ⭐ 评分: ${movie.myRating}`);

      // 发送到飞书
      const response = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${CONFIG.feishu.tableId}/records`,
        { fields },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const responseData = response.data as any;
      if (responseData.code !== 0) {
        console.log(`❌ 《${movie.title}》同步失败: ${responseData.msg}`);
        return false;
      }

      console.log(`✅ 《${movie.title}》同步成功`);
      return true;

    } catch (error: any) {
      console.log(`❌ 《${movie.title}》同步异常: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  console.log('🎬 电影数据从缓存同步到飞书');
  console.log('==============================');

  try {
    // 查找最新的电影缓存文件
    const cacheDir = path.join(__dirname, '../cache');
    const movieCacheFiles = fs.readdirSync(cacheDir)
      .filter(file => file.startsWith('movie-test-') && file.endsWith('.json'))
      .sort()
      .reverse(); // 最新的在前

    if (movieCacheFiles.length === 0) {
      console.log('❌ 未找到电影缓存文件');
      return;
    }

    const latestCacheFile = movieCacheFiles[0];
    const cacheFilePath = path.join(cacheDir, latestCacheFile);
    
    console.log(`📁 使用缓存文件: ${latestCacheFile}`);
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    const movies = cacheData.detailedMovies || [];
    
    if (movies.length === 0) {
      console.log('❌ 缓存中没有电影数据');
      return;
    }

    console.log(`✅ 从缓存加载 ${movies.length} 部电影数据`);
    console.log(`📊 缓存统计: 总计${cacheData.totalMovies}部电影 (${cacheData.collectCount}看过 + ${cacheData.wishCount}想看)`);
    if (movies.length < cacheData.totalMovies) {
      console.log(`⚠️ 注意: 仅同步已详细解析的${movies.length}部电影 (剩余${cacheData.totalMovies - movies.length}部需要重新抓取)`);
    }

    // 初始化飞书同步器
    const feishuSync = new MovieFeishuSync();
    await feishuSync.getAccessToken();
    
    // 检查字段配置
    await feishuSync.checkTableFields();

    // 批量同步电影数据 (分批处理以避免超时)
    let successCount = 0;
    let failCount = 0;
    const BATCH_SIZE = 10; // 每批10部电影
    const totalBatches = Math.ceil(movies.length / BATCH_SIZE);

    console.log(`📦 将分 ${totalBatches} 批次处理，每批 ${BATCH_SIZE} 部电影`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, movies.length);
      const batch = movies.slice(startIndex, endIndex);
      
      console.log(`\n🔄 处理第 ${batchIndex + 1}/${totalBatches} 批次 (${startIndex + 1}-${endIndex})`);
      
      for (const movie of batch) {
        const success = await feishuSync.syncMovieToFeishu(movie);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // 避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 批次间稍作休息
      if (batchIndex < totalBatches - 1) {
        console.log(`⏸️ 批次间休息 2 秒...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n📊 同步完成: ✅${successCount} ❌${failCount}`);

  } catch (error: any) {
    console.error('💥 同步失败:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}