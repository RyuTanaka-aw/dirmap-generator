import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/dirmap-generator',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/dirmap-generator',
  },
};

export default nextConfig;
