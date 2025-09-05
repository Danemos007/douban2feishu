/**
 * 飞书记录API Schema定义
 *
 * 基于真实API响应设计 (2025-09-02 事实核查)
 * Fixture样本: __fixtures__/records-response.json
 * 设计原则: "宽进严出" + "类型唯一性"
 */

import { z } from 'zod';

/**
 * 飞书记录字段值Schema - 支持多种数据类型
 */
const FeishuRecordFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
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
    code: z
      .number()
      .refine((val) => val === 0, { message: '飞书记录查询失败' }),
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

// Schema导出
export {
  FeishuRecordSchema,
  FeishuRecordsResponseSchema,
  FeishuRecordCreateRequestSchema,
  FeishuSearchRecordRequestSchema,
  FeishuRecordFieldValueSchema,
};
