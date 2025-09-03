import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/lib/query-client";

export const metadata: Metadata = {
  title: "豆瓣飞书同步助手 - D2F",
  description: "将豆瓣书影音数据同步到飞书多维表格，提升个人数据管理效率",
  keywords: ["豆瓣", "飞书", "数据同步", "书影音管理", "多维表格"],
  authors: [{ name: "D2F Team" }],
  creator: "D2F Team",
  publisher: "D2F",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://d2f.app",
    siteName: "豆瓣飞书同步助手",
    title: "豆瓣飞书同步助手 - 高效管理你的书影音数据",
    description: "将豆瓣书影音数据同步到飞书多维表格，解决豆瓣原生数据管理功能僵化、孤立的问题",
  },
  twitter: {
    card: "summary_large_image",
    title: "豆瓣飞书同步助手 - D2F",
    description: "将豆瓣书影音数据同步到飞书多维表格",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
