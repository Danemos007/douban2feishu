import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
// import * as bcrypt from 'bcryptjs'; // 预留未来密码验证功能

import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { RegisterDto } from './dto/auth.dto';
import { JwtPayload, AuthenticatedUser } from './interfaces/auth.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let cryptoService: CryptoService;

  // Mock data
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const findUniqueMock = jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(null);
      const createMock = jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser);
      jest.spyOn(cryptoService, 'generateIV').mockReturnValue('mock-iv');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('mock-token');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '7d',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '30d',
        };
        return config[key] || 'default-value';
      });

      // Act
      const result = await authService.register(mockRegisterDto);

      // Assert
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateUser(
        'test@example.com',
        'password',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.email).toBe(mockUser.email);
    });

    it('should return null if user not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await authService.validateUser(
        'nonexistent@example.com',
        'password',
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should generate tokens for authenticated user', async () => {
      // Arrange
      const authenticatedUser: AuthenticatedUser = {
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        lastSyncAt: mockUser.lastSyncAt,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('mock-token');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '7d',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '30d',
        };
        return config[key] || 'default-value';
      });

      // Act
      const result = await authService.login(authenticatedUser);

      // Assert
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const authenticatedUser: AuthenticatedUser = {
        id: 'nonexistent-user',
        email: 'test@example.com',
        createdAt: new Date(),
        lastSyncAt: null,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(authenticatedUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      // Arrange
      jest.spyOn(jwtService, 'verify').mockReturnValue(mockJwtPayload);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('new-token');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '7d',
          JWT_REFRESH_EXPIRES_IN: '30d',
        };
        return config[key] || 'default-value';
      });

      // Act
      const result = await authService.refreshToken('valid-refresh-token');

      // Assert
      expect(result).toHaveProperty('accessToken', 'new-token');
      expect(result).toHaveProperty('refreshToken', 'new-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const mockVerify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });
      jest.spyOn(jwtService, 'verify').mockImplementation(mockVerify);

      // Act & Assert
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const mockVerifyReturn = jest.fn().mockReturnValue(mockJwtPayload);
      jest.spyOn(jwtService, 'verify').mockImplementation(mockVerifyReturn);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user for valid JWT payload', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateJwtPayload(mockJwtPayload);

      // Assert
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.validateJwtPayload(mockJwtPayload),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
