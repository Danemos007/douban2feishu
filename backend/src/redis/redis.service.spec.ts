/**
 * RedisService 单元测试
 *
 * 测试策略:
 * - 完全Mock Redis客户端依赖，专注测试RedisService封装逻辑
 * - 验证Redis连接管理、错误处理、事件监听等核心功能
 * - 覆盖所有基础操作、Hash操作、Set操作、JSON操作、Pub/Sub等
 * - 测试边界条件和错误路径
 * - 验证生产环境关键功能(事件监听、错误监控)
 *
 * @author Claude
 * @date 2025-09-23
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';

import { RedisService } from './redis.service';

// Mock ioredis completely
jest.mock('ioredis');

describe('RedisService - Comprehensive Redis Operations Test Suite', () => {
  let service: RedisService;
  let configService: ConfigService;
  let module: TestingModule;
  let mockRedisClient: MockRedisClient;

  // Spy variables for unbound-method error prevention
  let configGetSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  // Mock configuration data
  const mockRedisConfig = {
    host: 'test-redis-host',
    port: 6380,
    password: 'test-redis-password',
    db: 2,
  };

  // Type-safe mock interfaces
  interface MockRedisClient {
    connect: jest.MockedFunction<() => Promise<void>>;
    quit: jest.MockedFunction<() => Promise<string>>;
    on: jest.MockedFunction<
      (event: string, handler: (...args: unknown[]) => void) => void
    >;
    emit: jest.MockedFunction<(event: string, ...args: unknown[]) => boolean>;
    get: jest.MockedFunction<(key: string) => Promise<string | null>>;
    set: jest.MockedFunction<(key: string, value: string) => Promise<'OK'>>;
    setex: jest.MockedFunction<
      (key: string, seconds: number, value: string) => Promise<'OK'>
    >;
    del: jest.MockedFunction<(key: string) => Promise<number>>;
    exists: jest.MockedFunction<(key: string) => Promise<number>>;
    expire: jest.MockedFunction<
      (key: string, seconds: number) => Promise<number>
    >;
    ttl: jest.MockedFunction<(key: string) => Promise<number>>;
    hget: jest.MockedFunction<
      (key: string, field: string) => Promise<string | null>
    >;
    hset: jest.MockedFunction<
      (key: string, field: string, value: string) => Promise<number>
    >;
    hgetall: jest.MockedFunction<
      (key: string) => Promise<Record<string, string>>
    >;
    hdel: jest.MockedFunction<
      (key: string, ...fields: string[]) => Promise<number>
    >;
    sadd: jest.MockedFunction<
      (key: string, ...members: string[]) => Promise<number>
    >;
    smembers: jest.MockedFunction<(key: string) => Promise<string[]>>;
    srem: jest.MockedFunction<
      (key: string, ...members: string[]) => Promise<number>
    >;
    incr: jest.MockedFunction<(key: string) => Promise<number>>;
    decr: jest.MockedFunction<(key: string) => Promise<number>>;
    publish: jest.MockedFunction<
      (channel: string, message: string) => Promise<number>
    >;
    pipeline: jest.MockedFunction<() => ChainableCommander>;
    multi: jest.MockedFunction<() => ChainableCommander>;
    keys: jest.MockedFunction<(pattern: string) => Promise<string[]>>;
    scan: jest.MockedFunction<
      (cursor: number, ...args: string[]) => Promise<[string, string[]]>
    >;
  }

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create type-safe mock Redis client
    mockRedisClient = {
      connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      quit: jest.fn<Promise<string>, []>().mockResolvedValue('OK'),
      on: jest.fn<void, [string, (...args: unknown[]) => void]>(),
      emit: jest.fn<boolean, [string, ...unknown[]]>(),
      get: jest.fn<Promise<string | null>, [string]>(),
      set: jest.fn<Promise<'OK'>, [string, string]>(),
      setex: jest.fn<Promise<'OK'>, [string, number, string]>(),
      del: jest.fn<Promise<number>, [string]>(),
      exists: jest.fn<Promise<number>, [string]>(),
      expire: jest.fn<Promise<number>, [string, number]>(),
      ttl: jest.fn<Promise<number>, [string]>(),
      hget: jest.fn<Promise<string | null>, [string, string]>(),
      hset: jest.fn<Promise<number>, [string, string, string]>(),
      hgetall: jest.fn<Promise<Record<string, string>>, [string]>(),
      hdel: jest.fn<Promise<number>, [string, ...string[]]>(),
      sadd: jest.fn<Promise<number>, [string, ...string[]]>(),
      smembers: jest.fn<Promise<string[]>, [string]>(),
      srem: jest.fn<Promise<number>, [string, ...string[]]>(),
      incr: jest.fn<Promise<number>, [string]>(),
      decr: jest.fn<Promise<number>, [string]>(),
      publish: jest.fn<Promise<number>, [string, string]>(),
      pipeline: jest.fn<ChainableCommander, []>(),
      multi: jest.fn<ChainableCommander, []>(),
      keys: jest.fn<Promise<string[]>, [string]>(),
      scan: jest.fn<Promise<[string, string[]]>, [number, ...string[]]>(),
    } satisfies MockRedisClient;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
      () => mockRedisClient as unknown as Redis,
    );

    module = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup spies
    configGetSpy = jest.spyOn(configService, 'get');
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Default mock setup with proper types
    configGetSpy.mockImplementation(<T>(key: string, defaultValue?: T): T => {
      switch (key) {
        case 'REDIS_HOST':
          return mockRedisConfig.host as T;
        case 'REDIS_PORT':
          return mockRedisConfig.port as T;
        case 'REDIS_PASSWORD':
          return mockRedisConfig.password as T;
        case 'REDIS_DB':
          return mockRedisConfig.db as T;
        default:
          return defaultValue as T;
      }
    });
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Constructor & Initialization', () => {
    it('should be defined and properly inject ConfigService', () => {
      expect(service).toBeDefined();
      expect(configService).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    describe('onModuleInit', () => {
      it('should initialize Redis client with default config values', async () => {
        // Mock config to return default values
        configGetSpy.mockImplementation(
          <T>(_key: string, defaultValue?: T): T => defaultValue as T,
        );

        await service.onModuleInit();

        expect(Redis).toHaveBeenCalledWith({
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          showFriendlyErrorStack: true,
        });
        expect(mockRedisClient.connect).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith(
          'Redis client connected successfully',
        );
      });

      it('should initialize Redis client with custom config values', async () => {
        await service.onModuleInit();

        expect(Redis).toHaveBeenCalledWith({
          host: mockRedisConfig.host,
          port: mockRedisConfig.port,
          password: mockRedisConfig.password,
          db: mockRedisConfig.db,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          showFriendlyErrorStack: true,
        });
        expect(mockRedisClient.connect).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith(
          'Redis client connected successfully',
        );
      });

      it('should connect to Redis successfully and setup event listeners', async () => {
        await service.onModuleInit();

        // Verify event listeners are set up
        expect(mockRedisClient.on).toHaveBeenCalledWith(
          'error',
          expect.any(Function),
        );
        expect(mockRedisClient.on).toHaveBeenCalledWith(
          'connect',
          expect.any(Function),
        );
        expect(mockRedisClient.on).toHaveBeenCalledWith(
          'reconnecting',
          expect.any(Function),
        );
        expect(mockRedisClient.on).toHaveBeenCalledWith(
          'ready',
          expect.any(Function),
        );
      });

      it('should throw error when Redis connection fails', async () => {
        const connectionError = new Error('Connection failed');
        mockRedisClient.connect.mockRejectedValue(connectionError);

        await expect(service.onModuleInit()).rejects.toThrow(connectionError);
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to connect to Redis:',
          connectionError,
        );
      });
    });

    describe('Event Handling', () => {
      beforeEach(async () => {
        await service.onModuleInit();
      });

      it('should log error when Redis emits error event', () => {
        const testError = new Error('Redis connection error');
        const errorHandler = mockRedisClient.on.mock.calls.find(
          (call) => call[0] === 'error',
        )?.[1];

        if (errorHandler) {
          errorHandler(testError);
        }

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Redis connection error:',
          testError,
        );
      });

      it('should log message when Redis emits connect event', () => {
        const connectHandler = mockRedisClient.on.mock.calls.find(
          (call) => call[0] === 'connect',
        )?.[1];

        if (connectHandler) {
          connectHandler();
        }

        expect(loggerLogSpy).toHaveBeenCalledWith('Redis connected');
      });

      it('should log message when Redis emits reconnecting event', () => {
        const reconnectingHandler = mockRedisClient.on.mock.calls.find(
          (call) => call[0] === 'reconnecting',
        )?.[1];

        if (reconnectingHandler) {
          reconnectingHandler();
        }

        expect(loggerLogSpy).toHaveBeenCalledWith('Redis reconnecting...');
      });

      it('should log message when Redis emits ready event', () => {
        const readyHandler = mockRedisClient.on.mock.calls.find(
          (call) => call[0] === 'ready',
        )?.[1];

        if (readyHandler) {
          readyHandler();
        }

        expect(loggerLogSpy).toHaveBeenCalledWith('Redis ready');
      });
    });

    describe('onModuleDestroy', () => {
      it('should disconnect Redis client when client exists', async () => {
        await service.onModuleInit();
        await service.onModuleDestroy();

        expect(mockRedisClient.quit).toHaveBeenCalled();
        expect(loggerLogSpy).toHaveBeenCalledWith('Redis client disconnected');
      });

      it('should handle gracefully when client does not exist', async () => {
        // Don't initialize client
        await service.onModuleDestroy();

        expect(mockRedisClient.quit).not.toHaveBeenCalled();
        expect(loggerLogSpy).not.toHaveBeenCalledWith(
          'Redis client disconnected',
        );
      });
    });
  });

  describe('Client Management', () => {
    describe('getClient', () => {
      it('should return Redis client when initialized', async () => {
        await service.onModuleInit();

        const client = service.getClient();

        expect(client).toBe(mockRedisClient);
      });

      it('should throw error when client is not initialized', () => {
        expect(() => service.getClient()).toThrow(
          'Redis client is not initialized',
        );
      });
    });
  });

  describe('Basic Redis Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('get', () => {
      it('should get value from Redis', async () => {
        const testKey = 'test:key';
        const testValue = 'test-value';
        mockRedisClient.get.mockResolvedValue(testValue);

        const result = await service.get(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
        expect(result).toBe(testValue);
      });

      it('should return null for non-existent key', async () => {
        const testKey = 'non-existent:key';
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.get(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        const testKey = 'test:key';
        const testValue = 'test-value';
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await service.set(testKey, testValue);

        expect(mockRedisClient.set).toHaveBeenCalledWith(testKey, testValue);
        expect(result).toBe('OK');
      });

      it('should set value with TTL using setex', async () => {
        const testKey = 'test:key';
        const testValue = 'test-value';
        const ttl = 3600;
        mockRedisClient.setex.mockResolvedValue('OK');

        const result = await service.set(testKey, testValue, ttl);

        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          testKey,
          ttl,
          testValue,
        );
        expect(result).toBe('OK');
      });
    });

    describe('setex', () => {
      it('should set value with TTL', async () => {
        const testKey = 'test:key';
        const testValue = 'test-value';
        const ttl = 3600;
        mockRedisClient.setex.mockResolvedValue('OK');

        const result = await service.setex(testKey, ttl, testValue);

        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          testKey,
          ttl,
          testValue,
        );
        expect(result).toBe('OK');
      });
    });

    describe('del', () => {
      it('should delete key from Redis', async () => {
        const testKey = 'test:key';
        mockRedisClient.del.mockResolvedValue(1);

        const result = await service.del(testKey);

        expect(mockRedisClient.del).toHaveBeenCalledWith(testKey);
        expect(result).toBe(1);
      });
    });

    describe('exists', () => {
      it('should check if key exists', async () => {
        const testKey = 'test:key';
        mockRedisClient.exists.mockResolvedValue(1);

        const result = await service.exists(testKey);

        expect(mockRedisClient.exists).toHaveBeenCalledWith(testKey);
        expect(result).toBe(1);
      });
    });

    describe('expire', () => {
      it('should set expiration for key', async () => {
        const testKey = 'test:key';
        const ttl = 3600;
        mockRedisClient.expire.mockResolvedValue(1);

        const result = await service.expire(testKey, ttl);

        expect(mockRedisClient.expire).toHaveBeenCalledWith(testKey, ttl);
        expect(result).toBe(1);
      });
    });

    describe('ttl', () => {
      it('should get TTL for key', async () => {
        const testKey = 'test:key';
        const ttlValue = 3600;
        mockRedisClient.ttl.mockResolvedValue(ttlValue);

        const result = await service.ttl(testKey);

        expect(mockRedisClient.ttl).toHaveBeenCalledWith(testKey);
        expect(result).toBe(ttlValue);
      });
    });
  });

  describe('Hash Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('hget', () => {
      it('should get hash field value', async () => {
        const testKey = 'test:hash';
        const testField = 'field1';
        const testValue = 'value1';
        mockRedisClient.hget.mockResolvedValue(testValue);

        const result = await service.hget(testKey, testField);

        expect(mockRedisClient.hget).toHaveBeenCalledWith(testKey, testField);
        expect(result).toBe(testValue);
      });

      it('should return null for non-existent field', async () => {
        const testKey = 'test:hash';
        const testField = 'non-existent-field';
        mockRedisClient.hget.mockResolvedValue(null);

        const result = await service.hget(testKey, testField);

        expect(mockRedisClient.hget).toHaveBeenCalledWith(testKey, testField);
        expect(result).toBeNull();
      });
    });

    describe('hset', () => {
      it('should set hash field value', async () => {
        const testKey = 'test:hash';
        const testField = 'field1';
        const testValue = 'value1';
        mockRedisClient.hset.mockResolvedValue(1);

        const result = await service.hset(testKey, testField, testValue);

        expect(mockRedisClient.hset).toHaveBeenCalledWith(
          testKey,
          testField,
          testValue,
        );
        expect(result).toBe(1);
      });
    });

    describe('hgetall', () => {
      it('should get all hash fields and values', async () => {
        const testKey = 'test:hash';
        const testData = { field1: 'value1', field2: 'value2' };
        mockRedisClient.hgetall.mockResolvedValue(testData);

        const result = await service.hgetall(testKey);

        expect(mockRedisClient.hgetall).toHaveBeenCalledWith(testKey);
        expect(result).toEqual(testData);
      });
    });

    describe('hdel', () => {
      it('should delete hash fields', async () => {
        const testKey = 'test:hash';
        const testFields = ['field1', 'field2'];
        mockRedisClient.hdel.mockResolvedValue(2);

        const result = await service.hdel(testKey, ...testFields);

        expect(mockRedisClient.hdel).toHaveBeenCalledWith(
          testKey,
          ...testFields,
        );
        expect(result).toBe(2);
      });
    });
  });

  describe('Set Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('sadd', () => {
      it('should add members to set', async () => {
        const testKey = 'test:set';
        const testMembers = ['member1', 'member2'];
        mockRedisClient.sadd.mockResolvedValue(2);

        const result = await service.sadd(testKey, ...testMembers);

        expect(mockRedisClient.sadd).toHaveBeenCalledWith(
          testKey,
          ...testMembers,
        );
        expect(result).toBe(2);
      });
    });

    describe('smembers', () => {
      it('should get all members of set', async () => {
        const testKey = 'test:set';
        const testMembers = ['member1', 'member2'];
        mockRedisClient.smembers.mockResolvedValue(testMembers);

        const result = await service.smembers(testKey);

        expect(mockRedisClient.smembers).toHaveBeenCalledWith(testKey);
        expect(result).toEqual(testMembers);
      });
    });

    describe('srem', () => {
      it('should remove members from set', async () => {
        const testKey = 'test:set';
        const testMembers = ['member1', 'member2'];
        mockRedisClient.srem.mockResolvedValue(2);

        const result = await service.srem(testKey, ...testMembers);

        expect(mockRedisClient.srem).toHaveBeenCalledWith(
          testKey,
          ...testMembers,
        );
        expect(result).toBe(2);
      });
    });
  });

  describe('Counter Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('incr', () => {
      it('should increment counter', async () => {
        const testKey = 'test:counter';
        mockRedisClient.incr.mockResolvedValue(1);

        const result = await service.incr(testKey);

        expect(mockRedisClient.incr).toHaveBeenCalledWith(testKey);
        expect(result).toBe(1);
      });
    });

    describe('decr', () => {
      it('should decrement counter', async () => {
        const testKey = 'test:counter';
        mockRedisClient.decr.mockResolvedValue(-1);

        const result = await service.decr(testKey);

        expect(mockRedisClient.decr).toHaveBeenCalledWith(testKey);
        expect(result).toBe(-1);
      });
    });
  });

  describe('JSON Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('setJSON', () => {
      it('should set JSON value without TTL', async () => {
        const testKey = 'test:json';
        const testData = { name: 'test', value: 123 };
        const jsonString = JSON.stringify(testData);
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await service.setJSON(testKey, testData);

        expect(mockRedisClient.set).toHaveBeenCalledWith(testKey, jsonString);
        expect(result).toBe('OK');
      });

      it('should set JSON value with TTL', async () => {
        const testKey = 'test:json';
        const testData = { name: 'test', value: 123 };
        const ttl = 3600;
        const jsonString = JSON.stringify(testData);
        mockRedisClient.setex.mockResolvedValue('OK');

        const result = await service.setJSON(testKey, testData, ttl);

        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          testKey,
          ttl,
          jsonString,
        );
        expect(result).toBe('OK');
      });
    });

    describe('getJSON', () => {
      it('should get and parse JSON value', async () => {
        const testKey = 'test:json';
        const testData = { name: 'test', value: 123 };
        const jsonString = JSON.stringify(testData);
        mockRedisClient.get.mockResolvedValue(jsonString);

        const result = await service.getJSON<typeof testData>(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
        expect(result).toEqual(testData);
      });

      it('should return null for non-existent key', async () => {
        const testKey = 'non-existent:json';
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getJSON(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
        expect(result).toBeNull();
      });

      it('should return null and log error for invalid JSON', async () => {
        const testKey = 'invalid:json';
        const invalidJson = 'invalid-json-string';
        mockRedisClient.get.mockResolvedValue(invalidJson);

        const result = await service.getJSON(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
        expect(result).toBeNull();
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          `Failed to parse JSON for key ${testKey}:`,
          expect.any(Error),
        );
      });
    });
  });

  describe('Pub/Sub Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('publish', () => {
      it('should publish message to channel', async () => {
        const testChannel = 'test:channel';
        const testMessage = 'test message';
        mockRedisClient.publish.mockResolvedValue(1);

        const result = await service.publish(testChannel, testMessage);

        expect(mockRedisClient.publish).toHaveBeenCalledWith(
          testChannel,
          testMessage,
        );
        expect(result).toBe(1);
      });
    });

    describe('createSubscriber', () => {
      it('should create new Redis subscriber instance', () => {
        const subscriber = service.createSubscriber();

        expect(Redis).toHaveBeenLastCalledWith({
          host: mockRedisConfig.host,
          port: mockRedisConfig.port,
          password: mockRedisConfig.password,
          db: mockRedisConfig.db,
        });
        expect(subscriber).toBeDefined();
      });
    });
  });

  describe('Batch & Transaction Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('pipeline', () => {
      it('should return pipeline instance', () => {
        const mockPipeline = {} as ChainableCommander;
        mockRedisClient.pipeline.mockReturnValue(mockPipeline);

        const result = service.pipeline();

        expect(mockRedisClient.pipeline).toHaveBeenCalled();
        expect(result).toBe(mockPipeline);
      });
    });

    describe('multi', () => {
      it('should return multi instance', () => {
        const mockMulti = {} as ChainableCommander;
        mockRedisClient.multi.mockReturnValue(mockMulti);

        const result = service.multi();

        expect(mockRedisClient.multi).toHaveBeenCalled();
        expect(result).toBe(mockMulti);
      });
    });
  });

  describe('Pattern Matching Operations', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    describe('keys', () => {
      it('should get keys matching pattern', async () => {
        const testPattern = 'test:*';
        const testKeys = ['test:key1', 'test:key2'];
        mockRedisClient.keys.mockResolvedValue(testKeys);

        const result = await service.keys(testPattern);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(testPattern);
        expect(result).toEqual(testKeys);
      });
    });

    describe('scan', () => {
      it('should scan with cursor only', async () => {
        const cursor = 0;
        const mockResult: [string, string[]] = ['10', ['key1', 'key2']];
        mockRedisClient.scan.mockResolvedValue(mockResult);

        const result = await service.scan(cursor);

        expect(mockRedisClient.scan).toHaveBeenCalledWith(cursor);
        expect(result).toEqual(mockResult);
      });

      it('should scan with cursor and pattern', async () => {
        const cursor = 0;
        const pattern = 'test:*';
        const mockResult: [string, string[]] = ['10', ['test:key1']];
        mockRedisClient.scan.mockResolvedValue(mockResult);

        const result = await service.scan(cursor, pattern);

        expect(mockRedisClient.scan).toHaveBeenCalledWith(
          cursor,
          'MATCH',
          pattern,
        );
        expect(result).toEqual(mockResult);
      });

      it('should scan with cursor and count', async () => {
        const cursor = 0;
        const count = 100;
        const mockResult: [string, string[]] = ['10', ['key1', 'key2']];
        mockRedisClient.scan.mockResolvedValue(mockResult);

        const result = await service.scan(cursor, undefined, count);

        expect(mockRedisClient.scan).toHaveBeenCalledWith(
          cursor,
          'COUNT',
          count,
        );
        expect(result).toEqual(mockResult);
      });

      it('should scan with cursor, pattern, and count', async () => {
        const cursor = 0;
        const pattern = 'test:*';
        const count = 100;
        const mockResult: [string, string[]] = ['10', ['test:key1']];
        mockRedisClient.scan.mockResolvedValue(mockResult);

        const result = await service.scan(cursor, pattern, count);

        expect(mockRedisClient.scan).toHaveBeenCalledWith(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count,
        );
        expect(result).toEqual(mockResult);
      });
    });
  });
});
