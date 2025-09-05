/**
 * 飞书字段API Schema定义
 *
 * 基于真实API响应设计 (2025-09-02 事实核查)
 * Fixture样本: __fixtures__/fields-response.json
 * 设计原则: "宽进严出" + "类型唯一性"
 */

import { z } from 'zod';

/**
 * 飞书字段类型枚举 - 基于真实API数据纠正
 *
 * 重要发现：
 * - Rating字段的type实际是2(Number)，通过ui_type和property.rating区分
 * - 我们之前假设的FeishuFieldType.Rating = 5是错误的
 */
export const FeishuFieldType = {
  Text: 1,
  Number: 2, // 包含普通数字和Rating
  SingleSelect: 3,
  MultiSelect: 4,
  DateTime: 5,
  Checkbox: 7,
  URL: 15,
} as const;

/**
 * UI类型枚举 - 基于真实API发现的新字段
 */
export const FeishuUiType = {
  Text: 'Text',
  Number: 'Number',
  Rating: 'Rating', // 🔥 Rating是UI类型，不是字段类型
  SingleSelect: 'SingleSelect',
  MultiSelect: 'MultiSelect',
  DateTime: 'DateTime',
  Checkbox: 'Checkbox',
  Url: 'Url',
} as const;

/**
 * 字段property结构 - 宽进严出策略
 */
const FeishuFieldPropertySchema = z
  .object({
    // 数字字段通用属性
    formatter: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    precision: z.number().optional(),

    // Rating特有属性 - 关键验证点
    rating: z
      .object({
        symbol: z.string(),
      })
      .optional(),

    // 选择字段属性
    options: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z.number(),
        }),
      )
      .optional(),

    // 日期字段属性
    auto_fill: z.boolean().optional(),
    date_formatter: z.string().optional(),

    // 其他字段：宽松通过
  })
  .passthrough()
  .nullable();

/**
 * 飞书字段Schema - 基于真实API响应结构
 */
const FeishuFieldSchema = z
  .object({
    // 关键字段：严格验证
    field_id: z.string().min(1, 'field_id不能为空'),
    field_name: z.string().min(1, 'field_name不能为空'),

    // 🔥 字段类型：严格约束已知类型
    type: z.number().refine((val) => [1, 2, 3, 4, 5, 7, 15].includes(val), {
      message: '发现未知的字段类型，需要更新Schema',
    }),

    // 🔥 UI类型：新发现的重要字段
    ui_type: z.string().min(1, 'ui_type不能为空'),

    // 🔥 主键标识：新发现字段
    is_primary: z.boolean(),

    // 次要字段：宽松处理
    property: FeishuFieldPropertySchema,
    description: z.string().optional(), // 🔥 修正：直接字符串，不是对象
  })
  .passthrough(); // 允许未知字段通过

/**
 * 飞书字段查询响应Schema
 */
const FeishuFieldsResponseSchema = z
  .object({
    // API状态：严格验证
    code: z.number().refine((val) => val === 0, { message: '飞书API调用失败' }),
    msg: z.string(),

    data: z.object({
      // 核心数据
      items: z.array(FeishuFieldSchema).min(0, '字段列表不能为null'),
      total: z.number().min(0, 'total必须为非负数'),
      has_more: z.boolean(),

      // 分页字段
      page_token: z.string().optional(),
    }),
  })
  .passthrough();

/**
 * Rating字段识别辅助Schema - 解决历史遗留问题
 *
 * 用于替代之前错误的isRatingFieldType函数逻辑
 */
const RatingFieldSchema = FeishuFieldSchema.refine(
  (field) => field.type === 2 && field.ui_type === 'Rating',
  { message: "Rating字段必须是type=2且ui_type='Rating'" },
);

// ✅ 类型唯一性：所有TS类型从Schema生成
export type FeishuField = z.infer<typeof FeishuFieldSchema>;
export type FeishuFieldsResponse = z.infer<typeof FeishuFieldsResponseSchema>;
export type FeishuFieldProperty = z.infer<typeof FeishuFieldPropertySchema>;
export type RatingField = z.infer<typeof RatingFieldSchema>;

// Schema导出
export {
  FeishuFieldSchema,
  FeishuFieldsResponseSchema,
  FeishuFieldPropertySchema,
  RatingFieldSchema,
};

/**
 * 辅助函数：判断是否为Rating字段
 *
 * 替代历史遗留的isRatingFieldType函数，基于真实API结构
 */
export function isRatingField(field: FeishuField): field is RatingField {
  return (
    field.type === 2 &&
    field.ui_type === 'Rating' &&
    field.property?.rating !== undefined
  );
}

/**
 * 辅助函数：提取字段类型映射
 *
 * 从真实API响应中提取type -> ui_type映射，用于调试
 */
export function extractFieldTypeMapping(
  fields: FeishuField[],
): Record<number, string[]> {
  const mapping: Record<number, string[]> = {};

  fields.forEach((field) => {
    if (!mapping[field.type]) {
      mapping[field.type] = [];
    }
    if (!mapping[field.type].includes(field.ui_type)) {
      mapping[field.type].push(field.ui_type);
    }
  });

  return mapping;
}
