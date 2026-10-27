import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, type AppEnv } from "../lib/auth";
import { env } from "../env";
import { badRequest, conflict, forbidden, HttpError, unauthorized } from "../lib/errors";
import { layout, sendEmail, sendEmailLater } from "../lib/email";
import { getFeatures, requireFeature } from "../services/features";
import { publicUser } from "../lib/serialize";
import { claimUsername, normaliseUsername, phoneField, usernameRule } from "../lib/identity";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const RESET_MINUTES = 15;
const hashCode = (code: string) => createHmac("sha256", env.JWT_SECRET).update(code).digest("hex");

const welcomeEmail = (to: string, name: string | null) => ({
  to,
  subject: "Welcome to Sotechy",
  text: `Hi ${name?.split(" ")[0] ?? "there"}, your Sotechy account is ready. Shop from stores across Nigeria and earn tokens on every order.`,
  html: layout({
    heading: `Welcome${name ? `, ${name.split(" ")[0]}` : ""}`,
    paragraphs: [
      "Your Sotechy account is ready.",
      "Shop from stores across Nigeria, earn tokens on every completed order, and spend them at the store you earned them from.",
    ],
  }),
});

const resetEmail = (to: string, code: string) => ({
  to,
  subject: `${code} is your Sotechy code`,
  text: `Your code to reset your Sotechy password is ${code}. It works for ${RESET_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
  html: layout({
    heading: "Reset your password",
    paragraphs: [`Enter this code to choose a new password. It works for ${RESET_MINUTES} minutes.`],
    code,
    footer: "Didn't ask for this? You can ignore this email; your password stays the same.",
  }),
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
      sendEmailLater(welcomeEmail(user.email, user.fullName));
      return c.json({ token: await issueToken(user), user: publicUser(user) }, 201);
    },
  )
  /** Emails a 6-digit code. Always answers the same way, so it can't be used to find out who has an account. */
  .post("/password/forgot", zValidator("json", z.object({ email: z.email().transform((e) => e.toLowerCase()) })), async (c) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, c.req.valid("json").email));
    if (user?.isActive) {
      const [recent] = await db
        .select({ id: schema.passwordResets.id })
        .from(schema.passwordResets)
        .where(and(eq(schema.passwordResets.userId, user.id), gt(schema.passwordResets.createdAt, new Date(Date.now() - 60_000))));
      if (!recent) {
        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        await db.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, user.id));
        await db.insert(schema.passwordResets).values({ userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) });
        await sendEmail(resetEmail(user.email, code));
      }
    }
    return c.json({ ok: true });
  })
  /** Sets a new password with the emailed code, and signs the person in */
  .post(
    "/password/reset",
    zValidator(
      "json",
      credentials.extend({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email") }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      const wrong = () => badRequest("That code is wrong or has expired. Ask for a new one.");
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email));
      if (!user?.isActive) throw wrong();
      const [reset] = await db.select().from(schema.passwordResets).where(eq(schema.passwordResets.userId, user.id));
      if (!reset || reset.expiresAt < new Date() || reset.attempts >= 5) throw wrong();
      if (!timingSafeEqual(Buffer.from(reset.codeHash), Buffer.from(hashCode(input.code)))) {
        await db.update(schema.passwordResets).set({ attempts: reset.attempts + 1 }).where(eq(schema.passwordResets.id, reset.id));
        throw wrong();
      }
      await db.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, user.id));
      const [updated] = await db.update(schema.users).set({ passwordHash: await hashPassword(input.password) }).where(eq(schema.users.id, user.id)).returning();
      return c.json({ token: await issueToken(updated), user: publicUser(updated) });
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
