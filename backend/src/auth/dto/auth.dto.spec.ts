/**
 * 认证DTO单元测试
 *
 * 测试原则:
 * 1. 验证所有DTO的正向和反向验证逻辑
 * 2. 测试class-validator装饰器的验证行为
 * 3. 确保85%以上的代码覆盖率
 * 4. 验证类型推导和DTO导出的正确性
 *
 * 目标覆盖率: 85%+
 */

import { validate } from 'class-validator';
import { RegisterDto, LoginDto, RefreshTokenDto } from './auth.dto';

describe('RegisterDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的注册数据验证', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'SecurePassword123!';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受符合所有约束条件的复杂密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'test.user+tag@example.co.uk';
      dto.password = 'Complex@Pass123word!';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('email 字段验证', () => {
    it('应该拒绝空的邮箱地址', async () => {
      const dto = new RegisterDto();
      dto.email = '';
      dto.password = 'SecurePassword123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.isEmail).toContain(
        '请输入有效的邮箱地址',
      );
    });

    it('应该拒绝无效格式的邮箱地址', async () => {
      const dto = new RegisterDto();
      dto.email = 'invalid-email-format';
      dto.password = 'SecurePassword123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.isEmail).toContain(
        '请输入有效的邮箱地址',
      );
    });

    it('应该拒绝超过255字符的邮箱地址', async () => {
      const dto = new RegisterDto();
      const longEmail = 'a'.repeat(250) + '@example.com'; // 超过255字符
      dto.email = longEmail;
      dto.password = 'SecurePassword123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.maxLength).toContain(
        '邮箱地址长度不能超过255个字符',
      );
    });

    it('应该拒绝缺少email字段', async () => {
      const dto = new RegisterDto();
      dto.password = 'SecurePassword123!';
      // 故意不设置 email

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('应该拒绝非字符串的email值', async () => {
      const dto = new RegisterDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).email = 12345; // 故意使用错误类型以测试验证器
      dto.password = 'SecurePassword123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
    });
  });

  describe('password 字段验证', () => {
    it('应该拒绝空的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('应该拒绝少于8个字符的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'Short1!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.minLength).toContain(
        '密码至少需要8个字符',
      );
    });

    it('应该拒绝超过128个字符的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'A1a!' + 'x'.repeat(130); // 超过128字符

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.maxLength).toContain(
        '密码长度不能超过128个字符',
      );
    });

    it('应该拒绝缺少小写字母的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'NOLOWERCASE123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      );
    });

    it('应该拒绝缺少大写字母的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'nouppercase123!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      );
    });

    it('应该拒绝缺少数字的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'NoNumbersHere!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      );
    });

    it('应该拒绝缺少特殊字符的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'NoSpecialChar123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      );
    });

    it('应该拒绝包含不允许特殊字符的密码', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      dto.password = 'Invalid#Password123'; // # 不在允许的特殊字符列表中

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      );
    });

    it('应该拒绝缺少password字段', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      // 故意不设置 password

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('应该拒绝非字符串的password值', async () => {
      const dto = new RegisterDto();
      dto.email = 'user@example.com';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).password = 12345678; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.isString).toContain(
        '密码必须是字符串',
      );
    });
  });
});

describe('LoginDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的登录数据验证', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'any-password';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受任意长度的密码（只要非空）', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'x'; // 单字符密码在登录时是允许的

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('email 字段验证', () => {
    it('应该拒绝空的邮箱地址', async () => {
      const dto = new LoginDto();
      dto.email = '';
      dto.password = 'password';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.isEmail).toContain(
        '请输入有效的邮箱地址',
      );
    });

    it('应该拒绝无效格式的邮箱地址', async () => {
      const dto = new LoginDto();
      dto.email = 'not-a-valid-email';
      dto.password = 'password';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints?.isEmail).toContain(
        '请输入有效的邮箱地址',
      );
    });

    it('应该拒绝缺少email字段', async () => {
      const dto = new LoginDto();
      dto.password = 'password';
      // 故意不设置 email

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('应该拒绝非字符串的email值', async () => {
      const dto = new LoginDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).email = 12345; // 故意使用错误类型以测试验证器
      dto.password = 'password';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((err) => err.property === 'email');
      expect(emailError).toBeDefined();
    });
  });

  describe('password 字段验证', () => {
    it('应该拒绝空的密码', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.minLength).toContain('密码不能为空');
    });

    it('应该拒绝缺少password字段', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      // 故意不设置 password

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('应该拒绝非字符串的password值', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).password = 12345; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((err) => err.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.isString).toContain(
        '密码必须是字符串',
      );
    });
  });
});

describe('RefreshTokenDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的刷新Token验证', async () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken = 'valid-refresh-token-string';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受JWT格式的Token字符串', async () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('refreshToken 字段验证', () => {
    it('应该拒绝空的refreshToken', async () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tokenError = errors.find((err) => err.property === 'refreshToken');
      expect(tokenError).toBeDefined();
      expect(tokenError?.constraints?.minLength).toContain(
        'Refresh token不能为空',
      );
    });

    it('应该拒绝缺少refreshToken字段', async () => {
      const dto = new RefreshTokenDto();
      // 故意不设置 refreshToken

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tokenError = errors.find((err) => err.property === 'refreshToken');
      expect(tokenError).toBeDefined();
    });

    it('应该拒绝非字符串的refreshToken值', async () => {
      const dto = new RefreshTokenDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).refreshToken = 12345; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tokenError = errors.find((err) => err.property === 'refreshToken');
      expect(tokenError).toBeDefined();
      expect(tokenError?.constraints?.isString).toContain(
        'Refresh token必须是字符串',
      );
    });
  });
});

describe('类型推导和导出', () => {
  it('应该确保所有DTO类能正确实例化', () => {
    const registerDto = new RegisterDto();
    const loginDto = new LoginDto();
    const refreshTokenDto = new RefreshTokenDto();

    expect(registerDto).toBeInstanceOf(RegisterDto);
    expect(loginDto).toBeInstanceOf(LoginDto);
    expect(refreshTokenDto).toBeInstanceOf(RefreshTokenDto);
  });

  it('应该验证DTO属性的可赋值性', () => {
    const registerDto = new RegisterDto();
    registerDto.email = 'test@example.com';
    registerDto.password = 'TestPassword123!';

    expect(registerDto.email).toBe('test@example.com');
    expect(registerDto.password).toBe('TestPassword123!');

    const loginDto = new LoginDto();
    loginDto.email = 'login@example.com';
    loginDto.password = 'password';

    expect(loginDto.email).toBe('login@example.com');
    expect(loginDto.password).toBe('password');

    const refreshTokenDto = new RefreshTokenDto();
    refreshTokenDto.refreshToken = 'token-string';

    expect(refreshTokenDto.refreshToken).toBe('token-string');
  });
});
