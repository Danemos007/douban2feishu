import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

import { FeishuTableService } from './feishu-table.service';
import { FeishuField, FeishuFieldType } from '../interfaces/feishu.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { 
  DOUBAN_FIELD_MAPPINGS, 
  FIELD_TYPE_MAPPING,
  getDoubanFieldMapping,
  doubanFieldToChineseName
} from '../config/douban-field-mapping.config';

/**
 * 字段映射管理服务 V2 - 精确匹配 + 自动创建策略
 * 
 * 新策略:
 * 1. 豆瓣字段先映射为标准中文名（如: title → "书名"）
 * 2. 精确匹配飞书表格中的字段名
 * 3. 匹配不到的字段自动创建
 * 4. ~~建立Field ID绑定关系~~ **建立字段名绑定关系**
 * 5. ~~后续使用"认ID不认名"策略~~ **后续使用字段名匹配策略进行数据操作**
 */
@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);
  
  // 缓存配置
  private readonly cacheConfig = {
    mappingsTtl: 1800, // 映射缓存30分钟
    mappingsKeyPrefix: 'feishu:mappings_v2:',
  };

  constructor(
    private readonly tableService: FeishuTableService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 一键式字段映射配置 - 精确匹配 + 自动创建
   */
  async autoConfigureFieldMappings(
    userId: string,
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    dataType: 'books' | 'movies' | 'tv' | 'documentary'
  ): Promise<{
    mappings: Record<string, string>; // doubanField -> feishuFieldId
    matched: Array<{ doubanField: string; chineseName: string; fieldId: string }>;
    created: Array<{ doubanField: string; chineseName: string; fieldId: string }>;
    errors: Array<{ doubanField: string; chineseName: string; error: string }>;
  }> {
    try {
      this.logger.log(`Auto-configuring field mappings for ${dataType} in table ${tableId}`);

      // 1. 获取豆瓣字段标准配置
      const doubanFieldConfig = getDoubanFieldMapping(dataType);
      
      // 2. 获取飞书表格现有字段
      const existingFields = await this.tableService.getTableFields(
        appId, appSecret, appToken, tableId
      );
      
      // 3. 建立中文名 -> Field ID 映射
      const chineseNameToFieldId = new Map<string, string>();
      existingFields.forEach(field => {
        chineseNameToFieldId.set(field.field_name, field.field_id);
      });
      
      // 4. 处理每个豆瓣字段
      const mappings: Record<string, string> = {};
      const matched: Array<{ doubanField: string; chineseName: string; fieldId: string }> = [];
      const fieldsToCreate: Array<{ doubanField: string; chineseName: string; fieldType: FeishuFieldType; description: string }> = [];
      const errors: Array<{ doubanField: string; chineseName: string; error: string }> = [];
      
      for (const [doubanField, fieldConfig] of Object.entries(doubanFieldConfig)) {
        const chineseName = fieldConfig.chineseName;
        
        if (chineseNameToFieldId.has(chineseName)) {
          // 字段已存在，精确匹配成功
          const fieldId = chineseNameToFieldId.get(chineseName)!;
          mappings[doubanField] = fieldId;
          matched.push({ doubanField, chineseName, fieldId });
          
          this.logger.debug(`Matched field: ${doubanField} -> "${chineseName}" (${fieldId})`);
        } else {
          // 字段不存在，需要创建
          const feishuFieldType = FIELD_TYPE_MAPPING[fieldConfig.fieldType] || FeishuFieldType.Text;
          fieldsToCreate.push({
            doubanField,
            chineseName,
            fieldType: feishuFieldType,
            description: fieldConfig.description
          });
        }
      }
      
      // 5. 批量创建缺失的字段
      const created: Array<{ doubanField: string; chineseName: string; fieldId: string }> = [];
      
      if (fieldsToCreate.length > 0) {
        this.logger.log(`Creating ${fieldsToCreate.length} missing fields...`);
        
        try {
          const createdFields = await this.tableService.batchCreateFields(
            appId,
            appSecret,
            appToken,
            tableId,
            fieldsToCreate.map(config => ({
              fieldName: config.chineseName,
              fieldType: config.fieldType,
              description: config.description
            }))
          );
          
          // 映射创建成功的字段
          createdFields.forEach((field, index) => {
            const fieldConfig = fieldsToCreate[index];
            mappings[fieldConfig.doubanField] = field.field_id;
            created.push({
              doubanField: fieldConfig.doubanField,
              chineseName: fieldConfig.chineseName,
              fieldId: field.field_id
            });
            
            this.logger.debug(`Created field: ${fieldConfig.doubanField} -> "${fieldConfig.chineseName}" (${field.field_id})`);
          });
          
          // 处理创建失败的字段
          if (createdFields.length < fieldsToCreate.length) {
            const failedFields = fieldsToCreate.slice(createdFields.length);
            failedFields.forEach(config => {
              errors.push({
                doubanField: config.doubanField,
                chineseName: config.chineseName,
                error: 'Field creation failed'
              });
            });
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create some fields:', errorMessage);
          fieldsToCreate.forEach(config => {
            errors.push({
              doubanField: config.doubanField,
              chineseName: config.chineseName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
        }
      }
      
      // 6. 保存映射配置到数据库
      await this.saveFieldMappingsToDatabase(userId, appToken, tableId, mappings, dataType);
      
      // 7. 缓存映射结果
      await this.cacheFieldMappings(appToken, tableId, mappings);
      
      const result = { mappings, matched, created, errors };
      
      this.logger.log(`Field mapping configuration completed:`, {
        total: Object.keys(doubanFieldConfig).length,
        matched: matched.length,
        created: created.length,
        errors: errors.length
      });
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Auto-configure field mappings failed:', errorMessage);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取字段映射配置
   */
  async getFieldMappings(
    userId: string,
    appToken: string,
    tableId: string
  ): Promise<Record<string, string> | null> {
    try {
      // 1. 先从缓存获取
      const cached = await this.getCachedFieldMappings(appToken, tableId);
      if (cached) {
        return cached;
      }

      // 2. 从数据库获取
      const syncConfig = await this.prisma.syncConfig.findUnique({
        where: { userId },
      });

      if (!syncConfig?.tableMappings) {
        return null;
      }

      const tableMappings = syncConfig.tableMappings as any;
      const tableKey = `${appToken}:${tableId}`;
      
      if (tableMappings[tableKey]) {
        const mappings = tableMappings[tableKey];
        // 提取字段映射（排除元数据）
        const fieldMappings: Record<string, string> = {};
        Object.entries(mappings).forEach(([key, value]) => {
          if (!key.startsWith('_') && typeof value === 'string') {
            fieldMappings[key] = value;
          }
        });
        
        // 缓存结果
        await this.cacheFieldMappings(appToken, tableId, fieldMappings);
        return fieldMappings;
      }

      return null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get field mappings:', errorMessage);
      return null;
    }
  }

  /**
   * 手动设置字段映射（向后兼容）
   */
  async setFieldMappings(
    userId: string,
    appToken: string,
    tableId: string,
    mappings: Record<string, string>,
    dataType: 'books' | 'movies' | 'tv' | 'documentary'
  ): Promise<void> {
    try {
      // 验证映射的有效性
      await this.validateFieldMappings(mappings, dataType);

      // 保存到数据库
      await this.saveFieldMappingsToDatabase(userId, appToken, tableId, mappings, dataType);
      
      // 更新缓存
      await this.cacheFieldMappings(appToken, tableId, mappings);
      
      this.logger.log(`Manual field mappings saved for user ${userId}, table ${tableId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to set field mappings:', errorMessage);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取标准字段映射预览（不执行实际操作）
   */
  async previewFieldMappings(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    dataType: 'books' | 'movies' | 'tv' | 'documentary'
  ): Promise<{
    willMatch: Array<{ doubanField: string; chineseName: string; fieldId: string }>;
    willCreate: Array<{ doubanField: string; chineseName: string; fieldType: string; description: string }>;
    totalFields: number;
  }> {
    try {
      // 1. 获取豆瓣字段标准配置
      const doubanFieldConfig = getDoubanFieldMapping(dataType);
      
      // 2. 获取飞书表格现有字段
      const existingFields = await this.tableService.getTableFields(
        appId, appSecret, appToken, tableId
      );
      
      // 3. 分析匹配结果
      const chineseNameToFieldId = new Map<string, string>();
      existingFields.forEach(field => {
        chineseNameToFieldId.set(field.field_name, field.field_id);
      });
      
      const willMatch: Array<{ doubanField: string; chineseName: string; fieldId: string }> = [];
      const willCreate: Array<{ doubanField: string; chineseName: string; fieldType: string; description: string }> = [];
      
      for (const [doubanField, fieldConfig] of Object.entries(doubanFieldConfig)) {
        const chineseName = fieldConfig.chineseName;
        
        if (chineseNameToFieldId.has(chineseName)) {
          // 会匹配
          willMatch.push({
            doubanField,
            chineseName,
            fieldId: chineseNameToFieldId.get(chineseName)!
          });
        } else {
          // 会创建
          willCreate.push({
            doubanField,
            chineseName,
            fieldType: fieldConfig.fieldType,
            description: fieldConfig.description
          });
        }
      }
      
      return {
        willMatch,
        willCreate,
        totalFields: Object.keys(doubanFieldConfig).length
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to preview field mappings:', errorMessage);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  // =============== 私有方法 ===============

  /**
   * 保存映射配置到数据库
   */
  private async saveFieldMappingsToDatabase(
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
              strategy: 'exact_match_auto_create',
              updatedAt: new Date().toISOString(),
              version: '2.0',
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
              strategy: 'exact_match_auto_create',
              createdAt: new Date().toISOString(),
              version: '2.0',
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
   * 缓存字段映射
   */
  private async cacheFieldMappings(
    appToken: string,
    tableId: string,
    mappings: Record<string, string>
  ): Promise<void> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.setex(cacheKey, this.cacheConfig.mappingsTtl, JSON.stringify(mappings));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to cache field mappings:', errorMessage);
    }
  }

  /**
   * 从缓存获取字段映射
   */
  private async getCachedFieldMappings(
    appToken: string,
    tableId: string
  ): Promise<Record<string, string> | null> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to get cached field mappings:', errorMessage);
      return null;
    }
  }

  /**
   * 验证字段映射有效性
   */
  private async validateFieldMappings(
    mappings: Record<string, string>,
    dataType: 'books' | 'movies' | 'tv' | 'documentary'
  ): Promise<void> {
    const doubanFieldConfig = getDoubanFieldMapping(dataType);
    const requiredFields = Object.entries(doubanFieldConfig)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);

    // 检查必需字段
    const missingRequired = requiredFields.filter(field => !mappings[field]);
    if (missingRequired.length > 0) {
      throw new Error(`Missing required field mappings: ${missingRequired.join(', ')}`);
    }

    // 检查字段名有效性
    const invalidFields = Object.keys(mappings).filter(field => !doubanFieldConfig[field]);
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
   * 清除映射缓存
   */
  async clearMappingsCache(appToken: string, tableId: string): Promise<void> {
    try {
      const cacheKey = `${this.cacheConfig.mappingsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.del(cacheKey);
      this.logger.log(`Cleared field mappings cache for ${appToken}:${tableId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to clear field mappings cache:', errorMessage);
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
            strategy: mapping._metadata?.strategy || 'unknown',
            version: mapping._metadata?.version || '1.0',
            fieldCount,
            lastUpdated: mapping._metadata?.updatedAt,
          };
        }),
      };

      return stats;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get mapping stats:', errorMessage);
      return null;
    }
  }
}