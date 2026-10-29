import type { schema } from "../db/client";

type UserRow = typeof schema.users.$inferSelect;

/** Never send password hashes to clients. */
export function publicUser(user: UserRow) {
  const { passwordHash, ...rest } = user;
  // Google-only accounts have no password yet: they set one instead of changing it
  return { ...rest, hasPassword: !!passwordHash };
}
