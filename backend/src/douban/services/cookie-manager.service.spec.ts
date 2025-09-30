import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieManagerService } from './cookie-manager.service';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('CookieManagerService', () => {
  let service: CookieManagerService;
  let cryptoService: CryptoService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieManagerService,
        CryptoService, // 使用真实的 CryptoService 实例
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Mock MASTER_ENCRYPTION_KEY for testing
              if (key === 'MASTER_ENCRYPTION_KEY') {
                return 'test-master-key-for-testing-32bytes-long';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CookieManagerService>(CookieManagerService);
    cryptoService = module.get<CryptoService>(CryptoService);

    // 设置Logger spy，避免测试输出污染
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础设置', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject CryptoService correctly', () => {
      expect(cryptoService).toBeDefined();
      expect(cryptoService).toBeInstanceOf(CryptoService);
    });
  });

  describe('Headers 管理', () => {
    describe('getDoubanHeaders', () => {
      it('should return default headers without cookie', () => {
        const headers = service.getDoubanHeaders();

        expect(headers).toEqual({
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'max-age=0',
          Connection: 'keep-alive',
          Host: 'www.douban.com',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'sec-ch-ua':
            '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
        });
        expect(headers.Cookie).toBeUndefined();
      });

      it('should include cookie in headers when provided', () => {
        const testCookie = 'test=value; session=abc123';
        const headers = service.getDoubanHeaders(testCookie);

        expect(headers.Cookie).toBe(testCookie);
        expect(headers['User-Agent']).toBeDefined();
        expect(headers.Host).toBe('www.douban.com');
      });

      it('should include all required browser headers', () => {
        const headers = service.getDoubanHeaders();

        const requiredHeaders = [
          'Accept',
          'Accept-Language',
          'Cache-Control',
          'Connection',
          'Host',
          'Sec-Fetch-Dest',
          'Sec-Fetch-Mode',
          'Sec-Fetch-Site',
          'Sec-Fetch-User',
          'Upgrade-Insecure-Requests',
          'User-Agent',
          'sec-ch-ua',
          'sec-ch-ua-mobile',
          'sec-ch-ua-platform',
        ];

        requiredHeaders.forEach((header) => {
          expect(headers[header]).toBeDefined();
          expect(typeof headers[header]).toBe('string');
        });
      });

      it('should use correct User-Agent and Accept headers', () => {
        const headers = service.getDoubanHeaders();

        expect(headers['User-Agent']).toContain('Chrome/115.0.0.0');
        expect(headers['User-Agent']).toContain('Mozilla/5.0');
        expect(headers.Accept).toContain('text/html');
        expect(headers.Accept).toContain('application/xml');
      });
    });

    describe('getHeadersForDomain', () => {
      it('should set correct Host for book domain', () => {
        const headers = service.getHeadersForDomain('book');
        expect(headers.Host).toBe('book.douban.com');
      });

      it('should set correct Host for movie domain', () => {
        const headers = service.getHeadersForDomain('movie');
        expect(headers.Host).toBe('movie.douban.com');
      });

      it('should set correct Host for music domain', () => {
        const headers = service.getHeadersForDomain('music');
        expect(headers.Host).toBe('music.douban.com');
      });

      it('should set correct Host for www domain', () => {
        const headers = service.getHeadersForDomain('www');
        expect(headers.Host).toBe('www.douban.com');
      });

      it('should include cookie when provided', () => {
        const testCookie = 'test=value; session=abc123';
        const headers = service.getHeadersForDomain('book', testCookie);

        expect(headers.Cookie).toBe(testCookie);
        expect(headers.Host).toBe('book.douban.com');
      });

      it('should maintain all other headers from getDoubanHeaders', () => {
        const headers = service.getHeadersForDomain('movie');

        expect(headers['User-Agent']).toBeDefined();
        expect(headers.Accept).toBeDefined();
        expect(headers['Accept-Language']).toBeDefined();
        expect(headers.Connection).toBeDefined();
      });
    });
  });

  describe('Cookie 加密/解密', () => {
    const testUserId = 'test-user-123';
    const testCookie = 'bid=abc123; dbcl2="123456:xyz"; session=test';

    describe('encryptCookie', () => {
      it('should encrypt cookie successfully', () => {
        const encrypted = service.encryptCookie(testUserId, testCookie);

        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');
        expect(encrypted).not.toBe(testCookie);
        expect(encrypted.length).toBeGreaterThan(0);
      });

      it('should log debug message on successful encryption', () => {
        service.encryptCookie(testUserId, testCookie);

        expect(loggerSpy).toHaveBeenCalledWith(
          `Cookie encrypted for user ${testUserId}`,
        );
      });

      it('should throw error when CryptoService.encrypt fails', () => {
        const encryptSpy = jest
          .spyOn(cryptoService, 'encrypt')
          .mockImplementation(() => {
            throw new Error('Encryption failed');
          });

        expect(() => service.encryptCookie(testUserId, testCookie)).toThrow(
          'Cookie encryption failed',
        );

        encryptSpy.mockRestore();
      });

      it('should log error message on encryption failure', () => {
        const errorLogSpy = jest.spyOn(Logger.prototype, 'error');
        const encryptSpy = jest
          .spyOn(cryptoService, 'encrypt')
          .mockImplementation(() => {
            throw new Error('Encryption failed');
          });

        try {
          service.encryptCookie(testUserId, testCookie);
        } catch {
          // Expected to throw
        }

        expect(errorLogSpy).toHaveBeenCalledWith(
          `Failed to encrypt cookie for user ${testUserId}:`,
          'Encryption failed',
        );

        encryptSpy.mockRestore();
        errorLogSpy.mockRestore();
      });

      it('should generate IV before encryption', () => {
        const generateIVSpy = jest.spyOn(cryptoService, 'generateIV');

        service.encryptCookie(testUserId, testCookie);

        expect(generateIVSpy).toHaveBeenCalled();
      });
    });

    describe('decryptCookie', () => {
      it('should decrypt cookie successfully', () => {
        // 先加密一个 cookie
        const encrypted = service.encryptCookie(testUserId, testCookie);

        // 然后解密
        const decrypted = service.decryptCookie(testUserId, encrypted);

        expect(decrypted).toBe(testCookie);
      });

      it('should log debug message on successful decryption', () => {
        const encrypted = service.encryptCookie(testUserId, testCookie);

        // 清除之前的日志调用
        jest.clearAllMocks();

        service.decryptCookie(testUserId, encrypted);

        expect(loggerSpy).toHaveBeenCalledWith(
          `Cookie decrypted for user ${testUserId}`,
        );
      });

      it('should throw error when CryptoService.decrypt fails', () => {
        const decryptSpy = jest
          .spyOn(cryptoService, 'decrypt')
          .mockImplementation(() => {
            throw new Error('Decryption failed');
          });

        expect(() =>
          service.decryptCookie(testUserId, 'invalid-encrypted'),
        ).toThrow('Cookie decryption failed');

        decryptSpy.mockRestore();
      });

      it('should log error message on decryption failure', () => {
        const errorLogSpy = jest.spyOn(Logger.prototype, 'error');
        const decryptSpy = jest
          .spyOn(cryptoService, 'decrypt')
          .mockImplementation(() => {
            throw new Error('Decryption failed');
          });

        try {
          service.decryptCookie(testUserId, 'invalid-encrypted');
        } catch {
          // Expected to throw
        }

        expect(errorLogSpy).toHaveBeenCalledWith(
          `Failed to decrypt cookie for user ${testUserId}:`,
          'Decryption failed',
        );

        decryptSpy.mockRestore();
        errorLogSpy.mockRestore();
      });
    });

    describe('完整的加密/解密往返测试', () => {
      it('should successfully complete encrypt-decrypt round trip', () => {
        const originalCookie =
          'bid=xyz789; dbcl2="456789:abc"; session=roundtrip';

        // 加密
        const encrypted = service.encryptCookie(testUserId, originalCookie);
        expect(encrypted).not.toBe(originalCookie);

        // 解密
        const decrypted = service.decryptCookie(testUserId, encrypted);
        expect(decrypted).toBe(originalCookie);
      });

      it('should handle different user IDs correctly', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';
        const cookie = 'bid=test; dbcl2="123:test"';

        const encrypted1 = service.encryptCookie(user1, cookie);
        const encrypted2 = service.encryptCookie(user2, cookie);

        // 不同用户的加密结果应该不同
        expect(encrypted1).not.toBe(encrypted2);

        // 各自解密应该成功
        expect(service.decryptCookie(user1, encrypted1)).toBe(cookie);
        expect(service.decryptCookie(user2, encrypted2)).toBe(cookie);
      });
    });
  });

  describe('Cookie 验证', () => {
    describe('validateCookieFormat', () => {
      it('should return true for valid cookie with required fields', () => {
        const validCookie = 'bid=abc123; dbcl2="123456:xyz"; session=test';
        const result = service.validateCookieFormat(validCookie);

        expect(result).toBe(true);
      });

      it('should return false for cookie with invalid characters', () => {
        const invalidCookie =
          'bid=abc123; invalid<>characters; dbcl2="123456:xyz"';
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        const result = service.validateCookieFormat(invalidCookie);

        expect(result).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith('Invalid cookie format detected');
        warnSpy.mockRestore();
      });

      it('should return false for cookie missing required fields (bid, dbcl2)', () => {
        const missingFieldsCookie = 'session=test; other=value';
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        const result = service.validateCookieFormat(missingFieldsCookie);

        expect(result).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith(
          'Cookie missing required douban fields',
        );
        warnSpy.mockRestore();
      });

      it('should return true when cookie contains bid field', () => {
        const cookieWithBid = 'bid=abc123; session=test';
        const result = service.validateCookieFormat(cookieWithBid);

        expect(result).toBe(true);
      });

      it('should return true when cookie contains dbcl2 field', () => {
        const cookieWithDbcl2 = 'session=test; dbcl2="123456:xyz"';
        const result = service.validateCookieFormat(cookieWithDbcl2);

        expect(result).toBe(true);
      });

      it('should log warning for invalid format', () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const invalidCookie = 'bid=abc123; invalid<>characters';

        service.validateCookieFormat(invalidCookie);

        expect(warnSpy).toHaveBeenCalledWith('Invalid cookie format detected');
        warnSpy.mockRestore();
      });

      it('should log warning for missing required fields', () => {
        const warnSpy = jest.spyOn(Logger.prototype, 'warn');
        const missingFieldsCookie = 'session=test; other=value';

        service.validateCookieFormat(missingFieldsCookie);

        expect(warnSpy).toHaveBeenCalledWith(
          'Cookie missing required douban fields',
        );
        warnSpy.mockRestore();
      });
    });
  });

  describe('Cookie 处理工具', () => {
    describe('sanitizeCookie', () => {
      it('should remove line breaks and normalize spaces', () => {
        const dirtyCookie = 'bid=abc123;\r\ndbcl2="123456:xyz";\nsession=test';
        const cleaned = service.sanitizeCookie(dirtyCookie);

        expect(cleaned).toBe('bid=abc123;dbcl2="123456:xyz";session=test');
        expect(cleaned).not.toContain('\r');
        expect(cleaned).not.toContain('\n');
      });

      it('should trim leading and trailing spaces', () => {
        const spacedCookie = '   bid=abc123; dbcl2="123456:xyz"   ';
        const cleaned = service.sanitizeCookie(spacedCookie);

        expect(cleaned).toBe('bid=abc123; dbcl2="123456:xyz"');
        expect(cleaned.startsWith(' ')).toBe(false);
        expect(cleaned.endsWith(' ')).toBe(false);
      });

      it('should handle cookie with multiple spaces', () => {
        const multiSpaceCookie =
          'bid=abc123;    dbcl2="123456:xyz";  session=test';
        const cleaned = service.sanitizeCookie(multiSpaceCookie);

        expect(cleaned).toBe('bid=abc123; dbcl2="123456:xyz"; session=test');
      });

      it('should handle cookie with newlines', () => {
        const newlineCookie =
          'bid=abc123;\ndbcl2="123456:xyz";\r\nsession=test';
        const cleaned = service.sanitizeCookie(newlineCookie);

        expect(cleaned).toBe('bid=abc123;dbcl2="123456:xyz";session=test');
      });
    });

    describe('extractUserIdFromCookie', () => {
      it('should extract user ID from dbcl2 field successfully', () => {
        const cookie = 'bid=abc123; dbcl2="123456:xyz"; session=test';
        const userId = service.extractUserIdFromCookie(cookie);

        expect(userId).toBe('123456');
      });

      it('should return null when dbcl2 field not found', () => {
        const cookie = 'bid=abc123; session=test';
        const userId = service.extractUserIdFromCookie(cookie);

        expect(userId).toBeNull();
      });

      it('should return null for malformed dbcl2 field', () => {
        const cookie = 'bid=abc123; dbcl2=invalid; session=test';
        const userId = service.extractUserIdFromCookie(cookie);

        expect(userId).toBeNull();
      });

      it('should handle cookie with multiple dbcl2-like patterns', () => {
        const cookie = 'bid=abc123; dbcl2="123456:xyz"; other_dbcl2="789:abc"';
        const userId = service.extractUserIdFromCookie(cookie);

        expect(userId).toBe('123456'); // 应该匹配第一个
      });
    });

    describe('isCookieLikelyExpired', () => {
      it('should return false for valid cookie with bid field', () => {
        const validCookie =
          'bid=abc123; dbcl2="123456:xyz"; session=test_very_long_session_value';
        const isExpired = service.isCookieLikelyExpired(validCookie);

        expect(isExpired).toBe(false);
      });

      it('should return true for cookie without bid field', () => {
        const noBidCookie =
          'dbcl2="123456:xyz"; session=test_very_long_session_value';
        const isExpired = service.isCookieLikelyExpired(noBidCookie);

        expect(isExpired).toBe(true);
      });

      it('should return true for cookie shorter than 50 characters', () => {
        const shortCookie = 'bid=abc; session=short';
        const isExpired = service.isCookieLikelyExpired(shortCookie);

        expect(isExpired).toBe(true);
      });

      it('should return false for long cookie with bid field', () => {
        const longValidCookie =
          'bid=abc123; dbcl2="123456:xyz"; session=very_long_session_value_that_exceeds_fifty_characters';
        const isExpired = service.isCookieLikelyExpired(longValidCookie);

        expect(isExpired).toBe(false);
      });
    });
  });

  describe('Cookie 备份', () => {
    describe('createCookieBackup', () => {
      const testUserId = 'test-user-123';
      const testCookie =
        'bid=abc123; dbcl2="123456:xyz"; session=test_very_long_session_value';

      it('should create backup with timestamp, hash, and preview', () => {
        const backup = service.createCookieBackup(testUserId, testCookie);

        expect(backup).toHaveProperty('timestamp');
        expect(backup).toHaveProperty('cookieHash');
        expect(backup).toHaveProperty('preview');

        expect(backup.timestamp).toBeInstanceOf(Date);
        expect(typeof backup.cookieHash).toBe('string');
        expect(typeof backup.preview).toBe('string');
      });

      it('should generate 16-character hash from full hash', () => {
        const backup = service.createCookieBackup(testUserId, testCookie);

        expect(backup.cookieHash).toHaveLength(16);
        expect(backup.cookieHash).toMatch(/^[a-f0-9]+$/); // 应该是十六进制字符串
      });

      it('should create 50-character preview with ellipsis', () => {
        const backup = service.createCookieBackup(testUserId, testCookie);

        expect(backup.preview).toHaveLength(53); // 50 + '...' = 53
        expect(backup.preview.endsWith('...')).toBe(true);
        expect(backup.preview.substring(0, 50)).toBe(
          testCookie.substring(0, 50),
        );
      });

      it('should use CryptoService.createHash for hashing', () => {
        const createHashSpy = jest.spyOn(cryptoService, 'createHash');

        service.createCookieBackup(testUserId, testCookie);

        expect(createHashSpy).toHaveBeenCalledWith(testCookie);
      });

      it('should include current timestamp', () => {
        const beforeTime = new Date();
        const backup = service.createCookieBackup(testUserId, testCookie);
        const afterTime = new Date();

        expect(backup.timestamp.getTime()).toBeGreaterThanOrEqual(
          beforeTime.getTime(),
        );
        expect(backup.timestamp.getTime()).toBeLessThanOrEqual(
          afterTime.getTime(),
        );
      });
    });
  });
});
