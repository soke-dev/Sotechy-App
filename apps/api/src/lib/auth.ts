import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import type { Role } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { env } from "../env";
import { forbidden, unauthorized } from "./errors";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  branchId: string | null;
}

export type AppEnv = { Variables: { user: AuthUser } };

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function issueToken(user: { id: string }) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: user.id, iat: now, exp: now + TOKEN_TTL_SECONDS }, env.JWT_SECRET, "HS256");
}

/** Requires a valid bearer token. Role is re-read from the database so demotions apply immediately. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  let userId: string;
  try {
    const payload = await verify(header.slice(7), env.JWT_SECRET, "HS256");
    userId = String(payload.sub);
  } catch {
    throw unauthorized("Session expired, please sign in again");
  }

  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role, branchId: schema.users.branchId, isActive: schema.users.isActive })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user || !user.isActive) throw unauthorized();

  c.set("user", { id: user.id, email: user.email, role: user.role, branchId: user.branchId });
  await next();
});

export const requireRole = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("user").role)) throw forbidden();
    await next();
  });

export const STAFF: Role[] = ["staff", "manager", "admin"];
export const MANAGERS: Role[] = ["manager", "admin"];
