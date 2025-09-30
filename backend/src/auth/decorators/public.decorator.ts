import { SetMetadata } from '@nestjs/common';

/**
 * 公开路由元数据键常量
 *
 * @description
 * 用于标识路由是否为公开访问的元数据键。
 * 此常量被 `@Public()` 装饰器和 `JwtAuthGuard` 守卫共同使用，
 * 用于判断某个路由是否需要跳过JWT认证检查。
 *
 * @constant
 * @type {string}
 * @default 'isPublic'
 *
 * @example
 * ```typescript
 * // 在 JwtAuthGuard 中使用此常量检查路由是否公开
 * const isPublic = this.reflector.getAllAndOverride<boolean>(
 *   IS_PUBLIC_KEY,
 *   [context.getHandler(), context.getClass()],
 * );
 * ```
 *
 * @see {@link Public} - 使用此常量的装饰器
 * @see JwtAuthGuard - 检查此元数据的守卫
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开路由装饰器
 *
 * @description
 * 创建一个方法或类装饰器，用于标记不需要JWT认证的公开路由。
 * 当此装饰器应用于控制器方法或整个控制器类时，JwtAuthGuard 将跳过对该路由的认证检查，
 * 允许未经认证的用户访问。常用于健康检查端点、公开API文档、注册/登录接口等场景。
 *
 * @returns {MethodDecorator & ClassDecorator} 返回一个可用于方法或类的装饰器
 *
 * @example
 * // 示例1: 标记单个控制器方法为公开路由
 * ```typescript
 * import { Controller, Get } from '@nestjs/common';
 * import { Public } from './decorators/public.decorator';
 *
 * \@Controller('health')
 * export class HealthController {
 *   \@Public()
 *   \@Get()
 *   check() {
 *     return { status: 'ok', timestamp: new Date().toISOString() };
 *   }
 * }
 * ```
 *
 * @example
 * // 示例2: 标记整个控制器为公开访问
 * ```typescript
 * import { Controller, Get, Post } from '@nestjs/common';
 * import { Public } from './decorators/public.decorator';
 *
 * \@Public()
 * \@Controller('auth')
 * export class AuthController {
 *   \@Post('register')
 *   register(\@Body() dto: RegisterDto) {
 *     // 注册逻辑 - 公开访问
 *   }
 *
 *   \@Post('login')
 *   login(\@Body() dto: LoginDto) {
 *     // 登录逻辑 - 公开访问
 *   }
 * }
 * ```
 *
 * @example
 * // 示例3: 在需要认证的控制器中标记个别公开方法
 * ```typescript
 * import { Controller, Get, Post, UseGuards } from '@nestjs/common';
 * import { JwtAuthGuard } from './guards/jwt-auth.guard';
 * import { Public } from './decorators/public.decorator';
 *
 * \@Controller('users')
 * \@UseGuards(JwtAuthGuard)
 * export class UsersController {
 *   \@Public()
 *   \@Get('stats')
 *   getPublicStats() {
 *     // 公开的用户统计信息 - 无需认证
 *     return { totalUsers: 1000, activeUsers: 500 };
 *   }
 *
 *   \@Get('profile')
 *   getProfile(\@CurrentUser() user: AuthenticatedUser) {
 *     // 获取当前用户资料 - 需要认证
 *     return user;
 *   }
 * }
 * ```
 *
 * @see {@link IS_PUBLIC_KEY} - 此装饰器使用的元数据键
 * @see JwtAuthGuard - 检查此装饰器设置的元数据的守卫
 * @see CurrentUser - 常与此装饰器搭配使用的参数装饰器
 *
 * @remarks
 * - 此装饰器通过 NestJS 的 `SetMetadata` API 设置元数据
 * - JwtAuthGuard 使用 `Reflector.getAllAndOverride()` 读取元数据
 * - 可以应用于方法级别（优先级更高）或类级别
 * - 方法级别的 `@Public()` 会覆盖类级别的认证设置
 *
 * @since 1.0.0
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
