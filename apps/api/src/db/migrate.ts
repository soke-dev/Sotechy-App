// Applies SQL migrations from apps/api/drizzle. Runs as Railway's pre-deploy command.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

// This file lives in src/db (tsx) or dist/db (built); both are two levels below apps/api.
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

await migrate(db, { migrationsFolder });
console.log("Migrations applied");
await pool.end();
