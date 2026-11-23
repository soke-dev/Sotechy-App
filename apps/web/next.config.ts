import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing page is fully static (no cookies, data or forms), so it's built once into plain files in
  // out/ and served by scripts/serve.mjs, which uses a fraction of the memory `next start` held on Railway.
  output: "export",
  // Pictures are already sized webp/png/svg; serving them as they are drops Next's in-memory image resizer
  images: { unoptimized: true },
  transpilePackages: ["@sotechy/shared"],
  reactCompiler: true,
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
