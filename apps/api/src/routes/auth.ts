import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, STAFF, type AppEnv } from "../lib/auth";
import { env } from "../env";
import { badRequest, conflict, forbidden, HttpError, unauthorized } from "../lib/errors";
import { sendEmail, sendEmailLater } from "../lib/email";
import { passwordCodeEmail, staffCodeEmail, welcomeEmail } from "../emails/templates";
import { getFeatures, requireFeature } from "../services/features";
import { publicUser } from "../lib/serialize";
import { audit } from "../lib/audit";
import { claimUsername, normaliseUsername, phoneField, referrerFor, usernameRule } from "../lib/identity";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const RESET_MINUTES = 15;
const STAFF_CODE_MINUTES = 10;
const hashCode = (code: string) => createHmac("sha256", env.JWT_SECRET).update(code).digest("hex");

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
        /** Optional: the @username of whoever invited them */
        referralCode: z.string().max(30).optional(),
      }),
    ),
    async (c) => {
      await requireFeature("signups", "New accounts can't be created right now");
      const input = c.req.valid("json");
      const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email));
      if (existing) throw conflict("An account with this email already exists");
      const username = input.username ? await claimUsername(input.username) : null;
      const referredById = await referrerFor(input.referralCode);

      const [user] = await db
        .insert(schema.users)
        .values({
          email: input.email,
          passwordHash: await hashPassword(input.password),
          fullName: input.fullName,
          username,
          phone: phoneField(input.phone, "Phone number") ?? null,
          whatsappPhone: phoneField(input.whatsappPhone, "WhatsApp number") ?? null,
          referredById: referredById ?? null,
        })
        .returning();
      sendEmailLater(welcomeEmail(user.email, { name: user.fullName }));
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
        await sendEmail(passwordCodeEmail(user.email, { code, minutes: RESET_MINUTES }));
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
  /**
   * Admin dashboard, step 1: the right email and password email a 6-digit code (and nothing else happens).
   * Wrong details, or a non-staff account, get the same answer as a wrong password.
   */
  .post("/staff/login", zValidator("json", z.object({ email: z.email().transform((e) => e.toLowerCase()), password: z.string().min(1) })), async (c) => {
    const input = c.req.valid("json");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email));
    const ok = user?.isActive && user.passwordHash && STAFF.includes(user.role) && (await checkPassword(input.password, user.passwordHash));
    if (!user || !ok) throw unauthorized("Incorrect email or password");
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await db.delete(schema.loginCodes).where(eq(schema.loginCodes.userId, user.id));
    const [challenge] = await db
      .insert(schema.loginCodes)
      .values({ userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + STAFF_CODE_MINUTES * 60_000) })
      .returning();
    await sendEmail(staffCodeEmail(user.email, { name: user.fullName, code, minutes: STAFF_CODE_MINUTES }));
    return c.json({ challengeId: challenge.id });
  })
  /** Admin dashboard, step 2: the emailed code finishes signing in */
  .post(
    "/staff/verify",
    zValidator("json", z.object({ challengeId: z.uuid(), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email") })),
    async (c) => {
      const { challengeId, code } = c.req.valid("json");
      const wrong = () => badRequest("That code is wrong or has expired. Sign in again for a new one.");
      const [challenge] = await db.select().from(schema.loginCodes).where(eq(schema.loginCodes.id, challengeId));
      if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5) throw wrong();
      if (!timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(hashCode(code)))) {
        await db.update(schema.loginCodes).set({ attempts: challenge.attempts + 1 }).where(eq(schema.loginCodes.id, challenge.id));
        throw wrong();
      }
      await db.delete(schema.loginCodes).where(eq(schema.loginCodes.userId, challenge.userId));
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, challenge.userId));
      if (!user?.isActive || !STAFF.includes(user.role)) throw wrong();
      await audit(db, { actorId: user.id, action: "staff.sign_in", entityType: "user", entityId: user.id });
      return c.json({ token: await issueToken(user, { staff: true }), user: publicUser(user) });
    },
  )
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
