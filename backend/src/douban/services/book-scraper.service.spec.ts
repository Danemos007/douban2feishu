import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BookScraperService } from './book-scraper.service';
import { AntiSpiderService } from './anti-spider.service';
import { HtmlParserService } from './html-parser.service';

describe('BookScraperService', () => {
  let service: BookScraperService;
  let mockAntiSpiderService: jest.Mocked<AntiSpiderService>;
  let mockHtmlParserService: jest.Mocked<HtmlParserService>;

  beforeEach(async () => {
    // Mock AntiSpiderService - using correct interface
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
        BookScraperService,
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

    service = module.get<BookScraperService>(BookScraperService);
    mockAntiSpiderService = module.get(AntiSpiderService);
    mockHtmlParserService = module.get(HtmlParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchUserBooks (legacy method)', () => {
    it('should fetch books using legacy format', async () => {
      // Mock list page with one book
      mockAntiSpiderService.makeRequest
        .mockResolvedValueOnce('<html><body>List page</body></html>') // List page
        .mockResolvedValueOnce('<html><body>Book detail</body></html>'); // Book detail

      // Mock list page parsing
      mockHtmlParserService.parseListPage.mockReturnValue({
        items: [
          {
            id: '123456',
            title: '测试书籍',
            url: 'https://book.douban.com/subject/123456/',
          },
        ],
        total: 1,
        hasMore: false,
      });

      // Mock detail page parsing components
      mockHtmlParserService.parseStructuredData.mockReturnValue({
        name: '测试书籍',
        author: [{ name: '测试作者' }],
        isbn: '9787532745739',
      });

      mockHtmlParserService.parseMetaTags.mockReturnValue({
        title: '测试书籍 (豆瓣)',
        description: '书籍描述',
        image: 'https://img9.doubanio.com/view/subject/s/public/s1085141.jpg',
      });

      mockHtmlParserService.parseBasicInfo.mockReturnValue({
        score: 9.4,
        desc: '精彩的书籍',
      });

      mockHtmlParserService.parseUserState.mockReturnValue({
        rating: 5,
        tags: ['经典', '文学'],
        state: 'collect',
        comment: '非常好看',
        markDate: new Date('2024-01-01'),
      });

      mockHtmlParserService.parseInfoSection.mockReturnValue({
        subTitle: '副标题',
        originalTitle: 'Original Title',
        translator: ['译者'],
        publisher: '出版社',
        datePublished: '2024',
        isbn: '9787532745739',
        totalPage: '200',
        binding: '平装',
      });

      const result = await service.fetchUserBooks('testuser', 'test-cookie');

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('subjectId', '123456');
      expect(result[0]).toHaveProperty('title', '测试书籍');
      expect(result[0]).toHaveProperty('author');
      expect(result[0].author).toEqual(['测试作者']);
    });

    it('should handle empty book list', async () => {
      // Mock empty list page
      mockAntiSpiderService.makeRequest.mockResolvedValue(
        '<html><body>Empty</body></html>',
      );
      mockHtmlParserService.parseListPage.mockReturnValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      const result = await service.fetchUserBooks('testuser', 'test-cookie');

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateBookData', () => {
    it('should validate correct book data', () => {
      const validBookData = {
        subjectId: '123456',
        title: '测试书籍',
        authors: ['测试作者'],
        translators: [],
        genres: ['文学'],
        doubanUrl: 'https://book.douban.com/subject/123456/',
        userTags: ['经典'],
        category: 'books',
        userStatus: 'collect',
      };

      const result = service.validateBookData(validBookData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid book data', () => {
      const invalidBookData = {
        subjectId: '', // Empty subject ID
        title: '', // Empty title
      };

      const result = service.validateBookData(invalidBookData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('batchValidateBooks', () => {
    it('should validate a batch of books correctly', () => {
      const books = [
        {
          subjectId: '123456',
          title: '测试书籍1',
          authors: ['作者1'],
          translators: [],
          genres: ['文学'],
          doubanUrl: 'https://book.douban.com/subject/123456/',
          userTags: ['经典'],
          category: 'books',
          userStatus: 'collect',
        },
        {
          subjectId: '', // Invalid
          title: '测试书籍2',
        },
        {
          subjectId: '789012',
          title: '测试书籍3',
          authors: ['作者3'],
          translators: [],
          genres: ['科幻'],
          doubanUrl: 'https://book.douban.com/subject/789012/',
          userTags: ['推荐'],
          category: 'books',
          userStatus: 'wish',
        },
      ];

      const result = service.batchValidateBooks(books);

      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(1);
      expect(result.summary.successRate).toBeCloseTo(66.7, 1);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
    });
  });

  describe('getScrapingStats', () => {
    it('should return scraping statistics', () => {
      const stats = service.getScrapingStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('isSlowMode');
      // The fact that we get valid stats proves getRequestStats was called
    });
  });
});
