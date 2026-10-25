import type { schema } from "../db/client";

type UserRow = typeof schema.users.$inferSelect;

/** Never send password hashes to clients. */
export function publicUser(user: UserRow) {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}
