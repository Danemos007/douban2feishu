import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// 功能模块
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { SyncModule } from './sync/sync.module';
import { DoubanModule } from './douban/douban.module';
import { FeishuModule } from './feishu/feishu.module';

// 公共模块
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';

// 守卫和拦截器
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * 主应用模块 - 豆瓣飞书同步助手(D2F)
 *
 * 架构特性:
 * - 模块化设计，职责清晰分离
 * - 三层加密安全架构
 * - 企业级错误处理和日志
 * - 自动API文档生成
 * - 全局认证和限流保护
 */
@Module({
  imports: [
    // 环境配置 - 最高优先级
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),

    // 限流保护
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000, // 60秒
            limit: parseInt(process.env.THROTTLE_LIMIT || '100'), // 100次请求
          },
        ],
      }),
    }),

    // 核心模块
    PrismaModule,
    CryptoModule,

    // 业务模块
    AuthModule,
    ConfigModule,
    SyncModule,
    DoubanModule,
    FeishuModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // 全局守卫 - JWT认证
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // 全局管道 - 数据验证和转换
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // 只保留DTO中定义的属性
        forbidNonWhitelisted: true, // 拒绝未定义的属性
        transform: true, // 自动类型转换
        transformOptions: {
          enableImplicitConversion: true,
        },
        errorHttpStatusCode: 422, // 验证失败返回422
      }),
    },

    // 全局拦截器 - 请求日志
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
