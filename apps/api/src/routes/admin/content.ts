// App content and switches: image uploads, home banners, app switches, exchange rate and the
// Money Moves connection check.
import { zValidator } from "@hono/zod-validator";
import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { DEFAULT_FEATURES, type AppFeatures } from "@sotechy/shared";
import { db, schema } from "../../db/client";
import { env, publicApiUrl } from "../../env";
import { audit } from "../../lib/audit";
import { MANAGERS, requireRole, type AppEnv } from "../../lib/auth";
import { badRequest, notFound } from "../../lib/errors";
import { getFeatures } from "../../services/features";
import { getAccount, getUsdRate, moneyMovesConfigured, moneyMovesMode } from "../../services/moneymoves";

const { media, banners, appSettings } = schema;
const ADMIN = requireRole("admin");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const bannerFields = z.object({
  eyebrow: z.string().max(60).nullable().optional(),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(140).nullable().optional(),
  ctaLabel: z.string().min(1).max(30).optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  style: z.enum(["dark", "orange", "light"]).optional(),
  linkType: z.enum(["none", "category", "product", "deals", "url"]).optional(),
  linkValue: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

// Every switch is optional so one toggle can be saved on its own.
const featureFields = z
  .object({
    ordering: z.boolean(),
    delivery: z.boolean(),
    pickup: z.boolean(),
    promoCodes: z.boolean(),
    reviews: z.boolean(),
    liveChat: z.boolean(),
    whatsapp: z.boolean(),
    usdPrices: z.boolean(),
    signups: z.boolean(),
    googleSignIn: z.boolean(),
    lowStockBadges: z.boolean(),
    maintenance: z.boolean(),
    maintenanceMessage: z.string().max(300),
    announcement: z.string().max(160),
    announcementOn: z.boolean(),
  } satisfies { [K in keyof AppFeatures]: z.ZodType<AppFeatures[K]> })
  .partial();

export const adminContentRoutes = new Hono<AppEnv>()
  // --- Image uploads (served publicly at /media/:id) ---
  .post("/media", requireRole(...MANAGERS), async (c) => {
    const body = await c.req.parseBody({ all: true });
    const files = [body.file].flat().filter((f): f is File => f instanceof File);
    if (files.length === 0) throw badRequest("Choose an image to upload");
    const saved = [];
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) throw badRequest(`${file.name}: use a JPG, PNG, WebP or GIF image`);
      if (file.size > MAX_IMAGE_BYTES) throw badRequest(`${file.name} is larger than 5 MB`);
      const [row] = await db
        .insert(media)
        .values({ filename: file.name.slice(0, 200), contentType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()), createdBy: c.get("user").id })
        .returning({ id: media.id, filename: media.filename, contentType: media.contentType, size: media.size });
      saved.push({ ...row, url: `${publicApiUrl || new URL(c.req.url).origin}/media/${row.id}` });
    }
    return c.json(saved, 201);
  })
  .delete("/media/:id", requireRole(...MANAGERS), async (c) => {
    const [row] = await db.delete(media).where(eq(media.id, c.req.param("id"))).returning({ id: media.id });
    if (!row) throw notFound("Image not found");
    return c.json({ deleted: true });
  })

  // --- Home banners ---
  .get("/banners", async (c) => c.json(await db.select().from(banners).orderBy(asc(banners.sortOrder), desc(banners.createdAt))))
  .post("/banners", requireRole(...MANAGERS), zValidator("json", bannerFields), async (c) => {
    const [row] = await db.insert(banners).values(c.req.valid("json")).returning();
    await audit(db, { actorId: c.get("user").id, action: "banner.create", entityType: "banner", entityId: row.id, details: { title: row.title } });
    return c.json(row, 201);
  })
  .patch("/banners/:id", requireRole(...MANAGERS), zValidator("json", bannerFields.partial()), async (c) => {
    const [row] = await db.update(banners).set(c.req.valid("json")).where(eq(banners.id, c.req.param("id"))).returning();
    if (!row) throw notFound("Banner not found");
    await audit(db, { actorId: c.get("user").id, action: "banner.update", entityType: "banner", entityId: row.id, details: c.req.valid("json") });
    return c.json(row);
  })
  .delete("/banners/:id", requireRole(...MANAGERS), async (c) => {
    const [row] = await db.delete(banners).where(eq(banners.id, c.req.param("id"))).returning();
    if (!row) throw notFound("Banner not found");
    await audit(db, { actorId: c.get("user").id, action: "banner.delete", entityType: "banner", entityId: row.id, details: { title: row.title } });
    return c.json({ deleted: true });
  })

  // --- App switches ---
  .get("/features", async (c) => c.json({ features: await getFeatures(), defaults: DEFAULT_FEATURES }))
  .patch("/features", ADMIN, zValidator("json", featureFields), async (c) => {
    const change = c.req.valid("json");
    const value = { ...(await getFeatures()), ...change };
    await db.insert(appSettings).values({ key: "features", value }).onConflictDoUpdate({ target: appSettings.key, set: { value } });
    await audit(db, { actorId: c.get("user").id, action: "features.update", entityType: "app_setting", details: change });
    return c.json(value);
  })

  // --- Money Moves connection and exchange rate ---
  .get("/integrations/moneymoves", async (c) => {
    const base = publicApiUrl || new URL(c.req.url).origin;
    const status = {
      configured: moneyMovesConfigured(),
      mode: moneyMovesMode(),
      webhookSecretSet: Boolean(env.MONEYMOVES_WEBHOOK_SECRET),
      webhookUrl: `${base}/payments/webhooks/moneymoves`,
      returnUrl: `${base}/payments/return`,
      publicUrlSet: Boolean(publicApiUrl),
      rate: await getUsdRate(),
      account: null as null | { name: string; mode: string; verified: boolean },
      error: null as string | null,
    };
    if (status.configured) {
      try {
        const a = await getAccount();
        status.account = { name: a.name, mode: a.mode, verified: a.verified };
      } catch (err) {
        status.error = err instanceof Error ? err.message : "Couldn't reach Money Moves";
      }
    }
    return c.json(status);
  });
