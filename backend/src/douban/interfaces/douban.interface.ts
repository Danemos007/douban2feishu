/**
 * 豆瓣条目基础接口
 */
export interface DoubanItem {
  subjectId: string; // 豆瓣ID (唯一标识)
  title: string; // 标题
  originalTitle?: string; // 原标题
  year?: number; // 年份
  rating?: {
    // 评分信息
    average: number; // 平均分
    numRaters: number; // 评分人数
  };
  genres: string[]; // 分类/类型
  directors?: string[]; // 导演 (电影)
  cast?: string[]; // 演员 (电影)
  authors?: string[]; // 作者 (图书)
  artists?: string[]; // 艺术家 (音乐)
  summary?: string; // 简介
  coverUrl?: string; // 封面图片URL
  doubanUrl: string; // 豆瓣页面URL
  userRating?: number; // 用户评分 (1-5星)
  userComment?: string; // 用户评论
  userTags: string[]; // 用户标签
  readDate?: Date; // 阅读/观看日期
  category: 'books' | 'movies' | 'music'; // 分类
}

/**
 * 豆瓣图书接口
 */
export interface DoubanBook extends DoubanItem {
  category: 'books';
  isbn?: string; // ISBN
  publisher?: string; // 出版社
  publishDate?: string; // 出版日期
  pages?: number; // 页数
  price?: string; // 价格
  binding?: string; // 装帧
  authors: string[]; // 作者
  translators?: string[]; // 译者
}

/**
 * 豆瓣电影接口
 */
export interface DoubanMovie extends DoubanItem {
  category: 'movies';
  imdbId?: string; // IMDB ID
  duration?: string; // 时长
  countries: string[]; // 制片国家/地区
  languages: string[]; // 语言
  releaseDate?: string; // 上映日期
  directors: string[]; // 导演
  writers?: string[]; // 编剧
  cast: string[]; // 演员
}

/**
 * 豆瓣音乐接口
 */
export interface DoubanMusic extends DoubanItem {
  category: 'music';
  artists: string[]; // 艺术家
  album?: string; // 专辑名
  releaseDate?: string; // 发行日期
  label?: string; // 唱片公司
  trackCount?: number; // 曲目数
  duration?: string; // 时长
  medium?: string; // 介质 (CD, 黑胶等)
}

/**
 * 豆瓣抓取选项
 */
export interface DoubanFetchOptions {
  cookie: string;
  category: 'books' | 'movies' | 'music';
  limit?: number;
  startFrom?: number;
  includeUnrated?: boolean; // 是否包含未评分项目
  onlyWithTags?: boolean; // 仅包含有标签的项目
}
