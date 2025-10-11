# E2E测试指南

## 概述

本项目实现了端到端（E2E）测试体系，用于验证核心业务流程的完整性。E2E测试模拟真实用户操作，覆盖从API请求到数据持久化的完整链路。

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
文件: `test/douban-feishu-e2e.spec.ts` (待实现)

**测试定位**: 真实环境下的完整业务流程验证
- 真实豆瓣API调用（含反爬虫）
- 真实飞书API同步
- 完整数据链路验证
- 业务结果校验

## 运行E2E测试

### 本地运行

#### 前置条件
1. PostgreSQL数据库运行中
2. Redis服务运行中
3. 创建`.env.e2e`文件（参考`.env.e2e.template`）

#### 运行命令
```bash
# 运行所有E2E测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- --testPathPattern=sync-api.integration

# 运行并查看覆盖率
npm run test:e2e -- --coverage
```

### CI环境运行

E2E测试在GitHub Actions中自动运行，配置位于 `.github/workflows/ci.yml`。

**触发条件**: Pull Request到main分支

**运行流程**:
1. ✅ 单元测试通过 (`quality-gates` job)
2. 🚀 自动启动E2E测试 (`e2e-tests` job)
3. 🔧 自动配置PostgreSQL + Redis
4. 🧪 运行E2E测试套件
5. 📊 上传测试结果artifacts

## 环境配置

### 环境变量

E2E测试使用独立的环境变量文件 `.env.e2e`：

```bash
# 测试环境标识
NODE_ENV=test
IS_E2E_TEST=true

# Mock模式（CI环境推荐启用）
USE_MOCK_DOUBAN=true
USE_MOCK_FEISHU=true

# 测试用户凭证
E2E_TEST_EMAIL=e2e-test@example.com
E2E_TEST_PASSWORD=test-password

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/d2f_test
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# JWT配置
JWT_SECRET=test-jwt-secret
```

### GitHub Secrets配置

如需在CI中使用真实凭证（不推荐），可配置以下Secrets：

- `E2E_TEST_EMAIL`: 测试用户邮箱
- `E2E_TEST_PASSWORD`: 测试用户密码
- `E2E_DATABASE_URL`: 测试数据库连接串
- `E2E_JWT_SECRET`: JWT密钥

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
describe('业务流程名称 (E2E)', () => {
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
3. **适当的超时设置**: E2E测试超时时间设为5分钟
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
**解决方案**: 检查`.env.e2e`中的`E2E_TEST_EMAIL`和`E2E_TEST_PASSWORD`

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
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: quality-gates  # 依赖单元测试通过

  steps:
    - Setup PostgreSQL  # 自动配置测试数据库
    - Setup Redis       # 自动配置缓存
    - Run E2E tests     # 执行测试
    - Upload results    # 上传测试结果
```

### 并行执行

E2E测试作为独立job并行运行，不阻塞单元测试：

```
┌─────────────┐
│ quality-gates│ (单元测试)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  e2e-tests  │ (E2E测试)
└─────────────┘
```

## 参考资料

- [NestJS Testing文档](https://docs.nestjs.com/fundamentals/testing)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Jest配置文档](https://jestjs.io/docs/configuration)
