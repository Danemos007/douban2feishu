/**
 * Schema兼容性测试工具
 *
 * 验证新创建的Zod Schema与现有豆瓣数据的兼容性
 * 确保不会引入破坏性变更
 *
 * 创建时间: 2025-09-08
 * 用途: 验证Schema设计的正确性
 */

import {
  validateBookComplete,
  validateMovieComplete,
  validateTvSeriesComplete,
  validateDocumentaryComplete,
  BookCompleteSchema,
  MovieCompleteSchema,
  TvSeriesCompleteSchema,
  DocumentaryCompleteSchema,
} from './index';

/**
 * 测试书籍数据样本（基于真实豆瓣数据）
 */
const testBookData = {
  subjectId: '36973237',
  title: '动物农场',
  originalTitle: 'Animal Farm',
  authors: ['乔治·奥威尔'],
  translators: ['张毅', '高孝先'],
  rating: {
    average: 9.4,
    numRaters: 425688,
  },
  genres: ['小说', '政治', '寓言'],
  summary:
    '《动物农场》是奥威尔最优秀的作品之一，是一则入骨三分的反乌托邦的政治讽喻寓言。',
  coverUrl: 'https://img9.doubanio.com/view/subject/s/public/s1085141.jpg',
  doubanUrl: 'https://book.douban.com/subject/36973237/',
  userRating: 5,
  userComment: '经典政治寓言，深刻而发人深省',
  userTags: ['政治', '寓言', '经典', '英国文学'],
  readDate: new Date('2024-08-15'),
  category: 'books' as const,
  year: 2007,
  publisher: '上海译文出版社',
  publishDate: '2007-3',
  pages: 118,
  price: '18.00元',
  binding: '平装',
  isbn: '9787532745739',
  userStatus: 'collect' as const,
};

/**
 * 测试电影数据样本
 */
const testMovieData = {
  subjectId: '1292052',
  title: '肖申克的救赎',
  originalTitle: 'The Shawshank Redemption',
  directors: ['弗兰克·德拉邦特'],
  writers: ['弗兰克·德拉邦特', '斯蒂芬·金'],
  cast: ['蒂姆·罗宾斯', '摩根·弗里曼', '鲍勃·冈顿'],
  rating: {
    average: 9.7,
    numRaters: 2896949,
  },
  genres: ['剧情', '犯罪'],
  summary: '希望让人自由。',
  coverUrl:
    'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p480747492.jpg',
  doubanUrl: 'https://movie.douban.com/subject/1292052/',
  userRating: 5,
  userComment: '永恒的经典，关于希望的赞歌',
  userTags: ['经典', '励志', '美国电影'],
  readDate: new Date('2024-07-20'),
  category: 'movies' as const,
  year: 1994,
  duration: '142分钟',
  countries: ['美国'],
  languages: ['英语'],
  releaseDate: '1994-09-23',
  imdbId: 'tt0111161',
  userStatus: 'collect' as const,
};

/**
 * 测试电视剧数据样本
 */
const testTvData = {
  subjectId: '26794435',
  title: '权力的游戏',
  originalTitle: 'Game of Thrones',
  directors: ['戴维·贝尼奥夫', 'D·B·魏斯'],
  writers: ['戴维·贝尼奥夫', 'D·B·魏斯'],
  cast: ['彼特·丁拉基', '艾米莉亚·克拉克', '肖恩·宾'],
  rating: {
    average: 9.4,
    numRaters: 1025684,
  },
  genres: ['剧情', '奇幻', '冒险'],
  summary:
    '《权力的游戏》改编自美国作家乔治·R·R·马丁的奇幻小说《冰与火之歌》系列。',
  coverUrl:
    'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2561716440.jpg',
  doubanUrl: 'https://movie.douban.com/subject/26794435/',
  userRating: 4,
  userComment: '史诗级巨制，前几季神作',
  userTags: ['美剧', '奇幻', '权谋'],
  readDate: new Date('2024-06-10'),
  category: 'tv' as const,
  year: 2011,
  episodeDuration: '60分钟',
  episodeCount: 73,
  countries: ['美国'],
  languages: ['英语'],
  firstAirDate: '2011-04-17',
  userStatus: 'collect' as const,
};

/**
 * 测试纪录片数据样本
 */
const testDocumentaryData = {
  subjectId: '26302614',
  title: '我们的星球',
  originalTitle: 'Our Planet',
  directors: ['阿拉斯泰尔·法瑟吉尔'],
  writers: [],
  cast: ['大卫·爱登堡'],
  rating: {
    average: 9.8,
    numRaters: 162857,
  },
  genres: ['纪录片', '自然'],
  summary: '《我们的星球》展现了地球上仍然存在的自然奇观和野生动物。',
  coverUrl:
    'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2552031888.jpg',
  doubanUrl: 'https://movie.douban.com/subject/26302614/',
  userRating: 5,
  userComment: '震撼的自然纪录片，摄影绝美',
  userTags: ['纪录片', '自然', 'BBC'],
  readDate: new Date('2024-05-15'),
  category: 'documentary' as const,
  year: 2019,
  episodeDuration: '50分钟',
  episodeCount: 8,
  countries: ['英国'],
  languages: ['英语'],
  firstAirDate: '2019-04-05',
  userStatus: 'collect' as const,
};

/**
 * 运行兼容性测试
 */
export function runCompatibilityTests() {
  const results: Record<
    string,
    { success: boolean; error: string; data: any }
  > = {};

  console.log('🧪 开始运行Schema兼容性测试...\n');

  // 测试书籍Schema
  try {
    console.log('📚 测试书籍Schema...');
    const bookResult = validateBookComplete(testBookData);
    results.book = {
      success: bookResult.success,
      error: bookResult.success ? '' : (bookResult as any).error || '验证失败',
      data: bookResult.success ? bookResult.data : null,
    };
    if (results.book.success) {
      console.log('✅ 书籍Schema验证成功');
      console.log(`   - Subject ID: ${results.book.data.subjectId}`);
      console.log(`   - 标题: ${results.book.data.title}`);
      console.log(`   - 作者: ${results.book.data.authors.join(', ')}`);
      console.log(`   - 评分: ${results.book.data.rating?.average || 'N/A'}`);
    } else {
      console.log('❌ 书籍Schema验证失败:');
      console.log(`   ${results.book.error}`);
    }
  } catch (error) {
    results.book = { success: false, error: `测试异常: ${error}`, data: null };
    console.log('❌ 书籍Schema测试异常:', error);
  }

  console.log('');

  // 测试电影Schema
  try {
    console.log('🎬 测试电影Schema...');
    const movieResult = validateMovieComplete(testMovieData);
    results.movie = {
      success: movieResult.success,
      error: movieResult.success
        ? ''
        : (movieResult as any).error || '验证失败',
      data: movieResult.success ? movieResult.data : null,
    };
    if (results.movie.success) {
      console.log('✅ 电影Schema验证成功');
      console.log(`   - Subject ID: ${results.movie.data.subjectId}`);
      console.log(`   - 标题: ${results.movie.data.title}`);
      console.log(`   - 导演: ${results.movie.data.directors.join(', ')}`);
      console.log(`   - 评分: ${results.movie.data.rating?.average || 'N/A'}`);
    } else {
      console.log('❌ 电影Schema验证失败:');
      console.log(`   ${results.movie.error}`);
    }
  } catch (error) {
    results.movie = { success: false, error: `测试异常: ${error}`, data: null };
    console.log('❌ 电影Schema测试异常:', error);
  }

  console.log('');

  // 测试电视剧Schema
  try {
    console.log('📺 测试电视剧Schema...');
    const tvResult = validateTvSeriesComplete(testTvData);
    results.tv = {
      success: tvResult.success,
      error: tvResult.success ? '' : (tvResult as any).error || '验证失败',
      data: tvResult.success ? tvResult.data : null,
    };
    if (results.tv.success) {
      console.log('✅ 电视剧Schema验证成功');
      console.log(`   - Subject ID: ${results.tv.data.subjectId}`);
      console.log(`   - 标题: ${results.tv.data.title}`);
      console.log(`   - 导演: ${results.tv.data.directors.join(', ')}`);
      console.log(`   - 集数: ${results.tv.data.episodeCount || 'N/A'}`);
    } else {
      console.log('❌ 电视剧Schema验证失败:');
      console.log(`   ${results.tv.error}`);
    }
  } catch (error) {
    results.tv = { success: false, error: `测试异常: ${error}`, data: null };
    console.log('❌ 电视剧Schema测试异常:', error);
  }

  console.log('');

  // 测试纪录片Schema
  try {
    console.log('🎞️ 测试纪录片Schema...');
    const docResult = validateDocumentaryComplete(testDocumentaryData);
    results.documentary = {
      success: docResult.success,
      error: docResult.success ? '' : (docResult as any).error || '验证失败',
      data: docResult.success ? docResult.data : null,
    };
    if (results.documentary.success) {
      console.log('✅ 纪录片Schema验证成功');
      console.log(`   - Subject ID: ${results.documentary.data.subjectId}`);
      console.log(`   - 标题: ${results.documentary.data.title}`);
      console.log(
        `   - 导演: ${results.documentary.data.directors.join(', ')}`,
      );
      console.log(
        `   - 集数: ${results.documentary.data.episodeCount || 'N/A'}`,
      );
    } else {
      console.log('❌ 纪录片Schema验证失败:');
      console.log(`   ${results.documentary.error}`);
    }
  } catch (error) {
    results.documentary = {
      success: false,
      error: `测试异常: ${error}`,
      data: null,
    };
    console.log('❌ 纪录片Schema测试异常:', error);
  }

  console.log('');

  // 汇总测试结果
  const totalTests = 4;
  const successTests = Object.values(results).filter((r) => r.success).length;
  const successRate = (successTests / totalTests) * 100;

  console.log(`📊 测试结果汇总:`);
  console.log(`   - 总测试数: ${totalTests}`);
  console.log(`   - 成功数: ${successTests}`);
  console.log(`   - 失败数: ${totalTests - successTests}`);
  console.log(`   - 成功率: ${successRate.toFixed(1)}%`);

  if (successRate === 100) {
    console.log('🎉 所有Schema兼容性测试通过！');
  } else {
    console.log('⚠️  部分Schema测试失败，需要调整');
  }

  return {
    success: successRate === 100,
    successRate,
    results,
    summary: {
      total: totalTests,
      success: successTests,
      failed: totalTests - successTests,
    },
  };
}

/**
 * 边界情况测试
 */
export function runBoundaryTests() {
  console.log('\n🔬 开始边界情况测试...\n');

  // 测试空数据
  console.log('🗑️ 测试空数据...');
  const emptyResult = validateBookComplete({});
  console.log(emptyResult.success ? '✅ 空数据处理正常' : '❌ 空数据处理异常');

  // 测试最小数据
  console.log('📏 测试最小有效数据...');
  const minimalBook = {
    subjectId: '123',
    title: '测试书',
    authors: ['测试作者'],
    doubanUrl: 'https://book.douban.com/subject/123/',
    category: 'books' as const,
  };
  const minimalResult = validateBookComplete(minimalBook);
  console.log(
    minimalResult.success ? '✅ 最小数据验证通过' : '❌ 最小数据验证失败',
  );

  // 测试无效数据类型
  console.log('⚠️ 测试无效数据类型...');
  const invalidBook = {
    subjectId: 123, // 应该是字符串
    title: '', // 空标题
    authors: [], // 空作者数组
    doubanUrl: 'invalid-url', // 无效URL
    category: 'books' as const,
  };
  const invalidResult = validateBookComplete(invalidBook);
  console.log(
    !invalidResult.success ? '✅ 无效数据正确被拒绝' : '❌ 无效数据被错误接受',
  );
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runCompatibilityTests();
  runBoundaryTests();
}
