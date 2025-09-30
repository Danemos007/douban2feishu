import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface';

/**
 * JWT认证策略 - Passport.js集成
 *
 * 功能:
 * - 从Authorization header中提取JWT token
 * - 验证token签名和有效性
 * - 获取用户信息并附加到请求对象
 * - 支持Bearer token格式
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'default-secret-key-for-development',
      algorithms: ['HS256'],
    });
  }

  /**
   * JWT载荷验证 - 由Passport自动调用
   *
   * @param payload JWT解码后的载荷
   * @returns 认证用户信息
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    let user: AuthenticatedUser | null;

    try {
      // 验证用户是否存在且有效
      user = await this.authService.validateJwtPayload(payload);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // 返回用户信息，会被附加到req.user
    return user;
  }
}
