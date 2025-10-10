/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/index.ts',
    '!**/__fixtures__/**',
    '!**/__test-types__/**',
    '!**/test/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules/', '\\.js$'],

  // 覆盖率阈值配置 - 渐进式策略
  coverageThreshold: {
    // 全局基线阈值（当前项目基线，防止倒退）
    global: {
      statements: 74,
      branches: 63,
      functions: 67,
      lines: 74,
    },

    // 文件级精准阈值 - 锁定高质量文件
    // Schema文件（数据模型验证层）- 100%覆盖率锁定
    '**/douban/contract/transformation.schema.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/douban/dto/douban.dto.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/feishu/dto/feishu.dto.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/feishu/schemas/field.schema.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/feishu/schemas/field-mapping.schema.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/feishu/schemas/field-operations.schema.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/feishu/schemas/field-creation.schema.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },

    // 核心服务层 - 高覆盖率锁定
    '**/redis/redis.service.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/douban/services/anti-spider.service.ts': {
      statements: 98,
      branches: 93,
      functions: 94,
      lines: 98,
    },
    '**/feishu/services/field-auto-creation.service.ts': {
      statements: 100,
      branches: 90,
      functions: 100,
      lines: 100,
    },
    '**/sync/sync.controller.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    '**/sync/sync.service.ts': {
      statements: 93,
      branches: 75,
      functions: 100,
      lines: 93,
    },
    '**/sync/sync.processor.ts': {
      statements: 92,
      branches: 90,
      functions: 70,
      lines: 94,
    },
  },
};
