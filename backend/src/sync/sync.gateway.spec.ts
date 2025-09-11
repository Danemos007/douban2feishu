import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { SyncGateway } from './sync.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SyncProgress,
  SyncProgressEvent,
  SyncStatus,
  WebSocketEvent,
} from './interfaces/sync.interface';

// 测试专用接口 - 用于安全访问SyncGateway私有方法和属性
interface SyncGatewayTestAccess {
  extractUserFromSocket(client: Socket): string | null;
  emitTypedEvent(userId: string, event: WebSocketEvent): void;
  userConnections: Map<string, Set<string>>;
}

// 类型安全的Jest匹配器类型定义 - 已移除未使用的类型

// Jest匹配器工厂函数 - 提供类型安全的匹配器
const createTypeSafeMatchers = {
  objectContaining: <T>(obj: Partial<T>): T =>
    expect.objectContaining(obj) as T,
  any: <T>(constructor: new (...args: unknown[]) => T): T =>
    expect.any(constructor) as T,
};

describe('SyncGateway', () => {
  let gateway: SyncGateway;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  // Logger spies - 解决unbound-method问题
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  // Mock方法的类型安全引用将在beforeEach中初始化

  // Gateway spy引用 - 解决unbound-method问题
  let emitTypedEventSpy: jest.SpyInstance;

  // Mock 数据
  const mockUserId = 'test-user-id';
  const mockSocketId = 'test-socket-id';
  const mockSyncId = 'test-sync-id';

  const mockSyncProgress: SyncProgress = {
    syncId: mockSyncId,
    jobId: 'test-job-id',
    status: 'RUNNING' as SyncStatus,
    progress: 50,
    message: 'Sync in progress',
    itemsProcessed: 10,
    totalItems: 20,
    metadata: {
      phase: 'transform',
      category: 'books',
      batchSize: 5,
      currentBatch: 2,
      totalBatches: 4,
      timestamp: '2023-01-01T12:00:00.000Z',
      performance: {
        startTime: new Date('2023-01-01T11:00:00.000Z'),
        duration: 3600000,
      },
    },
  };

  const mockSyncErrorData = {
    syncId: mockSyncId,
    message: 'Sync failed',
    code: 'SYNC_ERROR',
    severity: 'error' as const,
  };

  beforeEach(async () => {
    // 创建 Mock Server - 完全类型安全的mock
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnValue(true),
      sockets: {
        sockets: {
          size: 0,
        },
      },
    } as unknown as jest.Mocked<Server>;

    // 创建 Mock Socket - 完全类型安全的mock
    mockSocket = {
      id: mockSocketId,
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue(true),
      disconnect: jest.fn().mockReturnThis(),
      user: { id: mockUserId },
      // 添加Socket所需的基础属性
      handshake: {
        auth: {},
        headers: {},
        query: {},
        url: '',
        address: '',
        time: '',
        issued: 0,
        xdomain: false,
        secure: false,
      },
      rooms: new Set(),
      data: {},
      connected: true,
      disconnected: false,
    } as unknown as jest.Mocked<Socket & { user: { id: string } }>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncGateway,
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    gateway = module.get<SyncGateway>(SyncGateway);

    // 设置 Mock Server
    gateway.server = mockServer;

    // Mock Logger 方法 - 存储spy引用解决unbound-method
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Mock方法已在mockSocket和mockServer对象中定义为jest.fn()
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    beforeEach(() => {
      // Mock extractUserFromSocket
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(mockUserId);
    });

    it('应该成功处理客户端连接', async () => {
      await gateway.handleConnection(mockSocket);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'WebSocket connected successfully',
        userId: mockUserId,
        timestamp: createTypeSafeMatchers.any(String),
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Client ${mockSocketId} connected for user ${mockUserId}`,
      );
    });

    it('应该拒绝没有有效用户ID的连接', async () => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(null);

      await gateway.handleConnection(mockSocket);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Connection rejected: No valid user ID',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.disconnect).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('应该处理连接过程中的错误', async () => {
      const testError = new Error('Connection error');
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockImplementation(() => {
          throw testError;
        });

      await gateway.handleConnection(mockSocket);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Connection error:',
        'Connection error',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('应该管理用户连接记录', async () => {
      await gateway.handleConnection(mockSocket);

      // 访问私有属性进行测试
      const userConnections = (gateway as unknown as SyncGatewayTestAccess)
        .userConnections;
      expect(userConnections.has(mockUserId)).toBe(true);
      expect(userConnections.get(mockUserId)?.has(mockSocketId)).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    beforeEach(() => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(mockUserId);
    });

    it('应该成功处理客户端断开', () => {
      // 先建立连接
      const userConnections = (gateway as unknown as SyncGatewayTestAccess)
        .userConnections;
      userConnections.set(mockUserId, new Set([mockSocketId]));

      gateway.handleDisconnect(mockSocket);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Client ${mockSocketId} disconnected for user ${mockUserId}`,
      );
      expect(userConnections.has(mockUserId)).toBe(false);
    });

    it('应该清理用户连接记录', () => {
      // 设置多个连接
      const userConnections = (gateway as unknown as SyncGatewayTestAccess)
        .userConnections;
      const socketSet = new Set([mockSocketId, 'another-socket']);
      userConnections.set(mockUserId, socketSet);

      gateway.handleDisconnect(mockSocket);

      expect(userConnections.get(mockUserId)?.has(mockSocketId)).toBe(false);
      expect(userConnections.get(mockUserId)?.has('another-socket')).toBe(true);
    });

    it('应该处理断开过程中的错误', () => {
      const testError = new Error('Disconnect error');
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockImplementation(() => {
          throw testError;
        });

      gateway.handleDisconnect(mockSocket);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Disconnect error:',
        'Disconnect error',
      );
    });

    it('应该处理未知用户的断开', () => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(null);

      // 不应该抛出错误
      expect(() => gateway.handleDisconnect(mockSocket)).not.toThrow();
    });
  });

  describe('handleSubscribeSync', () => {
    beforeEach(() => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(mockUserId);
    });

    it('应该成功订阅同步更新', async () => {
      const subscribeData = {
        syncIds: [mockSyncId, 'another-sync-id'],
        categories: ['books', 'movies'],
      };

      await gateway.handleSubscribeSync(mockSocket, subscribeData);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).toHaveBeenCalledWith(`sync:${mockSyncId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).toHaveBeenCalledWith('sync:another-sync-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        message: 'Subscribed to sync updates',
        syncIds: subscribeData.syncIds,
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该处理没有指定syncIds的订阅', async () => {
      await gateway.handleSubscribeSync(mockSocket, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        message: 'Subscribed to sync updates',
        syncIds: [],
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该拒绝未认证用户的订阅', async () => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(null);

      await gateway.handleSubscribeSync(mockSocket, { syncIds: [mockSyncId] });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('应该处理订阅过程中的错误', async () => {
      const testError = new Error('Subscribe error');
      mockSocket.join.mockRejectedValue(testError);

      await gateway.handleSubscribeSync(mockSocket, { syncIds: [mockSyncId] });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Subscribe error:',
        'Subscribe error',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Subscription failed',
      });
    });
  });

  describe('handleUnsubscribeSync', () => {
    it('应该成功取消订阅同步更新', async () => {
      const unsubscribeData = {
        syncIds: [mockSyncId, 'another-sync-id'],
      };

      await gateway.handleUnsubscribeSync(mockSocket, unsubscribeData);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.leave).toHaveBeenCalledWith(`sync:${mockSyncId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.leave).toHaveBeenCalledWith('sync:another-sync-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        message: 'Unsubscribed from sync updates',
        syncIds: unsubscribeData.syncIds,
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该处理没有指定syncIds的取消订阅', async () => {
      await gateway.handleUnsubscribeSync(mockSocket, {});

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.leave).not.toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        message: 'Unsubscribed from sync updates',
        syncIds: [],
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该处理取消订阅过程中的错误', async () => {
      const testError = new Error('Unsubscribe error');
      mockSocket.leave.mockRejectedValue(testError);

      await gateway.handleUnsubscribeSync(mockSocket, {
        syncIds: [mockSyncId],
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unsubscribe error:',
        'Unsubscribe error',
      );
    });
  });

  describe('notifyProgress', () => {
    it('应该发送同步进度更新到用户房间', () => {
      gateway.notifyProgress(mockUserId, mockSyncProgress);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith('sync-progress', {
        ...mockSyncProgress,
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该同时发送到同步ID房间', () => {
      gateway.notifyProgress(mockUserId, mockSyncProgress);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`sync:${mockSyncId}`);
    });

    it('应该处理没有syncId的进度更新', () => {
      const progressWithoutSyncId: SyncProgress = {
        ...mockSyncProgress,
        syncId: '',
      };

      gateway.notifyProgress(mockUserId, progressWithoutSyncId);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledTimes(1); // 不应该调用sync房间
    });

    it('应该记录调试日志', () => {
      gateway.notifyProgress(mockUserId, mockSyncProgress);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Progress sent to user ${mockUserId}: ${mockSyncProgress.message}`,
      );
    });

    it('应该处理发送进度时的错误', () => {
      const testError = new Error('Progress error');
      mockServer.to.mockImplementation(() => {
        throw testError;
      });

      gateway.notifyProgress(mockUserId, mockSyncProgress);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send progress notification:',
        'Progress error',
      );
    });
  });

  describe('notifyError', () => {
    it('应该发送错误通知到用户房间', () => {
      gateway.notifyError(mockUserId, mockSyncErrorData);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith('sync-error', {
        ...mockSyncErrorData,
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该处理发送错误通知时的异常', () => {
      const testError = new Error('Error notification failed');
      mockServer.to.mockImplementation(() => {
        throw testError;
      });

      gateway.notifyError(mockUserId, mockSyncErrorData);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send error notification:',
        testError,
      );
    });
  });

  describe('broadcastSystemMessage', () => {
    it('应该广播系统消息', () => {
      const message = 'System maintenance';
      const level = 'warning';

      gateway.broadcastSystemMessage(message, level);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith('system-message', {
        message,
        level,
        timestamp: createTypeSafeMatchers.any(String),
      });
    });

    it('应该使用默认级别info', () => {
      const message = 'System info';

      gateway.broadcastSystemMessage(message);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith('system-message', {
        message,
        level: 'info',
        timestamp: createTypeSafeMatchers.any(String),
      });
    });
  });

  describe('extractUserFromSocket', () => {
    it('应该从socket中提取用户ID', () => {
      const result = (
        gateway as unknown as SyncGatewayTestAccess
      ).extractUserFromSocket(mockSocket);

      expect(result).toBe(mockUserId);
    });

    it('应该处理没有用户信息的socket', () => {
      const socketWithoutUser = {
        user: undefined,
        id: 'test-socket-no-user',
        handshake: {
          auth: {},
          headers: {},
          query: {},
          url: '',
          address: '',
          time: '',
          issued: 0,
          xdomain: false,
          secure: false,
        },
        rooms: new Set(),
        data: {},
        connected: true,
        disconnected: false,
      } as unknown as Socket;

      const result = (
        gateway as unknown as SyncGatewayTestAccess
      ).extractUserFromSocket(socketWithoutUser);

      expect(result).toBeNull();
    });

    it('应该处理提取用户ID时的错误', () => {
      const faultySocket = {
        get user() {
          throw new Error('User extraction error');
        },
        id: 'test-socket-faulty',
        handshake: {
          auth: {},
          headers: {},
          query: {},
          url: '',
          address: '',
          time: '',
          issued: 0,
          xdomain: false,
          secure: false,
        },
        rooms: new Set(),
        data: {},
        connected: true,
        disconnected: false,
      } as unknown as Socket;

      const result = (
        gateway as unknown as SyncGatewayTestAccess
      ).extractUserFromSocket(faultySocket);

      expect(result).toBeNull();
    });
  });

  describe('emitTypedEvent', () => {
    const mockProgressEvent: SyncProgressEvent = {
      type: 'sync-progress',
      timestamp: '2023-01-01T12:00:00.000Z',
      data: mockSyncProgress,
    };

    it('应该发送类型安全的WebSocket事件', () => {
      (gateway as unknown as SyncGatewayTestAccess).emitTypedEvent(
        mockUserId,
        mockProgressEvent,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith('sync-progress', {
        ...mockProgressEvent,
        timestamp: createTypeSafeMatchers.any(String),
        eventId: createTypeSafeMatchers.any(String),
      });
    });

    it('应该为sync-progress事件同时发送到sync房间', () => {
      (gateway as unknown as SyncGatewayTestAccess).emitTypedEvent(
        mockUserId,
        mockProgressEvent,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`sync:${mockSyncId}`);
    });

    it('应该生成唯一的eventId', () => {
      const calls: Array<[string, { eventId: string }]> = [];
      (
        mockServer.emit as jest.MockedFunction<Server['emit']>
      ).mockImplementation((...args: [string, { eventId: string }]) => {
        calls.push(args);
        return true;
      });

      (gateway as unknown as SyncGatewayTestAccess).emitTypedEvent(
        mockUserId,
        mockProgressEvent,
      );
      (gateway as unknown as SyncGatewayTestAccess).emitTypedEvent(
        mockUserId,
        mockProgressEvent,
      );

      // 每次emitTypedEvent调用会发送到2个房间（用户房间+sync房间），所以总共4次调用
      expect(calls.length).toBe(4);
      expect(calls[0][1].eventId).not.toBe(calls[2][1].eventId); // 比较第一次和第二次调用的eventId
    });
  });

  describe('notifyCompletion', () => {
    const mockSyncData = {
      syncId: mockSyncId,
      success: true,
      itemsProcessed: 100,
      duration: 5000,
      summary: 'Sync completed successfully',
    };

    beforeEach(() => {
      emitTypedEventSpy = jest
        .spyOn(gateway as unknown as SyncGatewayTestAccess, 'emitTypedEvent')
        .mockImplementation();
    });

    it('应该发送成功的同步完成通知', () => {
      gateway.notifyCompletion(mockUserId, mockSyncData);

      expect(emitTypedEventSpy).toHaveBeenCalledWith(
        mockUserId,
        createTypeSafeMatchers.objectContaining<SyncProgressEvent>({
          type: 'sync-progress',
          data: createTypeSafeMatchers.objectContaining({
            syncId: mockSyncId,
            status: 'SUCCESS' as SyncStatus,
            progress: 100,
            message: 'Sync completed successfully',
            itemsProcessed: 100,
            metadata: createTypeSafeMatchers.objectContaining({
              performance: { duration: 5000 },
            }),
          }),
        }),
      );
    });

    it('应该发送失败的同步完成通知', () => {
      const failedSyncData = { ...mockSyncData, success: false };

      gateway.notifyCompletion(mockUserId, failedSyncData);

      expect(emitTypedEventSpy).toHaveBeenCalledWith(
        mockUserId,
        createTypeSafeMatchers.objectContaining<SyncProgressEvent>({
          data: createTypeSafeMatchers.objectContaining({
            syncId: mockSyncId,
            status: 'FAILED' as SyncStatus,
            progress: 0,
            message: 'Sync completed successfully', // 使用提供的summary
          }),
        }),
      );
    });

    it('应该使用默认消息当没有summary时', () => {
      const syncDataWithoutSummary = {
        syncId: mockSyncData.syncId,
        success: mockSyncData.success,
        itemsProcessed: mockSyncData.itemsProcessed,
        duration: mockSyncData.duration,
      };

      gateway.notifyCompletion(mockUserId, syncDataWithoutSummary);

      expect(emitTypedEventSpy).toHaveBeenCalledWith(
        mockUserId,
        createTypeSafeMatchers.objectContaining<SyncProgressEvent>({
          data: createTypeSafeMatchers.objectContaining({
            syncId: mockSyncId,
            status: 'SUCCESS' as SyncStatus,
            progress: 100,
            message: 'Sync completed',
          }),
        }),
      );
    });
  });

  describe('getOnlineStats', () => {
    beforeEach(() => {
      // 设置mock用户连接
      const userConnections = (gateway as unknown as SyncGatewayTestAccess)
        .userConnections;
      userConnections.set(mockUserId, new Set([mockSocketId, 'socket-2']));
      userConnections.set('user-2', new Set(['socket-3']));

      // Mock server sockets
      Object.defineProperty(mockServer.sockets.sockets, 'size', {
        value: 3,
        writable: true,
        configurable: true,
      });
    });

    it('应该返回在线统计信息', () => {
      const stats = gateway.getOnlineStats();

      expect(stats).toEqual({
        totalConnections: 3,
        uniqueUsers: 2,
        userConnections: [
          {
            userId: mockUserId,
            connections: 2,
            lastActivity: createTypeSafeMatchers.any(String),
          },
          {
            userId: 'user-2',
            connections: 1,
            lastActivity: createTypeSafeMatchers.any(String),
          },
        ],
        serverInfo: {
          namespace: '/sync',
          uptime: createTypeSafeMatchers.any(Number),
          timestamp: createTypeSafeMatchers.any(String),
        },
      });
    });

    it('应该返回空统计当没有连接时', () => {
      (gateway as unknown as SyncGatewayTestAccess).userConnections.clear();
      Object.defineProperty(mockServer.sockets.sockets, 'size', {
        value: 0,
        writable: true,
        configurable: true,
      });

      const stats = gateway.getOnlineStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.userConnections).toEqual([]);
    });
  });

  describe('集成测试', () => {
    it('应该完整处理客户端连接到订阅的流程', async () => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(mockUserId);

      // 1. 处理连接
      await gateway.handleConnection(mockSocket);

      // 2. 订阅同步更新
      await gateway.handleSubscribeSync(mockSocket, { syncIds: [mockSyncId] });

      // 3. 发送进度更新
      gateway.notifyProgress(mockUserId, mockSyncProgress);

      // 4. 发送完成通知
      gateway.notifyCompletion(mockUserId, {
        syncId: mockSyncId,
        success: true,
        itemsProcessed: 100,
        duration: 5000,
      });

      // 验证完整流程
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.join).toHaveBeenCalledWith(`sync:${mockSyncId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`user:${mockUserId}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.to).toHaveBeenCalledWith(`sync:${mockSyncId}`);
    });

    it('应该处理错误恢复场景', async () => {
      jest
        .spyOn(
          gateway as unknown as SyncGatewayTestAccess,
          'extractUserFromSocket',
        )
        .mockReturnValue(mockUserId);

      // 模拟连接建立
      await gateway.handleConnection(mockSocket);

      // 模拟同步错误
      gateway.notifyError(mockUserId, mockSyncErrorData);

      // 模拟连接断开
      gateway.handleDisconnect(mockSocket);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connected',
        expect.any(Object),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Jest mock functions are safe to reference
      expect(mockServer.emit).toHaveBeenCalledWith(
        'sync-error',
        expect.any(Object),
      );
    });
  });
});
