/**
 * 类型守卫函数单元测试
 *
 * @author Claude
 * @date 2025-09-09
 */

import {
  isUser,
  isUserArray,
  assertIsUser,
  isUserCredentials,
  assertIsUserCredentials,
  hasDoubanCredentials,
  hasFeishuCredentials,
  isUserCredentialsComplete,
  isSyncHistory,
  assertIsSyncHistory,
  isSyncHistoryCompleted,
  isSyncHistoryRunning,
} from '../index';

describe('User类型守卫测试', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    createdAt: new Date(),
    lastSyncAt: new Date(),
  };

  const invalidUser = {
    id: 123, // 错误类型，应该是string
    email: 'test@example.com',
    createdAt: new Date(),
  };

  describe('isUser', () => {
    it('应该对有效的User对象返回true', () => {
      expect(isUser(validUser)).toBe(true);
    });

    it('应该对lastSyncAt为null的User对象返回true', () => {
      const userWithNullSync = { ...validUser, lastSyncAt: null };
      expect(isUser(userWithNullSync)).toBe(true);
    });

    it('应该对无效的User对象返回false', () => {
      expect(isUser(invalidUser)).toBe(false);
      expect(isUser(null)).toBe(false);
      expect(isUser(undefined)).toBe(false);
      expect(isUser({})).toBe(false);
      expect(isUser('not an object')).toBe(false);
    });
  });

  describe('isUserArray', () => {
    it('应该对有效的User数组返回true', () => {
      expect(isUserArray([validUser])).toBe(true);
      expect(isUserArray([])).toBe(true);
    });

    it('应该对包含无效元素的数组返回false', () => {
      expect(isUserArray([validUser, invalidUser])).toBe(false);
      expect(isUserArray([validUser, null])).toBe(false);
    });
  });

  describe('assertIsUser', () => {
    it('应该对有效User对象不抛出错误', () => {
      expect(() => assertIsUser(validUser)).not.toThrow();
    });

    it('应该对无效User对象抛出错误', () => {
      expect(() => assertIsUser(invalidUser)).toThrow(
        'Object is not a valid User type',
      );
    });
  });
});

describe('UserCredentials类型守卫测试', () => {
  const validCredentials = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    doubanCookieEncrypted: 'encrypted_cookie_data',
    feishuAppId: 'cli_123456789',
    feishuAppSecretEncrypted: 'encrypted_secret_data',
    encryptionIv: '0123456789abcdef0123456789abcdef',
    updatedAt: new Date(),
    createdAt: new Date(Date.now() - 1000), // 早于updatedAt
  };

  const invalidCredentials = {
    userId: 'invalid-uuid', // 无效UUID
    doubanCookieEncrypted: 'encrypted_cookie_data',
    feishuAppId: 'cli_123456789',
    encryptionIv: '0123456789abcdef', // 长度不足32位
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  describe('isUserCredentials', () => {
    it('应该对有效的UserCredentials对象返回true', () => {
      expect(isUserCredentials(validCredentials)).toBe(true);
    });

    it('应该对可选字段为null的UserCredentials返回true', () => {
      const credentialsWithNulls = {
        ...validCredentials,
        doubanCookieEncrypted: null,
        feishuAppId: null,
        feishuAppSecretEncrypted: null,
      };
      expect(isUserCredentials(credentialsWithNulls)).toBe(true);
    });

    it('应该对无效的UserCredentials对象返回false', () => {
      expect(isUserCredentials(invalidCredentials)).toBe(false);
      expect(isUserCredentials(null)).toBe(false);
      expect(isUserCredentials({})).toBe(false);
    });
  });

  describe('assertIsUserCredentials', () => {
    it('应该对有效UserCredentials对象不抛出错误', () => {
      expect(() => assertIsUserCredentials(validCredentials)).not.toThrow();
    });

    it('应该对无效UserCredentials对象抛出错误', () => {
      expect(() => assertIsUserCredentials(invalidCredentials)).toThrow(
        'Object is not a valid UserCredentials type',
      );
    });
  });

  describe('凭证完整性检查', () => {
    it('hasDoubanCredentials应该正确检查豆瓣配置', () => {
      expect(hasDoubanCredentials(validCredentials)).toBe(true);

      const noDouban = { ...validCredentials, doubanCookieEncrypted: null };
      expect(hasDoubanCredentials(noDouban)).toBe(false);
    });

    it('hasFeishuCredentials应该正确检查飞书配置', () => {
      expect(hasFeishuCredentials(validCredentials)).toBe(true);

      const noFeishu = { ...validCredentials, feishuAppId: null };
      expect(hasFeishuCredentials(noFeishu)).toBe(false);
    });

    it('isUserCredentialsComplete应该检查完整配置', () => {
      expect(isUserCredentialsComplete(validCredentials)).toBe(true);

      const incomplete = { ...validCredentials, doubanCookieEncrypted: null };
      expect(isUserCredentialsComplete(incomplete)).toBe(false);
    });
  });
});

describe('SyncHistory类型守卫测试', () => {
  const validSyncHistory = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '456e7890-f12a-34b5-c678-901234567890',
    triggerType: 'MANUAL' as const,
    status: 'SUCCESS' as const,
    startedAt: new Date(Date.now() - 5000),
    completedAt: new Date(),
    itemsSynced: 42,
    errorMessage: null,
    metadata: { key: 'value' },
    duration: 5000,
  };

  const invalidSyncHistory = {
    id: 'invalid-id', // 应该是有效UUID
    userId: '456e7890-f12a-34b5-c678-901234567890',
    triggerType: 'INVALID_TYPE', // 无效枚举值
    status: 'SUCCESS',
    startedAt: new Date(),
    itemsSynced: -1, // 负数无效
  };

  describe('isSyncHistory', () => {
    it('应该对有效的SyncHistory对象返回true', () => {
      expect(isSyncHistory(validSyncHistory)).toBe(true);
    });

    it('应该对可选字段为null的SyncHistory返回true', () => {
      const historyWithNulls = {
        ...validSyncHistory,
        completedAt: null,
        errorMessage: null,
        metadata: null,
        duration: null,
      };
      expect(isSyncHistory(historyWithNulls)).toBe(true);
    });

    it('应该对无效的SyncHistory对象返回false', () => {
      expect(isSyncHistory(invalidSyncHistory)).toBe(false);
      expect(isSyncHistory(null)).toBe(false);
      expect(isSyncHistory({})).toBe(false);
    });
  });

  describe('assertIsSyncHistory', () => {
    it('应该对有效SyncHistory对象不抛出错误', () => {
      expect(() => assertIsSyncHistory(validSyncHistory)).not.toThrow();
    });

    it('应该对无效SyncHistory对象抛出错误', () => {
      expect(() => assertIsSyncHistory(invalidSyncHistory)).toThrow(
        'Object is not a valid SyncHistory type',
      );
    });
  });

  describe('同步状态检查', () => {
    it('isSyncHistoryCompleted应该正确识别完成状态', () => {
      expect(
        isSyncHistoryCompleted({ ...validSyncHistory, status: 'SUCCESS' }),
      ).toBe(true);
      expect(
        isSyncHistoryCompleted({ ...validSyncHistory, status: 'FAILED' }),
      ).toBe(true);
      expect(
        isSyncHistoryCompleted({ ...validSyncHistory, status: 'CANCELLED' }),
      ).toBe(true);
      expect(
        isSyncHistoryCompleted({ ...validSyncHistory, status: 'RUNNING' }),
      ).toBe(false);
      expect(
        isSyncHistoryCompleted({ ...validSyncHistory, status: 'PENDING' }),
      ).toBe(false);
    });

    it('isSyncHistoryRunning应该正确识别运行状态', () => {
      expect(
        isSyncHistoryRunning({ ...validSyncHistory, status: 'RUNNING' }),
      ).toBe(true);
      expect(
        isSyncHistoryRunning({ ...validSyncHistory, status: 'SUCCESS' }),
      ).toBe(false);
      expect(
        isSyncHistoryRunning({ ...validSyncHistory, status: 'PENDING' }),
      ).toBe(false);
    });
  });
});

describe('边界情况测试', () => {
  it('应该正确处理undefined和null值', () => {
    expect(isUser(undefined)).toBe(false);
    expect(isUser(null)).toBe(false);
    expect(isUserCredentials(undefined)).toBe(false);
    expect(isUserCredentials(null)).toBe(false);
    expect(isSyncHistory(undefined)).toBe(false);
    expect(isSyncHistory(null)).toBe(false);
  });

  it('应该正确处理基本类型', () => {
    expect(isUser('string')).toBe(false);
    expect(isUser(123)).toBe(false);
    expect(isUser(true)).toBe(false);
    expect(isUserCredentials([])).toBe(false);
    expect(isSyncHistory(new Date())).toBe(false);
  });

  it('应该正确处理空对象', () => {
    expect(isUser({})).toBe(false);
    expect(isUserCredentials({})).toBe(false);
    expect(isSyncHistory({})).toBe(false);
  });
});
