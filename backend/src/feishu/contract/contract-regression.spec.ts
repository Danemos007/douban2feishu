/**
 * 飞书API契约回归测试
 * 
 * 目的：基于真实API响应fixtures，确保我们的Schema定义始终与飞书API保持一致
 * 策略：使用真实响应数据作为"黄金标准"，验证Schema的向前兼容性
 */

import { 
  FeishuFieldsResponseSchema, 
  FeishuFieldSchema,
  extractFieldTypeMapping,
  isRatingField,
} from './field.schema';
import { 
  FeishuTokenResponseSchema,
  calculateTokenExpiry,
  isTokenExpiringSoon,
} from './auth.schema';

// 导入真实fixtures
const fieldsFixture = require('./__fixtures__/fields-response.json');
const authFixture = require('./__fixtures__/auth-response.json');

describe('飞书API契约回归测试', () => {
  
  describe('字段查询API契约', () => {
    
    it('真实字段响应应完全符合Schema', () => {
      // Act
      const parseResult = FeishuFieldsResponseSchema.safeParse(fieldsFixture);
      
      // Assert
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        expect(parseResult.data.code).toBe(0);
        expect(parseResult.data.data.items).toHaveLength(16);
        expect(parseResult.data.data.total).toBe(16);
        expect(parseResult.data.data.has_more).toBe(false);
      }
    });
    
    it('所有字段项应符合字段Schema结构', () => {
      // Arrange
      const response = FeishuFieldsResponseSchema.parse(fieldsFixture);
      
      // Act & Assert
      response.data.items.forEach((field, index) => {
        const fieldParseResult = FeishuFieldSchema.safeParse(field);
        expect(fieldParseResult.success).toBe(true);
        
        // 关键字段存在性检查
        expect(field.field_id).toBeDefined();
        expect(field.field_name).toBeDefined();
        expect(typeof field.type).toBe('number');
        expect(field.ui_type).toBeDefined();
        expect(typeof field.is_primary).toBe('boolean');
        
        // 记录字段信息用于调试
        if (!fieldParseResult.success) {
          console.error(`字段 ${index} 验证失败:`, field);
        }
      });
    });
    
    it('应正确识别所有已知字段类型', () => {
      // Arrange
      const response = FeishuFieldsResponseSchema.parse(fieldsFixture);
      
      // Act
      const typeMapping = extractFieldTypeMapping(response.data.items);
      
      // Assert - 验证已知类型都存在
      expect(typeMapping[1]).toContain('Text');      // 类型1 -> Text
      expect(typeMapping[2]).toContain('Number');    // 类型2 -> Number
      expect(typeMapping[2]).toContain('Rating');    // 类型2 -> Rating  
      expect(typeMapping[3]).toContain('SingleSelect'); // 类型3 -> SingleSelect
      expect(typeMapping[5]).toContain('DateTime');  // 类型5 -> DateTime
      expect(typeMapping[15]).toContain('Url');      // 类型15 -> Url
      
      // 记录类型分布用于文档
      console.log('字段类型分布:', typeMapping);
    });
    
    it('字段类型Schema应涵盖所有已知类型', () => {
      // Arrange - 基于fixture实际数据 + Schema定义的已知类型
      const fixtureKnownTypes = [1, 2, 3, 5, 15];        // 来自真实数据
      const schemaDefinedTypes = [1, 2, 3, 4, 5, 7, 15]; // Schema中定义的类型
      
      // Act & Assert - 验证每个已知类型都能通过Schema验证
      fixtureKnownTypes.forEach(type => {
        expect(() => FeishuFieldSchema.parse({
          field_id: 'test',
          field_name: 'test',
          type,
          ui_type: 'Text',
          is_primary: false,
          property: null,
        })).not.toThrow();
      });
      
      // 额外验证：Schema定义但fixture中未出现的类型也应该有效
      const extraTypes = [4, 7]; // Schema支持但fixture中未出现
      extraTypes.forEach(type => {
        expect(() => FeishuFieldSchema.parse({
          field_id: 'test',
          field_name: 'test',
          type,
          ui_type: 'Text', 
          is_primary: false,
          property: null,
        })).not.toThrow();
      });
    });
    
    it('应正确识别Rating字段的完整结构', () => {
      // Arrange
      const response = FeishuFieldsResponseSchema.parse(fieldsFixture);
      const ratingField = response.data.items.find(field => field.field_name === '我的评分');
      
      // Assert
      expect(ratingField).toBeDefined();
      expect(ratingField!.type).toBe(2);              // Number类型
      expect(ratingField!.ui_type).toBe('Rating');     // UI显示Rating
      expect(ratingField!.property?.rating?.symbol).toBe('star'); // 星星符号
      expect(ratingField!.property?.min).toBe(1);     // 最小值1
      expect(ratingField!.property?.max).toBe(5);     // 最大值5
      
      // 使用我们的识别函数验证
      expect(isRatingField(ratingField!)).toBe(true);
    });
    
    it('应验证主键字段的特殊性', () => {
      // Arrange
      const response = FeishuFieldsResponseSchema.parse(fieldsFixture);
      const primaryField = response.data.items.find(field => field.is_primary === true);
      
      // Assert
      expect(primaryField).toBeDefined();
      expect(primaryField!.field_name).toBe('Subject ID'); // 主键字段名
      expect(primaryField!.type).toBe(1);                  // Text类型
      expect(primaryField!.ui_type).toBe('Text');          // Text UI
    });
    
  });
  
  describe('认证API契约', () => {
    
    it('真实认证响应应完全符合Schema', () => {
      // Act
      const parseResult = FeishuTokenResponseSchema.safeParse(authFixture);
      
      // Assert
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        expect(parseResult.data.code).toBe(0);
        expect(parseResult.data.tenant_access_token).toBeDefined();
        expect(parseResult.data.expire).toBeGreaterThan(0);
        expect(parseResult.data.msg).toBeDefined();
      }
    });
    
    it('Token应包含正确的过期信息', () => {
      // Arrange
      const response = FeishuTokenResponseSchema.parse(authFixture);
      
      // Assert
      expect(response.expire).toBe(7199);  // 约2小时
      expect(response.tenant_access_token).toMatch(/^t-/); // Token前缀
      expect(response.msg).toBe('ok');
    });
    
    it('Token过期时间计算应正确', () => {
      // Arrange
      const response = FeishuTokenResponseSchema.parse(authFixture);
      const beforeTime = Date.now();
      
      // Act
      const expiryTime = calculateTokenExpiry(response);
      const afterTime = Date.now();
      
      // Assert - 过期时间应在合理范围内 (约2小时-1分钟)
      const expectedExpiry = beforeTime + (7199 * 1000) - 60000;
      expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry);
      expect(expiryTime).toBeLessThanOrEqual(afterTime + (7199 * 1000));
    });
    
  });
  
  describe('Schema向前兼容性验证', () => {
    
    it('Schema应容忍额外的未知字段', () => {
      // Arrange - 添加未知字段
      const fieldsWithExtraData = {
        ...fieldsFixture,
        unknown_field: 'unknown_value',
        data: {
          ...fieldsFixture.data,
          items: fieldsFixture.data.items.map((field: any) => ({
            ...field,
            future_field: 'future_value'
          }))
        }
      };
      
      // Act
      const parseResult = FeishuFieldsResponseSchema.safeParse(fieldsWithExtraData);
      
      // Assert - 应该成功解析（宽进策略）
      expect(parseResult.success).toBe(true);
    });
    
    it('应拒绝缺少关键字段的响应', () => {
      // Arrange - 删除关键字段
      const incompleteResponse = {
        code: 0,
        // 缺少 msg 字段
        data: {
          items: [],
          total: 0,
          has_more: false
        }
      };
      
      // Act
      const parseResult = FeishuFieldsResponseSchema.safeParse(incompleteResponse);
      
      // Assert - 应该失败（严出策略）
      expect(parseResult.success).toBe(false);
    });
    
  });
  
  describe('数据质量验证', () => {
    
    it('fixture数据应保持时效性', () => {
      // Arrange
      const factCheckResults = require('./__fixtures__/fact-check-results.json');
      const lastUpdate = new Date(factCheckResults[0].timestamp);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      // Assert - fixture数据不应超过3天
      expect(lastUpdate.getTime()).toBeGreaterThan(threeDaysAgo.getTime());
    }, 10000); // 10s timeout for file operations
    
    it('应包含足够的字段样本用于测试', () => {
      // Arrange
      const response = FeishuFieldsResponseSchema.parse(fieldsFixture);
      
      // Assert - 至少包含主要字段类型的样本
      const fieldTypes = response.data.items.map(field => field.type);
      const uniqueTypes = [...new Set(fieldTypes)];
      
      expect(uniqueTypes.length).toBeGreaterThanOrEqual(4); // 至少4种字段类型
      expect(uniqueTypes).toContain(1);  // Text
      expect(uniqueTypes).toContain(2);  // Number/Rating
      expect(uniqueTypes).toContain(3);  // SingleSelect
      expect(uniqueTypes).toContain(5);  // DateTime
    });
    
  });
  
});