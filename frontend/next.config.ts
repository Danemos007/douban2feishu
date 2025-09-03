import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type checking is performed separately by TypeScript CLI in CI/CD
    ignoreBuildErrors: false,
  },
  experimental: {
    // Enable modern bundling optimizations
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  images: {
    domains: [
      "img9.doubanio.com", // Douban book covers
      "img1.doubanio.com", // Douban movie posters
      "img3.doubanio.com", // Douban music covers
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: "豆瓣飞书同步助手",
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },
};

export default nextConfig;
