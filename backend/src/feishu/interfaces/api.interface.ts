/**
 * 飞书API专用类型定义
 * 专门用于飞书API交互的类型安全保障
 */

import {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/interfaces/http.interface';

/**
 * 飞书API认证相关类型
 */
export interface FeishuTokenRequest {
  app_id: string;
  app_secret: string;
}

export type FeishuTokenResponse = ApiResponse<{
  tenant_access_token: string;
  expire: number;
}>;

/**
 * 飞书多维表格字段相关类型
 */
export interface FeishuFieldProperty {
  formatter?: string;
  min?: number;
  max?: number;
  rating?: {
    symbol: string;
  };
  range?: {
    min: number;
    max: number;
  };
  precision?: number;
  options?: Array<{
    name: string;
    color: number;
  }>;
  auto_wrap?: boolean;
}

export interface FeishuCreateFieldRequest {
  field_name: string;
  type: number;
  ui_type?: string;
  property?: FeishuFieldProperty;
  description?: {
    text: string;
  };
}

export interface FeishuFieldInfo {
  field_id: string;
  field_name: string;
  type: number;
  property?: FeishuFieldProperty;
  description?: {
    text?: string;
  };
}

export type FeishuFieldsResponse = ApiResponse<{
  items: FeishuFieldInfo[];
  has_more: boolean;
  page_token?: string;
  total: number;
}>;

/**
 * 飞书多维表格记录相关类型
 */
export type FeishuFieldValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>;

export interface FeishuRecordFields {
  [fieldId: string]: FeishuFieldValue;
}

export interface FeishuRecord {
  fields: FeishuRecordFields;
}

export interface FeishuRecordItem {
  record_id: string;
  fields: FeishuRecordFields;
  created_by?: {
    id: string;
    name: string;
  };
  created_time?: number;
  last_modified_by?: {
    id: string;
    name: string;
  };
  last_modified_time?: number;
}

export type FeishuRecordsResponse = ApiResponse<{
  items: FeishuRecordItem[];
  has_more: boolean;
  page_token?: string;
  total: number;
}>;

/**
 * 飞书记录查询过滤条件
 */
export interface FeishuFilterCondition {
  field_id: string;
  operator:
    | 'is'
    | 'isNot'
    | 'contains'
    | 'doesNotContain'
    | 'isEmpty'
    | 'isNotEmpty';
  value?: string | number | boolean;
}

export interface FeishuRecordFilter {
  conditions: FeishuFilterCondition[];
  conjunction?: 'and' | 'or';
}

export interface FeishuSearchRecordRequest {
  page_size?: number;
  page_token?: string;
  filter?: FeishuRecordFilter;
  sort?: Array<{
    field_id: string;
    desc?: boolean;
  }>;
}

/**
 * 飞书批量操作相关类型
 */
export interface FeishuBatchCreateRequest {
  records: FeishuRecord[];
}

export interface FeishuBatchUpdateRequest {
  records: Array<{
    record_id: string;
    fields: FeishuRecordFields;
  }>;
}

export interface FeishuBatchDeleteRequest {
  records: string[]; // record_ids
}

export type FeishuBatchOperationResponse = ApiResponse<{
  records: Array<{
    record_id?: string;
    fields?: FeishuRecordFields;
  }>;
}>;

/**
 * 飞书错误响应数据结构
 * 基于飞书API文档的错误响应格式建模
 */
export interface FeishuErrorData {
  /** 错误详细信息 */
  details?: string;
  /** 字段级别的错误信息 */
  field_errors?: Record<string, string>;
  /** 权限相关错误信息 */
  permission_errors?: string[];
  /** 其他扩展错误信息 */
  [key: string]: unknown;
}

/**
 * 飞书错误响应专用类型
 * 严格类型化的错误响应，确保错误处理的类型安全
 */
export interface FeishuErrorResponse extends ApiErrorResponse {
  code: number;
  msg: string;
  /** 结构化的错误数据，替代原有的any类型 */
  data?: FeishuErrorData;
}

/**
 * 飞书字段类型枚举
 */
export enum FeishuFieldType {
  Text = 1, // 文本
  Number = 2, // 数字（包含评分类型，通过ui_type区分："Number" vs "Rating"）
  SingleSelect = 3, // 单选
  MultiSelect = 4, // 多选
  DateTime = 5, // 日期时间
  Checkbox = 7, // 复选框
  User = 11, // 人员
  Phone = 13, // 电话号码
  URL = 15, // 超链接
  Attachment = 17, // 附件
  Formula = 20, // 公式
  CreatedTime = 1001, // 创建时间
  ModifiedTime = 1002, // 修改时间
  CreatedUser = 1003, // 创建人
  ModifiedUser = 1004, // 修改人
}

/**
 * 飞书API端点配置
 */
export interface FeishuApiEndpoints {
  auth: string;
  fields: string;
  records: string;
  batchCreate: string;
  batchUpdate: string;
  batchDelete: string;
}

/**
 * 飞书API客户端配置
 */
export interface FeishuApiConfig {
  baseUrl: string;
  endpoints: FeishuApiEndpoints;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}
