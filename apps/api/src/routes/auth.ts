import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, type AppEnv } from "../lib/auth";
import { env } from "../env";
import { conflict, forbidden, HttpError, unauthorized } from "../lib/errors";
import { getFeatures, requireFeature } from "../services/features";
import { publicUser } from "../lib/serialize";
import { claimUsername, normaliseUsername, phoneField, usernameRule } from "../lib/identity";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Signing in takes an email or an @username */
const signInFields = z.object({
  email: z.string().trim().min(3).max(120).transform((e) => e.toLowerCase().replace(/^@/, "")),
  password: z.string().min(1),
});

export const authRoutes = new Hono<AppEnv>()
  .post(
    "/register",
    zValidator(
      "json",
      credentials.extend({
        fullName: z.string().max(120).optional(),
        username: z.string().max(30).optional(),
        phone: z.string().max(30).optional(),
        whatsappPhone: z.string().max(30).optional(),
      }),
    ),
    async (c) => {
      await requireFeature("signups", "New accounts can't be created right now");
      const input = c.req.valid("json");
      const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email));
      if (existing) throw conflict("An account with this email already exists");
      const username = input.username ? await claimUsername(input.username) : null;

      const [user] = await db
        .insert(schema.users)
        .values({
          email: input.email,
          passwordHash: await hashPassword(input.password),
          fullName: input.fullName,
          username,
          phone: phoneField(input.phone, "Phone number") ?? null,
          whatsappPhone: phoneField(input.whatsappPhone, "WhatsApp number") ?? null,
        })
        .returning();
      return c.json({ token: await issueToken(user), user: publicUser(user) }, 201);
    },
  )
  .post("/login", zValidator("json", signInFields), async (c) => {
    const input = c.req.valid("json");
    const column = input.email.includes("@") ? schema.users.email : schema.users.username;
    const [user] = await db.select().from(schema.users).where(eq(column, input.email));
    if (user && !user.passwordHash) throw unauthorized("This account uses Google sign-in. Tap “Continue with Google”.");
    if (!user || !user.isActive || !(await checkPassword(input.password, user.passwordHash!))) {
      throw unauthorized("Incorrect email, username or password");
    }
    return c.json({ token: await issueToken(user), user: publicUser(user) });
  })
  /** Google sign-in: the app sends Google's ID token; we verify it with Google before trusting it. */
  .post("/google", zValidator("json", z.object({ idToken: z.string().min(20) })), async (c) => {
    const features = await getFeatures();
    if (!features.googleSignIn) throw forbidden("Google sign-in is turned off");
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
      if (!features.signups) throw forbidden("New accounts can't be created right now");
      [user] = await db.insert(schema.users).values({ email, googleId: g.sub, fullName: g.name ?? null, avatarUrl: g.picture ?? null }).returning();
    }
    if (!user.isActive) throw unauthorized("This account is disabled");
    return c.json({ token: await issueToken(user), user: publicUser(user) });
  })
  /** Is this username free? Signed-in users may "check" their own current one. */
  .get("/username/:name", async (c) => {
    const n = normaliseUsername(c.req.param("name"));
    const problem = usernameRule(n);
    if (problem) return c.json({ username: n, available: false, reason: problem });
    const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, n));
    return c.json({ username: n, available: !owner, reason: owner ? `@${n} is taken` : null });
  })
  .get("/me", requireAuth, async (c) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, c.get("user").id));
    return c.json(publicUser(user));
  })
  .patch(
    "/me",
    requireAuth,
    zValidator(
      "json",
      z.object({
        fullName: z.string().max(120).optional(),
        username: z.string().max(30).optional(),
        phone: z.string().max(30).nullable().optional(),
        whatsappPhone: z.string().max(30).nullable().optional(),
        avatarStyle: z.enum(["m1", "m2", "m3", "f1", "f2", "f3"]).nullable().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      const id = c.get("user").id;
      const patch = {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.avatarStyle !== undefined && { avatarStyle: input.avatarStyle }),
        ...(input.username !== undefined && { username: await claimUsername(input.username, id) }),
        ...(input.phone !== undefined && { phone: phoneField(input.phone, "Phone number") }),
        ...(input.whatsappPhone !== undefined && { whatsappPhone: phoneField(input.whatsappPhone, "WhatsApp number") }),
      };
      const [user] = Object.keys(patch).length
        ? await db.update(schema.users).set(patch).where(eq(schema.users.id, id)).returning()
        : await db.select().from(schema.users).where(eq(schema.users.id, id));
      return c.json(publicUser(user));
    },
  );
