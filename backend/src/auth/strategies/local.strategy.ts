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
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',  // 使用email作为用户名字段
      passwordField: 'password',
    });
  }

  /**
   * 用户凭证验证 - 由Passport自动调用
   * 
   * @param email 用户邮箱
   * @param password 用户密码
   * @returns 认证用户信息
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