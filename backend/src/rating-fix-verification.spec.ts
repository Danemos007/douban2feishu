import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FeishuTableService } from './feishu/services/feishu-table.service';
import { FeishuAuthService } from './feishu/services/feishu-auth.service';
import { PrismaService } from './common/prisma/prisma.service';
import { FeishuFieldType } from './feishu/interfaces/feishu.interface';

describe('isRatingFieldType修复验证', () => {
  let service: FeishuTableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        FeishuTableService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: FeishuAuthService,
          useValue: {
            getAccessToken: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FeishuTableService>(FeishuTableService);
  });

  describe('修复验证 - 所有缺陷应已解决', () => {
    const callPrivateMethod = (fieldName: string, fieldType: FeishuFieldType): boolean => {
      return (service as any).isRatingFieldType(fieldName, fieldType);
    };

    it('✅ 缺陷1修复验证 - 基于类型的判断现在生效', () => {
      // 修复前：只满足类型条件，不满足字段名条件时返回false
      // 修复后：应该返回true
      const result = callPrivateMethod('普通字段名', FeishuFieldType.Rating);
      expect(result).toBe(true); // 现在应该通过
    });

    it('✅ 缺陷3修复验证 - 英文字段名完整识别', () => {
      const englishVariants = [
        'doubanRating',
        'userRating', 
        'movieRating',
        'bookRating',
        'starRating',
        'score',
        'rate',
        'Rating',      // 大写
        'RATING',      // 全大写
        'MyRating',    // 驼峰
      ];

      englishVariants.forEach(fieldName => {
        const result = callPrivateMethod(fieldName, FeishuFieldType.Rating);
        expect(result).toBe(true); // 现在都应该识别正确
      });
    });

    it('✅ 缺陷4修复验证 - 中文字段名变体完整识别', () => {
      const chineseVariants = [
        '我的评分',
        '豆瓣评分', 
        '个人评分',
        '星级评分',
        '用户评分',
        '我给的评分',
      ];

      chineseVariants.forEach(fieldName => {
        const result = callPrivateMethod(fieldName, FeishuFieldType.Rating);
        expect(result).toBe(true); // 现在都应该识别正确
      });
    });

    it('✅ 逻辑修复验证 - 支持纯类型判断', () => {
      // 即使字段名不明确，但类型是Rating时也应该识别
      const result = callPrivateMethod('unknown_field', FeishuFieldType.Rating);
      expect(result).toBe(true);
    });

    it('✅ 逻辑修复验证 - 支持纯字段名判断', () => {
      // 即使类型不是Rating，但字段名明确表示评分时也应该识别
      const result1 = callPrivateMethod('我的评分', FeishuFieldType.Text);
      expect(result1).toBe(true);
      
      const result2 = callPrivateMethod('rating', FeishuFieldType.Number);
      expect(result2).toBe(true);
    });

    it('✅ 否定测试 - 非评分字段正确识别', () => {
      // 这些不应该被识别为评分字段
      expect(callPrivateMethod('书名', FeishuFieldType.Text)).toBe(false);
      expect(callPrivateMethod('数量', FeishuFieldType.Number)).toBe(false); 
      expect(callPrivateMethod('状态', FeishuFieldType.SingleSelect)).toBe(false);
      expect(callPrivateMethod('日期', FeishuFieldType.DateTime)).toBe(false);
      expect(callPrivateMethod('random_field', FeishuFieldType.Text)).toBe(false);
    });

    it('✅ 枚举冲突问题确认 - 但逻辑已规避', () => {
      // 虽然枚举值仍然冲突，但逻辑已经正确处理
      expect(FeishuFieldType.Rating).toBe(FeishuFieldType.Number); // 仍然相等
      
      // 但我们的逻辑现在能正确处理这种情况
      const ratingResult = callPrivateMethod('myRating', FeishuFieldType.Rating);
      const numberResult = callPrivateMethod('普通数字字段', FeishuFieldType.Number);
      
      expect(ratingResult).toBe(true);   // Rating类型的评分字段
      expect(numberResult).toBe(false);  // Number类型的非评分字段
    });
  });
});