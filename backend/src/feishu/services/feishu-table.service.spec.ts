import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FeishuTableService } from './feishu-table.service';
import { FeishuAuthService } from './feishu-auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FeishuFieldType } from '../interfaces/feishu.interface';

describe('FeishuTableService - Rating Logic Disaster Fix', () => {
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

  describe('isRatingFieldType - 灾难性逻辑缺陷验证', () => {
    /**
     * [TDD-FAILING-TEST] 验证当前逻辑漏洞
     * 问题：return isRatingByName || (isRatingByType && isRatingByName);
     * 第二个条件永远不会生效
     */
    it('should expose the logical fallacy in current implementation', () => {
      // 使用反射访问私有方法进行测试
      const isRatingFieldType = (service as any).isRatingFieldType;

      // 测试用例1：只满足字段名条件
      const result1 = isRatingFieldType('我的评分', FeishuFieldType.Number);
      // 当前逻辑：应该返回true（基于字段名）
      expect(result1).toBe(true);

      // 测试用例2：只满足类型条件，不满足字段名条件  
      const result2 = isRatingFieldType('普通字段', FeishuFieldType.Rating);
      // [FAILING TEST] 当前逻辑缺陷：这应该返回false，但可能返回true
      // 因为 FeishuFieldType.Rating === FeishuFieldType.Number (都是2)
      expect(result2).toBe(false); // 这个测试可能会失败！

      // 测试用例3：验证枚举值冲突问题
      const ratingValue = FeishuFieldType.Rating;
      const numberValue = FeishuFieldType.Number;
      // [FAILING TEST] 这个断言会失败，证明枚举值冲突
      expect(ratingValue).not.toBe(numberValue); // 应该失败：都是2！
    });

    /**
     * [TDD-FAILING-TEST] 验证中英文字段名混用问题
     */
    it('should fail with English field names due to Chinese-only matching', () => {
      const isRatingFieldType = (service as any).isRatingFieldType;

      // 当前实现只支持中文字段名
      const chineseResult = isRatingFieldType('我的评分', FeishuFieldType.Rating);
      expect(chineseResult).toBe(true);

      // [FAILING TEST] 英文字段名应该也能识别，但当前实现可能失败
      const englishResult = isRatingFieldType('myRating', FeishuFieldType.Rating);
      expect(englishResult).toBe(true); // 可能失败！

      const englishResult2 = isRatingFieldType('rating', FeishuFieldType.Rating);
      expect(englishResult2).toBe(true); // 可能失败！
    });

    /**
     * [TDD-FAILING-TEST] 验证错误的双重type设置问题
     */
    it('should demonstrate the enum value conflict problem', () => {
      // 验证枚举值确实冲突
      expect(FeishuFieldType.Rating).toBe(2);
      expect(FeishuFieldType.Number).toBe(2);
      
      // 这证明了枚举设计的问题：Rating和Number都是2
      // 这会导致 fieldType === FeishuFieldType.Rating 的判断失效
    });
  });

  describe('期望的正确行为（修复后应该通过的测试）', () => {
    /**
     * 修复后应该通过的测试用例
     */
    it('should correctly identify rating fields by semantic meaning', () => {
      const isRatingFieldType = (service as any).isRatingFieldType;

      // 中文评分字段
      expect(isRatingFieldType('我的评分', FeishuFieldType.Rating)).toBe(true);
      expect(isRatingFieldType('豆瓣评分', FeishuFieldType.Rating)).toBe(true);
      
      // 英文评分字段
      expect(isRatingFieldType('myRating', FeishuFieldType.Rating)).toBe(true);
      expect(isRatingFieldType('rating', FeishuFieldType.Rating)).toBe(true);
      expect(isRatingFieldType('doubanRating', FeishuFieldType.Rating)).toBe(true);

      // 非评分字段
      expect(isRatingFieldType('书名', FeishuFieldType.Text)).toBe(false);
      expect(isRatingFieldType('数量', FeishuFieldType.Number)).toBe(false);
      expect(isRatingFieldType('普通字段', FeishuFieldType.Rating)).toBe(false);
    });
  });
});