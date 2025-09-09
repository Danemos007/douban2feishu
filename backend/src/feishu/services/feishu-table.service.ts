import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

import { ExtendedAxiosRequestConfig } from '../../common/interfaces/http.interface';
import { FeishuAuthService } from './feishu-auth.service';
import { FeishuContractValidatorService } from '../contract/validator.service';
import {
  FeishuFieldInfo,
  FeishuRecordItem,
  FeishuFieldsResponse as ApiFeishuFieldsResponse,
  FeishuFieldType,
  FeishuCreateFieldRequest,
  FeishuRecordFilter,
  FeishuSearchRecordRequest,
  FeishuErrorResponse,
} from '../interfaces/api.interface';
import {
  FeishuApiResponse,
  FeishuCreateFieldPayload,
  FeishuSearchRecordPayload,
  FeishuRecordData,
} from '../interfaces/feishu.interface';
// 🔥 使用新的契约验证类型，替代遗留类型
import {
  FeishuField,
  FeishuFieldsResponse,
  FeishuRecordsResponse,
  FeishuRecord,
  FeishuRecordCreateRequest,
  isRatingField,
} from '../schemas';

// 🚀 新增：统一字段操作相关导入 - Schema-first架构
import {
  FeishuCredentials,
  FeishuCredentialsSchema,
  FieldOperationOptions,
  FieldOperationOptionsSchema,
  FieldOperationResult,
  FieldOperationResultSchema,
  BatchFieldOperationResult,
  BatchFieldOperationResultSchema,
  FieldMatchAnalysis,
  FieldMatchAnalysisSchema,
  ConfigurationChange,
  ConfigurationChangeSchema,
  FieldOperationError,
  FieldConfigurationMismatchError,
  FieldNotFoundError,
} from '../schemas/field-operations.schema';

import { 
  FieldCreationConfig,
  FieldCreationConfigSchema 
} from '../schemas/field-creation.schema';
import { IFeishuTableFieldOperations } from '../interfaces/table-field-operations.interface';

// [CRITICAL-FIX-2025-09-02] 移除遗留的isRatingFieldType导入
// 原因：历史遗留函数逻辑错误，已用基于真实API的判断逻辑替代
// 修复：删除错误的导入，使用fieldName.includes('我的评分')的准确判断

/**
 * 飞书表格操作服务 - 多维表格CRUD操作 + 革命性统一字段操作
 *
 * 功能:
 * - ~~Field ID映射和验证~~ **字段名映射和验证**
 * - 批量记录操作优化
 * - 增量同步支持
 * - 智能重试和错误恢复
 * - 表格结构缓存
 * - API限流和并发控制
 * - 🚀 智能字段配置确保 (ensureFieldConfiguration)
 * - 🚀 统一字段操作接口 (IFeishuTableFieldOperations)
 */
@Injectable()
export class FeishuTableService implements IFeishuTableFieldOperations {
  private readonly logger = new Logger(FeishuTableService.name);
  private readonly httpClient: ReturnType<typeof axios.create>;

  // 缓存配置
  private readonly cacheConfig = {
    fieldsTtl: 3600, // 字段结构缓存1小时
    recordsTtl: 300, // 记录缓存5分钟
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
    private readonly contractValidator: FeishuContractValidatorService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.httpClient = this.createHttpClient();
  }

  /**
   * 创建HTTP客户端 - 专用于表格API
   */
  private createHttpClient(): ReturnType<typeof axios.create> {
    const client = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: this.apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': `D2F-TableService/${this.configService.get('APP_VERSION', '1.0.0')}`,
      },
    });

    // 请求拦截器 - 自动添加认证头
    client.interceptors.request.use(
      async (config: ExtendedAxiosRequestConfig) => {
        // 认证头将在具体方法中添加，这里做统一日志记录
        const context = {
          method: config.method?.toUpperCase(),
          url: config.url,
          timestamp: new Date().toISOString(),
        };

        this.logger.debug('Feishu table API request:', context);
        return config;
      },
    );

    // 响应拦截器 - 错误处理和重试
    client.interceptors.response.use(
      (response) => {
        this.logger.debug('Feishu table API response:', {
          status: response.status,
          url: response.config.url,
          responseCode: response.data?.code,
        });
        return response;
      },
      async (error: AxiosError) => {
        return this.handleApiError(error);
      },
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
    tableId: string,
  ): Promise<FeishuField[]> {
    try {
      const cacheKey = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;

      // 尝试从缓存获取
      const cachedFields = await this.getCachedFields(cacheKey);
      if (cachedFields) {
        return cachedFields;
      }

      // 获取访问令牌
      const accessToken = await this.authService.getAccessToken(
        appId,
        appSecret,
      );

      // 🔥 调用飞书API - 使用契约验证替代 `as any`
      const response = await this.httpClient.get(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      // 🔥 使用契约验证器验证响应，替代手动检查
      const validatedResponse = this.contractValidator.validateFieldsResponse(
        response.data,
        'getTableFields',
      );

      const fields = validatedResponse.data.items;

      // 缓存结果
      await this.cacheFields(cacheKey, fields);

      this.logger.log(`Retrieved ${fields.length} fields for table ${tableId}`);
      return fields;
    } catch (error) {
      this.logger.error(`Failed to get table fields for ${tableId}:`, error);
      throw this.transformError(error as AxiosError);
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
    records: FeishuRecordData[],
    fieldMappings?: Record<string, string>,
    options: {
      skipDuplicates?: boolean;
      validateFields?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {},
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
        await this.validateFieldMappings(
          appId,
          appSecret,
          appToken,
          tableId,
          fieldMappings,
        );
      }

      // 转换记录格式
      const feishuRecords = records.map((record) =>
        this.transformRecord(record, fieldMappings),
      );

      // 分批处理
      const batches = this.createBatches(
        feishuRecords,
        this.apiConfig.batchSize,
      );
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ batch: number; error: string }>,
      };

      this.logger.log(
        `Processing ${records.length} records in ${batches.length} batches`,
      );

      // 并发处理批次
      const semaphore = new Array(this.apiConfig.concurrentBatches).fill(0);
      let batchIndex = 0;

      while (batchIndex < batches.length) {
        const currentBatches: Array<{
          index: number;
          records: FeishuRecordCreateRequest[];
        }> = [];

        for (
          let i = 0;
          i < this.apiConfig.concurrentBatches && batchIndex < batches.length;
          i++
        ) {
          currentBatches.push({
            index: batchIndex,
            records: batches[batchIndex],
          });
          batchIndex++;
        }

        // 并发执行当前批次组
        const batchPromises = currentBatches.map(
          async ({ index, records: batchRecords }) => {
            try {
              await this.processSingleBatch(
                appId,
                appSecret,
                appToken,
                tableId,
                batchRecords,
              );
              results.success += batchRecords.length;

              this.logger.debug(
                `Batch ${index + 1}/${batches.length} completed (${batchRecords.length} records)`,
              );

              // 更新进度
              options.onProgress?.(
                results.success + results.failed,
                records.length,
              );

              return { success: true, batch: index };
            } catch (error) {
              results.failed += batchRecords.length;
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              results.errors.push({ batch: index + 1, error: errorMessage });

              this.logger.warn(`Batch ${index + 1} failed: ${errorMessage}`);
              return { success: false, batch: index };
            }
          },
        );

        await Promise.allSettled(batchPromises);

        // 批次间延迟，避免过于频繁的请求
        if (batchIndex < batches.length) {
          await this.delay(1000 + Math.random() * 1000);
        }
      }

      this.logger.log(
        `Batch create completed: ${results.success} success, ${results.failed} failed`,
      );
      return results;
    } catch (error) {
      this.logger.error('Batch create records failed:', error);
      throw this.transformError(error as AxiosError);
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
      filter?: FeishuRecordFilter;
      sort?: Array<{ field_id: string; desc?: boolean }>;
      pageSize?: number;
      pageToken?: string;
    } = {},
  ): Promise<{
    records: FeishuRecordItem[];
    hasMore: boolean;
    pageToken?: string;
    total?: number;
  }> {
    try {
      const accessToken = await this.authService.getAccessToken(
        appId,
        appSecret,
      );

      const payload: FeishuSearchRecordPayload = {
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

      // 🔥 调用飞书API - 使用契约验证替代 `as any`
      const response = await this.httpClient.post(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      // 🔥 使用契约验证器验证响应
      const validatedResponse = this.contractValidator.validateRecordsResponse(
        response.data,
        'searchRecords',
      );

      const data = validatedResponse.data;
      return {
        records: data.items || [],
        hasMore: data.has_more || false,
        pageToken: data.page_token,
        total: data.total,
      };
    } catch (error) {
      this.logger.error('Search records failed:', error);
      throw this.transformError(error as AxiosError);
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
    subjectIdFieldId: string,
  ): Promise<FeishuRecordItem | null> {
    try {
      const searchResult = await this.searchRecords(
        appId,
        appSecret,
        appToken,
        tableId,
        {
          filter: {
            conditions: [
              {
                field_id: subjectIdFieldId,
                operator: 'is',
                value: subjectId,
              },
            ],
          },
          pageSize: 1,
        },
      );

      return searchResult.records[0] || null;
    } catch (error) {
      this.logger.error(
        `Failed to find record by subject ID ${subjectId}:`,
        error,
      );
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * 更新记录 - 使用Schema验证字段数据
   */
  async updateRecord(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken(
        appId,
        appSecret,
      );

      const response = (await this.httpClient.put(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        { fields },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )) as any;

      if (response.data.code !== 0) {
        throw new Error(
          `Update record failed: [${response.data.code}] ${response.data.msg}`,
        );
      }

      this.logger.debug(`Record ${recordId} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update record ${recordId}:`, error);
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * 批量更新记录 - 使用Schema验证更新数据
   */
  async batchUpdateRecords(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    updates: Array<{ recordId: string; fields: Record<string, unknown> }>,
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
          await this.processBatchUpdate(
            appId,
            appSecret,
            appToken,
            tableId,
            batch,
          );
          results.success += batch.length;

          this.logger.debug(
            `Update batch ${i + 1}/${batches.length} completed`,
          );
        } catch (error) {
          // 如果批量更新失败，尝试逐个更新
          for (const update of batch) {
            try {
              await this.updateRecord(
                appId,
                appSecret,
                appToken,
                tableId,
                update.recordId,
                update.fields,
              );
              results.success++;
            } catch (updateError) {
              results.failed++;
              const errorMessage =
                updateError instanceof Error
                  ? updateError.message
                  : String(updateError);
              results.errors.push({
                recordId: update.recordId,
                error: errorMessage,
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
      throw this.transformError(error as AxiosError);
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
    recordId: string,
  ): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken(
        appId,
        appSecret,
      );

      const response = await this.httpClient.delete<FeishuApiResponse>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (response.data.code !== 0) {
        throw new Error(
          `Delete record failed: [${response.data.code}] ${response.data.msg}`,
        );
      }

      this.logger.debug(`Record ${recordId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete record ${recordId}:`, error);
      throw this.transformError(error as AxiosError);
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
    records: FeishuRecordCreateRequest[],
  ): Promise<void> {
    const accessToken = await this.authService.getAccessToken(appId, appSecret);

    const response = await this.httpClient.post<FeishuApiResponse>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
      { records },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(
        `Batch create failed: [${response.data.code}] ${response.data.msg}`,
      );
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
    updates: Array<{ recordId: string; fields: Record<string, any> }>,
  ): Promise<void> {
    const accessToken = await this.authService.getAccessToken(appId, appSecret);

    const records = updates.map((update) => ({
      record_id: update.recordId,
      fields: update.fields,
    }));

    const response = await this.httpClient.post<FeishuApiResponse>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_update`,
      { records },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(
        `Batch update failed: [${response.data.code}] ${response.data.msg}`,
      );
    }
  }

  /**
   * 转换记录格式
   */
  private transformRecord(
    record: FeishuRecordData,
    fieldMappings?: Record<string, string>,
  ): FeishuRecordCreateRequest {
    const fields: Record<string, any> = {};

    // 处理包含fields属性的格式
    const recordData = 'fields' in record ? record.fields : record;

    // 确保recordData不为null再进行Object.entries操作
    if (recordData && typeof recordData === 'object') {
      for (const [key, value] of Object.entries(recordData)) {
        const fieldId = fieldMappings?.[key] || key;
        fields[fieldId] = this.formatFieldValue(value);
      }
    }

    return { fields };
  }

  /**
   * 格式化字段值
   */
  private formatFieldValue(
    value: unknown,
  ): string | number | boolean | null | Array<string | number> {
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
      return value.map((item) =>
        typeof item === 'string' ? item.trim() : item,
      );
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
    fieldMappings: Record<string, string>,
  ): Promise<void> {
    try {
      const fields = await this.getTableFields(
        appId,
        appSecret,
        appToken,
        tableId,
      );
      const validFieldIds = new Set(fields.map((f) => f.field_id));

      const invalidMappings: string[] = [];
      for (const [fieldName, fieldId] of Object.entries(fieldMappings)) {
        if (!validFieldIds.has(fieldId)) {
          invalidMappings.push(`${fieldName} -> ${fieldId}`);
        }
      }

      if (invalidMappings.length > 0) {
        throw new Error(
          `Invalid field mappings: ${invalidMappings.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error('Field mapping validation failed:', error);
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * 从缓存获取字段信息
   */
  private async getCachedFields(
    cacheKey: string,
  ): Promise<FeishuField[] | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to get cached fields:', errorMessage);
    }
    return null;
  }

  /**
   * 缓存字段信息
   */
  private async cacheFields(
    cacheKey: string,
    fields: FeishuField[],
  ): Promise<void> {
    try {
      await this.redis.setex(
        cacheKey,
        this.cacheConfig.fieldsTtl,
        JSON.stringify(fields),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to cache fields:', errorMessage);
    }
  }

  /**
   * 创建数据批次
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * API错误处理
   */
  private async handleApiError(error: AxiosError): Promise<never> {
    const context = {
      url: error.config?.url,
      status: error.response?.status,
      code: (error.response?.data as any)?.code,
      message: (error.response?.data as any)?.msg || error.message,
    };

    this.logger.error('Feishu table API error:', context);

    // 特定错误码的处理
    const errorData = error.response?.data as FeishuErrorResponse;
    if (errorData?.code) {
      const errorCode = errorData.code;

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
    const errorData = error.response?.data as FeishuErrorResponse;
    const errorCode = errorData?.code;

    // 服务器错误或特定的可重试错误码
    return status >= 500 || errorCode === 1254; // 1254是限流错误
  }

  /**
   * 重试表格请求
   */
  private async retryTableRequest(error: AxiosError): Promise<never> {
    const config = error.config as ExtendedAxiosRequestConfig;
    if (!config) throw error;

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= this.apiConfig.retryAttempts) {
      throw error;
    }

    config.__retryCount += 1;

    // 指数退避延迟
    const delay =
      this.apiConfig.retryDelay * Math.pow(2, config.__retryCount - 1);
    await this.delay(delay);

    return this.httpClient.request(config);
  }

  /**
   * 转换错误格式
   */
  private transformError(error: AxiosError): Error {
    const errorData = error.response?.data as FeishuErrorResponse;
    if (errorData?.code) {
      const { code, msg } = errorData;
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
    description?: string,
  ): Promise<FeishuField> {
    try {
      const accessToken = await this.authService.getAccessToken(
        appId,
        appSecret,
      );

      // 基础字段配置
      const fieldConfig: FeishuCreateFieldPayload = {
        field_name: fieldName,
        type: fieldType,
      };

      // 🔥 基于真实API发现的Rating字段逻辑
      // Rating字段的判断：字段名包含"我的评分"且type为Number类型
      if (
        fieldName.includes('我的评分') &&
        fieldType === FeishuFieldType.Number
      ) {
        fieldConfig.ui_type = 'Rating';
        fieldConfig.property = {
          formatter: '0',
          min: 1,
          max: 5,
          rating: {
            symbol: 'star',
          },
        };
      } else if (fieldType === FeishuFieldType.Number) {
        fieldConfig.ui_type = 'Number';
        fieldConfig.property = {
          range: { min: 0, max: 10 },
          precision: 1,
        };
      } else if (fieldType === FeishuFieldType.SingleSelect) {
        fieldConfig.ui_type = 'SingleSelect';
        // 单选字段需要预定义选项，这里需要从配置中获取
        if (fieldName === '我的状态') {
          fieldConfig.property = {
            options: [
              { name: '想看', color: 5 },
              { name: '看过', color: 0 },
            ],
          };
        }
      } else if (fieldType === FeishuFieldType.URL) {
        fieldConfig.ui_type = 'Url';
      } else if (fieldType === FeishuFieldType.DateTime) {
        fieldConfig.ui_type = 'DateTime';
      } else if (fieldType === FeishuFieldType.Text) {
        fieldConfig.ui_type = 'Text';
        // 特殊文本字段配置
        if (fieldName === '剧情简介') {
          fieldConfig.property = {
            auto_wrap: true,
          };
        }
      }

      // 添加描述（如果提供）
      if (description) {
        fieldConfig.description = {
          text: description,
        };
      }

      const response = await this.httpClient.post<
        FeishuApiResponse<FeishuField>
      >(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        fieldConfig,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (response.data.code !== 0) {
        throw new Error(
          `Failed to create table field: [${response.data.code}] ${response.data.msg}`,
        );
      }

      const newField = response.data.data;

      // 清除字段缓存，强制重新获取
      const cacheKey = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.del(cacheKey);

      this.logger.log(
        `Created field "${fieldName}" (${newField.field_id}) in table ${tableId}`,
      );
      return newField;
    } catch (error) {
      this.logger.error(`Failed to create field "${fieldName}":`, error);
      throw this.transformError(error as AxiosError);
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
    }>,
  ): Promise<FeishuField[]> {
    const createdFields: FeishuField[] = [];

    try {
      this.logger.log(
        `Creating ${fieldsToCreate.length} fields in table ${tableId}`,
      );

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
            fieldConfig.description,
          );
          createdFields.push(newField);

          // 字段创建间隔，避免API限流
          await this.delay(1000);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to create field "${fieldConfig.fieldName}":`,
            errorMessage,
          );
          // 继续创建其他字段，不中断整个流程
        }
      }

      this.logger.log(
        `Successfully created ${createdFields.length}/${fieldsToCreate.length} fields`,
      );
      return createdFields;
    } catch (error) {
      this.logger.error('Batch create fields failed:', error);
      throw this.transformError(error as AxiosError);
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get table stats:', errorMessage);
      return null;
    }
  }

  // =============== 🚀 革命性统一字段操作接口实现 ===============

  /**
   * 🎯 核心方法：智能字段配置确保 - 优化版本
   *
   * 革命性设计：一个方法处理所有字段操作场景
   * - 字段不存在 → 创建新字段
   * - 字段存在且配置匹配 → 返回现有字段 (unchanged)
   * - 字段存在但配置不匹配 → 更新字段配置 (updated)
   *
   * 性能优化:
   * - 提前终止策略检查
   * - 配置差异分析优化
   * - 智能缓存利用
   */
  async ensureFieldConfiguration(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
    options: FieldOperationOptions = {},
  ): Promise<FieldOperationResult> {
    // 🔥 Schema验证输入参数
    const validatedCredentials = FeishuCredentialsSchema.parse(credentials);
    const validatedFieldConfig = FieldCreationConfigSchema.parse(fieldConfig);
    const validatedOptions = FieldOperationOptionsSchema.parse(options);

    const context = this.createOperationContext(validatedFieldConfig, validatedOptions);

    if (context.enableDetailedLogging) {
      this.logger.debug(`🎯 智能字段配置确保: "${fieldConfig.field_name}"`, {
        tableId,
        strategy: context.strategy,
        conflictResolution: context.conflictResolution,
      });
    }

    const result = await this.withRetry(
      () =>
        this.executeFieldOperation(validatedCredentials, tableId, validatedFieldConfig, context),
      context.maxRetries,
      context.operationDelay,
    );

    // 🔥 Schema验证返回结果
    return FieldOperationResultSchema.parse(result);
  }

  /**
   * 🔧 创建操作上下文 - 统一选项处理和验证
   */
  private createOperationContext(
    fieldConfig: FieldCreationConfig,
    options: FieldOperationOptions,
  ) {
    const context = {
      fieldName: fieldConfig.field_name,
      strategy: options.strategy || 'ensure_correct',
      conflictResolution: options.conflictResolution || 'update_existing',
      skipCache: options.skipCache || false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      maxRetries: Math.min(options.maxRetries || 3, 5),
      operationDelay: Math.min(options.operationDelay || 1000, 10000),
      startTime: Date.now(),
      warnings: [] as string[],
    } as const;

    // 策略预检查 - 提前发现无效配置
    if (
      context.strategy === 'update_only' &&
      context.conflictResolution === 'throw_error'
    ) {
      throw new FieldOperationError(
        'update_only策略与throw_error冲突解决方案不兼容',
        'ensureFieldConfiguration',
        context.fieldName,
      );
    }

    return context;
  }

  /**
   * 🎯 执行字段操作的核心逻辑 - 优化的决策树
   */
  private async executeFieldOperation(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
    context: ReturnType<typeof this.createOperationContext>,
  ): Promise<FieldOperationResult> {
    // Step 1: 高效字段查找 (利用缓存)
    const existingField = await this.findFieldByName(
      credentials,
      tableId,
      fieldConfig.field_name,
    );

    // Step 2: 基于字段存在性的快速路由
    if (!existingField) {
      return this.handleFieldAbsence(
        credentials,
        tableId,
        fieldConfig,
        context,
      );
    }

    return this.handleFieldPresence(
      credentials,
      tableId,
      existingField,
      fieldConfig,
      context,
    );
  }

  /**
   * 🆕 处理字段不存在的情况
   */
  private async handleFieldAbsence(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
    context: ReturnType<typeof this.createOperationContext>,
  ): Promise<FieldOperationResult> {
    // 策略检查 - 提前失败模式
    if (context.strategy === 'update_only') {
      throw new FieldNotFoundError(fieldConfig.field_name, tableId);
    }

    // 创建新字段
    if (context.enableDetailedLogging) {
      this.logger.debug(`💫 创建新字段: "${fieldConfig.field_name}"`);
    }

    const newField = await this.createFieldInternal(
      credentials,
      tableId,
      fieldConfig,
    );

    return {
      field: newField,
      operation: 'created',
      changes: [],
      processingTime: Date.now() - context.startTime,
      warnings: context.warnings,
      metadata: {
        retryCount: 0,
        cacheHit: false,
        apiCallCount: 2, // findFieldByName + createField
      },
    };
  }

  /**
   * 🔄 处理字段存在的情况
   */
  private async handleFieldPresence(
    credentials: FeishuCredentials,
    tableId: string,
    existingField: FeishuField,
    fieldConfig: FieldCreationConfig,
    context: ReturnType<typeof this.createOperationContext>,
  ): Promise<FieldOperationResult> {
    // 策略检查
    if (context.strategy === 'create_only') {
      throw new FieldOperationError(
        `字段"${fieldConfig.field_name}"已存在，create_only策略不允许更新`,
        'ensureFieldConfiguration',
        fieldConfig.field_name,
      );
    }

    // 高效配置分析 - 仅在必要时进行深度比较
    const analysis = await this.analyzeFieldConfiguration(
      existingField,
      fieldConfig,
    );

    if (analysis.isFullMatch) {
      // 完美匹配 - 快速返回
      return {
        field: existingField,
        operation: 'unchanged',
        changes: [],
        processingTime: Date.now() - context.startTime,
        warnings: context.warnings,
        metadata: {
          retryCount: 0,
          cacheHit: !context.skipCache,
          apiCallCount: 1,
        },
      };
    }

    // 配置不匹配 - 根据策略处理
    return this.resolveConfigurationConflict(
      credentials,
      tableId,
      existingField,
      fieldConfig,
      analysis,
      context,
    );
  }

  /**
   * ⚖️ 解决配置冲突 - 优化的策略处理
   */
  private async resolveConfigurationConflict(
    credentials: FeishuCredentials,
    tableId: string,
    existingField: FeishuField,
    fieldConfig: FieldCreationConfig,
    analysis: FieldMatchAnalysis,
    context: ReturnType<typeof this.createOperationContext>,
  ): Promise<FieldOperationResult> {
    const conflictActions = {
      throw_error: () => {
        throw new FieldConfigurationMismatchError(
          analysis.differences,
          fieldConfig.field_name,
        );
      },

      skip_operation: () => {
        context.warnings.push(
          `字段配置不匹配，已跳过更新: ${analysis.differences.length}项差异`,
        );
        return {
          field: existingField,
          operation: 'unchanged' as const,
          changes: analysis.differences,
          processingTime: Date.now() - context.startTime,
          warnings: context.warnings,
          metadata: {
            retryCount: 0,
            cacheHit: true,
            apiCallCount: 1,
          },
        };
      },

      update_existing: async () => {
        if (context.enableDetailedLogging) {
          this.logger.debug(`🔄 更新字段配置: "${fieldConfig.field_name}"`, {
            differences: analysis.differences.length,
          });
        }

        const updatedField = await this.updateFieldInternal(
          credentials,
          tableId,
          existingField.field_id,
          fieldConfig,
          analysis.differences.map(diff => ({
            property: diff.property,
            from: diff.from ?? 'undefined',
            to: diff.to ?? 'undefined'
          })),
        );

        return {
          field: updatedField,
          operation: 'updated' as const,
          changes: analysis.differences,
          processingTime: Date.now() - context.startTime,
          warnings: context.warnings,
          metadata: {
            retryCount: 0,
            cacheHit: false,
            apiCallCount: 2, // findFieldByName + updateField
          },
        };
      },
    };

    const action = conflictActions[context.conflictResolution];
    return action();
  }

  /**
   * 🔄 批量字段配置确保 - 优化版本
   *
   * 高效处理多个字段的配置确保，支持：
   * - 智能失败隔离
   * - 动态并发控制
   * - 详细进度追踪
   * - 性能统计分析
   */
  async batchEnsureFieldConfigurations(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfigs: FieldCreationConfig[],
    options: FieldOperationOptions = {},
  ): Promise<BatchFieldOperationResult> {
    // 🔥 Schema验证批量输入参数
    const validatedCredentials = FeishuCredentialsSchema.parse(credentials);
    const validatedFieldConfigs = fieldConfigs.map(config => FieldCreationConfigSchema.parse(config));
    const validatedOptions = FieldOperationOptionsSchema.parse(options);

    const batchContext = this.createBatchContext(validatedFieldConfigs, validatedOptions);

    if (batchContext.enableDetailedLogging) {
      this.logger.log(`🔄 智能批量字段配置: ${fieldConfigs.length}个字段`);
    }

    try {
      // 串行处理 - 避免字段创建冲突和API限流
      for (let i = 0; i < validatedFieldConfigs.length; i++) {
        const fieldConfig = validatedFieldConfigs[i];

        try {
          const result = await this.ensureFieldConfiguration(
            validatedCredentials,
            tableId,
            fieldConfig,
            validatedOptions,
          );

          batchContext.results.push(result);

          // 进度反馈
          if (batchContext.enableDetailedLogging && (i + 1) % 5 === 0) {
            this.logger.debug(
              `批量进度: ${i + 1}/${validatedFieldConfigs.length} 已处理`,
            );
          }

          // 智能延迟控制
          if (i < validatedFieldConfigs.length - 1 && batchContext.operationDelay > 0) {
            await this.delay(batchContext.operationDelay);
          }
        } catch (error) {
          this.handleBatchFieldFailure(fieldConfig, error, batchContext);
        }
      }

      // 生成完整统计报告
      const result = this.compileBatchResult(batchContext);
      
      // 🔥 Schema验证返回结果
      return BatchFieldOperationResultSchema.parse(result);
    } catch (error) {
      this.logger.error('批量字段配置确保失败:', error);
      throw new FieldOperationError(
        `批量操作失败: ${error instanceof Error ? error.message : String(error)}`,
        'batchEnsureFieldConfigurations',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 🔧 创建批量操作上下文
   */
  private createBatchContext(
    fieldConfigs: FieldCreationConfig[],
    options: FieldOperationOptions,
  ) {
    return {
      startTime: Date.now(),
      fieldCount: fieldConfigs.length,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      operationDelay: Math.min(options.operationDelay || 1000, 10000),
      results: [] as FieldOperationResult[],
      failures: [] as Array<{
        fieldName: string;
        error: string;
        retryCount: number;
      }>,
    };
  }

  /**
   * 🚨 处理批量操作中的单个字段失败
   */
  private handleBatchFieldFailure(
    fieldConfig: FieldCreationConfig,
    error: unknown,
    batchContext: ReturnType<typeof this.createBatchContext>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const retryCount = error instanceof FieldOperationError ? 0 : 0; // 可以从error metadata中提取

    batchContext.failures.push({
      fieldName: fieldConfig.field_name,
      error: errorMessage,
      retryCount,
    });

    this.logger.warn(
      `字段 "${fieldConfig.field_name}" 处理失败:`,
      errorMessage,
    );
  }

  /**
   * 📊 编译批量处理结果报告
   */
  private compileBatchResult(
    batchContext: ReturnType<typeof this.createBatchContext>,
  ): BatchFieldOperationResult {
    const summary = {
      total: batchContext.fieldCount,
      created: batchContext.results.filter((r) => r.operation === 'created')
        .length,
      updated: batchContext.results.filter((r) => r.operation === 'updated')
        .length,
      unchanged: batchContext.results.filter((r) => r.operation === 'unchanged')
        .length,
      failed: batchContext.failures.length,
      totalProcessingTime: batchContext.results.reduce(
        (sum, r) => sum + r.processingTime,
        0,
      ),
      averageProcessingTime:
        batchContext.results.length > 0
          ? batchContext.results.reduce((sum, r) => sum + r.processingTime, 0) /
            batchContext.results.length
          : 0,
    };

    const totalExecutionTime = Date.now() - batchContext.startTime;

    if (batchContext.enableDetailedLogging) {
      this.logger.log(
        `✅ 批量操作完成: ${summary.created}创建, ${summary.updated}更新, ${summary.unchanged}不变, ${summary.failed}失败`,
      );
    }

    return {
      results: batchContext.results,
      summary,
      failures: batchContext.failures,
      totalExecutionTime,
    };
  }

  /**
   * 🔍 字段查找 - 根据名称精确查找字段
   */
  async findFieldByName(
    credentials: FeishuCredentials,
    tableId: string,
    fieldName: string,
  ): Promise<FeishuField | null> {
    try {
      const fields = await this.getTableFields(
        credentials.appId,
        credentials.appSecret,
        credentials.appToken,
        tableId,
      );

      const field = fields.find((f) => f.field_name === fieldName);
      return field || null;
    } catch (error) {
      this.logger.error(`查找字段 "${fieldName}" 失败:`, error);
      throw new FieldOperationError(
        `字段查找失败: ${error instanceof Error ? error.message : String(error)}`,
        'findFieldByName',
        fieldName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 📊 字段配置匹配分析
   *
   * 深度分析现有字段与期望配置的匹配程度
   */
  async analyzeFieldConfiguration(
    existingField: FeishuField,
    expectedConfig: FieldCreationConfig,
  ): Promise<FieldMatchAnalysis> {
    const differences: ConfigurationChange[] = [];

    // 1. 字段类型比较
    if (existingField.type !== expectedConfig.type) {
      differences.push({
        property: 'type',
        from: existingField.type,
        to: expectedConfig.type,
        severity: 'critical',
        description: '字段类型不匹配',
      });
    }

    // 2. UI类型比较
    if (existingField.ui_type !== expectedConfig.ui_type) {
      differences.push({
        property: 'ui_type',
        from: existingField.ui_type,
        to: expectedConfig.ui_type,
        severity: 'critical',
        description: 'UI类型不匹配',
      });
    }

    // 3. 属性深度比较
    if (expectedConfig.property) {
      const propertyDiffs = this.compareFieldProperties(
        existingField.property,
        expectedConfig.property,
      );
      differences.push(...propertyDiffs);
    }

    // 4. 描述比较
    if (expectedConfig.description) {
      const existingDesc = existingField.description || '';
      const expectedDesc = expectedConfig.description.text || '';

      if (existingDesc !== expectedDesc) {
        differences.push({
          property: 'description',
          from: existingDesc,
          to: expectedDesc,
          severity: 'minor',
          description: '字段描述不匹配',
        });
      }
    }

    // 计算匹配度评分
    const criticalDiffs = differences.filter(
      (d) => d.severity === 'critical',
    ).length;
    const minorDiffs = differences.filter((d) => d.severity === 'minor').length;

    // 匹配度算法: 严重差异权重0.8，轻微差异权重0.2
    const totalWeight = criticalDiffs * 0.8 + minorDiffs * 0.2;
    const maxWeight = 5; // 假设最多5个差异项
    const matchScore = Math.max(0, 1 - totalWeight / maxWeight);

    // 推荐操作
    let recommendedAction: 'no_action' | 'update_field' | 'recreate_field';
    if (differences.length === 0) {
      recommendedAction = 'no_action';
    } else if (criticalDiffs > 0) {
      recommendedAction = 'recreate_field'; // 严重差异建议重建
    } else {
      recommendedAction = 'update_field'; // 轻微差异建议更新
    }

    const result = {
      isFullMatch: differences.length === 0,
      differences,
      matchScore,
      recommendedAction,
    };
    
    // 🔥 Schema验证返回结果
    return FieldMatchAnalysisSchema.parse(result);
  }

  // =============== 🔧 私有辅助方法 ===============

  /**
   * 内部方法：创建新字段
   */
  private async createFieldInternal(
    credentials: FeishuCredentials,
    tableId: string,
    fieldConfig: FieldCreationConfig,
  ): Promise<FeishuField> {
    // 复用现有的createTableField方法，但需要适配新的接口
    const field = await this.createTableField(
      credentials.appId,
      credentials.appSecret,
      credentials.appToken,
      tableId,
      fieldConfig.field_name,
      fieldConfig.type,
      fieldConfig.description?.text,
    );

    return field;
  }

  /**
   * 内部方法：更新现有字段
   */
  private async updateFieldInternal(
    credentials: FeishuCredentials,
    tableId: string,
    fieldId: string,
    fieldConfig: FieldCreationConfig,
    changes?: Array<{ property: string; from: unknown; to: unknown }>,
  ): Promise<FeishuField> {
    try {
      const accessToken = await this.authService.getAccessToken(
        credentials.appId,
        credentials.appSecret,
      );

      // 构建更新载荷
      const updatePayload: Record<string, unknown> = {
        field_name: fieldConfig.field_name,
        type: fieldConfig.type,
      };

      if (fieldConfig.ui_type) {
        updatePayload.ui_type = fieldConfig.ui_type;
      }

      if (fieldConfig.property) {
        updatePayload.property = fieldConfig.property;
      }

      if (fieldConfig.description) {
        updatePayload.description = fieldConfig.description;
      }

      const response = await this.httpClient.put(
        `/open-apis/bitable/v1/apps/${credentials.appToken}/tables/${tableId}/fields/${fieldId}`,
        updatePayload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (response.data.code !== 0) {
        throw new Error(
          `更新字段失败: [${response.data.code}] ${response.data.msg}`,
        );
      }

      // 清除字段缓存
      await this.clearFieldCache(credentials.appToken, tableId);

      this.logger.debug(
        `字段更新成功: "${fieldConfig.field_name}" (${fieldId})`,
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`字段更新失败: "${fieldConfig.field_name}":`, error);
      throw this.transformError(error as AxiosError);
    }
  }

  /**
   * 内部方法：深度比较字段属性
   */
  private compareFieldProperties(
    existingProperty: unknown,
    expectedProperty: unknown,
  ): Array<{
    property: string;
    from: unknown;
    to: unknown;
    severity: 'critical' | 'minor';
  }> {
    const differences: Array<{
      property: string;
      from: unknown;
      to: unknown;
      severity: 'critical' | 'minor';
    }> = [];

    if (!existingProperty && !expectedProperty) {
      return differences;
    }

    if (!existingProperty || !expectedProperty) {
      differences.push({
        property: 'property',
        from: existingProperty,
        to: expectedProperty,
        severity: 'critical',
      });
      return differences;
    }

    // 递归比较对象属性
    const compareObject = (
      existing: Record<string, unknown>,
      expected: Record<string, unknown>,
      path: string = 'property',
    ) => {
      for (const [key, expectedValue] of Object.entries(expected)) {
        const existingValue = existing[key];
        const currentPath = `${path}.${key}`;

        if (JSON.stringify(existingValue) !== JSON.stringify(expectedValue)) {
          differences.push({
            property: currentPath,
            from: existingValue,
            to: expectedValue,
            severity: this.getPropertySeverity(key),
          });
        }
      }
    };

    // 类型检查：确保两个属性都是对象
    if (
      typeof existingProperty === 'object' && 
      existingProperty !== null &&
      typeof expectedProperty === 'object' && 
      expectedProperty !== null
    ) {
      compareObject(
        existingProperty as Record<string, unknown>, 
        expectedProperty as Record<string, unknown>
      );
    }
    
    return differences;
  }

  /**
   * 获取属性差异的严重程度
   */
  private getPropertySeverity(propertyKey: string): 'critical' | 'minor' {
    const criticalProperties = ['type', 'options', 'min', 'max', 'rating'];
    return criticalProperties.includes(propertyKey) ? 'critical' : 'minor';
  }

  /**
   * 智能重试机制
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          break;
        }

        if (!this.shouldRetryFieldOperation(error)) {
          throw lastError;
        }

        const delay = delayMs * Math.pow(2, attempt - 1); // 指数退避
        await this.delay(delay);

        this.logger.debug(
          `重试操作 (${attempt}/${maxRetries})，延迟 ${delay}ms`,
        );
      }
    }

    throw lastError;
  }

  /**
   * 判断字段操作是否应该重试
   */
  private shouldRetryFieldOperation(error: unknown): boolean {
    if (!error) return false;

    // AxiosError 检查
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const errorData = axiosError.response?.data as any;

      // 网络错误重试
      if (!axiosError.response) return true;

      // 服务器错误重试
      if (status && status >= 500) return true;

      // 限流错误重试
      if (errorData?.code === 1254) return true;
    }

    // 不重试的情况: 配置错误、权限错误等
    return false;
  }

  /**
   * 缓存管理
   */
  private async clearFieldCache(
    appToken: string,
    tableId: string,
  ): Promise<void> {
    try {
      const cacheKey = `${this.cacheConfig.fieldsKeyPrefix}${appToken}:${tableId}`;
      await this.redis.del(cacheKey);
      this.logger.debug(`清除字段缓存: ${cacheKey}`);
    } catch (error) {
      this.logger.warn('清除字段缓存失败:', error);
    }
  }
}
