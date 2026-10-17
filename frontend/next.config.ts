import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 内の E2E コンテナ(Playwright)は http://frontend:3000 でアクセスする。
  // 開発サーバーは localhost 以外からの開発用リソース取得を既定で遮断するため許可する
  allowedDevOrigins: ["frontend", "frontend-e2e"],
  // E2E 用フロントは別の出力先を使い、開発用の .next と衝突させない
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
