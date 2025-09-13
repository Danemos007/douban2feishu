import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import {
  SyncProgress,
  WebSocketEvent,
  SyncProgressEvent,
  SyncErrorEvent,
} from './interfaces/sync.interface';

/**
 * 认证后的Socket接口 - 包含用户信息
 */
interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser;
}

/**
 * 同步WebSocket网关 - 实时状态更新
 *
 * 功能:
 * - 实时同步进度推送
 * - 用户房间管理
 * - 认证集成
 * - 错误通知
 * - 连接状态管理
 */
@WebSocketGateway({
  namespace: '/sync',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SyncGateway.name);
  private readonly userConnections = new Map<string, Set<string>>();

  /**
   * 客户端连接处理
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 从JWT token中提取用户ID
      const userId = this.extractUserFromSocket(client);

      if (!userId) {
        this.logger.warn(`Connection rejected: No valid user ID`);
        client.disconnect();
        return;
      }

      // 将客户端加入用户房间
      await client.join(`user:${userId}`);

      // 记录连接
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);

      // 发送连接成功消息
      client.emit('connected', {
        message: 'WebSocket connected successfully',
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Connection error:`, errorMessage);
      client.disconnect();
    }
  }

  /**
   * 客户端断开处理
   */
  handleDisconnect(client: AuthenticatedSocket) {
    try {
      const userId = this.extractUserFromSocket(client);

      if (userId) {
        const userSockets = this.userConnections.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.userConnections.delete(userId);
          }
        }

        this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Disconnect error:`, errorMessage);
    }
  }

  /**
   * 订阅同步更新 - 类型安全版本
   */
  @SubscribeMessage('subscribe-sync')
  async handleSubscribeSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { syncIds?: string[]; categories?: string[] },
  ): Promise<void> {
    try {
      const userId = this.extractUserFromSocket(client);

      if (!userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      // 如果指定了特定的同步ID，加入对应房间
      if (data.syncIds?.length) {
        for (const syncId of data.syncIds) {
          await client.join(`sync:${syncId}`);
        }
      }

      client.emit('subscribed', {
        message: 'Subscribed to sync updates',
        syncIds: data.syncIds || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Subscribe error:`, errorMessage);
      client.emit('error', { message: 'Subscription failed' });
    }
  }

  /**
   * 取消订阅同步更新 - 类型安全版本
   */
  @SubscribeMessage('unsubscribe-sync')
  async handleUnsubscribeSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { syncIds?: string[] },
  ): Promise<void> {
    try {
      if (data.syncIds?.length) {
        for (const syncId of data.syncIds) {
          await client.leave(`sync:${syncId}`);
        }
      }

      client.emit('unsubscribed', {
        message: 'Unsubscribed from sync updates',
        syncIds: data.syncIds || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Unsubscribe error:`, errorMessage);
    }
  }

  /**
   * 发送同步进度更新 - 强类型版本 (被Service调用)
   */
  notifyProgress(userId: string, progress: SyncProgress): void {
    try {
      // 发送到用户房间
      this.server.to(`user:${userId}`).emit('sync-progress', {
        ...progress,
        timestamp: new Date().toISOString(),
      });

      // 如果有同步ID，也发送到对应房间
      if (progress.syncId) {
        this.server.to(`sync:${progress.syncId}`).emit('sync-progress', {
          ...progress,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(`Progress sent to user ${userId}: ${progress.message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send progress notification:`, errorMessage);
    }
  }

  /**
   * 发送错误通知 - 强类型版本
   */
  notifyError(userId: string, error: SyncErrorEvent['data']): void {
    try {
      this.server.to(`user:${userId}`).emit('sync-error', {
        ...error,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to send error notification:`, err);
    }
  }

  /**
   * 广播系统消息 - 强类型版本
   */
  broadcastSystemMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ): void {
    this.server.emit('system-message', {
      message,
      level,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 从Socket中提取用户ID - 类型安全版本
   */
  private extractUserFromSocket(client: AuthenticatedSocket): string | null {
    try {
      // 从认证中间件设置的用户信息中提取ID
      return client.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取在线用户统计
   */
  /**
   * 发送类型安全的WebSocket事件
   */
  private emitTypedEvent(userId: string, event: WebSocketEvent): void {
    const eventData = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      eventId: `${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.server.to(`user:${userId}`).emit(event.type, eventData);

    if (event.type === 'sync-progress' && event.data.syncId) {
      this.server.to(`sync:${event.data.syncId}`).emit(event.type, eventData);
    }
  }

  /**
   * 发送同步完成通知
   */
  notifyCompletion(
    userId: string,
    syncData: {
      syncId: string;
      success: boolean;
      itemsProcessed: number;
      duration: number;
      summary?: string;
    },
  ): void {
    const event: SyncProgressEvent = {
      type: 'sync-progress',
      timestamp: new Date().toISOString(),
      data: {
        syncId: syncData.syncId,
        status: syncData.success ? 'SUCCESS' : 'FAILED',
        progress: syncData.success ? 100 : 0,
        message:
          syncData.summary ||
          `Sync ${syncData.success ? 'completed' : 'failed'}`,
        itemsProcessed: syncData.itemsProcessed,
        metadata: {
          performance: {
            duration: syncData.duration,
          },
        },
      },
    };

    this.emitTypedEvent(userId, event);
  }

  getOnlineStats(): {
    totalConnections: number;
    uniqueUsers: number;
    userConnections: Array<{
      userId: string;
      connections: number;
      lastActivity?: string;
    }>;
    serverInfo: {
      namespace: string;
      uptime: number;
      timestamp: string;
    };
  } {
    return {
      totalConnections: this.server.sockets.sockets.size,
      uniqueUsers: this.userConnections.size,
      userConnections: Array.from(this.userConnections.entries()).map(
        ([userId, sockets]) => ({
          userId,
          connections: sockets.size,
          lastActivity: new Date().toISOString(),
        }),
      ),
      serverInfo: {
        namespace: '/sync',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
