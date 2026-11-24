// End-to-end check of Pay with USDT on X Layer, against a local copy of X Layer (anvil --fork-url
// https://rpc.xlayer.tech on XLAYER_RPC_URL) with the real escrow and TapeOut circuits, and a fresh throwaway database.
// No real key is used: the operator and the buyer are throwaway keys set up on the local copy only.
//
//   XLAYER_RPC_URL=http://127.0.0.1:8551 node dev/xlayer-e2e.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { keccak256, toBytes } from "viem";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PORT = 5434;
const dir = mkdtempSync(join(tmpdir(), "sotechy-xlayer-e2e-"));
const db = await PGlite.create(dir);
const server = new PGLiteSocketServer({ db, port: DB_PORT, host: "127.0.0.1" });
await server.start();

const env = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  NODE_ENV: "development",
  DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
  DATABASE_POOL_MAX: "1",
  JWT_SECRET: "xlayer-e2e-secret-not-for-production",
  SEED_ADMIN_EMAIL: "admin@e2e.test",
  SEED_ADMIN_PASSWORD: "password123",
  SEED_DEMO_PRODUCTS: "true",
  // X Layer: the real escrow, on the local copy, sent by a throwaway operator
  XLAYER_ESCROW: "0xdfEE90861e00ed79963edB7e7c11facdBF930310",
  XLAYER_RPC_URL: process.env.XLAYER_RPC_URL ?? "http://127.0.0.1:8551",
  CHAIN_OPERATOR_KEY: keccak256(toBytes("sotechy e2e operator")),
  CHAIN_WRITES_IN_DEV: "true",
  // Nothing else may reach a real chain
  BASE_RPC_URL: "http://127.0.0.1:9",
  MONAD_RPC_URL: "http://127.0.0.1:9",
  E2E_BUYER_KEY: keccak256(toBytes("sotechy e2e buyer")),
};

const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const run = (args) =>
  new Promise((resolve, reject) =>
    spawn(process.execPath, [tsxCli, ...args], { cwd: apiDir, env, stdio: "inherit" }).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code}`)))),
  );

let code = 0;
try {
  await run(["src/db/migrate.ts"]);
  await run(["src/db/seed.ts"]);
  await run(["dev/xlayer-e2e-steps.ts"]);
} catch (err) {
  console.error(err.message);
  code = 1;
} finally {
  await server.stop();
  await db.close();
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
