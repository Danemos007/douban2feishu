/**
 * DataTransformationService 智能修复引擎 TDD测试套件
 *
 * 🎯 整合目标 - 实现D的复杂解析逻辑:
 * - 片长修复: 支持多版本和无v:runtime的复杂解析
 * - 上映日期修复: 保留完整多地区信息
 * - 制片地区修复: 智能分割和清理
 * - 语言修复: 智能分割和格式化
 *
 * TDD原则: 先写失败测试，再实现功能让其通过
 * 基于sync-all-movies-fixed.ts的战斗验证逻辑
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { DataTransformationService } from './data-transformation.service';
import {
  KEY_MOVIE_VALIDATION_CASES,
  validateMovieFields,
  MovieValidationCase,
} from '../__fixtures__/movie-validation-cases.fixtures';

describe('DataTransformationService - 智能修复引擎 TDD', () => {
  let service: DataTransformationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataTransformationService],
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

  describe('🎯 实现D: 智能修复引擎核心测试', () => {
    describe('applyIntelligentRepairs - 主要接口', () => {
      it('应该对电影数据应用智能修复', async () => {
        // 🔥 TDD: 这个方法需要完整实现，当前只是占位符
        const movieData = {
          subjectId: '1292052',
          title: '肖申克的救赎',
          duration: '142分钟', // 正常格式，无需修复
          releaseDate: '1994-09-10(加拿大多伦多电影节) / 1994-10-14(美国)', // 正常格式
          country: '美国',
          language: '英语',
        };

        const result = await (service as any).applyIntelligentRepairs(
          movieData,
          'movies',
        );

        expect(result).toBeDefined();
        expect(result.subjectId).toBe('1292052');
        expect(result.title).toBe('肖申克的救赎');
        expect(result.duration).toBe('142分钟');
        expect(result.releaseDate).toBe(
          '1994-09-10(加拿大多伦多电影节) / 1994-10-14(美国)',
        );
      });

      it('应该对书籍数据应用智能修复', async () => {
        const bookData = {
          subjectId: '1007305',
          title: '红楼梦',
          publishDate: '1996-12', // 可能需要格式化
          author: ['曹雪芹', '高鹗'],
        };

        const result = await (service as any).applyIntelligentRepairs(
          bookData,
          'books',
        );

        expect(result).toBeDefined();
        expect(result.subjectId).toBe('1007305');
        expect(result.title).toBe('红楼梦');
      });

      it('应该支持修复选项控制', async () => {
        const movieData = { title: '测试电影', duration: '复杂片长格式' };

        // 禁用智能修复
        const resultDisabled = await (service as any).applyIntelligentRepairs(
          movieData,
          'movies',
          { enableIntelligentRepairs: false },
        );

        // 启用智能修复
        const resultEnabled = await (service as any).applyIntelligentRepairs(
          movieData,
          'movies',
          { enableIntelligentRepairs: true },
        );

        expect(resultDisabled).toEqual(movieData); // 无修复，直接返回
        expect(resultEnabled).toBeDefined(); // 应该有修复逻辑
      });
    });
  });

  describe('🎯 电影数据智能修复测试 (实现D核心逻辑)', () => {
    describe('片长修复 (repairDurationField)', () => {
      it('应该修复标准片长格式', async () => {
        const movieData = {
          duration: null,
          html: '<span property="v:runtime">142</span>',
        };

        // 🔥 TDD: repairMovieData方法还不存在，会失败
        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('142分钟');
      });

      it('应该修复复杂HTML片长格式', async () => {
        const movieData = {
          duration: null,
          html: '片长:</span> 142分钟 / 120分03秒(导演剪辑版) <br>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('142分钟 / 120分03秒(导演剪辑版)');
      });

      it('应该修复《鹬 Piper》类型的时长格式', async () => {
        // 🔥 基于真实案例：《鹬 Piper》的"6分03秒"格式
        const movieData = {
          duration: null,
          html: '片长:</span> 6分03秒 <br>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('6分03秒');
      });

      it('应该处理无v:runtime的备选解析', async () => {
        const movieData = {
          duration: null,
          html: '<span class="pl">片长:</span> 142分钟 <br>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('142分钟');
      });

      it('应该处理多版本片长信息', async () => {
        const movieData = {
          duration: null,
          html: '片长:</span> 142分钟(美国) / 140分钟(中国大陆) <br>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('142分钟(美国) / 140分钟(中国大陆)');
      });

      it('应该正确处理片长解析失败的情况', async () => {
        const movieData = {
          duration: '原始片长信息',
          html: '<span>无有效片长信息</span>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.duration).toBe('原始片长信息'); // 保持原值
      });
    });

    describe('上映日期修复 (repairReleaseDateField)', () => {
      it('应该修复单个上映日期', async () => {
        const movieData = {
          releaseDate: null,
          html: '<span property="v:initialReleaseDate">1994-09-10</span>',
        };

        // 🔥 TDD: repairReleaseDateField方法还不存在，会失败
        const result = await (service as any).repairMovieData(movieData);

        expect(result.releaseDate).toBe('1994-09-10');
      });

      it('应该修复多地区上映日期', async () => {
        const movieData = {
          releaseDate: null,
          html: `
            <span property="v:initialReleaseDate">1994-09-10(加拿大多伦多电影节)</span>
            <span property="v:initialReleaseDate">1994-10-14(美国)</span>
            <span property="v:initialReleaseDate">1995-03-17(中国大陆)</span>
          `,
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.releaseDate).toBe(
          '1994-09-10(加拿大多伦多电影节) / 1994-10-14(美国) / 1995-03-17(中国大陆)',
        );
      });

      it('应该处理复杂地区信息格式', async () => {
        const movieData = {
          releaseDate: null,
          html: '<span property="v:initialReleaseDate">2021-12-16(中国大陆) / 2021-12-18(美国)</span>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.releaseDate).toBe(
          '2021-12-16(中国大陆) / 2021-12-18(美国)',
        );
      });

      it('应该正确处理上映日期解析失败', async () => {
        const movieData = {
          releaseDate: '原始上映信息',
          html: '<span>无有效日期信息</span>',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.releaseDate).toBe('原始上映信息'); // 保持原值
      });
    });

    describe('制片地区修复 (repairCountryField)', () => {
      it('应该清理制片地区的干扰信息', async () => {
        const movieData = {
          country: '美国语言:英语上映日期:1994-10-14片长:142分钟',
        };

        // 🔥 TDD: repairCountryField方法还不存在，会失败
        const result = await (service as any).repairMovieData(movieData);

        expect(result.country).toBe('美国');
      });

      it('应该处理多制片地区信息', async () => {
        const movieData = {
          country: '美国 / 英国语言:英语 / 法语',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.country).toBe('美国 / 英国');
      });

      it('应该处理复杂分割情况', async () => {
        const movieData = {
          country: '中国大陆 / 香港又名:别名信息IMDb:tt1234567',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.country).toBe('中国大陆 / 香港');
      });

      it('应该正确处理纯净的制片地区信息', async () => {
        const movieData = {
          country: '日本',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.country).toBe('日本'); // 无需修复
      });
    });

    describe('语言修复 (repairLanguageField)', () => {
      it('应该清理语言的干扰信息', async () => {
        const movieData = {
          language:
            '英语上映日期:1994-10-14片长:142分钟又名:The Shawshank Redemption',
        };

        // 🔥 TDD: repairLanguageField方法还不存在，会失败
        const result = await (service as any).repairMovieData(movieData);

        expect(result.language).toBe('英语');
      });

      it('应该处理多语言信息', async () => {
        const movieData = {
          language: '英语 / 法语 / 德语片长:120分钟',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.language).toBe('英语 / 法语 / 德语');
      });

      it('应该处理复杂语言格式', async () => {
        const movieData = {
          language: '汉语普通话 / 粤语IMDb:tt1234567',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.language).toBe('汉语普通话 / 粤语');
      });

      it('应该正确处理纯净语言信息', async () => {
        const movieData = {
          language: '日语',
        };

        const result = await (service as any).repairMovieData(movieData);

        expect(result.language).toBe('日语'); // 无需修复
      });
    });
  });

  describe('🎯 书籍数据智能修复测试', () => {
    describe('repairBookData - 书籍修复引擎', () => {
      it('应该修复出版日期格式', async () => {
        const bookData = {
          publishDate: '1996-12',
        };

        // 🔥 TDD: repairBookData方法还不存在，会失败
        const result = await (service as any).repairBookData(bookData);

        expect(result.publishDate).toBe('1996-12');
      });

      it('应该处理出版社信息清理', async () => {
        const bookData = {
          publisher: '人民文学出版社 / 作家出版社',
        };

        const result = await (service as any).repairBookData(bookData);

        expect(result.publisher).toBe('人民文学出版社 / 作家出版社');
      });

      it('应该修复作者信息格式', async () => {
        const bookData = {
          author: ['曹雪芹', '高鹗'],
        };

        const result = await (service as any).repairBookData(bookData);

        // 作者信息应该在通用转换中处理，这里保持原格式
        expect(result.author).toEqual(['曹雪芹', '高鹗']);
      });

      // 🔥 新增TDD测试：基于原计划的具体需求
      it('应该修复复杂出版日期格式', async () => {
        const bookData = {
          publishDate: '1996年12月',
        };

        const result = await (service as any).repairBookData(bookData);

        expect(result.publishDate).toBe('1996-12');
      });

      it('应该修复作者字符串分隔符格式', async () => {
        const bookData = {
          author: '曹雪芹/高鹗/程伟元', // 无空格的分隔符
        };

        const result = await (service as any).repairBookData(bookData);

        // 智能修复：优化分隔符格式，保持字符串类型以符合数据流一致性
        expect(result.author).toBe('曹雪芹 / 高鹗 / 程伟元');
      });

      it('应该修复评分嵌套提取', async () => {
        const bookData = {
          rating: { average: 9.6, numRaters: 15000 },
          doubanRating: null,
        };

        const result = await (service as any).repairBookData(bookData);

        // 智能修复：从嵌套对象中提取评分
        expect(result.doubanRating).toBe(9.6);
      });

      it('应该修复出版社信息标准化', async () => {
        const bookData = {
          publisher: '人民文学出版社; 北京 / 作家出版社',
        };

        const result = await (service as any).repairBookData(bookData);

        // 清理多余信息，标准化格式
        expect(result.publisher).toBe('人民文学出版社 / 作家出版社');
      });

      it('应该修复ISBN信息提取', async () => {
        const bookData = {
          isbn: '9787020002207 (平装)',
        };

        const result = await (service as any).repairBookData(bookData);

        // 提取纯净的ISBN号码
        expect(result.isbn).toBe('9787020002207');
      });
    });
  });

  describe('🎯 修复条件判断测试', () => {
    describe('修复需求检测', () => {
      it('应该正确检测片长是否需要修复', async () => {
        // 🔥 TDD: needsDurationRepair方法还不存在，会失败
        expect(await (service as any).needsDurationRepair(null)).toBe(true);
        expect(await (service as any).needsDurationRepair(undefined)).toBe(
          true,
        );
        expect(await (service as any).needsDurationRepair('')).toBe(true);
        expect(await (service as any).needsDurationRepair('142分钟')).toBe(
          false,
        );
      });

      it('应该正确检测上映日期是否需要修复', async () => {
        expect(await (service as any).needsReleaseDateRepair(null)).toBe(true);
        expect(await (service as any).needsReleaseDateRepair('')).toBe(true);
        expect(
          await (service as any).needsReleaseDateRepair('1994-10-14'),
        ).toBe(false);
      });

      it('应该正确检测制片地区是否需要修复', async () => {
        expect(await (service as any).needsCountryRepair('美国语言:英语')).toBe(
          true,
        );
        expect(await (service as any).needsCountryRepair('美国')).toBe(false);
        expect(await (service as any).needsCountryRepair(null)).toBe(false);
      });

      it('应该正确检测语言是否需要修复', async () => {
        expect(
          await (service as any).needsLanguageRepair('英语片长:142分钟'),
        ).toBe(true);
        expect(await (service as any).needsLanguageRepair('英语')).toBe(false);
        expect(await (service as any).needsLanguageRepair(null)).toBe(false);
      });
    });
  });

  describe('🎯 修复统计和日志测试', () => {
    describe('修复统计收集', () => {
      it('应该正确统计修复字段数量', async () => {
        const movieData = {
          duration: null, // 需要修复
          country: '美国语言:英语', // 需要修复
          language: '英语', // 不需要修复
          releaseDate: '1994-10-14', // 不需要修复
        };

        const result = await (service as any).repairMovieData(movieData);

        // 🔥 TDD: 修复统计需要实现
        const stats = await (service as any).getRepairStatistics();
        expect(stats.repairedFields).toBeGreaterThan(0);
      });

      it('应该记录修复操作日志', async () => {
        const logSpy = jest.spyOn(service['logger'], 'debug');

        const movieData = {
          duration: null,
          html: '<span property="v:runtime">142</span>',
        };

        await (service as any).repairMovieData(movieData);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('修复字段: duration'),
        );
      });
    });
  });

  describe('🎯 边界情况和错误处理测试', () => {
    it('应该处理HTML解析异常', async () => {
      const movieData = {
        duration: null,
        html: null, // 异常情况
      };

      const result = await (service as any).repairMovieData(movieData);

      expect(result).toBeDefined();
      expect(result.duration).toBeNull(); // 保持原值
    });

    it('应该处理恶意HTML内容', async () => {
      const movieData = {
        duration: null,
        html: '<script>alert("xss")</script><span property="v:runtime">142</span>',
      };

      const result = await (service as any).repairMovieData(movieData);

      expect(result.duration).toBe('142分钟'); // 应该正确提取，忽略恶意内容
    });

    it('应该处理循环引用的数据', async () => {
      const movieData: any = { title: '测试电影' };
      movieData.self = movieData; // 循环引用

      const result = await (service as any).repairMovieData(movieData);

      expect(result).toBeDefined();
      expect(result.title).toBe('测试电影');
    });

    it('应该处理超大HTML内容', async () => {
      const movieData = {
        duration: null,
        html: '<span property="v:runtime">142</span>' + 'x'.repeat(100000),
      };

      const result = await (service as any).repairMovieData(movieData);

      expect(result.duration).toBe('142分钟'); // 应该正确处理
    });
  });

  /**
   * 🎯 基于真实电影的验证测试
   * 来源：sync-all-movies-fixed.ts 实战验证经验
   *
   * 这些测试用例验证具体电影的字段解析是否符合预期
   * 帮助确保修复逻辑能够正确处理真实世界的复杂数据
   */
  describe('🎬 基于真实电影的验证测试', () => {
    describe('关键电影字段验证', () => {
      it('应该正确解析《鹬 Piper》的复杂片长格式', async () => {
        const movieData = {
          subjectId: '26766869',
          title: '鹬 Piper',
          duration: null,
          // 模拟包含"6分03秒"格式的HTML
          html: '<span class="pl">片长:</span> 6分03秒 <br>',
        };

        const result = await service.transformDoubanData(movieData, 'movies', {
          enableIntelligentRepairs: true,
        });

        // 使用测试固件验证
        const validationResults = validateMovieFields({
          subjectId: movieData.subjectId,
          duration: result.data.duration,
        });

        const durationValidation = validationResults.find(
          (v) => v.fieldName === 'duration',
        );
        expect(durationValidation?.passed).toBe(true);
        expect(result.data.duration).toContain('6分03秒');
      });

      it('应该正确解析《初恋这件小事》的多版本片长', async () => {
        const movieData = {
          subjectId: '4739952',
          title: '初恋这件小事',
          duration: null,
          // 模拟包含多版本片长的HTML
          html: '<span class="pl">片长:</span> 118分钟(泰国版) / 100分钟(国际版) <br>',
        };

        const result = await service.transformDoubanData(movieData, 'movies', {
          enableIntelligentRepairs: true,
        });

        // 使用测试固件验证
        const validationResults = validateMovieFields({
          subjectId: movieData.subjectId,
          duration: result.data.duration,
        });

        const durationValidation = validationResults.find(
          (v) => v.fieldName === 'duration',
        );
        expect(durationValidation?.passed).toBe(true);
        expect(result.data.duration).toContain('118分钟');
        expect(result.data.duration).toContain('100分钟');
      });

      it('应该正确解析《初恋这件小事》的多地区上映日期', async () => {
        const movieData = {
          subjectId: '4739952',
          title: '初恋这件小事',
          releaseDate: null,
          // 模拟包含多地区信息的HTML
          html: '<span property="v:initialReleaseDate">2010-08-25(泰国)</span><span property="v:initialReleaseDate">2010-11-04(中国大陆)</span>',
        };

        const result = await service.transformDoubanData(movieData, 'movies', {
          enableIntelligentRepairs: true,
        });

        // 使用测试固件验证
        const validationResults = validateMovieFields({
          subjectId: movieData.subjectId,
          releaseDate: result.data.releaseDate,
        });

        const releaseDateValidation = validationResults.find(
          (v) => v.fieldName === 'releaseDate',
        );
        expect(releaseDateValidation?.passed).toBe(true);
        expect(result.data.releaseDate).toContain('/');
      });

      it('应该正确解析《让子弹飞》保留地区标识的上映日期', async () => {
        const movieData = {
          subjectId: '3742360',
          title: '让子弹飞',
          releaseDate: null,
          // 模拟包含地区标识的HTML
          html: '<span property="v:initialReleaseDate">2010-12-16(中国大陆)</span>',
        };

        const result = await service.transformDoubanData(movieData, 'movies', {
          enableIntelligentRepairs: true,
        });

        // 使用测试固件验证
        const validationResults = validateMovieFields({
          subjectId: movieData.subjectId,
          releaseDate: result.data.releaseDate,
        });

        const releaseDateValidation = validationResults.find(
          (v) => v.fieldName === 'releaseDate',
        );
        expect(releaseDateValidation?.passed).toBe(true);
        expect(result.data.releaseDate).toContain('(中国大陆)');
      });

      it('应该正确解析《坂本龙一：杰作》的多地区复杂上映日期', async () => {
        const movieData = {
          subjectId: '36491177',
          title: '坂本龙一：杰作',
          releaseDate: null,
          // 模拟包含复杂多地区信息的HTML
          html: `
            <span property="v:initialReleaseDate">2017-05-20(戛纳电影节)</span>
            <span property="v:initialReleaseDate">2017-11-03(美国)</span>
            <span property="v:initialReleaseDate">2018-01-05(日本)</span>
          `,
        };

        const result = await service.transformDoubanData(movieData, 'movies', {
          enableIntelligentRepairs: true,
        });

        // 使用测试固件验证
        const validationResults = validateMovieFields({
          subjectId: movieData.subjectId,
          releaseDate: result.data.releaseDate,
        });

        const releaseDateValidation = validationResults.find(
          (v) => v.fieldName === 'releaseDate',
        );
        expect(releaseDateValidation?.passed).toBe(true);
        expect(result.data.releaseDate).toContain('/');
        expect(
          result.data.releaseDate.split('/').length,
        ).toBeGreaterThanOrEqual(3);
      });
    });

    describe('验证框架功能测试', () => {
      it('应该能够批量验证所有关键电影', () => {
        const testMovies = [
          { subjectId: '26766869', duration: '6分03秒' },
          {
            subjectId: '4739952',
            duration: '118分钟 / 100分钟',
            releaseDate: '2010-08-25(泰国) / 2010-11-04(中国大陆)',
          },
          { subjectId: '3742360', releaseDate: '2010-12-16(中国大陆)' },
          {
            subjectId: '36491177',
            releaseDate:
              '2017-05-20(戛纳电影节) / 2017-11-03(美国) / 2018-01-05(日本)',
          },
        ];

        testMovies.forEach((movie) => {
          const validationResults = validateMovieFields(movie);

          validationResults.forEach((result) => {
            expect(result.passed).toBe(true);
            if (!result.passed) {
              console.error(`验证失败: ${result.errorMessage}`);
            }
          });
        });
      });

      it('应该正确识别关键电影ID', () => {
        expect(KEY_MOVIE_VALIDATION_CASES).toHaveLength(4);

        const expectedIds = ['26766869', '4739952', '3742360', '36491177'];
        const actualIds = KEY_MOVIE_VALIDATION_CASES.map(
          (movie) => movie.subjectId,
        );

        expect(actualIds).toEqual(expectedIds);
      });

      it('应该为每个验证用例提供详细的描述信息', () => {
        KEY_MOVIE_VALIDATION_CASES.forEach((movieCase) => {
          expect(movieCase.title).toBeTruthy();
          expect(movieCase.description).toBeTruthy();
          expect(movieCase.validations).toBeDefined();

          // 至少应该有一种验证规则
          const hasValidations =
            movieCase.validations.duration ||
            movieCase.validations.releaseDate ||
            movieCase.validations.country ||
            movieCase.validations.language;

          expect(hasValidations).toBeTruthy();
        });
      });
    });
  });
});
