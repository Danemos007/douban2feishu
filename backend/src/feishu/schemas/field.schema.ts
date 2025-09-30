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
 * @description 定义飞书多维表格支持的所有字段类型的数值常量
 *
 * 重要发现：
 * - Rating字段的type实际是2(Number)，通过ui_type和property.rating区分
 * - 我们之前假设的FeishuFieldType.Rating = 5是错误的
 *
 * @example
 * ```typescript
 * if (field.type === FeishuFieldType.Text) {
 *   // 处理文本字段
 * }
 * ```
 */
export const FeishuFieldType = {
  /** 文本字段类型，用于存储字符串数据 */
  Text: 1,
  /** 数字字段类型，包含普通数字和Rating评分 */
  Number: 2,
  /** 单选字段类型，允许用户从预设选项中选择一个值 */
  SingleSelect: 3,
  /** 多选字段类型，允许用户从预设选项中选择多个值 */
  MultiSelect: 4,
  /** 日期时间字段类型，存储日期和时间信息 */
  DateTime: 5,
  /** 复选框字段类型，表示布尔值 */
  Checkbox: 7,
  /** URL字段类型，存储网页链接地址 */
  URL: 15,
} as const;

/**
 * 飞书字段UI类型枚举 - 基于真实API发现的新字段
 *
 * @description 定义飞书多维表格字段的UI展示类型，用于区分相同type下的不同展示形式
 *
 * @example
 * ```typescript
 * if (field.ui_type === FeishuUiType.Rating) {
 *   // 处理评分字段的特殊UI逻辑
 * }
 * ```
 */
export const FeishuUiType = {
  /** 纯文本UI类型 */
  Text: 'Text',
  /** 数字输入UI类型 */
  Number: 'Number',
  /** 评分UI类型，显示为星级评分 🔥 Rating是UI类型，不是字段类型 */
  Rating: 'Rating',
  /** 单选下拉菜单UI类型 */
  SingleSelect: 'SingleSelect',
  /** 多选下拉菜单UI类型 */
  MultiSelect: 'MultiSelect',
  /** 日期时间选择器UI类型 */
  DateTime: 'DateTime',
  /** 复选框UI类型 */
  Checkbox: 'Checkbox',
  /** URL链接UI类型 */
  Url: 'Url',
} as const;

/**
 * 飞书字段属性Schema - 宽进严出策略
 *
 * @description 验证飞书字段的属性配置，支持数字、评分、选择、日期等不同类型字段的特定属性
 *
 * 支持的属性类型：
 * - 数字字段：formatter, min, max, precision
 * - 评分字段：rating.symbol
 * - 选择字段：options数组
 * - 日期字段：auto_fill, date_formatter
 *
 * @example
 * ```typescript
 * const property = {
 *   formatter: "0.0",
 *   min: 0,
 *   max: 10,
 *   rating: { symbol: "star" }
 * };
 * const result = FeishuFieldPropertySchema.safeParse(property);
 * ```
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
 *
 * @description 验证飞书多维表格单个字段的完整结构，确保字段数据的类型安全性
 *
 * 核心验证规则：
 * - field_id: 非空字符串，字段的唯一标识符
 * - field_name: 非空字符串，字段的显示名称
 * - type: 严格约束为已知类型 [1,2,3,4,5,7,15]
 * - ui_type: 非空字符串，UI展示类型
 * - is_primary: 布尔值，是否为主键字段
 *
 * @example
 * ```typescript
 * const field = {
 *   field_id: "fld123",
 *   field_name: "评分",
 *   type: 2,
 *   ui_type: "Rating",
 *   is_primary: false,
 *   property: { rating: { symbol: "star" } }
 * };
 * const result = FeishuFieldSchema.safeParse(field);
 * ```
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
 *
 * @description 验证飞书多维表格字段列表查询API的完整响应结构
 *
 * 响应结构：
 * - code: 必须为0，表示API调用成功
 * - msg: 响应消息字符串
 * - data.items: 字段列表数组
 * - data.total: 字段总数（非负整数）
 * - data.has_more: 是否有更多数据需要分页
 * - data.page_token: 可选的分页令牌
 *
 * @example
 * ```typescript
 * const response = {
 *   code: 0,
 *   msg: "success",
 *   data: {
 *     items: [field1, field2],
 *     total: 16,
 *     has_more: false
 *   }
 * };
 * const result = FeishuFieldsResponseSchema.safeParse(response);
 * ```
 */
const FeishuFieldsResponseSchema = z
  .object({
    // API状态：严格验证
    code: z.literal(0),
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
 * @description 专门用于验证Rating评分字段的Schema，要求同时满足type=2且ui_type='Rating'
 *
 * 用于替代之前错误的isRatingFieldType函数逻辑
 *
 * @example
 * ```typescript
 * const ratingField = {
 *   type: 2,
 *   ui_type: "Rating",
 *   property: { rating: { symbol: "star" } }
 * };
 * const result = RatingFieldSchema.safeParse(ratingField);
 * ```
 */
const RatingFieldSchema = FeishuFieldSchema.refine(
  (field) => field.type === 2 && field.ui_type === 'Rating',
  { message: "Rating字段必须是type=2且ui_type='Rating'" },
);

// ✅ 类型唯一性：所有TS类型从Schema生成

/**
 * 飞书字段类型定义
 *
 * @description 从FeishuFieldSchema推导出的TypeScript类型，表示单个飞书多维表格字段的完整结构
 */
export type FeishuField = z.infer<typeof FeishuFieldSchema>;

/**
 * 飞书字段查询响应类型定义
 *
 * @description 从FeishuFieldsResponseSchema推导出的TypeScript类型，表示字段列表API的响应结构
 */
export type FeishuFieldsResponse = z.infer<typeof FeishuFieldsResponseSchema>;

/**
 * 飞书字段属性类型定义
 *
 * @description 从FeishuFieldPropertySchema推导出的TypeScript类型，表示字段的属性配置结构
 */
export type FeishuFieldProperty = z.infer<typeof FeishuFieldPropertySchema>;

/**
 * Rating字段类型定义
 *
 * @description 从RatingFieldSchema推导出的TypeScript类型，表示评分字段的特殊结构
 */
export type RatingField = z.infer<typeof RatingFieldSchema>;

// Schema导出
export {
  FeishuFieldSchema,
  FeishuFieldsResponseSchema,
  FeishuFieldPropertySchema,
  RatingFieldSchema,
};

/**
 * 判断字段是否为Rating评分字段
 *
 * @description 基于真实API结构判断给定字段是否为Rating评分类型，提供类型守卫功能
 * @param field 待检查的飞书字段对象
 * @returns 如果是Rating字段返回true，否则返回false；同时提供TypeScript类型收窄
 *
 * 判断条件：
 * 1. field.type === 2 (Number类型)
 * 2. field.ui_type === 'Rating' (Rating UI类型)
 * 3. field.property?.rating !== undefined (包含rating属性)
 *
 * @example
 * ```typescript
 * if (isRatingField(field)) {
 *   // TypeScript会自动推断field为RatingField类型
 *   console.log(field.property.rating.symbol); // 类型安全访问
 * }
 * ```
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
 * 提取字段类型映射关系
 *
 * @description 从飞书字段列表中提取type到ui_type的映射关系，用于调试和分析API响应结构
 * @param fields 飞书字段对象数组
 * @returns 返回映射对象，键为字段type（数字），值为对应的ui_type字符串数组
 *
 * 返回结构示例：
 * ```javascript
 * {
 *   1: ["Text"],
 *   2: ["Number", "Rating"],
 *   3: ["SingleSelect"],
 *   5: ["DateTime"],
 *   15: ["Url"]
 * }
 * ```
 *
 * @example
 * ```typescript
 * const fields = response.data.items;
 * const mapping = extractFieldTypeMapping(fields);
 * console.log(mapping[2]); // ["Number", "Rating"]
 * ```
 *
 * 主要用途：
 * - 调试API响应结构变化
 * - 分析新增字段类型
 * - 验证type与ui_type的对应关系
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
