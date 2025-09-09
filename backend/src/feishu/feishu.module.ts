import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '../redis';

import { FeishuService } from './feishu.service';
import { FeishuController } from './feishu.controller';
import { FeishuAuthService } from './services/feishu-auth.service';
import { FeishuTableService } from './services/feishu-table.service';
import { FieldMappingService } from './services/field-mapping.service';
import { FieldAutoCreationServiceV2 } from './services/field-auto-creation.service'; // 🆕 新服务
import { FieldCreationConfigManager } from './services/field-creation-config'; // 🆕 配置管理器
import { SyncEngineService } from './services/sync-engine.service';
import { FeishuContractValidatorService } from './contract/validator.service';
import { CryptoModule } from '../common/crypto/crypto.module';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * 飞书模块 - 企业级飞书API集成
 *
 * 功能:
 * - 多维表格CRUD操作
 * - ~~智能字段映射系统 ("认ID不认名")~~ **字段名精确匹配系统**
 * - 增量同步引擎 (Subject ID唯一键)
 * - 分布式Token管理
 * - 批量操作性能优化
 * - 错误恢复和重试机制
 */
@Module({
  imports: [
    ConfigModule,
    CryptoModule,
    PrismaModule,
    RedisModule,
  ],
  providers: [
    FeishuService,
    FeishuAuthService,
    FeishuTableService,
    FieldMappingService,
    FieldAutoCreationServiceV2, // 🆕 新架构服务
    FieldCreationConfigManager, // 🆕 配置管理器
    SyncEngineService,
    FeishuContractValidatorService,
  ],
  controllers: [FeishuController],
  exports: [
    FeishuService,
    FeishuAuthService,
    FeishuTableService,
    FieldMappingService,
    SyncEngineService,
  ],
})
export class FeishuModule {}
