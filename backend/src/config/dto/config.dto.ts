import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  MinLength,
} from 'class-validator';

/**
 * 更新豆瓣配置DTO
 *
 * @description 用于更新用户豆瓣账号配置的数据传输对象，包含从浏览器获取的Cookie字符串，
 * 用于豆瓣数据抓取时的身份验证
 *
 * @remarks
 * Cookie字符串需要用户从浏览器开发者工具中手动获取，具有一定的时效性，
 * 过期后需要重新获取并更新
 *
 * @example
 * ```json
 * {
 *   "cookie": "bid=abc123; __utma=123456789; dbcl2=your_user_id:example_secret; ck=Bz9H"
 * }
 * ```
 */
export class UpdateDoubanConfigDto {
  /**
   * 豆瓣Cookie字符串
   *
   * @description 从浏览器开发者工具中获取的完整Cookie字符串，用于豆瓣数据抓取时的身份认证。
   * Cookie包含用户登录态信息，是访问豆瓣个人数据的必要凭证
   *
   * @type {string}
   *
   * @validation
   * - 必须是字符串类型
   * - 长度至少为10个字符（完整Cookie通常为数百个字符）
   *
   * @remarks
   * Cookie具有时效性，通常在数周到数月后失效，届时需要重新获取并更新。
   * 获取方法：登录豆瓣 → 打开开发者工具(F12) → Network标签 → 刷新页面 →
   * 查看第一个请求的Request Headers中的Cookie字段
   *
   * @example 'bid=abc123; __utma=123456789; dbcl2=your_user_id:example_secret; ck=Bz9H; frodotk_db=example_token'
   */
  @ApiProperty({
    description:
      '从浏览器开发者工具中获取的完整豆瓣Cookie字符串，用于身份认证和数据抓取',
    example: 'bid=abc123; __utma=123456...',
    minLength: 10,
    required: true,
  })
  @IsString({ message: 'Cookie必须是字符串' })
  @MinLength(10, { message: 'Cookie长度至少为10个字符' })
  cookie!: string;
}

/**
 * 更新飞书配置DTO
 *
 * @description 用于更新用户飞书企业自建应用配置的数据传输对象，包含应用ID和应用密钥，
 * 用于飞书多维表格API调用时的身份认证
 *
 * @remarks
 * 需要用户在飞书开放平台创建企业自建应用，并配置相应的权限（读写多维表格的权限），
 * 然后将应用添加到目标多维表格中，最后从开放平台获取App ID和App Secret
 *
 * @example
 * ```json
 * {
 *   "appId": "cli_your_app_id_here",
 *   "appSecret": "your_app_secret_here"
 * }
 * ```
 */
export class UpdateFeishuConfigDto {
  /**
   * 飞书应用ID
   *
   * @description 飞书企业自建应用的唯一标识符，从飞书开放平台的应用凭证页面获取
   *
   * @type {string}
   *
   * @validation
   * - 必须是字符串类型
   * - 长度至少为3个字符
   *
   * @remarks
   * 应用ID通常以 "cli_" 开头，后跟16位随机字符。
   * 获取路径：飞书开放平台 → 我的应用 → 选择应用 → 凭证与基础信息 → App ID
   *
   * @example 'cli_your_app_id_here'
   */
  @ApiProperty({
    description: '飞书企业自建应用的唯一标识符(App ID)，从飞书开放平台获取',
    example: 'cli_a1b2c3d4e5f6g7h8',
    minLength: 3,
    required: true,
  })
  @IsString({ message: '应用ID必须是字符串' })
  @MinLength(3, { message: '应用ID长度至少为3个字符' })
  appId!: string;

  /**
   * 飞书应用密钥
   *
   * @description 飞书企业自建应用的密钥，用于生成访问令牌(tenant_access_token)，
   * 与应用ID配合使用进行API调用认证
   *
   * @type {string}
   *
   * @validation
   * - 必须是字符串类型
   * - 长度至少为10个字符（实际长度通常为32个字符）
   *
   * @remarks
   * 应用密钥是敏感信息，需妥善保管，不应在前端或公开渠道暴露。
   * 获取路径：飞书开放平台 → 我的应用 → 选择应用 → 凭证与基础信息 → App Secret
   *
   * @example 'your_app_secret_here'
   */
  @ApiProperty({
    description:
      '飞书企业自建应用的密钥(App Secret)，用于API调用认证，需妥善保管',
    example: 'abcdef123456789',
    minLength: 10,
    required: true,
  })
  @IsString({ message: '应用密钥必须是字符串' })
  @MinLength(10, { message: '应用密钥长度至少为10个字符' })
  appSecret!: string;
}

/**
 * 更新同步配置DTO
 *
 * @description 用于配置豆瓣数据到飞书多维表格的同步规则，包括数据映射方案、
 * 自动同步开关、同步调度和表格字段映射等核心配置
 *
 * @remarks
 * 此DTO包含系统的核心同步配置，决定了数据如何从豆瓣同步到飞书：
 * - mappingType: 决定使用3表还是4表映射方案
 * - autoSyncEnabled: 控制是否启用自动同步
 * - syncSchedule: 配置自动同步的时间规则（可选）
 * - tableMappings: 配置各类型数据对应的飞书表格和字段映射（可选）
 *
 * @example
 * ```json
 * {
 *   "mappingType": "THREE_TABLES",
 *   "autoSyncEnabled": true,
 *   "syncSchedule": {
 *     "frequency": "daily",
 *     "time": "02:00",
 *     "timezone": "Asia/Shanghai"
 *   },
 *   "tableMappings": {
 *     "books": {
 *       "tableId": "tblBooks123456789",
 *       "fieldMappings": {
 *         "title": "fldTitle",
 *         "author": "fldAuthor"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class UpdateSyncConfigDto {
  /**
   * 映射类型
   *
   * @description 定义豆瓣数据到飞书多维表格的映射方案，决定数据如何分类存储
   *
   * @type {'THREE_TABLES' | 'FOUR_TABLES'}
   *
   * @validation
   * - 必须是枚举值：'THREE_TABLES' 或 'FOUR_TABLES'
   *
   * @remarks
   * 两种映射方案的区别：
   * - THREE_TABLES: 3个表（图书、电影、电视剧和纪录片合并）
   * - FOUR_TABLES: 4个表（图书、电影、电视剧、纪录片各自独立）
   *
   * 选择建议：
   * - 数据量较少或不需要细分纪录片时，推荐使用THREE_TABLES
   * - 需要对纪录片单独管理和分析时，推荐使用FOUR_TABLES
   *
   * @example 'THREE_TABLES'
   */
  @ApiProperty({
    description: '数据映射方案：THREE_TABLES(3表方案) 或 FOUR_TABLES(4表方案)',
    enum: ['THREE_TABLES', 'FOUR_TABLES'],
    example: 'THREE_TABLES',
    required: true,
  })
  @IsEnum(['THREE_TABLES', 'FOUR_TABLES'], {
    message: '映射类型必须是THREE_TABLES或FOUR_TABLES',
  })
  mappingType!: 'THREE_TABLES' | 'FOUR_TABLES';

  /**
   * 是否启用自动同步
   *
   * @description 控制是否启用定时自动同步功能，配合syncSchedule使用
   *
   * @type {boolean}
   *
   * @validation
   * - 必须是布尔值（true 或 false）
   *
   * @remarks
   * - 设置为 true: 系统将根据syncSchedule配置的规则自动执行同步任务
   * - 设置为 false: 只能通过手动触发的方式执行同步
   *
   * 使用场景：
   * - 推荐开启自动同步，确保数据及时更新
   * - 如果需要精确控制同步时机，可以关闭自动同步，仅使用手动同步
   *
   * @example false
   */
  @ApiProperty({
    description: '是否启用自动定时同步功能，true为启用，false为禁用',
    example: false,
    required: true,
  })
  @IsBoolean({ message: '自动同步设置必须是布尔值' })
  autoSyncEnabled!: boolean;

  /**
   * 同步调度配置
   *
   * @description 配置自动同步的时间规则，包括频率、时间、时区等参数（可选字段）
   *
   * @type {object}
   *
   * @validation
   * - 必须是对象类型（如果提供）
   * - 可以省略（可选字段）
   *
   * @remarks
   * syncSchedule对象的结构：
   * - frequency: 同步频率，可选值：'manual'(手动) | 'daily'(每天) | 'weekly'(每周) | 'monthly'(每月)
   * - time: 同步时间，格式为 HH:mm（24小时制），例如 "02:00"、"14:30"
   * - timezone: 时区，例如 "Asia/Shanghai"、"America/New_York"
   * - daysOfWeek: 每周的哪几天执行（仅当frequency为'weekly'时有效），数组，0-6表示周日到周六
   * - dayOfMonth: 每月的哪一天执行（仅当frequency为'monthly'时有效），1-31
   *
   * 使用建议：
   * - 推荐在凌晨时段执行同步，避免影响用户使用
   * - 根据数据更新频率选择合适的同步频率
   *
   * @example
   * ```json
   * {
   *   "frequency": "daily",
   *   "time": "02:00",
   *   "timezone": "Asia/Shanghai"
   * }
   * ```
   */
  @ApiProperty({
    description: '自动同步的时间调度配置，包括频率、时间、时区等参数（可选）',
    example: {
      frequency: 'daily',
      time: '02:00',
      timezone: 'Asia/Shanghai',
    },
    required: false,
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

  /**
   * 表格字段映射配置
   *
   * @description 配置各类型数据对应的飞书多维表格ID和字段映射关系（可选字段）
   *
   * @type {object}
   *
   * @validation
   * - 必须是对象类型（如果提供）
   * - 可以省略（可选字段）
   *
   * @remarks
   * tableMappings对象的结构：
   * - books: 图书数据的表格配置
   * - movies: 电影数据的表格配置
   * - music: 音乐数据的表格配置（暂未实现）
   * - unified: 统一表格配置（三表方案中电视剧和纪录片的合并表）
   *
   * 每个表格配置包含：
   * - tableId: 飞书多维表格的唯一标识符，格式如 "tblXXXXXXXXXXXXXX"
   * - fieldMappings: 字段映射关系，键为豆瓣字段名，值为飞书字段ID
   *
   * 获取表格ID方法：
   * 在飞书多维表格的浏览器URL中，格式为 https://xxx.feishu.cn/base/{base_id}?table={table_id}
   *
   * 使用说明：
   * - 首次同步时可以省略此配置，系统会自动创建字段
   * - 配置后系统将使用指定的表格和字段映射关系
   * - 可以根据映射方案（3表或4表）选择配置不同的表
   *
   * @example
   * ```json
   * {
   *   "books": {
   *     "tableId": "tblBooks123456789",
   *     "fieldMappings": {
   *       "title": "fldTitle",
   *       "author": "fldAuthor",
   *       "isbn": "fldISBN"
   *     }
   *   },
   *   "movies": {
   *     "tableId": "tblMovies987654321",
   *     "fieldMappings": {
   *       "title": "fldTitle",
   *       "director": "fldDirector"
   *     }
   *   }
   * }
   * ```
   */
  @ApiProperty({
    description:
      '各类型数据对应的飞书表格ID和字段映射配置，用于精确控制数据同步目标（可选）',
    example: {
      books: {
        tableId: 'tblXXXXXXXXXXXXXX',
        fieldMappings: {
          title: 'fldYYYYYYYYYYYYYY',
          author: 'fldZZZZZZZZZZZZZZ',
        },
      },
    },
    required: false,
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
