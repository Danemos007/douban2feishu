/**
 * 字段自动创建配置模块
 *
 * 整合历史测试文件的最佳实践：
 * - sync-movie-from-cache.ts: 完整的18字段Switch逻辑
 * - sync-from-cache.ts: 书籍专用的精细化状态配置
 * - 现有正式架构: 基于真实API验证的配置参数
 *
 * 支持4种内容类型的差异化配置：
 * - books: 3个状态选项 (想读/在读/读过)
 * - movies: 2个状态选项 (想看/看过)
 * - tv: 3个状态选项 (想看/在看/看过)
 * - documentary: 3个状态选项 (想看/在看/看过)
 */

import { Injectable, Logger } from '@nestjs/common';
import { FeishuFieldType } from '../schemas/field.schema';
import {
  ContentType,
  ContentTypeConfig,
  FieldCreationConfig,
  StatusOption,
} from '../schemas/field-creation.schema';
import { IFieldCreationConfigManager } from '../interfaces/field-creation.interface';

/**
 * 4种内容类型的状态配置 - 基于用户需求分析
 */
const STATUS_OPTIONS_BY_CONTENT_TYPE: Record<ContentType, StatusOption[]> = {
  books: [
    { name: '想读', color: 5 }, // 粉色
    { name: '在读', color: 4 }, // 薄荷绿 - 书籍独有状态
    { name: '读过', color: 0 }, // 蓝紫色
  ],
  movies: [
    { name: '想看', color: 5 }, // 粉色
    { name: '看过', color: 0 }, // 蓝紫色 - 电影只有2个状态
  ],
  tv: [
    { name: '想看', color: 5 }, // 粉色
    { name: '在看', color: 4 }, // 薄荷绿
    { name: '看过', color: 0 }, // 蓝紫色
  ],
  documentary: [
    { name: '想看', color: 5 }, // 粉色
    { name: '在看', color: 4 }, // 薄荷绿
    { name: '看过', color: 0 }, // 蓝紫色
  ],
};

/**
 * 通用字段模板 - 基于历史测试文件的完整Switch逻辑
 */
class FieldTemplateBuilder {
  /**
   * 🏆 构建状态字段 - 整合两版本的状态配置逻辑
   */
  buildStatusField(contentType: ContentType): FieldCreationConfig {
    const options = STATUS_OPTIONS_BY_CONTENT_TYPE[contentType];

    return {
      field_name: '我的状态',
      type: FeishuFieldType.SingleSelect,
      ui_type: 'SingleSelect',
      property: { options },
    };
  }

  /**
   * 🏆 构建评分字段 - 基于最新正式架构的完整配置
   */
  buildRatingField(): FieldCreationConfig {
    return {
      field_name: '我的评分',
      type: FeishuFieldType.Number, // ✅ 基于真实API发现：Rating是Number类型
      ui_type: 'Rating',
      property: {
        formatter: '0', // ✅ 必需参数：来自正式文件验证
        min: 1,
        max: 5,
        rating: { symbol: 'star' },
      },
    };
  }

  /**
   * 🏆 构建豆瓣评分字段 - 数字类型配置
   */
  buildDoubanRatingField(): FieldCreationConfig {
    return {
      field_name: '豆瓣评分',
      type: FeishuFieldType.Number,
      ui_type: 'Number',
      property: {
        range: { min: 0, max: 10 },
        precision: 1,
      },
    };
  }

  /**
   * 🏆 构建日期时间字段 - 标记日期专用
   */
  buildDateTimeField(fieldName: string): FieldCreationConfig {
    return {
      field_name: fieldName,
      type: FeishuFieldType.DateTime, // ✅ 确认：标记日期使用DateTime
      ui_type: 'DateTime',
    };
  }

  /**
   * 🏆 构建文本字段 - 支持自动换行配置
   */
  buildTextField(fieldName: string, autoWrap = false): FieldCreationConfig {
    const config: FieldCreationConfig = {
      field_name: fieldName,
      type: FeishuFieldType.Text,
      ui_type: 'Text',
    };

    if (autoWrap) {
      config.property = { auto_wrap: true };
    }

    return config;
  }

  /**
   * 🏆 构建URL字段 - 封面图专用
   */
  buildUrlField(fieldName: string): FieldCreationConfig {
    return {
      field_name: fieldName,
      type: FeishuFieldType.URL,
      ui_type: 'Url',
    };
  }
}

/**
 * 字段模板映射 - 整合历史测试文件的完整字段配置
 */
const createFieldTemplates = (
  contentType: ContentType,
): Record<string, FieldCreationConfig> => {
  const builder = new FieldTemplateBuilder();

  // 通用字段模板
  const baseTemplates: Record<string, FieldCreationConfig> = {
    // 核心标识字段
    'Subject ID': builder.buildTextField('Subject ID'),

    // 状态和评分字段 - 不同内容类型有差异
    我的状态: builder.buildStatusField(contentType),
    我的评分: builder.buildRatingField(),
    豆瓣评分: builder.buildDoubanRatingField(),

    // 标签和备注
    我的标签: builder.buildTextField('我的标签'),
    我的备注: builder.buildTextField('我的备注'),

    // 日期字段
    标记日期: builder.buildDateTimeField('标记日期'),

    // URL字段
    封面图: builder.buildUrlField('封面图'),

    // 长文本字段 - 启用自动换行
    内容简介: builder.buildTextField('内容简介', true),
    剧情简介: builder.buildTextField('剧情简介', true),

    // 创作人员字段
    作者: builder.buildTextField('作者'),
    译者: builder.buildTextField('译者'),
    导演: builder.buildTextField('导演'),
    主演: builder.buildTextField('主演'),
    编剧: builder.buildTextField('编剧'),

    // 出版/制作信息
    出版社: builder.buildTextField('出版社'),
    出版年份: builder.buildTextField('出版年份'),
    制片地区: builder.buildTextField('制片地区'),
    语言: builder.buildTextField('语言'),
  };

  // 内容类型特定字段
  const contentSpecificTemplates: Record<string, FieldCreationConfig> = {};

  switch (contentType) {
    case 'books':
      // 书籍特有字段
      Object.assign(contentSpecificTemplates, {
        书名: builder.buildTextField('书名'),
        副标题: builder.buildTextField('副标题'),
        原作名: builder.buildTextField('原作名'),
      });
      break;

    case 'movies':
      // 电影特有字段
      Object.assign(contentSpecificTemplates, {
        电影名: builder.buildTextField('电影名'),
        类型: builder.buildTextField('类型'),
        片长: builder.buildTextField('片长'),
        上映日期: builder.buildTextField('上映日期'), // ✅ 文本类型保持地区信息
      });
      break;

    case 'tv':
    case 'documentary':
      // 电视剧/纪录片特有字段
      Object.assign(contentSpecificTemplates, {
        片名: builder.buildTextField('片名'),
        类型: builder.buildTextField('类型'),
        单集片长: builder.buildTextField('单集片长'),
        集数: builder.buildTextField('集数'),
        首播日期: builder.buildTextField('首播日期'), // ✅ 文本类型保持地区信息
      });
      break;
  }

  return { ...baseTemplates, ...contentSpecificTemplates };
};

/**
 * 完整内容类型配置 - 4种类型的完整支持
 */
const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  books: {
    statusOptions: STATUS_OPTIONS_BY_CONTENT_TYPE.books,
    fieldTemplates: createFieldTemplates('books'),
  },
  movies: {
    statusOptions: STATUS_OPTIONS_BY_CONTENT_TYPE.movies,
    fieldTemplates: createFieldTemplates('movies'),
  },
  tv: {
    statusOptions: STATUS_OPTIONS_BY_CONTENT_TYPE.tv,
    fieldTemplates: createFieldTemplates('tv'),
  },
  documentary: {
    statusOptions: STATUS_OPTIONS_BY_CONTENT_TYPE.documentary,
    fieldTemplates: createFieldTemplates('documentary'),
  },
};

/**
 * 字段创建配置管理器
 *
 * 实现IFieldCreationConfigManager接口，提供企业级配置管理
 */
@Injectable()
export class FieldCreationConfigManager implements IFieldCreationConfigManager {
  private readonly logger = new Logger(FieldCreationConfigManager.name);

  /**
   * 获取内容类型配置
   */
  getContentTypeConfig(contentType: ContentType): ContentTypeConfig {
    const config = CONTENT_TYPE_CONFIGS[contentType];
    if (!config) {
      this.logger.error(`Unsupported content type: ${contentType}`);
      throw new Error(`不支持的内容类型: ${contentType}`);
    }
    return config;
  }

  /**
   * 获取字段模板
   */
  getFieldTemplate(
    contentType: ContentType,
    fieldName: string,
  ): FieldCreationConfig | null {
    const config = this.getContentTypeConfig(contentType);
    return config.fieldTemplates[fieldName] || null;
  }

  /**
   * 获取状态选项 - 支持4种内容类型的状态差异
   */
  getStatusOptions(contentType: ContentType): StatusOption[] {
    const config = this.getContentTypeConfig(contentType);
    return config.statusOptions;
  }

  /**
   * 验证字段名是否支持
   */
  isFieldNameSupported(fieldName: string, contentType: ContentType): boolean {
    const config = this.getContentTypeConfig(contentType);
    return fieldName in config.fieldTemplates;
  }

  /**
   * 获取所有支持的字段名
   */
  getSupportedFieldNames(contentType: ContentType): string[] {
    const config = this.getContentTypeConfig(contentType);
    return Object.keys(config.fieldTemplates);
  }

  /**
   * 获取字段创建延迟 - 基于最佳实践验证的1秒延迟
   */
  getFieldCreationDelay(): number {
    return 1000; // ✅ 基于正式服务验证的最佳延迟
  }

  /**
   * 获取批量创建的最大字段数
   */
  getMaxBatchSize(): number {
    return 20; // 合理的批量限制，避免API超时
  }

  /**
   * 获取字段类型统计信息
   */
  getFieldTypeDistribution(contentType: ContentType): Record<string, number> {
    const config = this.getContentTypeConfig(contentType);
    const distribution: Record<string, number> = {};

    Object.values(config.fieldTemplates).forEach((template) => {
      const typeName = template.ui_type;
      distribution[typeName] = (distribution[typeName] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 验证字段配置的完整性
   */
  validateFieldConfiguration(contentType: ContentType): {
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  } {
    const config = this.getContentTypeConfig(contentType);
    const errors: string[] = [];
    const missingFields: string[] = [];

    // 验证必需字段存在
    const requiredFields = ['Subject ID', '我的状态'];
    requiredFields.forEach((fieldName) => {
      if (!config.fieldTemplates[fieldName]) {
        missingFields.push(fieldName);
      }
    });

    // 验证状态字段配置
    const statusTemplate = config.fieldTemplates['我的状态'];
    if (statusTemplate) {
      if (!statusTemplate.property?.options) {
        errors.push('状态字段缺少选项配置');
      } else if (statusTemplate.property.options.length === 0) {
        errors.push('状态字段选项为空');
      }
    }

    // 验证评分字段配置
    const ratingTemplate = config.fieldTemplates['我的评分'];
    if (ratingTemplate) {
      if (!ratingTemplate.property?.formatter) {
        errors.push('评分字段缺少formatter配置');
      }
      if (!ratingTemplate.property?.rating) {
        errors.push('评分字段缺少rating配置');
      }
    }

    return {
      isValid: errors.length === 0 && missingFields.length === 0,
      missingFields,
      errors,
    };
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): {
    totalContentTypes: number;
    totalFieldTemplates: number;
    contentTypeDetails: Record<
      ContentType,
      {
        fieldCount: number;
        statusOptionCount: number;
        fieldTypes: string[];
      }
    >;
  } {
    // Initialize with proper type-safe implementation
    const contentTypeDetails = Object.fromEntries(
      Object.entries(CONTENT_TYPE_CONFIGS).map(([contentType, config]) => {
        const fieldTemplates = Object.values(config.fieldTemplates);
        const fieldTypes = [...new Set(fieldTemplates.map((t) => t.ui_type))];

        return [
          contentType,
          {
            fieldCount: fieldTemplates.length,
            statusOptionCount: config.statusOptions.length,
            fieldTypes,
          },
        ];
      }),
      // Reason: Object.fromEntries returns {[k: string]: any}, TypeScript cannot infer the precise Record type
    ) as Record<
      ContentType,
      {
        fieldCount: number;
        statusOptionCount: number;
        fieldTypes: string[];
      }
    >;

    const totalFieldTemplates = Object.values(CONTENT_TYPE_CONFIGS).reduce(
      (total, config) => total + Object.keys(config.fieldTemplates).length,
      0,
    );

    return {
      totalContentTypes: Object.keys(CONTENT_TYPE_CONFIGS).length,
      totalFieldTemplates,
      contentTypeDetails,
    };
  }
}

// 导出配置常量供测试使用
export {
  STATUS_OPTIONS_BY_CONTENT_TYPE,
  CONTENT_TYPE_CONFIGS,
  FieldTemplateBuilder,
};
