import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { claimUsername, phoneField, referrerFor, slugify, storeHandleRule, tickerFrom } from "../lib/identity";
import { publicUser } from "../lib/serialize";
import { sendEmailLater } from "../lib/email";
import { storeOpenedEmail } from "../emails/templates";
import { diditConfigured, refreshIdCheck, startIdCheck } from "../services/didit";
import { storeAccess } from "../services/team";

const storeOf = async (ownerId: string) => (await db.select().from(schema.merchants).where(eq(schema.merchants.ownerId, ownerId)))[0] ?? null;

/** "xena", then "xena-2", "xena-3"… (or "XENA", "XENA2"…) until one is free */
async function firstFree(base: string, column: typeof schema.merchants.slug | typeof schema.merchants.ticker, join: string, max: number) {
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? "" : `${join}${n}`;
    const candidate = `${base.slice(0, max - suffix.length)}${suffix}`;
    const [taken] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(column, candidate));
    if (!taken) return candidate;
  }
}

const storeName = z.string().trim().min(2, "Store name is too short").max(60);

/** Checks a chosen store username and that no other store has it */
async function claimStoreHandle(raw: string) {
  const h = raw.trim().toLowerCase().replace(/^@/, "");
  const problem = storeHandleRule(h);
  if (problem) throw badRequest(problem);
  const [taken] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.slug, h));
  if (taken) throw conflict(`@${h} is taken. Try another store username.`);
  return h;
}

/** The signed-in person's own store: the merchant dashboard's view of an account */
export const merchantRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/me", async (c) => {
    const id = c.get("user").id;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    const access = await storeAccess(id);
    return c.json({ user: publicUser(user), store: access?.store ?? null, role: access?.role ?? null });
  })
  /** Opens a store for this account. New stores start in test mode (pending) until Sotechy verifies them. */
  .post(
    "/store",
    zValidator(
      "json",
      z.object({
        name: storeName,
        sellerKind: z.enum(["registered", "individual"]),
        phone: z.string().max(30),
        whatsappPhone: z.string().max(30).nullable().optional(),
        /** Only needed when the account has no @username yet (e.g. a new Google sign-in) */
        username: z.string().max(30).optional(),
        /** Optional, for accounts made with Google that haven't entered one yet */
        referralCode: z.string().max(30).optional(),
        /** The store's username and link (sotechy.shop/xena-gadgets); made from the name when left out */
        slug: z.string().max(40).optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      const id = c.get("user").id;
      if (await storeAccess(id)) throw conflict("This account already runs a store");
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));

      const phone = phoneField(input.phone, "Phone number");
      const whatsapp = phoneField(input.whatsappPhone, "WhatsApp number") ?? null;
      const username = !user.username && input.username ? await claimUsername(input.username, id) : undefined;
      const referredById = !user.referredById ? await referrerFor(input.referralCode, id) : undefined;
      const slug = input.slug ? await claimStoreHandle(input.slug) : await firstFree(slugify(input.name), schema.merchants.slug, "-", 40);
      const ticker = await firstFree(tickerFrom(input.name), schema.merchants.ticker, "", 8);

      const store = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.merchants)
          .values({ name: input.name, slug, ticker, ownerId: id, sellerKind: input.sellerKind, contactEmail: user.email, contactPhone: phone, contactWhatsapp: whatsapp === phone ? null : whatsapp })
          .returning();
        // The owner's own account gets the numbers too if it has none, and the username if one was picked here
        const patch = { ...(username && { username }), ...(referredById && { referredById }), ...(!user.phone && phone && { phone, whatsappPhone: whatsapp === phone ? null : whatsapp }) };
        if (Object.keys(patch).length) await tx.update(schema.users).set(patch).where(eq(schema.users.id, id));
        return row;
      });
      const [fresh] = await db.select().from(schema.users).where(eq(schema.users.id, id));
      sendEmailLater(storeOpenedEmail(fresh.email, { name: fresh.fullName, store: store.name }));
      return c.json({ user: publicUser(fresh), store }, 201);
    },
  )
  /** Is this store username free? (checked live while opening a store) */
  .get("/handle/:handle", async (c) => {
    const h = c.req.param("handle").trim().toLowerCase().replace(/^@/, "");
    const problem = storeHandleRule(h);
    if (problem) return c.json({ handle: h, available: false, reason: problem });
    const [taken] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.slug, h));
    return c.json({ handle: h, available: !taken, reason: taken ? `@${h} is taken` : null });
  })
  /** Starts (or restarts) the owner's ID + liveness check; returns Didit's page to send them to */
  .post("/verification", async (c) => {
    const store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    if (store.kycStatus === "approved") throw conflict("Your ID is already verified");
    if (store.kycStatus === "in_review") throw conflict("Your ID check is being reviewed. We'll email you the result.");
    return c.json({ url: await startIdCheck(store) });
  })
  /** The check's status; while it's open, asks Didit for news (so it works even before webhooks reach us) */
  .get("/verification", async (c) => {
    let store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    if (store.kycSessionId && (store.kycStatus === "in_progress" || store.kycStatus === "in_review") && diditConfigured()) {
      store = (await refreshIdCheck(store.kycSessionId).catch(() => null)) ?? store;
    }
    return c.json({ status: store.kycStatus, updatedAt: store.kycUpdatedAt, available: diditConfigured() });
  })
  .patch(
    "/store",
    zValidator(
      "json",
      z.object({
        name: storeName.optional(),
        contactPhone: z.string().max(30).optional(),
        contactWhatsapp: z.string().max(30).nullable().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      // The owner and the store's admins can change its details
      const access = await storeAccess(c.get("user").id);
      if (!access) throw notFound("You don't have a store yet");
      if (access.role !== "owner" && access.role !== "admin") throw forbidden("Only the owner and admins can change the store's details");
      const store = access.store;
      const phone = phoneField(input.contactPhone, "Phone number");
      const patch = {
        ...(input.name !== undefined && { name: input.name }),
        ...(phone !== undefined && { contactPhone: phone }),
        ...(input.contactWhatsapp !== undefined && { contactWhatsapp: phoneField(input.contactWhatsapp, "WhatsApp number") }),
      };
      if (!Object.keys(patch).length) return c.json(store);
      const [row] = await db.update(schema.merchants).set(patch).where(eq(schema.merchants.id, store.id)).returning();
      return c.json(row);
    },
  );
