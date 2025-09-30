import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { DoubanService } from './douban.service';
import { FetchUserDataDto } from './dto/douban.dto';
import { DoubanItem } from './interfaces/douban.interface';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { BookScraperService, BookData } from './services/book-scraper.service';
import { DataTransformationService } from './services/data-transformation.service';

describe('DoubanService', () => {
  let service: DoubanService;
  let cookieManager: jest.Mocked<CookieManagerService>;
  let antiSpider: jest.Mocked<AntiSpiderService>;
  let bookScraper: jest.Mocked<BookScraperService>;
  let dataTransformation: jest.Mocked<DataTransformationService>;

  // Spy variables for unbound-method fix
  let validateCookieFormatSpy: jest.SpyInstance;
  let decryptCookieSpy: jest.SpyInstance;
  let validateCookieSpy: jest.SpyInstance;
  let fetchUserBooksSpy: jest.SpyInstance;
  let transformDoubanDataSpy: jest.SpyInstance;
  let sanitizeCookieSpy: jest.SpyInstance;
  let encryptCookieSpy: jest.SpyInstance;
  let getRequestStatsSpy: jest.SpyInstance;
  let getScrapingStatsSpy: jest.SpyInstance;
  let resetRequestCountSpy: jest.SpyInstance;

  // Mock data
  const mockUserId = 'test-user-123';
  const mockCookie = 'bid=test123; dbcl2=test456';
  const mockEncryptedCookie = 'encrypted-cookie-data';

  const mockFetchDto: FetchUserDataDto = {
    userId: mockUserId,
    cookie: mockCookie,
    category: 'books',
    status: 'collect',
    limit: 100,
    isEncrypted: false,
  };

  const mockBookData: BookData = {
    subjectId: '123456',
    title: 'Test Book',
    subTitle: 'Test Subtitle',
    originalTitle: 'Test Original Title',
    score: 8.5,
    desc: 'Test description',
    image: 'https://example.com/image.jpg',
    url: 'https://book.douban.com/subject/123456/',
    author: ['Test Author'],
    translator: ['Test Translator'],
    publisher: 'Test Publisher',
    datePublished: new Date('2023-01-01'),
    isbn: '1234567890',
    totalPage: 300,
    series: 'Test Series',
    price: 29.99,
    binding: 'Paperback',
    producer: 'Test Producer',
    myRating: 4,
    myTags: ['fiction', 'drama'],
    myState: 'collect',
    myComment: 'Great book!',
    markDate: new Date('2023-06-01'),
  };

  const mockDoubanItem: DoubanItem = {
    subjectId: '123456',
    title: 'Test Book',
    category: 'books',
    rating: { average: 8.5, numRaters: 0 },
    userRating: 4,
    userTags: ['fiction', 'drama'],
    userComment: 'Great book!',
    readDate: new Date('2023-06-01'),
    doubanUrl: 'https://book.douban.com/subject/123456/',
    genres: [],
  };

  const mockValidationResult = {
    isValid: true,
  };

  const mockTransformationResult = {
    data: {
      'Subject ID': '123456',
      书名: 'Test Book',
      豆瓣评分: 8.5,
    },
    statistics: {
      totalFields: 10,
      transformedFields: 8,
      repairedFields: 2,
      failedFields: 0,
    },
    warnings: ['Warning 1', 'Warning 2'],
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockCookieManager = {
      validateCookieFormat: jest.fn(),
      decryptCookie: jest.fn(),
      sanitizeCookie: jest.fn(),
      encryptCookie: jest.fn(),
    };

    const mockAntiSpider = {
      validateCookie: jest.fn(),
      getRequestStats: jest.fn(),
      resetRequestCount: jest.fn(),
    };

    const mockBookScraper = {
      fetchUserBooks: jest.fn(),
      getScrapingStats: jest.fn(),
    };

    const mockDataTransformation = {
      transformDoubanData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoubanService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CookieManagerService,
          useValue: mockCookieManager,
        },
        {
          provide: AntiSpiderService,
          useValue: mockAntiSpider,
        },
        {
          provide: BookScraperService,
          useValue: mockBookScraper,
        },
        {
          provide: DataTransformationService,
          useValue: mockDataTransformation,
        },
      ],
    }).compile();

    service = module.get<DoubanService>(DoubanService);
    cookieManager = module.get(CookieManagerService);
    antiSpider = module.get(AntiSpiderService);
    bookScraper = module.get(BookScraperService);
    dataTransformation = module.get(DataTransformationService);

    // Set up spies for unbound-method fix
    validateCookieFormatSpy = jest.spyOn(cookieManager, 'validateCookieFormat');
    decryptCookieSpy = jest.spyOn(cookieManager, 'decryptCookie');
    validateCookieSpy = jest.spyOn(antiSpider, 'validateCookie');
    fetchUserBooksSpy = jest.spyOn(bookScraper, 'fetchUserBooks');
    transformDoubanDataSpy = jest.spyOn(
      dataTransformation,
      'transformDoubanData',
    );
    sanitizeCookieSpy = jest.spyOn(cookieManager, 'sanitizeCookie');
    encryptCookieSpy = jest.spyOn(cookieManager, 'encryptCookie');
    getRequestStatsSpy = jest.spyOn(antiSpider, 'getRequestStats');
    getScrapingStatsSpy = jest.spyOn(bookScraper, 'getScrapingStats');
    resetRequestCountSpy = jest.spyOn(antiSpider, 'resetRequestCount');

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchUserData', () => {
    describe('successful scenarios', () => {
      beforeEach(() => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);
      });

      it('should fetch books data successfully with valid unencrypted cookie', async () => {
        const result = await service.fetchUserData(mockFetchDto);

        expect(result).toEqual([mockDoubanItem]);
        expect(validateCookieFormatSpy).toHaveBeenCalledWith(mockCookie);
        expect(decryptCookieSpy).not.toHaveBeenCalled();
        expect(validateCookieSpy).toHaveBeenCalledWith(mockUserId, mockCookie);
        expect(fetchUserBooksSpy).toHaveBeenCalledWith(mockUserId, mockCookie, {
          status: 'collect',
          limit: 100,
        });
      });

      it('should fetch books data successfully with valid encrypted cookie', async () => {
        const encryptedDto = { ...mockFetchDto, isEncrypted: true };
        decryptCookieSpy.mockReturnValue(mockCookie);

        const result = await service.fetchUserData(encryptedDto);

        expect(result).toEqual([mockDoubanItem]);
        expect(decryptCookieSpy).toHaveBeenCalledWith(mockUserId, mockCookie);
        expect(validateCookieSpy).toHaveBeenCalledWith(mockUserId, mockCookie);
      });

      it('should handle empty results gracefully', async () => {
        fetchUserBooksSpy.mockResolvedValue([]);

        const result = await service.fetchUserData(mockFetchDto);

        expect(result).toEqual([]);
      });
    });

    describe('validation and error scenarios', () => {
      it('should throw error for invalid cookie format', async () => {
        validateCookieFormatSpy.mockReturnValue(false);

        await expect(service.fetchUserData(mockFetchDto)).rejects.toThrow(
          'Invalid cookie format',
        );
        expect(validateCookieSpy).not.toHaveBeenCalled();
      });

      it('should throw error when cookie validation fails', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue({
          isValid: false,
          error: 'Cookie expired',
        });

        await expect(service.fetchUserData(mockFetchDto)).rejects.toThrow(
          'Cookie validation failed: Cookie expired',
        );
      });

      it('should throw error for unsupported category (movies not implemented)', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);

        const moviesDto = { ...mockFetchDto, category: 'movies' as const };

        await expect(service.fetchUserData(moviesDto)).rejects.toThrow(
          'Movie scraping not implemented yet',
        );
      });

      it('should throw error for unsupported category (tv not implemented)', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);

        const tvDto = { ...mockFetchDto, category: 'tv' as const };

        await expect(service.fetchUserData(tvDto)).rejects.toThrow(
          'TV show scraping not implemented yet',
        );
      });

      it('should throw error for invalid category type', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);

        // Reason: Testing runtime invalid category that bypasses TypeScript checking
        const invalidDto = {
          ...mockFetchDto,
          category: 'invalid' as unknown as 'books',
        };

        await expect(service.fetchUserData(invalidDto)).rejects.toThrow(
          'Unsupported category: invalid',
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        validateCookieFormatSpy.mockReturnValue(true);
      });

      it('should handle cookieManager.decryptCookie errors', async () => {
        const encryptedDto = { ...mockFetchDto, isEncrypted: true };
        decryptCookieSpy.mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        await expect(service.fetchUserData(encryptedDto)).rejects.toThrow(
          'Decryption failed',
        );
      });

      it('should handle antiSpider.validateCookie errors', async () => {
        validateCookieSpy.mockRejectedValue(
          new Error('Validation service error'),
        );

        await expect(service.fetchUserData(mockFetchDto)).rejects.toThrow(
          'Validation service error',
        );
      });

      it('should handle bookScraper.fetchUserBooks errors', async () => {
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockRejectedValue(new Error('Scraping failed'));

        await expect(service.fetchUserData(mockFetchDto)).rejects.toThrow(
          'Scraping failed',
        );
      });

      it('should convert non-Error exceptions to Error instances', async () => {
        validateCookieSpy.mockRejectedValue('String error message');

        await expect(service.fetchUserData(mockFetchDto)).rejects.toThrow(
          'String error message',
        );
      });
    });
  });

  describe('scrapeAndTransform', () => {
    describe('successful transformation', () => {
      beforeEach(() => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);
        transformDoubanDataSpy.mockReturnValue(mockTransformationResult);
      });

      it('should successfully scrape and transform data with statistics', async () => {
        const result = await service.scrapeAndTransform(mockFetchDto);

        expect(result.rawData).toEqual([mockDoubanItem]);
        expect(result.transformedData).toEqual([mockTransformationResult.data]);
        expect(result.transformationStats.totalProcessed).toBe(1);
        expect(result.transformationStats.repairsApplied).toBe(2);
        expect(result.transformationStats.validationWarnings).toBe(2);
        expect(
          result.transformationStats.processingTime,
        ).toBeGreaterThanOrEqual(0);

        expect(transformDoubanDataSpy).toHaveBeenCalledWith(
          mockDoubanItem,
          'books',
          {
            enableIntelligentRepairs: true,
            strictValidation: true,
            preserveRawData: false,
          },
        );
      });

      it('should handle data with repairs and warnings correctly', async () => {
        const transformationResultWithStats = {
          data: mockTransformationResult.data,
          statistics: {
            totalFields: 12,
            transformedFields: 7,
            repairedFields: 5,
            failedFields: 0,
          },
          warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
        };
        transformDoubanDataSpy.mockReturnValue(transformationResultWithStats);

        const result = await service.scrapeAndTransform(mockFetchDto);

        expect(result.transformationStats.repairsApplied).toBe(5);
        expect(result.transformationStats.validationWarnings).toBe(3);
      });

      it('should process empty data set gracefully', async () => {
        fetchUserBooksSpy.mockResolvedValue([]);

        const result = await service.scrapeAndTransform(mockFetchDto);

        expect(result.rawData).toEqual([]);
        expect(result.transformedData).toEqual([]);
        expect(result.transformationStats.totalProcessed).toBe(0);
        expect(result.transformationStats.repairsApplied).toBe(0);
        expect(result.transformationStats.validationWarnings).toBe(0);
      });
    });

    describe('error scenarios', () => {
      it('should handle fetchUserData errors', async () => {
        validateCookieFormatSpy.mockReturnValue(false);

        await expect(service.scrapeAndTransform(mockFetchDto)).rejects.toThrow(
          'Invalid cookie format',
        );
      });

      it('should handle dataTransformation errors', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);
        transformDoubanDataSpy.mockImplementation(() => {
          throw new Error('Transformation failed');
        });

        await expect(service.scrapeAndTransform(mockFetchDto)).rejects.toThrow(
          'Transformation failed',
        );
      });

      it('should convert non-Error exceptions to Error instances', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);
        transformDoubanDataSpy.mockImplementation(() => {
          // Reason: Testing non-Error exception handling requires throwing non-Error value
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'String transformation error';
        });

        await expect(service.scrapeAndTransform(mockFetchDto)).rejects.toThrow(
          'String transformation error',
        );
      });
    });
  });

  describe('validateCookie', () => {
    it('should validate cookie successfully', async () => {
      validateCookieSpy.mockResolvedValue(mockValidationResult);

      const result = await service.validateCookie(mockUserId, mockCookie);

      expect(result).toEqual(mockValidationResult);
      expect(validateCookieSpy).toHaveBeenCalledWith(mockUserId, mockCookie);
    });

    it('should return validation failure result', async () => {
      const failureResult = { isValid: false, error: 'Invalid cookie' };
      validateCookieSpy.mockResolvedValue(failureResult);

      const result = await service.validateCookie(mockUserId, mockCookie);

      expect(result).toEqual(failureResult);
    });

    it('should handle antiSpider validation errors', async () => {
      validateCookieSpy.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        service.validateCookie(mockUserId, mockCookie),
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('encryptCookie', () => {
    it('should encrypt cookie successfully', () => {
      const cleanedCookie = 'cleaned-cookie-data';
      validateCookieFormatSpy.mockReturnValue(true);
      sanitizeCookieSpy.mockReturnValue(cleanedCookie);
      encryptCookieSpy.mockReturnValue(mockEncryptedCookie);

      const result = service.encryptCookie(mockUserId, mockCookie);

      expect(result).toBe(mockEncryptedCookie);
      expect(validateCookieFormatSpy).toHaveBeenCalledWith(mockCookie);
      expect(sanitizeCookieSpy).toHaveBeenCalledWith(mockCookie);
      expect(encryptCookieSpy).toHaveBeenCalledWith(mockUserId, cleanedCookie);
    });

    it('should throw error for invalid cookie format', () => {
      validateCookieFormatSpy.mockReturnValue(false);

      expect(() => service.encryptCookie(mockUserId, mockCookie)).toThrow(
        'Invalid cookie format',
      );
      expect(sanitizeCookieSpy).not.toHaveBeenCalled();
      expect(encryptCookieSpy).not.toHaveBeenCalled();
    });

    it('should handle cookieManager errors', () => {
      validateCookieFormatSpy.mockReturnValue(true);
      sanitizeCookieSpy.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      expect(() => service.encryptCookie(mockUserId, mockCookie)).toThrow(
        'Sanitization failed',
      );
    });
  });

  describe('getScrapingStats', () => {
    it('should return combined scraping statistics', () => {
      const antiSpiderStats = {
        requestCount: 100,
        isSlowMode: false,
        slowModeThreshold: 200,
        baseDelay: 4000,
        slowDelay: 10000,
      };
      const bookStats = {
        requestCount: 100,
        isSlowMode: false,
        slowModeThreshold: 200,
        baseDelay: 4000,
        slowDelay: 10000,
      };

      getRequestStatsSpy.mockReturnValue(antiSpiderStats);
      getScrapingStatsSpy.mockReturnValue(bookStats);

      const result = service.getScrapingStats();

      expect(result).toEqual({
        antiSpider: antiSpiderStats,
        books: bookStats,
      });
      expect(getRequestStatsSpy).toHaveBeenCalled();
      expect(getScrapingStatsSpy).toHaveBeenCalled();
    });
  });

  describe('resetRequestCount', () => {
    it('should reset request count and log the action', () => {
      service.resetRequestCount();

      expect(resetRequestCountSpy).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('fetchBooks', () => {
      it('should be called correctly from fetchUserData', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);

        await service.fetchUserData(mockFetchDto);

        expect(fetchUserBooksSpy).toHaveBeenCalledWith(mockUserId, mockCookie, {
          status: 'collect',
          limit: 100,
        });
      });
    });

    describe('mapBookToDoubanItem', () => {
      it('should map BookData to DoubanItem correctly', async () => {
        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([mockBookData]);

        const result = await service.fetchUserData(mockFetchDto);

        expect(result[0]).toEqual(mockDoubanItem);
      });

      it('should handle optional fields gracefully', async () => {
        const minimalBookData: BookData = {
          subjectId: '789',
          title: 'Minimal Book',
          url: 'https://book.douban.com/subject/789/',
          author: [],
          translator: [],
        };

        validateCookieFormatSpy.mockReturnValue(true);
        validateCookieSpy.mockResolvedValue(mockValidationResult);
        fetchUserBooksSpy.mockResolvedValue([minimalBookData]);

        const result = await service.fetchUserData(mockFetchDto);

        expect(result[0]).toEqual({
          subjectId: '789',
          title: 'Minimal Book',
          category: 'books',
          rating: undefined,
          userRating: undefined,
          userTags: [],
          userComment: undefined,
          readDate: undefined,
          doubanUrl: 'https://book.douban.com/subject/789/',
          genres: [],
        });
      });
    });
  });
});
