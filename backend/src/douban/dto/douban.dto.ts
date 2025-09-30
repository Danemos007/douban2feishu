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
 * fetchDto.userId = 'your_user_id';
 * fetchDto.cookie = 'll="example"; bid=example_bid';
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
  /**
   * 豆瓣用户ID
   *
   * @description 用户在豆瓣网站的唯一标识符，可从用户个人主页URL中获取。
   * 例如：https://www.douban.com/people/123456789/ 中的 123456789。
   *
   * @type {string}
   * @example 'your_user_id'
   *
   * @throws {ValidationError} 当userId不是字符串类型时抛出验证错误
   * @throws {ValidationError} 当userId字段缺失时抛出验证错误
   */
  @ApiProperty({
    description: '豆瓣用户ID',
    example: '123456789',
  })
  @IsString({ message: '用户ID必须是字符串' })
  userId!: string;

  /**
   * 豆瓣Cookie字符串
   *
   * @description 用于身份认证的豆瓣Cookie完整字符串，用于绕过登录限制访问用户数据。
   * Cookie应包含bid、dbcl2等关键字段。获取方式：登录豆瓣后从浏览器开发者工具中复制。
   *
   * @type {string}
   * @example 'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.'
   *
   * @throws {ValidationError} 当cookie不是字符串类型时抛出验证错误
   * @throws {ValidationError} 当cookie字段缺失时抛出验证错误
   *
   * @security 此字段包含敏感认证信息，应在存储时进行加密处理
   */
  @ApiProperty({
    description: '豆瓣Cookie字符串',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  /**
   * Cookie是否已加密
   *
   * @description 标识传入的cookie字段是否已经过AES-256加密。
   * - true: cookie已加密，需要解密后使用
   * - false: cookie为明文，直接使用
   * - undefined: 默认为未加密（可选字段）
   *
   * @type {boolean | undefined}
   * @default undefined
   * @example false
   *
   * @throws {ValidationError} 当isEncrypted不是布尔值类型时抛出验证错误（例如传入字符串"true"/"false"）
   *
   * @optional
   */
  @ApiProperty({
    description: 'Cookie是否已加密',
    example: false,
    required: false,
  })
  @IsBoolean({ message: 'isEncrypted必须是布尔值' })
  @IsOptional()
  isEncrypted?: boolean;

  /**
   * 数据分类
   *
   * @description 指定要抓取的豆瓣数据类型。
   * - 'books': 书籍数据（豆瓣读书）
   * - 'movies': 电影数据（豆瓣电影，纯电影不含电视剧）
   * - 'tv': 电视剧和纪录片数据（豆瓣电影）
   *
   * @type {'books' | 'movies' | 'tv'}
   * @example 'books'
   *
   * @throws {ValidationError} 当category不在['books', 'movies', 'tv']枚举范围内时抛出验证错误
   * @throws {ValidationError} 当category不是字符串类型时抛出验证错误
   * @throws {ValidationError} 当category字段缺失时抛出验证错误
   *
   * @required
   */
  @ApiProperty({
    description: '数据分类',
    enum: ['books', 'movies', 'tv'],
    example: 'books',
  })
  @IsEnum(['books', 'movies', 'tv'], {
    message: '分类必须是books、movies或tv中的一个',
  })
  category!: 'books' | 'movies' | 'tv';

  /**
   * 用户标记状态
   *
   * @description 筛选用户对书影音的标记状态。
   * - 'wish': 想看/想读（标记为感兴趣但未开始）
   * - 'do': 在看/在读（正在进行中）
   * - 'collect': 看过/读过（已完成）
   * - undefined: 不筛选状态，获取所有标记（可选字段）
   *
   * @type {'wish' | 'do' | 'collect' | undefined}
   * @default undefined
   * @example 'collect'
   *
   * @throws {ValidationError} 当status不在['wish', 'do', 'collect']枚举范围内时抛出验证错误
   * @throws {ValidationError} 当status不是字符串类型时抛出验证错误
   *
   * @optional
   */
  @ApiProperty({
    description: '用户状态',
    enum: ['wish', 'do', 'collect'],
    example: 'collect',
    required: false,
  })
  @IsEnum(['wish', 'do', 'collect'], {
    message: '状态必须是wish、do或collect中的一个',
  })
  @IsOptional()
  status?: 'wish' | 'do' | 'collect';

  /**
   * 获取数量限制
   *
   * @description 限制一次请求最多返回的数据条目数量，用于控制请求性能和避免数据过载。
   * - 最小值: 1
   * - 最大值: 1000
   * - undefined: 不限制数量，获取所有数据（可选字段）
   *
   * @type {number | undefined}
   * @default undefined
   * @example 100
   *
   * @throws {ValidationError} 当limit不是数字类型时抛出验证错误（例如传入字符串"100"）
   * @throws {ValidationError} 当limit小于1时抛出验证错误
   * @throws {ValidationError} 当limit大于1000时抛出验证错误
   *
   * @optional
   * @remarks 允许浮点数，但建议使用整数值
   */
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
 * 验证豆瓣Cookie有效性的请求DTO
 *
 * @description 用于验证用户提供的豆瓣Cookie是否有效，可用于登录态检测。
 * 通过发送Cookie到豆瓣服务器验证是否能够正常访问用户数据。
 *
 * @example
 * ```typescript
 * const validateDto = new ValidateCookieDto();
 * validateDto.cookie = 'll="example"; bid=example_bid';
 * validateDto.userId = 'your_user_id'; // 可选
 * ```
 *
 * @see {@link FetchUserDataDto} 获取用户数据DTO
 *
 * @public
 */
export class ValidateCookieDto {
  /**
   * 豆瓣Cookie字符串
   *
   * @description 待验证的豆瓣Cookie完整字符串。
   * 验证逻辑会检查Cookie是否能够成功访问豆瓣用户数据，判断登录态是否有效。
   *
   * @type {string}
   * @example 'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.'
   *
   * @throws {ValidationError} 当cookie不是字符串类型时抛出验证错误
   * @throws {ValidationError} 当cookie字段缺失时抛出验证错误
   *
   * @required
   * @security 此字段包含敏感认证信息，应在传输过程中使用HTTPS加密
   */
  @ApiProperty({
    description: '豆瓣Cookie字符串',
    example: 'bid=abc123; __utma=123456...',
  })
  @IsString({ message: 'Cookie必须是字符串' })
  cookie!: string;

  /**
   * 豆瓣用户ID
   *
   * @description 可选的用户ID，用于辅助Cookie验证。
   * 如果提供，验证时会检查Cookie是否属于该用户ID。
   * 如果不提供，仅验证Cookie本身的有效性。
   *
   * @type {string | undefined}
   * @default undefined
   * @example 'your_user_id'
   *
   * @throws {ValidationError} 当userId不是字符串类型时抛出验证错误
   *
   * @optional
   * @remarks 提供userId可以提高验证的准确性，避免Cookie与用户不匹配的情况
   */
  @ApiProperty({
    description: '用户ID（可选，用于Cookie验证）',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '用户ID必须是字符串' })
  userId?: string;
}
