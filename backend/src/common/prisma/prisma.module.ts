import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma模块 - 全局数据库访问层
 *
 * 功能:
 * - PostgreSQL数据库连接
 * - 连接池管理
 * - 事务处理支持
 * - 类型安全的数据库操作
 * - 全局可用 (@Global装饰器)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
