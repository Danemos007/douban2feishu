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
 */
export class RegisterDto {
  @ApiProperty({
    description: '用户邮箱地址',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(255, { message: '邮箱地址长度不能超过255个字符' })
  email!: string;

  @ApiProperty({
    description: '用户密码',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
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
 */
export class LoginDto {
  @ApiProperty({
    description: '用户邮箱地址',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @ApiProperty({
    description: '用户密码',
    example: 'SecurePassword123!',
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}

/**
 * 刷新Token DTO
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT刷新token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token必须是字符串' })
  @MinLength(1, { message: 'Refresh token不能为空' })
  refreshToken!: string;
}
