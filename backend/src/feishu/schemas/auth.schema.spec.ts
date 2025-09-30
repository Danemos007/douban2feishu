/**
 * 飞书认证Schema单元测试
 *
 * 测试原则:
 * 1. 验证所有Schema的正向和反向验证逻辑
 * 2. 测试辅助函数的时间计算和过期检查逻辑
 * 3. 确保95%以上的代码覆盖率
 * 4. 验证类型推导和Schema导出的正确性
 *
 * 目标覆盖率: 95%+
 */

import {
  FeishuAuthRequestSchema,
  FeishuTokenResponseSchema,
  TokenCacheInfoSchema,
  TokenStatsSchema,
  calculateTokenExpiry,
  isTokenExpiringSoon,
  type FeishuAuthRequest,
  type FeishuTokenResponse,
  type TokenCacheInfo,
  type TokenStats,
} from './auth.schema';

describe('FeishuAuthRequestSchema', () => {
  it('应该验证有效的认证请求', () => {
    const validRequest = {
      app_id: 'cli_your_app_id_here',
      app_secret: 'your_app_secret_here',
    };

    const result = FeishuAuthRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_id).toBe(validRequest.app_id);
      expect(result.data.app_secret).toBe(validRequest.app_secret);
    }
  });

  it('应该拒绝空的app_id', () => {
    const invalidRequest = {
      app_id: '',
      app_secret: 'valid_secret',
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('app_id不能为空');
    }
  });

  it('应该拒绝空的app_secret', () => {
    const invalidRequest = {
      app_id: 'valid_app_id',
      app_secret: '',
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('app_secret不能为空');
    }
  });

  it('应该拒绝缺少app_id字段', () => {
    const invalidRequest = {
      app_secret: 'valid_secret',
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });

  it('应该拒绝缺少app_secret字段', () => {
    const invalidRequest = {
      app_id: 'valid_app_id',
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });

  it('应该拒绝非字符串的app_id', () => {
    const invalidRequest = {
      app_id: 123,
      app_secret: 'valid_secret',
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });

  it('应该拒绝非字符串的app_secret', () => {
    const invalidRequest = {
      app_id: 'valid_app_id',
      app_secret: 123,
    };

    const result = FeishuAuthRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });
});

describe('FeishuTokenResponseSchema', () => {
  it('应该验证标准的Token响应', () => {
    const validResponse = {
      code: 0,
      expire: 7199,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const result = FeishuTokenResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe(0);
      expect(result.data.expire).toBe(7199);
      expect(result.data.msg).toBe('ok');
      expect(result.data.tenant_access_token).toBe(
        validResponse.tenant_access_token,
      );
    }
  });

  it('应该支持passthrough额外字段', () => {
    const responseWithExtra = {
      code: 0,
      expire: 7199,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      extra_field: 'should be preserved',
      another_field: 42,
    };

    const result = FeishuTokenResponseSchema.safeParse(responseWithExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra_field).toBe('should be preserved');
      expect(result.data.another_field).toBe(42);
    }
  });

  it('应该拒绝非0的code值', () => {
    const invalidResponse = {
      code: 1,
      expire: 7199,
      msg: 'error',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const result = FeishuTokenResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_literal');
    }
  });

  it('应该拒绝空的tenant_access_token', () => {
    const invalidResponse = {
      code: 0,
      expire: 7199,
      msg: 'ok',
      tenant_access_token: '',
    };

    const result = FeishuTokenResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        'tenant_access_token不能为空',
      );
    }
  });

  it('应该拒绝非正数的expire值', () => {
    const invalidResponse = {
      code: 0,
      expire: -100,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const result = FeishuTokenResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('expire必须为正数');
    }
  });

  it('应该拒绝零值的expire', () => {
    const invalidResponse = {
      code: 0,
      expire: 0,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const result = FeishuTokenResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('expire必须为正数');
    }
  });

  it('应该拒绝缺少必需字段', () => {
    const incompleteResponse = {
      code: 0,
      msg: 'ok',
      // 缺少 tenant_access_token 和 expire
    };

    const result = FeishuTokenResponseSchema.safeParse(incompleteResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('应该拒绝错误的字段类型', () => {
    const invalidResponse = {
      code: 0,
      expire: '7199', // 应该是number
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const result = FeishuTokenResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('invalid_type');
    }
  });
});

describe('TokenCacheInfoSchema', () => {
  it('应该验证有效的缓存信息', () => {
    const validCacheInfo = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: Date.now() + 7200000,
      createdAt: Date.now(),
      appId: 'cli_your_app_id_here',
    };

    const result = TokenCacheInfoSchema.safeParse(validCacheInfo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe(validCacheInfo.token);
      expect(result.data.expiresAt).toBe(validCacheInfo.expiresAt);
      expect(result.data.createdAt).toBe(validCacheInfo.createdAt);
      expect(result.data.appId).toBe(validCacheInfo.appId);
    }
  });

  it('应该拒绝空的token', () => {
    const invalidCacheInfo = {
      token: '',
      expiresAt: Date.now() + 7200000,
      createdAt: Date.now(),
      appId: 'cli_your_app_id_here',
    };

    const result = TokenCacheInfoSchema.safeParse(invalidCacheInfo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝非正数的expiresAt', () => {
    const invalidCacheInfo = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: -1000,
      createdAt: Date.now(),
      appId: 'cli_your_app_id_here',
    };

    const result = TokenCacheInfoSchema.safeParse(invalidCacheInfo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝零值的expiresAt', () => {
    const invalidCacheInfo = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: 0,
      createdAt: Date.now(),
      appId: 'cli_your_app_id_here',
    };

    const result = TokenCacheInfoSchema.safeParse(invalidCacheInfo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝非正数的createdAt', () => {
    const invalidCacheInfo = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: Date.now() + 7200000,
      createdAt: -1000,
      appId: 'cli_your_app_id_here',
    };

    const result = TokenCacheInfoSchema.safeParse(invalidCacheInfo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝空的appId', () => {
    const invalidCacheInfo = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: Date.now() + 7200000,
      createdAt: Date.now(),
      appId: '',
    };

    const result = TokenCacheInfoSchema.safeParse(invalidCacheInfo);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝缺少必需字段', () => {
    const incompleteCache = {
      token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expiresAt: Date.now() + 7200000,
      // 缺少 createdAt 和 appId
    };

    const result = TokenCacheInfoSchema.safeParse(incompleteCache);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('TokenStatsSchema', () => {
  it('应该验证有效的统计信息', () => {
    const validStats = {
      totalApps: 5,
      cachedTokens: 3,
      expiringSoon: 1,
    };

    const result = TokenStatsSchema.safeParse(validStats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalApps).toBe(validStats.totalApps);
      expect(result.data.cachedTokens).toBe(validStats.cachedTokens);
      expect(result.data.expiringSoon).toBe(validStats.expiringSoon);
    }
  });

  it('应该拒绝负数的totalApps', () => {
    const invalidStats = {
      totalApps: -1,
      cachedTokens: 3,
      expiringSoon: 1,
    };

    const result = TokenStatsSchema.safeParse(invalidStats);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝负数的cachedTokens', () => {
    const invalidStats = {
      totalApps: 5,
      cachedTokens: -1,
      expiringSoon: 1,
    };

    const result = TokenStatsSchema.safeParse(invalidStats);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该拒绝负数的expiringSoon', () => {
    const invalidStats = {
      totalApps: 5,
      cachedTokens: 3,
      expiringSoon: -1,
    };

    const result = TokenStatsSchema.safeParse(invalidStats);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toBe('too_small');
    }
  });

  it('应该允许0值', () => {
    const zeroStats = {
      totalApps: 0,
      cachedTokens: 0,
      expiringSoon: 0,
    };

    const result = TokenStatsSchema.safeParse(zeroStats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalApps).toBe(0);
      expect(result.data.cachedTokens).toBe(0);
      expect(result.data.expiringSoon).toBe(0);
    }
  });
});

describe('calculateTokenExpiry', () => {
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    // Mock Date.now() 为固定值以便测试
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000000000);
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  it('应该计算正确的过期时间戳', () => {
    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 7200, // 2小时
      msg: 'ok',
      tenant_access_token: 't-test-token',
    };

    const expectedExpiry = 1000000000000 + 7200 * 1000 - 60000; // 当前时间 + 2小时 - 1分钟
    const result = calculateTokenExpiry(tokenResponse);

    expect(result).toBe(expectedExpiry);
  });

  it('应该提前1分钟设置过期时间', () => {
    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 3600, // 1小时
      msg: 'ok',
      tenant_access_token: 't-test-token',
    };

    const result = calculateTokenExpiry(tokenResponse);
    const expectedWithoutBuffer = 1000000000000 + 3600 * 1000;
    const actualBuffer = expectedWithoutBuffer - result;

    expect(actualBuffer).toBe(60000); // 1分钟的缓冲时间
  });

  it('应该处理不同的expire值', () => {
    const testCases = [
      { expire: 1800, expected: 1000000000000 + 1800 * 1000 - 60000 },
      { expire: 7200, expected: 1000000000000 + 7200 * 1000 - 60000 },
      { expire: 10800, expected: 1000000000000 + 10800 * 1000 - 60000 },
    ];

    testCases.forEach(({ expire, expected }) => {
      const tokenResponse: FeishuTokenResponse = {
        code: 0,
        expire,
        msg: 'ok',
        tenant_access_token: 't-test-token',
      };

      expect(calculateTokenExpiry(tokenResponse)).toBe(expected);
    });
  });

  it('应该基于当前时间计算', () => {
    // 测试不同的当前时间
    const testTimes = [1500000000000, 2000000000000, 2500000000000];

    testTimes.forEach((currentTime) => {
      mockDateNow.mockReturnValue(currentTime);

      const tokenResponse: FeishuTokenResponse = {
        code: 0,
        expire: 3600,
        msg: 'ok',
        tenant_access_token: 't-test-token',
      };

      const result = calculateTokenExpiry(tokenResponse);
      const expected = currentTime + 3600 * 1000 - 60000;

      expect(result).toBe(expected);
    });
  });
});

describe('isTokenExpiringSoon', () => {
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000000000000);
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });

  it('应该识别即将过期的Token', () => {
    const expiringSoonCache: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: 1000000000000 + 200000, // 3分20秒后过期，小于默认阈值5分钟
      createdAt: 1000000000000 - 3600000,
      appId: 'test-app-id',
    };

    const result = isTokenExpiringSoon(expiringSoonCache);
    expect(result).toBe(true);
  });

  it('应该识别未过期的Token', () => {
    const notExpiringCache: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: 1000000000000 + 600000, // 10分钟后过期，大于默认阈值5分钟
      createdAt: 1000000000000 - 3600000,
      appId: 'test-app-id',
    };

    const result = isTokenExpiringSoon(notExpiringCache);
    expect(result).toBe(false);
  });

  it('应该使用默认阈值5分钟', () => {
    const borderlineCache: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: 1000000000000 + 300000, // 正好5分钟后过期
      createdAt: 1000000000000 - 3600000,
      appId: 'test-app-id',
    };

    const result = isTokenExpiringSoon(borderlineCache);
    expect(result).toBe(false); // 等于阈值时不算即将过期
  });

  it('应该支持自定义阈值', () => {
    const customThresholdCache: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: 1000000000000 + 450000, // 7.5分钟后过期
      createdAt: 1000000000000 - 3600000,
      appId: 'test-app-id',
    };

    // 使用10分钟阈值
    const resultWith10Min = isTokenExpiringSoon(customThresholdCache, 600000);
    expect(resultWith10Min).toBe(true);

    // 使用3分钟阈值
    const resultWith3Min = isTokenExpiringSoon(customThresholdCache, 180000);
    expect(resultWith3Min).toBe(false);
  });

  it('应该处理已过期的Token', () => {
    const expiredCache: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: 1000000000000 - 100000, // 已过期
      createdAt: 1000000000000 - 3600000,
      appId: 'test-app-id',
    };

    const result = isTokenExpiringSoon(expiredCache);
    expect(result).toBe(true); // 已过期算作即将过期
  });

  it('应该处理边界情况', () => {
    const testCases = [
      {
        description: '正好在阈值边界',
        expiresAt: 1000000000000 + 299999, // 比5分钟少1ms
        expected: true,
      },
      {
        description: '刚好超过阈值',
        expiresAt: 1000000000000 + 300001, // 比5分钟多1ms
        expected: false,
      },
    ];

    testCases.forEach(({ expiresAt, expected }) => {
      const cache: TokenCacheInfo = {
        token: 't-test-token',
        expiresAt,
        createdAt: 1000000000000 - 3600000,
        appId: 'test-app-id',
      };

      expect(isTokenExpiringSoon(cache)).toBe(expected);
    });
  });
});

describe('类型导出', () => {
  it('应该正确导出所有类型', () => {
    // 验证类型能够正确推导
    const authRequest: FeishuAuthRequest = {
      app_id: 'test_id',
      app_secret: 'test_secret',
    };

    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 7200,
      msg: 'ok',
      tenant_access_token: 't-test-token',
    };

    const cacheInfo: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: Date.now() + 7200000,
      createdAt: Date.now(),
      appId: 'test-app-id',
    };

    const stats: TokenStats = {
      totalApps: 5,
      cachedTokens: 3,
      expiringSoon: 1,
    };

    // 这些赋值应该无类型错误
    expect(authRequest.app_id).toBeDefined();
    expect(tokenResponse.code).toBe(0);
    expect(cacheInfo.token).toBeDefined();
    expect(stats.totalApps).toBe(5);
  });

  it('应该确保类型与Schema同步', () => {
    // 验证Schema能正确解析对应的类型
    const authRequest: FeishuAuthRequest = {
      app_id: 'test_id',
      app_secret: 'test_secret',
    };

    const authResult = FeishuAuthRequestSchema.safeParse(authRequest);
    expect(authResult.success).toBe(true);

    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 7200,
      msg: 'ok',
      tenant_access_token: 't-test-token',
    };

    const tokenResult = FeishuTokenResponseSchema.safeParse(tokenResponse);
    expect(tokenResult.success).toBe(true);

    const cacheInfo: TokenCacheInfo = {
      token: 't-test-token',
      expiresAt: Date.now() + 7200000,
      createdAt: Date.now(),
      appId: 'test-app-id',
    };

    const cacheResult = TokenCacheInfoSchema.safeParse(cacheInfo);
    expect(cacheResult.success).toBe(true);

    const stats: TokenStats = {
      totalApps: 5,
      cachedTokens: 3,
      expiringSoon: 1,
    };

    const statsResult = TokenStatsSchema.safeParse(stats);
    expect(statsResult.success).toBe(true);
  });
});

describe('集成测试', () => {
  it('应该完整测试认证流程的数据流', () => {
    // 1. 创建认证请求
    const authRequest: FeishuAuthRequest = {
      app_id: 'cli_your_app_id_here',
      app_secret: 'your_app_secret_here',
    };

    const authValidation = FeishuAuthRequestSchema.safeParse(authRequest);
    expect(authValidation.success).toBe(true);

    // 2. 模拟API响应
    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 7199,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    };

    const tokenValidation = FeishuTokenResponseSchema.safeParse(tokenResponse);
    expect(tokenValidation.success).toBe(true);

    // 3. 计算过期时间并创建缓存信息
    const expiryTime = calculateTokenExpiry(tokenResponse);
    const cacheInfo: TokenCacheInfo = {
      token: tokenResponse.tenant_access_token,
      expiresAt: expiryTime,
      createdAt: Date.now(),
      appId: authRequest.app_id,
    };

    const cacheValidation = TokenCacheInfoSchema.safeParse(cacheInfo);
    expect(cacheValidation.success).toBe(true);

    // 4. 检查是否即将过期
    const willExpireSoon = isTokenExpiringSoon(cacheInfo);
    expect(typeof willExpireSoon).toBe('boolean');

    // 5. 生成统计信息
    const stats: TokenStats = {
      totalApps: 1,
      cachedTokens: 1,
      expiringSoon: willExpireSoon ? 1 : 0,
    };

    const statsValidation = TokenStatsSchema.safeParse(stats);
    expect(statsValidation.success).toBe(true);
  });

  it('应该验证Schema间的数据兼容性', () => {
    // 测试从Token响应创建缓存信息的兼容性
    const tokenResponse: FeishuTokenResponse = {
      code: 0,
      expire: 3600,
      msg: 'success',
      tenant_access_token: 't-compatible-test-token',
      extra_data: 'should be preserved',
    };

    expect(FeishuTokenResponseSchema.safeParse(tokenResponse).success).toBe(
      true,
    );

    // Token响应数据应该能用于创建缓存信息
    const cacheInfo: TokenCacheInfo = {
      token: tokenResponse.tenant_access_token,
      expiresAt: calculateTokenExpiry(tokenResponse),
      createdAt: Date.now(),
      appId: 'test-app',
    };

    expect(TokenCacheInfoSchema.safeParse(cacheInfo).success).toBe(true);
    expect(cacheInfo.token).toBe(tokenResponse.tenant_access_token);

    // 验证过期检查函数能处理生成的缓存信息
    const expiring = isTokenExpiringSoon(cacheInfo);
    expect(typeof expiring).toBe('boolean');
  });
});
