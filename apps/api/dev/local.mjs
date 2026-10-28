// `pnpm dev:local`: the whole backend on this computer, no installs or accounts needed.
//  - Postgres: built-in PGlite, saved in apps/api/.local-db (delete the folder to start fresh)
//  - Migrations + seed (demo products, admin@local.test / password123)
//  - A local Money Moves stand-in with a test payment page (no real money)
//  - The API with live reload, on your Wi-Fi address so a phone can reach it
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { startFakeMoneyMoves } from "./fake-moneymoves.mjs";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_PORT = Number(process.env.PORT ?? 4000);
const DB_PORT = 5433;
const MM_PORT = 4200;

// Prefer the home/office Wi-Fi address (192.168.x / 10.x) over virtual adapters.
const addresses = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
const lanIp = addresses.find((a) => a.startsWith("192.168.")) ?? addresses.find((a) => a.startsWith("10.")) ?? addresses[0] ?? "127.0.0.1";

const db = await PGlite.create(join(apiDir, ".local-db"));
const dbServer = new PGLiteSocketServer({ db, port: DB_PORT, host: "127.0.0.1" });
await dbServer.start();

const fake = { key: "sk_test_local", webhookSecret: "whsec_local" };
const mmServer = await startFakeMoneyMoves({
  port: MM_PORT,
  publicUrl: `http://${lanIp}:${MM_PORT}`,
  webhookUrl: `http://127.0.0.1:${API_PORT}/payments/webhooks/moneymoves`,
  ...fake,
});

// Google sign-in, Resend and Didit settings are taken from apps/api/.env (everything else here is local)
const envFile = join(apiDir, ".env");
const fromFile = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const passThrough = Object.fromEntries(["GOOGLE_CLIENT_IDS", "RESEND_API_KEY", "EMAIL_FROM", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET"].filter((k) => fromFile[k]).map((k) => [k, fromFile[k]]));

const env = {
  ...process.env,
  ...passThrough,
  NODE_ENV: "development",
  PORT: String(API_PORT),
  DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
  // PGlite serves one connection at a time
  DATABASE_POOL_MAX: "1",
  JWT_SECRET: "local-development-secret-not-for-production",
  CORS_ORIGINS: "http://localhost:3000,http://localhost:3001,http://localhost:8081",
  PUBLIC_API_URL: `http://${lanIp}:${API_PORT}`,
  // Didit sends merchants back here after their ID check
  MERCHANT_APP_URL: "http://localhost:3002",
  SEED_ADMIN_EMAIL: "admin@local.test",
  SEED_ADMIN_PASSWORD: "password123",
  SEED_DEMO_PRODUCTS: "true",
  MONEYMOVES_API_URL: `http://127.0.0.1:${MM_PORT}/api/v1`,
  MONEYMOVES_SECRET_KEY: fake.key,
  MONEYMOVES_WEBHOOK_SECRET: fake.webhookSecret,
  MONEYMOVES_DIRECT_KEY: fake.key,
};

const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const run = (args, opts = {}) => spawn(process.execPath, [tsxCli, ...args], { cwd: apiDir, env, stdio: "inherit", ...opts });
const finished = (child) => new Promise((resolve, reject) => child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`)))));

await finished(run(["src/db/migrate.ts"]));
await finished(run(["src/db/seed.ts"]));
const api = run(["watch", "src/index.ts"]);

console.log(`
  Sotechy local stack is running
  ─────────────────────────────────────────────
  API (phone):     http://${lanIp}:${API_PORT}
  Admin:           pnpm dev:admin → http://localhost:3000   (admin@local.test / password123)
  Money Moves:     local test page, no real money
  Database:        apps/api/.local-db (delete it to start fresh)

  In apps/mobile/.env set  EXPO_PUBLIC_API_URL=http://${lanIp}:${API_PORT}
  then restart Expo (pnpm dev:mobile). Phone and computer must be on the same Wi-Fi.
`);

async function shutdown() {
  api.kill();
  mmServer.close();
  await dbServer.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
