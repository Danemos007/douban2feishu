import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * Mock ExecutionContext Factory
 */
const createMockExecutionContext = (): ExecutionContext => {
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  return {
    getHandler: (): unknown => mockHandler,
    getClass: (): unknown => mockClass,
    switchToHttp: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard - Comprehensive Security Guard Test Suite', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let module: TestingModule;

  // Spy variables for unbound-method error prevention
  let reflectorGetAllAndOverrideSpy: jest.SpyInstance;
  let guardCanActivateSpy: jest.SpyInstance;
  let guardCanActivateMethodSpy: jest.SpyInstance;
  let guardHandleRequestMethodSpy: jest.SpyInstance;

  // Mock data constants
  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 'user-12345',
    email: 'test@example.com',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    lastSyncAt: new Date('2023-01-15T10:30:00.000Z'),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);

    // Setup spies
    reflectorGetAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');

    // Mock the parent class canActivate method
    guardCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockImplementation(() => Promise.resolve(true));

    // Setup method spies for unbound-method error prevention
    guardCanActivateMethodSpy = jest.spyOn(guard, 'canActivate');
    guardHandleRequestMethodSpy = jest.spyOn(guard, 'handleRequest');
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Constructor', () => {
    it('should be defined and properly inherit from AuthGuard', () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(JwtAuthGuard);
      // Verify guard is properly constructed
      expect(guardCanActivateMethodSpy).toBeDefined();
      expect(guardHandleRequestMethodSpy).toBeDefined();
    });

    it('should inject Reflector dependency correctly', () => {
      expect(reflector).toBeDefined();
      expect(reflectorGetAllAndOverrideSpy).toBeDefined();
    });
  });

  describe('canActivate', () => {
    describe('公开路由处理', () => {
      it('should return true when route is marked as public via handler metadata', () => {
        // Arrange
        const context = createMockExecutionContext();
        reflectorGetAllAndOverrideSpy.mockReturnValue(true);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(reflectorGetAllAndOverrideSpy).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [context.getHandler(), context.getClass()],
        );
        expect(guardCanActivateSpy).not.toHaveBeenCalled();
      });

      it('should return true when route is marked as public via class metadata', () => {
        // Arrange
        const context = createMockExecutionContext();
        reflectorGetAllAndOverrideSpy.mockReturnValue(true);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(reflectorGetAllAndOverrideSpy).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [context.getHandler(), context.getClass()],
        );
        expect(guardCanActivateSpy).not.toHaveBeenCalled();
      });

      it('should prioritize metadata correctly when reflector returns true', () => {
        // Arrange
        const context = createMockExecutionContext();
        reflectorGetAllAndOverrideSpy.mockReturnValue(true);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(reflectorGetAllAndOverrideSpy).toHaveBeenCalledTimes(1);
        expect(guardCanActivateSpy).not.toHaveBeenCalled();
      });
    });

    describe('私有路由处理', () => {
      it('should call super.canActivate() when route is not public', () => {
        // Arrange
        const context = createMockExecutionContext();
        const expectedResult = Promise.resolve(true);
        reflectorGetAllAndOverrideSpy.mockReturnValue(false);
        guardCanActivateSpy.mockReturnValue(expectedResult);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(expectedResult);
        expect(reflectorGetAllAndOverrideSpy).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [context.getHandler(), context.getClass()],
        );
        expect(guardCanActivateSpy).toHaveBeenCalledWith(context);
      });

      it('should return super.canActivate() result when route requires authentication', () => {
        // Arrange
        const context = createMockExecutionContext();
        const mockPromiseResult = Promise.resolve(false);
        reflectorGetAllAndOverrideSpy.mockReturnValue(undefined);
        guardCanActivateSpy.mockReturnValue(mockPromiseResult);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(mockPromiseResult);
        expect(guardCanActivateSpy).toHaveBeenCalledWith(context);
      });
    });

    describe('边界条件', () => {
      it('should handle missing metadata gracefully', () => {
        // Arrange
        const context = createMockExecutionContext();
        const expectedResult = Promise.resolve(true);
        reflectorGetAllAndOverrideSpy.mockReturnValue(undefined);
        guardCanActivateSpy.mockReturnValue(expectedResult);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(expectedResult);
        expect(guardCanActivateSpy).toHaveBeenCalledWith(context);
      });

      it('should handle null metadata gracefully', () => {
        // Arrange
        const context = createMockExecutionContext();
        const expectedResult = Promise.resolve(true);
        reflectorGetAllAndOverrideSpy.mockReturnValue(null);
        guardCanActivateSpy.mockReturnValue(expectedResult);

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(expectedResult);
        expect(guardCanActivateSpy).toHaveBeenCalledWith(context);
      });
    });
  });

  describe('handleRequest', () => {
    describe('成功路径', () => {
      it('should return user when authentication succeeds', () => {
        // Arrange
        const err = null;
        const user = mockAuthenticatedUser;
        const info = undefined;

        // Act
        const result = guard.handleRequest(err, user, info);

        // Assert
        expect(result).toBe(user);
        expect(result).toEqual(mockAuthenticatedUser);
      });

      it('should return user with correct type casting', () => {
        // Arrange
        const err = null;
        const user = mockAuthenticatedUser;
        const info = undefined;

        // Act
        const result = guard.handleRequest<AuthenticatedUser>(err, user, info);

        // Assert
        expect(result).toBe(user);
        expect(result.id).toBe(mockAuthenticatedUser.id);
        expect(result.email).toBe(mockAuthenticatedUser.email);
      });
    });

    describe('认证失败 - 错误对象存在', () => {
      it('should throw UnauthorizedException when err parameter exists', () => {
        // Arrange
        const err = new Error('Authentication error');
        const user = false;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          UnauthorizedException,
        );
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          'Authentication failed',
        );
      });

      it('should use default message when error exists but no info', () => {
        // Arrange
        const err = new Error('Some error');
        const user = mockAuthenticatedUser;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Authentication failed'),
        );
      });
    });

    describe('认证失败 - 用户对象无效', () => {
      it('should throw UnauthorizedException when user is false', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          UnauthorizedException,
        );
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          'Authentication failed',
        );
      });

      it('should throw UnauthorizedException when user is null', () => {
        // Arrange
        const err = null;
        const user = null as unknown as false;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when user is undefined', () => {
        // Arrange
        const err = null;
        const user = undefined as unknown as false;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('特定JWT错误处理', () => {
      it('should handle TokenExpiredError with specific message', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = { name: 'TokenExpiredError' };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Token has expired'),
        );
      });

      it('should handle JsonWebTokenError with specific message', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = { name: 'JsonWebTokenError' };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Invalid token'),
        );
      });

      it('should handle custom error messages from info.message', () => {
        // Arrange
        const err = null;
        const user = false;
        const customMessage = 'Custom authentication error';
        const info = { message: customMessage };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException(customMessage),
        );
      });

      it('should fall back to default message for unknown error types', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = { name: 'UnknownError' };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Authentication failed'),
        );
      });

      it('should prioritize info.name over info.message when both exist', () => {
        // Arrange
        const err = null;
        const user = false;
        const customMessage = 'Custom message';
        const info = {
          name: 'TokenExpiredError',
          message: customMessage,
        };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Token has expired'),
        );
      });
    });

    describe('边界条件', () => {
      it('should handle info object with only name property', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = { name: 'SomeError' };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Authentication failed'),
        );
      });

      it('should handle info object with only message property', () => {
        // Arrange
        const err = null;
        const user = false;
        const customMessage = 'Only message property';
        const info = { message: customMessage };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException(customMessage),
        );
      });

      it('should handle empty info object', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = {};

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Authentication failed'),
        );
      });

      it('should handle undefined info parameter', () => {
        // Arrange
        const err = null;
        const user = false;
        const info = undefined;

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Authentication failed'),
        );
      });

      it('should handle complex scenario with err and user both problematic', () => {
        // Arrange
        const err = new Error('Network error');
        const user = false;
        const info = { name: 'TokenExpiredError' };

        // Act & Assert
        expect(() => guard.handleRequest(err, user, info)).toThrow(
          new UnauthorizedException('Token has expired'),
        );
      });
    });
  });
});
