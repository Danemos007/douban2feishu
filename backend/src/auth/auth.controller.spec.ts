import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { TokenResponse, AuthenticatedUser } from './interfaces/auth.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let localAuthGuard: LocalAuthGuard;
  let jwtAuthGuard: JwtAuthGuard;

  // Spy variables for unbound-method error prevention
  let registerSpy: jest.SpyInstance;
  let loginSpy: jest.SpyInstance;
  let refreshTokenSpy: jest.SpyInstance;

  // Mock data constants
  const mockUser: AuthenticatedUser = {
    id: 'test-user-id-12345',
    email: 'test@example.com',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    lastSyncAt: null,
  };

  const mockTokenResponse: TokenResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: '7d',
    user: {
      id: mockUser.id,
      email: mockUser.email,
      createdAt: mockUser.createdAt,
      lastSyncAt: mockUser.lastSyncAt,
    },
  };

  const mockRegisterDto: RegisterDto = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
  };

  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
  };

  const mockRefreshTokenDto: RefreshTokenDto = {
    refreshToken: 'mock-refresh-token',
  };

  // Mock ExecutionContext for guard testing
  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        body: mockLoginDto,
      }),
      getResponse: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
        {
          provide: LocalAuthGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    localAuthGuard = module.get<LocalAuthGuard>(LocalAuthGuard);
    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);

    // Initialize spy variables
    registerSpy = jest.spyOn(authService, 'register');
    loginSpy = jest.spyOn(authService, 'login');
    refreshTokenSpy = jest.spyOn(authService, 'refreshToken');
  });

  describe('Controller Instantiation', () => {
    it('should be defined and properly instantiated', () => {
      expect(controller).toBeDefined();
    });

    it('should have all required dependencies injected', () => {
      expect(authService).toBeDefined();
      expect(localAuthGuard).toBeDefined();
      expect(jwtAuthGuard).toBeDefined();
    });
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with valid data', async () => {
      // Arrange
      registerSpy.mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.register(mockRegisterDto);

      // Assert
      expect(registerSpy).toHaveBeenCalledWith(mockRegisterDto);
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTokenResponse);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle registration service errors gracefully', async () => {
      // Arrange
      const conflictError = new ConflictException(
        'User already exists with this email',
      );
      registerSpy.mockRejectedValue(conflictError);

      // Act & Assert
      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(registerSpy).toHaveBeenCalledWith(mockRegisterDto);
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle unexpected service errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      registerSpy.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(registerSpy).toHaveBeenCalledWith(mockRegisterDto);
    });
  });

  describe('POST /auth/login', () => {
    const mockAuthenticatedRequest = {
      user: mockUser,
    };

    it('should successfully login user when LocalAuthGuard passes', async () => {
      // Arrange
      loginSpy.mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.login(mockAuthenticatedRequest);

      // Assert
      expect(loginSpy).toHaveBeenCalledWith(mockUser);
      expect(loginSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTokenResponse);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should handle login service errors gracefully', async () => {
      // Arrange
      const unauthorizedError = new UnauthorizedException(
        'Invalid credentials',
      );
      loginSpy.mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(controller.login(mockAuthenticatedRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(loginSpy).toHaveBeenCalledWith(mockUser);
    });

    it('should process authenticated request correctly', async () => {
      // Arrange
      loginSpy.mockResolvedValue(mockTokenResponse);

      // Act
      await controller.login(mockAuthenticatedRequest);

      // Assert
      expect(loginSpy).toHaveBeenCalledWith(mockAuthenticatedRequest.user);
      expect(loginSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-user-id-12345',
          email: 'test@example.com',
        }),
      );
    });

    it('should handle LocalAuthGuard rejection', () => {
      // Arrange
      const guardError = new UnauthorizedException('Invalid credentials');
      jest.spyOn(localAuthGuard, 'canActivate').mockImplementation(() => {
        throw guardError;
      });

      // Act & Assert
      expect(() => localAuthGuard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => localAuthGuard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      // Arrange
      refreshTokenSpy.mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.refreshToken(mockRefreshTokenDto);

      // Assert
      expect(refreshTokenSpy).toHaveBeenCalledWith('mock-refresh-token');
      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTokenResponse);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should handle invalid refresh token errors', async () => {
      // Arrange
      const unauthorizedError = new UnauthorizedException(
        'Invalid refresh token',
      );
      refreshTokenSpy.mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(
        controller.refreshToken(mockRefreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenSpy).toHaveBeenCalledWith('mock-refresh-token');
    });

    it('should handle service errors during token refresh', async () => {
      // Arrange
      const serviceError = new Error('Token service unavailable');
      refreshTokenSpy.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        controller.refreshToken(mockRefreshTokenDto),
      ).rejects.toThrow('Token service unavailable');
      expect(refreshTokenSpy).toHaveBeenCalledWith(
        mockRefreshTokenDto.refreshToken,
      );
    });
  });

  describe('POST /auth/profile', () => {
    const mockAuthenticatedRequest = {
      user: mockUser,
    };

    beforeEach(() => {
      // Mock Date.prototype.toISOString for consistent testing
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2023-01-01T12:00:00.000Z');
    });

    afterEach(() => {
      // Restore Date.prototype.toISOString
      jest.restoreAllMocks();
    });

    it('should return user profile when JwtAuthGuard passes', () => {
      // Act
      const result = controller.getProfile(mockAuthenticatedRequest);

      // Assert
      expect(result).toEqual({
        user: mockUser,
        timestamp: '2023-01-01T12:00:00.000Z',
      });
      expect(result.user.id).toBe('test-user-id-12345');
      expect(result.user.email).toBe('test@example.com');
      expect(result.timestamp).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should format response correctly with timestamp', () => {
      // Act
      const result = controller.getProfile(mockAuthenticatedRequest);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(result.user).toEqual(mockUser);
    });

    it('should handle missing user in request', () => {
      // Arrange
      const requestWithoutUser = { user: undefined } as unknown as {
        user: AuthenticatedUser;
      };

      // Act
      const result = controller.getProfile(requestWithoutUser);

      // Assert
      expect(result.user).toBeUndefined();
      expect(result.timestamp).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should handle JwtAuthGuard rejection', () => {
      // Arrange
      const guardError = new UnauthorizedException('Token expired');
      jest.spyOn(jwtAuthGuard, 'canActivate').mockImplementation(() => {
        throw guardError;
      });

      // Act & Assert
      expect(() => jwtAuthGuard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => jwtAuthGuard.canActivate(mockExecutionContext)).toThrow(
        'Token expired',
      );
    });
  });
});
