import { ApiProperty } from '@nestjs/swagger';

/**
 * JWT载荷接口
 */
export interface JwtPayload {
  sub: string; // 用户ID
  email: string; // 用户邮箱
  iat: number; // 签发时间
}

/**
 * 认证用户信息接口
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: Date;
  lastSyncAt: Date | null;
}

/**
 * Token响应接口 - 用于Swagger文档
 */
export class TokenResponse {
  @ApiProperty({
    description: 'JWT访问token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT刷新token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Token类型',
    example: 'Bearer',
    default: 'Bearer',
  })
  tokenType!: string;

  @ApiProperty({
    description: 'Token过期时间',
    example: '7d',
  })
  expiresIn!: string;

  @ApiProperty({
    description: '用户信息',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: '用户唯一标识',
      },
      email: {
        type: 'string',
        format: 'email',
        description: '用户邮箱',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: '账户创建时间',
      },
      lastSyncAt: {
        type: 'string',
        format: 'date-time',
        description: '最后同步时间',
        nullable: true,
      },
    },
  })
  user!: {
    id: string;
    email: string;
    createdAt: Date;
    lastSyncAt: Date | null;
  };
}
