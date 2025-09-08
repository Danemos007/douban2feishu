/**
 * 字段创建配置模块测试套件
 *
 * TDD原则: 全面验证配置的正确性和完整性
 * 测试覆盖: 4种内容类型、状态差异、字段模板、边界条件
 */

import {
  FieldCreationConfigManager,
  STATUS_OPTIONS_BY_CONTENT_TYPE,
  CONTENT_TYPE_CONFIGS,
  FieldTemplateBuilder,
} from './field-creation-config';

import { FeishuFieldType } from '../schemas/field.schema';
import { ContentType } from '../schemas/field-creation.schema';

describe('FieldCreationConfigManager', () => {
  let configManager: FieldCreationConfigManager;

  beforeEach(() => {
    configManager = new FieldCreationConfigManager();
  });

  describe('getContentTypeConfig', () => {
    it('should return valid config for books', () => {
      const config = configManager.getContentTypeConfig('books');

      expect(config).toBeDefined();
      expect(config.statusOptions).toBeDefined();
      expect(config.fieldTemplates).toBeDefined();
      expect(config.statusOptions).toHaveLength(3); // 书籍3个状态
    });

    it('should return valid config for movies', () => {
      const config = configManager.getContentTypeConfig('movies');

      expect(config).toBeDefined();
      expect(config.statusOptions).toHaveLength(2); // 电影2个状态
    });

    it('should return valid config for tv', () => {
      const config = configManager.getContentTypeConfig('tv');

      expect(config).toBeDefined();
      expect(config.statusOptions).toHaveLength(3); // 电视剧3个状态
    });

    it('should return valid config for documentary', () => {
      const config = configManager.getContentTypeConfig('documentary');

      expect(config).toBeDefined();
      expect(config.statusOptions).toHaveLength(3); // 纪录片3个状态
    });

    it('should throw error for unsupported content type', () => {
      expect(() => {
        configManager.getContentTypeConfig('invalid' as ContentType);
      }).toThrow('不支持的内容类型');
    });
  });

  describe('getStatusOptions', () => {
    it('should return correct book status options', () => {
      const options = configManager.getStatusOptions('books');

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.name)).toEqual(['想读', '在读', '读过']);
      expect(options.map((o) => o.color)).toEqual([5, 4, 0]);
    });

    it('should return correct movie status options', () => {
      const options = configManager.getStatusOptions('movies');

      expect(options).toHaveLength(2);
      expect(options.map((o) => o.name)).toEqual(['想看', '看过']);
      expect(options.map((o) => o.color)).toEqual([5, 0]);
    });

    it('should return correct tv status options', () => {
      const options = configManager.getStatusOptions('tv');

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.name)).toEqual(['想看', '在看', '看过']);
    });

    it('should return correct documentary status options', () => {
      const options = configManager.getStatusOptions('documentary');

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.name)).toEqual(['想看', '在看', '看过']);
    });
  });

  describe('getFieldTemplate', () => {
    it('should return status field template for books', () => {
      const template = configManager.getFieldTemplate('books', '我的状态');

      expect(template).toBeDefined();
      expect(template?.field_name).toBe('我的状态');
      expect(template?.type).toBe(FeishuFieldType.SingleSelect);
      expect(template?.ui_type).toBe('SingleSelect');
      expect(template?.property?.options).toHaveLength(3);
    });

    it('should return rating field template', () => {
      const template = configManager.getFieldTemplate('books', '我的评分');

      expect(template).toBeDefined();
      expect(template?.field_name).toBe('我的评分');
      expect(template?.type).toBe(FeishuFieldType.Number);
      expect(template?.ui_type).toBe('Rating');
      expect(template?.property?.formatter).toBe('0');
      expect(template?.property?.rating?.symbol).toBe('star');
    });

    it('should return douban rating field template', () => {
      const template = configManager.getFieldTemplate('books', '豆瓣评分');

      expect(template).toBeDefined();
      expect(template?.type).toBe(FeishuFieldType.Number);
      expect(template?.ui_type).toBe('Number');
      expect(template?.property?.range?.min).toBe(0);
      expect(template?.property?.range?.max).toBe(10);
      expect(template?.property?.precision).toBe(1);
    });

    it('should return datetime field template', () => {
      const template = configManager.getFieldTemplate('books', '标记日期');

      expect(template).toBeDefined();
      expect(template?.type).toBe(FeishuFieldType.DateTime);
      expect(template?.ui_type).toBe('DateTime');
    });

    it('should return url field template', () => {
      const template = configManager.getFieldTemplate('books', '封面图');

      expect(template).toBeDefined();
      expect(template?.type).toBe(FeishuFieldType.URL);
      expect(template?.ui_type).toBe('Url');
    });

    it('should return text field template with auto_wrap', () => {
      const template = configManager.getFieldTemplate('books', '内容简介');

      expect(template).toBeDefined();
      expect(template?.type).toBe(FeishuFieldType.Text);
      expect(template?.ui_type).toBe('Text');
      expect(template?.property?.auto_wrap).toBe(true);
    });

    it('should return null for unsupported field name', () => {
      const template = configManager.getFieldTemplate('books', '不存在的字段');

      expect(template).toBeNull();
    });
  });

  describe('isFieldNameSupported', () => {
    it('should return true for supported field names', () => {
      const supportedFields = [
        'Subject ID',
        '我的状态',
        '我的评分',
        '豆瓣评分',
        '标记日期',
        '封面图',
      ];

      supportedFields.forEach((fieldName) => {
        expect(configManager.isFieldNameSupported(fieldName, 'books')).toBe(
          true,
        );
      });
    });

    it('should return false for unsupported field names', () => {
      expect(configManager.isFieldNameSupported('不存在的字段', 'books')).toBe(
        false,
      );
      expect(configManager.isFieldNameSupported('', 'books')).toBe(false);
    });

    it('should support content-specific field names', () => {
      // 书籍特有字段
      expect(configManager.isFieldNameSupported('书名', 'books')).toBe(true);
      expect(configManager.isFieldNameSupported('书名', 'movies')).toBe(false);

      // 电影特有字段
      expect(configManager.isFieldNameSupported('电影名', 'movies')).toBe(true);
      expect(configManager.isFieldNameSupported('电影名', 'books')).toBe(false);
    });
  });

  describe('getSupportedFieldNames', () => {
    it('should return all supported field names for books', () => {
      const fieldNames = configManager.getSupportedFieldNames('books');

      expect(fieldNames).toContain('Subject ID');
      expect(fieldNames).toContain('我的状态');
      expect(fieldNames).toContain('书名');
      expect(fieldNames).toContain('副标题');
      expect(fieldNames).not.toContain('电影名');
    });

    it('should return different field names for different content types', () => {
      const bookFields = configManager.getSupportedFieldNames('books');
      const movieFields = configManager.getSupportedFieldNames('movies');

      expect(bookFields).toContain('书名');
      expect(movieFields).toContain('电影名');
      expect(movieFields).not.toContain('书名');
    });
  });

  describe('getFieldCreationDelay', () => {
    it('should return 1000ms delay', () => {
      const delay = configManager.getFieldCreationDelay();
      expect(delay).toBe(1000);
    });
  });

  describe('getMaxBatchSize', () => {
    it('should return reasonable batch size', () => {
      const batchSize = configManager.getMaxBatchSize();
      expect(batchSize).toBe(20);
    });
  });

  describe('getFieldTypeDistribution', () => {
    it('should return field type statistics for books', () => {
      const distribution = configManager.getFieldTypeDistribution('books');

      expect(distribution).toBeDefined();
      expect(distribution['Text']).toBeGreaterThan(0);
      expect(distribution['SingleSelect']).toBe(1); // 我的状态
      expect(distribution['Rating']).toBe(1); // 我的评分
      expect(distribution['Number']).toBe(1); // 豆瓣评分
      expect(distribution['DateTime']).toBe(1); // 标记日期
      expect(distribution['Url']).toBe(1); // 封面图
    });

    it('should return different distributions for different content types', () => {
      const bookDist = configManager.getFieldTypeDistribution('books');
      const movieDist = configManager.getFieldTypeDistribution('movies');

      // 都应该有基础字段类型
      expect(bookDist['Text']).toBeGreaterThan(0);
      expect(movieDist['Text']).toBeGreaterThan(0);
      expect(bookDist['SingleSelect']).toBe(1);
      expect(movieDist['SingleSelect']).toBe(1);
    });
  });

  describe('validateFieldConfiguration', () => {
    it('should validate book configuration as valid', () => {
      const validation = configManager.validateFieldConfiguration('books');

      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate all content types as valid', () => {
      const contentTypes: ContentType[] = [
        'books',
        'movies',
        'tv',
        'documentary',
      ];

      contentTypes.forEach((contentType) => {
        const validation =
          configManager.validateFieldConfiguration(contentType);
        expect(validation.isValid).toBe(true);
      });
    });
  });

  describe('getConfigStats', () => {
    it('should return comprehensive statistics', () => {
      const stats = configManager.getConfigStats();

      expect(stats.totalContentTypes).toBe(4);
      expect(stats.totalFieldTemplates).toBeGreaterThan(0);
      expect(stats.contentTypeDetails.books).toBeDefined();
      expect(stats.contentTypeDetails.movies).toBeDefined();
      expect(stats.contentTypeDetails.tv).toBeDefined();
      expect(stats.contentTypeDetails.documentary).toBeDefined();
    });

    it('should show correct status option counts', () => {
      const stats = configManager.getConfigStats();

      expect(stats.contentTypeDetails.books.statusOptionCount).toBe(3);
      expect(stats.contentTypeDetails.movies.statusOptionCount).toBe(2);
      expect(stats.contentTypeDetails.tv.statusOptionCount).toBe(3);
      expect(stats.contentTypeDetails.documentary.statusOptionCount).toBe(3);
    });
  });
});

describe('STATUS_OPTIONS_BY_CONTENT_TYPE', () => {
  it('should have correct structure for all content types', () => {
    expect(STATUS_OPTIONS_BY_CONTENT_TYPE.books).toHaveLength(3);
    expect(STATUS_OPTIONS_BY_CONTENT_TYPE.movies).toHaveLength(2);
    expect(STATUS_OPTIONS_BY_CONTENT_TYPE.tv).toHaveLength(3);
    expect(STATUS_OPTIONS_BY_CONTENT_TYPE.documentary).toHaveLength(3);
  });

  it('should have correct book status options', () => {
    const bookOptions = STATUS_OPTIONS_BY_CONTENT_TYPE.books;

    expect(bookOptions[0].name).toBe('想读');
    expect(bookOptions[1].name).toBe('在读'); // 书籍独有
    expect(bookOptions[2].name).toBe('读过');
  });

  it('should have correct movie status options', () => {
    const movieOptions = STATUS_OPTIONS_BY_CONTENT_TYPE.movies;

    expect(movieOptions[0].name).toBe('想看');
    expect(movieOptions[1].name).toBe('看过');
    // 电影没有"在看"状态
  });

  it('should have valid color values', () => {
    Object.values(STATUS_OPTIONS_BY_CONTENT_TYPE).forEach((options) => {
      options.forEach((option) => {
        expect(option.color).toBeGreaterThanOrEqual(0);
        expect(option.color).toBeLessThanOrEqual(15);
        expect(Number.isInteger(option.color)).toBe(true);
      });
    });
  });
});

describe('CONTENT_TYPE_CONFIGS', () => {
  it('should have all 4 content types', () => {
    const contentTypes = Object.keys(CONTENT_TYPE_CONFIGS);
    expect(contentTypes).toEqual(['books', 'movies', 'tv', 'documentary']);
  });

  it('should have consistent structure for all content types', () => {
    Object.values(CONTENT_TYPE_CONFIGS).forEach((config) => {
      expect(config.statusOptions).toBeDefined();
      expect(config.fieldTemplates).toBeDefined();
      expect(Array.isArray(config.statusOptions)).toBe(true);
      expect(typeof config.fieldTemplates).toBe('object');
    });
  });

  it('should have essential fields for all content types', () => {
    const essentialFields = ['Subject ID', '我的状态', '我的评分', '豆瓣评分'];

    Object.entries(CONTENT_TYPE_CONFIGS).forEach(([contentType, config]) => {
      essentialFields.forEach((fieldName) => {
        expect(config.fieldTemplates[fieldName]).toBeDefined();
      });
    });
  });
});

describe('FieldTemplateBuilder', () => {
  let builder: FieldTemplateBuilder;

  beforeEach(() => {
    builder = new FieldTemplateBuilder();
  });

  describe('buildStatusField', () => {
    it('should build correct status field for books', () => {
      const field = builder.buildStatusField('books');

      expect(field.field_name).toBe('我的状态');
      expect(field.type).toBe(FeishuFieldType.SingleSelect);
      expect(field.property?.options).toHaveLength(3);
    });

    it('should build correct status field for movies', () => {
      const field = builder.buildStatusField('movies');

      expect(field.field_name).toBe('我的状态');
      expect(field.property?.options).toHaveLength(2);
    });
  });

  describe('buildRatingField', () => {
    it('should build rating field with complete configuration', () => {
      const field = builder.buildRatingField();

      expect(field.field_name).toBe('我的评分');
      expect(field.type).toBe(FeishuFieldType.Number);
      expect(field.ui_type).toBe('Rating');
      expect(field.property?.formatter).toBe('0');
      expect(field.property?.min).toBe(1);
      expect(field.property?.max).toBe(5);
      expect(field.property?.rating?.symbol).toBe('star');
    });
  });

  describe('buildDoubanRatingField', () => {
    it('should build douban rating field with correct range', () => {
      const field = builder.buildDoubanRatingField();

      expect(field.field_name).toBe('豆瓣评分');
      expect(field.type).toBe(FeishuFieldType.Number);
      expect(field.ui_type).toBe('Number');
      expect(field.property?.range?.min).toBe(0);
      expect(field.property?.range?.max).toBe(10);
      expect(field.property?.precision).toBe(1);
    });
  });

  describe('buildDateTimeField', () => {
    it('should build datetime field correctly', () => {
      const field = builder.buildDateTimeField('标记日期');

      expect(field.field_name).toBe('标记日期');
      expect(field.type).toBe(FeishuFieldType.DateTime);
      expect(field.ui_type).toBe('DateTime');
    });
  });

  describe('buildTextField', () => {
    it('should build basic text field', () => {
      const field = builder.buildTextField('书名');

      expect(field.field_name).toBe('书名');
      expect(field.type).toBe(FeishuFieldType.Text);
      expect(field.ui_type).toBe('Text');
      expect(field.property).toBeUndefined();
    });

    it('should build text field with auto wrap', () => {
      const field = builder.buildTextField('内容简介', true);

      expect(field.field_name).toBe('内容简介');
      expect(field.property?.auto_wrap).toBe(true);
    });
  });

  describe('buildUrlField', () => {
    it('should build url field correctly', () => {
      const field = builder.buildUrlField('封面图');

      expect(field.field_name).toBe('封面图');
      expect(field.type).toBe(FeishuFieldType.URL);
      expect(field.ui_type).toBe('Url');
    });
  });
});

describe('Integration Tests', () => {
  it('should support complete field creation workflow', () => {
    const configManager = new FieldCreationConfigManager();

    // 验证可以为所有内容类型获取配置
    const contentTypes: ContentType[] = [
      'books',
      'movies',
      'tv',
      'documentary',
    ];

    contentTypes.forEach((contentType) => {
      const config = configManager.getContentTypeConfig(contentType);
      expect(config).toBeDefined();

      // 验证有必需字段
      expect(config.fieldTemplates['Subject ID']).toBeDefined();
      expect(config.fieldTemplates['我的状态']).toBeDefined();

      // 验证状态选项正确
      const statusOptions = config.statusOptions;
      if (contentType === 'movies') {
        expect(statusOptions).toHaveLength(2);
      } else {
        expect(statusOptions).toHaveLength(3);
      }
    });
  });

  it('should maintain consistency between status options and templates', () => {
    const configManager = new FieldCreationConfigManager();

    Object.entries(STATUS_OPTIONS_BY_CONTENT_TYPE).forEach(
      ([contentType, expectedOptions]) => {
        const config = configManager.getContentTypeConfig(
          contentType as ContentType,
        );
        const statusTemplate = config.fieldTemplates['我的状态'];

        expect(statusTemplate?.property?.options).toEqual(expectedOptions);
      },
    );
  });
});
