import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import axios, { AxiosInstance, AxiosError } from 'axios';

import { FeishuAuthService } from './feishu-auth.service';
import { 
  FeishuField, 
  FeishuRecord, 
  FeishuRecordItem, 
  FeishuApiResponse, 
  FeishuRecordsResponse,
  FeishuFieldType 
} from '../interfaces/feishu.interface';

/**
 * 飞书表格操作服务 - 多维表格CRUD操作
 * 
 * 功能:
 * - ~~Field ID映射和验证~~ **字段名映射和验证**
 * - 批量记录操作优化
 * - 增量同步支持
 * - 智能重试和错误恢复
 * - 表格结构缓存
 * - API限流和并发控制
 */
@Injectable()
export class FeishuTableService {
  private readonly logger = new Logger(FeishuTableService.name);
  private readonly httpClient: AxiosInstance;
  
  // 缓存配置
  private readonly cacheConfig = {
    fieldsTtl: 3600, // 字段结构缓存1小时
    recordsTtl: 300,  // 记录缓存5分钟
    fieldsKeyPrefix: 'feishu:fields:',
    recordsKeyPrefix: 'feishu:records:',
  };

  // API配置
  private readonly apiConfig = {
    baseUrl: 'https://open.feishu.cn',
    timeout: 60000, // 表格操作可能需要更长时间
    batchSize: 500, // 飞书API单批次最大记录数
    concurrentBatches: 3, // 并发批次数
    retryAttempts: 3,
    retryDelay: 2000,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: FeishuAuthService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.httpClient = this.createHttpClient();
  }

  /**
   * 创建HTTP客户端 - 专用于表格API
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: this.apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': `D2F-TableService/${this.configService.get('APP_VERSION', '1.0.0')}`,
      },
    });

    // 请求拦截器 - 自动添加认证头
    client.interceptors.request.use(async (config) => {
      // 认证头将在具体方法中添加，这里做统一日志记录
      const context = {
        method: config.method?.toUpperCase(),
        url: config.url,
        timestamp: new Date().toISOString(),
      };
      
      this.logger.debug('Feishu table API request:', context);
      return config;
    });

    // 响应拦截器 - 错误处理和重试
    client.interceptors.response.use(
      response => {
        this.logger.debug('Feishu table API response:', {
          status: response.status,
          url: response.config.url,
          responseCode: response.data?.code,
        });
        return response;
      },
      async (error: AxiosError) => {
        return this.handleApiError(error);
      }
    );

    return client;
  }

  /**
   * 获取表格字段信息 - 支持缓存
   */
  async getTableFields(
    appId: string, 
    appSecret: string, 
    appToken: string, 
    tableId: string
  ): Promise<FeishuField[]> {
    try {
      const cacheKey = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;
      
      // 尝试从缓存获取
      const cachedFields = await this.getCachedFields(cacheKey);
      if (cachedFields) {
        return cachedFields;
      }

      // 获取访问令牌
      const accessToken = await this.authService.getAccessToken(appId, appSecret);

      // 调用飞书API
      const response = await this.httpClient.get<FeishuApiResponse<{ items: FeishuField[] }>>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to get table fields: [${response.data.code}] ${response.data.msg}`);
      }

      const fields = response.data.data.items;
      
      // 缓存结果
      await this.cacheFields(cacheKey, fields);
      
      this.logger.log(`Retrieved ${fields.length} fields for table ${tableId}`);
      return fields;

    } catch (error) {
      this.logger.error(`Failed to get table fields for ${tableId}:`, error);
      throw this.transformError(error);
    }
  }

  /**
   * 批量创建记录 - 支持大批量数据和并发处理
   */
  async batchCreateRecords(
    appId: string,
    appSecret: string, 
    appToken: string,
    tableId: string,
    records: any[],
    fieldMappings?: Record<string, string>,
    options: {
      skipDuplicates?: boolean;
      validateFields?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ batch: number; error: string }>;
  }> {
    try {
      if (!records.length) {
        return { success: 0, failed: 0, errors: [] };
      }

      // 验证字段映射
      if (options.validateFields && fieldMappings) {
        await this.validateFieldMappings(appId, appSecret, appToken, tableId, fieldMappings);
      }

      // 转换记录格式
      const feishuRecords = records.map(record => 
        this.transformRecord(record, fieldMappings)
      );

      // 分批处理
      const batches = this.createBatches(feishuRecords, this.apiConfig.batchSize);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ batch: number; error: string }>,
      };

      this.logger.log(`Processing ${records.length} records in ${batches.length} batches`);

      // 并发处理批次
      const semaphore = new Array(this.apiConfig.concurrentBatches).fill(0);
      let batchIndex = 0;

      while (batchIndex < batches.length) {
        const currentBatches = [];
        
        for (let i = 0; i < this.apiConfig.concurrentBatches && batchIndex < batches.length; i++) {
          currentBatches.push({
            index: batchIndex,
            records: batches[batchIndex],
          });
          batchIndex++;
        }

        // 并发执行当前批次组
        const batchPromises = currentBatches.map(async ({ index, records: batchRecords }) => {
          try {
            await this.processSingleBatch(appId, appSecret, appToken, tableId, batchRecords);
            results.success += batchRecords.length;
            
            this.logger.debug(`Batch ${index + 1}/${batches.length} completed (${batchRecords.length} records)`);
            
            // 更新进度
            options.onProgress?.(results.success + results.failed, records.length);
            
            return { success: true, batch: index };
          } catch (error) {
            results.failed += batchRecords.length;
            results.errors.push({ batch: index + 1, error: error.message });
            
            this.logger.warn(`Batch ${index + 1} failed: ${error.message}`);
            return { success: false, batch: index };
          }
        });

        await Promise.allSettled(batchPromises);

        // 批次间延迟，避免过于频繁的请求
        if (batchIndex < batches.length) {
          await this.delay(1000 + Math.random() * 1000);
        }
      }

      this.logger.log(`Batch create completed: ${results.success} success, ${results.failed} failed`);
      return results;

    } catch (error) {
      this.logger.error('Batch create records failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * 查询记录 - 支持复杂条件查询
   */
  async searchRecords(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    options: {
      filter?: any;
      sort?: Array<{ field_id: string; desc?: boolean }>;
      pageSize?: number;
      pageToken?: string;
    } = {}
  ): Promise<{
    records: FeishuRecordItem[];
    hasMore: boolean;
    pageToken?: string;
    total?: number;
  }> {
    try {
      const accessToken = await this.authService.getAccessToken(appId, appSecret);

      const payload: any = {
        page_size: Math.min(options.pageSize || 100, 500),
      };

      if (options.filter) {
        payload.filter = options.filter;
      }

      if (options.sort) {
        payload.sort = options.sort;
      }

      if (options.pageToken) {
        payload.page_token = options.pageToken;
      }

      const response = await this.httpClient.post<FeishuApiResponse<FeishuRecordsResponse>>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Search records failed: [${response.data.code}] ${response.data.msg}`);
      }

      const data = response.data.data;
      return {
        records: data.items || [],
        hasMore: data.has_more || false,
        pageToken: data.page_token,
        total: data.total,
      };

    } catch (error) {
      this.logger.error('Search records failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * 根据Subject ID查找记录
   */
  async findRecordBySubjectId(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    subjectId: string,
    subjectIdFieldId: string
  ): Promise<FeishuRecordItem | null> {
    try {
      const searchResult = await this.searchRecords(appId, appSecret, appToken, tableId, {
        filter: {
          conditions: [{
            field_id: subjectIdFieldId,
            operator: 'is',
            value: subjectId,
          }],
        },
        pageSize: 1,
      });

      return searchResult.records[0] || null;

    } catch (error) {
      this.logger.error(`Failed to find record by subject ID ${subjectId}:`, error);
      throw this.transformError(error);
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken(appId, appSecret);

      const response = await this.httpClient.put<FeishuApiResponse>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        { fields },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Update record failed: [${response.data.code}] ${response.data.msg}`);
      }

      this.logger.debug(`Record ${recordId} updated successfully`);

    } catch (error) {
      this.logger.error(`Failed to update record ${recordId}:`, error);
      throw this.transformError(error);
    }
  }

  /**
   * 批量更新记录
   */
  async batchUpdateRecords(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    updates: Array<{ recordId: string; fields: Record<string, any> }>
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ recordId: string; error: string }>;
  }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ recordId: string; error: string }>,
      };

      // 分批更新（飞书batch_update单批次最大500条）
      const batches = this.createBatches(updates, this.apiConfig.batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          await this.processBatchUpdate(appId, appSecret, appToken, tableId, batch);
          results.success += batch.length;
          
          this.logger.debug(`Update batch ${i + 1}/${batches.length} completed`);
          
        } catch (error) {
          // 如果批量更新失败，尝试逐个更新
          for (const update of batch) {
            try {
              await this.updateRecord(appId, appSecret, appToken, tableId, update.recordId, update.fields);
              results.success++;
            } catch (updateError) {
              results.failed++;
              results.errors.push({
                recordId: update.recordId,
                error: updateError.message,
              });
            }
          }
        }

        // 批次间延迟
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Batch update records failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    recordId: string
  ): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken(appId, appSecret);

      const response = await this.httpClient.delete<FeishuApiResponse>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Delete record failed: [${response.data.code}] ${response.data.msg}`);
      }

      this.logger.debug(`Record ${recordId} deleted successfully`);

    } catch (error) {
      this.logger.error(`Failed to delete record ${recordId}:`, error);
      throw this.transformError(error);
    }
  }

  // =============== 私有辅助方法 ===============

  /**
   * 处理单个创建批次
   */
  private async processSingleBatch(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    records: FeishuRecord[]
  ): Promise<void> {
    const accessToken = await this.authService.getAccessToken(appId, appSecret);

    const response = await this.httpClient.post<FeishuApiResponse>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
      { records },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Batch create failed: [${response.data.code}] ${response.data.msg}`);
    }
  }

  /**
   * 处理批量更新
   */
  private async processBatchUpdate(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    updates: Array<{ recordId: string; fields: Record<string, any> }>
  ): Promise<void> {
    const accessToken = await this.authService.getAccessToken(appId, appSecret);

    const records = updates.map(update => ({
      record_id: update.recordId,
      fields: update.fields,
    }));

    const response = await this.httpClient.post<FeishuApiResponse>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_update`,
      { records },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Batch update failed: [${response.data.code}] ${response.data.msg}`);
    }
  }

  /**
   * 转换记录格式
   */
  private transformRecord(record: any, fieldMappings?: Record<string, string>): FeishuRecord {
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      const fieldId = fieldMappings?.[key] || key;
      fields[fieldId] = this.formatFieldValue(value);
    }

    return { fields };
  }

  /**
   * 格式化字段值
   */
  private formatFieldValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // 文本字段
    if (typeof value === 'string') {
      return value.trim();
    }

    // 数字字段
    if (typeof value === 'number') {
      return value;
    }

    // 布尔字段
    if (typeof value === 'boolean') {
      return value;
    }

    // 日期字段 - 转换为时间戳（毫秒）
    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }

    // 数组字段 - 多选、人员等
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? item.trim() : item);
    }

    // 对象字段 - 复杂类型
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 验证字段映射
   */
  private async validateFieldMappings(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldMappings: Record<string, string>
  ): Promise<void> {
    try {
      const fields = await this.getTableFields(appId, appSecret, appToken, tableId);
      const validFieldIds = new Set(fields.map(f => f.field_id));

      const invalidMappings = [];
      for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        if (!validFieldIds.has(fieldId)) {
          invalidMappings.push(`${fieldName} -> ${fieldId}`);
        }
      }

      if (invalidMappings.length > 0) {
        throw new Error(`Invalid field mappings: ${invalidMappings.join(', ')}`);
      }

    } catch (error) {
      this.logger.error('Field mapping validation failed:', error);
      throw error;
    }
  }

  /**
   * 从缓存获取字段信息
   */
  private async getCachedFields(cacheKey: string): Promise<FeishuField[] | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Failed to get cached fields:', error);
    }
    return null;
  }

  /**
   * 缓存字段信息
   */
  private async cacheFields(cacheKey: string, fields: FeishuField[]): Promise<void> {
    try {
      await this.redis.setex(cacheKey, this.cacheConfig.fieldsTtl, JSON.stringify(fields));
    } catch (error) {
      this.logger.warn('Failed to cache fields:', error);
    }
  }

  /**
   * 创建数据批次
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API错误处理
   */
  private async handleApiError(error: AxiosError): Promise<any> {
    const context = {
      url: error.config?.url,
      status: error.response?.status,
      code: error.response?.data?.code,
      message: error.response?.data?.msg || error.message,
    };

    this.logger.error('Feishu table API error:', context);

    // 特定错误码的处理
    if (error.response?.data?.code) {
      const errorCode = error.response.data.code;
      
      // Token相关错误
      if ([99991663, 99991664, 99991665].includes(errorCode)) {
        this.logger.warn('Token error detected, clearing cache');
        // 这里可以清除对应的token缓存
      }
      
      // 限流错误
      if (errorCode === 1254) {
        this.logger.warn('Rate limit hit, implementing backoff');
        await this.delay(5000 + Math.random() * 5000);
      }
    }

    // 判断是否需要重试
    if (this.shouldRetryTableOperation(error)) {
      return this.retryTableRequest(error);
    }

    throw error;
  }

  /**
   * 判断表格操作是否需要重试
   */
  private shouldRetryTableOperation(error: AxiosError): boolean {
    if (!error.response) return true; // 网络错误重试

    const status = error.response.status;
    const errorCode = error.response?.data?.code;

    // 服务器错误或特定的可重试错误码
    return status >= 500 || errorCode === 1254; // 1254是限流错误
  }

  /**
   * 重试表格请求
   */
  private async retryTableRequest(error: AxiosError): Promise<any> {
    const config = error.config;
    if (!config) throw error;

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= this.apiConfig.retryAttempts) {
      throw error;
    }

    config.__retryCount += 1;

    // 指数退避延迟
    const delay = this.apiConfig.retryDelay * Math.pow(2, config.__retryCount - 1);
    await this.delay(delay);

    return this.httpClient.request(config);
  }

  /**
   * 转换错误格式
   */
  private transformError(error: any): Error {
    if (error.response?.data?.code) {
      const { code, msg } = error.response.data;
      return new Error(`Feishu Table API Error: [${code}] ${msg}`);
    }
    
    if (error.message) {
      return new Error(`Feishu Table Operation Failed: ${error.message}`);
    }
    
    return new Error('Unknown Feishu table operation error');
  }

  /**
   * 创建表格字段
   */
  async createTableField(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldName: string,
    fieldType: FeishuFieldType,
    description?: string
  ): Promise<FeishuField> {
    try {
      const accessToken = await this.authService.getAccessToken(appId, appSecret);

      const fieldConfig: any = {
        field_name: fieldName,
        type: fieldType,
      };

      // 添加特定类型的配置
      if (fieldType === FeishuFieldType.Rating) {
        fieldConfig.ui_type = 'Rating';
        fieldConfig.property = {
          formatter: '0',
          min: 1,
          max: 5,
          rating: {
            symbol: 'star'
          }
        };
      }

      // 添加描述（如果提供）
      if (description) {
        fieldConfig.description = {
          text: description,
        };
      }

      const response = await this.httpClient.post<FeishuApiResponse<FeishuField>>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        fieldConfig,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to create table field: [${response.data.code}] ${response.data.msg}`);
      }

      const newField = response.data.data;
      
      // 清除字段缓存，强制重新获取
      const cacheKey = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.del(cacheKey);
      
      this.logger.log(`Created field "${fieldName}" (${newField.field_id}) in table ${tableId}`);
      return newField;

    } catch (error) {
      this.logger.error(`Failed to create field "${fieldName}":`, error);
      throw this.transformError(error);
    }
  }

  /**
   * 批量创建表格字段
   */
  async batchCreateFields(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldsToCreate: Array<{
      fieldName: string;
      fieldType: FeishuFieldType;
      description?: string;
    }>
  ): Promise<FeishuField[]> {
    const createdFields: FeishuField[] = [];
    
    try {
      this.logger.log(`Creating ${fieldsToCreate.length} fields in table ${tableId}`);
      
      // 逐个创建字段（飞书不支持批量创建字段）
      for (const fieldConfig of fieldsToCreate) {
        try {
          const newField = await this.createTableField(
            appId,
            appSecret,
            appToken,
            tableId,
            fieldConfig.fieldName,
            fieldConfig.fieldType,
            fieldConfig.description
          );
          createdFields.push(newField);
          
          // 字段创建间隔，避免API限流
          await this.delay(1000);
          
        } catch (error) {
          this.logger.error(`Failed to create field "${fieldConfig.fieldName}":`, error);
          // 继续创建其他字段，不中断整个流程
        }
      }
      
      this.logger.log(`Successfully created ${createdFields.length}/${fieldsToCreate.length} fields`);
      return createdFields;
      
    } catch (error) {
      this.logger.error('Batch create fields failed:', error);
      throw this.transformError(error);
    }
  }

  /**
   * 获取表格操作统计信息
   */
  async getTableStats(appToken: string, tableId: string): Promise<any> {
    try {
      const pattern = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;
      const exists = await this.redis.exists(pattern);
      
      return {
        tableId,
        fieldsCached: exists > 0,
        cacheExpiry: exists > 0 ? await this.redis.ttl(pattern) : null,
      };
    } catch (error) {
      this.logger.error('Failed to get table stats:', error);
      return null;
    }
  }
}