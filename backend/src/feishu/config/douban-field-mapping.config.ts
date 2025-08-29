/**
 * 豆瓣字段到中文名的标准映射配置
 * 
 * 说明：
 * - 豆瓣字段名 → 飞书表格中文字段名
 * - 首次同步时会精确匹配这些中文名
 * - 如果飞书表格中不存在，会自动创建
 * - ~~创建后绑定Field ID，后续使用"认ID不认名"策略~~ **创建后使用字段名匹配策略进行数据操作**
 * - **策略更正**: 飞书API仅支持字段名操作，不支持Field ID直接数据写入
 */

import { FeishuFieldType } from '../interfaces/feishu.interface';

// 字段类型映射
export const FIELD_TYPE_MAPPING = {
  text: FeishuFieldType.Text,
  number: FeishuFieldType.Number,
  rating: FeishuFieldType.Rating,
  multiSelect: FeishuFieldType.MultiSelect,
  singleSelect: FeishuFieldType.SingleSelect,
  datetime: FeishuFieldType.DateTime,
  url: FeishuFieldType.URL,
  checkbox: FeishuFieldType.Checkbox,
};

// 豆瓣书籍字段映射 (16个字段)
export const DOUBAN_BOOKS_FIELD_MAPPING = {
  subjectId: {
    chineseName: 'Subject ID',
    fieldType: 'text',
    required: true,
    description: '豆瓣书籍唯一标识ID',
  },
  title: {
    chineseName: '书名',
    fieldType: 'text',
    required: true,
    description: '书籍标题',
  },
  subtitle: {
    chineseName: '副标题',
    fieldType: 'text',
    required: false,
    description: '书籍副标题',
  },
  author: {
    chineseName: '作者',
    fieldType: 'text',
    required: false,
    description: '书籍作者，多个作者用/分隔',
  },
  translator: {
    chineseName: '译者',
    fieldType: 'text',
    required: false,
    description: '翻译者姓名',
  },
  publisher: {
    chineseName: '出版社',
    fieldType: 'text',
    required: false,
    description: '出版社名称',
  },
  publishDate: {
    chineseName: '出版年份',
    fieldType: 'text',
    required: false,
    description: '出版日期或年份',
  },
  originalTitle: {
    chineseName: '原作名',
    fieldType: 'text',
    required: false,
    description: '书籍原文标题',
  },
  doubanRating: {
    chineseName: '豆瓣评分',
    fieldType: 'number',
    required: false,
    description: '豆瓣平均评分',
  },
  myRating: {
    chineseName: '我的评分',
    fieldType: 'rating',
    required: false,
    description: '用户个人评分（1-5星）',
  },
  myTags: {
    chineseName: '我的标签',
    fieldType: 'text',
    required: false,
    description: '用户添加的标签',
  },
  myStatus: {
    chineseName: '我的状态',
    fieldType: 'text',
    required: false,
    description: '阅读状态：想读/在读/读过',
  },
  myComment: {
    chineseName: '我的备注',
    fieldType: 'text',
    required: false,
    description: '用户短评或备注',
  },
  summary: {
    chineseName: '内容简介',
    fieldType: 'text',
    required: false,
    description: '书籍内容简介',
  },
  coverUrl: {
    chineseName: '封面图',
    fieldType: 'url',
    required: false,
    description: '封面图片URL',
  },
  markDate: {
    chineseName: '标记日期',
    fieldType: 'datetime',
    required: false,
    description: '标记为想读/在读/读过的日期',
  },
};

// 豆瓣电影字段映射 (18个字段)
export const DOUBAN_MOVIES_FIELD_MAPPING = {
  subjectId: {
    chineseName: 'Subject ID',
    fieldType: 'text',
    required: true,
    description: '豆瓣电影唯一标识ID',
  },
  title: {
    chineseName: '电影名',
    fieldType: 'text',
    required: true,
    description: '电影标题',
  },
  genre: {
    chineseName: '类型',
    fieldType: 'text',
    required: false,
    description: '电影类型：剧情/动作/喜剧等',
  },
  directors: {
    chineseName: '导演',
    fieldType: 'text',
    required: false,
    description: '导演姓名，多个导演用/分隔',
  },
  cast: {
    chineseName: '主演',
    fieldType: 'text',
    required: false,
    description: '主要演员，多个演员用/分隔',
  },
  writer: {
    chineseName: '编剧',
    fieldType: 'text',
    required: false,
    description: '编剧姓名，多个编剧用/分隔',
  },
  country: {
    chineseName: '制片地区',
    fieldType: 'text',
    required: false,
    description: '制片国家/地区',
  },
  language: {
    chineseName: '语言',
    fieldType: 'text',
    required: false,
    description: '电影语言',
  },
  releaseDate: {
    chineseName: '上映日期',
    fieldType: 'text',
    required: false,
    description: '上映日期，包含完整地区信息（如：2010-12-16(中国大陆) / 2010-12-18(美国)）',
  },
  duration: {
    chineseName: '片长',
    fieldType: 'text',
    required: false,
    description: '电影时长',
  },
  doubanRating: {
    chineseName: '豆瓣评分',
    fieldType: 'number',
    required: false,
    description: '豆瓣平均评分',
  },
  image: {
    chineseName: '封面图',
    fieldType: 'url',
    required: false,
    description: '电影海报URL',
  },
  description: {
    chineseName: '剧情简介',
    fieldType: 'text',
    required: false,
    description: '电影剧情简介',
  },
  myRating: {
    chineseName: '我的评分',
    fieldType: 'rating',
    required: false,
    description: '用户个人评分（1-5星）',
  },
  myTags: {
    chineseName: '我的标签',
    fieldType: 'text',
    required: false,
    description: '用户添加的标签',
  },
  myStatus: {
    chineseName: '我的状态',
    fieldType: 'text',
    required: false,
    description: '观看状态：想看/在看/看过',
  },
  myComment: {
    chineseName: '我的备注',
    fieldType: 'text',
    required: false,
    description: '用户短评或备注',
  },
  markDate: {
    chineseName: '标记日期',
    fieldType: 'datetime',
    required: false,
    description: '标记为想看/在看/看过的日期',
  },
};

// 豆瓣电视剧/纪录片字段映射 (19个字段)
export const DOUBAN_TV_FIELD_MAPPING = {
  subjectId: {
    chineseName: 'Subject ID',
    fieldType: 'text',
    required: true,
    description: '豆瓣剧集唯一标识ID',
  },
  title: {
    chineseName: '片名',
    fieldType: 'text',
    required: true,
    description: '电视剧/纪录片标题',
  },
  type: {
    chineseName: '类型',
    fieldType: 'text',
    required: false,
    description: '内容类型：电视剧/纪录片',
  },
  directors: {
    chineseName: '导演',
    fieldType: 'text',
    required: false,
    description: '导演姓名，多个导演用/分隔',
  },
  cast: {
    chineseName: '主演',
    fieldType: 'text',
    required: false,
    description: '主要演员，多个演员用/分隔',
  },
  writer: {
    chineseName: '编剧',
    fieldType: 'text',
    required: false,
    description: '编剧姓名，多个编剧用/分隔',
  },
  country: {
    chineseName: '制片地区',
    fieldType: 'text',
    required: false,
    description: '制片国家/地区',
  },
  language: {
    chineseName: '语言',
    fieldType: 'text',
    required: false,
    description: '剧集语言',
  },
  releaseDate: {
    chineseName: '首播日期',
    fieldType: 'text',
    required: false,
    description: '首播日期，包含完整地区信息（如：2021-01-01(中国大陆) / 2021-01-15(美国)）',
  },
  duration: {
    chineseName: '单集片长',
    fieldType: 'text',
    required: false,
    description: '每集时长',
  },
  episodes: {
    chineseName: '集数',
    fieldType: 'text',
    required: false,
    description: '总集数',
  },
  doubanRating: {
    chineseName: '豆瓣评分',
    fieldType: 'number',
    required: false,
    description: '豆瓣平均评分',
  },
  image: {
    chineseName: '封面图',
    fieldType: 'url',
    required: false,
    description: '剧集海报URL',
  },
  description: {
    chineseName: '剧情简介',
    fieldType: 'text',
    required: false,
    description: '剧集剧情简介',
  },
  myRating: {
    chineseName: '我的评分',
    fieldType: 'rating',
    required: false,
    description: '用户个人评分（1-5星）',
  },
  myTags: {
    chineseName: '我的标签',
    fieldType: 'text',
    required: false,
    description: '用户添加的标签',
  },
  myStatus: {
    chineseName: '我的状态',
    fieldType: 'text',
    required: false,
    description: '观看状态：想看/在看/看过',
  },
  myComment: {
    chineseName: '我的备注',
    fieldType: 'text',
    required: false,
    description: '用户短评或备注',
  },
  markDate: {
    chineseName: '标记日期',
    fieldType: 'datetime',
    required: false,
    description: '标记为想看/在看/看过的日期',
  },
};

// 统一导出配置
export const DOUBAN_FIELD_MAPPINGS = {
  books: DOUBAN_BOOKS_FIELD_MAPPING,
  movies: DOUBAN_MOVIES_FIELD_MAPPING,
  tv: DOUBAN_TV_FIELD_MAPPING,
  documentary: DOUBAN_TV_FIELD_MAPPING, // 纪录片使用与电视剧相同的字段
};

// 获取字段映射配置的辅助函数
export function getDoubanFieldMapping(dataType: 'books' | 'movies' | 'tv' | 'documentary') {
  return DOUBAN_FIELD_MAPPINGS[dataType] || DOUBAN_FIELD_MAPPINGS.books;
}

// 获取中文字段名列表
export function getChineseFieldNames(dataType: 'books' | 'movies' | 'tv' | 'documentary'): string[] {
  const mapping = getDoubanFieldMapping(dataType);
  return Object.values(mapping).map(config => config.chineseName);
}

// 获取必需字段列表
export function getRequiredFields(dataType: 'books' | 'movies' | 'tv' | 'documentary'): string[] {
  const mapping = getDoubanFieldMapping(dataType);
  return Object.entries(mapping)
    .filter(([_, config]) => config.required)
    .map(([fieldName, _]) => fieldName);
}

// 豆瓣字段名转中文名
export function doubanFieldToChineseName(fieldName: string, dataType: 'books' | 'movies' | 'tv' | 'documentary'): string {
  const mapping = getDoubanFieldMapping(dataType);
  return mapping[fieldName]?.chineseName || fieldName;
}

// 中文名转豆瓣字段名
export function chineseNameToDoubanField(chineseName: string, dataType: 'books' | 'movies' | 'tv' | 'documentary'): string | null {
  const mapping = getDoubanFieldMapping(dataType);
  const entry = Object.entries(mapping).find(([_, config]) => config.chineseName === chineseName);
  return entry ? entry[0] : null;
}