import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsBoolean, 
  IsOptional, 
  IsObject,
  MinLength 
} from 'class-validator';

/**
 * 更新豆瓣配置DTO
 */
export class UpdateDoubanConfigDto {
  @ApiProperty({
    description: '豆瓣Cookie字符串',
    example: 'bid=abc123; __utma=123456...',
    minLength: 10,
  })
  @IsString({ message: 'Cookie必须是字符串' })
  @MinLength(10, { message: 'Cookie长度至少为10个字符' })
  cookie!: string;
}

/**
 * 更新飞书配置DTO
 */
export class UpdateFeishuConfigDto {
  @ApiProperty({
    description: '飞书应用ID',
    example: 'cli_a1b2c3d4e5f6g7h8',
  })
  @IsString({ message: '应用ID必须是字符串' })
  @MinLength(3, { message: '应用ID长度至少为3个字符' })
  appId!: string;

  @ApiProperty({
    description: '飞书应用密钥',
    example: 'abcdef123456789',
  })
  @IsString({ message: '应用密钥必须是字符串' })
  @MinLength(10, { message: '应用密钥长度至少为10个字符' })
  appSecret!: string;
}

/**
 * 更新同步配置DTO
 */
export class UpdateSyncConfigDto {
  @ApiProperty({
    description: '映射类型',
    enum: ['THREE_TABLES', 'FOUR_TABLES'],
    example: 'THREE_TABLES',
  })
  @IsEnum(['THREE_TABLES', 'FOUR_TABLES'], { 
    message: '映射类型必须是THREE_TABLES或FOUR_TABLES' 
  })
  mappingType!: 'THREE_TABLES' | 'FOUR_TABLES';

  @ApiProperty({
    description: '是否启用自动同步',
    example: false,
  })
  @IsBoolean({ message: '自动同步设置必须是布尔值' })
  autoSyncEnabled!: boolean;

  @ApiProperty({
    description: '同步调度配置',
    example: {
      frequency: 'daily',
      time: '02:00',
      timezone: 'Asia/Shanghai',
    },
  })
  @IsObject({ message: '同步调度必须是对象' })
  @IsOptional()
  syncSchedule?: {
    frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:mm格式
    timezone?: string;
    daysOfWeek?: number[]; // 0-6, 周日为0
    dayOfMonth?: number; // 1-31
  };

  @ApiProperty({
    description: '表格字段映射配置',
    example: {
      books: {
        tableId: 'tblXXXXXXXXXXXXXX',
        fieldMappings: {
          title: 'fldYYYYYYYYYYYYYY',
          author: 'fldZZZZZZZZZZZZZZ',
        },
      },
    },
  })
  @IsObject({ message: '表格映射必须是对象' })
  @IsOptional()
  tableMappings?: {
    books?: {
      tableId: string;
      fieldMappings: Record<string, string>;
    };
    movies?: {
      tableId: string;
      fieldMappings: Record<string, string>;
    };
    music?: {
      tableId: string;
      fieldMappings: Record<string, string>;
    };
    unified?: {
      tableId: string;
      fieldMappings: Record<string, string>;
    };
  };
}