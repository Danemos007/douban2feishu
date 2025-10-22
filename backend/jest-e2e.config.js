/**
 * Jest E2E测试配置
 * 专门用于端到端测试，支持长时运行和Mock模式切换
 */

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  displayName: 'E2E Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e.spec.ts'],

  // 模块路径映射
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),

  // 全局设置和环境变量
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],

  // 超时配置（支持长时运行）- 2分钟用于Mock模式，5分钟用于真实API
  testTimeout: parseInt(process.env.E2E_TIMEOUT_MOCK || '120000'),

  // 覆盖率配置（E2E测试通常不计算覆盖率）
  collectCoverage: false,

  // 并发配置
  maxWorkers: 1, // E2E测试串行执行，避免资源竞争

  // 详细输出
  verbose: true,
};
