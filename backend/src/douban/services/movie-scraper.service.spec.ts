import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MovieScraperService } from './movie-scraper.service';
import { AntiSpiderService } from './anti-spider.service';
import { HtmlParserService } from './html-parser.service';
import type {
  MovieComplete,
  TvSeriesComplete,
  DocumentaryComplete,
} from '../schemas';

describe('MovieScraperService', () => {
  let service: MovieScraperService;
  let mockAntiSpiderService: jest.Mocked<AntiSpiderService>;
  let mockHtmlParserService: jest.Mocked<HtmlParserService>;

  beforeEach(async () => {
    // Mock AntiSpiderService
    const mockAntiSpider = {
      makeRequest: jest.fn(),
      getRequestStats: jest.fn().mockReturnValue({
        requestCount: 0,
        isSlowMode: false,
        slowModeThreshold: 200,
        baseDelay: 4000,
        slowDelay: 10000,
      }),
    };

    // Mock HtmlParserService
    const mockHtmlParser = {
      parseDoubanItem: jest.fn(),
      parseCollectionPage: jest.fn(),
      parseStructuredData: jest.fn(),
      parseMetaTags: jest.fn(),
      parseBasicInfo: jest.fn(),
      parseUserState: jest.fn(),
      parseInfoSection: jest.fn(),
      parseListPage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieScraperService,
        {
          provide: AntiSpiderService,
          useValue: mockAntiSpider,
        },
        {
          provide: HtmlParserService,
          useValue: mockHtmlParser,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MovieScraperService>(MovieScraperService);
    mockAntiSpiderService = module.get(AntiSpiderService);
    mockHtmlParserService = module.get(HtmlParserService);
  });

  afterEach(() => {
    // 清理所有Mock状态，确保测试间不会相互干扰
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrapeMediaContent', () => {
    it('should successfully scrape a movie with type-safe validation', async () => {
      // 构建符合MovieComplete Schema的mock数据
      const mockMovieData: MovieComplete = {
        subjectId: '1292052',
        title: '肖申克的救赎',
        userTags: ['经典', '励志'],
        category: 'movies',
        userStatus: 'collect',
        doubanUrl: 'https://movie.douban.com/subject/1292052/',
        genres: ['剧情', '犯罪'],

        // 可选字段
        originalTitle: 'The Shawshank Redemption',
        coverUrl:
          'https://img2.doubanio.com/view/photo/s_ratio_poster/public/p480747492.jpg',
        rating: {
          average: 9.7,
          numRaters: 2896949,
        },
        userComment: '永恒的经典，关于希望的赞歌',
        userRating: 5,
        readDate: new Date('2024-07-20'),
        summary: '希望让人自由。',
        year: 1994,
        imdbId: 'tt0111161',

        // 电影特有字段（字符串格式）
        duration: '142分钟',
        releaseDate: '1994-09-23',
        directors: ['弗兰克·德拉邦特'],
        writers: ['弗兰克·德拉邦特', '斯蒂芬·金'],
        cast: ['蒂姆·罗宾斯', '摩根·弗里曼'],
        countries: ['美国'],
        languages: ['英语'],
      };

      // Mock成功的HTML请求
      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>Mock HTML</body></html>',
      );

      // Mock成功的解析
      mockHtmlParserService.parseDoubanItem.mockReturnValue({
        success: true,
        data: mockMovieData,
        errors: [],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 100,
        },
        parsingStrategy: 'json-ld',
      });

      const result = await service.scrapeMediaContent(
        '1292052',
        'test-cookie',
        'movie',
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe('movie');
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('肖申克的救赎');
      expect(result.performance).toBeDefined();
      expect(result.performance.classification).toContain('movie');
      expect(mockAntiSpiderService.makeRequest).toHaveBeenCalledWith(
        'https://movie.douban.com/subject/1292052/',
        'test-cookie',
      );
    });

    it('should classify TV series correctly based on episode information', async () => {
      // 构建符合TvSeriesComplete Schema的mock数据
      const mockTvData: TvSeriesComplete = {
        subjectId: '26794435',
        title: '权力的游戏',
        userTags: ['美剧', '奇幻'],
        category: 'tv',
        userStatus: 'collect',
        doubanUrl: 'https://movie.douban.com/subject/26794435/',
        genres: ['剧情', '奇幻', '冒险'],

        // 可选字段
        originalTitle: 'Game of Thrones',
        coverUrl:
          'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2561716440.jpg',
        rating: {
          average: 9.4,
          numRaters: 1025684,
        },
        summary: '史诗级巨制。',
        readDate: new Date('2024-02-10'),
        year: 2011,

        // 电视剧特有字段（字符串格式）
        episodeDuration: '60分钟',
        episodeCount: 73,
        firstAirDate: '2011-04-17',
        directors: ['戴维·贝尼奥夫', 'D·B·魏斯'],
        writers: ['戴维·贝尼奥夫', 'D·B·魏斯'],
        cast: ['彼特·丁拉基', '艾米莉亚·克拉克'],
        countries: ['美国'],
        languages: ['英语'],
      };

      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>TV HTML</body></html>',
      );
      mockHtmlParserService.parseDoubanItem.mockReturnValue({
        success: true,
        data: mockTvData,
        errors: [],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 120,
        },
        parsingStrategy: 'mixed',
      });

      const result = await service.scrapeMediaContent(
        '26794435',
        'test-cookie',
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe('tv');
      expect(result.data?.title).toBe('权力的游戏');
      expect(result.performance.classification).toContain('tv');
    });

    it('should identify documentaries by genre', async () => {
      // 构建符合DocumentaryComplete Schema的mock数据
      const mockDocumentaryData: DocumentaryComplete = {
        subjectId: '26302614',
        title: '我们的星球',
        userTags: ['纪录片', '自然', 'BBC'],
        category: 'documentary',
        userStatus: 'collect',
        doubanUrl: 'https://movie.douban.com/subject/26302614/',
        genres: ['纪录片', '自然'],

        // 可选字段
        originalTitle: 'Our Planet',
        coverUrl:
          'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2552031888.jpg',
        rating: {
          average: 9.8,
          numRaters: 162857,
        },
        summary: '震撼的自然纪录片。',
        userRating: 5,
        userComment: '震撼的自然之美',
        readDate: new Date('2024-03-01'),
        year: 2019,

        // 纪录片特有字段（字符串格式）
        episodeDuration: '50分钟',
        episodeCount: 8,
        firstAirDate: '2019-04-05',
        directors: ['阿拉斯泰尔·法瑟吉尔'],
        writers: ['阿拉斯泰尔·法瑟吉尔'],
        cast: ['大卫·爱登堡'],
        countries: ['英国'],
        languages: ['英语'],
      };

      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>Documentary HTML</body></html>',
      );
      mockHtmlParserService.parseDoubanItem.mockReturnValue({
        success: true,
        data: mockDocumentaryData,
        errors: [],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 80,
        },
        parsingStrategy: 'json-ld',
      });

      const result = await service.scrapeMediaContent(
        '26302614',
        'test-cookie',
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe('documentary');
      expect(result.data?.title).toBe('我们的星球');
    });

    it('should handle parsing failures gracefully', async () => {
      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>Invalid</body></html>',
      );
      mockHtmlParserService.parseDoubanItem.mockReturnValue({
        success: false,
        errors: ['无法解析媒体信息'],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 50,
        },
        parsingStrategy: 'html-selectors',
      });

      const result = await service.scrapeMediaContent('invalid', 'test-cookie');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('无法解析媒体信息');
    });

    it('should handle network failures', async () => {
      mockAntiSpiderService.makeRequest.mockRejectedValue(
        new Error('网络连接失败'),
      );

      const result = await service.scrapeMediaContent('123456', 'test-cookie');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('网络连接失败');
      expect(result.performance.classification).toBe('network-error');
    });
  });

  describe('batchScrapeUserMedia', () => {
    it('should batch scrape multiple media items and categorize by type', async () => {
      const mockListItems = [
        {
          id: '1292052',
          title: '肖申克的救赎',
          url: 'https://movie.douban.com/subject/1292052/',
        },
        {
          id: '26794435',
          title: '权力的游戏',
          url: 'https://movie.douban.com/subject/26794435/',
        },
      ];

      // 构建符合Schema的mock数据
      const mockMovieData: MovieComplete = {
        subjectId: '1292052',
        title: '肖申克的救赎',
        genres: ['剧情'],
        doubanUrl: 'https://movie.douban.com/subject/1292052/',
        userTags: ['经典'],
        category: 'movies',
        userStatus: 'collect',
        duration: '142分钟',
        releaseDate: '1994-09-23',
        directors: ['弗兰克·德拉邦特'],
        writers: ['弗兰克·德拉邦特'],
        cast: ['蒂姆·罗宾斯'],
        countries: ['美国'],
        languages: ['英语'],
      };

      const mockTvData: TvSeriesComplete = {
        subjectId: '26794435',
        title: '权力的游戏',
        genres: ['剧情', '奇幻'],
        doubanUrl: 'https://movie.douban.com/subject/26794435/',
        userTags: ['美剧'],
        category: 'tv',
        userStatus: 'collect',
        episodeDuration: '60分钟',
        episodeCount: 73,
        firstAirDate: '2011-04-17',
        directors: ['戴维·贝尼奥夫'],
        writers: ['戴维·贝尼奥夫'],
        cast: ['彼特·丁拉基'],
        countries: ['美国'],
        languages: ['英语'],
      };

      // Mock list page request
      mockAntiSpiderService.makeRequest
        .mockResolvedValueOnce('<html><body>List page</body></html>') // List page
        .mockResolvedValueOnce('<html><body>Movie detail</body></html>') // First movie
        .mockResolvedValueOnce('<html><body>TV detail</body></html>'); // Second TV show

      // Mock list parsing
      mockHtmlParserService.parseListPage.mockReturnValue({
        items: mockListItems,
        total: 2,
        hasMore: false,
      });

      // Mock detail parsing
      mockHtmlParserService.parseDoubanItem
        .mockReturnValueOnce({
          success: true,
          data: mockMovieData,
          errors: [],
          warnings: [],
          performance: {
            startTime: new Date(),
            endTime: new Date(),
            durationMs: 100,
          },
          parsingStrategy: 'json-ld',
        })
        .mockReturnValueOnce({
          success: true,
          data: mockTvData,
          errors: [],
          warnings: [],
          performance: {
            startTime: new Date(),
            endTime: new Date(),
            durationMs: 120,
          },
          parsingStrategy: 'mixed',
        });

      const result = await service.batchScrapeUserMedia(
        'testuser',
        'test-cookie',
        { limit: 10 },
      );

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.byType.movies).toHaveLength(1);
      expect(result.byType.tvSeries).toHaveLength(1);
      expect(result.byType.documentaries).toHaveLength(0);
      expect(result.byType.movies[0].title).toBe('肖申克的救赎');
      expect(result.byType.tvSeries[0].title).toBe('权力的游戏');
    });

    it('should handle individual item failures when continueOnError is true', async () => {
      const mockListItems = [
        {
          id: '1292052',
          title: '肖申克的救赎',
          url: 'https://movie.douban.com/subject/1292052/',
        },
        {
          id: 'invalid',
          title: '无效项目',
          url: 'https://movie.douban.com/subject/invalid/',
        },
      ];

      // Mock list page
      mockAntiSpiderService.makeRequest
        .mockResolvedValueOnce('<html><body>List page</body></html>')
        .mockResolvedValueOnce('<html><body>Movie detail</body></html>')
        .mockRejectedValueOnce(new Error('第二个项目失败'));

      mockHtmlParserService.parseListPage.mockReturnValue({
        items: mockListItems,
        total: 2,
        hasMore: false,
      });

      // First item succeeds
      const mockMovieData: MovieComplete = {
        subjectId: '1292052',
        title: '肖申克的救赎',
        genres: ['剧情'],
        doubanUrl: 'https://movie.douban.com/subject/1292052/',
        userTags: ['经典'],
        category: 'movies',
        userStatus: 'collect',
        duration: '142分钟',
        directors: ['弗兰克·德拉邦特'],
        writers: ['弗兰克·德拉邦特'],
        cast: ['蒂姆·罗宾斯'],
        countries: ['美国'],
        languages: ['英语'],
        releaseDate: '1994-09-23',
      };

      mockHtmlParserService.parseDoubanItem.mockReturnValueOnce({
        success: true,
        data: mockMovieData,
        errors: [],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 100,
        },
        parsingStrategy: 'json-ld',
      });

      const result = await service.batchScrapeUserMedia(
        'testuser',
        'test-cookie',
        {
          limit: 10,
          continueOnError: true,
        },
      );

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.byType.movies).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].mediaId).toBe('invalid');
    });

    it('should skip detail fetching when includeDetails is false', async () => {
      const mockListItems = [
        {
          id: '1292052',
          title: '肖申克的救赎',
          url: 'https://movie.douban.com/subject/1292052/',
        },
      ];

      mockAntiSpiderService.makeRequest.mockResolvedValueOnce(
        '<html><body>List page</body></html>',
      );
      mockHtmlParserService.parseListPage.mockReturnValue({
        items: mockListItems,
        total: 1,
        hasMore: false,
      });

      const result = await service.batchScrapeUserMedia(
        'testuser',
        'test-cookie',
        {
          includeDetails: false,
        },
      );

      expect(result.total).toBe(1);
      expect(result.succeeded).toBe(0); // No details fetched
      expect(result.byType.movies).toHaveLength(0);
      // Should not call parseDoubanItem for details
      expect(mockHtmlParserService.parseDoubanItem).not.toHaveBeenCalled();
    });
  });

  describe('validateMediaBatch', () => {
    it('should validate and categorize mixed media content', () => {
      const mixedData = [
        // Valid movie
        {
          subjectId: '1292052',
          title: '肖申克的救赎',
          genres: ['剧情'],
          doubanUrl: 'https://movie.douban.com/subject/1292052/',
          userTags: ['经典'],
          category: 'movies',
          userStatus: 'collect',
          duration: '142分钟',
          directors: ['弗兰克·德拉邦特'],
          writers: ['弗兰克·德拉邦特'],
          cast: ['蒂姆·罗宾斯'],
          countries: ['美国'],
          languages: ['英语'],
          releaseDate: '1994-09-23',
        },
        // Valid TV series
        {
          subjectId: '26794435',
          title: '权力的游戏',
          genres: ['剧情', '奇幻'],
          doubanUrl: 'https://movie.douban.com/subject/26794435/',
          userTags: ['美剧'],
          category: 'tv',
          userStatus: 'collect',
          episodeDuration: '60分钟',
          episodeCount: 73,
          firstAirDate: '2011-04-17',
          directors: ['戴维·贝尼奥夫'],
          writers: ['戴维·贝尼奥夫'],
          cast: ['彼特·丁拉基'],
          countries: ['美国'],
          languages: ['英语'],
        },
        // Invalid data
        {
          subjectId: '',
          title: '',
        },
      ];

      const result = service.validateMediaBatch(mixedData);

      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(1);
      expect(result.summary.byType.movies).toBe(1);
      expect(result.summary.byType.tvSeries).toBe(1);
      expect(result.summary.byType.documentaries).toBe(0);
      expect(result.summary.successRate).toBeCloseTo(66.7, 1);

      expect(result.valid.movies).toHaveLength(1);
      expect(result.valid.tvSeries).toHaveLength(1);
      expect(result.valid.documentaries).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
    });
  });

  describe('backward compatibility methods', () => {
    it('should maintain backward compatibility for getMovieDetail', async () => {
      const mockMovieData: MovieComplete = {
        subjectId: '1292052',
        title: '肖申克的救赎',
        genres: ['剧情'],
        doubanUrl: 'https://movie.douban.com/subject/1292052/',
        userTags: ['经典'],
        category: 'movies',
        userStatus: 'collect',
        duration: '142分钟',
        directors: ['弗兰克·德拉邦特'],
        writers: ['弗兰克·德拉邦特'],
        cast: ['蒂姆·罗宾斯'],
        countries: ['美国'],
        languages: ['英语'],
        releaseDate: '1994-09-23',
      };

      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>Mock HTML</body></html>',
      );
      mockHtmlParserService.parseDoubanItem.mockReturnValue({
        success: true,
        data: mockMovieData,
        errors: [],
        warnings: [],
        performance: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 100,
        },
        parsingStrategy: 'json-ld',
      });

      const result = await service.getMovieDetail('1292052', 'test-cookie');

      expect(result).toHaveProperty('subjectId', '1292052');
      expect(result).toHaveProperty('title', '肖申克的救赎');
      expect(result).toHaveProperty('director');
      expect(result.director).toEqual(['弗兰克·德拉邦特']);
      expect(result.type).toBe('movie');
    });

    it('should maintain backward compatibility for getUserMovieList', async () => {
      const mockListItems = [
        {
          id: '1292052',
          title: '肖申克的救赎',
          url: 'https://movie.douban.com/subject/1292052/',
        },
      ];

      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>List page</body></html>',
      );
      mockHtmlParserService.parseListPage.mockReturnValue({
        items: mockListItems,
        total: 1,
        hasMore: false,
      });

      const result = await service.getUserMovieList('testuser', 'test-cookie');

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('id', '1292052');
      expect(result.total).toBe(1);
    });
  });

  describe('getFieldMappingByType', () => {
    it('should return correct field mapping for movies', () => {
      const fields = service.getFieldMappingByType('movie');

      expect(fields).toContain('Subject ID');
      expect(fields).toContain('片长');
      expect(fields).toContain('上映日期');
      expect(fields).not.toContain('单集片长');
      expect(fields).not.toContain('集数');
    });

    it('should return correct field mapping for TV series', () => {
      const fields = service.getFieldMappingByType('tv');

      expect(fields).toContain('Subject ID');
      expect(fields).toContain('单集片长');
      expect(fields).toContain('集数');
      expect(fields).toContain('首播日期');
      expect(fields).not.toContain('上映日期');
    });

    it('should return correct field mapping for documentaries', () => {
      const fields = service.getFieldMappingByType('documentary');

      expect(fields).toContain('Subject ID');
      expect(fields).toContain('单集片长');
      expect(fields).toContain('集数');
      expect(fields).toContain('首播日期');
      expect(fields).not.toContain('上映日期');
    });
  });

  describe('getScrapingStats', () => {
    it('should return scraping statistics', () => {
      const stats = service.getScrapingStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('isSlowMode');
      expect(mockAntiSpiderService.getRequestStats).toHaveBeenCalled();
    });
  });
});
