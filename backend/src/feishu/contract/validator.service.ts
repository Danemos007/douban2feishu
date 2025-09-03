/**
 * 飞书契约验证器服务
 * 
 * 核心功能：
 * 1. 双模式验证：开发环境严格验证，生产环境软验证
 * 2. 基于Zod Schema的运行时类型检查
 * 3. 验证统计和错误记录
 * 4. 替代历史遗留的类型断言逻辑
 */

import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

import { 
  FeishuFieldsResponse, 
  FeishuField,
  FeishuFieldsResponseSchema,
  isRatingField,
} from './field.schema';

import {
  FeishuTokenResponse,
  FeishuTokenResponseSchema,
} from './auth.schema';

import {
  FeishuRecordsResponse,
  FeishuRecordsResponseSchema,
} from './record.schema';

export interface ValidationStats {
  totalValidations: number;
  successCount: number;
  failureCount: number;
  lastFailure?: {
    endpoint: string;
    error: string;
    timestamp: string;
  };
}

interface ContractFailureLog {
  timestamp: string;
  endpoint: string;
  errors: z.ZodIssue[];
  actualData: string;
}

@Injectable()
export class FeishuContractValidatorService {
  private readonly logger = new Logger(FeishuContractValidatorService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';
  
  // 验证统计
  private stats: ValidationStats = {
    totalValidations: 0,
    successCount: 0,
    failureCount: 0,
  };

  /**
   * 验证飞书字段查询响应
   * 
   * @param data 原始API响应数据
   * @param endpoint API端点名称，用于错误记录
   * @returns 验证后的字段响应数据
   */
  validateFieldsResponse(data: unknown, endpoint: string): FeishuFieldsResponse {
    this.stats.totalValidations++;
    
    // 动态检查环境，支持测试时临时修改
    const isCurrentlyProduction = process.env.NODE_ENV === 'production';
    
    if (isCurrentlyProduction) {
      return this.safeValidate(FeishuFieldsResponseSchema, data, endpoint);
    } else {
      // 开发环境：严格验证，立即失败
      try {
        const result = FeishuFieldsResponseSchema.parse(data);
        this.stats.successCount++;
        return result;
      } catch (error) {
        this.stats.failureCount++;
        if (error instanceof z.ZodError) {
          this.stats.lastFailure = {
            endpoint,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        throw error;
      }
    }
  }

  /**
   * 验证飞书认证响应
   * 
   * @param data 原始API响应数据
   * @param endpoint API端点名称，用于错误记录
   * @returns 验证后的认证响应数据
   */
  validateAuthResponse(data: unknown, endpoint: string): FeishuTokenResponse {
    this.stats.totalValidations++;
    
    // 动态检查环境，支持测试时临时修改
    const isCurrentlyProduction = process.env.NODE_ENV === 'production';
    
    if (isCurrentlyProduction) {
      return this.safeValidate(FeishuTokenResponseSchema, data, endpoint);
    } else {
      // 开发环境：严格验证，立即失败
      try {
        const result = FeishuTokenResponseSchema.parse(data);
        this.stats.successCount++;
        return result;
      } catch (error) {
        this.stats.failureCount++;
        if (error instanceof z.ZodError) {
          this.stats.lastFailure = {
            endpoint,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        throw error;
      }
    }
  }

  /**
   * 验证飞书记录查询响应
   * 
   * @param data 原始API响应数据
   * @param endpoint API端点名称，用于错误记录
   * @returns 验证后的记录响应数据
   */
  validateRecordsResponse(data: unknown, endpoint: string): FeishuRecordsResponse {
    this.stats.totalValidations++;
    
    // 动态检查环境，支持测试时临时修改
    const isCurrentlyProduction = process.env.NODE_ENV === 'production';
    
    if (isCurrentlyProduction) {
      return this.safeValidate(FeishuRecordsResponseSchema, data, endpoint);
    } else {
      // 开发环境：严格验证，立即失败
      try {
        const result = FeishuRecordsResponseSchema.parse(data);
        this.stats.successCount++;
        return result;
      } catch (error) {
        this.stats.failureCount++;
        if (error instanceof z.ZodError) {
          this.stats.lastFailure = {
            endpoint,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        throw error;
      }
    }
  }

  /**
   * 验证Rating字段 - 替代历史遗留的isRatingFieldType函数
   * 
   * 基于真实API结构：type=2 + ui_type='Rating' + property.rating存在
   */
  isRatingFieldValidation(field: FeishuField): boolean {
    return isRatingField(field);
  }

  /**
   * 获取验证统计信息
   */
  getValidationStats(): ValidationStats {
    return { ...this.stats };
  }

  /**
   * 重置验证统计
   */
  resetStats(): void {
    this.stats = {
      totalValidations: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  /**
   * 生产环境软验证：记录错误但不抛出异常
   * 
   * @private
   */
  private safeValidate<T>(schema: z.ZodSchema<T>, data: unknown, endpoint: string): T {
    const result = schema.safeParse(data);
    
    if (result.success) {
      this.stats.successCount++;
      return result.data;
    } else {
      // 验证失败：记录错误但不崩溃
      this.stats.failureCount++;
      this.stats.lastFailure = {
        endpoint,
        error: result.error.message,
        timestamp: new Date().toISOString(),
      };
      
      this.logContractFailure(endpoint, result.error, data);
      
      // 返回原始数据（类型断言，允许程序继续运行）
      return data as T;
    }
  }

  /**
   * 记录契约验证失败详情
   * 
   * @private
   */
  private logContractFailure(endpoint: string, error: z.ZodError, data: unknown): void {
    const failureLog: ContractFailureLog = {
      timestamp: new Date().toISOString(),
      endpoint,
      errors: error.issues,
      actualData: JSON.stringify(data, null, 2),
    };

    // 记录到应用日志
    this.logger.error(`契约验证失败 - ${endpoint}`, failureLog);

    // 异步落盘到专用契约失败日志文件
    this.persistContractFailure(failureLog).catch(err => {
      this.logger.warn(`契约失败日志落盘失败: ${err.message}`);
    });
  }

  /**
   * 持久化契约验证失败记录到文件
   * 按日期轮转，便于后续分析API变更趋势
   * 
   * @private
   */
  private async persistContractFailure(failureLog: ContractFailureLog): Promise<void> {
    try {
      // 生成按日期轮转的日志文件名
      const today = new Date().toISOString().split('T')[0]; // yyyy-MM-dd格式
      const logFileName = `contract-failures-${today}.json`;
      const logDir = path.join(process.cwd(), 'logs', 'contract-failures');
      const logFilePath = path.join(logDir, logFileName);

      // 确保日志目录存在
      await fs.mkdir(logDir, { recursive: true });

      // 追加写入日志记录（每行一个JSON对象，便于后续处理）
      const logEntry = JSON.stringify(failureLog) + '\n';
      await fs.appendFile(logFilePath, logEntry, 'utf8');

      this.logger.debug(`契约失败记录已落盘: ${logFilePath}`);
    } catch (error) {
      // 落盘失败不应影响主业务流程，仅记录警告
      this.logger.warn(`契约失败记录落盘异常: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取今日契约失败统计 - 用于监控和告警
   */
  async getTodayFailureStats(): Promise<{
    totalFailures: number;
    affectedEndpoints: string[];
    latestFailureTime: string | null;
  } | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFileName = `contract-failures-${today}.json`;
      const logDir = path.join(process.cwd(), 'logs', 'contract-failures');
      const logFilePath = path.join(logDir, logFileName);

      // 检查今日日志文件是否存在
      try {
        await fs.access(logFilePath);
      } catch {
        return { totalFailures: 0, affectedEndpoints: [], latestFailureTime: null };
      }

      // 读取并解析今日失败记录
      const content = await fs.readFile(logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      const failures: ContractFailureLog[] = lines.map(line => JSON.parse(line));
      const endpoints = Array.from(new Set(failures.map(f => f.endpoint)));
      const latestFailure = failures.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      return {
        totalFailures: failures.length,
        affectedEndpoints: endpoints,
        latestFailureTime: latestFailure?.timestamp || null,
      };
    } catch (error) {
      this.logger.warn(`获取今日失败统计异常: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 验证并提取字段类型分布 - 调试辅助功能
   */
  validateAndAnalyzeFields(data: unknown, endpoint: string): {
    response: FeishuFieldsResponse;
    typeDistribution: Record<number, string[]>;
    ratingFields: FeishuField[];
  } {
    const response = this.validateFieldsResponse(data, endpoint);
    
    // 分析字段类型分布
    const typeDistribution: Record<number, string[]> = {};
    const ratingFields: FeishuField[] = [];
    
    response.data.items.forEach(field => {
      // 统计type -> ui_type分布
      if (!typeDistribution[field.type]) {
        typeDistribution[field.type] = [];
      }
      if (!typeDistribution[field.type].includes(field.ui_type)) {
        typeDistribution[field.type].push(field.ui_type);
      }
      
      // 收集Rating字段
      if (this.isRatingFieldValidation(field)) {
        ratingFields.push(field);
      }
    });
    
    return {
      response,
      typeDistribution,
      ratingFields,
    };
  }
}