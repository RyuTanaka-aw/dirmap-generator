import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import rehypeSlug from "rehype-slug";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/dirmap-generator',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/dirmap-generator',
  },
  pageExtensions: ['ts', 'tsx', 'mdx'],
};

const withMDX = createMDX({
  options: {
    rehypePlugins: [rehypeSlug],
  },
});

export default withMDX(nextConfig);
