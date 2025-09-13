import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncProcessor } from './sync.processor';
import { SyncGateway } from './sync.gateway';
import { DoubanModule } from '../douban/douban.module';
import { FeishuModule } from '../feishu/feishu.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CryptoModule } from '../common/crypto/crypto.module';

/**
 * BullMQ Redis 配置接口
 * 定义Redis连接所需的类型安全配置
 */
interface BullRedisConfig {
  host: string;
  port: number;
  password?: string;
}

/**
 * 同步模块 - 企业级数据同步模块
 *
 * 功能:
 * - 豆瓣数据抓取 (反爬虫策略)
 * - 飞书增量同步 (Subject ID唯一键)
 * - BullMQ异步任务队列
 * - WebSocket实时进度更新
 * - 加密凭证管理
 * - 错误恢复和重试机制
 */
@Module({
  imports: [
    ConfigModule,

    // BullMQ 任务队列配置
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisPassword = configService.get<string>('BULL_REDIS_PASSWORD');
        const redisConfig: BullRedisConfig = {
          host: configService.get<string>('BULL_REDIS_HOST', 'localhost'),
          port: configService.get<number>('BULL_REDIS_PORT', 6379),
        };

        if (redisPassword) {
          redisConfig.password = redisPassword;
        }

        return {
          redis: redisConfig,
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    // 注册同步队列
    BullModule.registerQueue({
      name: 'sync-queue',
    }),

    // 业务模块依赖
    DoubanModule,
    FeishuModule,
    PrismaModule,
    CryptoModule,
  ],
  providers: [SyncService, SyncProcessor, SyncGateway],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
