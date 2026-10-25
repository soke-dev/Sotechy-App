// People, branches, promotions, settings, suppliers, support, reports and audit logs.
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { audit } from "../../lib/audit";
import { hashPassword, MANAGERS, requireRole, type AppEnv } from "../../lib/auth";
import { notFound } from "../../lib/errors";
import { publicUser } from "../../lib/serialize";
import { adjustStock } from "../../services/inventory";
import { salesSummary } from "../../services/reports";
import { paymentMethodSchema } from "../orders";

const { users, branches, promotions, paymentMethods, cryptoAssets, appSettings, suppliers, purchaseOrders, purchaseOrderItems, supportTickets, auditLogs } =
  schema;

const ADMIN = requireRole("admin");

const branchFields = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  address: z.string().min(2),
  city: z.string().min(1),
  state: z.string().min(1),
  phone: z.string().nullable().optional(),
  openingHours: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const promotionFields = z.object({
  name: z.string().min(2),
  code: z.string().max(40).nullable().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.number().nonnegative(),
  maxDiscountAmount: z.number().nonnegative().nullable().optional(),
  minOrderAmount: z.number().nonnegative().nullable().optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  cryptoAsset: z.string().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

const roleSchema = z.enum(["customer", "staff", "manager", "admin"]);

export const adminManagementRoutes = new Hono<AppEnv>()
  // --- Reports ---
  .get("/reports/summary", requireRole(...MANAGERS), async (c) => {
    const to = c.req.query("to") ? new Date(c.req.query("to")!) : new Date();
    const from = c.req.query("from") ? new Date(c.req.query("from")!) : new Date(to.getTime() - 30 * 86_400_000);
    return c.json(await salesSummary(from, to));
  })

  // --- Customers & staff ---
  .get("/customers", async (c) => {
    const rows = await db.select().from(users).where(eq(users.role, "customer")).orderBy(desc(users.createdAt)).limit(500);
    return c.json(rows.map(publicUser));
  })
  .get("/staff", async (c) => {
    const rows = await db.select().from(users).where(ne(users.role, "customer")).orderBy(asc(users.email));
    return c.json(rows.map(publicUser));
  })
  .post(
    "/staff",
    ADMIN,
    zValidator(
      "json",
      z.object({
        email: z.email().transform((e) => e.toLowerCase()),
        password: z.string().min(8),
        fullName: z.string().optional(),
        role: roleSchema,
        branchId: z.uuid().nullable().optional(),
      }),
    ),
    async (c) => {
      const { password, ...input } = c.req.valid("json");
      const [user] = await db.insert(users).values({ ...input, passwordHash: await hashPassword(password) }).returning();
      await audit(db, { actorId: c.get("user").id, action: "user.create", entityType: "user", entityId: user.id, details: { role: user.role } });
      return c.json(publicUser(user), 201);
    },
  )
  .patch(
    "/users/:id",
    ADMIN,
    zValidator("json", z.object({ role: roleSchema.optional(), branchId: z.uuid().nullable().optional(), isActive: z.boolean().optional() })),
    async (c) => {
      const input = c.req.valid("json");
      const [user] = await db.update(users).set(input).where(eq(users.id, c.req.param("id"))).returning();
      if (!user) throw notFound("User not found");
      await audit(db, { actorId: c.get("user").id, action: "user.update", entityType: "user", entityId: user.id, details: input });
      return c.json(publicUser(user));
    },
  )

  // --- Branches ---
  .get("/branches", async (c) => c.json(await db.select().from(branches).orderBy(asc(branches.name))))
  .post("/branches", ADMIN, zValidator("json", branchFields), async (c) => {
    const [row] = await db.insert(branches).values(c.req.valid("json")).returning();
    return c.json(row, 201);
  })
  .patch("/branches/:id", ADMIN, zValidator("json", branchFields.partial()), async (c) => {
    const [row] = await db.update(branches).set(c.req.valid("json")).where(eq(branches.id, c.req.param("id"))).returning();
    if (!row) throw notFound("Branch not found");
    return c.json(row);
  })

  // --- Promotions ---
  .get("/promotions", async (c) => c.json(await db.select().from(promotions).orderBy(desc(promotions.createdAt))))
  .post("/promotions", requireRole(...MANAGERS), zValidator("json", promotionFields), async (c) => {
    const [row] = await db.insert(promotions).values(c.req.valid("json")).returning();
    await audit(db, { actorId: c.get("user").id, action: "promotion.create", entityType: "promotion", entityId: row.id });
    return c.json(row, 201);
  })
  .patch("/promotions/:id", requireRole(...MANAGERS), zValidator("json", promotionFields.partial()), async (c) => {
    const input = c.req.valid("json");
    const [row] = await db.update(promotions).set(input).where(eq(promotions.id, c.req.param("id"))).returning();
    if (!row) throw notFound("Promotion not found");
    await audit(db, { actorId: c.get("user").id, action: "promotion.update", entityType: "promotion", entityId: row.id, details: input });
    return c.json(row);
  })

  // --- Settings: payment methods, crypto assets, app settings ---
  .get("/settings", async (c) => {
    const [methods, assets, settings] = await Promise.all([
      db.select().from(paymentMethods),
      db.select().from(cryptoAssets),
      db.select().from(appSettings),
    ]);
    return c.json({ paymentMethods: methods, cryptoAssets: assets, settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
  })
  .patch(
    "/settings/payment-methods/:code",
    ADMIN,
    zValidator("json", z.object({ isEnabled: z.boolean().optional(), online: z.boolean().optional(), inStore: z.boolean().optional(), instructions: z.string().nullable().optional() })),
    async (c) => {
      const code = paymentMethodSchema.parse(c.req.param("code"));
      const [row] = await db.update(paymentMethods).set(c.req.valid("json")).where(eq(paymentMethods.code, code)).returning();
      await audit(db, { actorId: c.get("user").id, action: "settings.payment_method", entityType: "payment_method", details: { code, ...c.req.valid("json") } });
      return c.json(row);
    },
  )
  .post(
    "/settings/crypto-assets",
    ADMIN,
    zValidator("json", z.object({ symbol: z.string().min(1), name: z.string().min(1), network: z.string().min(1), receivingAddress: z.string().nullable().optional(), isEnabled: z.boolean().optional() })),
    async (c) => {
      const [row] = await db.insert(cryptoAssets).values(c.req.valid("json")).returning();
      return c.json(row, 201);
    },
  )
  .patch(
    "/settings/crypto-assets/:id",
    ADMIN,
    zValidator("json", z.object({ receivingAddress: z.string().nullable().optional(), isEnabled: z.boolean().optional() })),
    async (c) => {
      const [row] = await db.update(cryptoAssets).set(c.req.valid("json")).where(eq(cryptoAssets.id, c.req.param("id"))).returning();
      await audit(db, { actorId: c.get("user").id, action: "settings.crypto_asset", entityType: "crypto_asset", entityId: c.req.param("id"), details: c.req.valid("json") });
      return c.json(row);
    },
  )
  .put("/settings/:key", ADMIN, zValidator("json", z.record(z.string(), z.unknown())), async (c) => {
    const key = z.enum(["delivery", "reservation_hold", "bank_transfer", "support", "fx"]).parse(c.req.param("key"));
    const value = c.req.valid("json");
    const [row] = await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } })
      .returning();
    await audit(db, { actorId: c.get("user").id, action: "settings.update", entityType: "app_setting", details: { key, value } });
    return c.json(row);
  })

  // --- Suppliers & purchase orders ---
  .get("/suppliers", requireRole(...MANAGERS), async (c) => c.json(await db.select().from(suppliers).orderBy(asc(suppliers.name))))
  .post(
    "/suppliers",
    requireRole(...MANAGERS),
    zValidator("json", z.object({ name: z.string().min(2), contactName: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), notes: z.string().optional() })),
    async (c) => {
      const [row] = await db.insert(suppliers).values(c.req.valid("json")).returning();
      return c.json(row, 201);
    },
  )
  .get("/purchase-orders", requireRole(...MANAGERS), async (c) => {
    const rows = await db
      .select({ po: purchaseOrders, supplierName: suppliers.name, branchName: branches.name })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .innerJoin(branches, eq(branches.id, purchaseOrders.branchId))
      .orderBy(desc(purchaseOrders.createdAt));
    return c.json(rows.map((r) => ({ ...r.po, supplierName: r.supplierName, branchName: r.branchName })));
  })
  .post(
    "/purchase-orders",
    requireRole(...MANAGERS),
    zValidator(
      "json",
      z.object({
        supplierId: z.uuid().nullable().optional(),
        branchId: z.uuid(),
        items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().positive(), unitCost: z.number().nonnegative() })).min(1),
      }),
    ),
    async (c) => {
      const { items, ...input } = c.req.valid("json");
      const po = await db.transaction(async (tx) => {
        const totalCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
        const [row] = await tx.insert(purchaseOrders).values({ ...input, totalCost, status: "ordered", orderedAt: new Date(), createdBy: c.get("user").id }).returning();
        await tx.insert(purchaseOrderItems).values(items.map((i) => ({ ...i, purchaseOrderId: row.id })));
        return row;
      });
      return c.json(po, 201);
    },
  )
  /** Receives all items on a purchase order: adds stock and records the latest unit cost. */
  .post("/purchase-orders/:id/receive", requireRole(...MANAGERS), async (c) => {
    const actor = c.get("user");
    // Claim the PO atomically so a double click cannot receive it twice.
    const [po] = await db
      .update(purchaseOrders)
      .set({ status: "received", receivedAt: new Date() })
      .where(and(eq(purchaseOrders.id, c.req.param("id")), eq(purchaseOrders.status, "ordered")))
      .returning();
    if (!po) throw notFound("No open purchase order with this id");
    const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id));
    for (const item of items) {
      await adjustStock(actor, { variantId: item.variantId, branchId: po.branchId, delta: item.quantity, type: "restock", note: `PO ${po.id.slice(0, 8)}` });
      await db.update(purchaseOrderItems).set({ receivedQuantity: item.quantity }).where(eq(purchaseOrderItems.id, item.id));
      await db.update(schema.productVariants).set({ costPrice: item.unitCost }).where(eq(schema.productVariants.id, item.variantId));
    }
    return c.json(po);
  })

  // --- Support tickets ---
  .get("/support", async (c) => {
    const rows = await db
      .select({ ticket: supportTickets, customerEmail: users.email })
      .from(supportTickets)
      .leftJoin(users, eq(users.id, supportTickets.customerId))
      .orderBy(desc(supportTickets.createdAt))
      .limit(200);
    return c.json(rows.map((r) => ({ ...r.ticket, customerEmail: r.customerEmail })));
  })
  .patch("/support/:id", zValidator("json", z.object({ status: z.enum(["open", "pending", "resolved", "closed"]) })), async (c) => {
    const [row] = await db.update(supportTickets).set(c.req.valid("json")).where(eq(supportTickets.id, c.req.param("id"))).returning();
    return c.json(row);
  })

  // --- Audit log ---
  .get("/audit-logs", ADMIN, async (c) => {
    const rows = await db
      .select({ log: auditLogs, actorEmail: users.email })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(300);
    return c.json(rows.map((r) => ({ ...r.log, actorEmail: r.actorEmail })));
  })

  // --- Marketplace (Phase 4): read-only until onboarding is switched on ---
  .get("/merchants", ADMIN, async (c) => {
    const rows = await db.select().from(schema.merchants).where(inArray(schema.merchants.status, ["pending", "approved", "suspended"]));
    return c.json({ enabled: false, merchants: rows });
  });
