import { SetMetadata } from '@nestjs/common';

/**
 * 公开路由装饰器常量
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() 装饰器 - 标记不需要认证的公开路由
 *
 * 使用示例:
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * 功能:
 * - 跳过JWT认证检查
 * - 适用于公开API端点 (健康检查、文档等)
 * - 简化公开路由的守卫配置
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
