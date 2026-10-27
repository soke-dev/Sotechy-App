// Orders, payments, refunds, inventory and walk-in sales.
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { audit } from "../../lib/audit";
import { MANAGERS, requireRole, type AppEnv } from "../../lib/auth";
import { badRequest, notFound } from "../../lib/errors";
import { adjustStock, transferStock } from "../../services/inventory";
import { cancelOrder, recordWalkInSale, updateOrderStatus, verifyPaymentManually } from "../../services/orders";
import { lineSchema, loadOrderDetail, paymentMethodSchema } from "../orders";
import { notifyOrderStatus } from "../../services/order-notices";

const { orders, payments, refunds, inventory, productVariants, products, branches, stockMovements, users } = schema;

const orderStatusSchema = z.enum([
  "pending_payment", "paid", "processing", "ready_for_pickup", "dispatched", "delivered", "cancelled", "payment_failed", "refunded",
]);

export const adminOperationsRoutes = new Hono<AppEnv>()
  // --- Orders ---
  .get("/orders", async (c) => {
    const { status, channel, branchId } = c.req.query();
    const filters: SQL[] = [];
    if (status) filters.push(eq(orders.status, orderStatusSchema.parse(status)));
    if (channel === "online" || channel === "in_store") filters.push(eq(orders.channel, channel));
    if (branchId) filters.push(eq(orders.branchId, branchId));
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        channel: orders.channel,
        fulfilmentType: orders.fulfilmentType,
        paymentMethod: orders.paymentMethod,
        total: orders.total,
        createdAt: orders.createdAt,
        customerEmail: users.email,
        customerName: users.fullName,
        walkInCustomer: orders.walkInCustomer,
        branchName: branches.name,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.customerId))
      .leftJoin(branches, eq(branches.id, orders.branchId))
      .where(and(...filters))
      .orderBy(desc(orders.createdAt))
      .limit(200);
    return c.json(rows);
  })
  .get("/orders/:id", async (c) => {
    const detail = await loadOrderDetail(c.req.param("id"));
    if (!detail) throw notFound("Order not found");
    const customer = detail.customerId
      ? (await db.select({ email: users.email, fullName: users.fullName, phone: users.phone }).from(users).where(eq(users.id, detail.customerId)))[0]
      : null;
    return c.json({ ...detail, customer });
  })
  .post("/orders/:id/status", zValidator("json", z.object({ status: orderStatusSchema, note: z.string().max(500).optional() })), async (c) => {
    const { status, note } = c.req.valid("json");
    return c.json(await updateOrderStatus(c.get("user"), c.req.param("id"), status, note));
  })
  .post("/orders/:id/cancel", zValidator("json", z.object({ note: z.string().max(500).optional() })), async (c) => {
    return c.json(await cancelOrder(c.get("user"), c.req.param("id"), c.req.valid("json").note));
  })

  // --- Payments ---
  .get("/payments", async (c) => {
    const { status } = c.req.query();
    const rows = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        orderNumber: orders.orderNumber,
        method: payments.method,
        provider: payments.provider,
        providerReference: payments.providerReference,
        txHash: payments.txHash,
        amount: payments.amount,
        cryptoAsset: payments.cryptoAsset,
        status: payments.status,
        verifiedAt: payments.verifiedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(status ? eq(payments.status, z.enum(["pending", "confirmed", "failed", "expired", "refunded"]).parse(status)) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(200);
    return c.json(rows);
  })
  .post(
    "/payments/:id/verify",
    requireRole(...MANAGERS),
    zValidator("json", z.object({ reference: z.string().min(3).max(200), note: z.string().max(500).optional() })),
    async (c) => c.json(await verifyPaymentManually(c.get("user"), c.req.param("id"), c.req.valid("json"))),
  )

  // --- Refunds ---
  .get("/refunds", async (c) => {
    const rows = await db
      .select({ refund: refunds, orderNumber: orders.orderNumber })
      .from(refunds)
      .innerJoin(orders, eq(orders.id, refunds.orderId))
      .orderBy(desc(refunds.createdAt))
      .limit(200);
    return c.json(rows.map((r) => ({ ...r.refund, orderNumber: r.orderNumber })));
  })
  .patch(
    "/refunds/:id",
    requireRole(...MANAGERS),
    zValidator("json", z.object({ status: z.enum(["approved", "rejected", "processed"]) })),
    async (c) => {
      const actor = c.get("user");
      const { status } = c.req.valid("json");
      const refund = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(refunds)
          .set({ status, processedBy: actor.id, processedAt: status === "processed" ? new Date() : null })
          .where(eq(refunds.id, c.req.param("id")))
          .returning();
        if (!row) throw notFound("Refund not found");
        if (status === "processed") {
          await tx.update(orders).set({ status: "refunded" }).where(eq(orders.id, row.orderId));
          if (row.paymentId) await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, row.paymentId));
        }
        await audit(tx, { actorId: actor.id, action: `refund.${status}`, entityType: "refund", entityId: row.id, details: { amount: row.amount } });
        return row;
      });
      if (status === "processed") void notifyOrderStatus(refund.orderId, "refunded");
      return c.json(refund);
    },
  )

  // --- Inventory ---
  .get("/inventory", async (c) => {
    const { branchId } = c.req.query();
    const rows = await db
      .select({
        id: inventory.id,
        variantId: inventory.variantId,
        branchId: inventory.branchId,
        branchName: branches.name,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.name,
        sku: productVariants.sku,
        quantity: inventory.quantity,
        reserved: inventory.reserved,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(inventory)
      .innerJoin(branches, eq(branches.id, inventory.branchId))
      .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(branchId ? eq(inventory.branchId, branchId) : undefined)
      .orderBy(products.name)
      .limit(1000);
    return c.json(rows.map((r) => ({ ...r, available: r.quantity - r.reserved, isLow: r.quantity - r.reserved <= r.lowStockThreshold })));
  })
  .get("/inventory/movements", async (c) => {
    const rows = await db
      .select({
        id: stockMovements.id,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        sku: productVariants.sku,
        productName: products.name,
        branchName: branches.name,
        performedBy: users.email,
      })
      .from(stockMovements)
      .innerJoin(productVariants, eq(productVariants.id, stockMovements.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(branches, eq(branches.id, stockMovements.branchId))
      .leftJoin(users, eq(users.id, stockMovements.performedBy))
      .orderBy(desc(stockMovements.createdAt))
      .limit(300);
    return c.json(rows);
  })
  .post(
    "/inventory/adjust",
    requireRole(...MANAGERS),
    zValidator(
      "json",
      z.object({
        variantId: z.uuid(),
        branchId: z.uuid(),
        delta: z.number().int(),
        type: z.enum(["restock", "adjustment", "return"]),
        note: z.string().max(500).optional(),
      }),
    ),
    async (c) => c.json(await adjustStock(c.get("user"), c.req.valid("json"))),
  )
  .post(
    "/inventory/transfer",
    requireRole(...MANAGERS),
    zValidator(
      "json",
      z.object({ variantId: z.uuid(), fromBranchId: z.uuid(), toBranchId: z.uuid(), quantity: z.number().int().positive(), note: z.string().max(500).optional() }),
    ),
    async (c) => c.json(await transferStock(c.get("user"), c.req.valid("json"))),
  )

  // --- Walk-in sales (staff interface) ---
  .post(
    "/pos/sales",
    zValidator(
      "json",
      z.object({
        branchId: z.uuid(),
        items: z.array(lineSchema).min(1).max(50),
        paymentMethod: paymentMethodSchema,
        paymentReference: z.string().max(200).optional(),
        cryptoAsset: z.string().optional(),
        customerName: z.string().max(120).optional(),
        customerPhone: z.string().max(30).optional(),
        note: z.string().max(500).optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");
      if (input.paymentMethod === "online") throw badRequest("Online payment is for the app and website. Use POS terminal, transfer or cash in store");
      return c.json(await recordWalkInSale(c.get("user"), input), 201);
    },
  );
