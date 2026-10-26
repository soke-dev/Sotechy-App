import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@sotechy/shared"],
  // Dev only: let a phone on the same Wi-Fi (or 127.0.0.1) load the dev scripts. Without this
  // the page draws but never becomes interactive, and buttons and the tab bar do nothing.
  // Keep the dev badge clear of the phone tab bar
  devIndicators: { position: "top-right" },
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
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
