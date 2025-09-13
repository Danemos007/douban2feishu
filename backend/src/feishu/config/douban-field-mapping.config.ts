/**
 * 豆瓣字段到飞书字段的实战验证映射配置
 *
 * 基于四个历史测试文件的逻辑抢救和整合：
 * - 🏆 核心基准：sync-all-movies-fixed.ts 的100%真实API映射
 * - 🔥 通用框架：real-douban-data-sync.ts 的嵌套属性解析能力
 * - ⚡ 精确校正：sync-movie-from-cache.ts 和 sync-from-cache.ts 的字段验证
 * - 📋 企业级：保持现有配置结构和元数据
 *
 * 创建时间: 2025-09-03
 * 验证状态: 基于真实飞书API调用验证
 */

import { FeishuFieldType } from '../interfaces/api.interface';

// 字段类型映射
export const FIELD_TYPE_MAPPING = {
  text: FeishuFieldType.Text,
  number: FeishuFieldType.Number,
  rating: FeishuFieldType.Number, // 评分使用Number类型，通过ui_type="Rating"区分
  multiSelect: FeishuFieldType.MultiSelect,
  singleSelect: FeishuFieldType.SingleSelect,
  datetime: FeishuFieldType.DateTime,
  url: FeishuFieldType.URL,
  checkbox: FeishuFieldType.Checkbox,
};

/**
 * 字段映射配置接口 - 增强版
 */
export interface VerifiedFieldMappingConfig {
  /** 豆瓣字段名 */
  doubanFieldName: string;
  /** 飞书表格中文字段名 */
  chineseName: string;
  /** 飞书API实际使用的字段名（与chineseName一致，用于双重验证） */
  apiFieldName: string;
  /** 字段类型 */
  fieldType: string;
  /** 是否为必需字段 */
  required: boolean;
  /** 字段描述 */
  description: string;
  /** 实战验证状态 */
  verified: boolean;
  /** 嵌套属性路径（支持rating.average这样的嵌套访问） */
  nestedPath?: string;
  /** 数据处理特殊说明 */
  processingNotes?: string;
  /** 验证来源文件 */
  verifiedSource: string[];
}

/**
 * 🏆 电影字段映射配置（18字段完整版）
 * 基于sync-all-movies-fixed.ts的100%真实API映射验证
 */
export const VERIFIED_MOVIES_FIELD_MAPPING: Record<
  string,
  VerifiedFieldMappingConfig
> = {
  subjectId: {
    doubanFieldName: 'subjectId',
    chineseName: 'Subject ID',
    apiFieldName: 'Subject ID',
    fieldType: 'text',
    required: true,
    description: '豆瓣电影唯一标识ID',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  title: {
    doubanFieldName: 'title',
    chineseName: '电影名',
    apiFieldName: '电影名',
    fieldType: 'text',
    required: true,
    description: '电影标题',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  myStatus: {
    doubanFieldName: 'myStatus',
    chineseName: '我的状态',
    apiFieldName: '我的状态',
    fieldType: 'singleSelect',
    required: false,
    description: '观看状态：想看/看过',
    verified: true,
    processingNotes: '电影只有2个状态选项，与书籍的3个状态不同',
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  genre: {
    doubanFieldName: 'genre',
    chineseName: '类型',
    apiFieldName: '类型',
    fieldType: 'text',
    required: false,
    description: '电影类型：剧情/动作/喜剧等',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  coverImage: {
    doubanFieldName: 'coverImage',
    chineseName: '封面图',
    apiFieldName: '封面图',
    fieldType: 'url',
    required: false,
    description: '电影海报URL',
    verified: true,
    processingNotes: '确认使用coverImage而非coverUrl，需要{link: url}格式',
    verifiedSource: [
      'sync-all-movies-fixed.ts',
      'sync-movie-from-cache.ts',
      'sync-from-cache.ts',
    ],
  },

  doubanRating: {
    doubanFieldName: 'doubanRating',
    chineseName: '豆瓣评分',
    apiFieldName: '豆瓣评分',
    fieldType: 'number',
    required: false,
    description: '豆瓣平均评分',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  myComment: {
    doubanFieldName: 'myComment',
    chineseName: '我的备注',
    apiFieldName: '我的备注',
    fieldType: 'text',
    required: false,
    description: '用户短评或备注',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  duration: {
    doubanFieldName: 'duration',
    chineseName: '片长',
    apiFieldName: '片长',
    fieldType: 'text',
    required: false,
    description: '电影时长，支持复杂格式如"6分03秒"和"118分钟/100分钟"',
    verified: true,
    processingNotes: 'sync-all-movies-fixed.ts包含复杂片长解析逻辑',
    verifiedSource: ['sync-all-movies-fixed.ts'],
  },

  releaseDate: {
    doubanFieldName: 'releaseDate',
    chineseName: '上映日期',
    apiFieldName: '上映日期',
    fieldType: 'text',
    required: false,
    description: '上映日期，支持多地区格式，用" / "分隔',
    verified: true,
    processingNotes:
      'sync-all-movies-fixed.ts包含多地区日期处理逻辑，保留完整信息',
    verifiedSource: ['sync-all-movies-fixed.ts'],
  },

  summary: {
    doubanFieldName: 'summary',
    chineseName: '剧情简介',
    apiFieldName: '剧情简介',
    fieldType: 'text',
    required: false,
    description: '电影剧情简介',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  cast: {
    doubanFieldName: 'cast',
    chineseName: '主演',
    apiFieldName: '主演',
    fieldType: 'text',
    required: false,
    description: '主要演员，多个演员用/分隔',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  director: {
    doubanFieldName: 'director',
    chineseName: '导演',
    apiFieldName: '导演',
    fieldType: 'text',
    required: false,
    description: '导演姓名，多个导演用/分隔',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  writer: {
    doubanFieldName: 'writer',
    chineseName: '编剧',
    apiFieldName: '编剧',
    fieldType: 'text',
    required: false,
    description: '编剧姓名，多个编剧用/分隔',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  country: {
    doubanFieldName: 'country',
    chineseName: '制片地区',
    apiFieldName: '制片地区',
    fieldType: 'text',
    required: false,
    description: '制片国家/地区',
    verified: true,
    processingNotes: 'sync-all-movies-fixed.ts包含智能分割逻辑，去除干扰信息',
    verifiedSource: ['sync-all-movies-fixed.ts'],
  },

  language: {
    doubanFieldName: 'language',
    chineseName: '语言',
    apiFieldName: '语言',
    fieldType: 'text',
    required: false,
    description: '电影语言',
    verified: true,
    processingNotes: 'sync-all-movies-fixed.ts包含智能分割逻辑，去除干扰信息',
    verifiedSource: ['sync-all-movies-fixed.ts'],
  },

  myRating: {
    doubanFieldName: 'myRating',
    chineseName: '我的评分',
    apiFieldName: '我的评分',
    fieldType: 'rating',
    required: false,
    description: '用户个人评分（1-5星）',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  myTags: {
    doubanFieldName: 'myTags',
    chineseName: '我的标签',
    apiFieldName: '我的标签',
    fieldType: 'text',
    required: false,
    description: '用户添加的标签',
    verified: true,
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },

  markDate: {
    doubanFieldName: 'markDate',
    chineseName: '标记日期',
    apiFieldName: '标记日期',
    fieldType: 'datetime',
    required: false,
    description: '标记为想看/看过的日期',
    verified: true,
    processingNotes: '需要转换为时间戳：new Date(markDate).getTime()',
    verifiedSource: ['sync-all-movies-fixed.ts', 'sync-movie-from-cache.ts'],
  },
};

/**
 * 🔥 书籍字段映射配置（16字段完整版）
 * 融合real-douban-data-sync.ts的嵌套属性和sync-from-cache.ts的存在性验证
 */
export const VERIFIED_BOOKS_FIELD_MAPPING: Record<
  string,
  VerifiedFieldMappingConfig
> = {
  subjectId: {
    doubanFieldName: 'subjectId',
    chineseName: 'Subject ID',
    apiFieldName: 'Subject ID',
    fieldType: 'text',
    required: true,
    description: '豆瓣书籍唯一标识ID',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  title: {
    doubanFieldName: 'title',
    chineseName: '书名',
    apiFieldName: '书名',
    fieldType: 'text',
    required: true,
    description: '书籍标题',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  subtitle: {
    doubanFieldName: 'subtitle',
    chineseName: '副标题',
    apiFieldName: '副标题',
    fieldType: 'text',
    required: false,
    description: '书籍副标题',
    verified: true,
    verifiedSource: ['sync-from-cache.ts'],
  },

  originalTitle: {
    doubanFieldName: 'originalTitle',
    chineseName: '原作名',
    apiFieldName: '原作名',
    fieldType: 'text',
    required: false,
    description: '书籍原文标题',
    verified: true,
    processingNotes: 'real-douban-data-sync.ts中映射到"副标题"，但原作名更准确',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  author: {
    doubanFieldName: 'author',
    chineseName: '作者',
    apiFieldName: '作者',
    fieldType: 'text',
    required: false,
    description: '书籍作者，多个作者用/分隔',
    verified: true,
    processingNotes: 'real-douban-data-sync.ts中为authors数组，需要join处理',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  translator: {
    doubanFieldName: 'translator',
    chineseName: '译者',
    apiFieldName: '译者',
    fieldType: 'text',
    required: false,
    description: '翻译者姓名',
    verified: true,
    processingNotes:
      'real-douban-data-sync.ts中为translators数组，需要join处理',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  publisher: {
    doubanFieldName: 'publisher',
    chineseName: '出版社',
    apiFieldName: '出版社',
    fieldType: 'text',
    required: false,
    description: '出版社名称',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  publishDate: {
    doubanFieldName: 'publishDate',
    chineseName: '出版年份',
    apiFieldName: '出版年份',
    fieldType: 'text',
    required: false,
    description: '出版日期或年份',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  doubanRating: {
    doubanFieldName: 'doubanRating',
    chineseName: '豆瓣评分',
    apiFieldName: '豆瓣评分',
    fieldType: 'number',
    required: false,
    description: '豆瓣平均评分',
    verified: true,
    nestedPath: 'rating.average',
    processingNotes: 'real-douban-data-sync.ts中支持嵌套属性rating.average',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  myRating: {
    doubanFieldName: 'myRating',
    chineseName: '我的评分',
    apiFieldName: '我的评分',
    fieldType: 'rating',
    required: false,
    description: '用户个人评分（1-5星）',
    verified: true,
    processingNotes: 'sync-from-cache.ts包含1-5范围验证逻辑',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  myTags: {
    doubanFieldName: 'myTags',
    chineseName: '我的标签',
    apiFieldName: '我的标签',
    fieldType: 'text',
    required: false,
    description: '用户添加的标签',
    verified: true,
    processingNotes: 'real-douban-data-sync.ts中为userTags数组，需要join处理',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  myStatus: {
    doubanFieldName: 'myStatus',
    chineseName: '我的状态',
    apiFieldName: '我的状态',
    fieldType: 'singleSelect',
    required: false,
    description: '阅读状态：想读/在读/读过',
    verified: true,
    processingNotes: '书籍有3个状态选项，sync-from-cache.ts包含严格验证逻辑',
    verifiedSource: ['sync-from-cache.ts'],
  },

  myComment: {
    doubanFieldName: 'myComment',
    chineseName: '我的备注',
    apiFieldName: '我的备注',
    fieldType: 'text',
    required: false,
    description: '用户短评或备注',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  summary: {
    doubanFieldName: 'summary',
    chineseName: '内容简介',
    apiFieldName: '内容简介',
    fieldType: 'text',
    required: false,
    description: '书籍内容简介',
    verified: true,
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },

  coverImage: {
    doubanFieldName: 'coverImage',
    chineseName: '封面图',
    apiFieldName: '封面图',
    fieldType: 'url',
    required: false,
    description: '封面图片URL',
    verified: true,
    processingNotes:
      'sync-from-cache.ts确认需要{link: url}格式，real-douban-data-sync.ts中为coverUrl',
    verifiedSource: ['sync-from-cache.ts'],
  },

  markDate: {
    doubanFieldName: 'markDate',
    chineseName: '标记日期',
    apiFieldName: '标记日期',
    fieldType: 'datetime',
    required: false,
    description: '标记为想读/在读/读过的日期',
    verified: true,
    processingNotes: 'sync-from-cache.ts包含时间戳转换逻辑',
    verifiedSource: ['real-douban-data-sync.ts', 'sync-from-cache.ts'],
  },
};

/**
 * 统一的验证配置导出
 */
export const VERIFIED_FIELD_MAPPINGS = {
  books: VERIFIED_BOOKS_FIELD_MAPPING,
  movies: VERIFIED_MOVIES_FIELD_MAPPING,
  tv: VERIFIED_MOVIES_FIELD_MAPPING, // 电视剧使用相同的19字段结构
  documentary: VERIFIED_MOVIES_FIELD_MAPPING, // 纪录片使用相同的19字段结构
};

/**
 * 获取验证过的字段映射配置
 */
export function getVerifiedFieldMapping(
  dataType: 'books' | 'movies' | 'tv' | 'documentary',
): Record<string, VerifiedFieldMappingConfig> {
  return VERIFIED_FIELD_MAPPINGS[dataType] || VERIFIED_FIELD_MAPPINGS.books;
}

/**
 * 获取中文字段名列表（已验证）
 */
export function getVerifiedChineseFieldNames(
  dataType: 'books' | 'movies' | 'tv' | 'documentary',
): string[] {
  const mapping = getVerifiedFieldMapping(dataType);
  return Object.values(mapping).map((config) => config.chineseName);
}

/**
 * 获取必需字段列表（已验证）
 */
export function getVerifiedRequiredFields(
  dataType: 'books' | 'movies' | 'tv' | 'documentary',
): string[] {
  const mapping = getVerifiedFieldMapping(dataType);
  return Object.entries(mapping)
    .filter(([_, config]) => config.required)
    .map(([fieldName, _]) => fieldName);
}

/**
 * 豆瓣字段名转中文名（已验证）
 */
export function verifiedDoubanFieldToChineseName(
  fieldName: string,
  dataType: 'books' | 'movies' | 'tv' | 'documentary',
): string {
  const mapping = getVerifiedFieldMapping(dataType);
  return mapping[fieldName]?.chineseName || fieldName;
}

/**
 * 获取验证统计信息
 */
export function getVerificationStats(): {
  totalBooks: number;
  totalMovies: number;
  totalVerified: number;
  sourceCoverage: Record<string, number>;
} {
  const booksCount = Object.keys(VERIFIED_BOOKS_FIELD_MAPPING).length;
  const moviesCount = Object.keys(VERIFIED_MOVIES_FIELD_MAPPING).length;

  const allConfigs = [
    ...Object.values(VERIFIED_BOOKS_FIELD_MAPPING),
    ...Object.values(VERIFIED_MOVIES_FIELD_MAPPING),
  ];
  const verifiedCount = allConfigs.filter((config) => config.verified).length;

  const sourceCoverage: Record<string, number> = {};
  allConfigs.forEach((config) => {
    config.verifiedSource.forEach((source) => {
      sourceCoverage[source] = (sourceCoverage[source] || 0) + 1;
    });
  });

  return {
    totalBooks: booksCount,
    totalMovies: moviesCount,
    totalVerified: verifiedCount,
    sourceCoverage,
  };
}
