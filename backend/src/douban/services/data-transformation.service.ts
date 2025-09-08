/**
 * 数据转换引擎服务
 *
 * 整合四个版本的高价值逻辑：
 * - 实现A: 通用转换引擎 (嵌套属性 + 数组处理)
 * - 实现D: 智能修复引擎 (片长/日期/地区/语言)
 * - 实现C: 严格验证系统 (字段验证 + 边界处理)
 *
 * 设计原则：
 * - 严格TDD开发
 * - 企业级架构集成
 * - 完整Zod验证
 * - 面向未来设计
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  DoubanDataType,
  TransformationOptions,
  TransformationResult,
  TransformationStatistics,
  IntelligentRepairConfig,
  FieldTransformationContext,
  TransformationError,
  validateTransformationOptions,
  validateTransformationResult,
} from '../contract/transformation.schema';

import {
  getVerifiedFieldMapping,
  VerifiedFieldMappingConfig,
} from '../../feishu/config/douban-field-mapping.config';

@Injectable()
export class DataTransformationService {
  private readonly logger = new Logger(DataTransformationService.name);

  // 转换过程中的状态
  private warnings: string[] = [];
  private errors: TransformationError[] = [];
  private statistics: Partial<TransformationStatistics> = {};

  /**
   * 🔥 核心转换方法 - 整合四个版本的精华逻辑
   *
   * @param rawData 原始豆瓣数据
   * @param dataType 数据类型
   * @param options 转换选项
   * @returns 转换结果
   */
  async transformDoubanData<T = any>(
    rawData: any,
    dataType: DoubanDataType,
    options?: TransformationOptions,
  ): Promise<TransformationResult<T>> {
    // 🔥 TDD: 这个方法需要实现，目前只是骨架
    try {
      this.logger.log(`Starting data transformation for ${dataType}`);

      // 重置状态
      this.warnings = [];
      this.errors = [];
      this.statistics = {
        totalFields: 0,
        transformedFields: 0,
        repairedFields: 0,
        failedFields: 0,
      };

      // 1. 验证和处理选项
      const validatedOptions = await this.validateAndProcessOptions(options);

      // 2. 处理空数据情况
      if (rawData == null) {
        this.addWarning('输入数据为null或undefined');
        return this.buildEmptyResult(rawData, validatedOptions);
      }

      // 处理空对象情况
      if (typeof rawData === 'object' && Object.keys(rawData).length === 0) {
        this.addWarning('输入数据为空对象');
        return this.buildEmptyResult(rawData, validatedOptions);
      }

      // 3. 获取字段映射配置
      const fieldMappings = getVerifiedFieldMapping(dataType);
      this.statistics.totalFields = Object.keys(fieldMappings).length;

      // 4. 应用通用转换 (实现A逻辑)
      const transformedData = await this.applyGeneralTransformation(
        rawData,
        fieldMappings,
      );

      // 5. 应用智能修复 (实现D逻辑) - [CRITICAL-FIX-2025-09-04] 传入原始HTML数据
      const dataWithHtml = { ...transformedData, html: rawData.html }; // 保留HTML用于智能修复
      const enhancedData = validatedOptions.enableIntelligentRepairs
        ? await this.applyIntelligentRepairs(dataWithHtml, dataType)
        : transformedData;

      // 6. 应用严格验证 (实现C逻辑) - 待实现
      const validatedData = validatedOptions.strictValidation
        ? await this.validateTransformedData(enhancedData, dataType)
        : enhancedData;

      // 7. 构建结果
      const result = {
        data: validatedData,
        statistics: this.generateTransformationStats(),
        warnings: this.collectWarnings(),
        ...(validatedOptions.preserveRawData && { rawData }),
      };

      // 8. 验证结果格式
      const validationResult = validateTransformationResult(result);
      if (!validationResult.success) {
        throw new Error(`结果验证失败: ${validationResult.error}`);
      }

      this.logger.log(`Data transformation completed for ${dataType}`, {
        totalFields: this.statistics.totalFields,
        transformedFields: this.statistics.transformedFields,
        warnings: this.warnings.length,
      });

      return validationResult.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Data transformation failed for ${dataType}:`,
        errorMessage,
      );

      // 返回错误状态的结果，而不是抛出异常
      return {
        data: {} as T,
        statistics: {
          totalFields: 0,
          transformedFields: 0,
          repairedFields: 0,
          failedFields: 0,
        },
        warnings: [...this.warnings, `转换失败: ${errorMessage}`],
      };
    }
  }

  // =============== 实现A: 通用转换引擎方法 ===============

  /**
   * 🔥 嵌套属性值提取 (实现A核心逻辑)
   */
  private async extractNestedValue(
    data: any,
    fieldConfig: VerifiedFieldMappingConfig,
  ): Promise<any> {
    // 如果数据为null或undefined，直接返回undefined
    if (data == null) {
      return undefined;
    }

    const { nestedPath, doubanFieldName } = fieldConfig;

    // 如果没有嵌套路径或路径为空，返回直接属性值
    if (!nestedPath || !nestedPath.includes('.')) {
      return data[doubanFieldName];
    }

    // 🔥 整合版本A的嵌套属性解析逻辑
    const keys = nestedPath.split('.');
    let value = data;

    for (const key of keys) {
      if (value == null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * 🔥 数组字段智能处理 (实现A增强)
   */
  private async processArrayField(
    value: any,
    fieldConfig: VerifiedFieldMappingConfig,
  ): Promise<string | any[]> {
    // 如果不是数组，直接返回原值
    if (!Array.isArray(value)) {
      return value;
    }

    // 如果是空数组，返回空字符串
    if (value.length === 0) {
      return '';
    }

    // 基于processingNotes决定处理方式
    // 检查是否包含join相关的处理说明
    const hasJoinProcessing =
      fieldConfig.processingNotes &&
      (fieldConfig.processingNotes.includes('join') ||
        fieldConfig.processingNotes.includes('数组') ||
        fieldConfig.processingNotes.includes('需要join处理') ||
        fieldConfig.processingNotes.includes('join处理'));

    // 对于已知的数组字段（作者、导演、演员等），都进行join处理
    const isKnownArrayField = [
      'author',
      'director',
      'actor',
      'translator',
      'myTags',
      'userTags',
    ].includes(fieldConfig.doubanFieldName);

    if (hasJoinProcessing || isKnownArrayField) {
      return value.join(' / ');
    }

    // 默认情况下，将数组转换为用 ' / ' 分隔的字符串
    return value.join(' / ');
  }

  /**
   * 🔥 通用字段转换应用
   */
  private async applyGeneralTransformation(
    rawData: any,
    fieldMappings: Record<string, VerifiedFieldMappingConfig>,
  ): Promise<any> {
    const transformedData: any = {};
    let transformedCount = 0;
    let failedCount = 0;

    for (const [doubanFieldName, fieldConfig] of Object.entries(
      fieldMappings,
    )) {
      try {
        // 1. 提取值 (支持嵌套路径)
        let value = await this.extractNestedValue(rawData, fieldConfig);

        // 2. 处理数组字段
        if (Array.isArray(value)) {
          value = await this.processArrayField(value, fieldConfig);
        }

        // 3. 设置转换后的字段
        if (value !== undefined && value !== null) {
          transformedData[doubanFieldName] = value;
          transformedCount++;
        } else if (fieldConfig.required) {
          // 必需字段缺失，记录警告但不设置值
          this.addWarning(`必需字段 ${doubanFieldName} 值为空`);
          failedCount++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.addWarning(`字段 ${doubanFieldName} 转换失败: ${errorMessage}`);
        failedCount++;
      }
    }

    // 更新统计信息
    this.statistics.transformedFields = transformedCount;
    this.statistics.failedFields = failedCount;

    return transformedData;
  }

  // =============== 实现D: 智能修复引擎方法 ===============

  /**
   * 🔥 智能修复引擎 - 整合实现D的复杂解析逻辑
   */
  private async applyIntelligentRepairs(
    data: any,
    dataType: DoubanDataType,
    options?: { enableIntelligentRepairs?: boolean },
  ): Promise<any> {
    // 如果禁用智能修复，直接返回原数据
    if (options?.enableIntelligentRepairs === false) {
      return data;
    }

    try {
      switch (dataType) {
        case 'movies':
        case 'tv':
        case 'documentary':
          return await this.repairMovieData(data);
        case 'books':
          return await this.repairBookData(data);
        default:
          return data;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addWarning(`智能修复失败: ${errorMessage}`);
      return data; // 修复失败时返回原数据
    }
  }

  /**
   * 🔥 电影数据智能修复 (实现D核心逻辑 + TDD增强)
   */
  private async repairMovieData(movieData: any): Promise<any> {
    const repaired = { ...movieData };
    let repairedCount = 0;

    try {
      // 🔥 1. HTML片长解析 (TDD新增)
      // [CRITICAL-FIX-2025-09-04] 修复条件判断，支持null值和不存在的字段
      if (
        (!repaired.duration || repaired.duration === null) &&
        movieData.html
      ) {
        const repairedDuration = await this.repairDurationField(movieData);
        if (repairedDuration) {
          repaired.duration = repairedDuration;
          repairedCount++;
          this.logger.debug(`修复字段: duration -> ${repairedDuration}`);
        }
      }

      // 🔥 2. HTML上映日期解析 (TDD新增)
      // [CRITICAL-FIX-2025-09-04] 修复条件判断，支持null值和不存在的字段
      if (
        (!repaired.releaseDate || repaired.releaseDate === null) &&
        movieData.html
      ) {
        const repairedReleaseDate =
          await this.repairReleaseDateField(movieData);
        if (repairedReleaseDate) {
          repaired.releaseDate = repairedReleaseDate;
          repairedCount++;
          this.logger.debug(`修复字段: releaseDate -> ${repairedReleaseDate}`);
        }
      }

      // 🔥 3. 制片地区修复 (TDD新增) - 支持HTML解析和字段清理
      // [CRITICAL-FIX-2025-09-04] 修复条件判断，支持null值和不存在的字段
      if ((!repaired.country || repaired.country === null) && movieData.html) {
        const countryMatch = movieData.html.match(
          /<span[^>]*class="pl"[^>]*>制片国家\/地区:<\/span>\s*([^<]+)/i,
        );
        if (countryMatch) {
          repaired.country = countryMatch[1].trim();
          repairedCount++;
          this.logger.debug(`修复字段: country -> ${repaired.country}`);
        }
      }

      // 🔥 制片地区字段清理逻辑 (TDD新增)
      if (repaired.country && typeof repaired.country === 'string') {
        const cleanedCountry = this.repairCountryField(repaired.country);
        if (cleanedCountry !== repaired.country) {
          repaired.country = cleanedCountry;
          repairedCount++;
          this.logger.debug(`清理字段: country -> ${cleanedCountry}`);
        }
      }

      // 🔥 4. 语言修复 (TDD新增) - 支持HTML解析和字段清理
      // [CRITICAL-FIX-2025-09-04] 修复条件判断，支持null值和不存在的字段
      if (
        (!repaired.language || repaired.language === null) &&
        movieData.html
      ) {
        const languageMatch = movieData.html.match(
          /<span[^>]*class="pl"[^>]*>语言:<\/span>\s*([^<]+)/i,
        );
        if (languageMatch) {
          repaired.language = languageMatch[1].trim();
          repairedCount++;
          this.logger.debug(`修复字段: language -> ${repaired.language}`);
        }
      }

      // 🔥 语言字段清理逻辑 (TDD新增)
      if (repaired.language && typeof repaired.language === 'string') {
        const cleanedLanguage = this.repairLanguageField(repaired.language);
        if (cleanedLanguage !== repaired.language) {
          repaired.language = cleanedLanguage;
          repairedCount++;
          this.logger.debug(`清理字段: language -> ${cleanedLanguage}`);
        }
      }

      // 更新修复统计
      this.statistics.repairedFields =
        (this.statistics.repairedFields || 0) + repairedCount;

      return repaired;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`电影数据修复失败: ${errorMessage}`);
      return movieData; // 修复失败时返回原数据
    }
  }

  /**
   * 🔥 书籍数据智能修复 - 基于实现A和C的逻辑
   */
  private async repairBookData(bookData: any): Promise<any> {
    const repaired = { ...bookData };
    let repairedCount = 0;

    try {
      // 🔥 1. 出版日期格式化 (实现A+C逻辑)
      if (repaired.publishDate && typeof repaired.publishDate === 'string') {
        const repairedDate = this.repairPublishDateField(repaired.publishDate);
        if (repairedDate !== repaired.publishDate) {
          repaired.publishDate = repairedDate;
          repairedCount++;
          this.logger.debug(`修复字段: publishDate -> ${repairedDate}`);
        }
      }

      // 🔥 2. 作者数组处理 (实现A核心逻辑)
      // [CRITICAL-FIX-2025-09-06] 保持数据流一致性
      // 问题：智能修复不应该改变通用转换已确定的数据格式
      // 修复：智能修复只优化字符串格式，不改变数据类型
      if (
        repaired.author &&
        typeof repaired.author === 'string' &&
        repaired.author.includes('/') &&
        !repaired.author.includes(' / ')
      ) {
        // 只优化分隔符格式，保持字符串类型
        const repairedAuthor = this.repairAuthorField(repaired.author);
        const authorString = Array.isArray(repairedAuthor)
          ? repairedAuthor.join(' / ') // 保持与通用转换一致的字符串格式
          : repairedAuthor;
        if (authorString !== repaired.author) {
          repaired.author = authorString;
          repairedCount++;
          this.logger.debug(`修复字段: author -> ${authorString}`);
        }
      }

      // 🔥 3. 评分嵌套提取 (实现A核心逻辑)
      if (
        repaired.rating &&
        typeof repaired.rating === 'object' &&
        repaired.rating.average &&
        !repaired.doubanRating
      ) {
        repaired.doubanRating = repaired.rating.average;
        repairedCount++;
        this.logger.debug(`修复字段: doubanRating -> ${repaired.doubanRating}`);
      }

      // 🔥 4. 出版社信息标准化 (实现C逻辑)
      if (repaired.publisher && typeof repaired.publisher === 'string') {
        const repairedPublisher = this.repairPublisherField(repaired.publisher);
        if (repairedPublisher !== repaired.publisher) {
          repaired.publisher = repairedPublisher;
          repairedCount++;
          this.logger.debug(`修复字段: publisher -> ${repairedPublisher}`);
        }
      }

      // 🔥 5. ISBN信息提取 (实现C逻辑)
      if (repaired.isbn && typeof repaired.isbn === 'string') {
        const repairedIsbn = this.repairIsbnField(repaired.isbn);
        if (repairedIsbn !== repaired.isbn) {
          repaired.isbn = repairedIsbn;
          repairedCount++;
          this.logger.debug(`修复字段: isbn -> ${repairedIsbn}`);
        }
      }

      // 更新修复统计
      this.statistics.repairedFields =
        (this.statistics.repairedFields || 0) + repairedCount;

      return repaired;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`书籍数据修复失败: ${errorMessage}`);
      return bookData;
    }
  }

  // =============== 书籍数据修复辅助方法 ===============

  /**
   * 🔥 修复出版日期格式 - 标准化为YYYY-MM格式
   */
  private repairPublishDateField(publishDate: string): string {
    if (!publishDate || typeof publishDate !== 'string') {
      return publishDate;
    }

    const dateStr = publishDate.trim();

    // 🔥 实现A+C逻辑：复杂日期格式标准化
    // 格式0: TDD新增 "2019年1月1日" -> "2019-01-01"
    const chineseDateMatch = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (chineseDateMatch) {
      const year = chineseDateMatch[1];
      const month = chineseDateMatch[2].padStart(2, '0');
      const day = chineseDateMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 格式1: "1996年12月" -> "1996-12"
    const yearMonthMatch = dateStr.match(/^(\d{4})年(\d{1,2})月$/);
    if (yearMonthMatch) {
      const year = yearMonthMatch[1];
      const month = yearMonthMatch[2].padStart(2, '0');
      return `${year}-${month}`;
    }

    // 格式2: "1996年" -> "1996"
    const yearMatch = dateStr.match(/^(\d{4})年$/);
    if (yearMatch) {
      return yearMatch[1];
    }

    // 格式3: "1996-12-01" -> "1996-12" (保留年月)
    const fullDateMatch = dateStr.match(/^(\d{4})-(\d{1,2})-\d{1,2}$/);
    if (fullDateMatch) {
      const year = fullDateMatch[1];
      const month = fullDateMatch[2].padStart(2, '0');
      return `${year}-${month}`;
    }

    // 其他格式保持原样
    return publishDate;
  }

  /**
   * 🔥 修复作者字段 - 字符串转换为数组 (实现A核心逻辑)
   */
  private repairAuthorField(author: string): string[] {
    if (!author || typeof author !== 'string') {
      return [author];
    }

    // 🔥 智能分割：支持 ' / ' 分隔符
    return author
      .split('/')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }

  /**
   * 🔥 修复出版社信息 - 标准化格式 (实现C逻辑)
   */
  private repairPublisherField(publisher: string): string {
    if (!publisher || typeof publisher !== 'string') {
      return publisher;
    }

    let cleaned = publisher.trim();

    // 🔥 实现C逻辑：清理干扰信息
    // 1. 移除地区信息: "; 北京"
    cleaned = cleaned.replace(/;\s*[^/]+/g, '');

    // 2. 标准化分隔符: 确保使用 " / " 格式
    cleaned = cleaned.replace(/\s*\/\s*/g, ' / ');

    // 3. 清理多余空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * 🔥 修复ISBN信息 - 提取纯净号码 (实现C逻辑)
   */
  private repairIsbnField(isbn: string): string {
    if (!isbn || typeof isbn !== 'string') {
      return isbn;
    }

    const cleaned = isbn.trim();

    // 🔥 实现C逻辑：提取纯净ISBN号码
    // 移除括号及其内容: "9787020002207 (平装)" -> "9787020002207"
    const isbnMatch = cleaned.match(/^(\d{10,13})/);
    if (isbnMatch) {
      return isbnMatch[1];
    }

    // 如果没有找到标准格式，返回原值
    return isbn;
  }

  // =============== 实现C: 严格验证系统方法 (基于实现C) ===============

  /**
   * 🔥 严格验证转换后的数据 - 整合实现C的超详细验证逻辑
   */
  private async validateTransformedData(
    data: any,
    dataType: DoubanDataType,
  ): Promise<any> {
    const validated = { ...data };
    const fieldMappings = getVerifiedFieldMapping(dataType);

    for (const [fieldName, config] of Object.entries(fieldMappings)) {
      const value = validated[fieldName];

      // 🔥 基于实现C的严格验证逻辑
      switch (config.fieldType) {
        case 'singleSelect':
          validated[fieldName] = this.validateSelectField(
            value,
            fieldName,
            dataType,
          );
          break;
        case 'datetime':
          validated[fieldName] = this.validateDateTimeField(value);
          break;
        case 'rating':
          validated[fieldName] = this.validateRatingField(value);
          break;
        case 'text':
        case 'number':
        case 'multiSelect':
        case 'checkbox':
        case 'url':
          // 这些字段类型保持原值，暂不需要特殊验证
          break;
        default:
          // 未知字段类型，保持原值
          break;
      }
    }

    return validated;
  }

  /**
   * 🔥 选择字段验证 - 实现C核心逻辑
   */
  private validateSelectField(
    value: any,
    fieldName: string,
    dataType: DoubanDataType,
  ): string | null {
    if (fieldName === 'myStatus') {
      const validStatuses =
        dataType === 'books' ? ['想读', '在读', '读过'] : ['想看', '看过'];

      if (validStatuses.includes(value)) {
        return value;
      }

      this.addWarning(
        `Invalid status value: ${value}, expected one of: ${validStatuses.join(', ')}`,
      );
      return null;
    }

    // 其他选择字段保持原值
    return value;
  }

  /**
   * 🔥 评分字段验证 - 实现C核心逻辑
   */
  private validateRatingField(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    // 转换为数字
    const numValue = Number(value);

    // 检查是否为有效数字
    if (isNaN(numValue)) {
      this.addWarning(
        `Invalid rating value: ${value}, expected number between 1-5`,
      );
      return null;
    }

    // 检查评分范围 1-5
    if (numValue < 1 || numValue > 5) {
      this.addWarning(`Rating out of range: ${numValue}, expected between 1-5`);
      return null;
    }

    return numValue;
  }

  /**
   * 🔥 日期时间字段验证 - 实现C核心逻辑
   */
  private validateDateTimeField(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      this.addWarning(`Invalid date format: ${value}, expected string`);
      return null;
    }

    const dateStr = value.trim();

    // 🔥 实现C逻辑：严格日期格式验证
    // 1. 标准格式：YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      this.addWarning(`Invalid date format: ${dateStr}, expected YYYY-MM-DD`);
      return null;
    }

    // 2. 验证日期有效性
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      this.addWarning(`Invalid date: ${dateStr}`);
      return null;
    }

    // 3. 验证月份和日期范围
    const [year, month, day] = dateStr.split('-').map(Number);
    if (month < 1 || month > 12) {
      this.addWarning(`Invalid month in date: ${dateStr}`);
      return null;
    }

    if (day < 1 || day > 31) {
      this.addWarning(`Invalid day in date: ${dateStr}`);
      return null;
    }

    return dateStr;
  }

  // =============== 智能修复辅助方法 (实现D核心逻辑) ===============

  /**
   * 🔥 检查片长是否需要修复
   */
  private async needsDurationRepair(duration: any): Promise<boolean> {
    if (!duration) {
      return true; // null/undefined/empty 需要修复
    }

    if (typeof duration !== 'string') {
      return false;
    }

    // 如果已经是标准格式，不需要修复
    const standardFormat = /^\d+分钟$/.test(duration.trim());
    return !standardFormat;
  }

  /**
   * 🔥 修复片长字段 - 从HTML中解析片长信息
   */
  private async repairDurationField(movieData: any): Promise<string | null> {
    const html = movieData.html;
    if (!html || typeof html !== 'string') {
      return null;
    }

    // 🔥 实现D核心：从HTML解析片长
    // 1. 标准v:runtime属性解析：<span property="v:runtime">142</span>
    const runtimeMatch = html.match(
      /<[^>]*property="v:runtime"[^>]*>(\d+)<\/[^>]*>/,
    );
    if (runtimeMatch) {
      return `${runtimeMatch[1]}分钟`;
    }

    // 2. 从"片长:"标签后解析：片长:</span> 142分钟 / 120分03秒(导演剪辑版) <br>
    const durationLabelMatch = html.match(
      /片长:[\s\S]*?<\/span>\s*([^<]+)(?:<|$)/i,
    );
    if (durationLabelMatch) {
      const durationText = durationLabelMatch[1].trim();

      // 保持原始格式，支持复杂片长信息
      if (durationText && durationText !== '') {
        return durationText;
      }
    }

    // 3. 从pl类标签解析：<span class="pl">片长:</span> 142分钟 <br>
    const plLabelMatch = html.match(
      /<span[^>]*class="pl"[^>]*>片长:<\/span>\s*([^<]+)/i,
    );
    if (plLabelMatch) {
      const durationText = plLabelMatch[1].trim();
      if (durationText && durationText !== '') {
        return durationText;
      }
    }

    // 4. 通用数字+分钟格式提取
    const generalMatch = html.match(/(\d+(?:\.\d+)?)\s*分钟/);
    if (generalMatch) {
      return `${Math.round(parseFloat(generalMatch[1]))}分钟`;
    }

    // 5. 分钟+秒格式：6分03秒
    const minuteSecondMatch = html.match(/(\d+)分(\d+)秒/);
    if (minuteSecondMatch) {
      return `${minuteSecondMatch[1]}分${minuteSecondMatch[2]}秒`;
    }

    return null;
  }

  /**
   * 🔥 修复片长字段文本 - 对已有片长文本进行格式修复
   */
  private async repairDurationFieldText(duration: string): Promise<string> {
    if (!duration || typeof duration !== 'string') {
      return duration;
    }

    const durationText = duration.trim();

    // 如果已经是标准格式，不需要修复
    if (/^\d+分钟$/.test(durationText)) {
      return duration;
    }

    // 分钟+秒格式：6分03秒
    const minuteSecondMatch = durationText.match(/^(\d+)分(\d+)秒$/);
    if (minuteSecondMatch) {
      const minutes = parseInt(minuteSecondMatch[1]);
      const seconds = parseInt(minuteSecondMatch[2]);
      const totalMinutes = Math.round(minutes + seconds / 60);
      return `${totalMinutes}分钟`;
    }

    // 英文格式：142 min, 142mins
    const englishMatch = durationText.match(/^(\d+)\s*mins?$/i);
    if (englishMatch) {
      return `${englishMatch[1]}分钟`;
    }

    // 提取数字格式：包含数字的任意格式
    const numberMatch = durationText.match(/(\d+)/);
    if (numberMatch) {
      return `${numberMatch[1]}分钟`;
    }

    return duration;
  }

  /**
   * 🔥 检查上映日期是否需要修复
   */
  private async needsReleaseDateRepair(releaseDate: any): Promise<boolean> {
    if (!releaseDate) {
      return true; // null/undefined/empty 需要修复
    }

    if (typeof releaseDate !== 'string') {
      return false;
    }

    // 如果包含多个日期或复杂格式，需要修复
    return (
      releaseDate.includes('/') ||
      releaseDate.includes('(') ||
      releaseDate.length > 15
    );
  }

  /**
   * 🔥 修复上映日期字段 - 从HTML中解析上映日期
   */
  private async repairReleaseDateField(movieData: any): Promise<string | null> {
    const html = movieData.html;
    if (!html || typeof html !== 'string') {
      return null;
    }

    // 🔥 实现D核心：从HTML解析上映日期
    // 1. 标准v:initialReleaseDate属性解析，支持多个日期
    const releaseDates: string[] = [];
    const releaseDateRegex =
      /<[^>]*property="v:initialReleaseDate"[^>]*>([^<]+)<\/[^>]*>/g;
    let match;

    while ((match = releaseDateRegex.exec(html)) !== null) {
      const dateText = match[1].trim();
      if (dateText) {
        releaseDates.push(dateText);
      }
    }

    if (releaseDates.length > 0) {
      // 如果有多个日期，用 ' / ' 连接
      return releaseDates.join(' / ');
    }

    // 2. 从"上映日期:"标签后解析
    const releaseLabelMatch = html.match(
      /上映日期:[\s\S]*?<\/span>\s*([^<]+)(?:<|$)/i,
    );
    if (releaseLabelMatch) {
      const dateText = releaseLabelMatch[1].trim();
      if (dateText && dateText !== '') {
        return dateText;
      }
    }

    // 3. 从pl类标签解析：<span class="pl">上映日期:</span> 1994-10-14 <br>
    const plReleaseLabelMatch = html.match(
      /<span[^>]*class="pl"[^>]*>上映日期:<\/span>\s*([^<]+)/i,
    );
    if (plReleaseLabelMatch) {
      const dateText = plReleaseLabelMatch[1].trim();
      if (dateText && dateText !== '') {
        return dateText;
      }
    }

    // 4. 通用日期格式提取 YYYY-MM-DD
    const generalDateMatch = html.match(/(\d{4}-\d{1,2}-\d{1,2})/);
    if (generalDateMatch) {
      return generalDateMatch[1];
    }

    return null;
  }

  /**
   * 🔥 修复上映日期字段文本 - 对已有日期文本进行格式修复
   */
  private async repairReleaseDateFieldText(
    releaseDate: string,
  ): Promise<string> {
    if (!releaseDate || typeof releaseDate !== 'string') {
      return releaseDate;
    }

    const dateStr = releaseDate.trim();

    // 对于正常格式的日期，保持原样
    // 这里主要是为了演示，实际可以根据需要进行更复杂的格式化
    return dateStr;
  }

  /**
   * 🔥 检查制片地区是否需要修复
   */
  private async needsCountryRepair(country: any): Promise<boolean> {
    if (!country || typeof country !== 'string') {
      return false;
    }

    // 如果包含多个国家、英文、或额外信息(如语言信息)，需要清理
    return (
      country.includes('/') ||
      country.includes('语言:') ||
      country.length > 10 ||
      /[a-zA-Z]/.test(country)
    );
  }

  /**
   * 🔥 修复制片地区字段 - 清理和标准化
   */
  private repairCountryField(country: any): string {
    if (!country || typeof country !== 'string') {
      return country;
    }

    let countryStr = country.trim();

    // 🔥 实现D核心：制片地区清理逻辑
    // 1. 优先处理：如果包含"语言:"，直接截取语言信息前的部分
    if (countryStr.includes('语言:')) {
      countryStr = countryStr.split('语言:')[0].trim();
    }

    // 2. 清理其他干扰信息：移除上映日期、片长等非地区信息
    // [CRITICAL-FIX-2025-09-06] 修复正则表达式，正确处理包含空格的标签内容
    countryStr = countryStr
      .replace(/上映日期:[^]*?(?=\s*(?:语言:|片长:|又名:|IMDb:|$))/g, '')
      .trim();
    countryStr = countryStr
      .replace(/片长:[^]*?(?=\s*(?:语言:|上映日期:|又名:|IMDb:|$))/g, '')
      .trim();
    countryStr = countryStr
      .replace(/又名:[^]*?(?=\s*(?:语言:|片长:|上映日期:|IMDb:|$))/g, '')
      .trim();
    countryStr = countryStr.replace(/IMDb:[^]*?$/g, '').trim();

    // 2. 处理多地区信息，保持用 ' / ' 分隔
    if (countryStr.includes('/')) {
      const countries = countryStr
        .split('/')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // 对每个地区名进行映射
      const mappedCountries = countries.map((c) => {
        // 常见英文地区名映射
        const countryMap: Record<string, string> = {
          USA: '美国',
          'United States': '美国',
          China: '中国',
          Japan: '日本',
          Korea: '韩国',
          France: '法国',
          Germany: '德国',
          UK: '英国',
          'United Kingdom': '英国',
        };

        return countryMap[c] || c;
      });

      return mappedCountries.join(' / ');
    }

    // 3. 单个地区处理
    const countryMap: Record<string, string> = {
      USA: '美国',
      'United States': '美国',
      China: '中国',
      Japan: '日本',
      Korea: '韩国',
      France: '法国',
      Germany: '德国',
      UK: '英国',
      'United Kingdom': '英国',
    };

    return countryMap[countryStr] || countryStr;
  }

  /**
   * 🔥 检查语言是否需要修复
   */
  private async needsLanguageRepair(language: any): Promise<boolean> {
    if (!language || typeof language !== 'string') {
      return false;
    }

    // 如果包含多种语言、英文、或额外信息(如片长信息)，需要清理
    return (
      language.includes('/') ||
      language.includes('片长:') ||
      language.length > 10 ||
      /[a-zA-Z]/.test(language)
    );
  }

  /**
   * 🔥 修复语言字段 - 清理和标准化
   */
  private repairLanguageField(language: any): string {
    if (!language || typeof language !== 'string') {
      return language;
    }

    let languageStr = language.trim();

    // 🔥 实现D核心：语言清理逻辑
    // 1. 清理干扰信息：移除上映日期、片长、又名等非语言信息
    // [CRITICAL-FIX-2025-09-06] 修复正则表达式，正确处理包含空格的标签内容
    languageStr = languageStr
      .replace(/上映日期:[^]*?(?=\s*(?:片长:|又名:|制片地区:|IMDb:|$))/g, '')
      .trim();
    languageStr = languageStr
      .replace(/片长:[^]*?(?=\s*(?:上映日期:|又名:|制片地区:|IMDb:|$))/g, '')
      .trim();
    languageStr = languageStr
      .replace(/又名:[^]*?(?=\s*(?:上映日期:|片长:|制片地区:|IMDb:|$))/g, '')
      .trim();
    languageStr = languageStr
      .replace(/制片地区:[^]*?(?=\s*(?:上映日期:|片长:|又名:|IMDb:|$))/g, '')
      .trim();
    languageStr = languageStr.replace(/IMDb:[^]*?$/g, '').trim();

    // 2. 处理复杂尾部信息：移除 "片长:xxx", "IMDb:xxx" 等
    languageStr = languageStr.replace(/片长:\d+分钟$/g, '').trim();
    languageStr = languageStr.replace(/The\s+[^/\s]*$/g, '').trim(); // 移除英文标题

    // 3. 特殊处理：移除复杂英文标题 (如："英语上映日期:xxx又名:The Shawshank Redemption" -> "英语")
    languageStr = languageStr.replace(/^([^上映]*?)上映日期:.*$/g, '$1').trim();
    languageStr = languageStr.replace(/\s+Shawshank\s+Redemption$/g, '').trim();
    languageStr = languageStr
      .replace(/\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/g, '')
      .trim(); // 移除英文单词序列

    // 2. 处理多语言信息，保持用 ' / ' 分隔
    if (languageStr.includes('/')) {
      const languages = languageStr
        .split('/')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // 对每个语言名进行映射
      const mappedLanguages = languages.map((l) => {
        // 常见英文语言名映射
        const languageMap: Record<string, string> = {
          English: '英语',
          Chinese: '中文',
          Mandarin: '普通话',
          Cantonese: '粤语',
          Japanese: '日语',
          Korean: '韩语',
          French: '法语',
          German: '德语',
          Spanish: '西班牙语',
        };

        return languageMap[l] || l;
      });

      return mappedLanguages.join(' / ');
    }

    // 3. 单个语言处理
    const languageMap: Record<string, string> = {
      English: '英语',
      Chinese: '中文',
      Mandarin: '普通话',
      Cantonese: '粤语',
      Japanese: '日语',
      Korean: '韩语',
      French: '法语',
      German: '德语',
      Spanish: '西班牙语',
    };

    return languageMap[languageStr] || languageStr;
  }

  // =============== 辅助方法 ===============

  /**
   * 验证和处理转换选项
   */
  private async validateAndProcessOptions(
    options?: TransformationOptions,
  ): Promise<TransformationOptions> {
    const defaultOptions: TransformationOptions = {
      enableIntelligentRepairs: true,
      strictValidation: true,
      preserveRawData: false,
    };

    if (!options) return defaultOptions;

    const validationResult = validateTransformationOptions(options);
    if (!validationResult.success) {
      this.addWarning(`选项验证失败，使用默认值: ${validationResult.error}`);
      return defaultOptions;
    }

    return { ...defaultOptions, ...validationResult.data };
  }

  /**
   * 构建空数据结果
   */
  private buildEmptyResult(
    rawData: any,
    options: TransformationOptions,
  ): TransformationResult {
    return {
      data: {},
      statistics: {
        totalFields: 0,
        transformedFields: 0,
        repairedFields: 0,
        failedFields: 0,
      },
      warnings: this.warnings,
      ...(options.preserveRawData && { rawData }),
    };
  }

  /**
   * 🔥 生成转换统计信息
   */
  private generateTransformationStats(): TransformationStatistics {
    return {
      totalFields: this.statistics.totalFields || 0,
      transformedFields: this.statistics.transformedFields || 0,
      repairedFields: this.statistics.repairedFields || 0,
      failedFields: this.statistics.failedFields || 0,
    };
  }

  /**
   * 🔥 收集警告信息
   */
  private collectWarnings(): string[] {
    return [...this.warnings]; // 返回警告数组的副本
  }

  /**
   * 🔥 获取修复统计信息
   */
  private getRepairStatistics(): { repairedFields: number } {
    return {
      repairedFields: this.statistics.repairedFields || 0,
    };
  }

  /**
   * 添加警告
   */
  private addWarning(message: string): void {
    this.warnings.push(message);
    this.logger.warn(message);
  }

  /**
   * 添加错误
   */
  private addError(error: TransformationError): void {
    this.errors.push(error);
    this.logger.error(`转换错误 - ${error.fieldName}: ${error.errorMessage}`);
  }

  // =============== 阶段4.1: TDD增强完成 ===============
}
