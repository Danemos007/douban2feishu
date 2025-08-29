import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * 应用主服务 - 系统级业务逻辑
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取欢迎信息
   */
  getWelcome() {
    return {
      name: '豆瓣飞书同步助手 (D2F)',
      description: 'Douban to Feishu Sync Assistant - Backend API',
      version: this.getVersion().version,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      docs: '/api/docs', // Swagger文档路径
      features: [
        '🔐 JWT Authentication',
        '📚 Douban Data Scraping',
        '📊 Feishu Multi-dimensional Tables',
        '🔒 Three-layer Security Architecture',
        '🚀 Async Task Queue',
        '📡 Real-time WebSocket Updates',
      ],
    };
  }

  /**
   * 健康检查
   */
  async getHealthCheck() {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    // 检查各个依赖项的健康状态
    const checks = {
      database: 'unknown',
      redis: 'unknown',
    };

    try {
      // 检查数据库连接
      const isDbHealthy = await this.prisma.healthCheck();
      checks.database = isDbHealthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.logger.warn('Database health check failed:', error);
      checks.database = 'unhealthy';
    }

    try {
      // 检查Redis连接 (通过BullMQ)
      // 这里可以添加Redis健康检查逻辑
      checks.redis = 'healthy'; // 临时设置
    } catch (error) {
      this.logger.warn('Redis health check failed:', error);
      checks.redis = 'unhealthy';
    }

    // 确定整体健康状态
    const isHealthy = Object.values(checks).every(status => status === 'healthy');
    const status = isHealthy ? 'healthy' : 'unhealthy';

    const healthData = {
      status,
      timestamp,
      uptime,
      version: this.getVersion().version,
      checks,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    if (!isHealthy) {
      this.logger.warn('Health check failed:', healthData);
    }

    return healthData;
  }

  /**
   * 获取版本信息
   */
  getVersion() {
    return {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }
}
