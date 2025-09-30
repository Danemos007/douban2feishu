/**
 * SyncHistory类型守卫函数单元测试
 *
 * @author Claude
 * @date 2025-09-30
 */

import {
  isSyncHistory,
  isSyncHistoryWithUser,
  isSyncHistoryArray,
  assertIsSyncHistory,
  isSyncHistoryCompleted,
  isSyncHistoryRunning,
  hasValidDuration,
} from './sync-history.type-guards';

describe('SyncHistory类型守卫测试', () => {
  const validSyncHistory = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '456e7890-f12a-34b5-c678-901234567890',
    triggerType: 'MANUAL' as const,
    status: 'SUCCESS' as const,
    startedAt: new Date('2025-01-15T10:00:00Z'),
    completedAt: new Date('2025-01-15T10:05:00Z'),
    itemsSynced: 100,
    errorMessage: null,
    duration: 300000, // 5分钟
    metadata: { source: 'test', version: '1.0' },
  };

  describe('isSyncHistory', () => {
    it('应该对有效的SyncHistory对象返回true', () => {
      expect(isSyncHistory(validSyncHistory)).toBe(true);
    });

    it('应该对completedAt为null的SyncHistory返回true', () => {
      const historyWithNullCompletedAt = {
        ...validSyncHistory,
        completedAt: null,
      };
      expect(isSyncHistory(historyWithNullCompletedAt)).toBe(true);
    });

    it('应该对errorMessage为null的SyncHistory返回true', () => {
      const historyWithNullError = {
        ...validSyncHistory,
        errorMessage: null,
      };
      expect(isSyncHistory(historyWithNullError)).toBe(true);
    });

    it('应该对duration为null的SyncHistory返回true', () => {
      const historyWithNullDuration = {
        ...validSyncHistory,
        duration: null,
      };
      expect(isSyncHistory(historyWithNullDuration)).toBe(true);
    });

    it('应该对duration为undefined的SyncHistory返回true', () => {
      const historyWithUndefinedDuration = {
        ...validSyncHistory,
        duration: undefined,
      };
      expect(isSyncHistory(historyWithUndefinedDuration)).toBe(true);
    });

    it('应该对metadata为null的SyncHistory返回true', () => {
      const historyWithNullMetadata = {
        ...validSyncHistory,
        metadata: null,
      };
      expect(isSyncHistory(historyWithNullMetadata)).toBe(true);
    });

    it('应该对metadata为undefined的SyncHistory返回true', () => {
      const historyWithUndefinedMetadata = {
        ...validSyncHistory,
        metadata: undefined,
      };
      expect(isSyncHistory(historyWithUndefinedMetadata)).toBe(true);
    });

    it('应该对包含有效JSON metadata的SyncHistory返回true', () => {
      const historyWithComplexMetadata = {
        ...validSyncHistory,
        metadata: {
          nested: { deep: { value: 'test' } },
          array: [1, 2, 3],
          boolean: true,
          number: 42,
        },
      };
      expect(isSyncHistory(historyWithComplexMetadata)).toBe(true);
    });

    it('应该对null返回false', () => {
      expect(isSyncHistory(null)).toBe(false);
    });

    it('应该对undefined返回false', () => {
      expect(isSyncHistory(undefined)).toBe(false);
    });

    it('应该对非对象类型返回false (string)', () => {
      expect(isSyncHistory('not an object')).toBe(false);
    });

    it('应该对非对象类型返回false (number)', () => {
      expect(isSyncHistory(123)).toBe(false);
    });

    it('应该对非对象类型返回false (boolean)', () => {
      expect(isSyncHistory(true)).toBe(false);
    });

    it('应该对空对象返回false', () => {
      expect(isSyncHistory({})).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少id)', () => {
      const { id: _id, ...historyWithoutId } = validSyncHistory;
      expect(isSyncHistory(historyWithoutId)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少userId)', () => {
      const { userId: _userId, ...historyWithoutUserId } = validSyncHistory;
      expect(isSyncHistory(historyWithoutUserId)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少triggerType)', () => {
      const { triggerType: _triggerType, ...historyWithoutTriggerType } =
        validSyncHistory;
      expect(isSyncHistory(historyWithoutTriggerType)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少status)', () => {
      const { status: _status, ...historyWithoutStatus } = validSyncHistory;
      expect(isSyncHistory(historyWithoutStatus)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少startedAt)', () => {
      const { startedAt: _startedAt, ...historyWithoutStartedAt } =
        validSyncHistory;
      expect(isSyncHistory(historyWithoutStartedAt)).toBe(false);
    });

    it('应该对缺少必需字段的对象返回false (缺少itemsSynced)', () => {
      const { itemsSynced: _itemsSynced, ...historyWithoutItemsSynced } =
        validSyncHistory;
      expect(isSyncHistory(historyWithoutItemsSynced)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (id不是string)', () => {
      const historyWithInvalidId = { ...validSyncHistory, id: 12345 };
      expect(isSyncHistory(historyWithInvalidId)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (userId不是string)', () => {
      const historyWithInvalidUserId = { ...validSyncHistory, userId: 12345 };
      expect(isSyncHistory(historyWithInvalidUserId)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (startedAt不是Date)', () => {
      const historyWithInvalidStartedAt = {
        ...validSyncHistory,
        startedAt: '2025-01-15T10:00:00Z',
      };
      expect(isSyncHistory(historyWithInvalidStartedAt)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (completedAt不是Date也不是null)', () => {
      const historyWithInvalidCompletedAt = {
        ...validSyncHistory,
        completedAt: '2025-01-15T10:05:00Z',
      };
      expect(isSyncHistory(historyWithInvalidCompletedAt)).toBe(false);
    });

    it('应该对字段类型错误的对象返回false (itemsSynced不是number)', () => {
      const historyWithInvalidItemsSynced = {
        ...validSyncHistory,
        itemsSynced: '100',
      };
      expect(isSyncHistory(historyWithInvalidItemsSynced)).toBe(false);
    });

    it('应该对itemsSynced为负数的对象返回false', () => {
      const historyWithNegativeItems = {
        ...validSyncHistory,
        itemsSynced: -5,
      };
      expect(isSyncHistory(historyWithNegativeItems)).toBe(false);
    });

    it('应该对无效的triggerType返回false', () => {
      const historyWithInvalidTriggerType = {
        ...validSyncHistory,
        triggerType: 'INVALID',
      };
      expect(isSyncHistory(historyWithInvalidTriggerType)).toBe(false);
    });

    it('应该对无效的status返回false', () => {
      const historyWithInvalidStatus = {
        ...validSyncHistory,
        status: 'INVALID',
      };
      expect(isSyncHistory(historyWithInvalidStatus)).toBe(false);
    });

    it('应该对duration为负数的对象返回false', () => {
      const historyWithNegativeDuration = {
        ...validSyncHistory,
        duration: -1000,
      };
      expect(isSyncHistory(historyWithNegativeDuration)).toBe(false);
    });

    it('应该对所有有效的triggerType值返回true (MANUAL, AUTO)', () => {
      const triggerTypes = ['MANUAL', 'AUTO'] as const;

      triggerTypes.forEach((triggerType) => {
        const historyWithTriggerType = {
          ...validSyncHistory,
          triggerType,
        };
        expect(isSyncHistory(historyWithTriggerType)).toBe(true);
      });
    });

    it('应该对所有有效的status值返回true (PENDING, RUNNING, SUCCESS, FAILED, CANCELLED)', () => {
      const statuses = [
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
      ] as const;

      statuses.forEach((status) => {
        const historyWithStatus = {
          ...validSyncHistory,
          status,
        };
        expect(isSyncHistory(historyWithStatus)).toBe(true);
      });
    });
  });

  describe('isSyncHistoryWithUser', () => {
    const validUser = {
      id: '789e0123-b456-78c9-d012-345678901234',
      email: 'test@example.com',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      lastSyncAt: new Date('2025-01-15T12:00:00Z'),
    };

    it('应该对包含有效User关联的SyncHistory返回true', () => {
      const historyWithUser = { ...validSyncHistory, user: validUser };
      expect(isSyncHistoryWithUser(historyWithUser)).toBe(true);
    });

    it('应该对不是有效SyncHistory的对象返回false', () => {
      const invalidHistory = { id: 123, user: validUser };
      expect(isSyncHistoryWithUser(invalidHistory)).toBe(false);
    });

    it('应该对缺少user字段的SyncHistory返回false', () => {
      expect(isSyncHistoryWithUser(validSyncHistory)).toBe(false);
    });

    it('应该对user字段类型错误的对象返回false (不是有效User)', () => {
      const historyWithInvalidUser = {
        ...validSyncHistory,
        user: { id: 123, email: 'test@example.com' },
      };
      expect(isSyncHistoryWithUser(historyWithInvalidUser)).toBe(false);
    });

    it('应该对user为null的对象返回false', () => {
      const historyWithNullUser = { ...validSyncHistory, user: null };
      expect(isSyncHistoryWithUser(historyWithNullUser)).toBe(false);
    });

    it('应该对user为undefined的对象返回false', () => {
      const historyWithUndefinedUser = {
        ...validSyncHistory,
        user: undefined,
      };
      expect(isSyncHistoryWithUser(historyWithUndefinedUser)).toBe(false);
    });
  });

  describe('isSyncHistoryArray', () => {
    it('应该对空数组返回true', () => {
      expect(isSyncHistoryArray([])).toBe(true);
    });

    it('应该对包含单个有效SyncHistory的数组返回true', () => {
      expect(isSyncHistoryArray([validSyncHistory])).toBe(true);
    });

    it('应该对包含多个有效SyncHistory的数组返回true', () => {
      const history2 = {
        ...validSyncHistory,
        id: '987e6543-a21b-98c7-b654-321098765432',
        triggerType: 'AUTO' as const,
      };
      const history3 = {
        ...validSyncHistory,
        id: '111e2222-a333-44b5-c666-777788889999',
        status: 'FAILED' as const,
      };
      expect(isSyncHistoryArray([validSyncHistory, history2, history3])).toBe(
        true,
      );
    });

    it('应该对非数组返回false', () => {
      expect(isSyncHistoryArray(validSyncHistory)).toBe(false);
      expect(isSyncHistoryArray('not an array')).toBe(false);
      expect(isSyncHistoryArray(123)).toBe(false);
      expect(isSyncHistoryArray(null)).toBe(false);
      expect(isSyncHistoryArray(undefined)).toBe(false);
    });

    it('应该对包含无效SyncHistory元素的数组返回false', () => {
      const invalidHistory = { id: 123, userId: 'test' };
      expect(isSyncHistoryArray([validSyncHistory, invalidHistory])).toBe(
        false,
      );
    });

    it('应该对包含null元素的数组返回false', () => {
      expect(isSyncHistoryArray([validSyncHistory, null])).toBe(false);
    });

    it('应该对包含undefined元素的数组返回false', () => {
      expect(isSyncHistoryArray([validSyncHistory, undefined])).toBe(false);
    });
  });

  describe('assertIsSyncHistory', () => {
    it('应该对有效SyncHistory对象不抛出错误', () => {
      expect(() => assertIsSyncHistory(validSyncHistory)).not.toThrow();
    });

    it('应该对有效SyncHistory对象(可选字段为null)不抛出错误', () => {
      const historyWithNulls = {
        ...validSyncHistory,
        completedAt: null,
        errorMessage: null,
        duration: null,
        metadata: null,
      };
      expect(() => assertIsSyncHistory(historyWithNulls)).not.toThrow();
    });

    it('应该对无效SyncHistory对象抛出包含详细信息的错误', () => {
      const invalidHistory = { id: 123, userId: 'test' };
      expect(() => assertIsSyncHistory(invalidHistory)).toThrow(
        'Object is not a valid SyncHistory type',
      );
    });

    it('应该对null抛出包含详细信息的错误', () => {
      expect(() => assertIsSyncHistory(null)).toThrow(
        'Object is not a valid SyncHistory type',
      );
    });

    it('应该对undefined抛出包含详细信息的错误', () => {
      expect(() => assertIsSyncHistory(undefined)).toThrow(
        'Object is not a valid SyncHistory type',
      );
    });

    it('错误信息应该包含接收到的对象的JSON表示', () => {
      const invalidHistory = { id: 123, userId: 'test' };
      try {
        assertIsSyncHistory(invalidHistory);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain(
          'Object is not a valid SyncHistory type',
        );
        expect((error as Error).message).toContain('"id": 123');
        expect((error as Error).message).toContain('"userId": "test"');
      }
    });
  });

  describe('状态判断函数', () => {
    describe('isSyncHistoryCompleted', () => {
      it('应该对status为SUCCESS的SyncHistory返回true', () => {
        const successHistory = {
          ...validSyncHistory,
          status: 'SUCCESS' as const,
        };
        expect(isSyncHistoryCompleted(successHistory)).toBe(true);
      });

      it('应该对status为FAILED的SyncHistory返回true', () => {
        const failedHistory = {
          ...validSyncHistory,
          status: 'FAILED' as const,
        };
        expect(isSyncHistoryCompleted(failedHistory)).toBe(true);
      });

      it('应该对status为CANCELLED的SyncHistory返回true', () => {
        const cancelledHistory = {
          ...validSyncHistory,
          status: 'CANCELLED' as const,
        };
        expect(isSyncHistoryCompleted(cancelledHistory)).toBe(true);
      });

      it('应该对status为PENDING的SyncHistory返回false', () => {
        const pendingHistory = {
          ...validSyncHistory,
          status: 'PENDING' as const,
        };
        expect(isSyncHistoryCompleted(pendingHistory)).toBe(false);
      });

      it('应该对status为RUNNING的SyncHistory返回false', () => {
        const runningHistory = {
          ...validSyncHistory,
          status: 'RUNNING' as const,
        };
        expect(isSyncHistoryCompleted(runningHistory)).toBe(false);
      });
    });

    describe('isSyncHistoryRunning', () => {
      it('应该对status为RUNNING的SyncHistory返回true', () => {
        const runningHistory = {
          ...validSyncHistory,
          status: 'RUNNING' as const,
        };
        expect(isSyncHistoryRunning(runningHistory)).toBe(true);
      });

      it('应该对status为PENDING的SyncHistory返回false', () => {
        const pendingHistory = {
          ...validSyncHistory,
          status: 'PENDING' as const,
        };
        expect(isSyncHistoryRunning(pendingHistory)).toBe(false);
      });

      it('应该对status为SUCCESS的SyncHistory返回false', () => {
        const successHistory = {
          ...validSyncHistory,
          status: 'SUCCESS' as const,
        };
        expect(isSyncHistoryRunning(successHistory)).toBe(false);
      });

      it('应该对status为FAILED的SyncHistory返回false', () => {
        const failedHistory = {
          ...validSyncHistory,
          status: 'FAILED' as const,
        };
        expect(isSyncHistoryRunning(failedHistory)).toBe(false);
      });

      it('应该对status为CANCELLED的SyncHistory返回false', () => {
        const cancelledHistory = {
          ...validSyncHistory,
          status: 'CANCELLED' as const,
        };
        expect(isSyncHistoryRunning(cancelledHistory)).toBe(false);
      });
    });
  });

  describe('hasValidDuration', () => {
    it('应该对completedAt和startedAt都存在且duration匹配的SyncHistory返回true', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        duration: 300000, // 正好5分钟
      };
      expect(hasValidDuration(history)).toBe(true);
    });

    it('应该对duration为null的SyncHistory返回true (如果时间计算有效)', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        duration: null,
      };
      expect(hasValidDuration(history)).toBe(true);
    });

    it('应该对completedAt和startedAt相同时间的SyncHistory返回true (duration为0)', () => {
      const sameTimeHistory = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:00:00Z'),
        duration: null,
      };
      expect(hasValidDuration(sameTimeHistory)).toBe(true);
    });

    it('应该对duration在1秒误差范围内的SyncHistory返回true', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        duration: 300500, // 5分钟+500毫秒，在1秒误差内
      };
      expect(hasValidDuration(history)).toBe(true);
    });

    it('应该对completedAt为null的SyncHistory返回false', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: null,
        duration: 300000,
      };
      expect(hasValidDuration(history)).toBe(false);
    });

    it('应该对completedAt早于startedAt的SyncHistory返回false', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:05:00Z'),
        completedAt: new Date('2025-01-15T10:00:00Z'), // 早于startedAt
        duration: 300000,
      };
      expect(hasValidDuration(history)).toBe(false);
    });

    it('应该对duration误差超过1秒的SyncHistory返回false', () => {
      const history = {
        ...validSyncHistory,
        startedAt: new Date('2025-01-15T10:00:00Z'),
        completedAt: new Date('2025-01-15T10:05:00Z'),
        duration: 310000, // 5分钟+10秒，超过1秒误差
      };
      expect(hasValidDuration(history)).toBe(false);
    });
  });

  describe('辅助函数 - isValidTriggerType (内部函数测试)', () => {
    it('通过isSyncHistory间接测试：应该接受MANUAL', () => {
      const history = { ...validSyncHistory, triggerType: 'MANUAL' as const };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受AUTO', () => {
      const history = { ...validSyncHistory, triggerType: 'AUTO' as const };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该拒绝无效的triggerType字符串', () => {
      const history = { ...validSyncHistory, triggerType: 'INVALID' };
      expect(isSyncHistory(history)).toBe(false);
    });

    it('通过isSyncHistory间接测试：应该拒绝非字符串类型的triggerType', () => {
      const history = { ...validSyncHistory, triggerType: 123 };
      expect(isSyncHistory(history)).toBe(false);
    });
  });

  describe('辅助函数 - isValidSyncStatus (内部函数测试)', () => {
    it('通过isSyncHistory间接测试：应该接受所有有效status', () => {
      const statuses = [
        'PENDING',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED',
      ] as const;

      statuses.forEach((status) => {
        const history = { ...validSyncHistory, status };
        expect(isSyncHistory(history)).toBe(true);
      });
    });

    it('通过isSyncHistory间接测试：应该拒绝无效的status字符串', () => {
      const history = { ...validSyncHistory, status: 'INVALID' };
      expect(isSyncHistory(history)).toBe(false);
    });

    it('通过isSyncHistory间接测试：应该拒绝非字符串类型的status', () => {
      const history = { ...validSyncHistory, status: 123 };
      expect(isSyncHistory(history)).toBe(false);
    });
  });

  describe('辅助函数 - isValidJsonValue (内部函数测试)', () => {
    it('通过isSyncHistory间接测试：应该接受有效的JSON对象作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: { key: 'value', nested: { deep: 'data' } },
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受有效的JSON数组作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: [1, 2, 3, 'test', true],
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受字符串作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: 'simple string',
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受数字作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: 42,
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受boolean作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: true,
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该接受null作为metadata', () => {
      const history = {
        ...validSyncHistory,
        metadata: null,
      };
      expect(isSyncHistory(history)).toBe(true);
    });

    it('通过isSyncHistory间接测试：应该拒绝循环引用的对象作为metadata', () => {
      const circularObj: Record<string, unknown> = { key: 'value' };
      circularObj.self = circularObj; // 循环引用

      const history = {
        ...validSyncHistory,
        metadata: circularObj,
      };
      expect(isSyncHistory(history)).toBe(false);
    });
  });

  describe('辅助函数 - isUser (内部函数测试)', () => {
    const validUser = {
      id: '789e0123-b456-78c9-d012-345678901234',
      email: 'test@example.com',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      lastSyncAt: new Date('2025-01-15T12:00:00Z'),
    };

    it('通过isSyncHistoryWithUser间接测试：应该接受有效的User对象', () => {
      const historyWithUser = { ...validSyncHistory, user: validUser };
      expect(isSyncHistoryWithUser(historyWithUser)).toBe(true);
    });

    it('通过isSyncHistoryWithUser间接测试：应该接受lastSyncAt为null的User对象', () => {
      const userWithNullLastSync = { ...validUser, lastSyncAt: null };
      const historyWithUser = {
        ...validSyncHistory,
        user: userWithNullLastSync,
      };
      expect(isSyncHistoryWithUser(historyWithUser)).toBe(true);
    });

    it('通过isSyncHistoryWithUser间接测试：应该拒绝缺少必需字段的User对象', () => {
      const { email: _email, ...userWithoutEmail } = validUser;
      const historyWithUser = { ...validSyncHistory, user: userWithoutEmail };
      expect(isSyncHistoryWithUser(historyWithUser)).toBe(false);
    });

    it('通过isSyncHistoryWithUser间接测试：应该拒绝字段类型错误的User对象', () => {
      const userWithInvalidEmail = { ...validUser, email: 12345 };
      const historyWithUser = {
        ...validSyncHistory,
        user: userWithInvalidEmail,
      };
      expect(isSyncHistoryWithUser(historyWithUser)).toBe(false);
    });
  });

  describe('边界情况和综合测试', () => {
    it('应该正确处理各种原始类型 (string, number, boolean, symbol)', () => {
      expect(isSyncHistory('string')).toBe(false);
      expect(isSyncHistory(123)).toBe(false);
      expect(isSyncHistory(true)).toBe(false);
      expect(isSyncHistory(false)).toBe(false);
      expect(isSyncHistory(Symbol('test'))).toBe(false);
      expect(isSyncHistory(NaN)).toBe(false);
      expect(isSyncHistory(Infinity)).toBe(false);
    });

    it('应该正确处理特殊对象 (Date, Array, RegExp, Error)', () => {
      expect(isSyncHistory(new Date())).toBe(false);
      expect(isSyncHistory([])).toBe(false);
      expect(isSyncHistory([1, 2, 3])).toBe(false);
      expect(isSyncHistory(/regex/)).toBe(false);
      expect(isSyncHistory(new Error('error'))).toBe(false);
    });

    it('应该正确处理包含额外字段的SyncHistory对象', () => {
      const historyWithExtraFields = {
        ...validSyncHistory,
        extraField1: 'extra',
        extraField2: 123,
        extraField3: true,
      };
      expect(isSyncHistory(historyWithExtraFields)).toBe(true);
    });

    it('应该正确处理大型metadata对象', () => {
      const largeMetadata = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      };
      const historyWithLargeMetadata = {
        ...validSyncHistory,
        metadata: largeMetadata,
      };
      expect(isSyncHistory(historyWithLargeMetadata)).toBe(true);
    });

    it('应该正确处理复杂的metadata嵌套结构', () => {
      const complexMetadata = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep nested value',
                  array: [1, 2, 3, { nested: true }],
                },
              },
            },
          },
        },
      };
      const historyWithComplexMetadata = {
        ...validSyncHistory,
        metadata: complexMetadata,
      };
      expect(isSyncHistory(historyWithComplexMetadata)).toBe(true);
    });

    it('应该正确处理itemsSynced为0的SyncHistory', () => {
      const historyWithZeroItems = {
        ...validSyncHistory,
        itemsSynced: 0,
      };
      expect(isSyncHistory(historyWithZeroItems)).toBe(true);
    });

    it('应该正确处理duration为0的SyncHistory', () => {
      const historyWithZeroDuration = {
        ...validSyncHistory,
        duration: 0,
      };
      expect(isSyncHistory(historyWithZeroDuration)).toBe(true);
    });

    it('应该正确处理大型SyncHistory数组 (性能测试)', () => {
      const largeArray = Array.from({ length: 100 }, (_, index) => {
        const triggerType = index % 2 === 0 ? 'MANUAL' : 'AUTO';
        const statuses = [
          'PENDING',
          'RUNNING',
          'SUCCESS',
          'FAILED',
          'CANCELLED',
        ] as const;
        return {
          id: `${index.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
          userId: validSyncHistory.userId,
          triggerType: triggerType,
          status: statuses[index % 5],
          startedAt: new Date(`2025-01-${(index % 28) + 1}T10:00:00Z`),
          completedAt:
            index % 5 === 0
              ? null
              : new Date(`2025-01-${(index % 28) + 1}T11:00:00Z`),
          itemsSynced: index * 10,
          errorMessage: index % 5 === 3 ? `Error ${index}` : null,
          duration: index % 5 === 0 ? null : 3600000,
          metadata: { index, batch: Math.floor(index / 10) },
        };
      });
      expect(isSyncHistoryArray(largeArray)).toBe(true);
    });
  });
});
