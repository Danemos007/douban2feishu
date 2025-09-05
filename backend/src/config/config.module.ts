import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { CryptoModule } from '../common/crypto/crypto.module';

/**
 * 配置模块 - 用户配置管理
 *
 * 功能:
 * - 豆瓣Cookie配置
 * - 飞书应用配置
 * - 同步偏好设置
 * - 加密存储管理
 */
@Module({
  imports: [NestConfigModule, CryptoModule],
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
