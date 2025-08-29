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
  private readonly ivLength = 16;  // 128位IV
  private readonly tagLength = 16; // 128位认证标签

  constructor(private readonly configService: ConfigService) {}

  /**
   * 生成随机IV (初始化向量)
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
      'sha256'
    );
  }

  /**
   * 加密敏感数据
   * 
   * @param plaintext 明文数据
   * @param userId 用户ID
   * @param iv 初始化向量 (hex格式)
   * @returns 加密后的数据 (base64格式)
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
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      this.logger.error(`Encryption failed for user ${userId}: ${error}`);
      throw new Error('Encryption failed');
    }
  }

  /**
   * 解密敏感数据
   * 
   * @param encryptedData 加密数据 (base64格式)
   * @param userId 用户ID
   * @returns 解密后的明文
   */
  decrypt(encryptedData: string, userId: string): string {
    try {
      const key = this.deriveUserKey(userId);
      const combined = Buffer.from(encryptedData, 'base64');
      
      // 分离: IV + AuthTag + EncryptedData
      const ivBuffer = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // 创建解密器 - 使用GCM模式
      const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
      decipher.setAuthTag(authTag);
      
      // 执行解密
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed for user ${userId}: ${error}`);
      throw new Error('Decryption failed or data corrupted');
    }
  }

  /**
   * 验证主密钥是否配置正确
   */
  validateMasterKey(): boolean {
    const masterKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    return !!(masterKey && masterKey.length >= 32);
  }

  /**
   * 生成新的主密钥 (用于密钥轮换)
   */
  generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建数据哈希 (用于完整性验证)
   */
  createHash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * 验证数据哈希
   */
  verifyHash(data: string, hash: string): boolean {
    const computedHash = this.createHash(data);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }
}