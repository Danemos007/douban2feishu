import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { ConfigService } from './config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import {
  UpdateDoubanConfigDto,
  UpdateFeishuConfigDto,
  UpdateSyncConfigDto,
} from './dto/config.dto';

describe('ConfigService - Comprehensive Security & Configuration Test Suite', () => {
  let configService: ConfigService;
  let prismaService: PrismaService;
  let cryptoService: CryptoService;

  // Spy variables for unbound-method error prevention
  let userFindUniqueSpy: jest.SpyInstance;
  let credentialsFindUniqueSpy: jest.SpyInstance;
  let credentialsCreateSpy: jest.SpyInstance;
  let credentialsUpdateSpy: jest.SpyInstance;
  let syncConfigFindUniqueSpy: jest.SpyInstance;
  let syncConfigCreateSpy: jest.SpyInstance;
  let syncConfigUpdateSpy: jest.SpyInstance;
  let syncConfigDeleteManySpy: jest.SpyInstance;
  let prismaTransactionSpy: jest.SpyInstance;
  let encryptSpy: jest.SpyInstance;
  let decryptSpy: jest.SpyInstance;
  let generateIVSpy: jest.SpyInstance;

  // Mock data constants
  const mockUserId = 'test-user-id-12345';
  const mockEmail = 'test@example.com';
  const mockEncryptionIV = 'mock-encryption-iv';
  const mockEncryptedCookie = 'encrypted-douban-cookie';
  const mockEncryptedSecret = 'encrypted-feishu-secret';
  const mockDecryptedCookie = 'll="example"; bid=example_bid';
  const mockDecryptedSecret = 'your_app_secret_here';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    lastSyncAt: new Date('2023-01-15T10:30:00.000Z'),
    credentials: {
      userId: mockUserId,
      doubanCookieEncrypted: mockEncryptedCookie,
      feishuAppId: 'cli_your_app_id_here',
      feishuAppSecretEncrypted: mockEncryptedSecret,
      encryptionIv: mockEncryptionIV,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    },
    syncConfigs: {
      userId: mockUserId,
      mappingType: 'THREE_TABLES' as const,
      autoSyncEnabled: true,
      syncSchedule: {
        frequency: 'daily' as const,
        time: '09:00',
        timezone: 'Asia/Shanghai',
      },
      tableMappings: {
        books: {
          tableId: 'your_table_id_here',
          fieldMappings: { title: 'field001', author: 'field002' },
        },
      },
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    },
  };

  const mockUserWithoutCredentials = {
    id: mockUserId,
    email: mockEmail,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    lastSyncAt: null,
    credentials: null,
    syncConfigs: null,
  };

  const mockUserWithPartialCredentials = {
    ...mockUser,
    credentials: {
      ...mockUser.credentials,
      doubanCookieEncrypted: mockEncryptedCookie,
      feishuAppId: null,
      feishuAppSecretEncrypted: null,
    },
  };

  const mockCredentials = {
    userId: mockUserId,
    doubanCookieEncrypted: null,
    feishuAppId: null,
    feishuAppSecretEncrypted: null,
    encryptionIv: mockEncryptionIV,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockDoubanConfigDto: UpdateDoubanConfigDto = {
    cookie: mockDecryptedCookie,
  };

  const mockFeishuConfigDto: UpdateFeishuConfigDto = {
    appId: 'cli_your_app_id_here',
    appSecret: mockDecryptedSecret,
  };

  const mockSyncConfigDto: UpdateSyncConfigDto = {
    mappingType: 'FOUR_TABLES',
    autoSyncEnabled: false,
    syncSchedule: {
      frequency: 'weekly',
      time: '14:00',
      timezone: 'Asia/Shanghai',
      daysOfWeek: [1, 3, 5],
    },
    tableMappings: {
      books: {
        tableId: 'your_table_id_here',
        fieldMappings: { title: 'field001' },
      },
      movies: {
        tableId: 'your_movie_table_id',
        fieldMappings: { title: 'field003' },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            userCredentials: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            syncConfig: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
            generateIV: jest.fn(),
          },
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
    cryptoService = module.get<CryptoService>(CryptoService);

    // Initialize spy variables
    userFindUniqueSpy = jest.spyOn(prismaService.user, 'findUnique');
    credentialsFindUniqueSpy = jest.spyOn(
      prismaService.userCredentials,
      'findUnique',
    );
    credentialsCreateSpy = jest.spyOn(prismaService.userCredentials, 'create');
    credentialsUpdateSpy = jest.spyOn(prismaService.userCredentials, 'update');
    syncConfigFindUniqueSpy = jest.spyOn(
      prismaService.syncConfig,
      'findUnique',
    );
    syncConfigCreateSpy = jest.spyOn(prismaService.syncConfig, 'create');
    syncConfigUpdateSpy = jest.spyOn(prismaService.syncConfig, 'update');
    syncConfigDeleteManySpy = jest.spyOn(
      prismaService.syncConfig,
      'deleteMany',
    );
    prismaTransactionSpy = jest.spyOn(prismaService, '$transaction');
    encryptSpy = jest.spyOn(cryptoService, 'encrypt');
    decryptSpy = jest.spyOn(cryptoService, 'decrypt');
    generateIVSpy = jest.spyOn(cryptoService, 'generateIV');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Instantiation & Dependencies', () => {
    it('should be defined and properly instantiated', () => {
      expect(configService).toBeDefined();
    });

    it('should have all required dependencies injected correctly', () => {
      expect(prismaService).toBeDefined();
      expect(cryptoService).toBeDefined();
    });

    it('should inject PrismaService and CryptoService instances', () => {
      expect(prismaService.user).toBeDefined();
      expect(prismaService.userCredentials).toBeDefined();
      expect(prismaService.syncConfig).toBeDefined();
      expect(encryptSpy).toBeDefined();
      expect(decryptSpy).toBeDefined();
      expect(generateIVSpy).toBeDefined();
    });
  });

  describe('getUserConfig()', () => {
    it('should successfully return user config when user exists with full credentials', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await configService.getUserConfig(mockUserId);

      // Assert
      expect(userFindUniqueSpy).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
      expect(result).toEqual({
        user: {
          id: mockUserId,
          email: mockEmail,
          createdAt: mockUser.createdAt,
          lastSyncAt: mockUser.lastSyncAt,
        },
        douban: {
          hasConfig: true,
        },
        feishu: {
          hasConfig: true,
          appId: 'cli_your_app_id_here',
        },
        sync: {
          mappingType: 'THREE_TABLES',
          autoSyncEnabled: true,
          syncSchedule: mockUser.syncConfigs.syncSchedule,
          tableMappings: mockUser.syncConfigs.tableMappings,
        },
      });
    });

    it('should return user config with partial credentials (only douban)', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUserWithPartialCredentials);

      // Act
      const result = await configService.getUserConfig(mockUserId);

      // Assert
      expect(result.douban.hasConfig).toBe(true);
      expect(result.feishu.hasConfig).toBe(false);
      expect(result.feishu.appId).toBeNull();
    });

    it('should return user config with partial credentials (only feishu)', async () => {
      // Arrange
      const userWithOnlyFeishu = {
        ...mockUser,
        credentials: {
          ...mockUser.credentials,
          doubanCookieEncrypted: null,
          feishuAppId: 'cli_your_app_id_here',
          feishuAppSecretEncrypted: mockEncryptedSecret,
        },
      };
      userFindUniqueSpy.mockResolvedValue(userWithOnlyFeishu);

      // Act
      const result = await configService.getUserConfig(mockUserId);

      // Assert
      expect(result.douban.hasConfig).toBe(false);
      expect(result.feishu.hasConfig).toBe(true);
      expect(result.feishu.appId).toBe('cli_your_app_id_here');
    });

    it('should return user config with no credentials but with sync config', async () => {
      // Arrange
      const userWithOnlySync = {
        ...mockUser,
        credentials: null,
      };
      userFindUniqueSpy.mockResolvedValue(userWithOnlySync);

      // Act
      const result = await configService.getUserConfig(mockUserId);

      // Assert
      expect(result.douban.hasConfig).toBe(false);
      expect(result.feishu.hasConfig).toBe(false);
      expect(result.sync).toEqual({
        mappingType: 'THREE_TABLES',
        autoSyncEnabled: true,
        syncSchedule: mockUser.syncConfigs.syncSchedule,
        tableMappings: mockUser.syncConfigs.tableMappings,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(null);

      // Act & Assert
      await expect(configService.getUserConfig(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(configService.getUserConfig(mockUserId)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      userFindUniqueSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(configService.getUserConfig(mockUserId)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should never expose encrypted values in response', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await configService.getUserConfig(mockUserId);

      // Assert
      const resultJson = JSON.stringify(result);
      expect(resultJson).not.toContain(mockEncryptedCookie);
      expect(resultJson).not.toContain(mockEncryptedSecret);
      expect(resultJson).not.toContain(mockEncryptionIV);
    });
  });

  describe('updateDoubanConfig()', () => {
    it('should create new credentials when user has no existing credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(null);
      credentialsCreateSpy.mockResolvedValue(mockCredentials);
      generateIVSpy.mockReturnValue(mockEncryptionIV);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue({
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
      });

      // Act
      const result = await configService.updateDoubanConfig(
        mockUserId,
        mockDoubanConfigDto,
      );

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(generateIVSpy).toHaveBeenCalledTimes(1);
      expect(credentialsCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          encryptionIv: mockEncryptionIV,
        },
      });
      expect(encryptSpy).toHaveBeenCalledWith(
        mockDecryptedCookie,
        mockUserId,
        mockEncryptionIV,
      );
      expect(credentialsUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          doubanCookieEncrypted: mockEncryptedCookie,
        },
      });
      expect(result).toEqual({
        message: 'Douban configuration updated successfully',
      });
    });

    it('should update existing credentials when user already has credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue({
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
      });

      // Act
      const result = await configService.updateDoubanConfig(
        mockUserId,
        mockDoubanConfigDto,
      );

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(generateIVSpy).not.toHaveBeenCalled();
      expect(credentialsCreateSpy).not.toHaveBeenCalled();
      expect(encryptSpy).toHaveBeenCalledWith(
        mockDecryptedCookie,
        mockUserId,
        mockCredentials.encryptionIv,
      );
      expect(result).toEqual({
        message: 'Douban configuration updated successfully',
      });
    });

    it('should encrypt cookie using CryptoService with correct parameters', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto);

      // Assert
      expect(encryptSpy).toHaveBeenCalledTimes(1);
      expect(encryptSpy).toHaveBeenCalledWith(
        mockDecryptedCookie,
        mockUserId,
        mockCredentials.encryptionIv,
      );
    });

    it('should generate new IV when creating new credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(null);
      generateIVSpy.mockReturnValue(mockEncryptionIV);
      credentialsCreateSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto);

      // Assert
      expect(generateIVSpy).toHaveBeenCalledTimes(1);
      expect(credentialsCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          encryptionIv: mockEncryptionIV,
        },
      });
    });

    it('should reuse existing IV when updating existing credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto);

      // Assert
      expect(generateIVSpy).not.toHaveBeenCalled();
      expect(encryptSpy).toHaveBeenCalledWith(
        mockDecryptedCookie,
        mockUserId,
        mockCredentials.encryptionIv,
      );
    });

    it('should handle CryptoService encryption errors', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      const encryptionError = new Error('Encryption failed');
      encryptSpy.mockImplementation(() => {
        throw encryptionError;
      });

      // Act & Assert
      await expect(
        configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto),
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle database update errors', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      const dbError = new Error('Database update failed');
      credentialsUpdateSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto),
      ).rejects.toThrow('Database update failed');
    });

    it('should return success message after successful update', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedCookie);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      const result = await configService.updateDoubanConfig(
        mockUserId,
        mockDoubanConfigDto,
      );

      // Assert
      expect(result).toEqual({
        message: 'Douban configuration updated successfully',
      });
    });
  });

  describe('updateFeishuConfig()', () => {
    it('should create new credentials when user has no existing credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(null);
      credentialsCreateSpy.mockResolvedValue(mockCredentials);
      generateIVSpy.mockReturnValue(mockEncryptionIV);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue({
        ...mockCredentials,
        feishuAppId: mockFeishuConfigDto.appId,
        feishuAppSecretEncrypted: mockEncryptedSecret,
      });

      // Act
      const result = await configService.updateFeishuConfig(
        mockUserId,
        mockFeishuConfigDto,
      );

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(generateIVSpy).toHaveBeenCalledTimes(1);
      expect(credentialsCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          encryptionIv: mockEncryptionIV,
        },
      });
      expect(encryptSpy).toHaveBeenCalledWith(
        mockFeishuConfigDto.appSecret,
        mockUserId,
        mockEncryptionIV,
      );
      expect(credentialsUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          feishuAppId: mockFeishuConfigDto.appId,
          feishuAppSecretEncrypted: mockEncryptedSecret,
        },
      });
      expect(result).toEqual({
        message: 'Feishu configuration updated successfully',
      });
    });

    it('should update existing credentials when user already has credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue({
        ...mockCredentials,
        feishuAppId: mockFeishuConfigDto.appId,
        feishuAppSecretEncrypted: mockEncryptedSecret,
      });

      // Act
      const result = await configService.updateFeishuConfig(
        mockUserId,
        mockFeishuConfigDto,
      );

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(generateIVSpy).not.toHaveBeenCalled();
      expect(credentialsCreateSpy).not.toHaveBeenCalled();
      expect(encryptSpy).toHaveBeenCalledWith(
        mockFeishuConfigDto.appSecret,
        mockUserId,
        mockCredentials.encryptionIv,
      );
      expect(result).toEqual({
        message: 'Feishu configuration updated successfully',
      });
    });

    it('should encrypt app secret using CryptoService with correct parameters', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto);

      // Assert
      expect(encryptSpy).toHaveBeenCalledTimes(1);
      expect(encryptSpy).toHaveBeenCalledWith(
        mockFeishuConfigDto.appSecret,
        mockUserId,
        mockCredentials.encryptionIv,
      );
    });

    it('should store app ID in plain text', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto);

      // Assert
      expect(credentialsUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          feishuAppId: mockFeishuConfigDto.appId, // Plain text storage
          feishuAppSecretEncrypted: mockEncryptedSecret, // Encrypted storage
        },
      });
    });

    it('should generate new IV when creating new credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(null);
      generateIVSpy.mockReturnValue(mockEncryptionIV);
      credentialsCreateSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto);

      // Assert
      expect(generateIVSpy).toHaveBeenCalledTimes(1);
      expect(credentialsCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          encryptionIv: mockEncryptionIV,
        },
      });
    });

    it('should reuse existing IV when updating existing credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      await configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto);

      // Assert
      expect(generateIVSpy).not.toHaveBeenCalled();
      expect(encryptSpy).toHaveBeenCalledWith(
        mockFeishuConfigDto.appSecret,
        mockUserId,
        mockCredentials.encryptionIv,
      );
    });

    it('should handle CryptoService encryption errors', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      const encryptionError = new Error('Encryption failed');
      encryptSpy.mockImplementation(() => {
        throw encryptionError;
      });

      // Act & Assert
      await expect(
        configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto),
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle database update errors', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      const dbError = new Error('Database update failed');
      credentialsUpdateSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto),
      ).rejects.toThrow('Database update failed');
    });

    it('should return success message after successful update', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockReturnValue(mockEncryptedSecret);
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      const result = await configService.updateFeishuConfig(
        mockUserId,
        mockFeishuConfigDto,
      );

      // Assert
      expect(result).toEqual({
        message: 'Feishu configuration updated successfully',
      });
    });
  });

  describe('updateSyncConfig()', () => {
    const mockExistingSyncConfig = {
      userId: mockUserId,
      mappingType: 'THREE_TABLES' as const,
      autoSyncEnabled: true,
      syncSchedule: { frequency: 'daily' as const },
      tableMappings: { books: { tableId: 'old-table-id', fieldMappings: {} } },
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    };

    it('should create new sync config when user has no existing config', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockResolvedValue({
        ...mockExistingSyncConfig,
        ...mockSyncConfigDto,
      });

      // Act
      const result = await configService.updateSyncConfig(
        mockUserId,
        mockSyncConfigDto,
      );

      // Assert
      expect(syncConfigFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: mockSyncConfigDto.mappingType,
          autoSyncEnabled: mockSyncConfigDto.autoSyncEnabled,
          syncSchedule: mockSyncConfigDto.syncSchedule,
          tableMappings: mockSyncConfigDto.tableMappings,
        },
      });
      expect(syncConfigUpdateSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Sync configuration updated successfully',
      });
    });

    it('should update existing sync config when config already exists', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(mockExistingSyncConfig);
      syncConfigUpdateSpy.mockResolvedValue({
        ...mockExistingSyncConfig,
        ...mockSyncConfigDto,
      });

      // Act
      const result = await configService.updateSyncConfig(
        mockUserId,
        mockSyncConfigDto,
      );

      // Assert
      expect(syncConfigFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(syncConfigUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          mappingType: mockSyncConfigDto.mappingType,
          autoSyncEnabled: mockSyncConfigDto.autoSyncEnabled,
          syncSchedule: mockSyncConfigDto.syncSchedule,
          tableMappings: mockSyncConfigDto.tableMappings,
        },
      });
      expect(syncConfigCreateSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Sync configuration updated successfully',
      });
    });

    it('should correctly convert syncSchedule to JSON using toJsonValue (indirect test)', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockResolvedValue(mockExistingSyncConfig);

      // Act
      await configService.updateSyncConfig(mockUserId, mockSyncConfigDto);

      // Assert - Verify that the syncSchedule object is passed correctly to Prisma
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: mockSyncConfigDto.mappingType,
          autoSyncEnabled: mockSyncConfigDto.autoSyncEnabled,
          syncSchedule: mockSyncConfigDto.syncSchedule,
          tableMappings: mockSyncConfigDto.tableMappings,
        },
      });
      // Verify the syncSchedule object structure is preserved
      // Reason: Jest SpyInstance.mock.calls returns any[][] due to library type limitations
      const createCall = (
        syncConfigCreateSpy.mock.calls[0] as unknown[]
      )?.[0] as {
        data: {
          syncSchedule: {
            frequency: string;
            time: string;
            daysOfWeek: number[];
          };
        };
      };
      expect(createCall.data.syncSchedule.frequency).toBe('weekly');
      expect(createCall.data.syncSchedule.time).toBe('14:00');
      expect(createCall.data.syncSchedule.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should correctly convert tableMappings to JSON using toJsonValue (indirect test)', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockResolvedValue(mockExistingSyncConfig);

      // Act
      await configService.updateSyncConfig(mockUserId, mockSyncConfigDto);

      // Assert - Verify that the tableMappings object is passed correctly to Prisma
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: mockSyncConfigDto.mappingType,
          autoSyncEnabled: mockSyncConfigDto.autoSyncEnabled,
          syncSchedule: mockSyncConfigDto.syncSchedule,
          tableMappings: mockSyncConfigDto.tableMappings,
        },
      });
      // Verify the tableMappings object structure is preserved
      // Reason: Jest SpyInstance.mock.calls returns any[][] due to library type limitations
      const createCall = (
        syncConfigCreateSpy.mock.calls[0] as unknown[]
      )?.[0] as {
        data: {
          tableMappings: {
            books: { tableId: string };
            movies: { tableId: string };
          };
        };
      };
      expect(createCall.data.tableMappings.books.tableId).toBe(
        'your_table_id_here',
      );
      expect(createCall.data.tableMappings.movies.tableId).toBe(
        'your_movie_table_id',
      );
    });

    it('should handle all mapping types (3tables, 4tables)', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockResolvedValue(mockExistingSyncConfig);

      const threeTablesDto = {
        ...mockSyncConfigDto,
        mappingType: 'THREE_TABLES' as const,
      };
      const fourTablesDto = {
        ...mockSyncConfigDto,
        mappingType: 'FOUR_TABLES' as const,
      };

      // Act & Assert - Test 3tables
      await configService.updateSyncConfig(mockUserId, threeTablesDto);
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: 'THREE_TABLES',
          autoSyncEnabled: threeTablesDto.autoSyncEnabled,
          syncSchedule: threeTablesDto.syncSchedule,
          tableMappings: threeTablesDto.tableMappings,
        },
      });

      // Reset and test 4tables
      syncConfigCreateSpy.mockClear();
      await configService.updateSyncConfig(mockUserId, fourTablesDto);
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: 'FOUR_TABLES',
          autoSyncEnabled: fourTablesDto.autoSyncEnabled,
          syncSchedule: fourTablesDto.syncSchedule,
          tableMappings: fourTablesDto.tableMappings,
        },
      });
    });

    it('should handle boolean autoSyncEnabled values correctly', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockResolvedValue(mockExistingSyncConfig);

      const enabledDto = { ...mockSyncConfigDto, autoSyncEnabled: true };
      const disabledDto = { ...mockSyncConfigDto, autoSyncEnabled: false };

      // Act & Assert - Test enabled
      await configService.updateSyncConfig(mockUserId, enabledDto);
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: enabledDto.mappingType,
          autoSyncEnabled: true,
          syncSchedule: enabledDto.syncSchedule,
          tableMappings: enabledDto.tableMappings,
        },
      });

      // Reset and test disabled
      syncConfigCreateSpy.mockClear();
      await configService.updateSyncConfig(mockUserId, disabledDto);
      expect(syncConfigCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          mappingType: disabledDto.mappingType,
          autoSyncEnabled: false,
          syncSchedule: disabledDto.syncSchedule,
          tableMappings: disabledDto.tableMappings,
        },
      });
    });

    it('should handle database creation errors', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(null);
      const dbError = new Error('Database creation failed');
      syncConfigCreateSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.updateSyncConfig(mockUserId, mockSyncConfigDto),
      ).rejects.toThrow('Database creation failed');
    });

    it('should handle database update errors', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(mockExistingSyncConfig);
      const dbError = new Error('Database update failed');
      syncConfigUpdateSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.updateSyncConfig(mockUserId, mockSyncConfigDto),
      ).rejects.toThrow('Database update failed');
    });

    it('should return success message after successful update', async () => {
      // Arrange
      syncConfigFindUniqueSpy.mockResolvedValue(mockExistingSyncConfig);
      syncConfigUpdateSpy.mockResolvedValue({
        ...mockExistingSyncConfig,
        ...mockSyncConfigDto,
      });

      // Act
      const result = await configService.updateSyncConfig(
        mockUserId,
        mockSyncConfigDto,
      );

      // Assert
      expect(result).toEqual({
        message: 'Sync configuration updated successfully',
      });
    });
  });

  describe('getDecryptedCredentials()', () => {
    it('should return null when user has no credentials', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(null);

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(result).toBeNull();
    });

    it('should return decrypted credentials when user has all credentials', async () => {
      // Arrange
      const mockCredentialsWithData = {
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecretEncrypted: mockEncryptedSecret,
      };
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentialsWithData);
      decryptSpy
        .mockReturnValueOnce(mockDecryptedCookie) // First call for douban
        .mockReturnValueOnce(mockDecryptedSecret); // Second call for feishu

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(credentialsFindUniqueSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(decryptSpy).toHaveBeenCalledTimes(2);
      expect(decryptSpy).toHaveBeenNthCalledWith(
        1,
        mockEncryptedCookie,
        mockUserId,
      );
      expect(decryptSpy).toHaveBeenNthCalledWith(
        2,
        mockEncryptedSecret,
        mockUserId,
      );
      expect(result).toEqual({
        userId: mockUserId,
        doubanCookie: mockDecryptedCookie,
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecret: mockDecryptedSecret,
      });
    });

    it('should return partial credentials when user has only douban config', async () => {
      // Arrange
      const mockCredentialsWithDouban = {
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
        feishuAppId: null,
        feishuAppSecretEncrypted: null,
      };
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentialsWithDouban);
      decryptSpy.mockReturnValue(mockDecryptedCookie);

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(decryptSpy).toHaveBeenCalledTimes(1);
      expect(decryptSpy).toHaveBeenCalledWith(mockEncryptedCookie, mockUserId);
      expect(result).toEqual({
        userId: mockUserId,
        doubanCookie: mockDecryptedCookie,
      });
    });

    it('should return partial credentials when user has only feishu config', async () => {
      // Arrange
      const mockCredentialsWithFeishu = {
        ...mockCredentials,
        doubanCookieEncrypted: null,
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecretEncrypted: mockEncryptedSecret,
      };
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentialsWithFeishu);
      decryptSpy.mockReturnValue(mockDecryptedSecret);

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(decryptSpy).toHaveBeenCalledTimes(1);
      expect(decryptSpy).toHaveBeenCalledWith(mockEncryptedSecret, mockUserId);
      expect(result).toEqual({
        userId: mockUserId,
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecret: mockDecryptedSecret,
      });
    });

    it('should handle CryptoService decryption failures gracefully', async () => {
      // Arrange
      const mockCredentialsWithData = {
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecretEncrypted: mockEncryptedSecret,
      };
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentialsWithData);
      decryptSpy
        .mockReturnValueOnce(null) // Failed decryption for douban
        .mockReturnValueOnce(mockDecryptedSecret); // Successful decryption for feishu

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        doubanCookie: undefined, // Failed decryption results in undefined
        feishuAppId: 'cli_your_app_id_here',
        feishuAppSecret: mockDecryptedSecret,
      });
    });

    it('should set undefined for failed decryptions rather than throwing', async () => {
      // Arrange
      const mockCredentialsWithData = {
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
        feishuAppSecretEncrypted: mockEncryptedSecret,
      };
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentialsWithData);
      decryptSpy.mockReturnValue(null); // All decryptions fail

      // Act
      const result = await configService.getDecryptedCredentials(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        doubanCookie: undefined,
        feishuAppSecret: undefined,
      });
      // Should not throw an error
      expect(result).toBeDefined();
    });

    it('should handle database query errors', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      credentialsFindUniqueSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.getDecryptedCredentials(mockUserId),
      ).rejects.toThrow('Database query failed');
    });
  });

  describe('deleteUserConfig()', () => {
    it('should delete only douban config when configType is "douban"', async () => {
      // Arrange
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      const result = await configService.deleteUserConfig(mockUserId, 'douban');

      // Assert
      expect(credentialsUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          doubanCookieEncrypted: null,
        },
      });
      expect(syncConfigDeleteManySpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'douban configuration deleted successfully',
      });
    });

    it('should delete only feishu config when configType is "feishu"', async () => {
      // Arrange
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);

      // Act
      const result = await configService.deleteUserConfig(mockUserId, 'feishu');

      // Assert
      expect(credentialsUpdateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          feishuAppId: null,
          feishuAppSecretEncrypted: null,
        },
      });
      expect(syncConfigDeleteManySpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'feishu configuration deleted successfully',
      });
    });

    it('should delete only sync config when configType is "sync"', async () => {
      // Arrange
      syncConfigDeleteManySpy.mockResolvedValue({ count: 1 });

      // Act
      const result = await configService.deleteUserConfig(mockUserId, 'sync');

      // Assert
      expect(syncConfigDeleteManySpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(credentialsUpdateSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'sync configuration deleted successfully',
      });
    });

    it('should delete all configs when configType is "all"', async () => {
      // Arrange
      prismaTransactionSpy.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act
      const result = await configService.deleteUserConfig(mockUserId, 'all');

      // Assert
      expect(prismaTransactionSpy).toHaveBeenCalledWith([
        prismaService.syncConfig.deleteMany({ where: { userId: mockUserId } }),
        prismaService.userCredentials.deleteMany({
          where: { userId: mockUserId },
        }),
      ]);
      expect(result).toEqual({
        message: 'all configuration deleted successfully',
      });
    });

    it('should use transaction for "all" deletion type', async () => {
      // Arrange
      prismaTransactionSpy.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act
      await configService.deleteUserConfig(mockUserId, 'all');

      // Assert
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledWith([
        prismaService.syncConfig.deleteMany({ where: { userId: mockUserId } }),
        prismaService.userCredentials.deleteMany({
          where: { userId: mockUserId },
        }),
      ]);
    });

    it('should handle database deletion errors for douban config', async () => {
      // Arrange
      const dbError = new Error('Database deletion failed');
      credentialsUpdateSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.deleteUserConfig(mockUserId, 'douban'),
      ).rejects.toThrow('Database deletion failed');
    });

    it('should handle database deletion errors for sync config', async () => {
      // Arrange
      const dbError = new Error('Database deletion failed');
      syncConfigDeleteManySpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.deleteUserConfig(mockUserId, 'sync'),
      ).rejects.toThrow('Database deletion failed');
    });

    it('should handle database deletion errors for all config', async () => {
      // Arrange
      const dbError = new Error('Database deletion failed');
      prismaTransactionSpy.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        configService.deleteUserConfig(mockUserId, 'all'),
      ).rejects.toThrow('Database deletion failed');
    });

    it('should return appropriate success message for each config type', async () => {
      // Arrange
      credentialsUpdateSpy.mockResolvedValue(mockCredentials);
      syncConfigDeleteManySpy.mockResolvedValue({ count: 1 });
      prismaTransactionSpy.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act & Assert
      const doubanResult = await configService.deleteUserConfig(
        mockUserId,
        'douban',
      );
      expect(doubanResult.message).toBe(
        'douban configuration deleted successfully',
      );

      const feishuResult = await configService.deleteUserConfig(
        mockUserId,
        'feishu',
      );
      expect(feishuResult.message).toBe(
        'feishu configuration deleted successfully',
      );

      const syncResult = await configService.deleteUserConfig(
        mockUserId,
        'sync',
      );
      expect(syncResult.message).toBe(
        'sync configuration deleted successfully',
      );

      const allResult = await configService.deleteUserConfig(mockUserId, 'all');
      expect(allResult.message).toBe('all configuration deleted successfully');
    });
  });

  describe('validateConfig()', () => {
    it('should return validation results for fully configured user', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await configService.validateConfig(mockUserId);

      // Assert
      expect(result).toEqual({
        douban: {
          configured: true,
          valid: false,
        },
        feishu: {
          configured: true,
          valid: false,
        },
        sync: {
          configured: true,
          valid: true,
        },
        overall: true,
      });
    });

    it('should return validation results for partially configured user', async () => {
      // Arrange
      const partialUser = {
        ...mockUser,
        credentials: {
          ...mockUser.credentials,
          feishuAppSecretEncrypted: null,
        },
      };
      userFindUniqueSpy.mockResolvedValue(partialUser);

      // Act
      const result = await configService.validateConfig(mockUserId);

      // Assert
      expect(result).toEqual({
        douban: {
          configured: true,
          valid: false,
        },
        feishu: {
          configured: false,
          valid: false,
        },
        sync: {
          configured: true,
          valid: true,
        },
        overall: false, // Should be false because feishu is not configured
      });
    });

    it('should return validation results for unconfigured user', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUserWithoutCredentials);

      // Act
      const result = await configService.validateConfig(mockUserId);

      // Assert
      expect(result).toEqual({
        douban: {
          configured: false,
          valid: false,
        },
        feishu: {
          configured: false,
          valid: false,
        },
        sync: {
          configured: false,
          valid: false,
        },
        overall: false,
      });
    });

    it('should mark overall as true only when all configs are present', async () => {
      // Arrange
      userFindUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await configService.validateConfig(mockUserId);

      // Assert
      expect(result.overall).toBe(true);
      expect(result.douban.configured).toBe(true);
      expect(result.feishu.configured).toBe(true);
      expect(result.sync.configured).toBe(true);
    });

    it('should mark overall as false when any config is missing', async () => {
      // Arrange - User missing sync config
      const userMissingSync = {
        ...mockUser,
        syncConfigs: null,
      };
      userFindUniqueSpy.mockResolvedValue(userMissingSync);

      // Act
      const result = await configService.validateConfig(mockUserId);

      // Assert
      expect(result.overall).toBe(false);
      expect(result.sync.configured).toBe(false);
    });

    it('should handle getUserConfig errors during validation', async () => {
      // Arrange
      const userError = new Error('User fetch failed');
      userFindUniqueSpy.mockRejectedValue(userError);

      // Act & Assert
      await expect(configService.validateConfig(mockUserId)).rejects.toThrow(
        'User fetch failed',
      );
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle PrismaService connection failures across all methods', async () => {
      // Arrange
      const dbConnectionError = new Error('Database connection lost');
      userFindUniqueSpy.mockRejectedValue(dbConnectionError);
      credentialsFindUniqueSpy.mockRejectedValue(dbConnectionError);
      syncConfigFindUniqueSpy.mockRejectedValue(dbConnectionError);

      // Act & Assert
      await expect(configService.getUserConfig(mockUserId)).rejects.toThrow(
        'Database connection lost',
      );
      await expect(
        configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto),
      ).rejects.toThrow('Database connection lost');
      await expect(
        configService.updateSyncConfig(mockUserId, mockSyncConfigDto),
      ).rejects.toThrow('Database connection lost');
      await expect(
        configService.getDecryptedCredentials(mockUserId),
      ).rejects.toThrow('Database connection lost');
    });

    it('should handle CryptoService failures in encryption/decryption methods', async () => {
      // Arrange
      const cryptoError = new Error('Crypto operation failed');
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);
      encryptSpy.mockImplementation(() => {
        throw cryptoError;
      });
      decryptSpy.mockImplementation(() => {
        throw cryptoError;
      });

      // Act & Assert
      await expect(
        configService.updateDoubanConfig(mockUserId, mockDoubanConfigDto),
      ).rejects.toThrow('Crypto operation failed');
      await expect(
        configService.updateFeishuConfig(mockUserId, mockFeishuConfigDto),
      ).rejects.toThrow('Crypto operation failed');

      // For decryption, the method should handle errors gracefully
      credentialsFindUniqueSpy.mockResolvedValue({
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
      });

      // Reset the mock to throw on decrypt
      decryptSpy.mockReset();
      decryptSpy.mockImplementation(() => {
        throw cryptoError;
      });

      // Should not throw, but handle gracefully
      await expect(
        configService.getDecryptedCredentials(mockUserId),
      ).rejects.toThrow('Crypto operation failed');
    });

    it('should handle invalid userId parameters', async () => {
      // Arrange
      const invalidUserIds = ['', null, undefined, 'invalid-format'];

      for (const invalidUserId of invalidUserIds) {
        userFindUniqueSpy.mockResolvedValue(null);

        // Act & Assert
        await expect(
          configService.getUserConfig(invalidUserId as string),
        ).rejects.toThrow(NotFoundException);
      }
    });

    it('should handle malformed DTOs in update methods', async () => {
      // Arrange
      credentialsFindUniqueSpy.mockResolvedValue(mockCredentials);

      // Create edge case data that would cause encryption/validation failures
      const malformedDoubanDto: UpdateDoubanConfigDto = {
        cookie: '', // Empty string instead of null - still causes encryption issues
      };
      const malformedFeishuDto: UpdateFeishuConfigDto = {
        appId: '', // Empty appId
        appSecret: '', // Empty secret - will fail encryption validation
      };

      // Act & Assert - These edge cases should fail at encryption or database validation level
      encryptSpy.mockImplementation(() => {
        throw new Error('Cannot encrypt empty value');
      });

      await expect(
        configService.updateDoubanConfig(mockUserId, malformedDoubanDto),
      ).rejects.toThrow('Cannot encrypt empty value');

      await expect(
        configService.updateFeishuConfig(mockUserId, malformedFeishuDto),
      ).rejects.toThrow('Cannot encrypt empty value');

      // For sync config, test with invalid enum value instead of missing field
      const invalidSyncDto: UpdateSyncConfigDto = {
        mappingType: 'THREE_TABLES', // Valid enum but let's test database constraint failure
        autoSyncEnabled: false,
        syncSchedule: undefined,
        tableMappings: undefined,
      };

      syncConfigFindUniqueSpy.mockResolvedValue(null);
      syncConfigCreateSpy.mockRejectedValue(
        new Error('Database constraint violation'),
      );

      await expect(
        configService.updateSyncConfig(mockUserId, invalidSyncDto),
      ).rejects.toThrow('Database constraint violation');
    });

    it('should handle concurrent access to same user config', async () => {
      // Arrange - Simulate concurrent access by having database operations return different states
      credentialsFindUniqueSpy
        .mockResolvedValueOnce(null) // First call: no credentials
        .mockResolvedValueOnce(mockCredentials); // Second call: credentials exist

      generateIVSpy.mockReturnValue(mockEncryptionIV);
      encryptSpy.mockReturnValue(mockEncryptedCookie);

      // First operation creates credentials
      credentialsCreateSpy.mockResolvedValueOnce(mockCredentials);
      credentialsUpdateSpy.mockResolvedValue({
        ...mockCredentials,
        doubanCookieEncrypted: mockEncryptedCookie,
      });

      // Act - Simulate two concurrent operations
      const promise1 = configService.updateDoubanConfig(
        mockUserId,
        mockDoubanConfigDto,
      );
      const promise2 = configService.updateDoubanConfig(
        mockUserId,
        mockDoubanConfigDto,
      );

      // Assert - Both operations should complete successfully
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual({
        message: 'Douban configuration updated successfully',
      });
      expect(result2).toEqual({
        message: 'Douban configuration updated successfully',
      });

      // Verify that both operations attempted to find credentials
      expect(credentialsFindUniqueSpy).toHaveBeenCalledTimes(2);
    });
  });
});
