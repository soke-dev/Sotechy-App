import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import type { Role } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { env } from "../env";
import { forbidden, HttpError, unauthorized } from "./errors";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  branchId: string | null;
}

export type AppEnv = { Variables: { user: AuthUser } };

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
/** Admin sessions last a working day */
const STAFF_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/** `staff`: signed in through the admin dashboard's emailed code. Only those sessions get staff powers. */
export function issueToken(user: { id: string }, opts: { staff?: boolean } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: user.id, iat: now, exp: now + (opts.staff ? STAFF_TOKEN_TTL_SECONDS : TOKEN_TTL_SECONDS), ...(opts.staff && { stf: 1 }) }, env.JWT_SECRET, "HS256");
}

/** Requires a valid bearer token. Role is re-read from the database so demotions apply immediately. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  let userId: string;
  let staffSession = false;
  try {
    const payload = await verify(header.slice(7), env.JWT_SECRET, "HS256");
    userId = String(payload.sub);
    staffSession = payload.stf === 1;
  } catch {
    throw unauthorized("Session expired, please sign in again");
  }

  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role, branchId: schema.users.branchId, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user || !user.isActive) throw unauthorized();

  // Staff who signed in without the emailed code (e.g. in the shopping app) act as customers
  const role = user.role !== "customer" && !staffSession ? "customer" : user.role;
  c.set("user", { id: user.id, email: user.email, role, branchId: user.branchId });
  await next();
});

export const requireRole = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("user").role)) throw forbidden();
    await next();
  });

// Wrong confirmation passwords per account, to stop guessing
const wrongTries = new Map<string, { count: number; since: number }>();

/** For actions that move money or open stores: the admin types their password again (header x-confirm-password) */
export const requirePassword = createMiddleware<AppEnv>(async (c, next) => {
  // Switched off for now (ADMIN_PASSWORD_CHECKS=on brings it back)
  if (env.ADMIN_PASSWORD_CHECKS !== "on") return next();
  const user = c.get("user");
  const given = c.req.header("x-confirm-password");
  if (!given) throw new HttpError(428, "Enter your password to confirm this");
  const tries = wrongTries.get(user.id);
  if (tries && Date.now() - tries.since < 15 * 60_000 && tries.count >= 5) throw new HttpError(429, "Too many wrong passwords. Try again in 15 minutes.");
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!row?.hash || !(await checkPassword(given, row.hash))) {
    const fresh = !tries || Date.now() - tries.since >= 15 * 60_000;
    wrongTries.set(user.id, fresh ? { count: 1, since: Date.now() } : { ...tries, count: tries.count + 1 });
    throw new HttpError(403, "That password isn't right");
  }
  wrongTries.delete(user.id);
  await next();
});

export const STAFF: Role[] = ["staff", "manager", "admin"];
export const MANAGERS: Role[] = ["manager", "admin"];
