import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * 请求对象接口 - 包含已认证用户信息
 *
 * @description
 * 定义了经过JWT认证守卫处理后的请求对象结构。
 * 当请求通过 {@link JwtAuthGuard} 认证后，守卫会将解析出的用户信息
 * 挂载到 `request.user` 属性上。
 *
 * @interface
 *
 * @property {AuthenticatedUser} user - 当前已认证的用户信息
 *
 * @see {@link AuthenticatedUser} - 用户信息接口定义
 * @see {@link ../guards/jwt-auth.guard.ts} - JWT认证守卫实现
 *
 * @example
 * ```typescript
 * // 在JwtAuthGuard中设置user属性
 * const user = await this.authService.validateUser(payload);
 * request.user = user;
 * ```
 */
interface RequestWithUser {
  user: AuthenticatedUser;
}

/**
 * 当前用户参数装饰器
 *
 * @description
 * 创建一个参数装饰器，用于从请求上下文中提取当前已认证的用户信息。
 * 此装饰器简化了在控制器方法中访问用户信息的流程，提供类型安全的用户数据获取方式。
 *
 * **核心功能**：
 * - 从HTTP请求对象中自动提取 `request.user` 属性
 * - 支持提取完整用户对象或特定字段（如 `id`、`email`）
 * - 提供运行时类型安全检查，确保用户信息存在
 * - 必须与JWT认证守卫配合使用
 *
 * **工作原理**：
 * 1. JWT认证守卫验证token后，将用户信息挂载到 `request.user`
 * 2. 此装饰器从 `ExecutionContext` 中提取请求对象
 * 3. 检查用户信息是否存在，不存在则抛出错误
 * 4. 根据参数返回完整用户对象或特定字段值
 *
 * @param {keyof AuthenticatedUser | undefined} data - 可选参数，指定要提取的用户字段名
 *   - 不传参数时：返回完整的 {@link AuthenticatedUser} 对象
 *   - 传入字段名时：返回该字段的值（如 `'id'` 返回用户ID）
 *   - 支持的字段名：`'id'`、`'email'`、`'createdAt'`、`'lastSyncAt'`
 *
 * @param {ExecutionContext} ctx - NestJS执行上下文对象
 *   由框架自动注入，用于访问底层HTTP请求对象
 *
 * @returns {ParameterDecorator} 返回一个NestJS参数装饰器
 *   - 装饰器返回值类型为 `AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser]`
 *   - 完整对象模式：返回包含所有字段的 {@link AuthenticatedUser} 对象
 *   - 字段提取模式：返回指定字段的值，类型由TypeScript自动推断
 *
 * @throws {Error} 当请求对象中不存在用户信息时抛出错误
 *   - 错误信息："User not found in request. Make sure to use proper auth guard."
 *   - 通常原因：未使用JWT认证守卫或守卫验证失败
 *
 * @see {@link AuthenticatedUser} - 用户信息接口定义
 * @see {@link ../guards/jwt-auth.guard.ts} - 必须配合此守卫使用
 * @see {@link ../interfaces/auth.interface.ts} - 认证相关接口定义
 *
 * @example
 * // 示例1: 提取完整用户对象 (最常用场景)
 * // 适用于需要访问用户多个字段的场景
 * ```typescript
 * import { Controller, Get, UseGuards } from '@nestjs/common';
 * import { JwtAuthGuard } from '../guards/jwt-auth.guard';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 * import { AuthenticatedUser } from '../interfaces/auth.interface';
 *
 * @Controller('profile')
 * export class ProfileController {
 *   @UseGuards(JwtAuthGuard)  // 必须使用JWT守卫
 *   @Get()
 *   getProfile(@CurrentUser() user: AuthenticatedUser) {
 *     // user 包含完整的用户信息
 *     return {
 *       id: user.id,
 *       email: user.email,
 *       createdAt: user.createdAt,
 *       lastSyncAt: user.lastSyncAt,
 *     };
 *   }
 * }
 * ```
 *
 * @example
 * // 示例2: 仅提取用户ID (性能优化场景)
 * // 当只需要用户ID时，直接提取减少对象传递开销
 * ```typescript
 * import { Controller, Get, UseGuards, Param } from '@nestjs/common';
 * import { JwtAuthGuard } from '../guards/jwt-auth.guard';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 *
 * @Controller('sync')
 * export class SyncController {
 *   @UseGuards(JwtAuthGuard)
 *   @Get(':taskId')
 *   getSyncStatus(
 *     @CurrentUser('id') userId: string,  // 仅提取id字段
 *     @Param('taskId') taskId: string,
 *   ) {
 *     // userId 的类型自动推断为 string
 *     return this.syncService.getStatus(userId, taskId);
 *   }
 * }
 * ```
 *
 * @example
 * // 示例3: 提取用户邮箱用于日志记录
 * // 适用于审计日志或通知场景
 * ```typescript
 * import { Controller, Post, UseGuards, Body, Logger } from '@nestjs/common';
 * import { JwtAuthGuard } from '../guards/jwt-auth.guard';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 *
 * @Controller('config')
 * export class ConfigController {
 *   private readonly logger = new Logger(ConfigController.name);
 *
 *   @UseGuards(JwtAuthGuard)
 *   @Post('douban')
 *   updateDoubanConfig(
 *     @CurrentUser('email') userEmail: string,  // 仅提取email
 *     @Body() config: UpdateDoubanConfigDto,
 *   ) {
 *     // userEmail 的类型自动推断为 string
 *     this.logger.log(`User ${userEmail} updating Douban config`);
 *     return this.configService.updateDouban(config);
 *   }
 * }
 * ```
 *
 * @example
 * // 示例4: 多个装饰器组合使用
 * // 展示与其他NestJS装饰器的配合
 * ```typescript
 * import { Controller, Put, UseGuards, Body, HttpCode, HttpStatus } from '@nestjs/common';
 * import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
 * import { JwtAuthGuard } from '../guards/jwt-auth.guard';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 * import { AuthenticatedUser } from '../interfaces/auth.interface';
 *
 * @Controller('sync-config')
 * @ApiBearerAuth()
 * export class SyncConfigController {
 *   @UseGuards(JwtAuthGuard)
 *   @Put()
 *   @HttpCode(HttpStatus.OK)
 *   @ApiOperation({ summary: '更新同步配置' })
 *   @ApiResponse({ status: 200, description: '配置更新成功' })
 *   async updateSyncConfig(
 *     @CurrentUser() user: AuthenticatedUser,
 *     @Body() updateDto: UpdateSyncConfigDto,
 *   ) {
 *     return this.syncConfigService.update(user.id, updateDto);
 *   }
 * }
 * ```
 *
 * @example
 * // 示例5: 错误处理场景
 * // 展示当缺少认证守卫时会发生什么
 * ```typescript
 * import { Controller, Get } from '@nestjs/common';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 * import { AuthenticatedUser } from '../interfaces/auth.interface';
 *
 * @Controller('wrong')
 * export class WrongController {
 *   @Get()
 *   // ❌ 错误：缺少 @UseGuards(JwtAuthGuard)
 *   wrongUsage(@CurrentUser() user: AuthenticatedUser) {
 *     // 运行时会抛出错误：
 *     // Error: User not found in request. Make sure to use proper auth guard.
 *     return { user };
 *   }
 * }
 *
 * // ✅ 正确：必须使用JwtAuthGuard
 * @Controller('correct')
 * export class CorrectController {
 *   @UseGuards(JwtAuthGuard)
 *   @Get()
 *   correctUsage(@CurrentUser() user: AuthenticatedUser) {
 *     return { user };
 *   }
 * }
 * ```
 *
 * @remarks
 * **重要提醒**：
 * - 此装饰器必须与 `@UseGuards(JwtAuthGuard)` 配合使用
 * - 未使用认证守卫时会抛出运行时错误
 * - 字段名参数必须是 {@link AuthenticatedUser} 接口的有效键名
 * - TypeScript会在编译时检查字段名的有效性
 * - 装饰器内部不会修改用户对象，保证数据不可变性
 *
 * **性能考虑**：
 * - 提取特定字段比提取完整对象性能略好（减少对象传递开销）
 * - 对于只需要用户ID的场景，建议使用 `@CurrentUser('id')`
 * - 装饰器本身无额外异步开销，执行速度极快
 *
 * **类型安全**：
 * - 完整对象模式：返回类型为 {@link AuthenticatedUser}
 * - 字段提取模式：返回类型由TypeScript自动推断（如 `'id'` → `string`）
 * - 编译时会验证字段名是否为有效的 {@link AuthenticatedUser} 键
 */
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
