import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

/**
 * 豆瓣飞书同步助手(D2F) - 后端服务启动器
 *
 * 企业级特性:
 * - 安全头部防护 (Helmet)
 * - 响应压缩 (Compression)
 * - CORS跨域配置
 * - API文档自动生成 (Swagger)
 * - 优雅关闭处理
 * - 健康检查端点
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // 创建NestJS应用实例
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // 获取配置服务
    const configService = app.get(ConfigService);

    // 安全中间件
    if (configService.get<boolean>('HELMET_ENABLED', true)) {
      app.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          },
          crossOriginEmbedderPolicy: false, // 兼容Swagger UI
        }),
      );
    }

    // 响应压缩
    app.use(compression());

    // CORS配置
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // 全局API前缀
    const apiPrefix = configService.get<string>('API_PREFIX', 'api');
    app.setGlobalPrefix(apiPrefix);

    // Swagger API文档
    if (configService.get<string>('NODE_ENV') !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('豆瓣飞书同步助手 API')
        .setDescription(
          `
          D2F (Douban to Feishu) 同步助手后端API文档
          
          ## 功能特性
          - 🔐 JWT身份认证
          - 📚 豆瓣数据抓取 (反爬虫策略)
          - 📊 飞书多维表格同步
          - 🔒 三层加密安全架构
          - 🚀 异步任务队列处理
          - 📡 WebSocket实时更新
          
          ## 技术栈
          - NestJS + TypeScript
          - PostgreSQL + Prisma ORM
          - Redis + BullMQ
          - JWT + Passport.js
        `,
        )
        .setVersion('1.0.0')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        })
        .addTag('Authentication', '用户认证相关接口')
        .addTag('Configuration', '配置管理接口')
        .addTag('Sync', '同步操作接口')
        .addTag('Douban', '豆瓣数据接口')
        .addTag('Feishu', '飞书API接口')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      });

      logger.log(
        `📖 API Documentation available at http://localhost:${configService.get('PORT', 3001)}/${apiPrefix}/docs`,
      );
    }

    // 健康检查端点
    if (configService.get<boolean>('HEALTH_CHECK_ENABLED', true)) {
      await import('./app.controller');
      // 健康检查逻辑已在AppController中实现
    }

    // 启动服务器
    const port = configService.get<number>('PORT', 3001);
    await app.listen(port);

    logger.log(`🚀 D2F Backend Service started on port ${port}`);
    logger.log(
      `🌍 Environment: ${configService.get('NODE_ENV', 'development')}`,
    );
    logger.log(`📱 API Base URL: http://localhost:${port}/${apiPrefix}`);

    // 优雅关闭处理
    process.on('SIGTERM', () => {
      logger.log('SIGTERM received, shutting down gracefully...');
      void app.close();
    });

    process.on('SIGINT', () => {
      logger.log('SIGINT received, shutting down gracefully...');
      void app.close();
    });
  } catch (error) {
    logger.error('Failed to start the application:', error);
    process.exit(1);
  }
}

// 启动应用
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Bootstrap failed:', error);
  process.exit(1);
});
