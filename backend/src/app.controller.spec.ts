import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'NODE_ENV') return 'test';
              return defaultValue;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return welcome information', () => {
      const result = appController.getWelcome();
      expect(result).toBeDefined();
      expect(result.name).toBe('豆瓣飞书同步助手 (D2F)');
      expect(result.description).toBe('Douban to Feishu Sync Assistant - Backend API');
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.features).toBeInstanceOf(Array);
      expect(result.features).toHaveLength(6);
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const result = await appController.getHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBe('healthy');
      expect(result.memory).toBeDefined();
    });
  });

  describe('version info', () => {
    it('should return version information', () => {
      const result = appController.getVersion();
      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.buildTime).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.environment).toBe('test');
    });
  });
});
