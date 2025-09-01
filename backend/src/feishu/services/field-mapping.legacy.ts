import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

import { FeishuTableService } from './feishu-table.service';
import { FeishuField, FeishuFieldType } from '../interfaces/feishu.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * ⚠️ 注意: 此服务包含智能匹配功能但未被生产环境调用，不会生效
 * 生产环境使用的是 FieldMappingService (精确匹配策略)
 * 
 * 
 * 核心功能:
 * - ~~自动字段ID映射发现~~ **自动字段名映射发现**（使用字段名匹配，非Field ID）
 * - 映射配置持久化存储
 * - 字段类型验证和转换
 * - 映射冲突检测和解决
 * - 批量映射操作优化
 */
@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);
  
  // 缓存配置
  private readonly cacheConfig = {
    mappingsTtl: 1800, // 映射缓存30分钟
    mappingsKeyPrefix: 'feishu:mappings:',
  };

  // 豆瓣数据字段标准定义
  private readonly doubanFieldDefinitions = {
    books: {
      subjectId: { type: 'text', required: true, description: '豆瓣书籍ID（唯一标识）' },
      title: { type: 'text', required: true, description: '书名' },
      subtitle: { type: 'text', required: false, description: '副标题' },
      author: { type: 'text', required: false, description: '作者' },
      translator: { type: 'text', required: false, description: '译者' },
      isbn: { type: 'text', required: false, description: 'ISBN' },
      publisher: { type: 'text', required: false, description: '出版社' },
      publishDate: { type: 'text', required: false, description: '出版日期' },
      pages: { type: 'number', required: false, description: '页数' },
      price: { type: 'text', required: false, description: '价格' },
      binding: { type: 'text', required: false, description: '装帧' },
      rating: { type: 'number', required: false, description: '评分' },
      ratingCount: { type: 'number', required: false, description: '评分人数' },
      tags: { type: 'multiSelect', required: false, description: '标签' },
      summary: { type: 'text', required: false, description: '内容简介' },
      coverUrl: { type: 'url', required: false, description: '封面图片URL' },
    },
    movies: {
      subjectId: { type: 'text', required: true, description: '豆瓣电影ID' },
      title: { type: 'text', required: true, description: '电影名' },
      originalTitle: { type: 'text', required: false, description: '原名' },
      directors: { type: 'text', required: false, description: '导演' },
      screenwriters: { type: 'text', required: false, description: '编剧' },
      actors: { type: 'text', required: false, description: '主演' },
      genres: { type: 'multiSelect', required: false, description: '类型' },
      countries: { type: 'text', required: false, description: '制片国家/地区' },
      languages: { type: 'text', required: false, description: '语言' },
      releaseDate: { type: 'text', required: false, description: '上映日期' },
      runtime: { type: 'text', required: false, description: '片长' },
      rating: { type: 'number', required: false, description: '评分' },
      ratingCount: { type: 'number', required: false, description: '评分人数' },
      imdbId: { type: 'text', required: false, description: 'IMDb ID' },
      tags: { type: 'multiSelect', required: false, description: '标签' },
      summary: { type: 'text', required: false, description: '剧情简介' },
      coverUrl: { type: 'url', required: false, description: '海报URL' },
      year: { type: 'number', required: false, description: '年份' },
    },
    tv: {
      subjectId: { type: 'text', required: true, description: '豆瓣剧集ID' },
      title: { type: 'text', required: true, description: '剧集名' },
      originalTitle: { type: 'text', required: false, description: '原名' },
      directors: { type: 'text', required: false, description: '导演' },
      screenwriters: { type: 'text', required: false, description: '编剧' },
      actors: { type: 'text', required: false, description: '主演' },
      genres: { type: 'multiSelect', required: false, description: '类型' },
      countries: { type: 'text', required: false, description: '制片国家/地区' },
      languages: { type: 'text', required: false, description: '语言' },
      firstAirDate: { type: 'text', required: false, description: '首播日期' },
      lastAirDate: { type: 'text', required: false, description: '结束日期' },
      episodeCount: { type: 'number', required: false, description: '集数' },
      runtime: { type: 'text', required: false, description: '单集长度' },
      rating: { type: 'number', required: false, description: '评分' },
      ratingCount: { type: 'number', required: false, description: '评分人数' },
      imdbId: { type: 'text', required: false, description: 'IMDb ID' },
      tags: { type: 'multiSelect', required: false, description: '标签' },
      summary: { type: 'text', required: false, description: '剧情简介' },
      coverUrl: { type: 'url', required: false, description: '海报URL' },
      year: { type: 'number', required: false, description: '年份' },
    },
  };

  constructor(
    private readonly tableService: FeishuTableService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 自动发现并创建字段映射
   */
  async discoverFieldMappings(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    dataType: 'books' | 'movies' | 'tv'
  ): Promise<{
    mappings: Record<string, string>;
    unmapped: string[];
    conflicts: Array<{ field: string; candidates: string[] }>;
    recommendations: Array<{ doubanField: string; feishuField: string; confidence: number }>;
  }> {
    try {
      // 获取飞书表格字段
      const feishuFields = await this.tableService.getTableFields(appId, appSecret, appToken, tableId);
      
      // 获取豆瓣字段定义
      const doubanFields = this.doubanFieldDefinitions[dataType];
      
      this.logger.log(`Discovering field mappings for ${dataType} with ${feishuFields.length} Feishu fields`);

      // 智能匹配算法
      const mappingResult = await this.intelligentFieldMatching(doubanFields, feishuFields);
      
      // 缓存映射结果
      await this.cacheMappings(appToken, tableId, mappingResult.mappings);
      
      this.logger.log(`Field discovery completed: ${Object.keys(mappingResult.mappings).length} mappings found`);
      
      return mappingResult;

    } catch (error) {
      this.logger.error('Field mapping discovery failed:', error);
      throw error;
    }
  }

  /**
   * 智能字段匹配算法
   */
  private async intelligentFieldMatching(
    doubanFields: Record<string, any>,
    feishuFields: FeishuField[]
  ): Promise<{
    mappings: Record<string, string>;
    unmapped: string[];
    conflicts: Array<{ field: string; candidates: string[] }>;
    recommendations: Array<{ doubanField: string; feishuField: string; confidence: number }>;
  }> {
    const mappings: Record<string, string> = {};
    const unmapped: string[] = [];
    const conflicts: Array<{ field: string; candidates: string[] }> = [];
    const recommendations: Array<{ doubanField: string; feishuField: string; confidence: number }> = [];

    // 创建飞书字段名称索引
    const feishuFieldIndex = new Map<string, FeishuField[]>();
    feishuFields.forEach(field => {
      const normalizedName = this.normalizeFieldName(field.field_name);
      if (!feishuFieldIndex.has(normalizedName)) {
        feishuFieldIndex.set(normalizedName, []);
      }
      feishuFieldIndex.get(normalizedName)!.push(field);
    });

    // 为每个豆瓣字段寻找最佳匹配
    for (const [doubanFieldName, doubanFieldDef] of Object.entries(doubanFields)) {
      const candidates = this.findFieldCandidates(doubanFieldName, doubanFieldDef, feishuFields);
      
      if (candidates.length === 0) {
        unmapped.push(doubanFieldName);
        continue;
      }
      
      if (candidates.length === 1) {
        const candidate = candidates[0];
        mappings[doubanFieldName] = candidate.field.field_id;
        recommendations.push({
          doubanField: doubanFieldName,
          feishuField: candidate.field.field_name,
          confidence: candidate.confidence,
        });
        continue;
      }
      
      // 多个候选者，选择置信度最高的
      candidates.sort((a, b) => b.confidence - a.confidence);
      const bestCandidate = candidates[0];
      
      if (bestCandidate.confidence >= 0.8) {
        mappings[doubanFieldName] = bestCandidate.field.field_id;
        recommendations.push({
          doubanField: doubanFieldName,
          feishuField: bestCandidate.field.field_name,
          confidence: bestCandidate.confidence,
        });
      } else {
        conflicts.push({
          field: doubanFieldName,
          candidates: candidates.map(c => `${c.field.field_name} (${(c.confidence * 100).toFixed(1)}%)`),
        });
        unmapped.push(doubanFieldName);
      }
    }

    return { mappings, unmapped, conflicts, recommendations };
  }

  /**
   * 寻找字段候选者
   */
  private findFieldCandidates(
    doubanFieldName: string,
    doubanFieldDef: any,
    feishuFields: FeishuField[]
  ): Array<{ field: FeishuField; confidence: number }> {
    const candidates: Array<{ field: FeishuField; confidence: number }> = [];

    for (const feishuField of feishuFields) {
      const confidence = this.calculateFieldSimilarity(
        doubanFieldName,
        doubanFieldDef,
        feishuField
      );
      
      if (confidence >= 0.3) { // 最低置信度阈值
        candidates.push({ field: feishuField, confidence });
      }
    }

    return candidates;
  }

  /**
   * 计算字段相似度
   */
  private calculateFieldSimilarity(
    doubanFieldName: string,
    doubanFieldDef: any,
    feishuField: FeishuField
  ): number {
    let confidence = 0;

    // 1. 字段名精确匹配 (权重: 0.4)
    const normalizedDoubanName = this.normalizeFieldName(doubanFieldName);
    const normalizedFeishuName = this.normalizeFieldName(feishuField.field_name);
    
    if (normalizedDoubanName === normalizedFeishuName) {
      confidence += 0.4;
    } else {
      // 名称相似度匹配
      const similarity = this.calculateStringSimilarity(normalizedDoubanName, normalizedFeishuName);
      confidence += similarity * 0.4;
    }

    // 2. 字段名包含关系 (权重: 0.25)
    const doubanKeywords = this.extractKeywords(doubanFieldName);
    const feishuKeywords = this.extractKeywords(feishuField.field_name);
    
    const keywordOverlap = this.calculateKeywordOverlap(doubanKeywords, feishuKeywords);
    confidence += keywordOverlap * 0.25;

    // 3. 字段类型匹配 (权重: 0.2)
    const typeMatch = this.isFieldTypeCompatible(doubanFieldDef.type, feishuField.type);
    if (typeMatch) {
      confidence += 0.2;
    }

    // 4. 描述匹配 (权重: 0.15)
    if (feishuField.description?.text) {
      const descSimilarity = this.calculateStringSimilarity(
        doubanFieldDef.description || '',
        feishuField.description.text
      );
      confidence += descSimilarity * 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 字段名标准化
   */
  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[_\-\s]+/g, '')
      .replace(/id$/i, 'id')
      .replace(/url$/i, 'url')
      .replace(/count$/i, 'count')
      .replace(/date$/i, 'date')
      .replace(/time$/i, 'time')
      .trim();
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const keywords = text
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'of', 'in', 'at', 'to', 'for'].includes(word));
    
    return [...new Set(keywords)]; // 去重
  }

  /**
   * 计算关键词重叠度
   */
  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.min(set1.size, set2.size);
  }

  /**
   * 计算字符串相似度 (Levenshtein Distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return (maxLen - distance) / maxLen;
  }

  /**
   * 检查字段类型兼容性
   */
  private isFieldTypeCompatible(doubanType: string, feishuType: number): boolean {
    const compatibilityMap: Record<string, number[]> = {
      text: [FeishuFieldType.Text, FeishuFieldType.URL],
      number: [FeishuFieldType.Number],
      url: [FeishuFieldType.URL, FeishuFieldType.Text],
      multiSelect: [FeishuFieldType.MultiSelect, FeishuFieldType.Text],
      singleSelect: [FeishuFieldType.SingleSelect, FeishuFieldType.Text],
      datetime: [FeishuFieldType.DateTime, FeishuFieldType.Text],
      checkbox: [FeishuFieldType.Checkbox],
    };

    return compatibilityMap[doubanType]?.includes(feishuType) || false;
  }

  /**
   * 手动设置字段映射
   */
  async setFieldMappings(
    userId: string,
    appToken: string,
    tableId: string,
    mappings: Record<string, string>,
    dataType: 'books' | 'movies' | 'tv'
  ): Promise<void> {
    try {
      // 验证映射的有效性
      await this.validateMappings(mappings, dataType);

      // 保存到数据库
      await this.saveMappingsToDatabase(userId, appToken, tableId, mappings, dataType);
      
      // 更新缓存
      await this.cacheMappings(appToken, tableId, mappings);
      
      this.logger.log(`Field mappings saved for user ${userId}, table ${tableId}`);

    } catch (error) {
      this.logger.error('Failed to set field mappings:', error);
      throw error;
    }
  }

  /**
   * 获取字段映射
   */
  async getFieldMappings(
    userId: string,
    appToken: string,
    tableId: string
  ): Promise<Record<string, string> | null> {
    try {
      // 先从缓存获取
      const cached = await this.getCachedMappings(appToken, tableId);
      if (cached) {
        return cached;
      }

      // 从数据库获取
      const syncConfig = await this.prisma.syncConfig.findUnique({
        where: { userId },
      });

      if (!syncConfig?.tableMappings) {
        return null;
      }

      const tableMappings = syncConfig.tableMappings as any;
      const tableKey = `${appToken}:${tableId}`;
      
      if (tableMappings[tableKey]) {
        // 缓存结果
        await this.cacheMappings(appToken, tableId, tableMappings[tableKey]);
        return tableMappings[tableKey];
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to get field mappings:', error);
      return null;
    }
  }

  /**
   * 验证映射有效性
   */
  private async validateMappings(
    mappings: Record<string, string>,
    dataType: 'books' | 'movies' | 'tv'
  ): Promise<void> {
    const doubanFields = this.doubanFieldDefinitions[dataType];
    const requiredFields = Object.entries(doubanFields)
      .filter(([_, def]) => def.required)
      .map(([field, _]) => field);

    // 检查必需字段
    const missingRequired = requiredFields.filter(field => !mappings[field]);
    if (missingRequired.length > 0) {
      throw new Error(`Missing required field mappings: ${missingRequired.join(', ')}`);
    }

    // 检查字段名有效性
    const invalidFields = Object.keys(mappings).filter(field => !doubanFields[field]);
    if (invalidFields.length > 0) {
      throw new Error(`Invalid douban field names: ${invalidFields.join(', ')}`);
    }

    // 检查Field ID格式
    const invalidFieldIds = Object.values(mappings).filter(fieldId => 
      !fieldId.match(/^fld[a-zA-Z0-9]{14,}$/)
    );
    if (invalidFieldIds.length > 0) {
      throw new Error(`Invalid Feishu field IDs: ${invalidFieldIds.join(', ')}`);
    }
  }

  /**
   * 保存映射到数据库
   */
  private async saveMappingsToDatabase(
    userId: string,
    appToken: string,
    tableId: string,
    mappings: Record<string, string>,
    dataType: string
  ): Promise<void> {
    const tableKey = `${appToken}:${tableId}`;
    
    await this.prisma.syncConfig.upsert({
      where: { userId },
      update: {
        tableMappings: {
          ...(await this.getExistingTableMappings(userId)),
          [tableKey]: {
            ...mappings,
            _metadata: {
              dataType,
              updatedAt: new Date().toISOString(),
              version: '1.0',
            },
          },
        },
      },
      create: {
        userId,
        tableMappings: {
          [tableKey]: {
            ...mappings,
            _metadata: {
              dataType,
              createdAt: new Date().toISOString(),
              version: '1.0',
            },
          },
        },
      },
    });
  }

  /**
   * 获取现有表格映射
   */
  private async getExistingTableMappings(userId: string): Promise<any> {
    const config = await this.prisma.syncConfig.findUnique({
      where: { userId },
      select: { tableMappings: true },
    });
    
    return config?.tableMappings || {};
  }

  /**
   * 缓存映射
   */
  private async cacheMappings(
    appToken: string,
    tableId: string,
    mappings: Record<string, string>
  ): Promise<void> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.setex(cacheKey, this.cacheConfig.mappingsTtl, JSON.stringify(mappings));
    } catch (error) {
      this.logger.warn('Failed to cache field mappings:', error);
    }
  }

  /**
   * 从缓存获取映射
   */
  private async getCachedMappings(
    appToken: string,
    tableId: string
  ): Promise<Record<string, string> | null> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Failed to get cached field mappings:', error);
      return null;
    }
  }

  /**
   * 清除映射缓存
   */
  async clearMappingsCache(appToken: string, tableId: string): Promise<void> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.del(cacheKey);
      this.logger.log(`Cleared field mappings cache for ${appToken}:${tableId}`);
    } catch (error) {
      this.logger.warn('Failed to clear field mappings cache:', error);
    }
  }

  /**
   * 获取字段映射统计
   */
  async getMappingStats(userId: string): Promise<any> {
    try {
      const syncConfig = await this.prisma.syncConfig.findUnique({
        where: { userId },
        select: { tableMappings: true },
      });

      if (!syncConfig?.tableMappings) {
        return { totalTables: 0, mappings: [] };
      }

      const tableMappings = syncConfig.tableMappings as any;
      const stats = {
        totalTables: Object.keys(tableMappings).length,
        mappings: Object.entries(tableMappings).map(([tableKey, mapping]: [string, any]) => {
          const [appToken, tableId] = tableKey.split(':');
          const fieldCount = Object.keys(mapping).filter(key => !key.startsWith('_')).length;
          
          return {
            appToken,
            tableId,
            dataType: mapping._metadata?.dataType,
            fieldCount,
            lastUpdated: mapping._metadata?.updatedAt,
          };
        }),
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get mapping stats:', error);
      return null;
    }
  }

  /**
   * 导出字段映射配置
   */
  async exportMappings(userId: string): Promise<any> {
    try {
      const syncConfig = await this.prisma.syncConfig.findUnique({
        where: { userId },
        select: { tableMappings: true },
      });

      return {
        userId,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        mappings: syncConfig?.tableMappings || {},
      };

    } catch (error) {
      this.logger.error('Failed to export mappings:', error);
      throw error;
    }
  }

  /**
   * 导入字段映射配置
   */
  async importMappings(userId: string, importData: any): Promise<void> {
    try {
      // 验证导入数据格式
      if (!importData.mappings || typeof importData.mappings !== 'object') {
        throw new Error('Invalid import data format');
      }

      // 逐个验证映射配置
      for (const [tableKey, mappings] of Object.entries(importData.mappings)) {
        if (typeof mappings !== 'object') continue;
        
        const dataType = (mappings as any)._metadata?.dataType;
        if (dataType && ['books', 'movies', 'tv'].includes(dataType)) {
          // 提取实际字段映射（排除元数据）
          const fieldMappings = Object.fromEntries(
            Object.entries(mappings).filter(([key]) => !key.startsWith('_'))
          );
          
          await this.validateMappings(fieldMappings, dataType as any);
        }
      }

      // 保存到数据库
      await this.prisma.syncConfig.upsert({
        where: { userId },
        update: {
          tableMappings: {
            ...(await this.getExistingTableMappings(userId)),
            ...importData.mappings,
          },
        },
        create: {
          userId,
          tableMappings: importData.mappings,
        },
      });

      // 清除相关缓存
      for (const tableKey of Object.keys(importData.mappings)) {
        const [appToken, tableId] = tableKey.split(':');
        if (appToken && tableId) {
          await this.clearMappingsCache(appToken, tableId);
        }
      }

      this.logger.log(`Field mappings imported for user ${userId}`);

    } catch (error) {
      this.logger.error('Failed to import mappings:', error);
      throw error;
    }
  }
}