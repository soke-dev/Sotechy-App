import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, type AppEnv } from "../lib/auth";
import { env } from "../env";
import { conflict, HttpError, unauthorized } from "../lib/errors";
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
    if (user && !user.passwordHash) throw unauthorized("This account uses Google sign-in. Tap “Continue with Google”.");
    if (!user || !user.isActive || !(await checkPassword(input.password, user.passwordHash!))) {
      throw unauthorized("Incorrect email or password");
    }
    return c.json({ token: await issueToken(user), user: publicUser(user) });
  })
  /** Google sign-in: the app sends Google's ID token; we verify it with Google before trusting it. */
  .post("/google", zValidator("json", z.object({ idToken: z.string().min(20) })), async (c) => {
    const allowed = env.GOOGLE_CLIENT_IDS.split(",").map((s) => s.trim()).filter(Boolean);
    if (allowed.length === 0) throw new HttpError(503, "Google sign-in is not configured yet");

    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(c.req.valid("json").idToken)}`);
    if (!res.ok) throw unauthorized("Google sign-in failed, please try again");
    const g = (await res.json()) as { aud: string; iss: string; sub: string; email?: string; email_verified?: string; name?: string; picture?: string };
    const issuerOk = g.iss === "accounts.google.com" || g.iss === "https://accounts.google.com";
    if (!issuerOk || !allowed.includes(g.aud) || !g.email || g.email_verified !== "true") throw unauthorized("Google sign-in failed, please try again");

    const email = g.email.toLowerCase();
    const [byGoogle] = await db.select().from(schema.users).where(eq(schema.users.googleId, g.sub));
    const [byEmail] = byGoogle ? [byGoogle] : await db.select().from(schema.users).where(eq(schema.users.email, email));

    let user = byEmail;
    if (user && !user.googleId) {
      // Existing email account: link it to this Google identity.
      [user] = await db.update(schema.users).set({ googleId: g.sub, avatarUrl: user.avatarUrl ?? g.picture ?? null }).where(eq(schema.users.id, user.id)).returning();
    }
    if (!user) {
      [user] = await db.insert(schema.users).values({ email, googleId: g.sub, fullName: g.name ?? null, avatarUrl: g.picture ?? null }).returning();
    }
    if (!user.isActive) throw unauthorized("This account is disabled");
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
