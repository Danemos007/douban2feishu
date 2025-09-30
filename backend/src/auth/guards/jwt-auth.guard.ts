import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * 错误信息类型定义
 */
interface AuthError {
  name?: string;
  message?: string;
}

/**
 * JWT认证守卫 - 保护需要认证的路由
 *
 * 功能:
 * - 验证JWT token的有效性
 * - 支持@Public()装饰器跳过认证
 * - 自动处理token过期和无效情况
 * - 将用户信息附加到请求对象
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * JWT认证守卫构造函数
   *
   * @description 初始化JWT认证守卫，注入Reflector用于检查路由元数据
   * @param reflector NestJS反射器服务，用于读取路由和控制器上的装饰器元数据
   */
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 决定是否激活守卫 - 核心认证逻辑入口
   *
   * @description 检查路由是否标记为公开访问，如果不是则执行JWT token验证
   * @param context NestJS执行上下文，包含请求处理器和控制器类的元数据信息
   * @returns 布尔值或Promise<boolean>，true表示允许访问，false表示拒绝访问
   * @throws 可能抛出JWT验证过程中的各种异常（通过父类AuthGuard处理）
   */
  override canActivate(context: ExecutionContext) {
    // 检查是否标记为公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 执行JWT验证
    return super.canActivate(context);
  }

  /**
   * 处理JWT认证结果 - 统一异常处理和用户信息返回
   *
   * @description 根据JWT验证结果决定是否抛出认证异常，支持特定错误类型的精确错误消息
   * @param err JWT验证过程中的错误对象，null表示无错误
   * @param user JWT验证成功时的用户信息，false表示验证失败
   * @param info JWT库返回的额外错误信息，包含错误类型和消息
   * @param _context NestJS执行上下文（当前实现中未使用）
   * @param _status 认证状态信息（当前实现中未使用）
   * @returns 类型化的用户信息对象
   * @throws {UnauthorizedException} 当认证失败时抛出，包含具体的失败原因：
   *   - "Token has expired" - JWT token已过期
   *   - "Invalid token" - JWT token格式无效或签名错误
   *   - 自定义错误消息 - 来自info.message
   *   - "Authentication failed" - 默认认证失败消息
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: AuthenticatedUser | false,
    info: AuthError | undefined,
    _context?: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || !user) {
      let message = 'Authentication failed';

      if (info?.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (info?.name === 'JsonWebTokenError') {
        message = 'Invalid token';
      } else if (info?.message) {
        message = info.message;
      }

      throw new UnauthorizedException(message);
    }

    return user as TUser;
  }
}
