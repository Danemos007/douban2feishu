/**
 * 类型守卫函数统一导出
 *
 * @author Claude
 * @date 2025-09-09
 */

// User类型守卫
export {
  isUser,
  isUserWithRelations,
  isUserArray,
  assertIsUser,
} from './user.type-guards';

// UserCredentials类型守卫
export {
  isUserCredentials,
  isUserCredentialsWithUser,
  isUserCredentialsArray,
  assertIsUserCredentials,
  hasDoubanCredentials,
  hasFeishuCredentials,
  isUserCredentialsComplete,
  hasValidEncryptionIv,
} from './user-credentials.type-guards';

// SyncHistory类型守卫
export {
  isSyncHistory,
  isSyncHistoryWithUser,
  isSyncHistoryArray,
  assertIsSyncHistory,
  isSyncHistoryCompleted,
  isSyncHistoryRunning,
  hasValidDuration,
} from './sync-history.type-guards';
