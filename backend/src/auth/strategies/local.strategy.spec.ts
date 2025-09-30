import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../interfaces/auth.interface';

type StrategyOptions = {
  usernameField: string;
  passwordField: string;
};

type StrategyConstructorArgs = [StrategyOptions];

type StrategyMock = jest.Mock<void, StrategyConstructorArgs>;

type PassportLocalMockModule = {
  Strategy: StrategyMock;
};

jest.mock('passport', () => ({
  use: jest.fn(),
}));

jest.mock('passport-local', () => {
  const strategyMock = jest
    .fn<void, StrategyConstructorArgs>()
    .mockImplementation(function Strategy(this: { name?: string }) {
      this.name = 'local-mock-strategy';
    });

  return {
    Strategy: strategyMock,
  } satisfies PassportLocalMockModule;
});

const passportLocalMock = jest.requireMock(
  'passport-local',
) as unknown as PassportLocalMockModule;

const strategyConstructorSpy = passportLocalMock.Strategy;

type AuthServiceMock = {
  validateUser: jest.Mock<Promise<AuthenticatedUser | null>, [string, string]>;
};

const createdModules: TestingModule[] = [];

const createStrategy = async (): Promise<{
  strategy: LocalStrategy;
  authServiceMock: AuthServiceMock;
}> => {
  const authServiceMock: AuthServiceMock = {
    validateUser: jest.fn<
      Promise<AuthenticatedUser | null>,
      [string, string]
    >(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      LocalStrategy,
      { provide: AuthService, useValue: authServiceMock },
    ],
  }).compile();

  createdModules.push(moduleRef);

  return {
    strategy: moduleRef.get(LocalStrategy),
    authServiceMock,
  };
};

describe('LocalStrategy', () => {
  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    lastSyncAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      createdModules.splice(0).map((moduleRef) => moduleRef.close()),
    );
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should configure Passport Strategy with email as usernameField', async () => {
      await createStrategy();

      expect(strategyConstructorSpy).toHaveBeenCalledTimes(1);

      const [options] = strategyConstructorSpy.mock.calls[0];
      expect(options.usernameField).toBe('email');
    });

    it('should configure Passport Strategy with password as passwordField', async () => {
      await createStrategy();

      expect(strategyConstructorSpy).toHaveBeenCalledTimes(1);

      const [options] = strategyConstructorSpy.mock.calls[0];
      expect(options.passwordField).toBe('password');
    });
  });

  describe('validate', () => {
    it('should return authenticated user when AuthService validates successfully', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('user@example.com', 'password123');

      expect(authServiceMock.validateUser).toHaveBeenCalledWith(
        'user@example.com',
        'password123',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is not found (validateUser returns null)', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(authServiceMock.validateUser).toHaveBeenCalledWith(
        'nonexistent@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when user is not found (validateUser returns undefined)', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateUser.mockResolvedValue(
        undefined as unknown as null,
      );

      await expect(
        strategy.validate('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(authServiceMock.validateUser).toHaveBeenCalledWith(
        'nonexistent@example.com',
        'password123',
      );
    });

    it('should propagate the original error when AuthService rejects with a database error', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      const databaseError = new Error('Database connection timeout');
      authServiceMock.validateUser.mockRejectedValue(databaseError);

      await expect(
        strategy.validate('user@example.com', 'password123'),
      ).rejects.toThrow(databaseError);

      expect(authServiceMock.validateUser).toHaveBeenCalledWith(
        'user@example.com',
        'password123',
      );
    });

    it('should call AuthService.validateUser with correct email and password parameters', async () => {
      const { strategy, authServiceMock } = await createStrategy();
      authServiceMock.validateUser.mockResolvedValue(mockUser);

      const testEmail = 'test@example.com';
      const testPassword = 'testPassword456';

      await strategy.validate(testEmail, testPassword);

      expect(authServiceMock.validateUser).toHaveBeenCalledTimes(1);
      expect(authServiceMock.validateUser).toHaveBeenCalledWith(
        testEmail,
        testPassword,
      );
    });
  });
});
