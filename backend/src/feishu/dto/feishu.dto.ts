import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

/**
 * 批量创建记录DTO
 */
export class BatchCreateRecordsDto {
  @ApiProperty({
    description: '飞书应用ID',
    example: 'cli_a1b2c3d4e5f6g7h8',
  })
  @IsString({ message: '应用ID必须是字符串' })
  appId!: string;

  @ApiProperty({
    description: '飞书应用Secret',
    example: 'abcdef123456789',
  })
  @IsString({ message: '应用Secret必须是字符串' })
  appSecret!: string;

  @ApiProperty({
    description: '多维表格App Token',
    example: 'bascnCMII2ORbcJlrZwVQrqAbh',
  })
  @IsString({ message: 'App Token必须是字符串' })
  appToken!: string;

  @ApiProperty({
    description: '表格ID',
    example: 'tblsRc9GRRXKqhvW',
  })
  @IsString({ message: '表格ID必须是字符串' })
  tableId!: string;

  @ApiProperty({
    description: '要创建的记录数组',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray({ message: '记录必须是数组' })
  records!: any[];

  @ApiProperty({
    description: '字段映射表 (字段名 -> Field ID)',
    example: {
      title: 'fldXXXXXXXXXXXXXX',
      rating: 'fldYYYYYYYYYYYYYY',
    },
    required: false,
  })
  @IsObject({ message: '表格映射必须是对象' })
  @IsOptional()
  tableMapping?: Record<string, string>;
}

/**
 * 获取表格字段DTO
 */
export class GetTableFieldsDto {
  @ApiProperty({
    description: '飞书应用ID',
    example: 'cli_a1b2c3d4e5f6g7h8',
  })
  @IsString({ message: '应用ID必须是字符串' })
  appId!: string;

  @ApiProperty({
    description: '飞书应用Secret',
    example: 'abcdef123456789',
  })
  @IsString({ message: '应用Secret必须是字符串' })
  appSecret!: string;

  @ApiProperty({
    description: '多维表格App Token',
    example: 'bascnCMII2ORbcJlrZwVQrqAbh',
  })
  @IsString({ message: 'App Token必须是字符串' })
  appToken!: string;

  @ApiProperty({
    description: '表格ID',
    example: 'tblsRc9GRRXKqhvW',
  })
  @IsString({ message: '表格ID必须是字符串' })
  tableId!: string;
}
