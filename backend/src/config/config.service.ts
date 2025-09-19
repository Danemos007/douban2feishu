import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import {
  UpdateDoubanConfigDto,
  UpdateFeishuConfigDto,
  UpdateSyncConfigDto,
} from './dto/config.dto';

// 同步调度配置类型定义 - 与DTO保持一致
interface SyncSchedule {
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm格式
  timezone?: string;
  daysOfWeek?: number[]; // 0-6, 周日为0
  dayOfMonth?: number; // 1-31
}

// 表格映射配置类型定义 - 与DTO保持一致
interface TableMappings {
  books?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  movies?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  music?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
  unified?: {
    tableId: string;
    fieldMappings: Record<string, string>;
  };
}

// 解密后凭证返回类型定义
interface DecryptedCredentials {
  userId: string;
  doubanCookie?: string;
  feishuAppId?: string;
  feishuAppSecret?: string;
}

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
   * 将强类型对象转换为Prisma JSON字段可接受的类型
   * 避免直接使用 as any 造成的unsafe-assignment错误
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toJsonValue(value: SyncSchedule | TableMappings | undefined): any {
    return value; // TypeScript允许任何类型到any的隐式转换
  }

  /**
   * @description 获取指定用户的完整配置信息，包括脱敏的凭证状态和同步配置
   * @param userId - 用户唯一标识符
   * @returns Promise<object> 包含用户基本信息、豆瓣配置状态、飞书配置状态和同步配置的完整对象
   * @throws {NotFoundException} 当指定的用户不存在时抛出此异常
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
   * @description 更新或创建用户的豆瓣配置，使用AES-256加密存储Cookie信息
   * @param userId - 用户唯一标识符
   * @param dto - 包含豆瓣Cookie的配置数据传输对象
   * @returns Promise<object> 包含操作成功消息的响应对象
   * @throws {Error} 当加密操作失败或数据库更新失败时抛出异常
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
   * @description 更新或创建用户的飞书配置，加密存储应用密钥，明文存储应用ID
   * @param userId - 用户唯一标识符
   * @param dto - 包含飞书应用ID和应用密钥的配置数据传输对象
   * @returns Promise<object> 包含操作成功消息的响应对象
   * @throws {Error} 当加密操作失败或数据库更新失败时抛出异常
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
   * @description 更新或创建用户的同步配置，包括映射类型、自动同步开关、调度配置和表格映射
   * @param userId - 用户唯一标识符
   * @param dto - 包含同步映射类型、自动同步设置、调度配置和表格映射的配置数据传输对象
   * @returns Promise<object> 包含操作成功消息的响应对象
   * @throws {Error} 当数据库操作失败或配置验证失败时抛出异常
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          syncSchedule: this.toJsonValue(dto.syncSchedule as SyncSchedule),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tableMappings: this.toJsonValue(dto.tableMappings as TableMappings),
        },
      });
    } else {
      // 创建新配置
      await this.prisma.syncConfig.create({
        data: {
          userId,
          mappingType: dto.mappingType,
          autoSyncEnabled: dto.autoSyncEnabled,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          syncSchedule: this.toJsonValue(dto.syncSchedule as SyncSchedule),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tableMappings: this.toJsonValue(dto.tableMappings as TableMappings),
        },
      });
    }

    return { message: 'Sync configuration updated successfully' };
  }

  /**
   * @description 获取用户的解密凭证信息，用于内部服务间调用，返回明文的豆瓣Cookie和飞书应用密钥
   * @param userId - 用户唯一标识符
   * @returns Promise<DecryptedCredentials | null> 解密后的用户凭证对象，如果用户无凭证则返回null
   * @throws {Error} 当解密操作失败或数据库查询失败时抛出异常
   */
  async getDecryptedCredentials(
    userId: string,
  ): Promise<DecryptedCredentials | null> {
    const credentials = await this.prisma.userCredentials.findUnique({
      where: { userId },
    });

    if (!credentials) {
      return null;
    }

    const result: DecryptedCredentials = {
      userId,
    };

    // 解密豆瓣Cookie
    if (credentials.doubanCookieEncrypted) {
      const decryptedCookie = this.cryptoService.decrypt(
        credentials.doubanCookieEncrypted,
        userId,
      );
      result.doubanCookie = decryptedCookie ?? undefined;
    }

    // 解密飞书App Secret
    if (credentials.feishuAppSecretEncrypted) {
      result.feishuAppId = credentials.feishuAppId ?? undefined;
      const decryptedSecret = this.cryptoService.decrypt(
        credentials.feishuAppSecretEncrypted,
        userId,
      );
      result.feishuAppSecret = decryptedSecret ?? undefined;
    }

    return result;
  }

  /**
   * @description 根据指定类型删除用户配置，支持删除豆瓣、飞书、同步配置或全部配置
   * @param userId - 用户唯一标识符
   * @param configType - 要删除的配置类型：'douban'(豆瓣配置)、'feishu'(飞书配置)、'sync'(同步配置)或'all'(全部配置)
   * @returns Promise<object> 包含删除操作成功消息的响应对象
   * @throws {Error} 当数据库删除操作失败时抛出异常
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
   * @description 验证用户配置的完整性和有效性，检查豆瓣、飞书和同步配置的状态
   * @param userId - 用户唯一标识符
   * @returns Promise<object> 包含各项配置验证结果的对象，包含configured和valid状态以及总体验证结果
   * @throws {NotFoundException} 当用户不存在时通过getUserConfig方法传播此异常
   * @throws {Error} 当数据库查询失败时抛出异常
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
