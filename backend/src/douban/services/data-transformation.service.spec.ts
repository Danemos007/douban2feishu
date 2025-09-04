/**
 * DataTransformationService TDD测试套件
 * 
 * 🎯 整合目标:
 * - 实现A: 通用转换引擎 (嵌套属性 + 数组处理)
 * - 实现D: 智能修复引擎 (片长/日期/地区/语言)  
 * - 实现C: 严格验证系统 (字段验证 + 边界处理)
 * 
 * TDD原则: 先写失败测试，再实现功能让其通过
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { DataTransformationService } from './data-transformation.service';
import { 
  VERIFIED_FIELD_MAPPINGS,
  getVerifiedFieldMapping,
  VerifiedFieldMappingConfig 
} from '../../feishu/config/douban-field-mapping-verified.config';

// 定义期望的类型 - 基于我们的设计
interface TransformationResult<T = any> {
  data: T;
  statistics: {
    totalFields: number;
    transformedFields: number;
    repairedFields: number;
    failedFields: number;
  };
  warnings: string[];
  rawData?: any;
}

interface TransformationOptions {
  enableIntelligentRepairs?: boolean;
  strictValidation?: boolean;
  preserveRawData?: boolean;
  customFieldMappings?: Record<string, string>;
}

type DoubanDataType = 'books' | 'movies' | 'tv' | 'documentary';

describe('DataTransformationService - Enterprise Data Transformation', () => {
  let service: DataTransformationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataTransformationService,
      ],
    }).compile();

    service = module.get<DataTransformationService>(DataTransformationService);

    // 禁用日志输出
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🎯 核心转换引擎接口测试', () => {
    describe('transformDoubanData - 主要接口', () => {
      it('应该成功转换书籍数据', async () => {
        // 🔥 TDD: 这个测试会失败，因为服务和方法还不存在
        const rawBookData = {
          subjectId: '12345',
          title: '红楼梦',
          author: ['曹雪芹', '高鹗'],
          rating: { average: 9.6, numRaters: 15000 },
          publisher: '人民文学出版社',
          publishDate: '1996-12'
        };

        const result = await service.transformDoubanData(rawBookData, 'books');

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.statistics).toBeDefined();
        expect(result.warnings).toBeInstanceOf(Array);
        
        // 验证核心字段转换
        expect(result.data.subjectId).toBe('12345');
        expect(result.data.title).toBe('红楼梦');
        expect(result.data.author).toBe('曹雪芹 / 高鹗'); // 数组 -> 字符串
        expect(result.data.doubanRating).toBe(9.6); // 嵌套属性提取
      });

      it('应该成功转换电影数据', async () => {
        const rawMovieData = {
          subjectId: '67890',
          title: '肖申克的救赎',
          director: ['弗兰克·德拉邦特'],
          cast: ['蒂姆·罗宾斯', '摩根·弗里曼'],
          duration: '142分钟',
          releaseDate: '1994-09-10(加拿大多伦多电影节) / 1994-10-14(美国)',
          country: '美国',
          language: '英语'
        };

        const result = await service.transformDoubanData(rawMovieData, 'movies');

        expect(result.data.subjectId).toBe('67890');
        expect(result.data.title).toBe('肖申克的救赎');
        expect(result.data.director).toBe('弗兰克·德拉邦特');
        expect(result.data.cast).toBe('蒂姆·罗宾斯 / 摩根·弗里曼');
        expect(result.data.duration).toBe('142分钟');
        expect(result.data.releaseDate).toBe('1994-09-10(加拿大多伦多电影节) / 1994-10-14(美国)');
      });

      it('应该支持转换选项配置', async () => {
        const rawData = { subjectId: '123', title: '测试' };
        const options: TransformationOptions = {
          enableIntelligentRepairs: false,
          strictValidation: false,
          preserveRawData: true
        };

        const result = await service.transformDoubanData(rawData, 'books', options);

        expect(result.rawData).toEqual(rawData); // 保留原始数据
      });

      it('应该正确处理空数据', async () => {
        const result = await service.transformDoubanData({}, 'books');

        expect(result.data).toBeDefined();
        expect(result.statistics.totalFields).toBe(0);
        expect(result.warnings.length).toBeGreaterThan(0); // 应该有警告
      });

      it('应该正确处理null/undefined数据', async () => {
        const resultNull = await service.transformDoubanData(null, 'books');
        const resultUndefined = await service.transformDoubanData(undefined, 'books');

        expect(resultNull.data).toBeDefined();
        expect(resultUndefined.data).toBeDefined();
        expect(resultNull.warnings.length).toBeGreaterThan(0);
        expect(resultUndefined.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('🎯 实现A: 通用转换引擎测试', () => {
    describe('嵌套属性处理 (extractNestedValue)', () => {
      it('应该正确提取简单属性', async () => {
        const data = { title: '红楼梦' };
        const config = getVerifiedFieldMapping('books')['title'];

        // 🔥 TDD: 这个方法还不存在，会失败
        const result = await (service as any).extractNestedValue(data, config);

        expect(result).toBe('红楼梦');
      });

      it('应该正确提取嵌套属性 rating.average', async () => {
        const data = {
          title: '红楼梦',
          rating: { average: 9.6, numRaters: 15000 }
        };
        const config = getVerifiedFieldMapping('books')['doubanRating'];

        const result = await (service as any).extractNestedValue(data, config);

        expect(result).toBe(9.6);
        expect(config.nestedPath).toBe('rating.average'); // 确认配置正确
      });

      it('应该正确提取深度嵌套属性', async () => {
        const data = {
          metadata: {
            ratings: {
              douban: { score: 8.7, count: 50000 }
            }
          }
        };
        const mockConfig = {
          doubanFieldName: 'deepRating',
          nestedPath: 'metadata.ratings.douban.score'
        } as VerifiedFieldMappingConfig;

        const result = await (service as any).extractNestedValue(data, mockConfig);

        expect(result).toBe(8.7);
      });

      it('应该正确处理不存在的嵌套路径', async () => {
        const data = { title: '测试' }; // 缺少rating属性
        const config = getVerifiedFieldMapping('books')['doubanRating'];

        const result = await (service as any).extractNestedValue(data, config);

        expect(result).toBeUndefined();
      });

      it('应该处理null/undefined数据', async () => {
        const config = getVerifiedFieldMapping('books')['title'];

        const resultNull = await (service as any).extractNestedValue(null, config);
        const resultUndefined = await (service as any).extractNestedValue(undefined, config);

        expect(resultNull).toBeUndefined();
        expect(resultUndefined).toBeUndefined();
      });
    });

    describe('数组字段处理 (processArrayField)', () => {
      it('应该将作者数组转换为字符串', async () => {
        const authors = ['曹雪芹', '高鹗'];
        const config = getVerifiedFieldMapping('books')['author'];

        // 🔥 TDD: 这个方法还不存在，会失败
        const result = await (service as any).processArrayField(authors, config);

        expect(result).toBe('曹雪芹 / 高鹗');
      });

      it('应该将导演数组转换为字符串', async () => {
        const directors = ['弗兰克·德拉邦特'];
        const config = getVerifiedFieldMapping('movies')['director'];

        const result = await (service as any).processArrayField(directors, config);

        expect(result).toBe('弗兰克·德拉邦特');
      });

      it('应该将演员数组转换为字符串', async () => {
        const cast = ['蒂姆·罗宾斯', '摩根·弗里曼', '鲍勃·冈顿'];
        const config = getVerifiedFieldMapping('movies')['cast'];

        const result = await (service as any).processArrayField(cast, config);

        expect(result).toBe('蒂姆·罗宾斯 / 摩根·弗里曼 / 鲍勃·冈顿');
      });

      it('应该正确处理非数组值', async () => {
        const singleAuthor = '曹雪芹';
        const config = getVerifiedFieldMapping('books')['author'];

        const result = await (service as any).processArrayField(singleAuthor, config);

        expect(result).toBe('曹雪芹');
      });

      it('应该正确处理空数组', async () => {
        const emptyArray: string[] = [];
        const config = getVerifiedFieldMapping('books')['author'];

        const result = await (service as any).processArrayField(emptyArray, config);

        expect(result).toBe('');
      });

      it('应该基于processingNotes决定处理方式', async () => {
        // 测试配置中有特殊处理说明的字段
        const tags = ['小说', '经典', '中国文学'];
        const config = getVerifiedFieldMapping('books')['myTags'];

        const result = await (service as any).processArrayField(tags, config);

        // 基于processingNotes中的join规则处理
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('🎯 智能修复引擎 (实现D逻辑)', () => {
    it('应该修复复杂的片长格式', async () => {
      const rawData = {
        subjectId: '12345',
        title: '指环王3：王者无敌',
        // 模拟从HTML解析得到的复杂片长信息
        html: '<span class="pl">片长:</span> 142分钟 / 120分03秒(导演剪辑版)',
        duration: null
      };
      
      const result = await service.transformDoubanData(rawData, 'movies', { 
        enableIntelligentRepairs: true 
      });
      
      // 期望智能修复能够从HTML中提取复杂的片长信息
      expect(result.data.duration).toBe('142分钟 / 120分03秒(导演剪辑版)');
      expect(result.statistics.repairedFields).toBeGreaterThan(0);
    });

    it('应该修复多地区上映日期', async () => {
      const rawData = {
        subjectId: '67890',
        title: '蜘蛛侠：英雄无归',
        // 模拟HTML中的多地区上映信息
        html: '<span property="v:initialReleaseDate">2021-12-16(中国大陆)</span><span property="v:initialReleaseDate">2021-12-18(美国)</span>',
        releaseDate: null
      };
      
      const result = await service.transformDoubanData(rawData, 'movies', { 
        enableIntelligentRepairs: true 
      });
      
      // 期望智能修复能够解析并合并多地区上映日期
      expect(result.data.releaseDate).toBe('2021-12-16(中国大陆) / 2021-12-18(美国)');
      expect(result.statistics.repairedFields).toBeGreaterThan(0);
    });

    it('应该智能修复制片地区信息', async () => {
      const rawData = {
        subjectId: '11111',
        title: '阿凡达',
        // 模拟复杂的制片地区信息
        html: '<span class="pl">制片国家/地区:</span> 美国 / 英国 / 新西兰',
        country: null
      };
      
      const result = await service.transformDoubanData(rawData, 'movies', { 
        enableIntelligentRepairs: true 
      });
      
      expect(result.data.country).toBe('美国 / 英国 / 新西兰');
      expect(result.statistics.repairedFields).toBeGreaterThan(0);
    });

    it('应该智能修复语言信息', async () => {
      const rawData = {
        subjectId: '22222',
        title: '寻梦环游记',
        html: '<span class="pl">语言:</span> 英语 / 西班牙语',
        language: null
      };
      
      const result = await service.transformDoubanData(rawData, 'movies', { 
        enableIntelligentRepairs: true 
      });
      
      expect(result.data.language).toBe('英语 / 西班牙语');
      expect(result.statistics.repairedFields).toBeGreaterThan(0);
    });

    it('应该修复书籍出版日期格式', async () => {
      const rawData = {
        subjectId: '33333',
        title: '三体',
        publishDate: '2019年1月1日' // 中文日期格式
      };
      
      const result = await service.transformDoubanData(rawData, 'books', { 
        enableIntelligentRepairs: true 
      });
      
      // 期望修复为标准日期格式
      expect(result.data.publishDate).toBe('2019-01-01');
      expect(result.statistics.repairedFields).toBeGreaterThan(0);
    });
  });

  describe('🎯 通用字段转换逻辑测试', () => {
    describe('applyGeneralTransformation', () => {
      it('应该对所有字段应用通用转换', async () => {
        const rawData = {
          subjectId: '12345',
          title: '红楼梦',
          author: ['曹雪芹', '高鹗'],
          rating: { average: 9.6 },
          publisher: '人民文学出版社'
        };

        // 🔥 TDD: 这个方法还不存在，会失败
        const result = await (service as any).applyGeneralTransformation(rawData, getVerifiedFieldMapping('books'));

        expect(result.subjectId).toBe('12345'); // 直接属性
        expect(result.title).toBe('红楼梦'); // 直接属性
        expect(result.author).toBe('曹雪芹 / 高鹗'); // 数组处理
        expect(result.doubanRating).toBe(9.6); // 嵌套属性
        expect(result.publisher).toBe('人民文学出版社'); // 直接属性
      });

      it('应该跳过配置中不存在的字段', async () => {
        const rawData = {
          subjectId: '12345',
          unknownField: '未知字段',
          title: '测试书籍'
        };

        const result = await (service as any).applyGeneralTransformation(rawData, getVerifiedFieldMapping('books'));

        expect(result.subjectId).toBe('12345');
        expect(result.title).toBe('测试书籍');
        expect(result.unknownField).toBeUndefined(); // 未配置的字段被跳过
      });

      it('应该正确处理所有字段类型', async () => {
        const rawData = {
          subjectId: '12345', // text
          title: '测试', // text
          rating: { average: 8.5 }, // number - 嵌套路径 rating.average
          myRating: 4, // rating
          myStatus: '读过', // singleSelect
          markDate: '2024-01-01' // datetime
        };

        const result = await (service as any).applyGeneralTransformation(rawData, getVerifiedFieldMapping('books'));

        expect(result.subjectId).toBe('12345');
        expect(result.title).toBe('测试');
        expect(result.doubanRating).toBe(8.5);
        expect(result.myRating).toBe(4);
        expect(result.myStatus).toBe('读过');
        expect(result.markDate).toBe('2024-01-01');
      });
    });
  });

  describe('🎯 统计信息生成测试', () => {
    describe('generateTransformationStats', () => {
      it('应该生成正确的统计信息', async () => {
        // 设置内部统计状态
        (service as any).statistics = {
          totalFields: 5,
          transformedFields: 4,
          failedFields: 1,
          repairedFields: 2
        };

        const stats = await (service as any).generateTransformationStats();

        expect(stats.totalFields).toBe(5);
        expect(stats.transformedFields).toBe(4);
        expect(stats.failedFields).toBe(1);
        expect(stats.repairedFields).toBe(2);
      });
    });

    describe('collectWarnings', () => {
      it('应该收集转换过程中的警告', async () => {
        // 设置一些警告状态
        (service as any).warnings = [
          '字段 unknownField 不在配置中，已跳过',
          '字段 brokenField 转换失败'
        ];

        // 🔥 TDD: 这个方法还不存在，会失败
        const warnings = await (service as any).collectWarnings();

        expect(warnings).toBeInstanceOf(Array);
        expect(warnings.length).toBe(2);
        expect(warnings[0]).toContain('unknownField');
        expect(warnings[1]).toContain('brokenField');
      });
    });
  });

  describe('🎯 错误处理和边界情况测试', () => {
    it('应该优雅处理恶意数据', async () => {
      const maliciousData = {
        subjectId: '<script>alert("xss")</script>',
        title: null,
        author: {},
        rating: { average: 'not-a-number' }
      };

      const result = await service.transformDoubanData(maliciousData, 'books');

      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0); // 应该有警告
      expect(result.data.subjectId).toBe('<script>alert("xss")</script>'); // 保持原值，不过滤(交给前端处理)
    });

    it('应该处理循环引用数据', async () => {
      const circularData: any = { subjectId: '123', title: '测试' };
      circularData.self = circularData; // 创建循环引用

      const result = await service.transformDoubanData(circularData, 'books');

      expect(result).toBeDefined();
      // 不应该抛出异常，应该优雅处理
    });

    it('应该处理超大数据量', async () => {
      const largeData = {
        subjectId: '123',
        title: '测试',
        summary: 'x'.repeat(100000) // 100KB 的字符串
      };

      const result = await service.transformDoubanData(largeData, 'books');

      expect(result).toBeDefined();
      expect(result.data.summary).toBe('x'.repeat(100000));
    });
  });

  describe('🎯 实现C: 严格验证系统测试', () => {
    describe('validateTransformedData - 主要验证接口', () => {
      it('应该验证并修正无效的电影状态字段', async () => {
        const movieData = {
          subjectId: '1292052',
          title: '肖申克的救赎',
          myStatus: '已看完' // 无效状态，应该被修正
        };

        const result = await service.transformDoubanData(movieData, 'movies', { strictValidation: true });

        expect(result.data.myStatus).toBeNull(); // 无效值被设为null
        expect(result.warnings.some(w => w.includes('Invalid status value: 已看完'))).toBe(true);
      });

      it('应该验证并保留有效的电影状态字段', async () => {
        const movieData = {
          subjectId: '1292052',
          title: '肖申克的救赎',
          myStatus: '看过' // 有效状态
        };

        const result = await service.transformDoubanData(movieData, 'movies', { strictValidation: true });

        expect(result.data.myStatus).toBe('看过');
        expect(result.warnings.filter(w => w.includes('Invalid status')).length).toBe(0);
      });

      it('应该验证并修正无效的书籍状态字段', async () => {
        const bookData = {
          subjectId: '1007305',
          title: '红楼梦',
          myStatus: '已读完' // 无效状态
        };

        const result = await service.transformDoubanData(bookData, 'books', { strictValidation: true });

        expect(result.data.myStatus).toBeNull();
        expect(result.warnings.some(w => w.includes('Invalid status value: 已读完'))).toBe(true);
      });

      it('应该验证并保留有效的书籍状态字段', async () => {
        const bookData = {
          subjectId: '1007305',
          title: '红楼梦',
          myStatus: '读过' // 有效状态
        };

        const result = await service.transformDoubanData(bookData, 'books', { strictValidation: true });

        expect(result.data.myStatus).toBe('读过');
        expect(result.warnings.filter(w => w.includes('Invalid status')).length).toBe(0);
      });
    });

    describe('字段类型验证方法', () => {
      describe('validateSelectField - 选择字段验证', () => {
        it('应该验证电影状态字段', async () => {
          // 🔥 TDD: validateSelectField方法需要实现
          const validStatus = await (service as any).validateSelectField('看过', 'myStatus', 'movies');
          const invalidStatus = await (service as any).validateSelectField('已看完', 'myStatus', 'movies');

          expect(validStatus).toBe('看过');
          expect(invalidStatus).toBeNull();
        });

        it('应该验证书籍状态字段', async () => {
          const validStatus = await (service as any).validateSelectField('读过', 'myStatus', 'books');
          const invalidStatus = await (service as any).validateSelectField('已读完', 'myStatus', 'books');

          expect(validStatus).toBe('读过');
          expect(invalidStatus).toBeNull();
        });

        it('应该验证其他选择字段保持原值', async () => {
          const otherField = await (service as any).validateSelectField('其他值', 'otherField', 'books');
          expect(otherField).toBe('其他值');
        });
      });

      describe('validateRatingField - 评分字段验证', () => {
        it('应该验证有效的评分范围', async () => {
          // 🔥 TDD: validateRatingField方法需要实现
          const validRating1 = await (service as any).validateRatingField(5);
          const validRating2 = await (service as any).validateRatingField(1);
          
          expect(validRating1).toBe(5);
          expect(validRating2).toBe(1);
        });

        it('应该修正无效的评分值', async () => {
          const invalidHigh = await (service as any).validateRatingField(6);
          const invalidLow = await (service as any).validateRatingField(0);
          const invalidNegative = await (service as any).validateRatingField(-1);

          expect(invalidHigh).toBeNull();
          expect(invalidLow).toBeNull(); 
          expect(invalidNegative).toBeNull();
        });

        it('应该处理非数字评分值', async () => {
          const nonNumber = await (service as any).validateRatingField('五星');
          const nullValue = await (service as any).validateRatingField(null);

          expect(nonNumber).toBeNull();
          expect(nullValue).toBeNull();
        });
      });

      describe('validateDateTimeField - 日期时间字段验证', () => {
        it('应该验证有效的日期格式', async () => {
          // 🔥 TDD: validateDateTimeField方法需要实现
          const validDate1 = await (service as any).validateDateTimeField('2024-01-01');
          const validDate2 = await (service as any).validateDateTimeField('2024-12-31');

          expect(validDate1).toBe('2024-01-01');
          expect(validDate2).toBe('2024-12-31');
        });

        it('应该修正无效的日期格式', async () => {
          const invalidDate1 = await (service as any).validateDateTimeField('2024-13-01'); // 无效月份
          const invalidDate2 = await (service as any).validateDateTimeField('invalid-date');
          const invalidDate3 = await (service as any).validateDateTimeField('2024/01/01'); // 错误分隔符

          expect(invalidDate1).toBeNull();
          expect(invalidDate2).toBeNull(); 
          expect(invalidDate3).toBeNull();
        });

        it('应该处理空值和非字符串', async () => {
          const nullValue = await (service as any).validateDateTimeField(null);
          const numberValue = await (service as any).validateDateTimeField(20240101);

          expect(nullValue).toBeNull();
          expect(numberValue).toBeNull();
        });
      });
    });

    describe('严格验证选项控制', () => {
      it('应该在禁用严格验证时跳过验证', async () => {
        const movieData = {
          title: '测试电影',
          myStatus: '已看完' // 无效状态
        };

        const result = await service.transformDoubanData(movieData, 'movies', { strictValidation: false });

        expect(result.data.myStatus).toBe('已看完'); // 保持原值，未验证
        expect(result.warnings.filter(w => w.includes('Invalid status')).length).toBe(0);
      });
    });
  });
});