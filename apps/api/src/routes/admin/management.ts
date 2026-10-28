// People, branches, promotions, settings, suppliers, support, reports and audit logs.
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { ensureStoreTokens, walletFor } from "../../services/tokens";
import { CHAINS } from "../../services/chain";
import { audit } from "../../lib/audit";
import { hashPassword, MANAGERS, requireRole, type AppEnv, requirePassword } from "../../lib/auth";
import { notFound } from "../../lib/errors";
import { sendEmailLater } from "../../lib/email";
import { publicUser } from "../../lib/serialize";
import { storeVerifiedEmail } from "../../emails/templates";
import { adjustStock } from "../../services/inventory";
import { salesSummary } from "../../services/reports";
import { paymentMethodSchema } from "../orders";
import { orderCases } from "../../services/order-cases";
import { replyToTicket, ticketThread } from "../../services/support-chat";
import { adminPulse } from "../../services/pulse";

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
    const q = c.req.query("q")?.trim().replace(/^@/, "");
    const term = q ? `%${q}%` : null;
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "customer"), term ? or(ilike(users.email, term), ilike(users.fullName, term), ilike(users.username, term), ilike(users.phone, term)) : undefined))
      .orderBy(desc(users.createdAt))
      .limit(500);
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await db
          .select({ id: schema.orders.customerId, orders: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(case when ${schema.orders.status} in ('paid','processing','ready_for_pickup','dispatched','delivered') then ${schema.orders.total} end), 0)::float` })
          .from(schema.orders)
          .where(inArray(schema.orders.customerId, ids))
          .groupBy(schema.orders.customerId)
      : [];
    return c.json(rows.map((u) => ({ ...publicUser(u), orders: counts.find((x) => x.id === u.id)?.orders ?? 0, spent: Number(counts.find((x) => x.id === u.id)?.spent ?? 0) })));
  })
  /** One customer: their details, orders, addresses, tokens and token history */
  .get("/customers/:id", async (c) => {
    const [user] = await db.select().from(users).where(eq(users.id, c.req.param("id")));
    if (!user) throw notFound("Customer not found");
    const o = schema.orders;
    const [orderRows, addresses, [reviews], [tickets], wallet, [referrer]] = await Promise.all([
      db
        .select({ id: o.id, number: o.orderNumber, status: o.status, total: o.total, tokensValue: o.tokensValue, channel: o.channel, createdAt: o.createdAt, store: schema.merchants.name })
        .from(o)
        .leftJoin(schema.merchants, eq(schema.merchants.id, o.merchantId))
        .where(eq(o.customerId, user.id))
        .orderBy(desc(o.createdAt))
        .limit(100),
      db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.productReviews).where(eq(schema.productReviews.userId, user.id)),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.supportTickets).where(eq(schema.supportTickets.customerId, user.id)),
      walletFor(user.id),
      user.referredById ? db.select({ username: users.username, email: users.email }).from(users).where(eq(users.id, user.referredById)) : Promise.resolve([undefined]),
    ]);
    const paid = orderRows.filter((x) => ["paid", "processing", "ready_for_pickup", "dispatched", "delivered"].includes(x.status));
    const explorer = CHAINS.monad.explorer;
    return c.json({
      user: { ...publicUser(user), isActive: user.isActive, referredBy: referrer ? (referrer.username ? `@${referrer.username}` : referrer.email) : null },
      stats: { orders: orderRows.length, delivered: orderRows.filter((x) => x.status === "delivered").length, spent: paid.reduce((n, x) => n + x.total, 0), reviews: reviews?.n ?? 0, tickets: tickets?.n ?? 0 },
      orders: orderRows.map((x) => ({ ...x, store: x.store ?? "Sotechy" })),
      addresses,
      wallet: {
        ...wallet,
        addressUrl: `${explorer}/address/${wallet.address}`,
        activity: wallet.activity.map((a) => ({ ...a, txUrl: a.tx ? `${explorer}/tx/${a.tx}` : null })),
      },
    });
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
  // Sotechy's own branches (marketplace stores' shops are managed with the store)
  .get("/branches", async (c) => c.json(await db.select().from(branches).where(isNull(branches.merchantId)).orderBy(asc(branches.name))))
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
  .get("/promotions", async (c) => {
    const rows = await db.select({ p: promotions, storeName: schema.merchants.name }).from(promotions).leftJoin(schema.merchants, eq(schema.merchants.id, promotions.merchantId)).orderBy(desc(promotions.createdAt));
    return c.json(rows.map((r) => ({ ...r.p, storeName: r.storeName })));
  })
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
      .select({ ticket: supportTickets, customerEmail: users.email, customerName: users.fullName, username: users.username })
      .from(supportTickets)
      .leftJoin(users, eq(users.id, supportTickets.customerId))
      .orderBy(desc(supportTickets.lastMessageAt))
      .limit(200);
    // The latest message in each conversation, for the list
    const ids = rows.map((r) => r.ticket.id);
    const latest = ids.length
      ? await db
          .selectDistinctOn([schema.supportMessages.ticketId], { ticketId: schema.supportMessages.ticketId, body: schema.supportMessages.body, imageUrl: schema.supportMessages.imageUrl, fromStaff: schema.supportMessages.fromStaff })
          .from(schema.supportMessages)
          .where(inArray(schema.supportMessages.ticketId, ids))
          .orderBy(schema.supportMessages.ticketId, desc(schema.supportMessages.createdAt))
      : [];
    return c.json(
      rows.map((r) => {
        const last = latest.find((m) => m.ticketId === r.ticket.id);
        return { ...r.ticket, customerEmail: r.customerEmail, customerName: r.customerName, username: r.username, lastMessage: (last?.body || (last?.imageUrl ? "Photo" : "")) || r.ticket.message, lastFromStaff: last?.fromStaff ?? false };
      }),
    );
  })
  /** Changes anywhere admins look, so open pages refresh by themselves */
  .get("/pulse", async (c) => c.json({ v: await adminPulse() }))
  .get("/support/:id", async (c) => c.json(await ticketThread(c.req.param("id"))))
  .post(
    "/support/:id/reply",
    zValidator("json", z.object({ message: z.string().trim().max(2000).default(""), imageUrl: z.string().url().max(500).optional() }).refine((v) => v.message.length > 0 || !!v.imageUrl, "Write a reply or add a photo")),
    async (c) => c.json(await replyToTicket(c.req.param("id"), c.get("user").id, c.req.valid("json").message, c.req.valid("json").imageUrl)),
  )
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

  // --- Marketplace stores ---
  .get("/merchants", async (c) => {
    const m = schema.merchants;
    const rows = await db
      .select({
        store: m,
        ownerName: users.fullName,
        ownerEmail: users.email,
        productCount: sql<number>`(select count(*)::int from products p where p.merchant_id = "merchants"."id")`,
        orderCount: sql<number>`(select count(*)::int from orders o where o.merchant_id = "merchants"."id" and o.status <> 'pending_payment')`,
        pendingZones: sql<number>`(select count(*)::int from delivery_zones z where z.merchant_id = "merchants"."id" and z.review = 'pending')`,
      })
      .from(m)
      .leftJoin(users, eq(users.id, m.ownerId))
      .orderBy(desc(m.createdAt));
    return c.json(rows.map(({ store, ...rest }) => ({ ...store, ...rest })));
  })
  .get("/merchants/:id", async (c) => {
    const m = schema.merchants;
    const [row] = await db
      .select({ store: m, owner: { id: users.id, name: users.fullName, email: users.email, username: users.username, phone: users.phone, avatarUrl: users.avatarUrl, createdAt: users.createdAt } })
      .from(m)
      .leftJoin(users, eq(users.id, m.ownerId))
      .where(eq(m.id, c.req.param("id")));
    if (!row) throw notFound("Store not found");
    const [zones, counts] = await Promise.all([
      db.select().from(schema.deliveryZones).where(eq(schema.deliveryZones.merchantId, row.store.id)).orderBy(asc(schema.deliveryZones.createdAt)),
      db
        .select({
          products: sql<number>`(select count(*)::int from products p where p.merchant_id = ${row.store.id})`,
          orders: sql<number>`(select count(*)::int from orders o where o.merchant_id = ${row.store.id} and o.status <> 'pending_payment')`,
          sales: sql<number>`(select coalesce(sum(o.total), 0)::float from orders o where o.merchant_id = ${row.store.id} and o.status in ('paid','processing','dispatched','ready_for_pickup','delivered'))`,
        })
        .from(m)
        .where(eq(m.id, row.store.id)),
    ]);
    return c.json({ ...row.store, owner: row.owner, zones, ...counts[0] });
  })
  /** What's waiting for a decision, for the admin menu's counts */
  /** Store orders that need Sotechy: not accepted, not delivered, paybacks owed */
  .get("/order-cases", async (c) => c.json(await orderCases()))
  .get("/queue", async (c) => {
    const [row] = await db
      .select({
        merchants: sql<number>`(select count(*)::int from merchants m where m.status = 'pending' and m.submitted_at is not null)`,
        zones: sql<number>`(select count(*)::int from delivery_zones z where z.review = 'pending')`,
        // Conversations waiting on Sotechy's answer
        support: sql<number>`(select count(*)::int from support_tickets t where t.status = 'open')`,
      })
      .from(users)
      .limit(1);
    return c.json({ merchants: row?.merchants ?? 0, zones: row?.zones ?? 0, support: row?.support ?? 0, cases: (await orderCases()).length });
  })
  /** Every store's delivery areas, waiting ones first */
  .get("/delivery-zones", async (c) => {
    const z = schema.deliveryZones;
    const rows = await db
      .select({ zone: z, storeName: schema.merchants.name, storeSlug: schema.merchants.slug, storeStatus: schema.merchants.status })
      .from(z)
      .innerJoin(schema.merchants, eq(schema.merchants.id, z.merchantId))
      .orderBy(sql`(${z.review} = 'pending') desc`, desc(z.updatedAt));
    return c.json(rows.map(({ zone, ...store }) => ({ ...zone, ...store })));
  })
  /** Approve or decline a store's delivery area */
  .patch(
    "/delivery-zones/:id",
    zValidator("json", z.object({ review: z.enum(["approved", "declined", "pending"]), note: z.string().trim().max(300).nullable().optional() })),
    async (c) => {
      const { review, note } = c.req.valid("json");
      const [row] = await db
        .update(schema.deliveryZones)
        .set({ review, reviewNote: review === "declined" ? (note ?? null) : null })
        .where(eq(schema.deliveryZones.id, c.req.param("id")))
        .returning();
      if (!row) throw notFound("Delivery area not found");
      await audit(db, { actorId: c.get("user").id, action: `delivery_zone.${review}`, entityType: "delivery_zone", entityId: row.id, details: { merchantId: row.merchantId } });
      return c.json(row);
    },
  )
  /** A store's private documents (CAC certificate and the like), for reviewing it */
  .get("/media/private/:id", async (c) => {
    const [row] = await db.select().from(schema.media).where(eq(schema.media.id, c.req.param("id")));
    if (!row) throw notFound("File not found");
    return c.body(new Uint8Array(row.data), 200, { "Content-Type": row.contentType, "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"` });
  })
  /** Approve (go live), suspend or send a store back to review. Approving emails the owner. */
  .patch(
    "/merchants/:id/status",
    ADMIN,
    requirePassword,
    zValidator("json", z.object({ status: z.enum(["pending", "approved", "suspended"]), note: z.string().max(500).optional() })),
    async (c) => {
      const { status, note } = c.req.valid("json");
      const actor = c.get("user");
      const [before] = await db.select().from(schema.merchants).where(eq(schema.merchants.id, c.req.param("id")));
      if (!before) throw notFound("Store not found");
      const store = await db.transaction(async (tx) => {
        // Approving a store approves its token too: the ticker is fixed and the token is created on Monad
        const [row] = await tx
          .update(schema.merchants)
          .set({ status, ...(status === "approved" && !before.tokenApprovedAt && { tokenApprovedAt: new Date() }) })
          .where(eq(schema.merchants.id, before.id))
          .returning();
        await audit(tx, { actorId: actor.id, action: "merchant.status", entityType: "merchant", entityId: before.id, details: { from: before.status, to: status, note: note ?? null } });
        return row;
      });
      // Gives the store its token id and queues the token for Monad
      if (store.tokenApprovedAt && !store.tokenId) await ensureStoreTokens();
      if (status === "approved" && before.status !== "approved" && store.ownerId) {
        const [owner] = await db.select({ email: users.email, name: users.fullName }).from(users).where(eq(users.id, store.ownerId));
        if (owner) sendEmailLater(storeVerifiedEmail(store.contactEmail ?? owner.email, { name: owner.name, store: store.name }));
      }
      return c.json(store);
    },
  );
