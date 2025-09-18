import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { RegisterDto } from './dto/auth.dto';
import { JwtPayload, AuthenticatedUser } from './interfaces/auth.interface';

// Mock the bcrypt module with type-safe implementation
jest.mock('bcryptjs', () => ({
  hash: jest.fn<Promise<string>, [string, number | string]>(),
}));

import * as bcrypt from 'bcryptjs';

// Reason: Jest type inference fails for overloaded bcrypt.hash function signatures
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<
  (s: string, salt: number | string) => Promise<string>
>;

describe('AuthService - Enhanced Test Suite', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let cryptoService: CryptoService;

  // Spy variables for unbound-method error prevention
  let findUniqueSpy: jest.SpyInstance;
  let createSpy: jest.SpyInstance;
  let signAsyncSpy: jest.SpyInstance;
  let verifySpy: jest.SpyInstance;
  let configGetSpy: jest.SpyInstance;
  let generateIVSpy: jest.SpyInstance;

  // Mock data constants
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    createdAt: new Date('2025-01-01'),
    lastSyncAt: null,
    credentials: {
      userId: 'user-123',
      encryptionIv: 'mock-iv',
      doubanCookieEncrypted: null,
      feishuAppId: null,
      feishuAppSecretEncrypted: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    syncConfigs: null,
  };

  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
  };

  const mockJwtPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: mockUser.id,
    email: mockUser.email,
    createdAt: mockUser.createdAt,
    lastSyncAt: mockUser.lastSyncAt,
  };

  const mockConfig = {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '30d',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            generateIV: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    cryptoService = module.get<CryptoService>(CryptoService);

    // Initialize spy variables
    findUniqueSpy = jest.spyOn(prismaService.user, 'findUnique');
    createSpy = jest.spyOn(prismaService.user, 'create');
    signAsyncSpy = jest.spyOn(jwtService, 'signAsync');
    verifySpy = jest.spyOn(jwtService, 'verify');
    configGetSpy = jest.spyOn(configService, 'get');
    generateIVSpy = jest.spyOn(cryptoService, 'generateIV');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Instantiation', () => {
    it('should be defined and properly instantiated', () => {
      expect(authService).toBeDefined();
    });

    it('should have all required dependencies injected', () => {
      expect(prismaService).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(configService).toBeDefined();
      expect(cryptoService).toBeDefined();
    });
  });

  describe('register()', () => {
    it('should register a new user successfully with complete token response', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        tokenType: 'Bearer',
        expiresIn: '7d',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          lastSyncAt: mockUser.lastSyncAt,
        },
      });
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(signAsyncSpy).toHaveBeenCalledTimes(2); // access + refresh token
    });

    it('should hash password using bcrypt with correct salt rounds', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      await authService.register(mockRegisterDto);

      // Assert
      expect(mockBcryptHash).toHaveBeenCalledWith(mockRegisterDto.password, 12);
      expect(mockBcryptHash).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        'User already exists with this email',
      );
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should generate unique IV for user credentials', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('unique-iv-12345');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      await authService.register(mockRegisterDto);

      // Assert
      expect(generateIVSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          email: mockRegisterDto.email,
          credentials: {
            create: {
              encryptionIv: 'unique-iv-12345',
            },
          },
        },
        include: {
          credentials: true,
        },
      });
    });

    it('should handle Prisma database errors gracefully', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockRejectedValue(new Error('Database connection failed'));
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(findUniqueSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateUser()', () => {
    it('should return authenticated user when user exists', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateUser(
        'test@example.com',
        'password',
      );

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        lastSyncAt: mockUser.lastSyncAt,
      });
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);

      // Act
      const result = await authService.validateUser(
        'nonexistent@example.com',
        'password',
      );

      // Assert
      expect(result).toBeNull();
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
    });

    it('should handle database errors during user lookup', async () => {
      // Arrange
      findUniqueSpy.mockRejectedValue(new Error('Database timeout'));

      // Act & Assert
      await expect(
        authService.validateUser('test@example.com', 'password'),
      ).rejects.toThrow('Database timeout');
    });

    it('should include all required relations when fetching user', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);

      // Act
      await authService.validateUser('test@example.com', 'password');

      // Assert
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
    });
  });

  describe('login()', () => {
    it('should generate complete token response for valid authenticated user', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      const result = await authService.login(mockAuthenticatedUser);

      // Assert
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        tokenType: 'Bearer',
        expiresIn: '7d',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          lastSyncAt: mockUser.lastSyncAt,
        },
      });
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: mockAuthenticatedUser.id },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found in database', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(mockAuthenticatedUser)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(mockAuthenticatedUser)).rejects.toThrow(
        'User not found',
      );
    });

    it('should fetch user with all required relations', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      await authService.login(mockAuthenticatedUser);

      // Assert
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: mockAuthenticatedUser.id },
        include: {
          credentials: true,
          syncConfigs: true,
        },
      });
    });

    it('should handle database errors during user lookup', async () => {
      // Arrange
      findUniqueSpy.mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(authService.login(mockAuthenticatedUser)).rejects.toThrow(
        'Connection lost',
      );
    });
  });

  describe('refreshToken()', () => {
    it('should generate new tokens with valid refresh token', async () => {
      // Arrange
      verifySpy.mockReturnValue(mockJwtPayload);
      findUniqueSpy.mockResolvedValue(mockUser);
      signAsyncSpy.mockResolvedValue('new-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      const result = await authService.refreshToken('valid-refresh-token');

      // Assert
      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: '7d',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          lastSyncAt: mockUser.lastSyncAt,
        },
      });
      expect(verifySpy).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for invalid/expired token', async () => {
      // Arrange
      verifySpy.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act & Assert
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      verifySpy.mockReturnValue(mockJwtPayload);
      findUniqueSpy.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException for malformed token payload', async () => {
      // Arrange
      verifySpy.mockReturnValue('not-an-object');

      // Act & Assert
      await expect(authService.refreshToken('malformed-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.refreshToken('malformed-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for payload missing required fields', async () => {
      // Arrange - payload missing 'sub' field
      verifySpy.mockReturnValue({
        email: 'test@example.com',
        iat: 1234567890,
        // sub field missing
      });

      // Act & Assert
      await expect(
        authService.refreshToken('incomplete-payload-token'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.refreshToken('incomplete-payload-token'),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should use correct refresh secret from configuration', async () => {
      // Arrange
      verifySpy.mockReturnValue(mockJwtPayload);
      findUniqueSpy.mockResolvedValue(mockUser);
      signAsyncSpy.mockResolvedValue('new-token');
      configGetSpy.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'custom-refresh-secret';
        return mockConfig[key as keyof typeof mockConfig] || 'default-value';
      });

      // Act
      await authService.refreshToken('valid-refresh-token');

      // Assert
      expect(verifySpy).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'custom-refresh-secret',
      });
      expect(configGetSpy).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });
  });

  describe('validateJwtPayload()', () => {
    it('should return authenticated user for valid JWT payload', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateJwtPayload(mockJwtPayload);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        lastSyncAt: mockUser.lastSyncAt,
      });
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: mockJwtPayload.sub },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.validateJwtPayload(mockJwtPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.validateJwtPayload(mockJwtPayload),
      ).rejects.toThrow('User not found');
    });

    it('should handle database errors during payload validation', async () => {
      // Arrange
      findUniqueSpy.mockRejectedValue(new Error('Database unavailable'));

      // Act & Assert
      await expect(
        authService.validateJwtPayload(mockJwtPayload),
      ).rejects.toThrow('Database unavailable');
    });
  });

  describe('generateTokens() - indirect testing', () => {
    it('should use correct JWT secrets from configuration', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation((key: string) => {
        const customConfig = {
          JWT_SECRET: 'custom-secret',
          JWT_REFRESH_SECRET: 'custom-refresh-secret',
          JWT_EXPIRES_IN: '24h',
          JWT_REFRESH_EXPIRES_IN: '90d',
        };
        return (
          customConfig[key as keyof typeof customConfig] || 'default-value'
        );
      });

      // Act
      await authService.register(mockRegisterDto);

      // Assert
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          secret: 'custom-secret',
          expiresIn: '24h',
        }),
      );
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          secret: 'custom-refresh-secret',
          expiresIn: '90d',
        }),
      );
    });

    it('should use default secrets when configuration not available', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation((key: string, defaultValue?: string) => {
        // 模拟ConfigService返回undefined，触发默认值逻辑
        return defaultValue; // 返回传入的默认值
      });

      // Act
      await authService.register(mockRegisterDto);

      // Assert
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          secret: 'default-secret-key-for-development',
          expiresIn: '7d',
        }),
      );
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          secret: 'default-refresh-secret-key',
          expiresIn: '30d',
        }),
      );
    });

    it('should set correct token expiration times', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '1h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return mockConfig[key as keyof typeof mockConfig] || 'default-value';
      });

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result.expiresIn).toBe('1h');
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '1h' }),
      );
      expect(signAsyncSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });

    it('should include all required fields in token response', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: '7d',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          lastSyncAt: mockUser.lastSyncAt,
        },
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle ConfigService returning undefined values', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockResolvedValue('mock-token');
      configGetSpy.mockImplementation((key: string, defaultValue?: string) => {
        // 模拟所有config值都是undefined，使用默认值
        return defaultValue;
      });

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe('7d'); // Default fallback value
    });

    it('should handle JwtService.signAsync failures', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue(mockUser);
      generateIVSpy.mockReturnValue('mock-iv');
      mockBcryptHash.mockResolvedValue('hashed-password');
      signAsyncSpy.mockRejectedValue(new Error('JWT signing failed'));
      configGetSpy.mockImplementation(
        (key: string) =>
          mockConfig[key as keyof typeof mockConfig] || 'default-value',
      );

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        'JWT signing failed',
      );
    });

    it('should handle CryptoService.generateIV failures', async () => {
      // Arrange
      findUniqueSpy.mockResolvedValue(null);
      generateIVSpy.mockImplementation(() => {
        throw new Error('IV generation failed');
      });

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        'IV generation failed',
      );
    });
  });
});
