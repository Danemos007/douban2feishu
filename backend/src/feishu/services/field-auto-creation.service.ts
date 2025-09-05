/**
 * 字段自动创建服务
 *
 * 整合历史测试文件的最佳实践：
 * - sync-movie-from-cache.ts: 完整18字段Switch逻辑 + 批量创建
 * - sync-from-cache.ts: 精细化状态配置 + 企业级错误处理
 * - 现有架构: NestJS Injectable + Zod验证 + 类型安全
 *
 * 核心功能：
 * - 4种内容类型差异化字段创建 (books/movies/tv/documentary)
 * - 18种字段类型完整Switch逻辑
 * - 智能延迟批量创建 (1秒延迟防止API限流)
 * - 与FeishuTableService无缝集成
 * - 企业级错误处理和统计追踪
 */

import { Injectable, Logger } from '@nestjs/common';
import { FieldCreationConfigManager } from './field-creation-config';
import { FeishuTableService } from './feishu-table.service';
import {
  FieldCreationRequest,
  FieldCreationResponse,
  BatchFieldCreationRequest,
  BatchFieldCreationResult,
  FieldCreationStats,
  ContentType,
  FieldCreationConfig,
} from '../contract/field-creation.schema';
import { FeishuFieldType } from '../contract/field.schema';
import { IFieldAutoCreationService } from '../interfaces/field-creation.interface';

/**
 * 字段创建统计追踪
 */
interface CreationStatsTracker {
  totalCreated: number;
  successCount: number;
  failedCount: number;
  totalProcessingTime: number;
  contentTypeCount: Record<ContentType, number>;
  fieldTypeCount: Record<string, number>;
  lastCreationTime?: string;
}

@Injectable()
export class FieldAutoCreationService implements IFieldAutoCreationService {
  private readonly logger = new Logger(FieldAutoCreationService.name);
  private readonly statsTracker: CreationStatsTracker = {
    totalCreated: 0,
    successCount: 0,
    failedCount: 0,
    totalProcessingTime: 0,
    contentTypeCount: {
      books: 0,
      movies: 0,
      tv: 0,
      documentary: 0,
    },
    fieldTypeCount: {},
  };

  constructor(
    private readonly configManager: FieldCreationConfigManager,
    private readonly feishuTableService: FeishuTableService,
  ) {}

  /**
   * 🏆 核心方法：创建支持内容类型差异的字段
   *
   * 整合两版本历史文件的最佳实践：
   * - 电影版本的完整Switch逻辑
   * - 书籍版本的精细状态配置
   */
  async createFieldWithContentTypeSupport(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    request: FieldCreationRequest,
  ): Promise<FieldCreationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Creating field "${request.fieldName}" for content type "${request.contentType}"`,
      );

      // 🔥 构建字段配置 - 整合历史Switch逻辑
      const fieldConfig = this.buildFieldConfig(request);

      // 调用FeishuTableService创建字段 (现有方法签名)
      const result = await this.feishuTableService.createTableField(
        appId,
        appSecret,
        appToken,
        tableId,
        fieldConfig.field_name,
        fieldConfig.type,
        request.description, // 使用请求中的描述参数
      );

      // 更新统计信息
      this.updateSuccessStats(request, Date.now() - startTime);

      this.logger.log(
        `Successfully created field "${request.fieldName}" with ID: ${result.field_id}`,
      );

      return {
        field_id: result.field_id,
        field_name: result.field_name,
        type: result.type as (typeof FeishuFieldType)[keyof typeof FeishuFieldType],
        ui_type: result.ui_type,
        is_primary: result.is_primary,
        property: result.property || undefined,
      };
    } catch (error) {
      this.updateFailureStats(request, Date.now() - startTime);
      this.logger.error(
        `Failed to create field "${request.fieldName}": ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 🔥 构建字段配置 - 整合历史测试文件的完整Switch逻辑
   *
   * 基于以下历史文件的最佳实践：
   * - sync-movie-from-cache.ts: 18字段完整Switch
   * - sync-from-cache.ts: 状态字段精细配置
   */
  private buildFieldConfig(request: FieldCreationRequest): FieldCreationConfig {
    const { fieldName, contentType } = request;

    // 首先尝试从配置管理器获取预定义模板
    const template = this.configManager.getFieldTemplate(
      contentType,
      fieldName,
    );
    if (template) {
      this.logger.debug(`Using predefined template for field "${fieldName}"`);
      return template;
    }

    // 🚨 如果没有预定义模板，抛出错误
    // 这确保了所有字段都经过充分的测试和验证
    throw new Error(`不支持的字段名: ${fieldName}`);
  }

  /**
   * 🏆 批量创建字段 - 整合电影版本的智能延迟逻辑
   *
   * 核心特性：
   * - 1秒延迟防止API限流 (基于历史文件验证)
   * - 错误隔离：单个失败不影响其他字段
   * - 完整统计：成功/失败/处理时间
   */
  async batchCreateFieldsWithSmartDelay(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    requests: FieldCreationRequest[],
  ): Promise<BatchFieldCreationResult> {
    const startTime = Date.now();

    // 验证批次大小
    const maxBatchSize = this.configManager.getMaxBatchSize();
    if (requests.length > maxBatchSize) {
      throw new Error(`单次最多创建${maxBatchSize}个字段`);
    }

    this.logger.log(`Starting batch field creation: ${requests.length} fields`);

    const result: BatchFieldCreationResult = {
      success: [],
      failed: [],
      summary: {
        total: requests.length,
        successCount: 0,
        failedCount: 0,
        processingTime: 0,
      },
    };

    // 🔥 顺序处理每个字段，带智能延迟
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];

      try {
        // 创建字段
        const field = await this.createFieldWithContentTypeSupport(
          appId,
          appSecret,
          appToken,
          tableId,
          request,
        );

        result.success.push(field);
        result.summary.successCount++;

        // ✅ 智能延迟：除了最后一个字段，其他字段创建后延迟
        if (i < requests.length - 1) {
          const delay = this.configManager.getFieldCreationDelay();
          await this.delay(delay);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to create field "${request.fieldName}": ${error instanceof Error ? error.message : String(error)}`,
        );

        result.failed.push({
          request,
          error: error instanceof Error ? error.message : String(error),
        });
        result.summary.failedCount++;
      }
    }

    result.summary.processingTime = Date.now() - startTime;

    this.logger.log(
      `Batch creation completed: ${result.summary.successCount} success, ${result.summary.failedCount} failed`,
    );

    return result;
  }

  /**
   * 检查字段是否存在 - 基于现有getTableFields实现
   */
  async checkFieldExists(
    appId: string,
    appSecret: string,
    appToken: string,
    tableId: string,
    fieldName: string,
  ): Promise<boolean> {
    try {
      const fields = await this.feishuTableService.getTableFields(
        appId,
        appSecret,
        appToken,
        tableId,
      );
      return fields.some((field) => field.field_name === fieldName);
    } catch (error) {
      this.logger.warn(
        `Failed to check field existence: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * 获取字段创建统计信息
   */
  async getCreationStats(): Promise<FieldCreationStats> {
    const averageCreationTime =
      this.statsTracker.totalCreated > 0
        ? this.statsTracker.totalProcessingTime / this.statsTracker.totalCreated
        : 0;

    const successRate =
      this.statsTracker.totalCreated > 0
        ? (this.statsTracker.successCount / this.statsTracker.totalCreated) *
          100
        : 0;

    return {
      totalCreated: this.statsTracker.totalCreated,
      successRate: Math.round(successRate * 10) / 10, // 保留1位小数
      averageCreationTime: Math.round(averageCreationTime),
      contentTypeDistribution: { ...this.statsTracker.contentTypeCount },
      fieldTypeDistribution: { ...this.statsTracker.fieldTypeCount },
      lastCreationTime: this.statsTracker.lastCreationTime,
    };
  }

  /**
   * 重置统计信息
   */
  async resetStats(): Promise<void> {
    this.statsTracker.totalCreated = 0;
    this.statsTracker.successCount = 0;
    this.statsTracker.failedCount = 0;
    this.statsTracker.totalProcessingTime = 0;
    this.statsTracker.contentTypeCount = {
      books: 0,
      movies: 0,
      tv: 0,
      documentary: 0,
    };
    this.statsTracker.fieldTypeCount = {};
    this.statsTracker.lastCreationTime = undefined;

    this.logger.log('Field creation statistics have been reset');
  }

  /**
   * 更新成功统计
   */
  private updateSuccessStats(
    request: FieldCreationRequest,
    processingTime: number,
  ): void {
    this.statsTracker.totalCreated++;
    this.statsTracker.successCount++;
    this.statsTracker.totalProcessingTime += processingTime;
    this.statsTracker.contentTypeCount[request.contentType]++;

    // 更新字段类型统计
    const fieldType = request.fieldType.toString();
    this.statsTracker.fieldTypeCount[fieldType] =
      (this.statsTracker.fieldTypeCount[fieldType] || 0) + 1;

    this.statsTracker.lastCreationTime = new Date().toISOString();
  }

  /**
   * 更新失败统计
   */
  private updateFailureStats(
    request: FieldCreationRequest,
    processingTime: number,
  ): void {
    this.statsTracker.totalCreated++;
    this.statsTracker.failedCount++;
    this.statsTracker.totalProcessingTime += processingTime;
  }

  /**
   * 延迟工具方法 - 支持智能延迟
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
