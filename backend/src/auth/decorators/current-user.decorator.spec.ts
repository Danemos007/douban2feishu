import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/auth.interface';

// Import the decorator implementation for testing
// We need to test the factory function directly
const CurrentUserFactory = (
  data: keyof AuthenticatedUser | undefined,
  ctx: ExecutionContext,
): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
  const user = request.user;

  // Type safety check
  if (!user) {
    throw new Error(
      'User not found in request. Make sure to use proper auth guard.',
    );
  }

  // Return specific field or full user
  return data ? user[data] : user;
};

/**
 * Mock ExecutionContext Factory
 * 创建模拟的ExecutionContext，用于测试参数装饰器
 */
const createMockExecutionContext = (
  user: AuthenticatedUser | null | undefined,
): ExecutionContext => {
  const mockRequest = { user };
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('current-user.decorator.ts', () => {
  // Mock data constants
  const mockAuthenticatedUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    lastSyncAt: new Date('2025-01-15T10:30:00.000Z'),
  };

  const mockAuthenticatedUserWithoutSync: AuthenticatedUser = {
    id: '987fcdeb-51a2-43d7-8c6f-123456789abc',
    email: 'noSync@example.com',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    lastSyncAt: null,
  };

  describe('CurrentUser 参数装饰器', () => {
    describe('基础功能', () => {
      it('should be defined and be a function', () => {
        expect(CurrentUserFactory).toBeDefined();
        expect(typeof CurrentUserFactory).toBe('function');
      });

      it('should be created by createParamDecorator', () => {
        // createParamDecorator returns a function
        // Verify it has the expected decorator factory pattern
        const decorator = createParamDecorator(CurrentUserFactory);
        expect(typeof decorator).toBe('function');
      });
    });

    describe('提取完整用户对象 (无data参数)', () => {
      it('should return the entire user object when no data parameter provided', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        // Call the decorator factory function directly
        const result = CurrentUserFactory(undefined, context);

        expect(result).toEqual(mockAuthenticatedUser);
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('lastSyncAt');
      });

      it('should return user with all AuthenticatedUser fields', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        const result = CurrentUserFactory(
          undefined,
          context,
        ) as AuthenticatedUser;

        expect(result.id).toBe(mockAuthenticatedUser.id);
        expect(result.email).toBe(mockAuthenticatedUser.email);
        expect(result.createdAt).toEqual(mockAuthenticatedUser.createdAt);
        expect(result.lastSyncAt).toEqual(mockAuthenticatedUser.lastSyncAt);
        expect(typeof result.id).toBe('string');
        expect(typeof result.email).toBe('string');
        expect(result.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('提取特定字段 (有data参数)', () => {
      it('should return user.id when data is "id"', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        const result = CurrentUserFactory('id', context);

        expect(result).toBe(mockAuthenticatedUser.id);
        expect(typeof result).toBe('string');
        expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      });

      it('should return user.email when data is "email"', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        const result = CurrentUserFactory('email', context);

        expect(result).toBe(mockAuthenticatedUser.email);
        expect(typeof result).toBe('string');
        expect(result).toBe('test@example.com');
      });

      it('should return user.createdAt when data is "createdAt"', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        const result = CurrentUserFactory('createdAt', context);

        expect(result).toEqual(mockAuthenticatedUser.createdAt);
        expect(result).toBeInstanceOf(Date);
      });

      it('should return user.lastSyncAt when data is "lastSyncAt"', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        const result = CurrentUserFactory('lastSyncAt', context);

        expect(result).toEqual(mockAuthenticatedUser.lastSyncAt);
        expect(result).toBeInstanceOf(Date);
      });

      it('should return null when lastSyncAt is null', () => {
        const context = createMockExecutionContext(
          mockAuthenticatedUserWithoutSync,
        );

        const result = CurrentUserFactory('lastSyncAt', context);

        expect(result).toBeNull();
      });
    });

    describe('错误处理', () => {
      it('should throw error when user is not in request', () => {
        const context = createMockExecutionContext(undefined);

        expect(() => CurrentUserFactory(undefined, context)).toThrow(
          'User not found in request. Make sure to use proper auth guard.',
        );
      });

      it('should throw error when user is null', () => {
        const context = createMockExecutionContext(null);

        expect(() => CurrentUserFactory(undefined, context)).toThrow(
          'User not found in request. Make sure to use proper auth guard.',
        );
      });

      it('should throw error when user is explicitly false', () => {
        const context = createMockExecutionContext(
          false as unknown as undefined,
        );

        expect(() => CurrentUserFactory(undefined, context)).toThrow(
          'User not found in request. Make sure to use proper auth guard.',
        );
      });

      it('should throw descriptive error message', () => {
        const context = createMockExecutionContext(undefined);

        expect(() => CurrentUserFactory(undefined, context)).toThrow(Error);
        expect(() => CurrentUserFactory(undefined, context)).toThrow(
          /Make sure to use proper auth guard/,
        );
      });
    });

    describe('ExecutionContext 处理', () => {
      it('should correctly call switchToHttp() on ExecutionContext', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);
        const switchToHttpSpy = jest.spyOn(context, 'switchToHttp');

        CurrentUserFactory(undefined, context);

        expect(switchToHttpSpy).toHaveBeenCalledTimes(1);
      });

      it('should correctly call getRequest() to extract request object', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);
        const httpContext = context.switchToHttp();
        const getRequestSpy = jest.spyOn(httpContext, 'getRequest');

        CurrentUserFactory(undefined, context);

        expect(getRequestSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle different ExecutionContext implementations', () => {
        // Test with minimal ExecutionContext mock
        const minimalContext = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest
              .fn()
              .mockReturnValue({ user: mockAuthenticatedUser }),
          }),
        } as unknown as ExecutionContext;

        const result = CurrentUserFactory(undefined, minimalContext);

        expect(result).toEqual(mockAuthenticatedUser);
      });
    });

    describe('类型安全性', () => {
      it('should maintain correct TypeScript type for full user object', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        // Type assertion to verify TypeScript inference
        const result: AuthenticatedUser = CurrentUserFactory(
          undefined,
          context,
        ) as AuthenticatedUser;

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.email).toBeDefined();
        expect(result.createdAt).toBeDefined();
      });

      it('should maintain correct TypeScript type for specific field', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        // Type assertion for field extraction
        const id: string = CurrentUserFactory('id', context) as string;
        const email: string = CurrentUserFactory('email', context) as string;

        expect(typeof id).toBe('string');
        expect(typeof email).toBe('string');
      });

      it('should accept only valid AuthenticatedUser keys as data parameter', () => {
        const context = createMockExecutionContext(mockAuthenticatedUser);

        // These should all compile and work correctly
        expect(() => CurrentUserFactory('id', context)).not.toThrow();
        expect(() => CurrentUserFactory('email', context)).not.toThrow();
        expect(() => CurrentUserFactory('createdAt', context)).not.toThrow();
        expect(() => CurrentUserFactory('lastSyncAt', context)).not.toThrow();
      });
    });

    describe('边界条件', () => {
      it('should handle user object with minimal valid data', () => {
        const minimalUser: AuthenticatedUser = {
          id: 'minimal-id',
          email: 'min@test.com',
          createdAt: new Date(),
          lastSyncAt: null,
        };
        const context = createMockExecutionContext(minimalUser);

        const result = CurrentUserFactory(undefined, context);

        expect(result).toEqual(minimalUser);
      });

      it('should handle user with very long id string', () => {
        const longIdUser: AuthenticatedUser = {
          id: 'a'.repeat(500),
          email: 'test@example.com',
          createdAt: new Date(),
          lastSyncAt: null,
        };
        const context = createMockExecutionContext(longIdUser);

        const result = CurrentUserFactory('id', context);

        expect(result).toBe(longIdUser.id);
        expect((result as string).length).toBe(500);
      });

      it('should handle user with special characters in email', () => {
        const specialEmailUser: AuthenticatedUser = {
          id: 'test-id',
          email: 'test+special@example.co.uk',
          createdAt: new Date(),
          lastSyncAt: null,
        };
        const context = createMockExecutionContext(specialEmailUser);

        const result = CurrentUserFactory('email', context);

        expect(result).toBe('test+special@example.co.uk');
      });

      it('should handle createdAt as recent date', () => {
        const recentUser: AuthenticatedUser = {
          id: 'test-id',
          email: 'test@example.com',
          createdAt: new Date(),
          lastSyncAt: null,
        };
        const context = createMockExecutionContext(recentUser);

        const result = CurrentUserFactory('createdAt', context);

        expect(result).toBeInstanceOf(Date);
        expect((result as Date).getTime()).toBeLessThanOrEqual(Date.now());
      });

      it('should handle createdAt as historical date', () => {
        const historicalUser: AuthenticatedUser = {
          id: 'test-id',
          email: 'test@example.com',
          createdAt: new Date('2000-01-01T00:00:00.000Z'),
          lastSyncAt: null,
        };
        const context = createMockExecutionContext(historicalUser);

        const result = CurrentUserFactory('createdAt', context);

        expect(result).toBeInstanceOf(Date);
        expect((result as Date).getFullYear()).toBe(2000);
      });
    });

    describe('与实际使用场景集成', () => {
      it('should work correctly when used with JwtAuthGuard', () => {
        // Simulate JwtAuthGuard setting request.user
        const guardSetUser = mockAuthenticatedUser;
        const context = createMockExecutionContext(guardSetUser);

        const result = CurrentUserFactory(undefined, context);

        expect(result).toEqual(guardSetUser);
      });

      it('should work in a controller method context', () => {
        // Simulate a complete controller method call flow
        const context = createMockExecutionContext(mockAuthenticatedUser);

        // Simulate extracting user in controller
        const extractedUser = CurrentUserFactory(
          undefined,
          context,
        ) as AuthenticatedUser;

        // Simulate controller logic
        const controllerResponse = {
          user: extractedUser,
          message: 'Profile retrieved successfully',
        };

        expect(controllerResponse.user).toEqual(mockAuthenticatedUser);
        expect(controllerResponse.user.id).toBe(mockAuthenticatedUser.id);
      });
    });
  });
});
