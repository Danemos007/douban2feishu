import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * @CurrentUser() 参数装饰器 - 获取当前认证用户
 *
 * 使用示例:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return { user };
 * }
 * ```
 *
 * 功能:
 * - 从请求对象中提取用户信息
 * - 类型安全的用户信息获取
 * - 简化控制器中的用户信息访问
 * - 支持可选的数据字段提取
 */
interface RequestWithUser {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // 类型安全检查
    if (!user) {
      throw new Error(
        'User not found in request. Make sure to use proper auth guard.',
      );
    }

    // 如果指定了特定字段，返回该字段的值
    return data ? user[data] : user;
  },
);
