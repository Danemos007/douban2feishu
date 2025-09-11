import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis';
// Note: axios is mocked below, import not needed

import { FeishuAuthService } from './feishu-auth.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { FeishuContractValidatorService } from '../contract/validator.service';
import { FeishuTokenResponse } from '../schemas/auth.schema';
import {
  MockRedisClient,
  createMockRedisClient,
  FeishuAuthServiceTestInterface,
} from '../../test/types/mock-redis.types';

// Mock axios with proper typing
const mockAxiosInstance = {
  post: jest.fn(),
  interceptors: {
    response: { use: jest.fn() },
  },
  defaults: {},
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

describe('FeishuAuthService - Basic Integration', () => {
  let service: FeishuAuthService;
  let mockRedis: MockRedisClient;

  // Test fixtures
  const validTokenResponse: FeishuTokenResponse = {
    code: 0,
    msg: 'ok',
    tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
    expire: 7199,
  };

  const testAppId = 'cli_your_app_id_here';
  const testAppSecret = 'your_app_secret_here';

  beforeEach(async () => {
    mockRedis = createMockRedisClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeishuAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              <T = string>(key: string, defaultValue?: T): T | undefined => {
                const config: Record<string, string> = {
                  APP_VERSION: '1.0.0',
                  NODE_ENV: 'test',
                };
                return (config[key] as T) ?? defaultValue;
              },
            ),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            decrypt: jest.fn(),
          },
        },
        {
          provide: FeishuContractValidatorService,
          useValue: {
            validateAuthResponse: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<FeishuAuthService>(FeishuAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have basic methods available', () => {
    expect(typeof service.getAccessToken).toBe('function');
    expect(typeof service.validateCredentials).toBe('function');
    expect(typeof service.getTokenStats).toBe('function');
    expect(typeof service.clearTokenCache).toBe('function');
  });

  describe('getTokenStats with Schema validation', () => {
    it('should return validated token statistics', async () => {
      // Arrange
      const mockKeys = ['feishu:token:app1', 'feishu:token:app2'];
      const mockTokenData = {
        token: 'some-token',
        expiresAt: (Date.now() + 3600000).toString(), // 1 hour from now
      };

      (mockRedis.keys as jest.Mock).mockResolvedValue(mockKeys);
      (mockRedis.hgetall as jest.Mock).mockResolvedValue(mockTokenData);

      // Act
      const stats = await service.getTokenStats();

      // Assert
      expect(stats).toEqual({
        totalApps: 2,
        cachedTokens: 2,
        expiringSoon: 0,
      });

      // Verify it's properly typed
      expect(typeof stats?.totalApps).toBe('number');
      expect(typeof stats?.cachedTokens).toBe('number');
      expect(typeof stats?.expiringSoon).toBe('number');
      expect(stats?.totalApps).toBeGreaterThanOrEqual(0);
    });

    it('should return null when Redis is not available', async () => {
      // Arrange - create service without Redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeishuAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(
                <T = string>(key: string, defaultValue?: T): T | undefined => {
                  const config: Record<string, string> = {
                    APP_VERSION: '1.0.0',
                    NODE_ENV: 'test',
                  };
                  return (config[key] as T) ?? defaultValue;
                },
              ),
            },
          },
          {
            provide: CryptoService,
            useValue: {
              decrypt: jest.fn(),
            },
          },
          {
            provide: FeishuContractValidatorService,
            useValue: {
              validateAuthResponse: jest.fn(),
            },
          },
          {
            provide: RedisService,
            useValue: null, // No Redis
          },
        ],
      }).compile();

      const serviceWithoutRedis =
        module.get<FeishuAuthService>(FeishuAuthService);

      // Act
      const stats = await serviceWithoutRedis.getTokenStats();

      // Assert
      expect(stats).toBeNull();
    });
  });

  describe('getAccessToken with request validation', () => {
    it('should validate request parameters and get token successfully', async () => {
      // Arrange
      (mockRedis.hgetall as jest.Mock).mockResolvedValue({}); // No cached token

      // Configure axios mock to return validTokenResponse
      mockAxiosInstance.post.mockResolvedValue({ data: validTokenResponse });

      // Extract mock function for direct assertion
      const mockValidateAuthResponse = jest
        .fn()
        .mockReturnValue(validTokenResponse);

      const freshModule: TestingModule = await Test.createTestingModule({
        providers: [
          FeishuAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(
                <T = string>(key: string, defaultValue?: T): T | undefined => {
                  const config: Record<string, string> = {
                    APP_VERSION: '1.0.0',
                    NODE_ENV: 'test',
                  };
                  return (config[key] as T) ?? defaultValue;
                },
              ),
            },
          },
          {
            provide: CryptoService,
            useValue: {
              decrypt: jest.fn(),
            },
          },
          {
            provide: FeishuContractValidatorService,
            useValue: {
              validateAuthResponse: mockValidateAuthResponse,
            },
          },
          {
            provide: RedisService,
            useValue: mockRedis,
          },
        ],
      }).compile();

      const freshService =
        freshModule.get<FeishuAuthService>(FeishuAuthService);

      // Act
      const token = await freshService.getAccessToken(testAppId, testAppSecret);

      // Assert
      expect(token).toBe(validTokenResponse.tenant_access_token);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: testAppId,
          app_secret: testAppSecret,
        },
      );
      expect(mockValidateAuthResponse).toHaveBeenCalledWith(
        validTokenResponse,
        'requestNewToken',
      );
    });

    it('should throw error for invalid request parameters', async () => {
      // Arrange
      (mockRedis.hgetall as jest.Mock).mockResolvedValue({}); // No cached token

      // Act & Assert - empty appId should throw validation error
      await expect(service.getAccessToken('', testAppSecret)).rejects.toThrow();

      // Act & Assert - empty appSecret should throw validation error
      await expect(service.getAccessToken(testAppId, '')).rejects.toThrow();
    });
  });

  describe('Error handling with Schema validation', () => {
    it('should handle valid error responses with Schema validation', () => {
      // Arrange
      (mockRedis.hgetall as jest.Mock).mockResolvedValue({}); // No cached token

      const validErrorResponse = {
        code: 99991668,
        msg: 'tenant_access_token 无效',
      };

      // Test the transformError method directly by creating an AxiosError object
      const axiosError = {
        message: 'API Error',
        name: 'AxiosError',
        config: {},
        response: {
          data: validErrorResponse,
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: {},
        },
        isAxiosError: true,
      };

      const transformedError = (
        service as unknown as FeishuAuthServiceTestInterface
      ).transformError(axiosError);
      expect(transformedError.message).toBe(
        'Feishu API Error: [99991668] tenant_access_token 无效',
      );
    });

    it('should handle malformed error responses gracefully', () => {
      // Arrange
      const malformedErrorResponse = {
        invalid: 'response',
        // Missing required fields
      };

      // Test the transformError method directly with malformed response
      const axiosError = {
        message: 'API Error',
        name: 'AxiosError',
        config: {},
        response: {
          data: malformedErrorResponse,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        },
        isAxiosError: true,
      };

      const transformedError = (
        service as unknown as FeishuAuthServiceTestInterface
      ).transformError(axiosError);
      expect(transformedError.message).toBe(
        'Feishu API Error: [500] Unknown error',
      );
    });
  });

  describe('Cache data validation with Schema', () => {
    it('should validate and return valid cached token data', async () => {
      // Arrange
      const validCacheData = {
        token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
        expiresAt: (Date.now() + 3600000).toString(), // 1 hour from now
        createdAt: Date.now().toString(),
      };

      (mockRedis.hgetall as jest.Mock).mockResolvedValue(validCacheData);

      // Act
      const result = await (
        service as unknown as FeishuAuthServiceTestInterface
      ).getCachedToken('feishu:token:test-app');

      // Assert
      expect(result).toBe(validCacheData.token);
      expect(mockRedis.hgetall).toHaveBeenCalledWith('feishu:token:test-app');
    });

    it('should handle invalid cache data and clear it', async () => {
      // Arrange - Invalid cache data (missing required fields)
      const invalidCacheData = {
        token: 't-invalid-token',
        expiresAt: 'not-a-number', // Invalid format
        // Missing createdAt
      };

      (mockRedis.hgetall as jest.Mock).mockResolvedValue(invalidCacheData);
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await (
        service as unknown as FeishuAuthServiceTestInterface
      ).getCachedToken('feishu:token:test-app');

      // Assert
      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('feishu:token:test-app');
    });

    it('should return null for expired tokens based on validation', async () => {
      // Arrange - Expired token
      const expiredCacheData = {
        token: 't-expired-token',
        expiresAt: (Date.now() - 1000).toString(), // 1 second ago
        createdAt: (Date.now() - 7200000).toString(), // 2 hours ago
      };

      (mockRedis.hgetall as jest.Mock).mockResolvedValue(expiredCacheData);

      // Act
      const result = await (
        service as unknown as FeishuAuthServiceTestInterface
      ).getCachedToken('feishu:token:test-app');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle missing cache data gracefully', async () => {
      // Arrange - Empty cache data
      (mockRedis.hgetall as jest.Mock).mockResolvedValue({});

      // Act
      const result = await (
        service as unknown as FeishuAuthServiceTestInterface
      ).getCachedToken('feishu:token:test-app');

      // Assert
      expect(result).toBeNull();
    });
  });
});
