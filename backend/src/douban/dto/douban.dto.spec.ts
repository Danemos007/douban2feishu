/**
 * 豆瓣DTO单元测试
 *
 * 测试原则:
 * 1. 验证所有DTO的正向和反向验证逻辑
 * 2. 测试class-validator装饰器的验证行为
 * 3. 确保85%以上的代码覆盖率
 * 4. 验证类型推导和DTO导出的正确性
 *
 * 目标覆盖率: 90%+
 */

import { validate } from 'class-validator';
import { FetchUserDataDto, ValidateCookieDto } from './douban.dto';

describe('FetchUserDataDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过包含所有必需字段的有效数据验证', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123; __utma=123456...';
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过包含可选字段的完整数据验证', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123; __utma=123456...';
      dto.isEncrypted = false;
      dto.category = 'books';
      dto.status = 'collect';
      dto.limit = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过最小必需字段(仅userId, cookie, category)的数据验证', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = 'your_user_id';
      dto.cookie = 'll="example"; bid=example_bid';
      dto.category = 'movies';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('userId 字段验证', () => {
    it('应该接受空字符串的userId（仅类型验证）', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';

      const errors = await validate(dto);
      // @IsString() 不拒绝空字符串
      expect(errors.length).toBe(0);
    });

    it('应该拒绝缺少userId字段', async () => {
      const dto = new FetchUserDataDto();
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 故意不设置 userId

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userIdError = errors.find((err) => err.property === 'userId');
      expect(userIdError).toBeDefined();
    });

    it('应该拒绝非字符串的userId值', async () => {
      const dto = new FetchUserDataDto();
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsString() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).userId = 123456789;
      dto.cookie = 'bid=abc123';
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userIdError = errors.find((err) => err.property === 'userId');
      expect(userIdError).toBeDefined();
      expect(userIdError?.constraints?.isString).toContain(
        '用户ID必须是字符串',
      );
    });

    it('应该接受数字格式的字符串userId', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = 'your_user_id';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('cookie 字段验证', () => {
    it('应该接受空字符串的cookie（仅类型验证）', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = '';
      dto.category = 'books';

      const errors = await validate(dto);
      // @IsString() 不拒绝空字符串
      expect(errors.length).toBe(0);
    });

    it('应该拒绝缺少cookie字段', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.category = 'books';
      // 故意不设置 cookie

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
    });

    it('应该拒绝非字符串的cookie值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsString() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).cookie = 12345;
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
      expect(cookieError?.constraints?.isString).toContain(
        'Cookie必须是字符串',
      );
    });

    it('应该接受符合豆瓣Cookie格式的字符串', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = 'your_user_id';
      dto.cookie =
        'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.';
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('isEncrypted 字段验证 (可选字段)', () => {
    it('应该接受true值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.isEncrypted = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受false值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.isEncrypted = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受未设置isEncrypted字段(可选)', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 故意不设置 isEncrypted

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非布尔值的isEncrypted', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsBoolean() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).isEncrypted = 'true';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const isEncryptedError = errors.find(
        (err) => err.property === 'isEncrypted',
      );
      expect(isEncryptedError).toBeDefined();
      expect(isEncryptedError?.constraints?.isBoolean).toContain(
        'isEncrypted必须是布尔值',
      );
    });

    it('应该拒绝字符串"true"/"false"', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsBoolean() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).isEncrypted = 'false';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const isEncryptedError = errors.find(
        (err) => err.property === 'isEncrypted',
      );
      expect(isEncryptedError).toBeDefined();
      expect(isEncryptedError?.constraints?.isBoolean).toContain(
        'isEncrypted必须是布尔值',
      );
    });
  });

  describe('category 字段验证', () => {
    it('应该接受"books"作为有效分类', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受"movies"作为有效分类', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'movies';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受"tv"作为有效分类', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'tv';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝"music"等无效分类', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      // 测试运行时枚举验证器：故意传入非法枚举值以验证 @IsEnum() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).category = 'music';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const categoryError = errors.find((err) => err.property === 'category');
      expect(categoryError).toBeDefined();
      expect(categoryError?.constraints?.isEnum).toContain(
        '分类必须是books、movies或tv中的一个',
      );
    });

    it('应该拒绝空字符串的category', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      // 测试运行时枚举验证器：故意传入非法枚举值以验证 @IsEnum() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).category = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const categoryError = errors.find((err) => err.property === 'category');
      expect(categoryError).toBeDefined();
    });

    it('应该拒绝缺少category字段', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      // 故意不设置 category

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const categoryError = errors.find((err) => err.property === 'category');
      expect(categoryError).toBeDefined();
    });

    it('应该拒绝非字符串的category值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsEnum() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).category = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const categoryError = errors.find((err) => err.property === 'category');
      expect(categoryError).toBeDefined();
    });
  });

  describe('status 字段验证 (可选字段)', () => {
    it('应该接受"wish"作为有效状态', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.status = 'wish';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受"do"作为有效状态', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.status = 'do';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受"collect"作为有效状态', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.status = 'collect';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受未设置status字段(可选)', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 故意不设置 status

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝"reading"等无效状态', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 测试运行时枚举验证器：故意传入非法枚举值以验证 @IsEnum() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).status = 'reading';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find((err) => err.property === 'status');
      expect(statusError).toBeDefined();
      expect(statusError?.constraints?.isEnum).toContain(
        '状态必须是wish、do或collect中的一个',
      );
    });

    it('应该拒绝非字符串的status值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsEnum() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).status = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find((err) => err.property === 'status');
      expect(statusError).toBeDefined();
    });
  });

  describe('limit 字段验证 (可选字段)', () => {
    it('应该接受1作为有效的最小限制值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受1000作为有效的最大限制值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受中间值(如100)作为有效限制', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受未设置limit字段(可选)', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 故意不设置 limit

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝小于1的limit值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((err) => err.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.min).toContain('限制数量至少为1');
    });

    it('应该拒绝大于1000的limit值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 1001;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((err) => err.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.max).toContain('限制数量最多为1000');
    });

    it('应该拒绝0作为limit值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((err) => err.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.min).toContain('限制数量至少为1');
    });

    it('应该拒绝负数的limit值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = -10;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((err) => err.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.min).toContain('限制数量至少为1');
    });

    it('应该拒绝非数字的limit值', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsNumber() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).limit = '100';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((err) => err.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.isNumber).toContain('限制数量必须是数字');
    });

    it('应该接受浮点数的limit值(如100.5)', async () => {
      const dto = new FetchUserDataDto();
      dto.userId = '123456789';
      dto.cookie = 'bid=abc123';
      dto.category = 'books';
      dto.limit = 100.5;

      const errors = await validate(dto);
      // @IsNumber() 默认允许浮点数
      expect(errors.length).toBe(0);
    });
  });
});

describe('ValidateCookieDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过仅包含cookie的有效数据验证', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123; __utma=123456...';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过包含cookie和userId的完整数据验证', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123; __utma=123456...';
      dto.userId = 'user123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('cookie 字段验证', () => {
    it('应该接受空字符串的cookie（仅类型验证）', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = '';

      const errors = await validate(dto);
      // @IsString() 不拒绝空字符串
      expect(errors.length).toBe(0);
    });

    it('应该拒绝缺少cookie字段', async () => {
      const dto = new ValidateCookieDto();
      // 故意不设置 cookie

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
    });

    it('应该拒绝非字符串的cookie值', async () => {
      const dto = new ValidateCookieDto();
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsString() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).cookie = 12345;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
      expect(cookieError?.constraints?.isString).toContain(
        'Cookie必须是字符串',
      );
    });

    it('应该接受符合豆瓣Cookie格式的字符串', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie =
        'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('userId 字段验证 (可选字段)', () => {
    it('应该接受有效的userId字符串', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123';
      dto.userId = 'your_user_id';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受未设置userId字段(可选)', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123';
      // 故意不设置 userId

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受空字符串的userId（可选字段，仅类型验证）', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123';
      dto.userId = '';

      const errors = await validate(dto);
      // @IsString() 不拒绝空字符串
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非字符串的userId值', async () => {
      const dto = new ValidateCookieDto();
      dto.cookie = 'bid=abc123';
      // 测试运行时类型验证器：故意传入错误类型以验证 @IsString() 能正确拒绝
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).userId = 123456;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userIdError = errors.find((err) => err.property === 'userId');
      expect(userIdError).toBeDefined();
      expect(userIdError?.constraints?.isString).toContain(
        '用户ID必须是字符串',
      );
    });
  });
});

describe('类型推导和导出', () => {
  it('应该确保所有DTO类能正确实例化', () => {
    const fetchUserDataDto = new FetchUserDataDto();
    const validateCookieDto = new ValidateCookieDto();

    expect(fetchUserDataDto).toBeInstanceOf(FetchUserDataDto);
    expect(validateCookieDto).toBeInstanceOf(ValidateCookieDto);
  });

  it('应该验证FetchUserDataDto属性的可赋值性', () => {
    const dto = new FetchUserDataDto();
    dto.userId = '123456789';
    dto.cookie = 'bid=abc123';
    dto.isEncrypted = false;
    dto.category = 'books';
    dto.status = 'collect';
    dto.limit = 100;

    expect(dto.userId).toBe('123456789');
    expect(dto.cookie).toBe('bid=abc123');
    expect(dto.isEncrypted).toBe(false);
    expect(dto.category).toBe('books');
    expect(dto.status).toBe('collect');
    expect(dto.limit).toBe(100);
  });

  it('应该验证ValidateCookieDto属性的可赋值性', () => {
    const dto = new ValidateCookieDto();
    dto.cookie = 'bid=abc123; __utma=123456...';
    dto.userId = 'user123';

    expect(dto.cookie).toBe('bid=abc123; __utma=123456...');
    expect(dto.userId).toBe('user123');
  });

  it('应该验证category字段的类型限制为联合类型', () => {
    const dto = new FetchUserDataDto();
    dto.userId = '123456789';
    dto.cookie = 'bid=abc123';

    // 验证类型限制（通过TypeScript类型推导）
    dto.category = 'books';
    expect(dto.category).toBe('books');

    dto.category = 'movies';
    expect(dto.category).toBe('movies');

    dto.category = 'tv';
    expect(dto.category).toBe('tv');
  });

  it('应该验证status字段的类型限制为联合类型', () => {
    const dto = new FetchUserDataDto();
    dto.userId = '123456789';
    dto.cookie = 'bid=abc123';
    dto.category = 'books';

    // 验证类型限制（通过TypeScript类型推导）
    dto.status = 'wish';
    expect(dto.status).toBe('wish');

    dto.status = 'do';
    expect(dto.status).toBe('do');

    dto.status = 'collect';
    expect(dto.status).toBe('collect');
  });
});
