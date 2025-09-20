import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 加密服务 - 实现三层加密架构
 *
 * 安全特性:
 * - AES-256-GCM 对称加密
 * - 每个用户独立的加密IV
 * - 主密钥 + 用户ID 派生密钥
 * - 防篡改的认证加密
 * - 密钥轮换支持
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256位密钥
  private readonly ivLength = 16; // 128位IV
  private readonly tagLength = 16; // 128位认证标签

  /**
   * 加密服务构造函数
   *
   * @description 初始化加密服务，注入配置服务用于获取主加密密钥
   * @param configService NestJS配置服务，用于读取环境变量中的加密配置
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * 生成随机初始化向量 - 用于AES-GCM加密的随机性保证
   *
   * @description 生成128位(16字节)的密码学安全随机初始化向量，确保每次加密操作的唯一性
   * @returns 32字符的十六进制字符串，表示16字节的随机IV
   */
  generateIV(): string {
    const iv = crypto.randomBytes(this.ivLength);
    return iv.toString('hex');
  }

  /**
   * 派生用户专用加密密钥
   * 使用主密钥 + 用户ID 生成唯一密钥
   */
  private deriveUserKey(userId: string): Buffer {
    const masterKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    if (!masterKey) {
      throw new Error('Master encryption key not configured');
    }

    // 使用PBKDF2派生密钥，增加安全性
    return crypto.pbkdf2Sync(
      masterKey,
      userId,
      100000, // 迭代次数
      this.keyLength,
      'sha256',
    );
  }

  /**
   * 加密敏感数据 - 使用AES-256-GCM认证加密算法
   *
   * @description 使用用户专用密钥对明文进行AES-256-GCM加密，提供机密性和完整性保护
   * @param plaintext 需要加密的明文字符串数据
   * @param userId 用户唯一标识符，用于派生用户专用加密密钥
   * @param iv 16字节初始化向量的十六进制字符串表示，确保加密随机性
   * @returns Base64编码的加密数据，包含IV、认证标签和密文的组合
   * @throws {Error} 当主密钥未配置时抛出 "Encryption failed"
   * @throws {Error} 当IV格式无效时抛出 "Encryption failed"
   * @throws {Error} 当加密过程中发生任何错误时抛出 "Encryption failed"
   */
  encrypt(plaintext: string, userId: string, iv: string): string {
    try {
      const key = this.deriveUserKey(userId);
      const ivBuffer = Buffer.from(iv, 'hex');

      // 创建加密器 - 使用GCM模式
      const cipher = crypto.createCipheriv(this.algorithm, key, ivBuffer);
      cipher.setAutoPadding(true);

      // 执行加密
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取认证标签
      const authTag = cipher.getAuthTag();

      // 组合: IV + AuthTag + EncryptedData
      const combined = Buffer.concat([
        ivBuffer,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Encryption failed for user ${userId}: ${errorMessage}`,
      );
      throw new Error('Encryption failed');
    }
  }

  /**
   * 解密敏感数据 - 使用AES-256-GCM认证解密算法
   *
   * @description 使用用户专用密钥对加密数据进行解密，验证数据完整性和真实性
   * @param encryptedData Base64编码的加密数据，包含IV、认证标签和密文
   * @param userId 用户唯一标识符，必须与加密时使用的用户ID相同
   * @returns 解密后的原始明文字符串
   * @throws {Error} 当主密钥未配置时抛出 "Decryption failed or data corrupted"
   * @throws {Error} 当Base64格式无效时抛出 "Decryption failed or data corrupted"
   * @throws {Error} 当数据被篡改或认证标签验证失败时抛出 "Decryption failed or data corrupted"
   * @throws {Error} 当用户ID不匹配时抛出 "Decryption failed or data corrupted"
   * @throws {Error} 当解密过程中发生任何错误时抛出 "Decryption failed or data corrupted"
   */
  decrypt(encryptedData: string, userId: string): string {
    try {
      const key = this.deriveUserKey(userId);
      const combined = Buffer.from(encryptedData, 'base64');

      // 分离: IV + AuthTag + EncryptedData
      const ivBuffer = combined.slice(0, this.ivLength);
      const authTag = combined.slice(
        this.ivLength,
        this.ivLength + this.tagLength,
      );
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      // 创建解密器 - 使用GCM模式
      const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
      decipher.setAuthTag(authTag);

      // 执行解密
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Decryption failed for user ${userId}: ${errorMessage}`,
      );
      throw new Error('Decryption failed or data corrupted');
    }
  }

  /**
   * 验证主加密密钥配置状态 - 确保系统加密功能可用性
   *
   * @description 检查环境变量中的主加密密钥是否正确配置且符合安全要求
   * @returns 布尔值，true表示主密钥已正确配置且长度>=32字符，false表示未配置或不符合要求
   */
  validateMasterKey(): boolean {
    const masterKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    return !!(masterKey && masterKey.length >= 32);
  }

  /**
   * 生成新的主加密密钥 - 用于密钥轮换和初始化配置
   *
   * @description 生成256位(32字节)的密码学安全随机主密钥，用于系统密钥轮换或初始部署
   * @returns 64字符的十六进制字符串，表示32字节的随机主密钥
   */
  generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建数据SHA-256哈希值 - 用于数据完整性验证和去重
   *
   * @description 使用SHA-256算法对输入数据生成固定长度的哈希摘要，确保数据完整性
   * @param data 需要计算哈希的输入字符串数据
   * @returns 64字符的十六进制字符串，表示输入数据的SHA-256哈希值
   */
  createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 验证数据哈希完整性 - 使用时间安全比较防止时序攻击
   *
   * @description 通过重新计算数据哈希并使用时间安全比较验证数据是否被篡改
   * @param data 原始数据字符串，需要验证完整性的数据
   * @param hash 预期的SHA-256哈希值，64字符十六进制字符串
   * @returns 布尔值，true表示数据完整性验证通过，false表示数据可能被篡改
   * @throws {Error} 当哈希格式无效(非64字符十六进制)时抛出错误
   */
  verifyHash(data: string, hash: string): boolean {
    const computedHash = this.createHash(data);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex'),
    );
  }
}
