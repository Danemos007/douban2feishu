/**
 * 飞书字段类型工具函数单元测试
 *
 * 测试策略：
 * - 零依赖纯函数测试
 * - 完整边界情况覆盖
 * - 语义匹配准确性验证
 * - 中英文字段名支持验证
 */

import { isRatingFieldType } from './field-type.util';
import { FeishuFieldType } from '../interfaces/api.interface';

describe('field-type.util', () => {
  describe('isRatingFieldType', () => {
    /**
     * 测试核心语义：明确的用户评分字段应该返回true
     */
    describe('用户评分字段识别 (应返回true)', () => {
      describe('中文字段名', () => {
        const testCases = ['我的评分', '个人评分', '用户评分', '我给的评分'];

        testCases.forEach((fieldName) => {
          it(`应该识别 "${fieldName}" 为Rating字段`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(true);
          });
        });
      });

      describe('英文字段名', () => {
        const testCases = [
          'myrating',
          'userrating',
          'personalrating',
          'myrate',
        ];

        testCases.forEach((fieldName) => {
          it(`应该识别 "${fieldName}" 为Rating字段`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(true);
          });
        });
      });

      describe('大小写不敏感', () => {
        const testCases = [
          'MyRating',
          'USERRATING',
          'PersonalRating',
          'myRate',
        ];

        testCases.forEach((fieldName) => {
          it(`应该识别 "${fieldName}" 为Rating字段 (大小写不敏感)`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(true);
          });
        });
      });

      describe('包含匹配', () => {
        const testCases = [
          '电影我的评分',
          'book_myrating',
          '用户评分_2024',
          'personalrating_field',
        ];

        testCases.forEach((fieldName) => {
          it(`应该识别包含评分关键词的字段 "${fieldName}"`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(true);
          });
        });
      });
    });

    /**
     * 测试核心语义：明确的官方/系统评分字段应该返回false
     */
    describe('官方评分字段识别 (应返回false)', () => {
      describe('中文字段名', () => {
        const testCases = ['豆瓣评分', '平均评分', '官方评分', '网站评分'];

        testCases.forEach((fieldName) => {
          it(`应该将 "${fieldName}" 识别为Number字段，而非Rating字段`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(false);
          });
        });
      });

      describe('英文字段名', () => {
        const testCases = [
          'doubanrating',
          'averagerating',
          'officialrating',
          'siterating',
        ];

        testCases.forEach((fieldName) => {
          it(`应该将 "${fieldName}" 识别为Number字段，而非Rating字段`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(false);
          });
        });
      });

      describe('大小写不敏感', () => {
        const testCases = [
          'DoubanRating',
          'AVERAGERATING',
          'OfficialRating',
          'siteRating',
        ];

        testCases.forEach((fieldName) => {
          it(`应该将 "${fieldName}" 识别为Number字段 (大小写不敏感)`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(false);
          });
        });
      });

      describe('包含匹配', () => {
        const testCases = [
          '电影豆瓣评分',
          'movie_doubanrating',
          '平均评分_2024',
          'officialrating_field',
        ];

        testCases.forEach((fieldName) => {
          it(`应该将包含官方评分关键词的字段 "${fieldName}" 识别为Number字段`, () => {
            const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
            expect(result).toBe(false);
          });
        });
      });
    });

    /**
     * 测试核心语义：非评分相关字段应该返回false
     */
    describe('非评分字段识别 (应返回false)', () => {
      const testCases = [
        // 常见字段名
        '书名',
        '作者',
        '出版社',
        '标题',
        'title',
        'author',
        'publisher',
        'description',

        // 数字字段但非评分
        '价格',
        '数量',
        '年份',
        'price',
        'quantity',
        'year',

        // 可能造成误判的字段
        '评论',
        '评价',
        'review',
        'comment',

        // 空字符串和特殊字符
        '',
        ' ',
        'rating_comment', // 包含rating但不是评分字段
        'my_review', // 包含my但不是评分字段
      ];

      testCases.forEach((fieldName) => {
        it(`应该将非评分字段 "${fieldName}" 返回false`, () => {
          const result = isRatingFieldType(fieldName, FeishuFieldType.Text);
          expect(result).toBe(false);
        });
      });
    });

    /**
     * 测试优先级逻辑：官方评分优先级高于用户评分
     * 如果字段名同时包含官方和用户关键词，应该优先识别为官方评分(Number)
     */
    describe('优先级逻辑测试', () => {
      const conflictTestCases = [
        '豆瓣我的评分', // 包含官方+用户关键词
        'douban_myrating', // 包含官方+用户关键词
        '我的豆瓣评分', // 包含用户+官方关键词
        'my_doubanrating', // 包含用户+官方关键词
      ];

      conflictTestCases.forEach((fieldName) => {
        it(`冲突字段 "${fieldName}" 应优先识别为Number字段(官方评分优先级)`, () => {
          const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
          expect(result).toBe(false); // 官方评分优先，返回false表示不是Rating而是Number
        });
      });
    });

    /**
     * 测试边界情况和异常输入
     */
    describe('边界情况和异常处理', () => {
      it('应该处理null/undefined fieldName', () => {
        expect(() =>
          isRatingFieldType(null, FeishuFieldType.Number),
        ).not.toThrow();
        expect(() =>
          isRatingFieldType(undefined, FeishuFieldType.Number),
        ).not.toThrow();
      });

      it('应该处理空字符串', () => {
        const result = isRatingFieldType('', FeishuFieldType.Number);
        expect(result).toBe(false);
      });

      it('应该处理纯空格字符串', () => {
        const result = isRatingFieldType('   ', FeishuFieldType.Number);
        expect(result).toBe(false);
      });

      it('应该处理特殊字符', () => {
        const testCases = ['@#$%', '123', '---', '...'];
        testCases.forEach((fieldName) => {
          const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
          expect(result).toBe(false);
        });
      });
    });

    /**
     * 验证函数与枚举值无关性
     * 重要：该函数应该基于字段名语义进行判断，与传入的fieldType参数值无关
     */
    describe('类型参数无关性验证', () => {
      it('相同字段名在不同fieldType下应返回相同结果', () => {
        const fieldName = '我的评分';

        const resultWithNumber = isRatingFieldType(
          fieldName,
          FeishuFieldType.Number,
        );
        const resultWithRating = isRatingFieldType(
          fieldName,
          FeishuFieldType.Number,
        );
        const resultWithText = isRatingFieldType(
          fieldName,
          FeishuFieldType.Text,
        );

        // 由于函数基于字段名语义判断，不同类型应返回相同结果
        expect(resultWithNumber).toBe(true);
        expect(resultWithRating).toBe(true);
        expect(resultWithText).toBe(true);

        // 验证结果一致性
        expect(resultWithNumber).toBe(resultWithRating);
        expect(resultWithRating).toBe(resultWithText);
      });

      it('官方评分字段在不同fieldType下应返回相同结果', () => {
        const fieldName = '豆瓣评分';

        const resultWithNumber = isRatingFieldType(
          fieldName,
          FeishuFieldType.Number,
        );
        const resultWithRating = isRatingFieldType(
          fieldName,
          FeishuFieldType.Number,
        );
        const resultWithText = isRatingFieldType(
          fieldName,
          FeishuFieldType.Text,
        );

        // 官方评分应该都返回false
        expect(resultWithNumber).toBe(false);
        expect(resultWithRating).toBe(false);
        expect(resultWithText).toBe(false);

        // 验证结果一致性
        expect(resultWithNumber).toBe(resultWithRating);
        expect(resultWithRating).toBe(resultWithText);
      });
    });

    /**
     * 性能和稳定性测试
     */
    describe('性能和稳定性', () => {
      it('应该能处理长字段名', () => {
        const longFieldName =
          '这是一个很长很长很长很长很长很长的我的评分字段名'.repeat(10);
        expect(() =>
          isRatingFieldType(longFieldName, FeishuFieldType.Number),
        ).not.toThrow();

        const result = isRatingFieldType(longFieldName, FeishuFieldType.Number);
        expect(result).toBe(true); // 仍然应该识别出"我的评分"关键词
      });

      it('应该能处理重复调用', () => {
        const fieldName = '我的评分';
        const expectedResult = true;

        // 多次调用应该返回相同结果
        for (let i = 0; i < 100; i++) {
          const result = isRatingFieldType(fieldName, FeishuFieldType.Number);
          expect(result).toBe(expectedResult);
        }
      });
    });

    /**
     * 实际使用场景验证
     * 基于douban-field-mapping-verified.config.ts中的实际配置进行验证
     */
    describe('实际配置场景验证', () => {
      it('应该正确处理豆瓣书籍配置中的myRating字段', () => {
        // 基于 DOUBAN_BOOKS_FIELD_MAPPING.myRating
        const result = isRatingFieldType('我的评分', FeishuFieldType.Number);
        expect(result).toBe(true);
      });

      it('应该正确处理豆瓣书籍配置中的doubanRating字段', () => {
        // 基于 DOUBAN_BOOKS_FIELD_MAPPING.doubanRating
        const result = isRatingFieldType('豆瓣评分', FeishuFieldType.Number);
        expect(result).toBe(false);
      });

      it('应该正确处理豆瓣电影配置中的myRating字段', () => {
        // 基于 DOUBAN_MOVIES_FIELD_MAPPING.myRating
        const result = isRatingFieldType('我的评分', FeishuFieldType.Number);
        expect(result).toBe(true);
      });

      it('应该正确处理豆瓣电影配置中的doubanRating字段', () => {
        // 基于 DOUBAN_MOVIES_FIELD_MAPPING.doubanRating
        const result = isRatingFieldType('豆瓣评分', FeishuFieldType.Number);
        expect(result).toBe(false);
      });

      it('应该正确处理豆瓣电视剧配置中的myRating字段', () => {
        // 基于 DOUBAN_TV_FIELD_MAPPING.myRating
        const result = isRatingFieldType('我的评分', FeishuFieldType.Number);
        expect(result).toBe(true);
      });

      it('应该正确处理豆瓣电视剧配置中的doubanRating字段', () => {
        // 基于 DOUBAN_TV_FIELD_MAPPING.doubanRating
        const result = isRatingFieldType('豆瓣评分', FeishuFieldType.Number);
        expect(result).toBe(false);
      });
    });
  });
});
