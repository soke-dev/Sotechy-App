import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@sotechy/shared"],
  // Product photos and documents go through server actions (default limit 1 MB).
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
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
