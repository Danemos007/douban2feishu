export default function Home() {
  return (
    <div className="d2f-gradient-bg flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-douban-green to-feishu-blue"></div>
              <h1 className="text-xl font-semibold">豆瓣飞书同步助手</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">Debug Mode</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
              高效管理你的
              <span className="bg-gradient-to-r from-douban-green to-feishu-blue bg-clip-text text-transparent">
                书影音数据
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              将豆瓣书影音数据同步到飞书多维表格，解决豆瓣原生数据管理功能僵化、孤立的问题。
              让你的个人收藏数据发挥更大价值。
            </p>
            <div className="mt-10">
              <button className="d2f-button-primary text-lg">
                开始同步数据
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-20 grid gap-8 md:grid-cols-3">
            <div className="d2f-card p-6">
              <div className="mb-4 h-12 w-12 rounded-lg bg-douban-green/10 p-3">
                <div className="h-full w-full rounded bg-douban-green"></div>
              </div>
              <h3 className="text-xl font-semibold text-foreground">豆瓣配置</h3>
              <p className="mt-2 text-muted-foreground">
                安全配置豆瓣Cookie，获取你的个人书影音数据
              </p>
            </div>

            <div className="d2f-card p-6">
              <div className="mb-4 h-12 w-12 rounded-lg bg-feishu-blue/10 p-3">
                <div className="h-full w-full rounded bg-feishu-blue"></div>
              </div>
              <h3 className="text-xl font-semibold text-foreground">飞书配置</h3>
              <p className="mt-2 text-muted-foreground">
                连接飞书应用，创建专属的多维表格
              </p>
            </div>

            <div className="d2f-card p-6">
              <div className="mb-4 h-12 w-12 rounded-lg bg-gradient-to-r from-douban-green/20 to-feishu-blue/20 p-3">
                <div className="h-full w-full rounded bg-gradient-to-r from-douban-green to-feishu-blue"></div>
              </div>
              <h3 className="text-xl font-semibold text-foreground">智能同步</h3>
              <p className="mt-2 text-muted-foreground">
                自动识别数据更新，增量同步保持数据最新
              </p>
            </div>
          </div>

          {/* Status Card */}
          <div className="mt-12">
            <div className="d2f-card mx-auto max-w-md p-6 text-center">
              <h3 className="text-lg font-medium text-foreground">系统状态</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                准备就绪，等待配置
              </p>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 w-0 rounded-full bg-gradient-to-r from-douban-green to-feishu-blue transition-all duration-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              本项目遵循开源协议，仅用于个人数据管理学习交流。
              使用前请确保遵守豆瓣和飞书的相关服务条款。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
