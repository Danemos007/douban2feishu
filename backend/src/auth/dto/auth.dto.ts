import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 用户注册DTO
 *
 * @description 用于验证用户注册请求的数据传输对象，包含邮箱和密码字段的完整验证规则
 *
 * @example
 * ```typescript
 * const registerDto = new RegisterDto();
 * registerDto.email = 'user@example.com';
 * registerDto.password = 'SecurePassword123!';
 * ```
 */
export class RegisterDto {
  @ApiProperty({
    description:
      '用户邮箱地址，作为账户的唯一标识符。必须是有效的邮箱格式，长度不能超过255个字符',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
    required: true,
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(255, { message: '邮箱地址长度不能超过255个字符' })
  email!: string;

  @ApiProperty({
    description:
      '用户密码，需满足复杂度要求以确保账户安全：长度8-128个字符，必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符(@$!%*?&)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
    required: true,
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码至少需要8个字符' })
  @MaxLength(128, { message: '密码长度不能超过128个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
  })
  password!: string;
}

/**
 * 用户登录DTO
 *
 * @description 用于验证用户登录请求的数据传输对象，包含邮箱和密码字段
 *
 * @remarks
 * 登录时的密码验证相对宽松，只要求非空即可，因为实际的密码验证由数据库中的哈希值比对完成
 *
 * @example
 * ```typescript
 * const loginDto = new LoginDto();
 * loginDto.email = 'user@example.com';
 * loginDto.password = 'SecurePassword123!';
 * ```
 */
export class LoginDto {
  @ApiProperty({
    description: '用户邮箱地址，作为账户的唯一标识符',
    example: 'user@example.com',
    format: 'email',
    required: true,
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @ApiProperty({
    description:
      '用户密码，将与数据库中存储的哈希值进行比对。登录时不进行密码复杂度验证，因为用户可能在旧的密码策略下注册',
    example: 'SecurePassword123!',
    required: true,
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}

/**
 * 刷新Token DTO
 *
 * @description 用于验证刷新访问令牌请求的数据传输对象，包含有效的刷新令牌
 *
 * @remarks
 * 当访问令牌(access token)过期时，客户端可以使用刷新令牌来获取新的访问令牌，
 * 而无需用户重新登录
 *
 * @example
 * ```typescript
 * const refreshDto = new RefreshTokenDto();
 * refreshDto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * ```
 */
export class RefreshTokenDto {
  @ApiProperty({
    description:
      'JWT刷新令牌字符串，用于刷新访问令牌。刷新令牌通常在用户登录时与访问令牌一起颁发，具有较长的有效期',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  @IsString({ message: 'Refresh token必须是字符串' })
  @MinLength(1, { message: 'Refresh token不能为空' })
  refreshToken!: string;
}
