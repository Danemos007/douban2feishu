# 豆瓣飞书同步助手 (D2F) - 后端服务

## 项目简介

D2F (Douban to Feishu) 是一个企业级的豆瓣到飞书多维表格同步助手后端服务。基于 NestJS 框架构建，采用三层加密安全架构，支持异步任务队列和实时 WebSocket 更新。

## 技术架构

### 核心技术栈
- **运行时**: Node.js 20 LTS
- **框架**: NestJS (TypeScript)
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma
- **任务队列**: BullMQ
- **认证**: JWT + Passport.js
- **API文档**: Swagger/OpenAPI

### 安全特性
- 🔒 三层加密架构 (HTTPS + AES-256-GCM + PostgreSQL TDE)
- 🔐 JWT 双重认证 (Access Token + Refresh Token)
- 🛡️ Helmet 安全头部防护
- 🚦 限流保护 (Throttling)
- 📝 敏感信息加密存储

### 业务特性
- 📚 豆瓣数据抓取 (反爬虫策略)
- 📊 飞书多维表格 API 集成
- 🚀 异步任务队列处理
- 📡 WebSocket 实时更新
- ⚙️ 灵活的同步配置管理

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库和密钥
```

### 3. 数据库设置
```bash
npm run db:generate
npm run db:push
```

### 4. 启动服务
```bash
npm run start:dev
```

### 5. 验证安装
- 服务状态: http://localhost:3001
- API文档: http://localhost:3001/api/docs

## 核心功能模块

### 🔐 认证系统 (Auth Module)
- JWT双重认证机制
- Passport.js策略集成
- 密码安全哈希存储
- Token自动刷新

### ⚙️ 配置管理 (Config Module)
- 敏感信息AES-256-GCM加密
- 豆瓣Cookie安全存储
- 飞书API凭证管理
- 同步偏好配置

### 🔄 同步引擎 (Sync Module)
- BullMQ异步任务队列
- WebSocket实时进度推送
- 智能错误重试机制
- 批量数据处理

### 📚 豆瓣集成 (Douban Module)
- 反爬虫策略实现
- 智能请求频率控制
- 人机验证检测
- 多分类数据抓取

### 📊 飞书集成 (Feishu Module)
- 多维表格API封装
- 批量记录创建/更新
- 字段映射管理
- API限流处理

## 项目结构

```
backend/
├── src/
│   ├── auth/           # 认证模块
│   ├── common/         # 公共模块
│   │   ├── crypto/     # 加密服务
│   │   └── prisma/     # 数据库服务
│   ├── config/         # 配置模块
│   ├── sync/           # 同步模块
│   ├── douban/         # 豆瓣模块
│   ├── feishu/         # 飞书模块
│   └── main.ts         # 启动文件
├── prisma/
│   └── schema.prisma   # 数据库模式
└── .env.example        # 环境变量示例
```

## 开发命令

```bash
# 开发
npm run start:dev      # 开发模式
npm run start:debug    # 调试模式

# 构建
npm run build         # 构建项目
npm run start:prod    # 生产模式

# 代码质量
npm run lint          # 代码检查
npm run format        # 代码格式化
npm test              # 运行测试

# 数据库
npm run db:generate   # 生成Prisma客户端
npm run db:push       # 推送数据库结构
npm run db:migrate    # 运行数据库迁移
npm run db:studio     # Prisma Studio
```

## 环境变量配置

### 必需配置
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/d2f_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
MASTER_ENCRYPTION_KEY="your-256-bit-encryption-key"
```

### 可选配置
```bash
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL="info"
```

## API文档

启动服务后访问 `/api/docs` 查看完整的 Swagger API 文档。

### 主要端点

**认证相关**
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新Token

**配置管理**
- `GET /api/config` - 获取用户配置
- `PUT /api/config/douban` - 更新豆瓣配置
- `PUT /api/config/feishu` - 更新飞书配置

**同步操作**
- `POST /api/sync/trigger` - 触发同步
- `GET /api/sync/history` - 同步历史
- `WS /sync` - 实时状态更新

## 安全特性

### 三层加密架构
1. **传输层**: HTTPS + API认证
2. **应用层**: AES-256-GCM敏感数据加密
3. **存储层**: PostgreSQL透明数据加密

### 认证机制
- JWT访问令牌 (短期有效)
- 刷新令牌 (长期有效)
- Passport.js策略验证
- bcrypt密码哈希

### 安全防护
- Helmet安全头部
- CORS跨域限制
- 限流保护
- 输入验证和清理

## 部署指南

### Docker部署
```bash
npm run docker:build
npm run docker:run
```

### 生产环境
1. 设置环境变量
2. 运行数据库迁移
3. 构建应用: `npm run build`
4. 启动服务: `npm run start:prod`

## 故障排除

### 数据库连接问题
- 检查 `DATABASE_URL` 配置
- 确认PostgreSQL服务状态
- 验证数据库访问权限

### Redis连接问题
- 检查 `REDIS_URL` 配置
- 确认Redis服务状态
- 测试网络连接

### 加密相关问题
- 验证 `MASTER_ENCRYPTION_KEY` 长度
- 检查密钥格式正确性

## 许可证

MIT License

## 技术债务 (Technical Debt)

### TD-001: TypeScript装饰器版本兼容性问题

**问题描述**：
- TypeScript 5.4.5与NestJS装饰器存在兼容性问题
- `tsc --noEmit` 编译检查显示装饰器语法错误
- Jest测试环境正常运行，但TypeScript编译器报错

**影响范围**：
- 开发体验：IDE可能显示错误提示
- CI/CD：TypeScript编译检查可能失败  
- 代码质量：编译时类型检查不完整

**临时决策**：
- 保持TypeScript 5.4.5版本锁定，确保NestJS装饰器正常工作
- 使用Jest + ts-jest进行测试，绕过装饰器编译问题
- 暂时接受`tsc --noEmit`检查失败

**偿还计划**：
- **短期** (1-2周)：关注NestJS和TypeScript版本更新，寻找兼容版本
- **中期** (1个月)：尝试升级到更新的兼容版本组合
- **长期** (持续)：建立依赖版本管理策略，避免类似问题

**负责人**: 架构师团队  
**创建时间**: 2025-08-29  
**预期解决**: 2025-09-30

---

基于CLAUDE.md技术架构设计，遵循企业级开发标准构建。