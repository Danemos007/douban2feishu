import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';
import { AuthenticatedUser, JwtPayload } from '../interfaces/auth.interface';

type StrategyOptions = {
  jwtFromRequest: unknown;
  ignoreExpiration: boolean;
  secretOrKey: string;
  algorithms: string[];
};

type StrategyConstructorArgs = [StrategyOptions, unknown];

type StrategyMock = jest.Mock<void, StrategyConstructorArgs>;

type ExtractorMock = jest.Mock<string, []>;

type PassportJwtMockModule = {
  Strategy: StrategyMock;
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: ExtractorMock;
  };
};

jest.mock('passport', () => ({
  use: jest.fn(),
}));

jest.mock('passport-jwt', () => {
  const strategyMock = jest
    .fn<void, StrategyConstructorArgs>()
    .mockImplementation(function Strategy(this: { name?: string }) {
      this.name = 'jwt-mock-strategy';
    });

  const extractorMock = jest
    .fn<string, []>()
    .mockReturnValue('mock-bearer-extractor');

  return {
    Strategy: strategyMock,
    ExtractJwt: {
      fromAuthHeaderAsBearerToken: extractorMock,
    },
  } satisfies PassportJwtMockModule;
});

const passportJwtMock = jest.requireMock(
  'passport-jwt',
) as unknown as PassportJwtMockModule;

const strategyConstructorSpy = passportJwtMock.Strategy;
const mockFromAuthHeaderAsBearerToken =
  passportJwtMock.ExtractJwt.fromAuthHeaderAsBearerToken;

type AuthServiceMock = {
  validateJwtPayload: jest.Mock<
    Promise<AuthenticatedUser | null>,
    [JwtPayload]
  >;
};

type ConfigServiceMock = {
  get: jest.Mock<string | undefined, [string]>;
};

const createdModules: TestingModule[] = [];

const createStrategy = async (
  secretOverride?: string,
): Promise<{
  strategy: JwtStrategy;
  authServiceMock: AuthServiceMock;
  configServiceMock: ConfigServiceMock;
}> => {
  const authServiceMock: AuthServiceMock = {
    validateJwtPayload: jest.fn<
      Promise<AuthenticatedUser | null>,
      [JwtPayload]
    >(),
  };

  const configServiceMock: ConfigServiceMock = {
    get: jest
      .fn<string | undefined, [string]>()
      .mockReturnValue(secretOverride),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      JwtStrategy,
      { provide: AuthService, useValue: authServiceMock },
      { provide: ConfigService, useValue: configServiceMock },
    ],
  }).compile();

  createdModules.push(moduleRef);

  return {
    strategy: moduleRef.get(JwtStrategy),
    authServiceMock,
    configServiceMock,
  };
};

describe('JwtStrategy', () => {
  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    lastSyncAt: null,
  };

  const validPayload: JwtPayload = {
    sub: mockUser.id,
    email: mockUser.email,
    iat: 1_706_061_200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFromAuthHeaderAsBearerToken.mockReturnValue('mock-bearer-extractor');
  });

  afterEach(async () => {
    await Promise.all(
      createdModules.splice(0).map((moduleRef) => moduleRef.close()),
    );
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('pulls JWT secret via ConfigService.get when defined', async () => {
      const customSecret = 'secure-secret';
      const { configServiceMock } = await createStrategy(customSecret);

      expect(configServiceMock.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(strategyConstructorSpy).toHaveBeenCalledTimes(1);

      const [options] = strategyConstructorSpy.mock.calls[0];
      expect(options.secretOrKey).toBe(customSecret);
    });

    it('falls back to default secret when ConfigService returns undefined', async () => {
      const { configServiceMock } = await createStrategy(undefined);

      expect(configServiceMock.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(strategyConstructorSpy).toHaveBeenCalledTimes(1);

      const [options] = strategyConstructorSpy.mock.calls[0];
      expect(options.secretOrKey).toBe('default-secret-key-for-development');
    });

    it('configures Passport Strategy with the expected extractor and algorithm settings', async () => {
      await createStrategy('another-secret');

      expect(mockFromAuthHeaderAsBearerToken).toHaveBeenCalledTimes(1);
      expect(strategyConstructorSpy).toHaveBeenCalledTimes(1);

      const [options, verify] = strategyConstructorSpy.mock.calls[0];
      expect(options).toMatchObject({
        jwtFromRequest: 'mock-bearer-extractor',
        ignoreExpiration: false,
        algorithms: ['HS256'],
      });
      expect(typeof verify).toBe('function');
    });
  });

  describe('validate', () => {
    it('returns the authenticated user when AuthService resolves successfully', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateJwtPayload.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(authServiceMock.validateJwtPayload).toHaveBeenCalledWith(
        validPayload,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException with "User not found or deactivated" when user is not found', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateJwtPayload.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        new UnauthorizedException('User not found or deactivated'),
      );

      expect(authServiceMock.validateJwtPayload).toHaveBeenCalledWith(
        validPayload,
      );
    });

    it('should throw UnauthorizedException with "Invalid or expired token" when AuthService rejects', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateJwtPayload.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );

      expect(authServiceMock.validateJwtPayload).toHaveBeenCalledWith(
        validPayload,
      );
    });

    it('handles malformed payloads by propagating UnauthorizedException with the correct message', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      const malformedPayload = {
        email: validPayload.email,
        iat: validPayload.iat,
      } as unknown as JwtPayload;

      authServiceMock.validateJwtPayload.mockRejectedValue(
        new Error('Missing subject identifier'),
      );

      await expect(strategy.validate(malformedPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );

      expect(authServiceMock.validateJwtPayload).toHaveBeenCalledWith(
        malformedPayload,
      );
    });
  });
});
