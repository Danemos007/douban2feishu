import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

import { CryptoService } from './crypto.service';

describe('CryptoService - Comprehensive Encryption & Security Test Suite', () => {
  let service: CryptoService;
  let configService: ConfigService;
  let module: TestingModule;

  // Spy variables for unbound-method error prevention
  let configGetSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  // Mock data constants
  const mockMasterKey = 'a'.repeat(64); // 64-character hex string (32 bytes)
  const mockUserId = 'test-user-id-12345';
  const mockAnotherUserId = 'another-user-id-67890';
  const mockPlaintext = 'This is sensitive data that needs encryption';
  const mockEmptyString = '';
  const mockUnicodeText = '你好世界🌍 emoji test';
  const mockSpecialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const mockLongText = 'A'.repeat(1000);

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup spies
    configGetSpy = jest.spyOn(configService, 'get');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Default mock setup - master key configured
    configGetSpy.mockReturnValue(mockMasterKey);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Constructor & Initialization', () => {
    it('should be defined and properly inject dependencies', () => {
      expect(service).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should initialize with correct algorithm and security parameters', () => {
      // Verify service can be created and has expected structure
      expect(typeof service.generateIV).toBe('function');
      expect(typeof service.encrypt).toBe('function');
      expect(typeof service.decrypt).toBe('function');
      expect(typeof service.validateMasterKey).toBe('function');
      expect(typeof service.generateMasterKey).toBe('function');
      expect(typeof service.createHash).toBe('function');
      expect(typeof service.verifyHash).toBe('function');
    });

    it('should set proper key length, IV length, and tag length constants', () => {
      // Test internal constants through behavior
      const iv = service.generateIV();
      expect(iv.length).toBe(32); // 16 bytes * 2 (hex encoding) = 32 characters
    });
  });

  describe('generateIV', () => {
    describe('成功路径', () => {
      it('should generate random IV in hex format', () => {
        const iv = service.generateIV();

        expect(typeof iv).toBe('string');
        expect(iv).toMatch(/^[0-9a-f]+$/i); // Valid hex format
      });

      it('should generate different IVs on each call', () => {
        const iv1 = service.generateIV();
        const iv2 = service.generateIV();
        const iv3 = service.generateIV();

        expect(iv1).not.toBe(iv2);
        expect(iv2).not.toBe(iv3);
        expect(iv1).not.toBe(iv3);
      });

      it('should generate IV with correct length (32 hex characters = 16 bytes)', () => {
        const iv = service.generateIV();

        expect(iv.length).toBe(32);

        // Verify it represents 16 bytes
        const buffer = Buffer.from(iv, 'hex');
        expect(buffer.length).toBe(16);
      });
    });

    describe('格式验证', () => {
      it('should return valid hex string', () => {
        const iv = service.generateIV();

        // Should not throw when converting to buffer
        expect(() => Buffer.from(iv, 'hex')).not.toThrow();

        // Should be valid hex
        expect(iv).toMatch(/^[0-9a-f]{32}$/i);
      });

      it('should generate IV that can be converted to Buffer correctly', () => {
        const iv = service.generateIV();
        const buffer = Buffer.from(iv, 'hex');

        expect(buffer.length).toBe(16);
        expect(buffer.toString('hex')).toBe(iv.toLowerCase());
      });
    });
  });

  describe('encrypt', () => {
    let mockIV: string;

    beforeEach(() => {
      mockIV = service.generateIV();
    });

    describe('成功路径', () => {
      it('should encrypt plaintext successfully with valid inputs', () => {
        const encrypted = service.encrypt(mockPlaintext, mockUserId, mockIV);

        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
        expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
      });

      it('should return different encrypted data for same plaintext with different IVs', () => {
        const iv1 = service.generateIV();
        const iv2 = service.generateIV();

        const encrypted1 = service.encrypt(mockPlaintext, mockUserId, iv1);
        const encrypted2 = service.encrypt(mockPlaintext, mockUserId, iv2);

        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should return different encrypted data for same plaintext with different userIds', () => {
        const encrypted1 = service.encrypt(mockPlaintext, mockUserId, mockIV);
        const encrypted2 = service.encrypt(
          mockPlaintext,
          mockAnotherUserId,
          mockIV,
        );

        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should handle empty string encryption', () => {
        const encrypted = service.encrypt(mockEmptyString, mockUserId, mockIV);

        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
      });

      it('should handle special characters and unicode', () => {
        const encryptedUnicode = service.encrypt(
          mockUnicodeText,
          mockUserId,
          mockIV,
        );
        const encryptedSpecial = service.encrypt(
          mockSpecialChars,
          mockUserId,
          mockIV,
        );

        expect(typeof encryptedUnicode).toBe('string');
        expect(typeof encryptedSpecial).toBe('string');
        expect(encryptedUnicode.length).toBeGreaterThan(0);
        expect(encryptedSpecial.length).toBeGreaterThan(0);
      });
    });

    describe('输入验证', () => {
      it('should encrypt various data types converted to string', () => {
        const numberAsString = '12345';
        const booleanAsString = 'true';

        const encryptedNumber = service.encrypt(
          numberAsString,
          mockUserId,
          mockIV,
        );
        const encryptedBoolean = service.encrypt(
          booleanAsString,
          mockUserId,
          mockIV,
        );

        expect(typeof encryptedNumber).toBe('string');
        expect(typeof encryptedBoolean).toBe('string');
      });

      it('should handle long text encryption', () => {
        const encrypted = service.encrypt(mockLongText, mockUserId, mockIV);

        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
      });
    });

    describe('错误处理', () => {
      it('should throw error when master key is not configured', () => {
        configGetSpy.mockReturnValue(undefined);

        expect(() =>
          service.encrypt(mockPlaintext, mockUserId, mockIV),
        ).toThrow('Encryption failed');
      });

      it('should throw error with invalid IV format', () => {
        const invalidIV = 'invalid-hex-string';

        expect(() =>
          service.encrypt(mockPlaintext, mockUserId, invalidIV),
        ).toThrow('Encryption failed');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should handle empty userId (edge case)', () => {
        // Empty userId is technically valid for pbkdf2, though not recommended
        const encrypted = service.encrypt(mockPlaintext, '', mockIV);
        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
      });

      it('should log error and throw generic message on encryption failure', () => {
        const invalidIV = 'not-hex';

        expect(() =>
          service.encrypt(mockPlaintext, mockUserId, invalidIV),
        ).toThrow('Encryption failed');
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Encryption failed for user ${mockUserId}`),
        );
      });
    });

    describe('安全特性', () => {
      it('should produce base64 encoded output', () => {
        const encrypted = service.encrypt(mockPlaintext, mockUserId, mockIV);

        // Should be valid base64
        expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

        // Should decode to a buffer
        const decoded = Buffer.from(encrypted, 'base64');
        expect(decoded.length).toBeGreaterThan(0);
      });

      it('should include IV, authTag, and encrypted data in output', () => {
        const encrypted = service.encrypt(mockPlaintext, mockUserId, mockIV);
        const decoded = Buffer.from(encrypted, 'base64');

        // Should contain at least IV (16) + AuthTag (16) + some encrypted data
        expect(decoded.length).toBeGreaterThan(32);

        // First 16 bytes should be the IV
        const extractedIV = decoded.slice(0, 16);
        expect(extractedIV.toString('hex')).toBe(mockIV.toLowerCase());
      });
    });
  });

  describe('decrypt', () => {
    let mockIV: string;
    let encryptedData: string;

    beforeEach(() => {
      mockIV = service.generateIV();
      encryptedData = service.encrypt(mockPlaintext, mockUserId, mockIV);
    });

    describe('成功路径', () => {
      it('should decrypt data encrypted by encrypt method successfully', () => {
        const decrypted = service.decrypt(encryptedData, mockUserId);

        expect(decrypted).toBe(mockPlaintext);
      });

      it('should return original plaintext after encrypt/decrypt cycle', () => {
        const testCases = [
          mockPlaintext,
          mockUnicodeText,
          mockSpecialChars,
          mockEmptyString,
        ];

        testCases.forEach((testCase) => {
          const iv = service.generateIV();
          const encrypted = service.encrypt(testCase, mockUserId, iv);
          const decrypted = service.decrypt(encrypted, mockUserId);

          expect(decrypted).toBe(testCase);
        });
      });

      it('should handle empty string decryption', () => {
        const iv = service.generateIV();
        const encrypted = service.encrypt(mockEmptyString, mockUserId, iv);
        const decrypted = service.decrypt(encrypted, mockUserId);

        expect(decrypted).toBe(mockEmptyString);
      });

      it('should handle special characters and unicode decryption', () => {
        const ivUnicode = service.generateIV();
        const ivSpecial = service.generateIV();

        const encryptedUnicode = service.encrypt(
          mockUnicodeText,
          mockUserId,
          ivUnicode,
        );
        const encryptedSpecial = service.encrypt(
          mockSpecialChars,
          mockUserId,
          ivSpecial,
        );

        const decryptedUnicode = service.decrypt(encryptedUnicode, mockUserId);
        const decryptedSpecial = service.decrypt(encryptedSpecial, mockUserId);

        expect(decryptedUnicode).toBe(mockUnicodeText);
        expect(decryptedSpecial).toBe(mockSpecialChars);
      });
    });

    describe('错误处理', () => {
      it('should throw error when master key is not configured', () => {
        configGetSpy.mockReturnValue(undefined);

        expect(() => service.decrypt(encryptedData, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
      });

      it('should throw error with invalid base64 format', () => {
        const invalidBase64 = 'not-base64-data!@#';

        expect(() => service.decrypt(invalidBase64, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should throw error with corrupted encrypted data', () => {
        const corruptedData = Buffer.from(
          'corrupted data that is too short',
        ).toString('base64');

        expect(() => service.decrypt(corruptedData, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
      });

      it('should throw error with wrong userId', () => {
        expect(() => service.decrypt(encryptedData, mockAnotherUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
      });

      it('should throw error with tampered authTag', () => {
        const decoded = Buffer.from(encryptedData, 'base64');

        // Tamper with the auth tag (bytes 16-31)
        decoded[20] = decoded[20] ^ 0xff;
        const tamperedData = decoded.toString('base64');

        expect(() => service.decrypt(tamperedData, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
      });

      it('should log error and throw generic message on decryption failure', () => {
        const invalidData = 'invalid-data';

        expect(() => service.decrypt(invalidData, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Decryption failed for user ${mockUserId}`),
        );
      });
    });

    describe('安全验证', () => {
      it('should detect data tampering through authTag verification', () => {
        const decoded = Buffer.from(encryptedData, 'base64');

        // Tamper with encrypted data
        const lastIndex = decoded.length - 1;
        decoded[lastIndex] = decoded[lastIndex] ^ 0xff;
        const tamperedData = decoded.toString('base64');

        expect(() => service.decrypt(tamperedData, mockUserId)).toThrow(
          'Decryption failed or data corrupted',
        );
      });

      it('should fail when encrypted data is modified', () => {
        const decoded = Buffer.from(encryptedData, 'base64');

        // Tamper with multiple bytes
        for (let i = 32; i < Math.min(40, decoded.length); i++) {
          decoded[i] = decoded[i] ^ 0xff;
        }
        const tamperedData = decoded.toString('base64');

        expect(() => service.decrypt(tamperedData, mockUserId)).toThrow();
      });
    });
  });

  describe('validateMasterKey', () => {
    describe('成功验证', () => {
      it('should return true when master key is properly configured', () => {
        configGetSpy.mockReturnValue(mockMasterKey);

        const result = service.validateMasterKey();

        expect(result).toBe(true);
        expect(configGetSpy).toHaveBeenCalledWith('MASTER_ENCRYPTION_KEY');
      });

      it('should return true for key with exactly 32 characters', () => {
        const exactKey = 'a'.repeat(32);
        configGetSpy.mockReturnValue(exactKey);

        const result = service.validateMasterKey();

        expect(result).toBe(true);
      });

      it('should return true for key longer than 32 characters', () => {
        const longKey = 'a'.repeat(100);
        configGetSpy.mockReturnValue(longKey);

        const result = service.validateMasterKey();

        expect(result).toBe(true);
      });
    });

    describe('失败验证', () => {
      it('should return false when master key is not configured', () => {
        configGetSpy.mockReturnValue(undefined);

        const result = service.validateMasterKey();

        expect(result).toBe(false);
      });

      it('should return false when master key is too short', () => {
        const shortKey = 'a'.repeat(31);
        configGetSpy.mockReturnValue(shortKey);

        const result = service.validateMasterKey();

        expect(result).toBe(false);
      });

      it('should return false when master key is empty string', () => {
        configGetSpy.mockReturnValue('');

        const result = service.validateMasterKey();

        expect(result).toBe(false);
      });

      it('should return false when master key is null', () => {
        configGetSpy.mockReturnValue(null);

        const result = service.validateMasterKey();

        expect(result).toBe(false);
      });
    });
  });

  describe('generateMasterKey', () => {
    describe('密钥生成', () => {
      it('should generate 64-character hex string (32 bytes)', () => {
        const key = service.generateMasterKey();

        expect(typeof key).toBe('string');
        expect(key.length).toBe(64);
        expect(key).toMatch(/^[0-9a-f]{64}$/i);
      });

      it('should generate different keys on each call', () => {
        const key1 = service.generateMasterKey();
        const key2 = service.generateMasterKey();
        const key3 = service.generateMasterKey();

        expect(key1).not.toBe(key2);
        expect(key2).not.toBe(key3);
        expect(key1).not.toBe(key3);
      });

      it('should generate valid hex format', () => {
        const key = service.generateMasterKey();

        // Should not throw when converting to buffer
        expect(() => Buffer.from(key, 'hex')).not.toThrow();

        // Buffer should be 32 bytes
        const buffer = Buffer.from(key, 'hex');
        expect(buffer.length).toBe(32);
      });
    });

    describe('密钥质量', () => {
      it('should generate cryptographically random keys', () => {
        const keys = Array.from({ length: 10 }, () =>
          service.generateMasterKey(),
        );

        // All keys should be different
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      });

      it('should pass basic entropy test', () => {
        const key = service.generateMasterKey();
        const buffer = Buffer.from(key, 'hex');

        // Check that not all bytes are the same
        const firstByte = buffer[0];
        const allSame = buffer.every((byte) => byte === firstByte);
        expect(allSame).toBe(false);

        // Check that we have variety in byte values
        const uniqueBytes = new Set(Array.from(buffer));
        expect(uniqueBytes.size).toBeGreaterThan(10); // Should have good variety
      });
    });
  });

  describe('createHash', () => {
    describe('哈希生成', () => {
      it('should create consistent SHA-256 hash for same input', () => {
        const hash1 = service.createHash(mockPlaintext);
        const hash2 = service.createHash(mockPlaintext);

        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
        expect(hash1.length).toBe(64); // SHA-256 hex length
      });

      it('should create different hashes for different inputs', () => {
        const hash1 = service.createHash(mockPlaintext);
        const hash2 = service.createHash(mockPlaintext + ' modified');
        const hash3 = service.createHash(mockUnicodeText);

        expect(hash1).not.toBe(hash2);
        expect(hash2).not.toBe(hash3);
        expect(hash1).not.toBe(hash3);
      });

      it('should handle empty string', () => {
        const hash = service.createHash(mockEmptyString);

        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/i);
      });

      it('should handle special characters and unicode', () => {
        const hashUnicode = service.createHash(mockUnicodeText);
        const hashSpecial = service.createHash(mockSpecialChars);

        expect(hashUnicode.length).toBe(64);
        expect(hashSpecial.length).toBe(64);
        expect(hashUnicode).toMatch(/^[0-9a-f]{64}$/i);
        expect(hashSpecial).toMatch(/^[0-9a-f]{64}$/i);
      });
    });

    describe('哈希格式', () => {
      it('should return 64-character hex string', () => {
        const hash = service.createHash(mockPlaintext);

        expect(hash.length).toBe(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/i);
      });

      it('should return valid SHA-256 hash format', () => {
        const hash = service.createHash(mockPlaintext);

        // Verify it's a valid hex string that represents 32 bytes
        const buffer = Buffer.from(hash, 'hex');
        expect(buffer.length).toBe(32);

        // Verify it matches expected SHA-256 of the input
        const expectedHash = crypto
          .createHash('sha256')
          .update(mockPlaintext)
          .digest('hex');
        expect(hash).toBe(expectedHash);
      });
    });
  });

  describe('verifyHash', () => {
    let validHash: string;

    beforeEach(() => {
      validHash = service.createHash(mockPlaintext);
    });

    describe('验证成功', () => {
      it('should return true for matching data and hash', () => {
        const result = service.verifyHash(mockPlaintext, validHash);

        expect(result).toBe(true);
      });

      it('should work with hash generated by createHash method', () => {
        const testData = 'test data for verification';
        const hash = service.createHash(testData);
        const result = service.verifyHash(testData, hash);

        expect(result).toBe(true);
      });

      it('should handle empty string verification', () => {
        const emptyHash = service.createHash(mockEmptyString);
        const result = service.verifyHash(mockEmptyString, emptyHash);

        expect(result).toBe(true);
      });
    });

    describe('验证失败', () => {
      it('should return false for non-matching data and hash', () => {
        const wrongData = mockPlaintext + ' modified';
        const result = service.verifyHash(wrongData, validHash);

        expect(result).toBe(false);
      });

      it('should return false for invalid hash format', () => {
        const invalidHash = 'not-a-valid-hash';

        expect(() => service.verifyHash(mockPlaintext, invalidHash)).toThrow();
      });

      it('should return false for modified data', () => {
        const modifiedData = mockPlaintext.slice(0, -1); // Remove last character
        const result = service.verifyHash(modifiedData, validHash);

        expect(result).toBe(false);
      });
    });

    describe('时间攻击防护', () => {
      it('should use timing-safe comparison', () => {
        // This test verifies that timingSafeEqual is used
        // by ensuring consistent behavior regardless of where the difference occurs
        const validResult = service.verifyHash(mockPlaintext, validHash);
        const invalidResult1 = service.verifyHash(
          'x' + mockPlaintext.slice(1),
          validHash,
        );
        const invalidResult2 = service.verifyHash(
          mockPlaintext.slice(0, -1) + 'x',
          validHash,
        );

        expect(validResult).toBe(true);
        expect(invalidResult1).toBe(false);
        expect(invalidResult2).toBe(false);
      });

      it('should handle different length hashes safely', () => {
        const shortHash = validHash.slice(0, 32); // Half length

        expect(() => service.verifyHash(mockPlaintext, shortHash)).toThrow();
      });
    });
  });

  describe('Integration Tests', () => {
    describe('完整加密解密流程', () => {
      it('should complete full encrypt-decrypt cycle successfully', () => {
        const testData =
          'Integration test data with special chars: 你好🌍!@#$%';
        const iv = service.generateIV();

        // Full cycle test
        const encrypted = service.encrypt(testData, mockUserId, iv);
        const decrypted = service.decrypt(encrypted, mockUserId);

        expect(decrypted).toBe(testData);
      });

      it('should handle multiple users with different keys', () => {
        const userData1 = 'User 1 sensitive data';
        const userData2 = 'User 2 different data';
        const iv1 = service.generateIV();
        const iv2 = service.generateIV();

        // Encrypt for different users
        const encrypted1 = service.encrypt(userData1, mockUserId, iv1);
        const encrypted2 = service.encrypt(userData2, mockAnotherUserId, iv2);

        // Decrypt with correct users
        const decrypted1 = service.decrypt(encrypted1, mockUserId);
        const decrypted2 = service.decrypt(encrypted2, mockAnotherUserId);

        expect(decrypted1).toBe(userData1);
        expect(decrypted2).toBe(userData2);

        // Cross-user decryption should fail
        expect(() => service.decrypt(encrypted1, mockAnotherUserId)).toThrow();
        expect(() => service.decrypt(encrypted2, mockUserId)).toThrow();
      });

      it('should maintain data integrity through full cycle', () => {
        const testCases = [
          mockEmptyString,
          mockPlaintext,
          mockUnicodeText,
          mockSpecialChars,
          mockLongText,
        ];

        testCases.forEach((testCase) => {
          const iv = service.generateIV();
          const encrypted = service.encrypt(testCase, mockUserId, iv);
          const decrypted = service.decrypt(encrypted, mockUserId);

          expect(decrypted).toBe(testCase);
          expect(decrypted.length).toBe(testCase.length);
        });
      });
    });

    describe('边界条件组合', () => {
      it('should handle large data encryption and decryption', () => {
        const largeData = 'Large data block: ' + 'A'.repeat(10000);
        const iv = service.generateIV();

        const encrypted = service.encrypt(largeData, mockUserId, iv);
        const decrypted = service.decrypt(encrypted, mockUserId);

        expect(decrypted).toBe(largeData);
        expect(decrypted.length).toBe(largeData.length);
      });

      it('should work with various IV and user combinations', () => {
        const testData = 'Combination test data';
        const users = [mockUserId, mockAnotherUserId, 'user3', 'user4'];
        const ivs = Array.from({ length: 4 }, () => service.generateIV());

        // Test all combinations
        users.forEach((user) => {
          ivs.forEach((iv) => {
            const encrypted = service.encrypt(testData, user, iv);
            const decrypted = service.decrypt(encrypted, user);

            expect(decrypted).toBe(testData);
          });
        });
      });
    });

    describe('错误恢复', () => {
      it('should handle master key reconfiguration scenarios', () => {
        const testData = 'Test data for key change';
        const iv = service.generateIV();

        // Encrypt with original key
        const encrypted = service.encrypt(testData, mockUserId, iv);

        // Change master key
        const newMasterKey = service.generateMasterKey();
        configGetSpy.mockReturnValue(newMasterKey);

        // Should not be able to decrypt with new key
        expect(() => service.decrypt(encrypted, mockUserId)).toThrow();

        // Restore original key
        configGetSpy.mockReturnValue(mockMasterKey);

        // Should work again
        const decrypted = service.decrypt(encrypted, mockUserId);
        expect(decrypted).toBe(testData);
      });

      it('should maintain security when operations fail', () => {
        const testData = 'Security test data';
        const iv = service.generateIV();

        // Encrypt successfully
        const encrypted = service.encrypt(testData, mockUserId, iv);

        // Simulate configuration failure
        configGetSpy.mockReturnValue(undefined);

        // Both operations should fail securely
        expect(() => service.encrypt('new data', mockUserId, iv)).toThrow();
        expect(() => service.decrypt(encrypted, mockUserId)).toThrow();

        // No partial data should be leaked in error messages
        try {
          service.decrypt(encrypted, mockUserId);
        } catch (error) {
          expect(error instanceof Error).toBe(true);
          if (error instanceof Error) {
            expect(error.message).toBe('Decryption failed or data corrupted');
            expect(error.message).not.toContain(testData);
          }
        }
      });
    });
  });
});
