/**
 * 外部API类型定义
 * 定义与外部服务交互的类型安全接口
 */

// ===== 豆瓣API类型 =====

/**
 * 豆瓣原始响应数据（未验证）
 */
export interface DoubanRawResponse {
  html: string;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
}

/**
 * 豆瓣解析后的基础条目
 */
export interface DoubanParsedItem {
  subjectId: string;
  title: string;
  originalTitle?: string;
  year?: number;
  rating?: {
    average: number;
    numRaters: number;
  };
  genres: string[];
  summary?: string;
  coverUrl?: string;
  doubanUrl: string;
  userRating?: number;
  userComment?: string;
  userTags: string[];
  readDate?: Date;
  category: 'books' | 'movies' | 'tv' | 'documentary';
}

// ===== 飞书API类型 =====

/**
 * 飞书API标准响应结构
 */
export interface FeishuApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

/**
 * 飞书认证Token响应
 */
export interface FeishuTokenResponse {
  tenant_access_token: string;
  expire: number;
}

/**
 * 飞书字段信息
 */
export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property?: Record<string, unknown>;
  description?: string;
}

/**
 * 飞书表格字段列表响应
 */
export interface FeishuFieldListResponse {
  items: FeishuField[];
  has_more: boolean;
  page_token?: string;
  total: number;
}

/**
 * 飞书记录数据
 */
export interface FeishuRecord {
  record_id?: string;
  fields: Record<string, unknown>;
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
 * 飞书批量记录响应
 */
export interface FeishuRecordListResponse {
  items: FeishuRecord[];
  has_more: boolean;
  page_token?: string;
  total: number;
}

// ===== HTTP请求类型 =====

/**
 * HTTP请求选项
 */
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP响应结果
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// ===== 类型守卫 =====

/**
 * 检查是否为有效的飞书API响应
 */
export function isValidFeishuResponse<T>(
  response: unknown,
): response is FeishuApiResponse<T> {
  return (
    response !== null &&
    typeof response === 'object' &&
    'code' in response &&
    'msg' in response &&
    typeof (response as FeishuApiResponse).code === 'number' &&
    typeof (response as FeishuApiResponse).msg === 'string'
  );
}

/**
 * 检查飞书API响应是否成功
 */
export function isFeishuResponseSuccess<T>(
  response: FeishuApiResponse<T>,
): response is FeishuApiResponse<T> & { data: T } {
  return response.code === 0 && response.data !== undefined;
}

/**
 * 检查是否为有效的豆瓣解析结果
 */
export function isValidDoubanItem(item: unknown): item is DoubanParsedItem {
  return (
    item !== null &&
    typeof item === 'object' &&
    'subjectId' in item &&
    'title' in item &&
    'category' in item &&
    typeof (item as DoubanParsedItem).subjectId === 'string' &&
    typeof (item as DoubanParsedItem).title === 'string' &&
    ['books', 'movies', 'tv', 'documentary'].includes(
      (item as DoubanParsedItem).category,
    )
  );
}