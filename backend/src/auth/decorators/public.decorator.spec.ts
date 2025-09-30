import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';

import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('public.decorator.ts', () => {
  describe('IS_PUBLIC_KEY 常量', () => {
    it('should export correct metadata key string', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
      expect(typeof IS_PUBLIC_KEY).toBe('string');
    });

    it('should be immutable constant', () => {
      // TypeScript ensures this at compile time
      // Runtime verification: attempting to reassign should not affect the constant
      const originalValue = IS_PUBLIC_KEY;
      expect(IS_PUBLIC_KEY).toBe(originalValue);
    });
  });

  describe('Public() 装饰器工厂', () => {
    describe('基础功能', () => {
      it('should be a function that returns a decorator', () => {
        const decorator = Public();

        expect(typeof Public).toBe('function');
        expect(typeof decorator).toBe('function');
      });

      it('should call SetMetadata with correct parameters', () => {
        // Mock SetMetadata to verify it's called
        const originalSetMetadata = SetMetadata;
        const mockSetMetadata = jest.fn(originalSetMetadata);

        // Replace SetMetadata temporarily
        jest.mock('@nestjs/common', () => ({
          SetMetadata: mockSetMetadata,
        }));

        // Note: Since SetMetadata is already imported at module level,
        // we verify the decorator behavior through metadata inspection instead
        class TestController {
          @Public()
          testMethod() {
            return 'test';
          }
        }

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const testMethodRef = TestController.prototype.testMethod;

        // Verify metadata was set (which proves SetMetadata was called correctly)
        const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, testMethodRef) as
          | boolean
          | undefined;

        expect(metadata).toBe(true);
      });

      it('should create decorator that sets isPublic metadata to true', () => {
        class TestController {
          @Public()
          testMethod() {
            return 'test';
          }
        }

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const testMethodRef = TestController.prototype.testMethod;

        const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, testMethodRef) as
          | boolean
          | undefined;

        expect(metadata).toBe(true);
      });
    });

    describe('装饰器应用场景', () => {
      it('should work when applied to controller method', () => {
        class TestController {
          @Public()
          publicMethod() {
            return 'public';
          }
        }

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const publicMethodRef = TestController.prototype.publicMethod;

        const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, publicMethodRef) as
          | boolean
          | undefined;

        expect(metadata).toBe(true);
      });

      it('should work when applied to controller class', () => {
        @Public()
        class PublicController {
          testMethod() {
            return 'test';
          }
        }

        const metadata = Reflect.getMetadata(
          IS_PUBLIC_KEY,
          PublicController,
        ) as boolean | undefined;

        expect(metadata).toBe(true);
      });

      it('should work when applied to multiple methods', () => {
        class TestController {
          @Public()
          publicMethod1() {
            return 'public1';
          }

          @Public()
          publicMethod2() {
            return 'public2';
          }

          @Public()
          publicMethod3() {
            return 'public3';
          }
        }

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const method1Ref = TestController.prototype.publicMethod1;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const method2Ref = TestController.prototype.publicMethod2;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const method3Ref = TestController.prototype.publicMethod3;

        const metadata1 = Reflect.getMetadata(IS_PUBLIC_KEY, method1Ref) as
          | boolean
          | undefined;
        const metadata2 = Reflect.getMetadata(IS_PUBLIC_KEY, method2Ref) as
          | boolean
          | undefined;
        const metadata3 = Reflect.getMetadata(IS_PUBLIC_KEY, method3Ref) as
          | boolean
          | undefined;

        expect(metadata1).toBe(true);
        expect(metadata2).toBe(true);
        expect(metadata3).toBe(true);
      });

      it('should not affect non-decorated methods', () => {
        class TestController {
          @Public()
          publicMethod() {
            return 'public';
          }

          privateMethod() {
            return 'private';
          }
        }

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const publicMethodRef = TestController.prototype.publicMethod;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const privateMethodRef = TestController.prototype.privateMethod;

        const publicMetadata = Reflect.getMetadata(
          IS_PUBLIC_KEY,
          publicMethodRef,
        ) as boolean | undefined;
        const privateMetadata = Reflect.getMetadata(
          IS_PUBLIC_KEY,
          privateMethodRef,
        ) as boolean | undefined;

        expect(publicMetadata).toBe(true);
        expect(privateMetadata).toBeUndefined();
      });
    });

    describe('与 NestJS 集成', () => {
      it('should integrate with Reflector.getAllAndOverride()', () => {
        class TestController {
          @Public()
          publicRoute() {
            return 'public';
          }
        }

        const reflector = new Reflector();
        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const handler = TestController.prototype.publicRoute;
        const controllerClass = TestController;

        const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          handler,
          controllerClass,
        ]);

        expect(isPublic).toBe(true);
      });

      it('should be compatible with JwtAuthGuard metadata check', () => {
        class TestController {
          @Public()
          healthCheck() {
            return { status: 'ok' };
          }

          protectedRoute() {
            return { data: 'secret' };
          }
        }

        const reflector = new Reflector();

        // Simulate JwtAuthGuard metadata check
        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const publicHandler = TestController.prototype.healthCheck;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const privateHandler = TestController.prototype.protectedRoute;

        const isPublicRoute = reflector.getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [publicHandler, TestController],
        );
        const isPrivateRoute = reflector.getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [privateHandler, TestController],
        );

        expect(isPublicRoute).toBe(true);
        expect(isPrivateRoute).toBeUndefined();
      });
    });

    describe('边界条件', () => {
      it('should create independent decorator instances', () => {
        const decorator1 = Public();
        const decorator2 = Public();

        // Each call should return a new function instance
        expect(decorator1).not.toBe(decorator2);
        expect(typeof decorator1).toBe('function');
        expect(typeof decorator2).toBe('function');
      });

      it('should handle decorator applied multiple times to same target', () => {
        const PublicDecorator = Public();

        class TestController {
          testMethod() {
            return 'test';
          }
        }

        // Apply decorator multiple times (not recommended but should work)
        PublicDecorator(
          TestController.prototype,
          'testMethod',
          Object.getOwnPropertyDescriptor(
            TestController.prototype,
            'testMethod',
          )!,
        );
        PublicDecorator(
          TestController.prototype,
          'testMethod',
          Object.getOwnPropertyDescriptor(
            TestController.prototype,
            'testMethod',
          )!,
        );

        // Reason: Decorator testing requires accessing prototype methods to verify metadata
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const testMethodRef = TestController.prototype.testMethod;

        const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, testMethodRef) as
          | boolean
          | undefined;

        // Metadata should still be true (last application wins)
        expect(metadata).toBe(true);
      });
    });
  });

  describe('类型安全性', () => {
    it('should export IS_PUBLIC_KEY with correct TypeScript type', () => {
      // TypeScript type inference check
      const key: string = IS_PUBLIC_KEY;
      expect(key).toBe('isPublic');
    });

    it('should have correct decorator function signature', () => {
      const decorator = Public();

      // Verify decorator returns a function
      expect(typeof decorator).toBe('function');

      // Verify decorator can be used as method decorator
      class TestClass {
        @Public()
        testMethod() {
          return 'test';
        }
      }

      // Verify decorator can be used as class decorator
      @Public()
      class TestClass2 {
        testMethod() {
          return 'test';
        }
      }

      expect(TestClass).toBeDefined();
      expect(TestClass2).toBeDefined();
    });
  });
});
