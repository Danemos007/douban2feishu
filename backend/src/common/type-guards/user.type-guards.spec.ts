/**
 * User类型守卫函数单元测试
 *
 * @author Claude
 * @date 2025-09-30
 */

import {
  isUser,
  isUserWithRelations,
  isUserArray,
  assertIsUser,
} from './user.type-guards';

describe('User类型守卫测试', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    lastSyncAt: new Date('2025-01-15T12:00:00Z'),
  };

  describe('isUser', () => {
    it('应该对有效的User对象返回true', () => {
      expect(isUser(validUser)).toBe(true);
    });

    it('应该对lastSyncAt为null的User对象返回true', () => {
      const userWithNullSync = { ...validUser, lastSyncAt: null };
      expect(isUser(userWithNullSync)).toBe(true);
    });

    it('应该对lastSyncAt为Date的User对象返回true', () => {
      const userWithDateSync = {
        ...validUser,
        lastSyncAt: new Date('2025-01-20T10:30:00Z'),
      };
      expect(isUser(userWithDateSync)).toBe(true);
    });

    it('应该对null返回false', () => {
      expect(isUser(null)).toBe(false);
    });

    it('应该对undefined返回false', () => {
      expect(isUser(undefined)).toBe(false);
    });

    it('应该对非对象类型返回false (string)', () => {
      expect(isUser('not an object')).toBe(false);
    });

    it('应该对非对象类型返回false (number)', () => {
      expect(isUser(123)).toBe(false);
    });

    it('应该对非对象类型返回false (boolean)', () => {
      expect(isUser(true)).toBe(false);
    });

    it('应该对空对象返回false', () => {
      expect(isUser({})).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少id)', () => {
      const { id: _id, ...userWithoutId } = validUser;
      expect(isUser(userWithoutId)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少email)', () => {
      const { email: _email, ...userWithoutEmail } = validUser;
      expect(isUser(userWithoutEmail)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少createdAt)', () => {
      const { createdAt: _createdAt, ...userWithoutCreatedAt } = validUser;
      expect(isUser(userWithoutCreatedAt)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (id不是string)', () => {
      const userWithInvalidId = { ...validUser, id: 12345 };
      expect(isUser(userWithInvalidId)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (email不是string)', () => {
      const userWithInvalidEmail = { ...validUser, email: 12345 };
      expect(isUser(userWithInvalidEmail)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (createdAt不是Date)', () => {
      const userWithInvalidCreatedAt = {
        ...validUser,
        createdAt: '2025-01-01',
      };
      expect(isUser(userWithInvalidCreatedAt)).toBe(false);
    });

    it('应该对lastSyncAt类型错误的对象返回false (不是Date也不是null)', () => {
      const userWithInvalidLastSync = {
        ...validUser,
        lastSyncAt: '2025-01-15',
      };
      expect(isUser(userWithInvalidLastSync)).toBe(false);
    });
  });

  describe('isUserWithRelations', () => {
    it('应该对仅包含User基础字段的对象返回true', () => {
      expect(isUserWithRelations(validUser)).toBe(true);
    });

    it('应该对包含credentials为null的对象返回true', () => {
      const userWithNullCredentials = { ...validUser, credentials: null };
      expect(isUserWithRelations(userWithNullCredentials)).toBe(true);
    });

    it('应该对包含有效credentials对象的对象返回true', () => {
      const validCredentials = {
        userId: validUser.id,
        doubanCookieEncrypted: 'encrypted_cookie',
        feishuAppId: 'cli_123456',
        feishuAppSecretEncrypted: 'encrypted_secret',
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const userWithCredentials = {
        ...validUser,
        credentials: validCredentials,
      };
      expect(isUserWithRelations(userWithCredentials)).toBe(true);
    });

    it('应该对包含syncConfigs为null的对象返回true', () => {
      const userWithNullSyncConfigs = { ...validUser, syncConfigs: null };
      expect(isUserWithRelations(userWithNullSyncConfigs)).toBe(true);
    });

    it('应该对包含有效syncConfigs对象的对象返回true', () => {
      const validSyncConfig = {
        userId: validUser.id,
        mappingType: 'THREE_TABLES' as const,
        autoSyncEnabled: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: validSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(true);
    });

    it('应该对包含空syncHistory数组的对象返回true', () => {
      const userWithEmptyHistory = { ...validUser, syncHistory: [] };
      expect(isUserWithRelations(userWithEmptyHistory)).toBe(true);
    });

    it('应该对包含有效syncHistory数组的对象返回true', () => {
      const validSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'MANUAL' as const,
        status: 'SUCCESS' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 100,
        errorMessage: null,
      };
      const userWithHistory = { ...validUser, syncHistory: [validSyncHistory] };
      expect(isUserWithRelations(userWithHistory)).toBe(true);
    });

    it('应该对包含所有关联字段的完整对象返回true', () => {
      const validCredentials = {
        userId: validUser.id,
        doubanCookieEncrypted: 'encrypted_cookie',
        feishuAppId: 'cli_123456',
        feishuAppSecretEncrypted: 'encrypted_secret',
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const validSyncConfig = {
        userId: validUser.id,
        mappingType: 'FOUR_TABLES' as const,
        autoSyncEnabled: false,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const validSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'AUTO' as const,
        status: 'PENDING' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: null,
        itemsSynced: 0,
        errorMessage: null,
      };
      const fullUser = {
        ...validUser,
        credentials: validCredentials,
        syncConfigs: validSyncConfig,
        syncHistory: [validSyncHistory],
      };
      expect(isUserWithRelations(fullUser)).toBe(true);
    });

    it('应该对不是有效User的对象返回false', () => {
      const invalidUser = { id: 123, email: 'test@example.com' };
      expect(isUserWithRelations(invalidUser)).toBe(false);
    });

    it('应该对credentials字段类型错误的对象返回false (不是有效UserCredentials)', () => {
      const userWithInvalidCredentials = {
        ...validUser,
        credentials: { userId: 123 }, // 类型错误
      };
      expect(isUserWithRelations(userWithInvalidCredentials)).toBe(false);
    });

    it('应该对syncConfigs字段类型错误的对象返回false (不是有效SyncConfig)', () => {
      const userWithInvalidSyncConfigs = {
        ...validUser,
        syncConfigs: { userId: validUser.id, mappingType: 'INVALID' }, // 无效枚举
      };
      expect(isUserWithRelations(userWithInvalidSyncConfigs)).toBe(false);
    });

    it('应该对syncHistory不是数组的对象返回false', () => {
      const userWithInvalidHistory = {
        ...validUser,
        syncHistory: 'not an array',
      };
      expect(isUserWithRelations(userWithInvalidHistory)).toBe(false);
    });

    it('应该对syncHistory包含无效元素的对象返回false', () => {
      const invalidSyncHistory = {
        id: 'invalid-id',
        userId: validUser.id,
        triggerType: 'INVALID', // 无效枚举
        status: 'SUCCESS',
        startedAt: new Date(),
        itemsSynced: 0,
      };
      const userWithInvalidHistory = {
        ...validUser,
        syncHistory: [invalidSyncHistory],
      };
      expect(isUserWithRelations(userWithInvalidHistory)).toBe(false);
    });
  });

  describe('isUserArray', () => {
    it('应该对空数组返回true', () => {
      expect(isUserArray([])).toBe(true);
    });

    it('应该对包含单个有效User的数组返回true', () => {
      expect(isUserArray([validUser])).toBe(true);
    });

    it('应该对包含多个有效User的数组返回true', () => {
      const user2 = {
        ...validUser,
        id: '987e6543-a21b-98c7-b654-321098765432',
        email: 'user2@example.com',
      };
      const user3 = {
        ...validUser,
        id: '111e2222-a333-44b5-c666-777788889999',
        email: 'user3@example.com',
        lastSyncAt: null,
      };
      expect(isUserArray([validUser, user2, user3])).toBe(true);
    });

    it('应该对非数组返回false', () => {
      expect(isUserArray(validUser)).toBe(false);
      expect(isUserArray('not an array')).toBe(false);
      expect(isUserArray(123)).toBe(false);
      expect(isUserArray(null)).toBe(false);
      expect(isUserArray(undefined)).toBe(false);
    });

    it('应该对包含无效User元素的数组返回false', () => {
      const invalidUser = { id: 123, email: 'test@example.com' };
      expect(isUserArray([validUser, invalidUser])).toBe(false);
    });

    it('应该对包含null元素的数组返回false', () => {
      expect(isUserArray([validUser, null])).toBe(false);
    });

    it('应该对包含undefined元素的数组返回false', () => {
      expect(isUserArray([validUser, undefined])).toBe(false);
    });
  });

  describe('assertIsUser', () => {
    it('应该对有效User对象不抛出错误', () => {
      expect(() => assertIsUser(validUser)).not.toThrow();
    });

    it('应该对有效User对象(lastSyncAt为null)不抛出错误', () => {
      const userWithNullSync = { ...validUser, lastSyncAt: null };
      expect(() => assertIsUser(userWithNullSync)).not.toThrow();
    });

    it('应该对无效User对象抛出包含详细信息的错误', () => {
      const invalidUser = { id: 123, email: 'test@example.com' };
      expect(() => assertIsUser(invalidUser)).toThrow(
        'Object is not a valid User type',
      );
    });

    it('应该对null抛出包含详细信息的错误', () => {
      expect(() => assertIsUser(null)).toThrow(
        'Object is not a valid User type',
      );
    });

    it('应该对undefined抛出包含详细信息的错误', () => {
      expect(() => assertIsUser(undefined)).toThrow(
        'Object is not a valid User type',
      );
    });

    it('错误信息应该包含接收到的对象的JSON表示', () => {
      const invalidUser = { id: 123, email: 'test@example.com' };
      try {
        assertIsUser(invalidUser);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain(
          'Object is not a valid User type',
        );
        expect((error as Error).message).toContain('"id": 123');
        expect((error as Error).message).toContain(
          '"email": "test@example.com"',
        );
      }
    });
  });

  describe('辅助函数 - isUserCredentials (内部函数测试)', () => {
    it('通过isUserWithRelations间接测试：应该拒绝credentials为非对象类型', () => {
      const userWithInvalidCredentials = {
        ...validUser,
        credentials: 'not an object',
      };
      expect(isUserWithRelations(userWithInvalidCredentials)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该接受有效的UserCredentials', () => {
      const validCredentials = {
        userId: validUser.id,
        doubanCookieEncrypted: 'encrypted_cookie',
        feishuAppId: 'cli_123456',
        feishuAppSecretEncrypted: 'encrypted_secret',
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const userWithCredentials = {
        ...validUser,
        credentials: validCredentials,
      };
      expect(isUserWithRelations(userWithCredentials)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该接受所有可选字段为null的UserCredentials', () => {
      const credentialsWithNulls = {
        userId: validUser.id,
        doubanCookieEncrypted: null,
        feishuAppId: null,
        feishuAppSecretEncrypted: null,
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const userWithCredentials = {
        ...validUser,
        credentials: credentialsWithNulls,
      };
      expect(isUserWithRelations(userWithCredentials)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该拒绝缺少必需字段的UserCredentials', () => {
      const incompleteCredentials = {
        userId: validUser.id,
        doubanCookieEncrypted: 'encrypted_cookie',
        // 缺少 encryptionIv
      };
      const userWithCredentials = {
        ...validUser,
        credentials: incompleteCredentials,
      };
      expect(isUserWithRelations(userWithCredentials)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该拒绝字段类型错误的UserCredentials', () => {
      const credentialsWithWrongTypes = {
        userId: 12345, // 应该是string
        doubanCookieEncrypted: 'encrypted_cookie',
        feishuAppId: 'cli_123456',
        feishuAppSecretEncrypted: 'encrypted_secret',
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const userWithCredentials = {
        ...validUser,
        credentials: credentialsWithWrongTypes,
      };
      expect(isUserWithRelations(userWithCredentials)).toBe(false);
    });
  });

  describe('辅助函数 - isSyncConfig (内部函数测试)', () => {
    it('通过isUserWithRelations间接测试：应该拒绝syncConfigs为非对象类型', () => {
      const userWithInvalidSyncConfigs = { ...validUser, syncConfigs: 123 };
      expect(isUserWithRelations(userWithInvalidSyncConfigs)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该接受有效的SyncConfig (THREE_TABLES)', () => {
      const validSyncConfig = {
        userId: validUser.id,
        mappingType: 'THREE_TABLES' as const,
        autoSyncEnabled: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: validSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该接受有效的SyncConfig (FOUR_TABLES)', () => {
      const validSyncConfig = {
        userId: validUser.id,
        mappingType: 'FOUR_TABLES' as const,
        autoSyncEnabled: false,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: validSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该拒绝无效的mappingType', () => {
      const invalidSyncConfig = {
        userId: validUser.id,
        mappingType: 'INVALID_TYPE',
        autoSyncEnabled: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: invalidSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该拒绝autoSyncEnabled不是boolean的对象', () => {
      const invalidSyncConfig = {
        userId: validUser.id,
        mappingType: 'THREE_TABLES',
        autoSyncEnabled: 'true', // 应该是boolean
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: invalidSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该拒绝缺少必需字段的SyncConfig', () => {
      const incompleteSyncConfig = {
        userId: validUser.id,
        mappingType: 'THREE_TABLES',
        // 缺少 autoSyncEnabled
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const userWithSyncConfigs = {
        ...validUser,
        syncConfigs: incompleteSyncConfig,
      };
      expect(isUserWithRelations(userWithSyncConfigs)).toBe(false);
    });
  });

  describe('辅助函数 - isSyncHistory (内部函数测试)', () => {
    it('通过isUserWithRelations间接测试：应该拒绝syncHistory包含非对象元素', () => {
      const userWithInvalidHistory = {
        ...validUser,
        syncHistory: ['not an object'],
      };
      expect(isUserWithRelations(userWithInvalidHistory)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该接受有效的SyncHistory (MANUAL trigger)', () => {
      const validSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'MANUAL' as const,
        status: 'SUCCESS' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 100,
        errorMessage: null,
      };
      const userWithHistory = { ...validUser, syncHistory: [validSyncHistory] };
      expect(isUserWithRelations(userWithHistory)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该接受有效的SyncHistory (AUTO trigger)', () => {
      const validSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'AUTO' as const,
        status: 'FAILED' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 50,
        errorMessage: 'Network timeout',
      };
      const userWithHistory = { ...validUser, syncHistory: [validSyncHistory] };
      expect(isUserWithRelations(userWithHistory)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该接受所有有效的status值', () => {
      const statuses = [
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
      ] as const;

      statuses.forEach((status) => {
        const validSyncHistory = {
          id: '987e6543-a21b-98c7-b654-321098765432',
          userId: validUser.id,
          triggerType: 'MANUAL' as const,
          status,
          startedAt: new Date('2025-01-15T10:00:00Z'),
          completedAt:
            status === 'PENDING' || status === 'RUNNING'
              ? null
              : new Date('2025-01-15T10:05:00Z'),
          itemsSynced: status === 'PENDING' ? 0 : 100,
          errorMessage: status === 'FAILED' ? 'Error occurred' : null,
        };
        const userWithHistory = {
          ...validUser,
          syncHistory: [validSyncHistory],
        };
        expect(isUserWithRelations(userWithHistory)).toBe(true);
      });
    });

    it('通过isUserWithRelations间接测试：应该接受completedAt为null的SyncHistory', () => {
      const runningSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'MANUAL' as const,
        status: 'RUNNING' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: null,
        itemsSynced: 50,
        errorMessage: null,
      };
      const userWithHistory = {
        ...validUser,
        syncHistory: [runningSyncHistory],
      };
      expect(isUserWithRelations(userWithHistory)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该接受errorMessage为null的SyncHistory', () => {
      const successfulSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'AUTO' as const,
        status: 'SUCCESS' as const,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 200,
        errorMessage: null,
      };
      const userWithHistory = {
        ...validUser,
        syncHistory: [successfulSyncHistory],
      };
      expect(isUserWithRelations(userWithHistory)).toBe(true);
    });

    it('通过isUserWithRelations间接测试：应该拒绝无效的triggerType', () => {
      const invalidSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'INVALID_TRIGGER',
        status: 'SUCCESS',
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 100,
        errorMessage: null,
      };
      const userWithHistory = {
        ...validUser,
        syncHistory: [invalidSyncHistory],
      };
      expect(isUserWithRelations(userWithHistory)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该拒绝无效的status', () => {
      const invalidSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'MANUAL',
        status: 'INVALID_STATUS',
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: 100,
        errorMessage: null,
      };
      const userWithHistory = {
        ...validUser,
        syncHistory: [invalidSyncHistory],
      };
      expect(isUserWithRelations(userWithHistory)).toBe(false);
    });

    it('通过isUserWithRelations间接测试：应该拒绝itemsSynced不是number的对象', () => {
      const invalidSyncHistory = {
        id: '987e6543-a21b-98c7-b654-321098765432',
        userId: validUser.id,
        triggerType: 'MANUAL',
        status: 'SUCCESS',
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        itemsSynced: '100', // 应该是number
        errorMessage: null,
      };
      const userWithHistory = {
        ...validUser,
        syncHistory: [invalidSyncHistory],
      };
      expect(isUserWithRelations(userWithHistory)).toBe(false);
    });
  });

  describe('边界情况和综合测试', () => {
    it('应该正确处理各种原始类型 (string, number, boolean)', () => {
      expect(isUser('string')).toBe(false);
      expect(isUser(123)).toBe(false);
      expect(isUser(true)).toBe(false);
      expect(isUser(false)).toBe(false);
      expect(isUser(NaN)).toBe(false);
      expect(isUser(Infinity)).toBe(false);
    });

    it('应该正确处理特殊对象 (Date, Array, RegExp, Error)', () => {
      expect(isUser(new Date())).toBe(false);
      expect(isUser([])).toBe(false);
      expect(isUser([1, 2, 3])).toBe(false);
      expect(isUser(/regex/)).toBe(false);
      expect(isUser(new Error('error'))).toBe(false);
    });

    it('应该正确处理包含额外字段的User对象', () => {
      const userWithExtraFields = {
        ...validUser,
        extraField1: 'extra',
        extraField2: 123,
        extraField3: true,
      };
      expect(isUser(userWithExtraFields)).toBe(true);
    });

    it('应该正确处理深度嵌套的关联数据', () => {
      const validCredentials = {
        userId: validUser.id,
        doubanCookieEncrypted: 'encrypted_cookie',
        feishuAppId: 'cli_123456',
        feishuAppSecretEncrypted: 'encrypted_secret',
        encryptionIv: '0123456789abcdef0123456789abcdef',
        updatedAt: new Date('2025-01-10T10:00:00Z'),
        createdAt: new Date('2025-01-01T10:00:00Z'),
      };
      const validSyncConfig = {
        userId: validUser.id,
        mappingType: 'THREE_TABLES' as const,
        autoSyncEnabled: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-10T10:00:00Z'),
      };
      const deeplyNestedUser = {
        ...validUser,
        credentials: validCredentials,
        syncConfigs: validSyncConfig,
        syncHistory: [
          {
            id: '987e6543-a21b-98c7-b654-321098765432',
            userId: validUser.id,
            triggerType: 'MANUAL' as const,
            status: 'SUCCESS' as const,
            startedAt: new Date('2025-01-15T10:00:00Z'),
            completedAt: new Date('2025-01-15T10:05:00Z'),
            itemsSynced: 100,
            errorMessage: null,
          },
          {
            id: '111e2222-a333-44b5-c666-777788889999',
            userId: validUser.id,
            triggerType: 'AUTO' as const,
            status: 'FAILED' as const,
            startedAt: new Date('2025-01-16T10:00:00Z'),
            completedAt: new Date('2025-01-16T10:05:00Z'),
            itemsSynced: 50,
            errorMessage: 'Network error',
          },
        ],
      };
      expect(isUserWithRelations(deeplyNestedUser)).toBe(true);
    });

    it('应该正确处理大型syncHistory数组 (性能测试)', () => {
      const statuses = [
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
      ] as const;
      const largeSyncHistory = Array.from({ length: 100 }, (_, index) => {
        const triggerType = index % 2 === 0 ? 'MANUAL' : 'AUTO';
        return {
          id: `${index.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
          userId: validUser.id,
          triggerType: triggerType,
          status: statuses[index % 5],
          startedAt: new Date(`2025-01-${(index % 28) + 1}T10:00:00Z`),
          completedAt:
            index % 5 === 0
              ? null
              : new Date(`2025-01-${(index % 28) + 1}T11:00:00Z`),
          itemsSynced: index * 10,
          errorMessage: index % 5 === 3 ? `Error ${index}` : null,
        };
      });
      const userWithLargeHistory = {
        ...validUser,
        syncHistory: largeSyncHistory,
      };
      expect(isUserWithRelations(userWithLargeHistory)).toBe(true);
    });
  });
});
