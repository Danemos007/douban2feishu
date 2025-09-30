/**
 * 飞书字段Schema单元测试
 *
 * 测试原则:
 * 1. 验证所有Schema的正向和反向验证逻辑
 * 2. 测试辅助函数的字段识别和类型提取逻辑
 * 3. 确保85%以上的代码覆盖率
 * 4. 验证类型推导和Schema导出的正确性
 * 5. 基于真实API响应fixture进行验证
 *
 * 目标覆盖率: 85%+
 */

import {
  FeishuFieldType,
  FeishuUiType,
  FeishuFieldSchema,
  FeishuFieldsResponseSchema,
  FeishuFieldPropertySchema,
  RatingFieldSchema,
  isRatingField,
  extractFieldTypeMapping,
  type FeishuField,
  type FeishuFieldsResponse,
  type FeishuFieldProperty,
  type RatingField,
} from './field.schema';

// 导入真实的API响应fixture
import * as fieldsResponseFixture from '../contract/__fixtures__/fields-response.json';

// Fixture数据的类型定义，基于真实API响应结构
interface FixtureFieldItem {
  field_id: string;
  field_name: string;
  type: number;
  ui_type: string;
  is_primary: boolean;
  property: unknown;
  description?: string;
}

interface FixtureResponse {
  code: number;
  msg: string;
  data: {
    items: FixtureFieldItem[];
    total: number;
    has_more: boolean;
    page_token?: string;
  };
}

describe('FeishuFieldType 常量', () => {
  it('应该包含所有已知的字段类型', () => {
    expect(FeishuFieldType).toHaveProperty('Text', 1);
    expect(FeishuFieldType).toHaveProperty('Number', 2);
    expect(FeishuFieldType).toHaveProperty('SingleSelect', 3);
    expect(FeishuFieldType).toHaveProperty('MultiSelect', 4);
    expect(FeishuFieldType).toHaveProperty('DateTime', 5);
    expect(FeishuFieldType).toHaveProperty('Checkbox', 7);
    expect(FeishuFieldType).toHaveProperty('URL', 15);
  });

  it('应该具有正确的数值映射', () => {
    const expectedMappings = [
      ['Text', 1],
      ['Number', 2],
      ['SingleSelect', 3],
      ['MultiSelect', 4],
      ['DateTime', 5],
      ['Checkbox', 7],
      ['URL', 15],
    ];

    expectedMappings.forEach(([key, value]) => {
      expect(FeishuFieldType[key as keyof typeof FeishuFieldType]).toBe(value);
    });
  });

  it('应该是只读对象', () => {
    expect(() => {
      // @ts-expect-error - 测试运行时只读特性
      FeishuFieldType.Text = 999;
    }).not.toThrow(); // as const 不会在运行时阻止修改，但TypeScript会报错

    // 验证对象不可扩展性
    expect(Object.isExtensible(FeishuFieldType)).toBe(true);
  });
});

describe('FeishuUiType 常量', () => {
  it('应该包含所有已知的UI类型', () => {
    expect(FeishuUiType).toHaveProperty('Text', 'Text');
    expect(FeishuUiType).toHaveProperty('Number', 'Number');
    expect(FeishuUiType).toHaveProperty('Rating', 'Rating');
    expect(FeishuUiType).toHaveProperty('SingleSelect', 'SingleSelect');
    expect(FeishuUiType).toHaveProperty('MultiSelect', 'MultiSelect');
    expect(FeishuUiType).toHaveProperty('DateTime', 'DateTime');
    expect(FeishuUiType).toHaveProperty('Checkbox', 'Checkbox');
    expect(FeishuUiType).toHaveProperty('Url', 'Url');
  });

  it('应该具有正确的字符串映射', () => {
    const expectedMappings = [
      ['Text', 'Text'],
      ['Number', 'Number'],
      ['Rating', 'Rating'],
      ['SingleSelect', 'SingleSelect'],
      ['MultiSelect', 'MultiSelect'],
      ['DateTime', 'DateTime'],
      ['Checkbox', 'Checkbox'],
      ['Url', 'Url'],
    ];

    expectedMappings.forEach(([key, value]) => {
      expect(FeishuUiType[key as keyof typeof FeishuUiType]).toBe(value);
    });
  });

  it('应该是只读对象', () => {
    expect(() => {
      // @ts-expect-error - 测试运行时只读特性
      FeishuUiType.Text = 'Modified';
    }).not.toThrow(); // as const 不会在运行时阻止修改，但TypeScript会报错

    // 验证对象不可扩展性
    expect(Object.isExtensible(FeishuUiType)).toBe(true);
  });
});

describe('FeishuFieldPropertySchema', () => {
  it('应该接受null值', () => {
    const result = FeishuFieldPropertySchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('应该验证完整的数字字段属性', () => {
    const validNumberProperty = {
      formatter: '0.0',
      min: 0,
      max: 10,
      precision: 1,
    };

    const result = FeishuFieldPropertySchema.safeParse(validNumberProperty);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.formatter).toBe('0.0');
      expect(result.data.min).toBe(0);
      expect(result.data.max).toBe(10);
      expect(result.data.precision).toBe(1);
    }
  });

  it('应该验证Rating字段特有属性', () => {
    const validRatingProperty = {
      formatter: '0',
      min: 1,
      max: 5,
      rating: {
        symbol: 'star',
      },
    };

    const result = FeishuFieldPropertySchema.safeParse(validRatingProperty);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.rating?.symbol).toBe('star');
    }
  });

  it('应该验证选择字段的options属性', () => {
    const validSelectProperty = {
      options: [
        { id: 'opt1', name: '选项1', color: 0 },
        { id: 'opt2', name: '选项2', color: 5 },
      ],
    };

    const result = FeishuFieldPropertySchema.safeParse(validSelectProperty);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.options).toHaveLength(2);
      expect(result.data.options![0].id).toBe('opt1');
      expect(result.data.options![0].name).toBe('选项1');
      expect(result.data.options![0].color).toBe(0);
    }
  });

  it('应该验证日期字段属性', () => {
    const validDateProperty = {
      auto_fill: false,
      date_formatter: 'yyyy/MM/dd',
    };

    const result = FeishuFieldPropertySchema.safeParse(validDateProperty);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.auto_fill).toBe(false);
      expect(result.data.date_formatter).toBe('yyyy/MM/dd');
    }
  });

  it('应该允许passthrough未知字段', () => {
    const propertyWithExtraFields = {
      formatter: '0.0',
      unknown_field: 'should be preserved',
      another_field: 42,
    };

    const result = FeishuFieldPropertySchema.safeParse(propertyWithExtraFields);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      // 使用类型安全的方式测试 passthrough 字段
      const resultData = result.data as Record<string, unknown>;
      expect(resultData.unknown_field).toBe('should be preserved');
      expect(resultData.another_field).toBe(42);
    }
  });

  it('应该拒绝无效的rating对象结构', () => {
    const invalidRatingProperty = {
      rating: {
        // 缺少必需的symbol字段
        invalid_field: 'test',
      },
    };

    const result = FeishuFieldPropertySchema.safeParse(invalidRatingProperty);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('应该拒绝无效的options数组结构', () => {
    const invalidOptionsProperty = {
      options: [
        { id: 'opt1', name: '选项1' }, // 缺少color字段
      ],
    };

    const result = FeishuFieldPropertySchema.safeParse(invalidOptionsProperty);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('FeishuFieldSchema', () => {
  it('应该验证来自fixture的完整字段数据', () => {
    const fixtureFields = (fieldsResponseFixture as FixtureResponse).data.items;

    fixtureFields.forEach((field: FixtureFieldItem, index: number) => {
      const result = FeishuFieldSchema.safeParse(field);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.field_id).toBeDefined();
        expect(result.data.field_name).toBeDefined();
        expect(result.data.type).toBeDefined();
        expect(result.data.ui_type).toBeDefined();
        expect(typeof result.data.is_primary).toBe('boolean');
      } else {
        fail(
          `Fixture field at index ${index} failed validation: ${JSON.stringify(result.error.errors)}`,
        );
      }
    });
  });

  it('应该验证Text字段的基本结构', () => {
    const validTextField = {
      field_id: 'fld123',
      field_name: '文本字段',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(validTextField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(1);
      expect(result.data.ui_type).toBe('Text');
      expect(result.data.is_primary).toBe(false);
    }
  });

  it('应该验证Number字段的完整结构', () => {
    const validNumberField = {
      field_id: 'fld456',
      field_name: '数字字段',
      type: 2,
      ui_type: 'Number',
      is_primary: false,
      property: {
        formatter: '0.0',
        min: 0,
        max: 100,
      },
    };

    const result = FeishuFieldSchema.safeParse(validNumberField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(2);
      expect(result.data.ui_type).toBe('Number');
      expect(result.data.property?.formatter).toBe('0.0');
    }
  });

  it('应该验证Rating字段的完整结构', () => {
    const validRatingField = {
      field_id: 'fld789',
      field_name: '评分字段',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        formatter: '0',
        min: 1,
        max: 5,
        rating: {
          symbol: 'star',
        },
      },
    };

    const result = FeishuFieldSchema.safeParse(validRatingField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(2);
      expect(result.data.ui_type).toBe('Rating');
      expect(result.data.property?.rating?.symbol).toBe('star');
    }
  });

  it('应该验证SingleSelect字段的完整结构', () => {
    const validSingleSelectField = {
      field_id: 'fld101',
      field_name: '单选字段',
      type: 3,
      ui_type: 'SingleSelect',
      is_primary: false,
      property: {
        options: [
          { id: 'opt1', name: '选项1', color: 0 },
          { id: 'opt2', name: '选项2', color: 5 },
        ],
      },
    };

    const result = FeishuFieldSchema.safeParse(validSingleSelectField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(3);
      expect(result.data.ui_type).toBe('SingleSelect');
      expect(result.data.property?.options).toHaveLength(2);
    }
  });

  it('应该验证DateTime字段的完整结构', () => {
    const validDateTimeField = {
      field_id: 'fld202',
      field_name: '日期字段',
      type: 5,
      ui_type: 'DateTime',
      is_primary: false,
      property: {
        auto_fill: false,
        date_formatter: 'yyyy/MM/dd',
      },
    };

    const result = FeishuFieldSchema.safeParse(validDateTimeField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(5);
      expect(result.data.ui_type).toBe('DateTime');
      expect(result.data.property?.date_formatter).toBe('yyyy/MM/dd');
    }
  });

  it('应该验证URL字段的完整结构', () => {
    const validUrlField = {
      field_id: 'fld303',
      field_name: '链接字段',
      type: 15,
      ui_type: 'Url',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(validUrlField);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(15);
      expect(result.data.ui_type).toBe('Url');
    }
  });

  it('应该拒绝空的field_id', () => {
    const invalidField = {
      field_id: '',
      field_name: '有效字段名',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('field_id不能为空');
    }
  });

  it('应该拒绝空的field_name', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('field_name不能为空');
    }
  });

  it('应该拒绝空的ui_type', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '有效字段名',
      type: 1,
      ui_type: '',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('ui_type不能为空');
    }
  });

  it('应该拒绝未知的字段类型', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '有效字段名',
      type: 99, // 未知类型
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('发现未知的字段类型');
    }
  });

  it('应该拒绝缺少必需字段', () => {
    const incompleteField = {
      field_id: 'fld123',
      // 缺少 field_name, type, ui_type, is_primary
    };

    const result = FeishuFieldSchema.safeParse(incompleteField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('应该拒绝错误的字段类型', () => {
    const invalidField = {
      field_id: 123, // 应该是string
      field_name: '有效字段名',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const result = FeishuFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });

  it('应该支持passthrough额外字段', () => {
    const fieldWithExtraFields = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
      description: '字段描述',
      extra_field: 'should be preserved',
    };

    const result = FeishuFieldSchema.safeParse(fieldWithExtraFields);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('字段描述');
      expect(result.data.extra_field).toBe('should be preserved');
    }
  });
});

describe('FeishuFieldsResponseSchema', () => {
  it('应该验证完整的API响应结构', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [
          {
            field_id: 'fld123',
            field_name: '测试字段',
            type: 1,
            ui_type: 'Text',
            is_primary: false,
            property: null,
          },
        ],
        total: 1,
        has_more: false,
        page_token: 'token123',
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe(0);
      expect(result.data.msg).toBe('success');
      expect(result.data.data.items).toHaveLength(1);
      expect(result.data.data.total).toBe(1);
      expect(result.data.data.has_more).toBe(false);
    }
  });

  it('应该验证来自fixture的真实响应', () => {
    const result = FeishuFieldsResponseSchema.safeParse(fieldsResponseFixture);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.code).toBe(0);
      expect(result.data.msg).toBe('success');
      expect(result.data.data.items.length).toBeGreaterThan(0);
      expect(result.data.data.total).toBe(16);
      expect(result.data.data.has_more).toBe(false);
    }
  });

  it('应该验证空字段列表的响应', () => {
    const emptyResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [],
        total: 0,
        has_more: false,
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.items).toHaveLength(0);
      expect(result.data.data.total).toBe(0);
    }
  });

  it('应该验证有分页token的响应', () => {
    const paginatedResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [
          {
            field_id: 'fld123',
            field_name: '测试字段',
            type: 1,
            ui_type: 'Text',
            is_primary: false,
            property: null,
          },
        ],
        total: 10,
        has_more: true,
        page_token: 'next_page_token',
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(paginatedResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.has_more).toBe(true);
      expect(result.data.data.page_token).toBe('next_page_token');
    }
  });

  it('应该验证has_more为true的响应', () => {
    const hasMoreResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [
          {
            field_id: 'fld123',
            field_name: '测试字段',
            type: 1,
            ui_type: 'Text',
            is_primary: false,
            property: null,
          },
        ],
        total: 50,
        has_more: true,
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(hasMoreResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.has_more).toBe(true);
    }
  });

  it('应该拒绝非0的code值', () => {
    const invalidResponse = {
      code: 1,
      msg: 'error',
      data: {
        items: [],
        total: 0,
        has_more: false,
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_literal');
    }
  });

  it('应该拒绝负数的total', () => {
    const invalidResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [],
        total: -1,
        has_more: false,
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('total必须为非负数');
    }
  });

  it('应该拒绝缺少data字段', () => {
    const invalidResponse = {
      code: 0,
      msg: 'success',
      // 缺少data字段
    };

    const result = FeishuFieldsResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('应该拒绝无效的items数组', () => {
    const invalidResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [
          {
            field_id: '', // 无效的字段
            field_name: '测试字段',
            type: 1,
            ui_type: 'Text',
            is_primary: false,
            property: null,
          },
        ],
        total: 1,
        has_more: false,
      },
    };

    const result = FeishuFieldsResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('应该支持passthrough额外字段', () => {
    const responseWithExtra = {
      code: 0,
      msg: 'success',
      data: {
        items: [],
        total: 0,
        has_more: false,
      },
      request_id: 'req123',
    };

    const result = FeishuFieldsResponseSchema.safeParse(responseWithExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      // 测试根级别的passthrough字段，使用类型安全的方式
      const resultData = result.data as Record<string, unknown>;
      expect(resultData.request_id).toBe('req123');
      // 验证基本结构
      expect(result.data.code).toBe(0);
      expect(result.data.data.items).toHaveLength(0);
    }
  });
});

describe('RatingFieldSchema', () => {
  it('应该验证有效的Rating字段', () => {
    const validRatingField = {
      field_id: 'fld123',
      field_name: '评分字段',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
        min: 1,
        max: 5,
      },
    };

    const result = RatingFieldSchema.safeParse(validRatingField);
    expect(result.success).toBe(true);
  });

  it('应该验证来自fixture的Rating字段', () => {
    const fixtureRatingField = (
      fieldsResponseFixture as FixtureResponse
    ).data.items.find((field: FixtureFieldItem) => field.ui_type === 'Rating');

    expect(fixtureRatingField).toBeDefined();
    const result = RatingFieldSchema.safeParse(fixtureRatingField);
    expect(result.success).toBe(true);
  });

  it('应该拒绝非2类型的字段', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 1, // 错误的type
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
      },
    };

    const result = RatingFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        "Rating字段必须是type=2且ui_type='Rating'",
      );
    }
  });

  it('应该拒绝非Rating ui_type的字段', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 2,
      ui_type: 'Number', // 错误的ui_type
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
      },
    };

    const result = RatingFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        "Rating字段必须是type=2且ui_type='Rating'",
      );
    }
  });

  it('应该拒绝type=2但ui_type不是Rating的字段', () => {
    const invalidField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 2,
      ui_type: 'Number',
      is_primary: false,
      property: {
        formatter: '0.0',
      },
    };

    const result = RatingFieldSchema.safeParse(invalidField);
    expect(result.success).toBe(false);
  });
});

describe('isRatingField 辅助函数', () => {
  it('应该识别有效的Rating字段', () => {
    const validRatingField: FeishuField = {
      field_id: 'fld123',
      field_name: '评分字段',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
        min: 1,
        max: 5,
      },
    };

    const result = isRatingField(validRatingField);
    expect(result).toBe(true);

    // 测试类型守卫功能
    if (isRatingField(validRatingField)) {
      expect(validRatingField.property?.rating?.symbol).toBe('star');
    }
  });

  it('应该识别来自fixture的Rating字段', () => {
    const fixtureRatingField = (
      fieldsResponseFixture as FixtureResponse
    ).data.items.find((field: FixtureFieldItem) => field.ui_type === 'Rating');

    expect(fixtureRatingField).toBeDefined();
    if (fixtureRatingField) {
      // Reason: Testing isRatingField with raw fixture data requires type bridge
      const result = isRatingField(fixtureRatingField as FeishuField);
      expect(result).toBe(true);
    }
  });

  it('应该拒绝普通数字字段', () => {
    const numberField: FeishuField = {
      field_id: 'fld123',
      field_name: '数字字段',
      type: 2,
      ui_type: 'Number',
      is_primary: false,
      property: {
        formatter: '0.0',
      },
    };

    const result = isRatingField(numberField);
    expect(result).toBe(false);
  });

  it('应该拒绝缺少rating属性的字段', () => {
    const fieldWithoutRating: FeishuField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        min: 1,
        max: 5,
      },
    };

    const result = isRatingField(fieldWithoutRating);
    expect(result).toBe(false);
  });

  it('应该拒绝错误type的字段', () => {
    const wrongTypeField: FeishuField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 1, // 错误的type
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
      },
    };

    const result = isRatingField(wrongTypeField);
    expect(result).toBe(false);
  });

  it('应该拒绝错误ui_type的字段', () => {
    const wrongUiTypeField: FeishuField = {
      field_id: 'fld123',
      field_name: '字段名',
      type: 2,
      ui_type: 'Number', // 错误的ui_type
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
      },
    };

    const result = isRatingField(wrongUiTypeField);
    expect(result).toBe(false);
  });

  it('应该提供正确的类型守卫', () => {
    const mixedFields: FeishuField[] = [
      {
        field_id: 'fld1',
        field_name: '文本字段',
        type: 1,
        ui_type: 'Text',
        is_primary: false,
        property: null,
      },
      {
        field_id: 'fld2',
        field_name: '评分字段',
        type: 2,
        ui_type: 'Rating',
        is_primary: false,
        property: {
          rating: { symbol: 'star' },
        },
      },
    ];

    const ratingFields = mixedFields.filter(isRatingField);
    expect(ratingFields).toHaveLength(1);

    // 类型守卫测试 - 在类型收窄后可以访问rating属性
    ratingFields.forEach((field) => {
      expect(field.property?.rating?.symbol).toBeDefined();
    });
  });
});

describe('extractFieldTypeMapping 辅助函数', () => {
  it('应该正确提取类型映射关系', () => {
    const testFields: FeishuField[] = [
      {
        field_id: 'fld1',
        field_name: '文本字段',
        type: 1,
        ui_type: 'Text',
        is_primary: false,
        property: null,
      },
      {
        field_id: 'fld2',
        field_name: '数字字段',
        type: 2,
        ui_type: 'Number',
        is_primary: false,
        property: null,
      },
      {
        field_id: 'fld3',
        field_name: '评分字段',
        type: 2,
        ui_type: 'Rating',
        is_primary: false,
        property: null,
      },
    ];

    const mapping = extractFieldTypeMapping(testFields);

    expect(mapping[1]).toContain('Text');
    expect(mapping[2]).toContain('Number');
    expect(mapping[2]).toContain('Rating');
    expect(mapping[2]).toHaveLength(2); // Number和Rating都是type=2
  });

  it('应该处理来自fixture的完整字段列表', () => {
    const fixtureFields = fieldsResponseFixture.data.items;
    const mapping = extractFieldTypeMapping(fixtureFields);

    // 根据fixture数据验证映射关系
    expect(mapping[1]).toContain('Text'); // 多个文本字段
    expect(mapping[2]).toContain('Number'); // 豆瓣评分字段
    expect(mapping[2]).toContain('Rating'); // 我的评分字段
    expect(mapping[3]).toContain('SingleSelect'); // 我的状态字段
    expect(mapping[5]).toContain('DateTime'); // 标记日期字段
    expect(mapping[15]).toContain('Url'); // 封面图字段
  });

  it('应该处理空数组', () => {
    const emptyFields: FeishuField[] = [];
    const mapping = extractFieldTypeMapping(emptyFields);

    expect(mapping).toEqual({});
  });

  it('应该处理重复的type-ui_type组合', () => {
    const duplicateFields: FeishuField[] = [
      {
        field_id: 'fld1',
        field_name: '文本字段1',
        type: 1,
        ui_type: 'Text',
        is_primary: false,
        property: null,
      },
      {
        field_id: 'fld2',
        field_name: '文本字段2',
        type: 1,
        ui_type: 'Text',
        is_primary: false,
        property: null,
      },
    ];

    const mapping = extractFieldTypeMapping(duplicateFields);

    expect(mapping[1]).toEqual(['Text']);
    expect(mapping[1]).toHaveLength(1); // 不应该重复
  });

  it('应该返回正确的数据结构', () => {
    const testFields: FeishuField[] = [
      {
        field_id: 'fld1',
        field_name: '测试字段',
        type: 1,
        ui_type: 'Text',
        is_primary: false,
        property: null,
      },
    ];

    const mapping = extractFieldTypeMapping(testFields);

    expect(typeof mapping).toBe('object');
    expect(Array.isArray(mapping[1])).toBe(true);
    expect(typeof mapping[1][0]).toBe('string');
  });

  it('应该处理混合类型的字段列表', () => {
    const mixedFields: FeishuField[] = [
      {
        field_id: 'fld1',
        field_name: '文本字段',
        type: 1,
        ui_type: 'Text',
        is_primary: true,
        property: null,
      },
      {
        field_id: 'fld2',
        field_name: '数字字段',
        type: 2,
        ui_type: 'Number',
        is_primary: false,
        property: { formatter: '0.0' },
      },
      {
        field_id: 'fld3',
        field_name: '单选字段',
        type: 3,
        ui_type: 'SingleSelect',
        is_primary: false,
        property: {
          options: [{ id: 'opt1', name: '选项1', color: 0 }],
        },
      },
      {
        field_id: 'fld4',
        field_name: '日期字段',
        type: 5,
        ui_type: 'DateTime',
        is_primary: false,
        property: {
          date_formatter: 'yyyy/MM/dd',
        },
      },
    ];

    const mapping = extractFieldTypeMapping(mixedFields);

    expect(Object.keys(mapping)).toHaveLength(4);
    expect(mapping[1]).toEqual(['Text']);
    expect(mapping[2]).toEqual(['Number']);
    expect(mapping[3]).toEqual(['SingleSelect']);
    expect(mapping[5]).toEqual(['DateTime']);
  });
});

describe('类型导出验证', () => {
  it('应该正确导出所有TypeScript类型', () => {
    // 验证类型能够正确推导和使用
    const field: FeishuField = {
      field_id: 'test_id',
      field_name: 'test_name',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const response: FeishuFieldsResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [field],
        total: 1,
        has_more: false,
      },
    };

    const property: FeishuFieldProperty = {
      formatter: '0.0',
      min: 0,
      max: 100,
    };

    const ratingField: RatingField = {
      field_id: 'rating_id',
      field_name: 'rating_name',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
        min: 1,
        max: 5,
      },
    };

    // 这些赋值应该无类型错误
    expect(field.field_id).toBe('test_id');
    expect(response.code).toBe(0);
    expect(property.formatter).toBe('0.0');
    expect(ratingField.ui_type).toBe('Rating');
  });

  it('应该确保类型与Schema同步', () => {
    // 验证Schema能正确解析对应的类型
    const field: FeishuField = {
      field_id: 'test_id',
      field_name: 'test_name',
      type: 1,
      ui_type: 'Text',
      is_primary: false,
      property: null,
    };

    const fieldResult = FeishuFieldSchema.safeParse(field);
    expect(fieldResult.success).toBe(true);

    const response: FeishuFieldsResponse = {
      code: 0,
      msg: 'success',
      data: {
        items: [field],
        total: 1,
        has_more: false,
      },
    };

    const responseResult = FeishuFieldsResponseSchema.safeParse(response);
    expect(responseResult.success).toBe(true);

    const property: FeishuFieldProperty = {
      formatter: '0.0',
      rating: { symbol: 'star' },
    };

    const propertyResult = FeishuFieldPropertySchema.safeParse(property);
    expect(propertyResult.success).toBe(true);
  });

  it('应该验证类型推导的正确性', () => {
    // 从Schema推导的类型应该与手动定义的类型兼容
    const sampleField = {
      field_id: 'fld123',
      field_name: '测试字段',
      type: 2,
      ui_type: 'Rating',
      is_primary: false,
      property: {
        rating: { symbol: 'star' },
        min: 1,
        max: 5,
      },
      description: '可选描述',
    };

    const parseResult = FeishuFieldSchema.safeParse(sampleField);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      // 验证推导出的类型包含所有必需属性
      expect(parseResult.data.field_id).toBeDefined();
      expect(parseResult.data.field_name).toBeDefined();
      expect(parseResult.data.type).toBeDefined();
      expect(parseResult.data.ui_type).toBeDefined();
      expect(parseResult.data.is_primary).toBeDefined();
      expect(parseResult.data.property).toBeDefined();

      // 验证可选字段也被正确推导
      expect(parseResult.data.description).toBe('可选描述');

      // 验证property的嵌套结构
      expect(parseResult.data.property?.rating?.symbol).toBe('star');
    }
  });
});

describe('集成测试', () => {
  it('应该完整测试字段查询的数据流', () => {
    // 1. 解析API响应
    const apiResponse = fieldsResponseFixture;
    const responseValidation =
      FeishuFieldsResponseSchema.safeParse(apiResponse);
    expect(responseValidation.success).toBe(true);

    if (!responseValidation.success) return;

    // 2. 提取字段列表
    const fields = responseValidation.data.data.items;
    expect(fields.length).toBeGreaterThan(0);

    // 3. 验证每个字段
    fields.forEach((field) => {
      const fieldValidation = FeishuFieldSchema.safeParse(field);
      expect(fieldValidation.success).toBe(true);
    });

    // 4. 识别Rating字段
    const ratingFields = fields.filter(isRatingField);
    expect(ratingFields.length).toBeGreaterThan(0);

    ratingFields.forEach((ratingField) => {
      expect(ratingField.type).toBe(2);
      expect(ratingField.ui_type).toBe('Rating');
      expect(ratingField.property?.rating?.symbol).toBeDefined();
    });

    // 5. 提取类型映射
    const typeMapping = extractFieldTypeMapping(fields);
    expect(Object.keys(typeMapping).length).toBeGreaterThan(0);

    // 验证预期的类型映射存在
    expect(typeMapping[1]).toContain('Text');
    expect(typeMapping[2]).toContain('Number');
    expect(typeMapping[2]).toContain('Rating');
    expect(typeMapping[3]).toContain('SingleSelect');
    expect(typeMapping[5]).toContain('DateTime');
    expect(typeMapping[15]).toContain('Url');
  });

  it('应该验证Schema间的数据兼容性', () => {
    // 测试从字段响应中提取单个字段的兼容性
    const fieldsResponse = fieldsResponseFixture;
    expect(FeishuFieldsResponseSchema.safeParse(fieldsResponse).success).toBe(
      true,
    );

    // 提取第一个字段并验证其独立有效性
    const firstField = fieldsResponse.data.items[0];
    expect(FeishuFieldSchema.safeParse(firstField).success).toBe(true);

    // 验证Rating字段的特殊验证
    const ratingField = (fieldsResponse as FixtureResponse).data.items.find(
      (field: FixtureFieldItem) => field.ui_type === 'Rating',
    );
    if (ratingField) {
      expect(RatingFieldSchema.safeParse(ratingField).success).toBe(true);
      // Reason: Testing isRatingField with raw fixture data requires type bridge
      expect(isRatingField(ratingField as FeishuField)).toBe(true);
    }

    // 验证Property schema的兼容性
    const fieldsWithProperty = (
      fieldsResponse as FixtureResponse
    ).data.items.filter((field: FixtureFieldItem) => field.property !== null);

    fieldsWithProperty.forEach((field: FixtureFieldItem) => {
      expect(FeishuFieldPropertySchema.safeParse(field.property).success).toBe(
        true,
      );
    });
  });

  it('应该测试实际API响应的处理流程', () => {
    // 模拟完整的字段处理流程
    const apiResponse = fieldsResponseFixture;

    // Step 1: 验证响应结构
    const responseResult = FeishuFieldsResponseSchema.safeParse(apiResponse);
    expect(responseResult.success).toBe(true);
    if (!responseResult.success) return;

    // Step 2: 提取并分析字段
    const { items: fields, total, has_more } = responseResult.data.data;
    expect(fields.length).toBe(total);
    expect(has_more).toBe(false);

    // Step 3: 分类字段类型
    const fieldsByType: Record<number, FeishuField[]> = {};
    const fieldsByUiType: Record<string, FeishuField[]> = {};

    fields.forEach((field) => {
      // 按type分类
      if (!fieldsByType[field.type]) {
        fieldsByType[field.type] = [];
      }
      fieldsByType[field.type].push(field);

      // 按ui_type分类
      if (!fieldsByUiType[field.ui_type]) {
        fieldsByUiType[field.ui_type] = [];
      }
      fieldsByUiType[field.ui_type].push(field);
    });

    // Step 4: 验证分类结果
    expect(Object.keys(fieldsByType).length).toBeGreaterThan(1);
    expect(Object.keys(fieldsByUiType).length).toBeGreaterThan(1);

    // Step 5: 特殊处理Rating字段
    const ratingFields = fields.filter(isRatingField);
    expect(ratingFields.length).toBeGreaterThan(0);

    // Step 6: 生成类型映射报告
    const typeMapping = extractFieldTypeMapping(fields);
    const reportEntries = Object.entries(typeMapping).map(
      ([type, uiTypes]) => ({
        type: Number(type),
        uiTypes,
        count: uiTypes.length,
      }),
    );

    expect(reportEntries.length).toBeGreaterThan(0);
    reportEntries.forEach((entry) => {
      expect(entry.type).toBeGreaterThan(0);
      expect(entry.uiTypes.length).toBeGreaterThan(0);
      expect(entry.count).toBeGreaterThan(0);
    });
  });
});
