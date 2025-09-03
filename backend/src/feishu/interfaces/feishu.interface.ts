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
 * 飞书创建字段的请求负载类型
 */
export interface FeishuCreateFieldPayload {
  field_name: string;
  type: number;
  ui_type?: string;
  property?: {
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
  };
  description?: {
    text: string;
  };
}

/**
 * 飞书查询记录的过滤条件
 */
export interface FeishuRecordFilter {
  conditions: Array<{
    field_id: string;
    operator: 'is' | 'isNot' | 'contains' | 'doesNotContain' | 'isEmpty' | 'isNotEmpty';
    value?: string | number | boolean;
  }>;
  conjunction?: 'and' | 'or';
}

/**
 * 飞书查询记录的请求负载
 */
export interface FeishuSearchRecordPayload {
  page_size?: number;
  page_token?: string;
  filter?: FeishuRecordFilter;
  sort?: Array<{
    field_id: string;
    desc?: boolean;
  }>;
}

/**
 * 通用的记录数据类型（用于批量操作）
 * 支持两种格式：直接字段映射 或 包含fields属性的对象
 */
export type FeishuRecordData = 
  | { [key: string]: string | number | boolean | null | Array<string | number> }
  | { fields: { [key: string]: string | number | boolean | null | Array<string | number> } };

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

/**
 * 飞书错误响应数据
 */
export interface FeishuErrorResponse {
  code: number;
  msg: string;
}