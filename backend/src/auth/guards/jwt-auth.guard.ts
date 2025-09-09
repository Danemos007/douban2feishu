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
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 决定是否激活守卫
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
   * 处理认证失败情况
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: AuthenticatedUser | false,
    info: AuthError | undefined,
    context?: ExecutionContext,
    status?: any,
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
