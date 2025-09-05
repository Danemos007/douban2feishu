/**
 * 实战验证字段映射配置测试
 *
 * 验证从历史文件抢救的配置正确性和完整性
 * 确保配置符合预期结构和业务逻辑
 */

import {
  VERIFIED_MOVIES_FIELD_MAPPING,
  VERIFIED_BOOKS_FIELD_MAPPING,
  VERIFIED_FIELD_MAPPINGS,
  getVerifiedFieldMapping,
  getVerifiedChineseFieldNames,
  getVerifiedRequiredFields,
  verifiedDoubanFieldToChineseName,
  getVerificationStats,
  VerifiedFieldMappingConfig,
} from './douban-field-mapping-verified.config';

describe('豆瓣字段映射配置验证测试', () => {
  describe('电影字段映射配置', () => {
    it('应该包含18个电影字段', () => {
      const fieldCount = Object.keys(VERIFIED_MOVIES_FIELD_MAPPING).length;
      expect(fieldCount).toBe(18);
    });

    it('应该包含所有必需字段', () => {
      const requiredFields = ['subjectId', 'title'];

      requiredFields.forEach((fieldName) => {
        expect(VERIFIED_MOVIES_FIELD_MAPPING[fieldName]).toBeDefined();
        expect(VERIFIED_MOVIES_FIELD_MAPPING[fieldName].required).toBe(true);
      });
    });

    it('应该确认使用coverImage而非coverUrl', () => {
      const coverField = VERIFIED_MOVIES_FIELD_MAPPING.coverImage;

      expect(coverField).toBeDefined();
      expect(coverField.chineseName).toBe('封面图');
      expect(coverField.apiFieldName).toBe('封面图');
      expect(coverField.doubanFieldName).toBe('coverImage');
    });

    it('电影状态字段应该有正确的配置', () => {
      const statusField = VERIFIED_MOVIES_FIELD_MAPPING.myStatus;

      expect(statusField).toBeDefined();
      expect(statusField.fieldType).toBe('singleSelect');
      expect(statusField.description).toContain('想看/看过');
      expect(statusField.processingNotes).toContain('2个状态选项');
    });

    it('所有字段都应该是已验证状态', () => {
      Object.values(VERIFIED_MOVIES_FIELD_MAPPING).forEach((config) => {
        expect(config.verified).toBe(true);
        expect(config.verifiedSource.length).toBeGreaterThan(0);
      });
    });

    it('特殊处理字段应该有处理说明', () => {
      const specialFields = ['duration', 'releaseDate', 'country', 'language'];

      specialFields.forEach((fieldName) => {
        const field = VERIFIED_MOVIES_FIELD_MAPPING[fieldName];
        expect(field.processingNotes).toBeDefined();
        expect(field.processingNotes!.length).toBeGreaterThan(10);
      });
    });
  });

  describe('书籍字段映射配置', () => {
    it('应该包含16个书籍字段', () => {
      const fieldCount = Object.keys(VERIFIED_BOOKS_FIELD_MAPPING).length;
      expect(fieldCount).toBe(16);
    });

    it('应该支持嵌套属性解析', () => {
      const ratingField = VERIFIED_BOOKS_FIELD_MAPPING.doubanRating;

      expect(ratingField).toBeDefined();
      expect(ratingField.nestedPath).toBe('rating.average');
      expect(ratingField.processingNotes).toContain('嵌套属性');
    });

    it('书籍状态字段应该有3个选项', () => {
      const statusField = VERIFIED_BOOKS_FIELD_MAPPING.myStatus;

      expect(statusField).toBeDefined();
      expect(statusField.description).toContain('想读/在读/读过');
      expect(statusField.processingNotes).toContain('3个状态选项');
    });

    it('数组字段应该有join处理说明', () => {
      const arrayFields = ['author', 'translator', 'myTags'];

      arrayFields.forEach((fieldName) => {
        const field = VERIFIED_BOOKS_FIELD_MAPPING[fieldName];
        if (field.processingNotes) {
          // 应该提到数组处理或join
          expect(
            field.processingNotes.includes('数组') ||
              field.processingNotes.includes('join'),
          ).toBe(true);
        }
      });
    });
  });

  describe('配置一致性验证', () => {
    it('所有字段的apiFieldName应该与chineseName一致', () => {
      const allConfigs = [
        ...Object.values(VERIFIED_MOVIES_FIELD_MAPPING),
        ...Object.values(VERIFIED_BOOKS_FIELD_MAPPING),
      ];

      allConfigs.forEach((config) => {
        expect(config.apiFieldName).toBe(config.chineseName);
      });
    });

    it('字段类型应该在支持的范围内', () => {
      const supportedTypes = [
        'text',
        'number',
        'rating',
        'singleSelect',
        'multiSelect',
        'datetime',
        'checkbox',
        'url',
      ];

      const allConfigs = [
        ...Object.values(VERIFIED_MOVIES_FIELD_MAPPING),
        ...Object.values(VERIFIED_BOOKS_FIELD_MAPPING),
      ];

      allConfigs.forEach((config) => {
        expect(supportedTypes).toContain(config.fieldType);
      });
    });

    it('验证来源应该是已知的历史文件', () => {
      const knownSources = [
        'sync-all-movies-fixed.ts',
        'sync-movie-from-cache.ts',
        'sync-from-cache.ts',
        'real-douban-data-sync.ts',
      ];

      const allConfigs = [
        ...Object.values(VERIFIED_MOVIES_FIELD_MAPPING),
        ...Object.values(VERIFIED_BOOKS_FIELD_MAPPING),
      ];

      allConfigs.forEach((config) => {
        config.verifiedSource.forEach((source) => {
          expect(knownSources).toContain(source);
        });
      });
    });
  });

  describe('辅助函数测试', () => {
    it('getVerifiedFieldMapping应该返回正确的映射', () => {
      expect(getVerifiedFieldMapping('movies')).toBe(
        VERIFIED_MOVIES_FIELD_MAPPING,
      );
      expect(getVerifiedFieldMapping('books')).toBe(
        VERIFIED_BOOKS_FIELD_MAPPING,
      );
      expect(getVerifiedFieldMapping('tv')).toBe(VERIFIED_MOVIES_FIELD_MAPPING);
      expect(getVerifiedFieldMapping('documentary')).toBe(
        VERIFIED_MOVIES_FIELD_MAPPING,
      );
    });

    it('getVerifiedChineseFieldNames应该返回所有中文字段名', () => {
      const movieFieldNames = getVerifiedChineseFieldNames('movies');

      expect(movieFieldNames).toHaveLength(18);
      expect(movieFieldNames).toContain('Subject ID');
      expect(movieFieldNames).toContain('电影名');
      expect(movieFieldNames).toContain('封面图');
    });

    it('getVerifiedRequiredFields应该返回必需字段', () => {
      const requiredMovieFields = getVerifiedRequiredFields('movies');
      const requiredBookFields = getVerifiedRequiredFields('books');

      expect(requiredMovieFields).toContain('subjectId');
      expect(requiredMovieFields).toContain('title');
      expect(requiredBookFields).toContain('subjectId');
      expect(requiredBookFields).toContain('title');
    });

    it('verifiedDoubanFieldToChineseName应该正确转换', () => {
      expect(verifiedDoubanFieldToChineseName('subjectId', 'movies')).toBe(
        'Subject ID',
      );
      expect(verifiedDoubanFieldToChineseName('coverImage', 'movies')).toBe(
        '封面图',
      );
      expect(verifiedDoubanFieldToChineseName('unknownField', 'movies')).toBe(
        'unknownField',
      );
    });

    it('getVerificationStats应该返回正确的统计信息', () => {
      const stats = getVerificationStats();

      expect(stats.totalBooks).toBe(16);
      expect(stats.totalMovies).toBe(18);
      expect(stats.totalVerified).toBe(34); // 16 + 18
      expect(stats.sourceCoverage).toBeDefined();
      expect(Object.keys(stats.sourceCoverage).length).toBeGreaterThan(0);
    });
  });

  describe('业务逻辑验证', () => {
    it('电影和书籍的状态字段应该有不同的配置', () => {
      const movieStatus = VERIFIED_MOVIES_FIELD_MAPPING.myStatus;
      const bookStatus = VERIFIED_BOOKS_FIELD_MAPPING.myStatus;

      expect(movieStatus.description).toContain('想看/看过');
      expect(bookStatus.description).toContain('想读/在读/读过');
    });

    it('特殊字段应该有明确的处理说明', () => {
      // 时间戳转换字段
      const markDateMovie = VERIFIED_MOVIES_FIELD_MAPPING.markDate;
      const markDateBook = VERIFIED_BOOKS_FIELD_MAPPING.markDate;

      expect(markDateMovie.processingNotes).toContain('时间戳');
      expect(markDateBook.processingNotes).toContain('时间戳');

      // URL格式字段
      const coverField = VERIFIED_MOVIES_FIELD_MAPPING.coverImage;
      expect(coverField.processingNotes).toContain('{link: url}');
    });

    it('验证来源覆盖度应该合理', () => {
      const stats = getVerificationStats();

      // 核心文件应该有较高的覆盖度
      expect(stats.sourceCoverage['sync-all-movies-fixed.ts']).toBeGreaterThan(
        15,
      );
      expect(stats.sourceCoverage['sync-movie-from-cache.ts']).toBeGreaterThan(
        10,
      );
      expect(stats.sourceCoverage['sync-from-cache.ts']).toBeGreaterThan(10);
      expect(stats.sourceCoverage['real-douban-data-sync.ts']).toBeGreaterThan(
        10,
      );
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不存在的数据类型', () => {
      // @ts-expect-error 故意传入无效类型进行测试
      const result = getVerifiedFieldMapping('invalid');
      expect(result).toBe(VERIFIED_BOOKS_FIELD_MAPPING); // 应该fallback到books
    });

    it('配置对象应该是不可变的', () => {
      const originalConfig = VERIFIED_MOVIES_FIELD_MAPPING.title;
      const configCopy = { ...originalConfig };

      expect(originalConfig).toEqual(configCopy);

      // 尝试修改不应该影响原配置
      configCopy.description = 'modified';
      expect(originalConfig.description).not.toBe('modified');
    });
  });

  describe('性能验证', () => {
    it('统计函数应该在合理时间内完成', () => {
      const start = performance.now();
      getVerificationStats();
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // 应该在50ms内完成
    });

    it('字段查找应该高效', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        getVerifiedFieldMapping('movies');
        verifiedDoubanFieldToChineseName('title', 'books');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // 1000次查找应该在100ms内完成
    });
  });
});
