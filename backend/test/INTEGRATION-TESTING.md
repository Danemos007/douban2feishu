# 集成测试指南

## 概述

本项目实现了集成测试体系，用于验证核心业务流程的完整性。集成测试模拟真实用户操作，覆盖从API请求到数据持久化的完整链路。

## 测试架构

### 技术栈
- **测试框架**: Jest + Supertest
- **应用框架**: NestJS Testing Module
- **数据库**: PostgreSQL (测试数据库)
- **缓存**: Redis (测试DB)

### 测试范围

#### 1. API集成测试
文件: `test/sync-api.integration.spec.ts`

**测试定位**: API层面的集成测试，验证各模块协作

**Happy Path测试**:
1. 用户认证流程
2. 同步任务触发
3. 同步状态查询
4. 同步历史记录查询

**Error Handling测试**:
1. 未认证请求拒绝
2. 参数验证
3. 外部服务Mock

#### 2. 基础健康检查
文件: `test/app.e2e-spec.ts`
- 应用启动验证
- 基础路由检查

#### 3. 业务端到端测试
文件: `douban-feishu-flow.e2e.spec.ts` (待实现)

**测试定位**: 真实环境下的完整业务流程验证
- 真实豆瓣API调用（含反爬虫）
- 真实飞书API同步
- 完整数据链路验证
- 业务结果校验

## 运行集成测试

### 本地运行

#### 前置条件
1. PostgreSQL数据库运行中
2. Redis服务运行中
3. 创建`.env.integration`文件（参考`.env.integration.template`）

#### 运行命令
```bash
# 运行所有集成测试
npm run test:integration

# 运行特定测试文件
npm run test:integration -- --testPathPatterns=sync-api.integration

# 运行并查看覆盖率
npm run test:integration -- --coverage
```

### CI环境运行

集成测试在GitHub Actions中自动运行，配置位于 `.github/workflows/ci.yml`。

**触发条件**: Pull Request到main分支

**运行流程**:
1. ✅ 单元测试通过 (`quality-gates` job)
2. 🚀 自动启动集成测试 (`integration-tests` job)
3. 🔧 自动配置PostgreSQL + Redis
4. 🧪 运行集成测试套件
5. 📊 上传测试结果artifacts

## 环境配置

### 端口配置说明

**重要**: 本地测试环境和CI环境使用不同的端口配置，以保证测试环境的绝对隔离：

| 环境 | PostgreSQL端口 | Redis端口 | 原因 |
|------|---------------|----------|------|
| **本地Docker** | 5433 | 6380 | 避免与开发环境的PostgreSQL(5432)和Redis(6379)冲突 |
| **CI环境** | 5432 | 6379 | GitHub Actions容器中使用标准端口 |

**设计原则**:
- ✅ **测试隔离**: 本地测试使用独立的Docker容器和非标准端口，完全不影响开发环境
- ✅ **环境一致**: CI环境使用标准端口，符合行业规范
- ✅ **零干扰**: 开发者可以同时运行开发服务和测试服务，互不影响

**本地启动测试数据库**:
```bash
# 启动Docker测试环境（使用5433和6380端口）
docker-compose -f docker-compose.test.yml up -d

# 验证服务启动
docker-compose -f docker-compose.test.yml ps
```

### 环境变量

集成测试使用独立的环境变量文件 `.env.integration`：

```bash
# 测试环境标识
NODE_ENV=test
IS_INTEGRATION_TEST=true

# Mock模式（CI环境推荐启用）
USE_MOCK_DOUBAN=true
USE_MOCK_FEISHU=true

# 测试用户凭证
INTEGRATION_TEST_EMAIL=integration-test@example.com
INTEGRATION_TEST_PASSWORD=test-password

# 数据库配置（本地使用非标准端口5433/6380）
DATABASE_URL=postgresql://d2f_test_user:d2f_test_password@localhost:5433/d2f_test
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=0

# JWT配置
JWT_SECRET=test-jwt-secret
```

### GitHub Secrets配置

如需在CI中使用真实凭证（不推荐），可配置以下Secrets：

- `INTEGRATION_TEST_EMAIL`: 测试用户邮箱
- `INTEGRATION_TEST_PASSWORD`: 测试用户密码
- `INTEGRATION_DATABASE_URL`: 测试数据库连接串
- `INTEGRATION_JWT_SECRET`: JWT密钥

## Mock策略

### Mock模式

为提高测试稳定性和速度，CI环境默认启用Mock模式：

- **豆瓣Mock** (`USE_MOCK_DOUBAN=true`): 使用静态数据模拟豆瓣API响应
- **飞书Mock** (`USE_MOCK_FEISHU=true`): 使用内存存储模拟飞书表格操作

### 真实环境测试

如需测试真实API集成，设置：

```bash
USE_MOCK_DOUBAN=false
USE_MOCK_FEISHU=false
```

⚠️ **注意**: 真实环境测试依赖外部服务，可能导致测试不稳定。

## 测试编写指南

### 测试结构

```typescript
describe('业务流程名称 (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // 初始化NestJS应用
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Happy Path', () => {
    it('[Step 1] 应该...', async () => {
      const response = await request(app.getHttpServer())
        .post('/endpoint')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('expectedField');
    });
  });
});
```

### 最佳实践

1. **使用描述性测试名称**: `[Step N] 应该...`格式
2. **测试隔离**: 每个测试用例独立，不依赖执行顺序
3. **适当的超时设置**: 集成测试超时时间设为5分钟
4. **清理资源**: 在`afterAll`中清理数据库、连接等
5. **Mock外部依赖**: CI环境优先使用Mock模式

## 故障排查

### 常见问题

#### 1. 数据库连接失败
```
Error: connect ECONNREFUSED
```
**解决方案**: 确保PostgreSQL运行中，检查`DATABASE_URL`配置

#### 2. Redis连接失败
```
Error: Redis connection refused
```
**解决方案**: 确保Redis运行中，检查`REDIS_HOST`和`REDIS_PORT`

#### 3. 认证失败
```
Error: Unauthorized
```
**解决方案**: 检查`.env.integration`中的`INTEGRATION_TEST_EMAIL`和`INTEGRATION_TEST_PASSWORD`

#### 4. 测试超时
```
Error: Timeout - Async callback was not invoked
```
**解决方案**:
- 检查网络连接
- 启用Mock模式 (`USE_MOCK_DOUBAN=true`)
- 增加超时时间（已默认设为5分钟）

## CI集成详情

### 工作流配置

位置: `.github/workflows/ci.yml`

```yaml
integration-tests:
  name: Integration Tests
  runs-on: ubuntu-latest
  needs: quality-gates  # 依赖单元测试通过

  steps:
    - Setup PostgreSQL      # 自动配置测试数据库
    - Setup Redis           # 自动配置缓存
    - Run Integration tests # 执行测试
    - Upload results        # 上传测试结果
```

### 并行执行

集成测试作为独立job并行运行，不阻塞单元测试：

```
┌─────────────────┐
│ quality-gates   │ (单元测试)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│integration-tests│ (集成测试)
└─────────────────┘
```

## 调试指南 (Debugging Guide)

### 问题：为什么在 `npm run test:integration` 的输出中，看不到 `this.logger.log()` 的日志？

这是Jest测试环境的**预期行为**。为了保持测试报告的简洁，Jest默认会过滤掉由NestJS的Logger模块产生的`LOG`, `DEBUG`, `VERBOSE`级别的日志输出，**只显示`ERROR`和`WARN`级别**。

如果你在调试时需要查看这些被隐藏的日志，可以使用以下两种方法：

#### 方法1：显示所有日志 (全局)

运行测试时，添加 `--verbose` 标志。这会告诉Jest不要过滤任何日志，将所有级别的日志都打印出来。

```bash
npm run test:integration -- --verbose
```

**适用场景**：当你需要全面了解测试运行期间发生了什么，进行大范围排查时。

#### 方法2：定点打印日志 (局部)

在你需要调试的代码位置，临时使用 `console.log()` 代替 `this.logger.log()`。Jest不会过滤标准的 `console.log` 输出。

```typescript
// 临时添加用于调试
console.log('[DEBUG] My variable is:', myVariable);
```

**适用场景**：当你只需要查看某个特定变量的值，或者验证某段代码是否被执行时。

> ‼️ **重要警告**：`console.log` 是一种"代码污染"，它只应该作为临时的调试工具。在最终提交代码前，**必须将所有用于调试的 `console.log` 语句全部移除**！

### Logger配置说明

如果你在编写E2E测试或集成测试，确保在创建测试应用时配置了正确的logger级别：

```typescript
// ✅ 正确：配置完整的logger级别
const app = moduleFixture.createNestApplication({
  logger: ['error', 'warn', 'log', 'debug', 'verbose'],
});

// ❌ 错误：未配置logger（默认只有error和warn）
const app = moduleFixture.createNestApplication();
```

这样配置后，在生产环境中，NestJS的Logger会正常输出所有级别的日志。在测试环境中，虽然Jest仍会过滤LOG级别的输出，但你可以使用上述方法查看它们。

---

## 参考资料

- [NestJS Testing文档](https://docs.nestjs.com/fundamentals/testing)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Jest配置文档](https://jestjs.io/docs/configuration)
