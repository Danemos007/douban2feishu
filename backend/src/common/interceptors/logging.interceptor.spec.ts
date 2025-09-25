/**
 * LoggingInterceptor 单元测试
 *
 * 测试策略:
 * - 完全Mock ExecutionContext、CallHandler、Request、Response等NestJS和Express依赖
 * - 使用jest.spyOn监控Logger的方法调用，验证日志记录行为
 * - 测试拦截器在不同场景下的日志输出和行为
 * - 覆盖成功路径、错误路径和边界条件
 * - 验证敏感路径过滤和时间计算逻辑
 *
 * @author Claude
 * @date 2025-09-25
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from './logging.interceptor';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';

/**
 * HTTP错误接口定义，用于测试错误处理场景
 *
 * @description 扩展标准Error接口，添加HTTP状态码支持
 * @interface MockHttpError
 * @extends {Error}
 */
interface MockHttpError extends Error {
  /** HTTP状态码，用于错误响应识别 */
  status?: number;
}

/**
 * HTTP上下文Mock接口定义
 *
 * @description 用于模拟NestJS的HttpArgumentsHost接口行为
 * @interface MockHttpContext
 */
interface MockHttpContext {
  /** 模拟getRequest方法，返回带有用户信息的Request对象 */
  getRequest: jest.MockedFunction<
    () => Partial<Request & { user?: AuthenticatedUser }>
  >;
  /** 模拟getResponse方法，返回Response对象 */
  getResponse: jest.MockedFunction<() => Partial<Response>>;
}

describe('LoggingInterceptor - HTTP Request/Response Logging Test Suite', () => {
  let interceptor: LoggingInterceptor;
  let module: TestingModule;

  // Mock objects with minimal required interface
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: Partial<Request & { user?: AuthenticatedUser }>;
  let mockResponse: Partial<Response>;
  let mockHttpContext: MockHttpContext;

  // Logger spy
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  /**
   * 测试用认证用户数据
   *
   * @description 标准的已认证用户对象，用于测试用户信息提取和日志记录
   * @constant mockUser
   */
  const mockUser: AuthenticatedUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    lastSyncAt: new Date('2023-12-01T00:00:00Z'),
  };

  /**
   * 基础Request对象模板
   *
   * @description 提供标准的HTTP请求属性，可被各测试用例扩展使用
   * @constant mockRequestBase
   */
  const mockRequestBase = {
    method: 'GET',
    url: '/api/test',
    ip: '192.168.1.1',
    get: jest.fn(),
  };

  /**
   * 基础Response对象模板
   *
   * @description 提供标准的HTTP响应属性
   * @constant mockResponseBase
   */
  const mockResponseBase = {
    statusCode: 200,
  };

  /**
   * 测试环境初始化设置
   *
   * @description 在每个测试用例执行前设置Mock对象和间谍函数
   * @returns {Promise<void>} 异步初始化完成
   */
  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    // Setup Logger spies
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Setup mock request and response
    mockRequest = {
      ...mockRequestBase,
      user: undefined,
    };

    mockResponse = {
      ...mockResponseBase,
    };

    // Setup mock HTTP context
    mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    // Reason: NestJS ExecutionContext requires complex interface mock for testing
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as unknown as jest.Mocked<ExecutionContext>;

    // Reason: RxJS CallHandler requires minimal interface mock for testing
    mockCallHandler = {
      handle: jest.fn(),
    } as unknown as jest.Mocked<CallHandler>;

    // Setup default user-agent
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 Test Browser';
      }
      return undefined;
    });
  });

  /**
   * 测试环境清理
   *
   * @description 在每个测试用例执行后清理Mock状态和关闭测试模块
   * @returns {Promise<void>} 异步清理完成
   */
  afterEach(async () => {
    jest.clearAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('Constructor and Initialization', () => {
    /**
     * 验证拦截器正确初始化
     *
     * @description 测试LoggingInterceptor是否正确创建并初始化Logger实例
     */
    it('should be defined and create logger instance', () => {
      expect(interceptor).toBeDefined();
      expect(interceptor['logger']).toBeDefined();
      expect(interceptor['logger']).toBeInstanceOf(Logger);
    });
  });

  describe('intercept() - Main Interceptor Logic', () => {
    describe('Normal Request Logging (Non-sensitive Paths)', () => {
      /**
       * 验证非敏感路径的请求开始日志记录
       *
       * @description 测试拦截器是否为普通API路径正确记录请求开始信息，包括方法、URL、IP、用户代理和用户ID
       */
      it('should log request start for non-sensitive paths', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/books';
        mockRequest.user = mockUser;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert - Subscribe to trigger the interceptor
        result$.subscribe();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'GET /api/books - 192.168.1.1 - Mozilla/5.0 Test Browser - User: test-user-123 - START',
          ),
        );
      });

      /**
       * 验证成功请求完成时的日志记录和时间计算
       *
       * @description 测试拦截器是否正确记录成功请求的完成信息，包括状态码、处理时间和用户信息
       * @param {Function} done Jest异步测试完成回调
       */
      it('should log successful request completion with correct timing', (done) => {
        // Arrange
        const startTime = Date.now();
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(startTime + 150); // 150ms processing time

        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/books';
        mockRequest.user = mockUser;
        mockResponse.statusCode = 200;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          complete: () => {
            expect(loggerLogSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'GET /api/books - 200 - 150ms - User: test-user-123 - SUCCESS',
              ),
            );
            done();
          },
        });
      });

      /**
       * 验证错误请求的日志记录和时间计算
       *
       * @description 测试拦截器是否正确记录失败请求的错误信息，包括错误状态码、处理时间和错误消息
       * @param {Function} done Jest异步测试完成回调
       */
      it('should log error requests with error message and timing', (done) => {
        // Arrange
        const startTime = Date.now();
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(startTime + 250); // 250ms processing time

        const testError: MockHttpError = new Error('Test error message');
        testError.status = 400;

        mockCallHandler.handle.mockReturnValue(throwError(testError));
        mockRequest.url = '/api/books';
        mockRequest.user = mockUser;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          error: () => {
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              'GET /api/books - 400 - 250ms - User: test-user-123 - ERROR: Test error message',
            );
            done();
          },
        });
      });

      /**
       * 验证已认证请求的用户信息提取和记录
       *
       * @description 测试拦截器是否能正确从请求中提取已认证用户信息并记录到日志中
       */
      it('should extract and log user information from authenticated requests', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/sync';
        mockRequest.user = mockUser;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('User: test-user-123'),
        );
      });

      /**
       * 验证未认证请求的匿名用户处理
       *
       * @description 测试拦截器是否能正确处理未认证请求，将用户标识记录为"anonymous"
       */
      it('should log anonymous user for unauthenticated requests', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/public';
        mockRequest.user = undefined;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('User: anonymous'),
        );
      });
    });

    describe('Sensitive Path Filtering', () => {
      /**
       * 验证敏感路径的日志过滤功能
       *
       * @description 测试拦截器是否正确识别敏感路径并跳过详细日志记录，保护敏感信息不被记录
       */
      it('should not log request details for sensitive paths', () => {
        // Test all sensitive paths
        const sensitivePaths = [
          '/auth/login',
          '/auth/register',
          '/config/douban',
          '/config/feishu',
        ];

        sensitivePaths.forEach((path) => {
          // Arrange
          jest.clearAllMocks();
          mockCallHandler.handle.mockReturnValue(of('success'));
          mockRequest.url = path;
          mockRequest.user = mockUser;

          // Act
          const result$ = interceptor.intercept(
            mockExecutionContext,
            mockCallHandler,
          );

          // Assert
          result$.subscribe();

          // Should not log START message for sensitive paths
          expect(loggerLogSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('START'),
          );

          // Should not log SUCCESS message for sensitive paths
          expect(loggerLogSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('SUCCESS'),
          );
        });
      });

      /**
       * 验证敏感路径的错误日志仍然被记录
       *
       * @description 测试即使对于敏感路径，错误信息仍然需要被记录以便排查问题
       * @param {Function} done Jest异步测试完成回调
       */
      it('should still log errors for sensitive paths', (done) => {
        // Arrange
        const startTime = Date.now();
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(startTime + 100);

        const testError: MockHttpError = new Error('Authentication failed');
        testError.status = 401;

        mockCallHandler.handle.mockReturnValue(throwError(testError));
        mockRequest.url = '/auth/login';
        mockRequest.user = undefined;

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          error: () => {
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              'GET /auth/login - 401 - 100ms - User: anonymous - ERROR: Authentication failed',
            );
            done();
          },
        });
      });
    });

    describe('Request Information Extraction', () => {
      /**
       * 验证请求信息的正确提取
       *
       * @description 测试拦截器是否能正确提取和记录HTTP方法、URL、IP地址和用户代理字符串
       */
      it('should correctly extract method, url, ip and user-agent', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));

        // Create a new mock request with different properties
        const customMockRequest = {
          ...mockRequestBase,
          method: 'POST',
          url: '/api/sync/trigger',
          ip: '10.0.0.1',
          get: jest.fn().mockReturnValue('Custom User Agent v1.0'),
        };
        mockHttpContext.getRequest.mockReturnValue(customMockRequest);

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'POST /api/sync/trigger - 10.0.0.1 - Custom User Agent v1.0',
          ),
        );
      });

      /**
       * 验证缺失用户代理头的优雅处理
       *
       * @description 测试拦截器是否能优雅处理缺失的user-agent头部，不会导致错误
       */
      it('should handle missing user-agent header gracefully', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/test';
        (mockRequest.get as jest.Mock).mockReturnValue(undefined);

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'GET /api/test - 192.168.1.1 -  - User: anonymous',
          ),
        );
      });
    });

    describe('Timing Calculation', () => {
      /**
       * 验证请求处理时间的精确计算和记录
       *
       * @description 测试拦截器是否能正确计算请求处理时间并在日志中准确记录
       * @param {Function} done Jest异步测试完成回调
       */
      it('should calculate and log accurate request processing time', (done) => {
        // Arrange
        const startTime = 1000000000;
        const endTime = 1000000750; // 750ms later
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(endTime);

        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/api/performance-test';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          complete: () => {
            expect(loggerLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('750ms'),
            );
            done();
          },
        });
      });
    });

    describe('Error Handling', () => {
      /**
       * 验证带状态码的HTTP错误处理
       *
       * @description 测试拦截器是否能正确处理包含HTTP状态码的错误对象，并在日志中记录状态码和错误消息
       * @param {Function} done Jest异步测试完成回调
       */
      it('should handle HttpError with status code', (done) => {
        // Arrange
        const httpError: MockHttpError = new Error('Forbidden access');
        httpError.status = 403;

        mockCallHandler.handle.mockReturnValue(throwError(httpError));
        mockRequest.url = '/api/protected';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          error: () => {
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('403'),
            );
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('Forbidden access'),
            );
            done();
          },
        });
      });

      /**
       * 验证通用错误的处理和默认状态码
       *
       * @description 测试拦截器是否能正确处理不包含status属性的通用错误，并默认使用500状态码
       * @param {Function} done Jest异步测试完成回调
       */
      it('should handle generic errors without status code', (done) => {
        // Arrange
        const genericError = new Error('Generic server error');
        // No status property set - should default to 500

        mockCallHandler.handle.mockReturnValue(throwError(genericError));
        mockRequest.url = '/api/error-test';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          error: () => {
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('500'), // Should default to 500
            );
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('Generic server error'),
            );
            done();
          },
        });
      });
    });

    describe('isSensitivePath() - Behavior Testing via Public Interface', () => {
      /**
       * 验证/auth/login路径被识别为敏感路径
       *
       * @description 通过观察拦截器行为间接测试isSensitivePath私有方法，确认登录路径被正确识别
       */
      it('should identify /auth/login as sensitive path', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/auth/login';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert - Sensitive paths should not log START/SUCCESS
        result$.subscribe();
        expect(loggerLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('START'),
        );
      });

      /**
       * 验证/auth/register路径被识别为敏感路径
       *
       * @description 通过观察拦截器行为间接测试isSensitivePath私有方法，确认注册路径被正确识别
       */
      it('should identify /auth/register as sensitive path', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/auth/register';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();
        expect(loggerLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('START'),
        );
      });

      /**
       * 验证/config/douban路径被识别为敏感路径
       *
       * @description 通过观察拦截器行为间接测试isSensitivePath私有方法，确认豆瓣配置路径被正确识别
       */
      it('should identify /config/douban as sensitive path', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/config/douban';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();
        expect(loggerLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('START'),
        );
      });

      /**
       * 验证/config/feishu路径被识别为敏感路径
       *
       * @description 通过观察拦截器行为间接测试isSensitivePath私有方法，确认飞书配置路径被正确识别
       */
      it('should identify /config/feishu as sensitive path', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));
        mockRequest.url = '/config/feishu';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe();
        expect(loggerLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('START'),
        );
      });

      /**
       * 验证非敏感路径的正确识别
       *
       * @description 测试拦截器是否能正确识别非敏感的API路径，并为这些路径记录详细日志
       */
      it('should return false for non-sensitive paths', () => {
        // Arrange
        const nonSensitivePaths = [
          '/api/sync',
          '/api/books',
          '/health',
          '/api/status',
        ];

        nonSensitivePaths.forEach((path) => {
          // Arrange
          jest.clearAllMocks();
          mockCallHandler.handle.mockReturnValue(of('success'));
          mockRequest.url = path;

          // Act
          const result$ = interceptor.intercept(
            mockExecutionContext,
            mockCallHandler,
          );

          // Assert - Non-sensitive paths should log START
          result$.subscribe();
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('START'),
          );
        });
      });

      /**
       * 验证带查询参数和锚点的敏感路径识别
       *
       * @description 测试拦截器是否能正确处理包含查询参数、重定向参数或锚点的敏感路径URL
       */
      it('should handle URL parameters and query strings correctly', () => {
        // Test that sensitive path detection works with query parameters
        const pathsWithParams = [
          '/auth/login?redirect=/dashboard',
          '/config/douban?test=1',
          '/config/feishu#section1',
        ];

        pathsWithParams.forEach((path) => {
          // Arrange
          jest.clearAllMocks();
          mockCallHandler.handle.mockReturnValue(of('success'));
          mockRequest.url = path;

          // Act
          const result$ = interceptor.intercept(
            mockExecutionContext,
            mockCallHandler,
          );

          // Assert - Should still be considered sensitive
          result$.subscribe();
          expect(loggerLogSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('START'),
          );
        });
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      /**
       * 验证请求属性缺失时的优雅处理
       *
       * @description 测试拦截器是否能优雅处理请求对象中缺失或为空的属性，确保不会抛出运行时错误
       */
      it('should handle undefined request properties gracefully', () => {
        // Arrange
        mockCallHandler.handle.mockReturnValue(of('success'));

        // Create mock request with minimal properties (empty strings instead of undefined)
        const undefinedMockRequest = {
          method: '',
          url: '',
          ip: '',
          get: jest.fn().mockReturnValue(''),
        };
        mockHttpContext.getRequest.mockReturnValue(undefinedMockRequest);

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert - Should not throw errors
        expect(() => {
          result$.subscribe();
        }).not.toThrow();
      });

      /**
       * 验证RxJS Observable错误的正确处理
       *
       * @description 测试拦截器是否能正确处理RxJS流中的错误，确保错误能够正确传播并被记录
       * @param {Function} done Jest异步测试完成回调
       */
      it('should handle RxJS observable error correctly', (done) => {
        // Arrange
        const rxjsError = new Error('RxJS pipeline error');
        mockCallHandler.handle.mockReturnValue(throwError(rxjsError));
        mockRequest.url = '/api/rxjs-test';

        // Act
        const result$ = interceptor.intercept(
          mockExecutionContext,
          mockCallHandler,
        );

        // Assert
        result$.subscribe({
          error: (error) => {
            expect(error).toBe(rxjsError);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('ERROR: RxJS pipeline error'),
            );
            done();
          },
        });
      });

      /**
       * 验证不同HTTP方法的支持
       *
       * @description 测试拦截器是否能正确处理和记录所有常见的HTTP方法（GET、POST、PUT、DELETE、PATCH）
       */
      it('should work with different HTTP methods (GET, POST, PUT, DELETE)', () => {
        const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

        httpMethods.forEach((method) => {
          // Arrange
          jest.clearAllMocks();
          mockCallHandler.handle.mockReturnValue(of('success'));

          // Create mock request with specific method
          const methodMockRequest = {
            ...mockRequestBase,
            method: method,
            url: '/api/test',
          };
          mockHttpContext.getRequest.mockReturnValue(methodMockRequest);

          // Act
          const result$ = interceptor.intercept(
            mockExecutionContext,
            mockCallHandler,
          );

          // Assert
          result$.subscribe();
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining(`${method} /api/test`),
          );
        });
      });
    });
  });
});
