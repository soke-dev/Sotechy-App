import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, type AppEnv } from "../lib/auth";
import { conflict, unauthorized } from "../lib/errors";
import { publicUser } from "../lib/serialize";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const authRoutes = new Hono<AppEnv>()
  .post(
    "/register",
    zValidator("json", credentials.extend({ fullName: z.string().max(120).optional(), phone: z.string().max(30).optional() })),
    async (c) => {
      const input = c.req.valid("json");
      const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email));
      if (existing) throw conflict("An account with this email already exists");

      const [user] = await db
        .insert(schema.users)
        .values({ email: input.email, passwordHash: await hashPassword(input.password), fullName: input.fullName, phone: input.phone })
        .returning();
      return c.json({ token: await issueToken(user), user: publicUser(user) }, 201);
    },
  )
  .post("/login", zValidator("json", credentials), async (c) => {
    const input = c.req.valid("json");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email));
    if (!user || !user.isActive || !(await checkPassword(input.password, user.passwordHash))) {
      throw unauthorized("Incorrect email or password");
    }
    return c.json({ token: await issueToken(user), user: publicUser(user) });
  })
  .get("/me", requireAuth, async (c) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, c.get("user").id));
    return c.json(publicUser(user));
  })
  .patch(
    "/me",
    requireAuth,
    zValidator("json", z.object({ fullName: z.string().max(120).optional(), phone: z.string().max(30).optional() })),
    async (c) => {
      const [user] = await db.update(schema.users).set(c.req.valid("json")).where(eq(schema.users.id, c.get("user").id)).returning();
      return c.json(publicUser(user));
    },
  );
