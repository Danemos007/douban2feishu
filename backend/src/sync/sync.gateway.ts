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

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { SyncProgress } from './interfaces/sync.interface';

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
  async handleConnection(client: Socket) {
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
      this.logger.error(`Connection error:`, error);
      client.disconnect();
    }
  }

  /**
   * 客户端断开处理
   */
  handleDisconnect(client: Socket) {
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
      this.logger.error(`Disconnect error:`, error);
    }
  }

  /**
   * 订阅同步更新
   */
  @SubscribeMessage('subscribe-sync')
  async handleSubscribeSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { syncIds?: string[] },
  ) {
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
      this.logger.error(`Subscribe error:`, error);
      client.emit('error', { message: 'Subscription failed' });
    }
  }

  /**
   * 取消订阅同步更新
   */
  @SubscribeMessage('unsubscribe-sync')
  async handleUnsubscribeSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { syncIds?: string[] },
  ) {
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
      this.logger.error(`Unsubscribe error:`, error);
    }
  }

  /**
   * 发送同步进度更新 (被Service调用)
   */
  notifyProgress(userId: string, progress: SyncProgress) {
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
      this.logger.error(`Failed to send progress notification:`, error);
    }
  }

  /**
   * 发送错误通知
   */
  notifyError(userId: string, error: { syncId?: string; message: string; code?: string }) {
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
   * 广播系统消息
   */
  broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.server.emit('system-message', {
      message,
      level,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 从Socket中提取用户ID
   */
  private extractUserFromSocket(client: Socket): string | null {
    try {
      // 从认证中间件或JWT中提取用户信息
      // 这里需要根据实际的认证实现来调整
      return (client as any).user?.id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取在线用户统计
   */
  getOnlineStats() {
    return {
      totalConnections: this.server.sockets.sockets.size,
      uniqueUsers: this.userConnections.size,
      userConnections: Array.from(this.userConnections.entries()).map(
        ([userId, sockets]) => ({
          userId,
          connections: sockets.size,
        }),
      ),
    };
  }
}