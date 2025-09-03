import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

/**
 * 获取用户数据DTO
 */
export class FetchUserDataDto {
  @ApiProperty({
    description: '豆瓣用户ID',
    example: '123456789',
  })
  @IsString({ message: '用户ID必须是字符串' })
  userId!: string;

  @ApiProperty({
    description: '豆瓣Cookie字符串',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  @ApiProperty({
    description: 'Cookie是否已加密',
    example: false,
    required: false,
  })
  @IsBoolean({ message: 'isEncrypted必须是布尔值' })
  @IsOptional()
  isEncrypted?: boolean;

  @ApiProperty({
    description: '数据分类',
    enum: ['books', 'movies', 'tv'],
    example: 'books',
  })
  @IsEnum(['books', 'movies', 'tv'], { 
    message: '分类必须是books、movies或tv中的一个' 
  })
  category!: 'books' | 'movies' | 'tv';

  @ApiProperty({
    description: '用户状态',
    enum: ['wish', 'do', 'collect'],
    example: 'collect',
    required: false,
  })
  @IsEnum(['wish', 'do', 'collect'], {
    message: '状态必须是wish、do或collect中的一个'
  })
  @IsOptional()
  status?: 'wish' | 'do' | 'collect';

  @ApiProperty({
    description: '获取数量限制',
    example: 100,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsNumber({}, { message: '限制数量必须是数字' })
  @Min(1, { message: '限制数量至少为1' })
  @Max(1000, { message: '限制数量最多为1000' })
  @IsOptional()
  limit?: number;
}

/**
 * 验证Cookie DTO
 */
export class ValidateCookieDto {
  @ApiProperty({
    description: '豆瓣Cookie字符串',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  @ApiProperty({
    description: '用户ID（可选，用于Cookie验证）',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '用户ID必须是字符串' })
  userId?: string;
}