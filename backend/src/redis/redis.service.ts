import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis服务提供类，封装Redis客户端操作和连接管理
 *
 * 支持完整的Redis操作集合，包括：
 * - 基础键值操作（get, set, del等）
 * - Hash操作（hget, hset, hgetall等）
 * - Set操作（sadd, smembers, srem等）
 * - 计数器操作（incr, decr）
 * - JSON数据操作（setJSON, getJSON）
 * - 发布订阅操作（publish, createSubscriber）
 * - 批处理和事务操作（pipeline, multi）
 * - 模式匹配操作（keys, scan）
 *
 * @author Claude
 * @date 2025-09-23
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  /**
   * 初始化Redis连接并设置事件监听器
   *
   * @description 创建Redis客户端连接，配置连接参数，并设置错误处理和重连机制
   * @returns Promise<void> 连接成功时解析的Promise
   * @throws Error 当Redis连接失败时抛出错误
   */
  async onModuleInit(): Promise<void> {
    try {
      this.client = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        showFriendlyErrorStack: true,
      });

      await this.client.connect();
      this.logger.log('Redis client connected successfully');

      // Handle connection events
      this.client.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis ready');
      });
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * 优雅关闭Redis连接
   *
   * @description 在模块销毁时断开Redis客户端连接，确保资源正确释放
   * @returns Promise<void> 断连成功时解析的Promise
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * 获取Redis客户端实例
   *
   * @description 返回已初始化的Redis客户端实例，用于执行原生Redis命令
   * @returns Redis Redis客户端实例
   * @throws Error 当Redis客户端未初始化时抛出错误
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client;
  }

  // ==================== 基础Redis操作 ====================

  /**
   * 获取指定键的值
   *
   * @description 从Redis中获取指定键对应的字符串值
   * @param key Redis键名
   * @returns Promise<string | null> 键对应的值，不存在时返回null
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * 设置键值对，可选择设置过期时间
   *
   * @description 在Redis中设置键值对，支持可选的TTL（生存时间）
   * @param key Redis键名
   * @param value 要存储的字符串值
   * @param ttlSeconds 可选的过期时间（秒），如果提供将使用SETEX命令
   * @returns Promise<'OK'> 操作成功时返回'OK'
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, value);
    }
    return this.client.set(key, value);
  }

  /**
   * 设置键值对并指定过期时间
   *
   * @description 在Redis中设置键值对并同时设置过期时间（SETEX命令）
   * @param key Redis键名
   * @param ttlSeconds 过期时间（秒）
   * @param value 要存储的字符串值
   * @returns Promise<'OK'> 操作成功时返回'OK'
   */
  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, ttlSeconds, value);
  }

  /**
   * 删除指定的键
   *
   * @description 从Redis中删除指定的键及其对应的值
   * @param key 要删除的Redis键名
   * @returns Promise<number> 被删除的键的数量（0或1）
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * 检查键是否存在
   *
   * @description 检查指定键是否存在于Redis中
   * @param key 要检查的Redis键名
   * @returns Promise<number> 键存在时返回1，不存在时返回0
   */
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  /**
   * 设置键的过期时间
   *
   * @description 为已存在的键设置过期时间（秒）
   * @param key Redis键名
   * @param ttlSeconds 过期时间（秒）
   * @returns Promise<number> 设置成功时返回1，键不存在时返回0
   */
  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  /**
   * 获取键的剩余生存时间
   *
   * @description 获取指定键的剩余生存时间（TTL）
   * @param key Redis键名
   * @returns Promise<number> 剩余秒数，-1表示永不过期，-2表示键不存在
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ==================== Hash操作 ====================

  /**
   * 获取哈希表中指定字段的值
   *
   * @description 从Redis哈希表中获取指定字段的值
   * @param key 哈希表键名
   * @param field 字段名
   * @returns Promise<string | null> 字段对应的值，不存在时返回null
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  /**
   * 设置哈希表中字段的值
   *
   * @description 在Redis哈希表中设置指定字段的值
   * @param key 哈希表键名
   * @param field 字段名
   * @param value 字段值
   * @returns Promise<number> 新增字段时返回1，更新已存在字段时返回0
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  /**
   * 获取哈希表的所有字段和值
   *
   * @description 获取Redis哈希表中的所有字段和对应的值
   * @param key 哈希表键名
   * @returns Promise<Record<string, string>> 包含所有字段和值的对象
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  /**
   * 删除哈希表中的一个或多个字段
   *
   * @description 从Redis哈希表中删除指定的字段
   * @param key 哈希表键名
   * @param fields 要删除的字段名列表
   * @returns Promise<number> 被删除的字段数量
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // ==================== Set操作 ====================

  /**
   * 向集合添加一个或多个成员
   *
   * @description 向Redis集合中添加一个或多个成员
   * @param key 集合键名
   * @param members 要添加的成员列表
   * @returns Promise<number> 被添加到集合中的新成员数量
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  /**
   * 获取集合中的所有成员
   *
   * @description 返回Redis集合中的所有成员
   * @param key 集合键名
   * @returns Promise<string[]> 集合中所有成员的数组
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  /**
   * 从集合中移除一个或多个成员
   *
   * @description 从Redis集合中移除指定的成员
   * @param key 集合键名
   * @param members 要移除的成员列表
   * @returns Promise<number> 被移除的成员数量
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  // ==================== 计数器操作 ====================

  /**
   * 递增键的数值
   *
   * @description 将Redis中存储的数值递增1
   * @param key 数值键名
   * @returns Promise<number> 递增后的数值
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * 递减键的数值
   *
   * @description 将Redis中存储的数值递减1
   * @param key 数值键名
   * @returns Promise<number> 递减后的数值
   */
  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  // ==================== JSON操作（复杂数据结构） ====================

  /**
   * 将对象序列化为JSON并存储到Redis
   *
   * @description 将任意类型的对象序列化为JSON字符串并存储到Redis，支持可选的TTL
   * @param key Redis键名
   * @param value 要序列化存储的对象
   * @param ttlSeconds 可选的过期时间（秒）
   * @returns Promise<'OK'> 操作成功时返回'OK'
   */
  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    const jsonValue = JSON.stringify(value);
    return this.set(key, jsonValue, ttlSeconds);
  }

  /**
   * 从Redis获取JSON数据并反序列化为对象
   *
   * @description 从Redis获取JSON字符串并反序列化为指定类型的对象
   * @param key Redis键名
   * @returns Promise<T | null> 反序列化后的对象，键不存在或解析失败时返回null
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  }

  // ==================== 发布/订阅操作 ====================

  /**
   * 向指定频道发布消息
   *
   * @description 向Redis发布/订阅系统的指定频道发布消息
   * @param channel 频道名称
   * @param message 要发布的消息
   * @returns Promise<number> 接收到此消息的订阅者数量
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * 创建新的Redis订阅者客户端
   *
   * @description 创建一个新的Redis客户端实例专门用于订阅操作
   * @returns Redis 新的Redis客户端实例，专用于订阅操作
   */
  createSubscriber(): Redis {
    return new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    });
  }

  // ==================== 批处理和事务操作 ====================

  /**
   * 创建Redis管道用于批量操作
   *
   * @description 创建Redis管道（Pipeline），用于批量执行多个命令以提高性能
   * @returns ChainableCommander Redis管道实例，可链式调用多个命令
   */
  pipeline() {
    return this.client.pipeline();
  }

  /**
   * 创建Redis事务用于原子操作
   *
   * @description 创建Redis事务（Multi），确保一组命令的原子性执行
   * @returns ChainableCommander Redis事务实例，可链式调用多个命令
   */
  multi() {
    return this.client.multi();
  }

  // ==================== 模式匹配操作 ====================

  /**
   * 查找匹配模式的所有键
   *
   * @description 查找与指定模式匹配的所有键名（注意：在生产环境中慎用，可能影响性能）
   * @param pattern 匹配模式，支持通配符（如 "prefix:*"）
   * @returns Promise<string[]> 匹配模式的所有键名数组
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * 使用游标迭代数据库中的键
   *
   * @description 使用SCAN命令以游标方式迭代Redis数据库中的键，支持模式匹配和数量限制
   * @param cursor 游标位置，初始调用使用0
   * @param pattern 可选的匹配模式，支持通配符
   * @param count 可选的单次返回键数量建议值
   * @returns Promise<[string, string[]]> 返回元组：[下次游标位置, 本次返回的键数组]
   */
  async scan(
    cursor: number,
    pattern?: string,
    count?: number,
  ): Promise<[string, string[]]> {
    // Use positional arguments following ioredis API design
    if (pattern && count) {
      return this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    } else if (pattern) {
      return this.client.scan(cursor, 'MATCH', pattern);
    } else if (count) {
      return this.client.scan(cursor, 'COUNT', count);
    } else {
      return this.client.scan(cursor);
    }
  }
}
