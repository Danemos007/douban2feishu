import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { AntiSpiderService } from './anti-spider.service';
import { CookieManagerService } from './cookie-manager.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Type definition for accessing private methods in tests
interface AntiSpiderServiceTestable {
  intelligentDelay(): Promise<void>;
  sleep: jest.SpyInstance & ((ms: number) => Promise<void>);
  isHumanVerificationRequired(html: string): boolean;
  requestCount: number;
}

/**
 * AntiSpiderService 单元测试
 *
 * 测试覆盖范围:
 * - 基础服务初始化
 * - 智能延迟策略 (正常模式 vs 慢速模式)
 * - HTTP请求核心功能 (成功/失败场景)
 * - 重试机制和错误处理
 * - Cookie验证功能
 * - 辅助工具方法
 * - 边界条件处理
 *
 * 目标覆盖率: >90%
 */
describe('AntiSpiderService', () => {
  let service: AntiSpiderService;
  let cookieManagerService: jest.Mocked<CookieManagerService>;
  let loggerDebugSpy: jest.SpyInstance;
  let _loggerWarnSpy: jest.SpyInstance;
  let _loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock CookieManagerService
    const mockCookieManagerService = {
      getHeadersForDomain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiSpiderService,
        {
          provide: CookieManagerService,
          useValue: mockCookieManagerService,
        },
      ],
    }).compile();

    service = module.get<AntiSpiderService>(AntiSpiderService);
    cookieManagerService = module.get(CookieManagerService);

    // Setup logger spies
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    _loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    _loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    // Setup default mock responses
    cookieManagerService.getHeadersForDomain.mockReturnValue({
      'User-Agent': 'test-agent',
      Cookie: 'test-cookie',
    });

    // Clear axios mock
    mockedAxios.mockClear();
  });

  afterEach(() => {
    // 不要清除所有mocks，只清除计时器相关
    jest.clearAllTimers();
    jest.useRealTimers();
    // 只重置特定的mocks
    loggerDebugSpy?.mockClear();
    _loggerWarnSpy?.mockClear();
    _loggerErrorSpy?.mockClear();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct default values', () => {
      const stats = service.getRequestStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.isSlowMode).toBe(false);
      expect(stats.slowModeThreshold).toBe(200);
      expect(stats.baseDelay).toBe(4000);
      expect(stats.slowDelay).toBe(10000);
    });

    it('should inject CookieManagerService dependency', () => {
      expect(cookieManagerService).toBeDefined();
    });
  });

  describe('intelligentDelay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
    });

    it('should apply normal mode delay for request count <= threshold', async () => {
      // Ensure we're in normal mode
      service.setRequestCount(50);

      const delayPromise = service.intelligentDelay();

      // Fast-forward time
      jest.advanceTimersByTime(8000);
      await delayPromise;

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Normal mode (51 requests) - delay:'),
      );
    });

    it('should apply slow mode delay for request count > threshold', async () => {
      // Set to slow mode
      service.setRequestCount(200);

      const delayPromise = service.intelligentDelay();

      // Fast-forward time
      jest.advanceTimersByTime(15000);
      await delayPromise;

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow mode (201 requests) - delay:'),
      );
    });

    it('should increment request count on each call', async () => {
      const initialCount = service.getRequestStats().requestCount;

      const delayPromise = service.intelligentDelay();
      jest.advanceTimersByTime(8000);
      await delayPromise;

      expect(service.getRequestStats().requestCount).toBe(initialCount + 1);
    });

    it('should call sleep with calculated delay time', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const delayPromise = service.intelligentDelay();
      jest.advanceTimersByTime(8000);
      await delayPromise;

      expect(setTimeoutSpy).toHaveBeenCalled();
      const delayTime = setTimeoutSpy.mock.calls[0][1] as number;
      expect(delayTime).toBeGreaterThanOrEqual(4000);
      expect(delayTime).toBeLessThanOrEqual(8000);
    });
  });

  describe('makeRequest - Success Cases', () => {
    let getHeadersForDomainSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      // Create spy for cookieManager method
      getHeadersForDomainSpy = jest.spyOn(
        cookieManagerService,
        'getHeadersForDomain',
      );
    });

    it('should make successful request with valid response', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const url = 'https://book.douban.com/subject/123';
      const cookie = 'test-cookie';

      const resultPromise = service.makeRequest(url, cookie);

      // Fast-forward through delay
      jest.advanceTimersByTime(8000);
      const result = await resultPromise;

      expect(result).toBe('<html>Valid content</html>');
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url,
          timeout: 30000,
        }),
      );
    });

    it('should extract correct domain type and set headers', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const url = 'https://movie.douban.com/subject/123';
      const cookie = 'test-cookie';

      const resultPromise = service.makeRequest(url, cookie);
      jest.advanceTimersByTime(8000);
      await resultPromise;

      expect(getHeadersForDomainSpy).toHaveBeenCalledWith('movie', cookie);
    });

    it('should merge custom headers with domain headers', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const customHeaders = { 'X-Custom': 'test' };
      const resultPromise = service.makeRequest(
        'https://www.douban.com/test',
        'cookie',
        { headers: customHeaders },
      );

      jest.advanceTimersByTime(8000);
      await resultPromise;

      // Reason: Jest Mock function reference is safe in test context
      const mockedAxiosSpy = mockedAxios as jest.MockedFunction<
        typeof mockedAxios
      >;
      expect(mockedAxiosSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'test',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should return response data as string', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 12345, // Non-string data
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const resultPromise = service.makeRequest(
        'https://www.douban.com',
        'cookie',
      );
      jest.advanceTimersByTime(8000);
      const result = await resultPromise;

      expect(result).toBe('12345');
    });
  });

  describe('makeRequest - Error Handling', () => {
    // 不使用伪造计时器，因为这些测试主要检查错误处理逻辑
    beforeEach(() => {
      // Mock所有延迟相关方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
      // 确保axios mock正常工作
      mockedAxios.mockClear();
    });

    it('should throw error for 403 status code', async () => {
      const mockResponse: AxiosResponse = {
        status: 403,
        data: 'Forbidden',
        statusText: 'Forbidden',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Request forbidden (403) - possible IP blocking');
    });

    it('should detect and throw error for human verification', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html><title>禁止访问</title></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Human verification required - please update cookie');
    });

    it('should detect and throw error for blocked access', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>系统繁忙，请稍后再试</html>', // 使用只触发阻止检测的内容
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 使用Implementation而不是ResolvedValue来确保mock正确应用
      mockedAxios.mockClear();
      mockedAxios.mockImplementation(() => Promise.resolve(mockResponse));

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Access blocked - content indicates restriction');
    });

    it('should handle axios network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.mockRejectedValue(networkError);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Network Error');
    });

    it('should not retry on human verification errors', async () => {
      const verificationResponse: AxiosResponse = {
        status: 200,
        data: '<html><title>禁止访问</title></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValue(verificationResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Human verification required');
      expect(mockedAxios).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should not retry on 403 errors', async () => {
      const forbiddenResponse: AxiosResponse = {
        status: 403,
        data: 'Forbidden',
        statusText: 'Forbidden',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValue(forbiddenResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Request forbidden (403)');
      expect(mockedAxios).toHaveBeenCalledTimes(1); // Should not retry
    });
  });

  describe('makeRequest - Retry Mechanism', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should retry on transient errors (up to maxRetries)', async () => {
      const networkError = new Error('Network timeout');
      const successResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      // 重置mock以确保clean state
      mockedAxios.mockClear();
      // 前两次调用失败，第三次成功
      mockedAxios
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.makeRequest(
        'https://www.douban.com',
        'cookie',
      );

      expect(result).toBe('success');
      expect(mockedAxios).toHaveBeenCalledTimes(3); // 3次尝试
    });

    it('should succeed on second attempt after first failure', async () => {
      const networkError = new Error('Temporary error');
      const successResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.makeRequest(
        'https://www.douban.com',
        'cookie',
      );

      expect(result).toBe('success');
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('should fail after all retry attempts exhausted', async () => {
      const persistentError = new Error('Persistent error');
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Persistent error');
      expect(mockedAxios).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should apply additional delay between retries', async () => {
      // 恢复sleep的spy然后重新创建
      // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
      (service as unknown as AntiSpiderServiceTestable).sleep.mockRestore?.();

      const sleepSpy = jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
      const networkError = new Error('Network error');
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Network error');

      // 验证sleep被调用了多次（第一次尝试后的重试延迟）
      expect(sleepSpy).toHaveBeenCalledWith(expect.any(Number));
      expect(mockedAxios).toHaveBeenCalledTimes(3); // maxRetries = 3
    });

    it('should preserve last error when all retries fail', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      const lastError = new Error('Final error');

      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(lastError);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Final error');
    });
  });

  describe('sleepRange', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should sleep for time within specified range', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const sleepPromise = service.sleepRange(1000, 3000);
      jest.advanceTimersByTime(3000);
      await sleepPromise;

      expect(setTimeoutSpy).toHaveBeenCalled();
      const delayTime = setTimeoutSpy.mock.calls[0][1] as number;
      expect(delayTime).toBeGreaterThanOrEqual(1000);
      expect(delayTime).toBeLessThanOrEqual(3000);
    });

    it('should handle edge case where min equals max', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const sleepPromise = service.sleepRange(2000, 2000);
      jest.advanceTimersByTime(2000);
      await sleepPromise;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('getRequestStats', () => {
    it('should return correct stats in normal mode', () => {
      service.setRequestCount(50);

      const stats = service.getRequestStats();

      expect(stats).toEqual({
        requestCount: 50,
        isSlowMode: false,
        slowModeThreshold: 200,
        baseDelay: 4000,
        slowDelay: 10000,
      });
    });

    it('should return correct stats in slow mode', () => {
      service.setRequestCount(250);

      const stats = service.getRequestStats();

      expect(stats).toEqual({
        requestCount: 250,
        isSlowMode: true,
        slowModeThreshold: 200,
        baseDelay: 4000,
        slowDelay: 10000,
      });
    });

    it('should reflect current request count', () => {
      service.setRequestCount(123);

      const stats = service.getRequestStats();

      expect(stats.requestCount).toBe(123);
    });
  });

  describe('resetRequestCount', () => {
    it('should reset request count to zero', () => {
      service.setRequestCount(100);

      service.resetRequestCount();

      expect(service.getRequestStats().requestCount).toBe(0);
    });

    it('should log reset operation', () => {
      service.setRequestCount(75);

      service.resetRequestCount();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Request count reset from 75 to 0',
      );
    });
  });

  describe('setRequestCount', () => {
    it('should set request count to specified value', () => {
      service.setRequestCount(42);

      expect(service.getRequestStats().requestCount).toBe(42);
    });

    it('should log set operation', () => {
      service.setRequestCount(99);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Request count manually set to 99',
      );
    });
  });

  describe('getCurrentDelayConfig', () => {
    it('should return normal mode config when below threshold', () => {
      service.setRequestCount(100);

      const config = service.getCurrentDelayConfig();

      expect(config).toEqual({
        mode: 'normal',
        baseDelay: 4000,
        randomRange: 4000,
        expectedDelay: '6000ms',
      });
    });

    it('should return slow mode config when above threshold', () => {
      service.setRequestCount(300);

      const config = service.getCurrentDelayConfig();

      expect(config).toEqual({
        mode: 'slow',
        baseDelay: 10000,
        randomRange: 5000,
        expectedDelay: '12500ms',
      });
    });

    it('should calculate correct expected delay values', () => {
      // Test normal mode calculation
      service.setRequestCount(50);
      let config = service.getCurrentDelayConfig();
      expect(config.expectedDelay).toBe('6000ms'); // 4000 + 4000/2

      // Test slow mode calculation
      service.setRequestCount(250);
      config = service.getCurrentDelayConfig();
      expect(config.expectedDelay).toBe('12500ms'); // 10000 + 5000/2
    });
  });

  describe('validateCookie', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should return valid result for successful validation', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html><body>User profile content</body></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await service.validateCookie('123456', 'valid-cookie');

      expect(result).toEqual({ isValid: true });
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://www.douban.com/people/123456/',
        }),
      );
    });

    it('should detect invalid cookie requiring login', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html><body>请登录您的账号 <a href="/login">登录</a> <a href="/register">注册</a></body></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await service.validateCookie('123456', 'invalid-cookie');

      expect(result).toEqual({
        isValid: false,
        error: 'Cookie已失效，需要重新登录',
      });
    });

    it('should detect restricted access or verification needed', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html><body>普通内容</body></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockClear();
      mockedAxios.mockImplementation(() => Promise.resolve(mockResponse));

      // Mock isHumanVerificationRequired在makeRequest时返回false，在validateCookie检查时返回true
      let callCount = 0;

      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'isHumanVerificationRequired',
        )
        .mockImplementation((_html: string) => {
          callCount++;
          // 第一次调用(在makeRequest中)返回false，第二次调用(在validateCookie中)返回true
          return callCount > 1 ? true : false;
        });

      const result = await service.validateCookie(
        '123456',
        'restricted-cookie',
      );

      expect(result).toEqual({
        isValid: false,
        error: '账号受限或需要验证',
      });
    });

    it('should handle makeRequest errors gracefully', async () => {
      const networkError = new Error('Network connection failed');
      // 重置mock以确保clean state
      mockedAxios.mockClear();

      mockedAxios.mockImplementation(() => Promise.reject(networkError));

      const result = await service.validateCookie('123456', 'error-cookie');

      expect(result).toEqual({
        isValid: false,
        error: 'Network connection failed',
      });
    });

    it('should return appropriate error messages for Error objects', async () => {
      // 测试Error对象的正常处理 - Error对象会使用其message属性
      const customError = new Error('Custom error message');
      // 重置mock以确保clean state
      mockedAxios.mockClear();
      mockedAxios.mockImplementation(() => Promise.reject(customError));

      const result = await service.validateCookie('123456', 'error-cookie');

      expect(result).toEqual({
        isValid: false,
        error: 'Custom error message',
      });
    });
  });

  describe('Domain Type Extraction (via makeRequest)', () => {
    let getHeadersForDomainSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());

      // Create spy for cookieManager method
      getHeadersForDomainSpy = jest.spyOn(
        cookieManagerService,
        'getHeadersForDomain',
      );
    });

    it('should extract book domain correctly', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid book content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await service.makeRequest(
        'https://book.douban.com/subject/123',
        'cookie',
      );

      expect(getHeadersForDomainSpy).toHaveBeenCalledWith('book', 'cookie');
    });

    it('should extract movie domain correctly', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid movie content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await service.makeRequest(
        'https://movie.douban.com/subject/456',
        'cookie',
      );

      expect(getHeadersForDomainSpy).toHaveBeenCalledWith('movie', 'cookie');
    });

    it('should extract music domain correctly', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid music content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await service.makeRequest(
        'https://music.douban.com/subject/789',
        'cookie',
      );

      expect(getHeadersForDomainSpy).toHaveBeenCalledWith('music', 'cookie');
    });

    it('should default to www domain for other URLs', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid www content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await service.makeRequest('https://www.douban.com/other', 'cookie');

      expect(getHeadersForDomainSpy).toHaveBeenCalledWith('www', 'cookie');
    });
  });

  describe('Human Verification Detection (via makeRequest)', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should detect "禁止访问" title', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html><title>禁止访问</title></html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Human verification required');
    });

    it('should detect verification-related keywords', async () => {
      const testCases = [
        '<html>Please complete the captcha</html>',
        '<html>需要完成验证码验证</html>',
        '<html>Robot check required</html>',
        '<html>请完成人机验证</html>',
        '<html>安全验证页面</html>',
      ];

      for (const html of testCases) {
        const mockResponse: AxiosResponse = {
          status: 200,
          data: html,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };
        // 重置mock并设置新的返回值
        mockedAxios.mockReset();
        mockedAxios.mockResolvedValueOnce(mockResponse);

        await expect(
          service.makeRequest('https://www.douban.com', 'cookie'),
        ).rejects.toThrow('Human verification required');
      }
    });

    it('should be case insensitive', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>CAPTCHA REQUIRED</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Human verification required');
    });
  });

  describe('Block Detection (via makeRequest)', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should detect access denied indicators', async () => {
      const testCases = [
        '<html>Access Denied page</html>', // 使用英文避免冲突
        '<html>请求频繁，请稍后再试</html>',
        '<html>Too many requests from your IP</html>',
        '<html>系统繁忙，请稍后再试</html>',
      ];

      for (const html of testCases) {
        const mockResponse: AxiosResponse = {
          status: 200,
          data: html,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };
        // 重置mock并设置新的返回值
        mockedAxios.mockClear();
        mockedAxios.mockImplementation(() => Promise.resolve(mockResponse));

        await expect(
          service.makeRequest('https://www.douban.com', 'cookie'),
        ).rejects.toThrow('Access blocked');
      }
    });

    it('should be case insensitive', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>ACCESS DENIED</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockClear();
      mockedAxios.mockImplementation(() => Promise.resolve(mockResponse));

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Access blocked');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(() => Promise.resolve());
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should handle empty response data', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await service.makeRequest(
        'https://www.douban.com',
        'cookie',
      );

      expect(result).toBe('');
    });

    it('should handle non-string response data', async () => {
      const testCases = [
        { data: null, expected: 'null' },
        { data: undefined, expected: 'undefined' },
        { data: 12345, expected: '12345' },
        { data: { key: 'value' }, expected: '[object Object]' },
        { data: [1, 2, 3], expected: '1,2,3' },
      ];

      for (const testCase of testCases) {
        const mockResponse: AxiosResponse = {
          status: 200,
          data: testCase.data,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };
        // 重置mock并设置新的返回值
        mockedAxios.mockReset();
        mockedAxios.mockResolvedValueOnce(mockResponse);

        const result = await service.makeRequest(
          'https://www.douban.com',
          'cookie',
        );

        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle malformed URLs', async () => {
      const networkError = new Error('Invalid URL');
      mockedAxios.mockRejectedValue(networkError);

      await expect(service.makeRequest('not-a-url', 'cookie')).rejects.toThrow(
        'Invalid URL',
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockedAxios.mockRejectedValue(timeoutError);

      await expect(
        service.makeRequest('https://www.douban.com', 'cookie'),
      ).rejects.toThrow('Request timeout');
    });

    it('should handle very large request counts', () => {
      service.setRequestCount(999999);

      const stats = service.getRequestStats();
      expect(stats.requestCount).toBe(999999);
      expect(stats.isSlowMode).toBe(true);

      const config = service.getCurrentDelayConfig();
      expect(config.mode).toBe('slow');
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      // Mock延迟方法以便测试快速完成，但保留requestCount增加逻辑
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(
          service as unknown as AntiSpiderServiceTestable,
          'intelligentDelay',
        )
        .mockImplementation(async () => {
          // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
          (service as unknown as AntiSpiderServiceTestable).requestCount++;
          return Promise.resolve();
        });
      jest
        // Reason: Testing private methods requires bypassing TypeScript's private access restrictions
        .spyOn(service as unknown as AntiSpiderServiceTestable, 'sleep')
        .mockImplementation(() => Promise.resolve());
    });

    it('should work correctly with real-world douban URLs', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: '<html>Valid douban content</html>',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      const realUrls = [
        'https://book.douban.com/subject/1234567/',
        'https://movie.douban.com/subject/7890123/',
        'https://music.douban.com/subject/4567890/',
        'https://www.douban.com/people/user123/',
      ];

      for (const url of realUrls) {
        // 重置mock并设置新的返回值
        mockedAxios.mockReset();
        mockedAxios.mockResolvedValueOnce(mockResponse);

        const result = await service.makeRequest(url, 'valid-cookie');

        expect(result).toBe('<html>Valid douban content</html>');
        expect(mockedAxios).toHaveBeenCalledWith(
          expect.objectContaining({ url }),
        );
      }
    });

    it('should handle request count transitions between normal and slow mode', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValue(mockResponse);

      // Start just before threshold
      service.setRequestCount(199);

      // First request - should be normal mode
      await service.makeRequest('https://www.douban.com', 'cookie');

      expect(service.getRequestStats().isSlowMode).toBe(false);

      // Second request - should trigger slow mode
      await service.makeRequest('https://www.douban.com', 'cookie');

      expect(service.getRequestStats().isSlowMode).toBe(true);
    });

    it('should maintain state consistency across multiple requests', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 'success',
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
      // 重置mock以确保clean state
      mockedAxios.mockReset();
      mockedAxios.mockResolvedValue(mockResponse);

      const initialCount = service.getRequestStats().requestCount;

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await service.makeRequest('https://www.douban.com', 'cookie');
      }

      const finalCount = service.getRequestStats().requestCount;
      expect(finalCount).toBe(initialCount + 5);
    });
  });
});
