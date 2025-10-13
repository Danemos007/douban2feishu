/**
 * 飞书记录API Schema定义
 *
 * 基于真实API响应设计 (2025-09-02 事实核查)
 * Fixture样本: __fixtures__/records-response.json
 * 设计原则: "宽进严出" + "类型唯一性"
 */

import { z } from 'zod';

/**
 * 飞书记录字段值Schema - 基于真实API响应的完整数据类型定义
 *
 * 真实API返回的字段值类型：
 * 1. Text字段: [{ text: "value", type: "text" }]
 * 2. URL字段: { link: "url", text: "text", type: "url" }
 * 3. SingleSelect字段: "选项名"
 * 4. Number/Rating字段: 数字
 * 5. DateTime字段: 时间戳（毫秒）
 * 6. Boolean/Null: 布尔值或null
 */

// 文本字段项Schema
const FeishuTextFieldItemSchema = z.object({
  text: z.string(),
  type: z.literal('text'),
});

// URL字段Schema
const FeishuUrlFieldSchema = z.object({
  link: z.string().url(),
  text: z.string(),
  type: z.literal('url'),
});

// 飞书记录字段值的完整Schema
const FeishuRecordFieldValueSchema = z.union([
  // 简单类型
  z.string(),              // SingleSelect、多行文本等
  z.number(),              // Number、Rating、DateTime（时间戳）
  z.boolean(),             // Checkbox
  z.null(),                // 空值
  // 复杂类型
  z.array(FeishuTextFieldItemSchema),  // Text字段: [{ text, type }]
  FeishuUrlFieldSchema,                // URL字段: { link, text, type }
  // 兼容简化格式（用于向后兼容）
  z.array(z.union([z.string(), z.number()])),
]);

/**
 * 飞书记录Schema
 */
const FeishuRecordSchema = z
  .object({
    record_id: z.string().min(1, 'record_id不能为空'),
    fields: z.record(z.string(), FeishuRecordFieldValueSchema),
    created_by: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    created_time: z.number().optional(),
    last_modified_by: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    last_modified_time: z.number().optional(),
  })
  .passthrough();

/**
 * 飞书记录查询响应Schema
 */
const FeishuRecordsResponseSchema = z
  .object({
    // API状态：严格验证
    code: z.literal(0),
    msg: z.string(),

    data: z.object({
      // 核心数据
      items: z.array(FeishuRecordSchema).min(0, '记录列表不能为null'),
      has_more: z.boolean(),
      total: z.number().min(0, 'total必须为非负数').optional(),

      // 分页字段
      page_token: z.string().optional(),
    }),
  })
  .passthrough();

/**
 * 飞书记录创建请求Schema (不包含record_id)
 */
const FeishuRecordCreateRequestSchema = z
  .object({
    fields: z.record(z.string(), FeishuRecordFieldValueSchema),
  })
  .passthrough();

/**
 * 飞书记录搜索请求Schema
 */
const FeishuSearchRecordRequestSchema = z
  .object({
    page_size: z.number().min(1).max(500).optional(),
    page_token: z.string().optional(),
    filter: z
      .object({
        conditions: z.array(
          z.object({
            field_id: z.string().min(1),
            operator: z.enum([
              'is',
              'isNot',
              'contains',
              'doesNotContain',
              'isEmpty',
              'isNotEmpty',
            ]),
            value: z.union([z.string(), z.number(), z.boolean()]).optional(),
          }),
        ),
        conjunction: z.enum(['and', 'or']).optional(),
      })
      .optional(),
    sort: z
      .array(
        z.object({
          field_id: z.string().min(1),
          desc: z.boolean().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

// ✅ 类型唯一性：所有TS类型从Schema生成
export type FeishuRecord = z.infer<typeof FeishuRecordSchema>;
export type FeishuRecordsResponse = z.infer<typeof FeishuRecordsResponseSchema>;
export type FeishuRecordCreateRequest = z.infer<
  typeof FeishuRecordCreateRequestSchema
>;
export type FeishuSearchRecordRequest = z.infer<
  typeof FeishuSearchRecordRequestSchema
>;
export type FeishuRecordFieldValue = z.infer<
  typeof FeishuRecordFieldValueSchema
>;

/**
 * 从飞书字段值中提取纯文本内容的辅助函数
 *
 * @param fieldValue 飞书字段值（可能是复杂对象或简单值）
 * @returns 提取的字符串值，如果无法提取则返回空字符串
 */
export function extractFieldText(fieldValue: FeishuRecordFieldValue): string {
  if (fieldValue === null || fieldValue === undefined) {
    return '';
  }

  // 字符串：直接返回
  if (typeof fieldValue === 'string') {
    return fieldValue;
  }

  // 数字：转为字符串
  if (typeof fieldValue === 'number') {
    return String(fieldValue);
  }

  // 布尔：转为字符串
  if (typeof fieldValue === 'boolean') {
    return String(fieldValue);
  }

  // URL对象：提取link
  if (typeof fieldValue === 'object' && 'link' in fieldValue && 'type' in fieldValue) {
    return fieldValue.link;
  }

  // 文本字段数组：提取第一个text值
  if (Array.isArray(fieldValue) && fieldValue.length > 0) {
    const firstItem = fieldValue[0];
    if (typeof firstItem === 'object' && 'text' in firstItem) {
      return firstItem.text;
    }
    // 兼容简化格式
    if (typeof firstItem === 'string' || typeof firstItem === 'number') {
      return String(firstItem);
    }
  }

  return '';
}

/**
 * 从飞书字段值中提取数字的辅助函数
 *
 * @param fieldValue 飞书字段值
 * @returns 提取的数字值，如果无法提取则返回null
 */
export function extractFieldNumber(fieldValue: FeishuRecordFieldValue): number | null {
  if (typeof fieldValue === 'number') {
    return fieldValue;
  }

  const text = extractFieldText(fieldValue);
  const num = parseFloat(text);
  return isNaN(num) ? null : num;
}

// Schema导出
export {
  FeishuRecordSchema,
  FeishuRecordsResponseSchema,
  FeishuRecordCreateRequestSchema,
  FeishuSearchRecordRequestSchema,
  FeishuRecordFieldValueSchema,
  FeishuTextFieldItemSchema,
  FeishuUrlFieldSchema,
};
