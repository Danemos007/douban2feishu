import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  IsArray,
  IsString,
  IsBoolean,
} from 'class-validator';
import {
  SyncTriggerType,
  DoubanDataCategory,
  SyncJobOptions,
} from '../interfaces/sync.interface';

/**
 * 触发同步DTO
 */
export class TriggerSyncDto {
  @ApiProperty({
    description: '触发类型',
    enum: ['MANUAL', 'AUTO'],
    default: 'MANUAL',
  })
  @IsEnum(['MANUAL', 'AUTO'], { message: '触发类型必须是MANUAL或AUTO' })
  @IsOptional()
  triggerType?: SyncTriggerType = 'MANUAL';

  @ApiProperty({
    description: '延迟执行时间(毫秒)',
    example: 0,
    required: false,
  })
  @IsNumber({}, { message: '延迟时间必须是数字' })
  @Min(0, { message: '延迟时间不能为负数' })
  @IsOptional()
  delayMs?: number;

  @ApiProperty({
    description: '同步选项',
    example: {
      categories: ['books', 'movies', 'tv'],
      limit: 100,
      forceUpdate: false,
      fullSync: false,
      conflictStrategy: 'douban_wins',
    },
  })
  @IsObject({ message: '选项必须是对象' })
  @IsOptional()
  options?: SyncJobOptions;
}

/**
 * 查询同步历史DTO
 */
export class QuerySyncHistoryDto {
  @ApiProperty({
    description: '限制返回数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsNumber({}, { message: '限制数量必须是数字' })
  @Min(1, { message: '限制数量至少为1' })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: '过滤状态',
    enum: ['QUEUED', 'RUNNING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    required: false,
  })
  @IsEnum(
    ['QUEUED', 'RUNNING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    {
      message: '状态值无效',
    },
  )
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: '过滤分类',
    enum: ['books', 'movies', 'tv', 'documentary'],
    isArray: true,
    required: false,
  })
  @IsArray({ message: '分类必须是数组' })
  @IsEnum(['books', 'movies', 'tv', 'documentary'], {
    each: true,
    message: '分类值无效',
  })
  @IsOptional()
  categories?: DoubanDataCategory[];
}

/**
 * 取消同步DTO
 */
export class CancelSyncDto {
  @ApiProperty({
    description: '同步ID',
    example: 'uuid-string',
  })
  @IsString({ message: '同步ID必须是字符串' })
  syncId!: string;

  @ApiProperty({
    description: '取消原因',
    example: '用户手动取消',
    required: false,
  })
  @IsString({ message: '取消原因必须是字符串' })
  @IsOptional()
  reason?: string;
}

/**
 * 企业级同步配置DTO
 */
export class IntegratedSyncDto {
  @ApiProperty({
    description: '数据分类',
    enum: ['books', 'movies', 'tv'],
    example: 'books',
  })
  @IsEnum(['books', 'movies', 'tv'], { message: '数据分类无效' })
  category!: DoubanDataCategory;

  @ApiProperty({
    description: '豆瓣Cookie',
    example: 'bid=123; ll="118282"; ...',
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
  isEncrypted?: boolean = false;

  @ApiProperty({
    description: '状态过滤',
    example: 'collect',
    enum: ['wish', 'do', 'collect'],
    required: false,
  })
  @IsEnum(['wish', 'do', 'collect'], { message: '状态值无效' })
  @IsOptional()
  status?: 'wish' | 'do' | 'collect';

  @ApiProperty({
    description: '限制抓取数量',
    example: 100,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsNumber({}, { message: '限制数量必须是数字' })
  @Min(1, { message: '限制数量至少为1' })
  @IsOptional()
  limit?: number;
}
