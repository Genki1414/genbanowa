import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 開発環境によっては親ディレクトリに別のpackage-lock.jsonがあり、
  // Turbopackがワークスペースルートを誤認識することがある（ネストの深い
  // ルートが解決できず404になる）。プロジェクトルートを明示して固定する。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
