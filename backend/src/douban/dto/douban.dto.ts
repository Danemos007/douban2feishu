import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

/**
 * 获取豆瓣用户数据的请求DTO
 *
 * @description 用于从豆瓣网站抓取用户书影音数据的请求参数验证。
 * 支持按分类（书籍/电影/电视剧）、状态（想看/在看/看过）和数量限制来筛选数据。
 *
 * @example
 * ```typescript
 * const fetchDto = new FetchUserDataDto();
 * fetchDto.userId = '290244208';
 * fetchDto.cookie = 'll="118282"; bid=Iv-9zz8BFAE';
 * fetchDto.category = 'books';
 * fetchDto.status = 'collect';
 * fetchDto.limit = 100;
 * ```
 *
 * @see {@link https://movie.douban.com} 豆瓣电影
 * @see {@link https://book.douban.com} 豆瓣读书
 *
 * @public
 */
export class FetchUserDataDto {
  @ApiProperty({
    description:
      '豆瓣用户ID。用户在豆瓣网站的唯一标识符，可从用户个人主页URL中获取，例如 https://www.douban.com/people/123456789/ 中的 123456789',
    example: '123456789',
  })
  @IsString({ message: '用户ID必须是字符串' })
  userId!: string;

  @ApiProperty({
    description:
      '豆瓣Cookie字符串。用于身份认证的豆瓣Cookie完整字符串，用于绕过登录限制访问用户数据。Cookie应包含bid、dbcl2等关键字段。获取方式：登录豆瓣后从浏览器开发者工具中复制。⚠️ 此字段包含敏感认证信息，应在存储时进行AES-256加密处理',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  @ApiProperty({
    description:
      'Cookie是否已加密。标识传入的cookie字段是否已经过AES-256加密。true: cookie已加密，需要解密后使用；false: cookie为明文，直接使用；undefined: 默认为未加密（可选字段）',
    example: false,
    required: false,
  })
  @IsBoolean({ message: 'isEncrypted必须是布尔值' })
  @IsOptional()
  isEncrypted?: boolean;

  @ApiProperty({
    description:
      "数据分类。指定要抓取的豆瓣数据类型：'books' 书籍数据（豆瓣读书）、'movies' 电影数据（豆瓣电影，纯电影不含电视剧）、'tv' 电视剧和纪录片数据（豆瓣电影）",
    enum: ['books', 'movies', 'tv'],
    example: 'books',
  })
  @IsEnum(['books', 'movies', 'tv'], {
    message: '分类必须是books、movies或tv中的一个',
  })
  category!: 'books' | 'movies' | 'tv';

  @ApiProperty({
    description:
      "用户标记状态。筛选用户对书影音的标记状态：'wish' 想看/想读（标记为感兴趣但未开始）、'do' 在看/在读（正在进行中）、'collect' 看过/读过（已完成）、undefined 不筛选状态，获取所有标记（可选字段）",
    enum: ['wish', 'do', 'collect'],
    example: 'collect',
    required: false,
  })
  @IsEnum(['wish', 'do', 'collect'], {
    message: '状态必须是wish、do或collect中的一个',
  })
  @IsOptional()
  status?: 'wish' | 'do' | 'collect';

  @ApiProperty({
    description:
      '获取数量限制。限制一次请求最多返回的数据条目数量，用于控制请求性能和避免数据过载。最小值: 1，最大值: 1000，undefined: 不限制数量，获取所有数据（可选字段）。⚠️ 允许浮点数，但建议使用整数值',
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
 * 验证豆瓣Cookie有效性的请求DTO
 *
 * @description 用于验证用户提供的豆瓣Cookie是否有效，可用于登录态检测。
 * 通过发送Cookie到豆瓣服务器验证是否能够正常访问用户数据。
 *
 * @example
 * ```typescript
 * const validateDto = new ValidateCookieDto();
 * validateDto.cookie = 'll="118282"; bid=Iv-9zz8BFAE';
 * validateDto.userId = '290244208'; // 可选
 * ```
 *
 * @see {@link FetchUserDataDto} 获取用户数据DTO
 *
 * @public
 */
export class ValidateCookieDto {
  @ApiProperty({
    description:
      '豆瓣Cookie字符串。待验证的豆瓣Cookie完整字符串，验证逻辑会检查Cookie是否能够成功访问豆瓣用户数据，判断登录态是否有效。⚠️ 此字段包含敏感认证信息，应在传输过程中使用HTTPS加密',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  @ApiProperty({
    description:
      '豆瓣用户ID（可选）。用于辅助Cookie验证。如果提供，验证时会检查Cookie是否属于该用户ID；如果不提供，仅验证Cookie本身的有效性。💡 提供userId可以提高验证的准确性，避免Cookie与用户不匹配的情况',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '用户ID必须是字符串' })
  userId?: string;
}
