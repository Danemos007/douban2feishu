import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { BatchCreateRecordsDto } from './dto/feishu.dto';
import {
  FeishuRecord,
  FeishuApiResponse,
  FeishuTokenResponse,
  FeishuRecordData,
  FeishuTableFieldsResponse,
  FeishuRecordsResponse,
  FeishuField,
  FeishuRecordItem,
} from './interfaces/feishu.interface';

/**
 * 飞书服务 - 飞书多维表格API集成
 *
 * 功能:
 * - 自动token管理
 * - 批量记录操作
 * - 字段映射转换
 * - API限流处理
 * - 错误重试机制
 */
@Injectable()
export class FeishuService {
  private readonly logger = new Logger(FeishuService.name);
  private readonly httpClient: AxiosInstance;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    this.httpClient = this.createHttpClient();
  }

  /**
   * 创建HTTP客户端
   */
  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.configService.get<string>(
        'FEISHU_BASE_URL',
        'https://open.feishu.cn',
      ),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(
    appId: string,
    appSecret: string,
  ): Promise<string> {
    const cacheKey = `${appId}:${appSecret}`;
    const cached = this.tokenCache.get(cacheKey);

    // 检查缓存是否有效 (提前5分钟过期)
    if (cached && cached.expiresAt > Date.now() + 300000) {
      return cached.token;
    }

    try {
      const response = await this.httpClient.post<
        FeishuApiResponse<FeishuTokenResponse>
      >('/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: appId,
        app_secret: appSecret,
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get access token: ${response.data.msg}`);
      }

      const token = response.data.data.tenant_access_token;
      const expiresAt = Date.now() + (response.data.data.expire - 300) * 1000; // 提前5分钟

      this.tokenCache.set(cacheKey, { token, expiresAt });

      this.logger.debug(`Access token obtained for app ${appId}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to get access token for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * 批量创建记录
   */
  async batchCreateRecords(
    dto: BatchCreateRecordsDto,
  ): Promise<{ success: number; failed: number }> {
    try {
      const token = await this.getAccessToken(dto.appId, dto.appSecret);

      let success = 0;
      let failed = 0;

      // 分批处理，每批最多500条记录
      const batchSize = 500;
      const batches = this.createBatches(dto.records, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        try {
          await this.processBatch(
            token,
            dto.appToken,
            dto.tableId,
            batch,
            dto.tableMapping,
          );
          success += batch.length;

          this.logger.log(
            `Batch ${i + 1}/${batches.length} processed successfully (${batch.length} records)`,
          );

          // API限流延迟
          if (i < batches.length - 1) {
            await this.delay(1000);
          }
        } catch (error) {
          this.logger.error(`Batch ${i + 1} failed:`, error);
          failed += batch.length;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error('Batch create records failed:', error);
      throw error;
    }
  }

  /**
   * 处理单个批次
   */
  private async processBatch(
    accessToken: string,
    appToken: string,
    tableId: string,
    records: FeishuRecordData[],
    tableMapping?: Record<string, string>,
  ): Promise<void> {
    // 转换记录格式
    const feishuRecords = records.map((record) =>
      this.transformRecord(record, tableMapping),
    );

    const response = await this.httpClient.post<FeishuApiResponse<void>>(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
      {
        records: feishuRecords,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.data.code !== 0) {
      throw new Error(`Batch create failed: ${response.data.msg}`);
    }
  }

  /**
   * 转换记录格式 - 映射字段名到Field ID
   */
  private transformRecord(
    record: FeishuRecordData,
    tableMapping?: Record<string, string>,
  ): FeishuRecord {
    const fields: Record<
      string,
      string | number | boolean | null | Array<string | number>
    > = {};

    // 处理FeishuRecordData的两种格式
    const recordFields = 'fields' in record ? record.fields : record;

    if (!recordFields || typeof recordFields !== 'object') {
      return { fields: {} };
    }

    for (const [key, value] of Object.entries(recordFields)) {
      // 使用映射表转换字段名为Field ID
      const fieldId = tableMapping?.[key] || key;
      fields[fieldId] = this.formatFieldValue(value);
    }

    return { fields };
  }

  /**
   * 格式化字段值 - 根据飞书字段类型
   */
  private formatFieldValue(
    value: string | number | boolean | null | Array<string | number>,
  ): string | number | boolean | null | Array<string | number> {
    if (value === null || value === undefined) {
      return null;
    }

    // 文本字段
    if (typeof value === 'string') {
      return value;
    }

    // 数字字段
    if (typeof value === 'number') {
      return value;
    }

    // 日期字段 - 转换为时间戳
    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }

    // 数组字段 - 多选等
    if (Array.isArray(value)) {
      return value;
    }

    // 对象字段 - JSON存储
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 获取表格字段信息
   */
  async getTableFields(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
  ): Promise<FeishuField[]> {
    try {
      const token = await this.getAccessToken(appId, appSecret);

      const response = await this.httpClient.get<
        FeishuApiResponse<FeishuTableFieldsResponse>
      >(`/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get table fields: ${response.data.msg}`);
      }

      return response.data.data.items;
    } catch (error) {
      this.logger.error('Failed to get table fields:', error);
      throw error;
    }
  }

  /**
   * 查询记录 - 通过Subject ID查找重复项
   */
  async findRecordBySubjectId(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    subjectId: string,
    subjectIdFieldId: string,
  ): Promise<FeishuRecordItem[]> {
    try {
      const token = await this.getAccessToken(appId, appSecret);

      const response = await this.httpClient.post<
        FeishuApiResponse<FeishuRecordsResponse>
      >(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
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
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to search records: ${response.data.msg}`);
      }

      return response.data.data.items;
    } catch (error) {
      this.logger.error('Failed to search records:', error);
      throw error;
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
    fields: Record<
      string,
      string | number | boolean | null | Array<string | number>
    >,
  ): Promise<void> {
    try {
      const token = await this.getAccessToken(appId, appSecret);

      const response = await this.httpClient.put<FeishuApiResponse<void>>(
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        { fields },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to update record: ${response.data.msg}`);
      }
    } catch (error) {
      this.logger.error('Failed to update record:', error);
      throw error;
    }
  }

  /**
   * 创建批次数组
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
   * 清理token缓存
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
    this.logger.log('Token cache cleared');
  }
}
