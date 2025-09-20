import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * 本地认证策略 - 用户名密码验证
 *
 * 功能:
 * - 使用邮箱作为用户名
 * - 验证邮箱密码组合
 * - 支持登录接口的身份验证
 * - 集成bcrypt密码哈希验证
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  /**
   * 初始化本地认证策略
   *
   * @description 配置Passport本地策略，设置邮箱作为用户名字段进行身份验证
   * @param authService 认证服务实例，用于验证用户凭证
   */
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // 使用email作为用户名字段
      passwordField: 'password',
    });
  }

  /**
   * 验证用户登录凭证
   *
   * @description 验证用户提供的邮箱和密码，成功时返回认证用户信息，失败时抛出异常
   * @param email 用户邮箱地址，用作登录用户名
   * @param password 用户明文密码，将与数据库中的哈希密码进行比较
   * @returns Promise<AuthenticatedUser> 认证成功的用户信息，包含用户ID、邮箱、创建时间等
   * @throws {UnauthorizedException} 当邮箱不存在或密码错误时抛出"Invalid email or password"异常
   * @throws {Error} 当AuthService发生数据库连接等内部错误时，原始异常会被传播
   */
  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    // 调用AuthService验证用户凭证
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 返回用户信息，会被附加到req.user
    return user;
  }
}
