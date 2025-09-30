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
 * 触发同步操作DTO
 *
 * @description 用于手动或自动触发豆瓣数据同步任务的请求体验证，支持延迟执行和自定义同步选项配置
 *
 * @example
 * ```json
 * {
 *   "triggerType": "MANUAL",
 *   "delayMs": 5000,
 *   "options": {
 *     "categories": ["books", "movies"],
 *     "limit": 100,
 *     "forceUpdate": false,
 *     "fullSync": false,
 *     "conflictStrategy": "douban_wins"
 *   }
 * }
 * ```
 */
export class TriggerSyncDto {
  @ApiProperty({
    description:
      '同步触发类型。MANUAL表示用户手动触发，AUTO表示系统自动触发（如定时任务）',
    enum: ['MANUAL', 'AUTO'],
    default: 'MANUAL',
    required: true,
  })
  @IsEnum(['MANUAL', 'AUTO'], { message: '触发类型必须是MANUAL或AUTO' })
  @IsOptional()
  triggerType?: SyncTriggerType = 'MANUAL';

  @ApiProperty({
    description:
      '延迟执行时间（毫秒）。用于延迟同步任务的执行，0表示立即执行，适用于需要等待外部条件就绪的场景',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsNumber({}, { message: '延迟时间必须是数字' })
  @Min(0, { message: '延迟时间不能为负数' })
  @IsOptional()
  delayMs?: number;

  @ApiProperty({
    description:
      '同步任务的详细配置选项。包括目标数据分类、抓取数量限制、是否强制更新、是否全量同步、冲突解决策略等',
    example: {
      categories: ['books', 'movies', 'tv'],
      limit: 100,
      forceUpdate: false,
      fullSync: false,
      conflictStrategy: 'douban_wins',
    },
    required: false,
  })
  @IsObject({ message: '选项必须是对象' })
  @IsOptional()
  options?: SyncJobOptions;
}

/**
 * 查询同步历史DTO
 *
 * @description 用于查询用户历史同步记录的查询参数验证，支持按状态、分类过滤，并可分页控制返回数量
 *
 * @example
 * ```json
 * {
 *   "limit": 20,
 *   "status": "SUCCESS",
 *   "categories": ["books", "movies"]
 * }
 * ```
 */
export class QuerySyncHistoryDto {
  @ApiProperty({
    description:
      '返回记录的最大数量。用于分页控制，防止一次性返回过多数据。范围：1-100',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsNumber({}, { message: '限制数量必须是数字' })
  @Min(1, { message: '限制数量至少为1' })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description:
      '过滤同步任务的执行状态。QUEUED=排队中，RUNNING=执行中，PROCESSING=处理中，SUCCESS=成功，FAILED=失败，CANCELLED=已取消',
    enum: ['QUEUED', 'RUNNING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    example: 'SUCCESS',
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
    description:
      '过滤数据分类。可指定一个或多个分类，只返回这些分类的同步记录。books=书籍，movies=电影，tv=电视剧，documentary=纪录片',
    enum: ['books', 'movies', 'tv', 'documentary'],
    isArray: true,
    example: ['books', 'movies'],
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
 * 取消同步任务DTO
 *
 * @description 用于取消正在执行或排队中的同步任务，支持记录取消原因便于后续审计和分析
 *
 * @example
 * ```json
 * {
 *   "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *   "reason": "用户手动取消同步操作"
 * }
 * ```
 */
export class CancelSyncDto {
  @ApiProperty({
    description:
      '要取消的同步任务的唯一标识符（UUID格式）。可通过触发同步接口的响应或查询历史接口获取',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    required: true,
  })
  @IsString({ message: '同步ID必须是字符串' })
  syncId!: string;

  @ApiProperty({
    description:
      '取消同步任务的原因说明。用于记录用户取消操作的上下文，便于后续问题排查和用户行为分析',
    example: '用户手动取消同步操作',
    maxLength: 500,
    required: false,
  })
  @IsString({ message: '取消原因必须是字符串' })
  @IsOptional()
  reason?: string;
}

/**
 * 集成同步配置DTO
 *
 * @description 用于企业级一站式同步接口 POST /api/sync/integrated 的请求体验证。
 * 此接口整合了豆瓣数据抓取、数据转换、飞书同步等完整流程，支持临时Cookie传入和状态过滤，
 * 适用于无需持久化用户配置的快速同步场景
 *
 * @example
 * ```json
 * {
 *   "category": "books",
 *   "cookie": "bid=abc123; ll=\"118282\"; dbcl2=290244208:wI+zvuksP70; ck=Bz9H",
 *   "isEncrypted": false,
 *   "status": "collect",
 *   "limit": 100
 * }
 * ```
 */
export class IntegratedSyncDto {
  @ApiProperty({
    description:
      '要同步的豆瓣数据分类。books=书籍（读书），movies=电影，tv=电视剧（包含纪录片）',
    enum: ['books', 'movies', 'tv'],
    example: 'books',
    required: true,
  })
  @IsEnum(['books', 'movies', 'tv'], { message: '数据分类无效' })
  category!: DoubanDataCategory;

  @ApiProperty({
    description:
      '豆瓣账号的Cookie字符串。从浏览器开发者工具的Network标签中获取，用于身份验证和绕过反爬虫检测。格式：key1=value1; key2=value2',
    example: 'bid=abc123; ll="118282"; dbcl2=290244208:wI+zvuksP70; ck=Bz9H',
    minLength: 10,
    required: true,
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  @ApiProperty({
    description:
      'Cookie是否已经过AES-256加密。true表示传入的Cookie已加密（用于安全传输），false表示明文Cookie（开发测试用）',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean({ message: 'isEncrypted必须是布尔值' })
  @IsOptional()
  isEncrypted?: boolean = false;

  @ApiProperty({
    description:
      '过滤用户标记状态。wish=想看/想读，do=在看/在读，collect=看过/读过。不传则同步所有状态的数据',
    example: 'collect',
    enum: ['wish', 'do', 'collect'],
    required: false,
  })
  @IsEnum(['wish', 'do', 'collect'], { message: '状态值无效' })
  @IsOptional()
  status?: 'wish' | 'do' | 'collect';

  @ApiProperty({
    description:
      '限制本次同步抓取的最大条目数量。用于控制单次同步的数据量，避免长时间执行和豆瓣反爬虫风险。范围：1-1000',
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
