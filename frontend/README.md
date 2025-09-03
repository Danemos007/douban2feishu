# 豆瓣飞书同步助手 (D2F) - Frontend

这是豆瓣飞书同步助手的前端项目，基于 Next.js 14 App Router 构建。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS + CSS Modules
- **状态管理**: Zustand
- **API请求**: Axios + React Query
- **UI组件**: Radix UI (无样式组件库)

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx          # 首页
│   └── globals.css       # 全局样式
├── components/           # React 组件
│   ├── ui/              # 基础UI组件
│   ├── layout/          # 布局组件
│   └── features/        # 功能组件
├── lib/                 # 工具库
│   ├── utils.ts         # 通用工具函数
│   ├── api.ts           # API客户端配置
│   ├── query-client.tsx # React Query配置
│   └── hooks/           # 自定义Hooks
│       └── useApi.ts    # API相关Hooks
├── store/               # Zustand状态管理
│   └── index.ts         # 主要状态存储
├── types/               # TypeScript类型定义
│   └── index.ts         # 核心类型
└── styles/              # 样式文件
```

## 开发环境

### 系统要求

- Node.js 20 LTS 或更高版本
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

### 构建

```bash
npm run build
```

### 其他命令

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix

# 代码格式化
npm run format

# 代码格式检查
npm run format:check

# 完整的预提交检查
npm run pre-commit
```

## 环境变量

复制 `.env.example` 到 `.env.local` 并配置以下变量：

```bash
# API 基础URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api

# 应用设置
NEXT_PUBLIC_APP_NAME="豆瓣飞书同步助手"
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 设计系统

### 品牌色彩

- **豆瓣绿**: `#15E841` (douban-green)
- **飞书蓝**: `#0471F7` (feishu-blue)
- **基于shadcn/ui的设计系统色彩**

### 自定义样式类

```css
/* 渐变背景 */
.d2f-gradient-bg

/* 主要按钮样式 */
.d2f-button-primary

/* 卡片样式 */
.d2f-card
```

## 状态管理

使用 Zustand 进行状态管理，分为三个主要store：

- **AuthStore**: 用户认证状态
- **SyncStore**: 同步相关状态
- **UIStore**: 界面状态

## API集成

使用 React Query 进行API状态管理：

- 自动缓存和重新验证
- 错误处理和重试逻辑
- 实时数据同步
- 优化的加载状态

## 组件开发

### 基础组件

基于 Radix UI 构建，确保:
- 无障碍访问性 (a11y)
- 键盘导航支持
- 主题适配

### 功能组件

- 响应式设计 (移动端优先)
- TypeScript 严格类型
- 性能优化 (React.memo, useMemo)

## 代码规范

- 使用 TypeScript 严格模式
- ESLint + Prettier 代码格式化
- 函数式编程优先
- 组件化和模块化设计

## 性能优化

- Next.js 图片优化
- 代码分割和懒加载
- Bundle 分析和优化
- React Query 缓存策略

## 部署

项目使用 Next.js 静态站点生成 (SSG)，可部署到:

- Vercel (推荐)
- Netlify
- 静态文件服务器

## 浏览器支持

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 开发注意事项

1. 确保所有新组件都有正确的 TypeScript 类型
2. 使用 React Query 处理所有API请求
3. 遵循 Tailwind CSS 实用工具优先的方法
4. 保持组件职责单一
5. 实现适当的错误边界处理

## 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [React Query 文档](https://tanstack.com/query)
- [Zustand 文档](https://zustand-demo.pmnd.rs)
- [Radix UI 文档](https://radix-ui.com)
