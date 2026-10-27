import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/db/migrate.ts", "src/db/seed.ts", "src/db/reset-accounts.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  // Bundle the workspace packages (they ship TypeScript source)
  noExternal: ["@sotechy/shared", "@sotechy/contracts"],
});
