/**
 * 飞书API Token响应
 */
export interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number; // 过期时间（秒）
}

/**
 * 飞书记录接口
 */
export interface FeishuRecord {
  fields: Record<string, any>;
}

/**
 * 飞书字段信息
 */
export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property?: any;
  description?: {
    text?: string;
  };
}

/**
 * 飞书API通用响应
 */
export interface FeishuApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * 飞书记录查询响应
 */
export interface FeishuRecordsResponse {
  has_more: boolean;
  page_token?: string;
  total: number;
  items: FeishuRecordItem[];
}

/**
 * 飞书记录项
 */
export interface FeishuRecordItem {
  record_id: string;
  fields: Record<string, any>;
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

/**
 * 字段类型枚举
 */
export enum FeishuFieldType {
  Text = 1,           // 文本
  Number = 2,         // 数字
  SingleSelect = 3,   // 单选
  MultiSelect = 4,    // 多选
  DateTime = 5,       // 日期时间
  Checkbox = 7,       // 复选框
  User = 11,          // 人员
  Phone = 13,         // 电话号码
  URL = 15,           // 超链接
  Attachment = 17,    // 附件
  Formula = 20,       // 公式
  Rating = 2,         // 评分（与Number共享type=2，通过ui_type区分）
  CreatedTime = 1001, // 创建时间
  ModifiedTime = 1002, // 修改时间
  CreatedUser = 1003,  // 创建人
  ModifiedUser = 1004, // 修改人
}

/**
 * 表格映射配置
 */
export interface TableMappingConfig {
  books?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  movies?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  music?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  unified?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
}