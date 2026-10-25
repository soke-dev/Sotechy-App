import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard is fully dynamic (every page reads the session cookie), so it
  // uses the classic request-time rendering model instead of Cache Components.
  reactCompiler: true,
  transpilePackages: ["@sotechy/shared"],
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
