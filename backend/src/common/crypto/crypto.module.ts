import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CryptoService } from './crypto.service';

/**
 * 加密模块 - 三层加密架构的核心组件
 * 
 * 功能:
 * - AES-256-GCM加密/解密
 * - 随机IV生成
 * - 用户密钥派生
 * - 敏感数据保护
 */
@Module({
  imports: [ConfigModule],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}