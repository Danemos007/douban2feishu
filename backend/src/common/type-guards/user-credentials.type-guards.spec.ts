/**
 * UserCredentials类型守卫函数单元测试
 *
 * @author Claude
 * @date 2025-09-30
 */

import {
  isUserCredentials,
  isUserCredentialsWithUser,
  isUserCredentialsArray,
  assertIsUserCredentials,
  hasDoubanCredentials,
  hasFeishuCredentials,
  isUserCredentialsComplete,
  hasValidEncryptionIv,
} from './user-credentials.type-guards';

describe('UserCredentials类型守卫测试', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validUserCredentials = {
    userId: validUserId,
    doubanCookieEncrypted: 'encrypted_douban_cookie_content',
    feishuAppId: 'cli_a8f5de628bf5500e',
    feishuAppSecretEncrypted: 'encrypted_feishu_secret_content',
    encryptionIv: '0123456789abcdef0123456789abcdef',
    updatedAt: new Date('2025-01-10T10:00:00Z'),
    createdAt: new Date('2025-01-01T10:00:00Z'),
  };

  const validUser = {
    id: validUserId,
    email: 'test@example.com',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    lastSyncAt: new Date('2025-01-15T12:00:00Z'),
  };

  describe('isUserCredentials', () => {
    describe('✅ 成功路径 (Happy Paths)', () => {
      it('应该对有效的UserCredentials对象返回true', () => {
        expect(isUserCredentials(validUserCredentials)).toBe(true);
      });

      it('应该对所有可选字段为null的UserCredentials对象返回true', () => {
        const credentialsWithNulls = {
          userId: validUserId,
          doubanCookieEncrypted: null,
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
          encryptionIv: 'abcdef0123456789abcdef0123456789',
          updatedAt: new Date('2025-01-10T10:00:00Z'),
          createdAt: new Date('2025-01-01T10:00:00Z'),
        };
        expect(isUserCredentials(credentialsWithNulls)).toBe(true);
      });

      it('应该对包含额外字段的UserCredentials对象返回true (结构子类型)', () => {
        const credentialsWithExtraFields = {
          ...validUserCredentials,
          extraField1: 'extra',
          extraField2: 123,
          extraField3: true,
        };
        expect(isUserCredentials(credentialsWithExtraFields)).toBe(true);
      });
    });

    describe('❌ 失败路径 - 基础类型验证', () => {
      it('应该对null返回false', () => {
        expect(isUserCredentials(null)).toBe(false);
      });

      it('应该对undefined返回false', () => {
        expect(isUserCredentials(undefined)).toBe(false);
      });

      it('应该对非对象类型返回false (string)', () => {
        expect(isUserCredentials('not an object')).toBe(false);
      });

      it('应该对非对象类型返回false (number)', () => {
        expect(isUserCredentials(123)).toBe(false);
      });

      it('应该对非对象类型返回false (boolean)', () => {
        expect(isUserCredentials(true)).toBe(false);
      });

      it('应该对空对象返回false', () => {
        expect(isUserCredentials({})).toBe(false);
      });
    });

    describe('❌ 失败路径 - 必需字段验证', () => {
      it('应该对缺少userId的对象返回false', () => {
        const { userId: _userId, ...credentialsWithoutUserId } =
          validUserCredentials;
        expect(isUserCredentials(credentialsWithoutUserId)).toBe(false);
      });

      it('应该对缺少encryptionIv的对象返回false', () => {
        const { encryptionIv: _encryptionIv, ...credentialsWithoutIv } =
          validUserCredentials;
        expect(isUserCredentials(credentialsWithoutIv)).toBe(false);
      });

      it('应该对缺少createdAt的对象返回false', () => {
        const { createdAt: _createdAt, ...credentialsWithoutCreatedAt } =
          validUserCredentials;
        expect(isUserCredentials(credentialsWithoutCreatedAt)).toBe(false);
      });

      it('应该对缺少updatedAt的对象返回false', () => {
        const { updatedAt: _updatedAt, ...credentialsWithoutUpdatedAt } =
          validUserCredentials;
        expect(isUserCredentials(credentialsWithoutUpdatedAt)).toBe(false);
      });
    });

    describe('❌ 失败路径 - userId字段验证', () => {
      it('应该对userId不是string的对象返回false', () => {
        const credentialsWithInvalidUserId = {
          ...validUserCredentials,
          userId: 12345,
        };
        expect(isUserCredentials(credentialsWithInvalidUserId)).toBe(false);
      });

      it('应该对userId不是有效UUID格式的对象返回false', () => {
        const credentialsWithInvalidUuidFormat = {
          ...validUserCredentials,
          userId: 'not-a-valid-uuid',
        };
        expect(isUserCredentials(credentialsWithInvalidUuidFormat)).toBe(false);
      });

      it('应该对userId为空字符串的对象返回false', () => {
        const credentialsWithEmptyUserId = {
          ...validUserCredentials,
          userId: '',
        };
        expect(isUserCredentials(credentialsWithEmptyUserId)).toBe(false);
      });
    });

    describe('❌ 失败路径 - 加密字段验证 (doubanCookieEncrypted, feishuAppSecretEncrypted)', () => {
      it('应该对doubanCookieEncrypted不是string也不是null的对象返回false', () => {
        const credentialsWithInvalidDouban = {
          ...validUserCredentials,
          doubanCookieEncrypted: 12345,
        };
        expect(isUserCredentials(credentialsWithInvalidDouban)).toBe(false);
      });

      it('应该对feishuAppSecretEncrypted不是string也不是null的对象返回false', () => {
        const credentialsWithInvalidFeishuSecret = {
          ...validUserCredentials,
          feishuAppSecretEncrypted: 12345,
        };
        expect(isUserCredentials(credentialsWithInvalidFeishuSecret)).toBe(
          false,
        );
      });

      it('应该对doubanCookieEncrypted为空字符串的对象返回true (允许空字符串)', () => {
        const credentialsWithEmptyDouban = {
          ...validUserCredentials,
          doubanCookieEncrypted: '',
        };
        expect(isUserCredentials(credentialsWithEmptyDouban)).toBe(true);
      });
    });

    describe('❌ 失败路径 - feishuAppId字段验证', () => {
      it('应该对feishuAppId不是string也不是null的对象返回false', () => {
        const credentialsWithInvalidFeishuAppId = {
          ...validUserCredentials,
          feishuAppId: 12345,
        };
        expect(isUserCredentials(credentialsWithInvalidFeishuAppId)).toBe(
          false,
        );
      });

      it('应该对feishuAppId为空字符串的对象返回false', () => {
        const credentialsWithEmptyFeishuAppId = {
          ...validUserCredentials,
          feishuAppId: '',
        };
        expect(isUserCredentials(credentialsWithEmptyFeishuAppId)).toBe(false);
      });

      it('应该对feishuAppId为有效非空字符串的对象返回true', () => {
        const credentialsWithValidFeishuAppId = {
          ...validUserCredentials,
          feishuAppId: 'cli_valid_app_id',
        };
        expect(isUserCredentials(credentialsWithValidFeishuAppId)).toBe(true);
      });
    });

    describe('❌ 失败路径 - encryptionIv字段验证', () => {
      it('应该对encryptionIv不是string的对象返回false', () => {
        const credentialsWithInvalidIvType = {
          ...validUserCredentials,
          encryptionIv: 12345,
        };
        expect(isUserCredentials(credentialsWithInvalidIvType)).toBe(false);
      });

      it('应该对encryptionIv长度不是32的对象返回false (31字符)', () => {
        const credentialsWithShortIv = {
          ...validUserCredentials,
          encryptionIv: '0123456789abcdef0123456789abcde',
        };
        expect(isUserCredentials(credentialsWithShortIv)).toBe(false);
      });

      it('应该对encryptionIv长度不是32的对象返回false (33字符)', () => {
        const credentialsWithLongIv = {
          ...validUserCredentials,
          encryptionIv: '0123456789abcdef0123456789abcdef0',
        };
        expect(isUserCredentials(credentialsWithLongIv)).toBe(false);
      });

      it('应该对encryptionIv不是有效十六进制的对象返回false', () => {
        const credentialsWithNonHexIv = {
          ...validUserCredentials,
          encryptionIv: 'gggggggggggggggggggggggggggggggg',
        };
        expect(isUserCredentials(credentialsWithNonHexIv)).toBe(false);
      });

      it('应该对encryptionIv包含非十六进制字符的对象返回false', () => {
        const credentialsWithInvalidChars = {
          ...validUserCredentials,
          encryptionIv: '0123456789abcdef0123456789abcdxz',
        };
        expect(isUserCredentials(credentialsWithInvalidChars)).toBe(false);
      });
    });

    describe('❌ 失败路径 - 时间戳字段验证', () => {
      it('应该对createdAt不是Date的对象返回false', () => {
        const credentialsWithInvalidCreatedAt = {
          ...validUserCredentials,
          createdAt: '2025-01-01T10:00:00Z',
        };
        expect(isUserCredentials(credentialsWithInvalidCreatedAt)).toBe(false);
      });

      it('应该对updatedAt不是Date的对象返回false', () => {
        const credentialsWithInvalidUpdatedAt = {
          ...validUserCredentials,
          updatedAt: '2025-01-10T10:00:00Z',
        };
        expect(isUserCredentials(credentialsWithInvalidUpdatedAt)).toBe(false);
      });

      it('应该对createdAt晚于updatedAt的对象返回false', () => {
        const credentialsWithInvalidTimestamps = {
          ...validUserCredentials,
          createdAt: new Date('2025-01-15T10:00:00Z'),
          updatedAt: new Date('2025-01-01T10:00:00Z'),
        };
        expect(isUserCredentials(credentialsWithInvalidTimestamps)).toBe(false);
      });
    });
  });

  describe('isUserCredentialsWithUser', () => {
    describe('✅ 成功路径', () => {
      it('应该对包含有效User关联的UserCredentials对象返回true', () => {
        const credentialsWithUser = {
          ...validUserCredentials,
          user: validUser,
        };
        expect(isUserCredentialsWithUser(credentialsWithUser)).toBe(true);
      });

      it('应该对User关联包含lastSyncAt为null的对象返回true', () => {
        const userWithNullSync = { ...validUser, lastSyncAt: null };
        const credentialsWithUser = {
          ...validUserCredentials,
          user: userWithNullSync,
        };
        expect(isUserCredentialsWithUser(credentialsWithUser)).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对不是有效UserCredentials的对象返回false', () => {
        const invalidCredentials = {
          userId: 12345, // 无效类型
          user: validUser,
        };
        expect(isUserCredentialsWithUser(invalidCredentials)).toBe(false);
      });

      it('应该对没有user字段的UserCredentials对象返回false', () => {
        expect(isUserCredentialsWithUser(validUserCredentials)).toBe(false);
      });

      it('应该对user字段为null的对象返回false', () => {
        const credentialsWithNullUser = {
          ...validUserCredentials,
          user: null,
        };
        expect(isUserCredentialsWithUser(credentialsWithNullUser)).toBe(false);
      });

      it('应该对user字段为undefined的对象返回false', () => {
        const credentialsWithUndefinedUser = {
          ...validUserCredentials,
          user: undefined,
        };
        expect(isUserCredentialsWithUser(credentialsWithUndefinedUser)).toBe(
          false,
        );
      });

      it('应该对user字段不是有效User的对象返回false', () => {
        const credentialsWithInvalidUser = {
          ...validUserCredentials,
          user: { id: 123, email: 'invalid' },
        };
        expect(isUserCredentialsWithUser(credentialsWithInvalidUser)).toBe(
          false,
        );
      });
    });
  });

  describe('isUserCredentialsArray', () => {
    describe('✅ 成功路径', () => {
      it('应该对空数组返回true', () => {
        expect(isUserCredentialsArray([])).toBe(true);
      });

      it('应该对包含单个有效UserCredentials的数组返回true', () => {
        expect(isUserCredentialsArray([validUserCredentials])).toBe(true);
      });

      it('应该对包含多个有效UserCredentials的数组返回true', () => {
        const credentials2 = {
          ...validUserCredentials,
          userId: '987e6543-a21b-12c7-b654-321098765432',
        };
        const credentials3 = {
          ...validUserCredentials,
          userId: '111e2222-a333-44b5-8666-777788889999',
          doubanCookieEncrypted: null,
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
        };
        expect(
          isUserCredentialsArray([
            validUserCredentials,
            credentials2,
            credentials3,
          ]),
        ).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对非数组返回false', () => {
        expect(isUserCredentialsArray(validUserCredentials)).toBe(false);
        expect(isUserCredentialsArray('not an array')).toBe(false);
        expect(isUserCredentialsArray(123)).toBe(false);
        expect(isUserCredentialsArray(null)).toBe(false);
        expect(isUserCredentialsArray(undefined)).toBe(false);
      });

      it('应该对包含无效UserCredentials元素的数组返回false', () => {
        const invalidCredentials = {
          userId: 12345, // 无效类型
          encryptionIv: '0123456789abcdef0123456789abcdef',
        };
        expect(
          isUserCredentialsArray([validUserCredentials, invalidCredentials]),
        ).toBe(false);
      });

      it('应该对包含null元素的数组返回false', () => {
        expect(isUserCredentialsArray([validUserCredentials, null])).toBe(
          false,
        );
      });

      it('应该对包含undefined元素的数组返回false', () => {
        expect(isUserCredentialsArray([validUserCredentials, undefined])).toBe(
          false,
        );
      });
    });
  });

  describe('assertIsUserCredentials', () => {
    describe('✅ 成功路径', () => {
      it('应该对有效UserCredentials对象不抛出错误', () => {
        expect(() =>
          assertIsUserCredentials(validUserCredentials),
        ).not.toThrow();
      });

      it('应该对所有可选字段为null的UserCredentials对象不抛出错误', () => {
        const credentialsWithNulls = {
          userId: validUserId,
          doubanCookieEncrypted: null,
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
          encryptionIv: 'abcdef0123456789abcdef0123456789',
          updatedAt: new Date('2025-01-10T10:00:00Z'),
          createdAt: new Date('2025-01-01T10:00:00Z'),
        };
        expect(() =>
          assertIsUserCredentials(credentialsWithNulls),
        ).not.toThrow();
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对无效UserCredentials对象抛出包含详细信息的错误', () => {
        const invalidCredentials = { userId: 123 };
        expect(() => assertIsUserCredentials(invalidCredentials)).toThrow(
          'Object is not a valid UserCredentials type',
        );
      });

      it('应该对null抛出包含详细信息的错误', () => {
        expect(() => assertIsUserCredentials(null)).toThrow(
          'Object is not a valid UserCredentials type',
        );
      });

      it('应该对undefined抛出包含详细信息的错误', () => {
        expect(() => assertIsUserCredentials(undefined)).toThrow(
          'Object is not a valid UserCredentials type',
        );
      });

      it('错误信息应该包含接收到的对象的JSON表示', () => {
        const invalidCredentials = { userId: 123, email: 'test@example.com' };
        try {
          assertIsUserCredentials(invalidCredentials);
          fail('Expected error to be thrown');
        } catch (error) {
          expect((error as Error).message).toContain(
            'Object is not a valid UserCredentials type',
          );
          expect((error as Error).message).toContain('"userId": 123');
          expect((error as Error).message).toContain(
            '"email": "test@example.com"',
          );
        }
      });
    });
  });

  describe('hasDoubanCredentials', () => {
    describe('✅ 成功路径', () => {
      it('应该对包含非空doubanCookieEncrypted的凭证返回true', () => {
        expect(hasDoubanCredentials(validUserCredentials)).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对doubanCookieEncrypted为null的凭证返回false', () => {
        const credentialsWithNullDouban = {
          ...validUserCredentials,
          doubanCookieEncrypted: null,
        };
        expect(hasDoubanCredentials(credentialsWithNullDouban)).toBe(false);
      });

      it('应该对doubanCookieEncrypted为空字符串的凭证返回false', () => {
        const credentialsWithEmptyDouban = {
          ...validUserCredentials,
          doubanCookieEncrypted: '',
        };
        expect(hasDoubanCredentials(credentialsWithEmptyDouban)).toBe(false);
      });
    });
  });

  describe('hasFeishuCredentials', () => {
    describe('✅ 成功路径', () => {
      it('应该对包含完整飞书配置的凭证返回true', () => {
        expect(hasFeishuCredentials(validUserCredentials)).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对feishuAppId为null的凭证返回false', () => {
        const credentialsWithNullAppId = {
          ...validUserCredentials,
          feishuAppId: null,
        };
        expect(hasFeishuCredentials(credentialsWithNullAppId)).toBe(false);
      });

      it('应该对feishuAppId为空字符串的凭证返回false', () => {
        const credentialsWithEmptyAppId = {
          ...validUserCredentials,
          feishuAppId: '',
        };
        expect(hasFeishuCredentials(credentialsWithEmptyAppId)).toBe(false);
      });

      it('应该对feishuAppSecretEncrypted为null的凭证返回false', () => {
        const credentialsWithNullSecret = {
          ...validUserCredentials,
          feishuAppSecretEncrypted: null,
        };
        expect(hasFeishuCredentials(credentialsWithNullSecret)).toBe(false);
      });

      it('应该对feishuAppSecretEncrypted为空字符串的凭证返回false', () => {
        const credentialsWithEmptySecret = {
          ...validUserCredentials,
          feishuAppSecretEncrypted: '',
        };
        expect(hasFeishuCredentials(credentialsWithEmptySecret)).toBe(false);
      });

      it('应该对只有feishuAppId或feishuAppSecretEncrypted之一的凭证返回false', () => {
        const credentialsWithOnlyAppId = {
          ...validUserCredentials,
          feishuAppSecretEncrypted: null,
        };
        expect(hasFeishuCredentials(credentialsWithOnlyAppId)).toBe(false);

        const credentialsWithOnlySecret = {
          ...validUserCredentials,
          feishuAppId: null,
        };
        expect(hasFeishuCredentials(credentialsWithOnlySecret)).toBe(false);
      });
    });
  });

  describe('isUserCredentialsComplete', () => {
    describe('✅ 成功路径', () => {
      it('应该对包含完整豆瓣和飞书配置的凭证返回true', () => {
        expect(isUserCredentialsComplete(validUserCredentials)).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对只包含豆瓣配置的凭证返回false', () => {
        const credentialsWithOnlyDouban = {
          ...validUserCredentials,
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
        };
        expect(isUserCredentialsComplete(credentialsWithOnlyDouban)).toBe(
          false,
        );
      });

      it('应该对只包含飞书配置的凭证返回false', () => {
        const credentialsWithOnlyFeishu = {
          ...validUserCredentials,
          doubanCookieEncrypted: null,
        };
        expect(isUserCredentialsComplete(credentialsWithOnlyFeishu)).toBe(
          false,
        );
      });

      it('应该对豆瓣和飞书配置都缺失的凭证返回false', () => {
        const credentialsWithNoConfig = {
          ...validUserCredentials,
          doubanCookieEncrypted: null,
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
        };
        expect(isUserCredentialsComplete(credentialsWithNoConfig)).toBe(false);
      });
    });
  });

  describe('hasValidEncryptionIv', () => {
    describe('✅ 成功路径', () => {
      it('应该对包含有效32位十六进制IV的凭证返回true (小写)', () => {
        const credentialsWithLowercaseIv = {
          ...validUserCredentials,
          encryptionIv: 'abcdef0123456789abcdef0123456789',
        };
        expect(hasValidEncryptionIv(credentialsWithLowercaseIv)).toBe(true);
      });

      it('应该对包含有效32位十六进制IV的凭证返回true (大写)', () => {
        const credentialsWithUppercaseIv = {
          ...validUserCredentials,
          encryptionIv: 'ABCDEF0123456789ABCDEF0123456789',
        };
        expect(hasValidEncryptionIv(credentialsWithUppercaseIv)).toBe(true);
      });
    });

    describe('❌ 失败路径', () => {
      it('应该对IV长度不是32的凭证返回false', () => {
        const credentialsWithShortIv = {
          ...validUserCredentials,
          encryptionIv: '0123456789abcdef',
        };
        expect(hasValidEncryptionIv(credentialsWithShortIv)).toBe(false);
      });

      it('应该对IV不是有效十六进制的凭证返回false', () => {
        const credentialsWithInvalidIv = {
          ...validUserCredentials,
          encryptionIv: 'gggggggggggggggggggggggggggggggg',
        };
        expect(hasValidEncryptionIv(credentialsWithInvalidIv)).toBe(false);
      });
    });
  });

  describe('边界情况和综合测试', () => {
    it('应该正确处理各种原始类型 (string, number, boolean)', () => {
      expect(isUserCredentials('string')).toBe(false);
      expect(isUserCredentials(123)).toBe(false);
      expect(isUserCredentials(true)).toBe(false);
      expect(isUserCredentials(false)).toBe(false);
      expect(isUserCredentials(NaN)).toBe(false);
      expect(isUserCredentials(Infinity)).toBe(false);
    });

    it('应该正确处理特殊对象 (Date, Array, RegExp, Error)', () => {
      expect(isUserCredentials(new Date())).toBe(false);
      expect(isUserCredentials([])).toBe(false);
      expect(isUserCredentials([1, 2, 3])).toBe(false);
      expect(isUserCredentials(/regex/)).toBe(false);
      expect(isUserCredentials(new Error('error'))).toBe(false);
    });

    it('应该正确处理createdAt等于updatedAt的UserCredentials (边界情况)', () => {
      const credentialsWithSameTimestamps = {
        ...validUserCredentials,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-01T10:00:00Z'),
      };
      expect(isUserCredentials(credentialsWithSameTimestamps)).toBe(true);
    });

    it('应该正确处理包含所有可选字段为null的最小有效UserCredentials', () => {
      const minimalCredentials = {
        userId: validUserId,
        doubanCookieEncrypted: null,
        feishuAppId: null,
        feishuAppSecretEncrypted: null,
        encryptionIv: 'abcdef0123456789abcdef0123456789',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      expect(isUserCredentials(minimalCredentials)).toBe(true);
      expect(hasDoubanCredentials(minimalCredentials)).toBe(false);
      expect(hasFeishuCredentials(minimalCredentials)).toBe(false);
      expect(isUserCredentialsComplete(minimalCredentials)).toBe(false);
    });

    it('应该正确处理包含所有字段的完整UserCredentials', () => {
      const completeCredentials = {
        userId: validUserId,
        doubanCookieEncrypted: 'encrypted_douban_cookie',
        feishuAppId: 'cli_valid_app_id',
        feishuAppSecretEncrypted: 'encrypted_feishu_secret',
        encryptionIv: 'ABCDEF0123456789abcdef0123456789',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      expect(isUserCredentials(completeCredentials)).toBe(true);
      expect(hasDoubanCredentials(completeCredentials)).toBe(true);
      expect(hasFeishuCredentials(completeCredentials)).toBe(true);
      expect(isUserCredentialsComplete(completeCredentials)).toBe(true);
      expect(hasValidEncryptionIv(completeCredentials)).toBe(true);
    });
  });
});
