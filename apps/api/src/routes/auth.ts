import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { recordNotice } from "../services/push";
import { db, schema } from "../db/client";
import { checkPassword, hashPassword, issueToken, requireAuth, STAFF, tokenUserId, type AppEnv } from "../lib/auth";
import { env } from "../env";
import { badRequest, conflict, forbidden, HttpError, unauthorized } from "../lib/errors";
import { sendEmail, sendEmailLater } from "../lib/email";
import { passwordCodeEmail, staffCodeEmail, welcomeEmail } from "../emails/templates";
import { getFeatures, requireFeature } from "../services/features";
import { publicUser } from "../lib/serialize";
import { audit } from "../lib/audit";
import { claimUsername, mayUseOfficialNames, normaliseUsername, phoneField, referrerFor, usernameRule } from "../lib/identity";

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

/** Account security events, listed in the app's Notifications (no push: it's the person's own action) */
const securityNotice = (userId: string, title: string, body: string) =>
  recordNotice([userId], { kind: "security", title, body, data: { url: "/profile" } }).catch(() => {});
/** "on an iPhone" from the browser or app's user agent, when it says */
const device = (ua?: string) => (!ua ? "" : /iphone|ipad|ios/i.test(ua) ? " on an iPhone" : /android/i.test(ua) ? " on an Android phone" : /windows|macintosh|linux/i.test(ua) ? " on a computer" : "");

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
      await securityNotice(user.id, "Password changed", "Your password was reset with a code sent to your email. If this wasn't you, contact support now.");
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
    await securityNotice(user.id, "New sign-in", `Signed in with your password${device(c.req.header("user-agent"))}. If this wasn't you, change your password.`);
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
      if (!features.signups || features.maintenance) throw forbidden(features.maintenance ? features.maintenanceMessage || "New accounts can't be created right now" : "New accounts can't be created right now");
      [user] = await db.insert(schema.users).values({ email, googleId: g.sub, fullName: g.name ?? null, avatarUrl: g.picture ?? null }).returning();
    }
    if (!user.isActive) throw unauthorized("This account is disabled");
    await securityNotice(user.id, "New sign-in", `Signed in with Google${device(c.req.header("user-agent"))}. If this wasn't you, contact support now.`);
    return c.json({ token: await issueToken(user), user: publicUser(user) });
  })
  /** Is this username free? Signed-in users may "check" their own current one. */
  .get("/username/:name", async (c) => {
    const n = normaliseUsername(c.req.param("name"));
    // Sotechy's team and Sotechy's own store may use "sotechy" names
    const uid = await tokenUserId(c.req.header("Authorization"));
    const [me] = uid ? await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, uid)) : [];
    const problem = usernameRule(n, { staff: await mayUseOfficialNames(uid, me?.role) });
    if (problem) return c.json({ username: n, available: false, reason: problem });
    const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, n));
    return c.json({ username: n, available: !owner, reason: owner ? `@${n} is taken` : null });
  })
  /** Changes the password (the current one first), or sets one for an account that only used Google */
  .post(
    "/password/change",
    requireAuth,
    zValidator("json", z.object({ current: z.string().max(200).optional(), next: z.string().min(8, "Use at least 8 characters").max(200) })),
    async (c) => {
      const { current, next } = c.req.valid("json");
      const id = c.get("user").id;
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
      if (!user) throw unauthorized("Sign in again");
      if (user.passwordHash && !(current && (await checkPassword(current, user.passwordHash)))) throw badRequest("Your current password isn't right");
      if (current && current === next) throw badRequest("Choose a password you haven't used here");
      await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, id));
      await securityNotice(id, user.passwordHash ? "Password changed" : "Password set", `${user.passwordHash ? "Your password was changed" : "You can now sign in with a password too"} in the app. If this wasn't you, contact support now.`);
      await audit(db, { actorId: id, action: user.passwordHash ? "user.password_change" : "user.password_set", entityType: "user", entityId: id });
      return c.json({ ok: true });
    },
  )
  .get("/me", requireAuth, async (c) => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, c.get("user").id));
    return c.json(publicUser(user));
  })
  /** Deletes the account and its personal data (App Store and Play rules). Its orders are kept without a
   *  name, as sales records. Not while it runs a store or has an order on its way. */
  .delete("/me", requireAuth, async (c) => {
    const id = c.get("user").id;
    const [user] = await db.select({ role: schema.users.role, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, id));
    if (!user) throw unauthorized();
    if (user.role !== "customer") throw forbidden("Staff accounts are closed by a Sotechy admin");
    const [store] = await db.select({ name: schema.merchants.name }).from(schema.merchants).where(eq(schema.merchants.ownerId, id));
    if (store) throw conflict(`You run ${store.name}. Contact Sotechy support to close the store before deleting your account.`);
    const [open] = await db
      .select({ number: schema.orders.orderNumber })
      .from(schema.orders)
      .where(and(eq(schema.orders.customerId, id), inArray(schema.orders.status, ["paid", "processing", "dispatched", "ready_for_pickup"])))
      .limit(1);
    if (open) throw conflict(`Order ${open.number} is still on its way. You can delete your account once it's delivered or cancelled.`);
    // Addresses, saved items, follows, reviews, offers, notifications and sign-in records go with the account;
    // orders and support chats stay without it
    await db.delete(schema.users).where(eq(schema.users.id, id));
    await audit(db, { actorId: null, action: "account.deleted", entityType: "user", entityId: id, details: {} });
    return c.json({ deleted: true });
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
        // A character (m1–m6, f1–f6), or a photo they uploaded to Sotechy (its /media/ address)
        pushPrefs: z.object({ order: z.boolean(), offer: z.boolean(), store: z.boolean(), tokens: z.boolean(), support: z.boolean() }).partial().optional(),
        avatarStyle: z
          .string()
          .max(500)
          .refine((v) => /^[mf][1-6]$/.test(v) || /^https?:\/\/[^/]+\/media\/[0-9a-f-]{36}$/i.test(v), "Choose an avatar, or upload a photo")
          .nullable()
          .optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      const id = c.get("user").id;
      if (input.fullName !== undefined) {
        const [verified] = await db
          .select({ id: schema.merchants.id })
          .from(schema.merchants)
          .where(and(eq(schema.merchants.ownerId, id), eq(schema.merchants.kycStatus, "approved")))
          .limit(1);
        const [me] = verified ? await db.select({ fullName: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, id)) : [];
        if (verified && input.fullName.trim() !== (me?.fullName ?? "")) throw forbidden("Your name comes from your ID check, so it can't be changed here. Contact Sotechy if it's wrong.");
      }
      const patch = {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.avatarStyle !== undefined && { avatarStyle: input.avatarStyle }),
        ...(input.pushPrefs !== undefined && { pushPrefs: input.pushPrefs }),
        // An uploaded photo is the account's picture too (a character leaves it as it was)
        ...(input.avatarStyle?.startsWith("http") && { avatarUrl: input.avatarStyle }),
        ...(input.username !== undefined && { username: await claimUsername(input.username, id, { staff: await mayUseOfficialNames(id, c.get("user").role) }) }),
        ...(input.phone !== undefined && { phone: phoneField(input.phone, "Phone number") }),
        ...(input.whatsappPhone !== undefined && { whatsappPhone: phoneField(input.whatsappPhone, "WhatsApp number") }),
      };
      const [user] = Object.keys(patch).length
        ? await db.update(schema.users).set(patch).where(eq(schema.users.id, id)).returning()
        : await db.select().from(schema.users).where(eq(schema.users.id, id));
      return c.json(publicUser(user));
    },
  );
