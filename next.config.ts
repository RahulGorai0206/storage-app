import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: isProd ? "export" : undefined,
  assetPrefix: isProd ? "./" : undefined,
  trailingSlash: isProd ? true : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
