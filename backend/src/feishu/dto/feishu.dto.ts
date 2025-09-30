import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';
import { FeishuRecordData } from '../interfaces/feishu.interface';

/**
 * 批量创建飞书多维表格记录的数据传输对象
 *
 * @description 用于飞书多维表格批量创建记录接口的请求体验证。
 * 该 DTO 封装了创建多维表格记录所需的所有参数，包括飞书应用凭证、目标表格信息、
 * 待创建的记录数据以及可选的字段映射配置。主要用于将豆瓣数据同步到飞书表格时的批量写入操作。
 *
 * @example
 * ```json
 * {
 *   "appId": "cli_a1b2c3d4e5f6g7h8",
 *   "appSecret": "abcdef123456789",
 *   "appToken": "bascnCMII2ORbcJlrZwVQrqAbh",
 *   "tableId": "tblsRc9GRRXKqhvW",
 *   "records": [
 *     {
 *       "title": "JavaScript高级程序设计",
 *       "author": "Nicholas C. Zakas",
 *       "rating": 9.3
 *     },
 *     {
 *       "fields": {
 *         "title": "代码整洁之道",
 *         "author": "Robert C. Martin",
 *         "rating": 9.0
 *       }
 *     }
 *   ],
 *   "tableMapping": {
 *     "title": "fldXXXXXXXXXXXXXX",
 *     "author": "fldYYYYYYYYYYYYYY",
 *     "rating": "fldZZZZZZZZZZZZZZ"
 *   }
 * }
 * ```
 */
export class BatchCreateRecordsDto {
  @ApiProperty({
    description:
      '飞书应用ID，用于标识调用飞书API的应用身份（可在飞书开放平台-应用详情页获取）',
    example: 'cli_a1b2c3d4e5f6g7h8',
  })
  @IsString({ message: '应用ID必须是字符串' })
  appId!: string;

  @ApiProperty({
    description:
      '飞书应用Secret密钥，与appId配合用于获取访问令牌（可在飞书开放平台-应用详情页获取，需妥善保管）',
    example: 'abcdef123456789',
  })
  @IsString({ message: '应用Secret必须是字符串' })
  appSecret!: string;

  @ApiProperty({
    description:
      '多维表格App Token，用于定位具体的飞书多维表格（可在飞书多维表格URL中获取，格式为 bascXXXXXXXXXXXXXX）',
    example: 'bascnCMII2ORbcJlrZwVQrqAbh',
  })
  @IsString({ message: 'App Token必须是字符串' })
  appToken!: string;

  @ApiProperty({
    description:
      '目标数据表的表格ID，用于定位多维表格中的具体子表（可在飞书多维表格URL中获取，格式为 tblXXXXXXXXXXXX）',
    example: 'tblsRc9GRRXKqhvW',
  })
  @IsString({ message: '表格ID必须是字符串' })
  tableId!: string;

  @ApiProperty({
    description:
      '待创建的记录数据数组。支持两种格式：' +
      '1) 扁平对象格式 {key: value}，' +
      '2) 嵌套格式 {fields: {key: value}}。' +
      '字段值类型可以是字符串、数字、布尔值、null 或字符串/数字数组',
    type: 'array',
    items: { type: 'object' },
    example: [
      { title: '书名', author: '作者', rating: 9.5 },
      { fields: { title: '电影名', director: '导演', rating: 8.8 } },
    ],
  })
  @IsArray({ message: '记录必须是数组' })
  records!: FeishuRecordData[];

  @ApiProperty({
    description:
      '字段映射表（可选），用于将业务字段名映射到飞书表格的 Field ID。' +
      '键为业务字段名（如 "title"），值为飞书字段ID（如 "fldXXXXXXXXXXXXXX"）。' +
      '如不提供，将使用字段名直接匹配',
    example: {
      title: 'fldXXXXXXXXXXXXXX',
      author: 'fldYYYYYYYYYYYYYY',
      rating: 'fldZZZZZZZZZZZZZZ',
    },
    required: false,
  })
  @IsObject({ message: '表格映射必须是对象' })
  @IsOptional()
  tableMapping?: Record<string, string>;
}

/**
 * 获取飞书多维表格字段信息的数据传输对象
 *
 * @description 用于查询飞书多维表格字段列表接口的请求体验证。
 * 该 DTO 封装了查询表格字段所需的认证信息和表格定位参数。
 * 主要用于在数据同步前获取目标表格的字段结构，以便进行字段映射和数据验证。
 * 返回的字段信息包括字段ID、字段名、字段类型等元数据。
 *
 * @example
 * ```json
 * {
 *   "appId": "cli_a1b2c3d4e5f6g7h8",
 *   "appSecret": "abcdef123456789",
 *   "appToken": "bascnCMII2ORbcJlrZwVQrqAbh",
 *   "tableId": "tblsRc9GRRXKqhvW"
 * }
 * ```
 */
export class GetTableFieldsDto {
  @ApiProperty({
    description:
      '飞书应用ID，用于标识调用飞书API的应用身份（可在飞书开放平台-应用详情页获取）',
    example: 'cli_a1b2c3d4e5f6g7h8',
  })
  @IsString({ message: '应用ID必须是字符串' })
  appId!: string;

  @ApiProperty({
    description:
      '飞书应用Secret密钥，与appId配合用于获取访问令牌（可在飞书开放平台-应用详情页获取，需妥善保管）',
    example: 'abcdef123456789',
  })
  @IsString({ message: '应用Secret必须是字符串' })
  appSecret!: string;

  @ApiProperty({
    description:
      '多维表格App Token，用于定位具体的飞书多维表格（可在飞书多维表格URL中获取，格式为 bascXXXXXXXXXXXXXX）',
    example: 'bascnCMII2ORbcJlrZwVQrqAbh',
  })
  @IsString({ message: 'App Token必须是字符串' })
  appToken!: string;

  @ApiProperty({
    description:
      '目标数据表的表格ID，用于定位多维表格中的具体子表（可在飞书多维表格URL中获取，格式为 tblXXXXXXXXXXXX）',
    example: 'tblsRc9GRRXKqhvW',
  })
  @IsString({ message: '表格ID必须是字符串' })
  tableId!: string;
}
