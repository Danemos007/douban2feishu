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
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    
    // 如果指定了特定字段，返回该字段的值
    return data ? user?.[data] : user;
  },
);