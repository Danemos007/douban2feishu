/**
 * Jest配置 - 端到端集成测试
 * 
 * 企业级测试配置，支持:
 * - TypeScript编译
 * - 环境变量加载
 * - 测试隔离和清理
 * - 详细的测试报告
 * 
 * @author Claude (Senior Software Architect)
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/test/**/*.e2e-spec.ts',
    '**/integration-tests/**/*.spec.ts',
    '**/integration-tests/**/*.test.ts'
  ],
  
  // TypeScript支持
  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  
  // 测试设置
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  
  // 收集覆盖率
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
    '!src/integration-tests/**',
  ],
  
  // 覆盖率报告
  coverageDirectory: 'coverage-e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 测试超时
  testTimeout: 300000, // 5分钟超时，适合网络请求
  
  // 详细输出
  verbose: true,
  
  // 简化的测试结果报告
  reporters: ['default'],
  
  // 内存管理
  maxWorkers: 1, // 单线程执行，避免Redis连接冲突
  detectOpenHandles: true,
  forceExit: true,
};