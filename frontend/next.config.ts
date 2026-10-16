import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 内の E2E コンテナ(Playwright)は http://frontend:3000 でアクセスする。
  // 開発サーバーは localhost 以外からの開発用リソース取得を既定で遮断するため許可する
  allowedDevOrigins: ["frontend"],
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
