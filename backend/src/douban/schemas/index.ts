/**
 * 豆瓣Schema统一导出模块
 * 
 * 整合所有豆瓣相关的Zod验证Schema
 * 为外部模块提供统一的导入接口
 * 
 * 创建时间: 2025-09-08
 * 用途: 豆瓣数据类型安全的统一入口
 */

// HTML响应Schema
export * from './html-response.schema';
export type {
  DoubanHtmlBase,
  DoubanItemHtml,
  DoubanBookHtml,
  DoubanMovieHtml,
  DoubanTvHtml,
  DoubanCollectionHtml,
  DoubanHttpError,
  DoubanRateLimit,
} from './html-response.schema';

// 解析结果Schema
export * from './parsed-result.schema';
export type {
  DoubanItemBase,
  DoubanBook,
  DoubanMovie,
  DoubanMusic,
  DoubanTvSeries,
  DoubanDocumentary,
  DoubanItem,
  DoubanBatchResult,
  DoubanParsingContext,
} from './parsed-result.schema';

// 书籍字段Schema
export * from './book-fields.schema';
export type {
  BookSubjectId,
  BookTitle,
  BookRating,
  BookAuthors,
  BookTranslators,
  BookPublishing,
  BookPhysical,
  BookGenres,
  BookSummary,
  UserRating,
  UserTags,
  UserComment,
  UserStatus,
  MarkDate,
  CoverImage,
  BookComplete,
  BookFieldValidation,
  BookBatchValidation,
} from './book-fields.schema';

// 电影/电视剧/纪录片字段Schema
export * from './movie-tv-fields.schema';
export type {
  MovieSubjectId,
  MovieTitle,
  MovieRating,
  Directors,
  Cast,
  Writers,
  Duration,
  Countries,
  Languages,
  ReleaseDate,
  MovieGenres,
  ImdbId,
  MovieUserRating,
  MovieUserTags,
  MovieUserStatus,
  TvSpecificFields,
  MovieComplete,
  TvSeriesComplete,
  DocumentaryComplete,
  MovieFieldValidation,
} from './movie-tv-fields.schema';

// 重新导出现有的transformation schema以保持兼容性
export * from '../contract/transformation.schema';
export type {
  DoubanDataType,
  TransformationOptions,
  TransformationStatistics,
  TransformationResult,
  IntelligentRepairConfig,
  FieldTransformationContext,
  TransformationError,
  BatchTransformationRequest,
  BatchTransformationResult,
  TransformationPerformance,
  TransformationAudit,
} from '../contract/transformation.schema';

/**
 * 统一验证工具函数导出
 */
export {
  validateDoubanHtml,
  isValidDoubanHtml,
} from './html-response.schema';

export {
  validateDoubanItem,
  validateDoubanItemByType,
  isDoubanBook,
  isDoubanMovie,
  isDoubanTvSeries,
  isDoubanDocumentary,
  inferDoubanItemType,
} from './parsed-result.schema';

export {
  validateBookComplete,
  validateBookField,
  assessBookDataQuality,
  isValidBookComplete,
} from './book-fields.schema';

export {
  validateMovieComplete,
  validateTvSeriesComplete,
  validateDocumentaryComplete,
  isDocumentaryByGenres,
  assessMovieDataQuality,
  isValidMovieComplete,
  isValidTvSeriesComplete,
  isValidDocumentaryComplete,
} from './movie-tv-fields.schema';

export {
  validateTransformationOptions,
  validateTransformationResult,
  validateDoubanDataType,
} from '../contract/transformation.schema';