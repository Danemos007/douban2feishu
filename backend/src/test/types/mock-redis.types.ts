/**
 * Mock Redis Client Type Definitions
 *
 * 这个文件定义了测试环境下Redis客户端的Mock类型，
 * 确保测试代码具有完整的类型安全性
 */

import { jest } from '@jest/globals';

/**
 * Redis Pipeline Mock Interface (简化版本)
 * 用于模拟Redis Pipeline操作的链式调用
 */
export interface MockRedisPipeline {
  hset: jest.Mock;
  expire: jest.Mock;
  exec: jest.Mock;
}

/**
 * Mock Redis Client Interface (简化版本)
 *
 * 基于RedisService的完整接口，为测试环境提供类型安全的Mock对象
 * 使用简化的jest.Mock类型避免复杂的泛型冲突
 */
export interface MockRedisClient {
  // Basic Redis Operations
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;

  // Hash Operations
  hget: jest.Mock;
  hset: jest.Mock;
  hgetall: jest.Mock;
  hdel: jest.Mock;

  // Set Operations
  sadd: jest.Mock;
  smembers: jest.Mock;
  srem: jest.Mock;

  // Increment/Decrement Operations
  incr: jest.Mock;
  decr: jest.Mock;

  // JSON Operations
  setJSON: jest.Mock;
  getJSON: jest.Mock;

  // Publish/Subscribe Operations
  publish: jest.Mock;
  createSubscriber: jest.Mock;

  // Pipeline and Multi Operations
  pipeline: jest.Mock;
  multi: jest.Mock;

  // Pattern-based Key Operations
  keys: jest.Mock;
  scan: jest.Mock;

  // Client Management
  getClient: jest.Mock;

  // Module Lifecycle
  onModuleInit?: jest.Mock;
  onModuleDestroy?: jest.Mock;
}

/**
 * 创建类型安全的Mock Redis Client的工厂函数
 *
 * @returns 完全类型化的MockRedisClient实例
 */
export function createMockRedisClient(): MockRedisClient {
  return {
    // Basic Redis Operations
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),

    // Hash Operations
    hget: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),

    // Set Operations
    sadd: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),

    // Increment/Decrement Operations
    incr: jest.fn(),
    decr: jest.fn(),

    // JSON Operations
    setJSON: jest.fn(),
    getJSON: jest.fn(),

    // Publish/Subscribe Operations
    publish: jest.fn(),
    createSubscriber: jest.fn(),

    // Pipeline and Multi Operations
    pipeline: jest.fn(() => ({
      hset: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]), // 真实Redis exec的默认行为：返回空数组
    })),
    multi: jest.fn(),

    // Pattern-based Key Operations
    keys: jest.fn(),
    scan: jest.fn(),

    // Client Management
    getClient: jest.fn(),

    // Module Lifecycle
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
}

/**
 * FeishuAuthService测试专用接口
 * 提供对私有方法的类型安全访问
 */
export interface FeishuAuthServiceTestInterface {
  transformError: (error: unknown) => Error;
  getCachedToken: (key: string) => Promise<string | null>;
}
