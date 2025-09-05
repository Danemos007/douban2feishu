import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import {
  UpdateDoubanConfigDto,
  UpdateFeishuConfigDto,
  UpdateSyncConfigDto,
} from './dto/config.dto';

/**
 * 配置服务 - 用户配置管理核心逻辑
 *
 * 功能:
 * - 敏感信息加密存储
 * - 配置信息CRUD操作
 * - 配置验证和完整性检查
 * - 配置历史记录
 */
@Injectable()
export class ConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 获取用户配置
   */
  async getUserConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        credentials: true,
        syncConfigs: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 解密敏感信息
    const decryptedConfig = {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        lastSyncAt: user.lastSyncAt,
      },
      douban: {
        hasConfig: !!user.credentials?.doubanCookieEncrypted,
        // 不返回实际Cookie值
      },
      feishu: {
        hasConfig: !!user.credentials?.feishuAppSecretEncrypted,
        appId: user.credentials?.feishuAppId,
        // 不返回实际Secret值
      },
      sync: user.syncConfigs
        ? {
            mappingType: user.syncConfigs.mappingType,
            autoSyncEnabled: user.syncConfigs.autoSyncEnabled,
            syncSchedule: user.syncConfigs.syncSchedule,
            tableMappings: user.syncConfigs.tableMappings,
          }
        : null,
    };

    return decryptedConfig;
  }

  /**
   * 更新豆瓣配置
   */
  async updateDoubanConfig(userId: string, dto: UpdateDoubanConfigDto) {
    // 获取或创建用户凭证
    let credentials = await this.prisma.userCredentials.findUnique({
      where: { userId },
    });

    if (!credentials) {
      // 创建新的凭证记录
      credentials = await this.prisma.userCredentials.create({
        data: {
          userId,
          encryptionIv: this.cryptoService.generateIV(),
        },
      });
    }

    // 加密Cookie
    const encryptedCookie = this.cryptoService.encrypt(
      dto.cookie,
      userId,
      credentials.encryptionIv,
    );

    // 更新数据库
    await this.prisma.userCredentials.update({
      where: { userId },
      data: {
        doubanCookieEncrypted: encryptedCookie,
      },
    });

    return { message: 'Douban configuration updated successfully' };
  }

  /**
   * 更新飞书配置
   */
  async updateFeishuConfig(userId: string, dto: UpdateFeishuConfigDto) {
    // 获取或创建用户凭证
    let credentials = await this.prisma.userCredentials.findUnique({
      where: { userId },
    });

    if (!credentials) {
      credentials = await this.prisma.userCredentials.create({
        data: {
          userId,
          encryptionIv: this.cryptoService.generateIV(),
        },
      });
    }

    // 加密App Secret
    const encryptedSecret = this.cryptoService.encrypt(
      dto.appSecret,
      userId,
      credentials.encryptionIv,
    );

    // 更新数据库
    await this.prisma.userCredentials.update({
      where: { userId },
      data: {
        feishuAppId: dto.appId,
        feishuAppSecretEncrypted: encryptedSecret,
      },
    });

    return { message: 'Feishu configuration updated successfully' };
  }

  /**
   * 更新同步配置
   */
  async updateSyncConfig(userId: string, dto: UpdateSyncConfigDto) {
    // 获取或创建同步配置
    const existingConfig = await this.prisma.syncConfig.findUnique({
      where: { userId },
    });

    if (existingConfig) {
      // 更新现有配置
      await this.prisma.syncConfig.update({
        where: { userId },
        data: {
          mappingType: dto.mappingType,
          autoSyncEnabled: dto.autoSyncEnabled,
          syncSchedule: dto.syncSchedule as any,
          tableMappings: dto.tableMappings as any,
        },
      });
    } else {
      // 创建新配置
      await this.prisma.syncConfig.create({
        data: {
          userId,
          mappingType: dto.mappingType,
          autoSyncEnabled: dto.autoSyncEnabled,
          syncSchedule: dto.syncSchedule as any,
          tableMappings: dto.tableMappings as any,
        },
      });
    }

    return { message: 'Sync configuration updated successfully' };
  }

  /**
   * 获取解密后的用户凭证 (内部使用)
   */
  async getDecryptedCredentials(userId: string) {
    const credentials = await this.prisma.userCredentials.findUnique({
      where: { userId },
    });

    if (!credentials) {
      return null;
    }

    const result: any = {
      userId,
    };

    // 解密豆瓣Cookie
    if (credentials.doubanCookieEncrypted) {
      result.doubanCookie = this.cryptoService.decrypt(
        credentials.doubanCookieEncrypted,
        userId,
      );
    }

    // 解密飞书App Secret
    if (credentials.feishuAppSecretEncrypted) {
      result.feishuAppId = credentials.feishuAppId;
      result.feishuAppSecret = this.cryptoService.decrypt(
        credentials.feishuAppSecretEncrypted,
        userId,
      );
    }

    return result;
  }

  /**
   * 删除用户配置
   */
  async deleteUserConfig(
    userId: string,
    configType: 'douban' | 'feishu' | 'sync' | 'all',
  ) {
    switch (configType) {
      case 'douban':
        await this.prisma.userCredentials.update({
          where: { userId },
          data: {
            doubanCookieEncrypted: null,
          },
        });
        break;

      case 'feishu':
        await this.prisma.userCredentials.update({
          where: { userId },
          data: {
            feishuAppId: null,
            feishuAppSecretEncrypted: null,
          },
        });
        break;

      case 'sync':
        await this.prisma.syncConfig.deleteMany({
          where: { userId },
        });
        break;

      case 'all':
        await this.prisma.$transaction([
          this.prisma.syncConfig.deleteMany({ where: { userId } }),
          this.prisma.userCredentials.deleteMany({ where: { userId } }),
        ]);
        break;
    }

    return { message: `${configType} configuration deleted successfully` };
  }

  /**
   * 验证配置完整性
   */
  async validateConfig(userId: string) {
    const config = await this.getUserConfig(userId);

    const validation = {
      douban: {
        configured: config.douban.hasConfig,
        valid: false, // 需要实际验证Cookie
      },
      feishu: {
        configured: config.feishu.hasConfig,
        valid: false, // 需要实际验证API凭证
      },
      sync: {
        configured: !!config.sync,
        valid: !!config.sync?.mappingType,
      },
      overall: false,
    };

    validation.overall =
      validation.douban.configured &&
      validation.feishu.configured &&
      validation.sync.configured;

    return validation;
  }
}
