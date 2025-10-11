import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * 错误信息类型定义
 */
interface AuthError {
  message?: string;
}

/**
 * 本地认证守卫 - 用于登录接口
 *
 * 功能:
 * - 验证用户名(邮箱)和密码
 * - 调用LocalStrategy进行身份验证
 * - 处理登录失败的错误情况
 * - 为登录成功后生成JWT token做准备
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  /**
   * 处理认证失败情况
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: AuthError | null,
    user: AuthenticatedUser | false,
    info: AuthError | undefined,
    _context?: ExecutionContext,
    _status?: unknown,
  ): TUser {
    console.log('[LocalAuthGuard] handleRequest called:', {
      hasError: !!err,
      hasUser: !!user,
      infoMessage: info?.message,
    });

    if (err || !user) {
      let message = 'Authentication failed';

      // 根据不同的认证失败原因提供具体错误信息
      if (info?.message === 'Missing credentials') {
        message = 'Email and password are required';
      } else if (info?.message === 'Invalid email or password') {
        message = 'Invalid email or password';
      } else if (err?.message) {
        message = err.message;
      }

      console.log('[LocalAuthGuard] Auth failed:', message);
      throw new UnauthorizedException(message);
    }

    console.log('[LocalAuthGuard] Auth success for user:', user.email);
    return user as TUser;
  }
}
