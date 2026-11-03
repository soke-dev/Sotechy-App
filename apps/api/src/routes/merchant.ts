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
import { startIdCheck } from "../services/didit";
import { createHandoff, idCheckMethod, idCheckState, latestCheck, storeForHandoff, submitManualCheck } from "../services/id-checks";
import { storeAccess } from "../services/team";

const storeOf = async (ownerId: string) => (await db.select().from(schema.merchants).where(eq(schema.merchants.ownerId, ownerId)))[0] ?? null;

/** "ovie", then "ovie-2", "ovie-3"… (or "OVIE", "OVIE2"…) until one is free */
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
        /** The store's username and link (sotechy.shop/ovies-gadgets); made from the name when left out */
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
  /** Starts (or restarts) the owner's ID + liveness check on Didit (when it's switched on); returns Didit's page */
  .post("/verification", async (c) => {
    const store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    if (store.kycStatus === "approved") throw conflict("Your ID is already verified");
    if (store.kycStatus === "in_review") throw conflict("Your ID check is being reviewed. We'll email you the result.");
    if ((await idCheckMethod(store)) !== "didit") throw badRequest("Verify your ID with the steps on the page.");
    return c.json({ url: await startIdCheck(store) });
  })
  /** The check's status and which way it's done (Didit, or Sotechy's own check with what to redo) */
  .get("/verification", async (c) => {
    const store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    return c.json(await idCheckState(store));
  })
  /** Sotechy's own check: the front of the ID, a selfie and a smile video (multipart) */
  .post("/verification/manual", async (c) => {
    const store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    return c.json(await submitManualCheck(store, await c.req.parseBody()), 201);
  })
  /** "Continue on your phone": a one-time link (for a QR code) that works for 30 minutes without signing in */
  .post("/verification/handoff", async (c) => {
    const store = await storeOf(c.get("user").id);
    if (!store) throw notFound("You don't have a store yet");
    if ((await idCheckMethod(store)) !== "manual") throw badRequest("Verify your ID with the steps on the page.");
    return c.json(await createHandoff(store));
  })
  .patch(
    "/store",
    zValidator(
      "json",
      z.object({
        name: storeName.optional(),
        contactPhone: z.string().max(30).optional(),
        contactWhatsapp: z.string().max(30).nullable().optional(),
        /** Where order alerts and Sotechy's messages to the store go */
        contactEmail: z.email("Enter a valid email").max(200).optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      // The owner and the store's admins can change its details
      const access = await storeAccess(c.get("user").id);
      if (!access) throw notFound("You don't have a store yet");
      if (access.role !== "owner" && access.role !== "admin") throw forbidden("Only the owner and admins can change the store's details");
      const store = access.store;
      // A new name goes through Storefront → Store details, so Sotechy checks it (Sotechy's own store excepted)
      if (input.name !== undefined && input.name.trim() !== store.name && store.tokenId !== 1) throw badRequest("Change your store name in Storefront → Store details. Sotechy checks it first.");
      const phone = phoneField(input.contactPhone, "Phone number");
      const patch = {
        ...(input.name !== undefined && { name: input.name }),
        ...(phone !== undefined && { contactPhone: phone }),
        ...(input.contactWhatsapp !== undefined && { contactWhatsapp: phoneField(input.contactWhatsapp, "WhatsApp number") }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail.trim().toLowerCase() }),
      };
      if (!Object.keys(patch).length) return c.json(store);
      const [row] = await db.update(schema.merchants).set(patch).where(eq(schema.merchants.id, store.id)).returning();
      return c.json(row);
    },
  );

/**
 * The owner's phone, opened from the QR code on their computer: no sign-in, just the one-time link.
 * It only lets them send their own store's ID check, and stops working once sent or after 30 minutes.
 */
export const idHandoffRoutes = new Hono()
  .get("/:token", async (c) => {
    const store = await storeForHandoff(c.req.param("token"));
    const [owner] = store.ownerId ? await db.select({ name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, store.ownerId)) : [];
    const last = await latestCheck(store.id);
    return c.json({
      storeName: store.name,
      ownerName: owner?.name ?? null,
      status: store.kycStatus,
      check: last ? { idType: last.idType, status: last.status, redoItems: last.redoItems ?? [], note: last.note } : null,
    });
  })
  .post("/:token", async (c) => {
    const store = await storeForHandoff(c.req.param("token"));
    return c.json(await submitManualCheck(store, await c.req.parseBody()), 201);
  });
