import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { PaymentInstructions } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, HttpError, notFound } from "../lib/errors";
import { requireFeature } from "../services/features";
import { moneyMovesConfigured } from "../services/moneymoves";
import { cancelOrder, placeOrder } from "../services/orders";
import { getSetting } from "../services/settings";

const { orders, orderItems, payments, orderStatusHistory } = schema;

export const paymentMethodSchema = z.enum(["bank_transfer", "online", "crypto", "cash", "pos_terminal"]);
export const lineSchema = z.object({ variantId: z.uuid(), quantity: z.number().int().positive().max(100) });

const placeOrderSchema = z.object({
  items: z.array(lineSchema).min(1).max(50),
  fulfilmentType: z.enum(["delivery", "pickup"]),
  branchId: z.uuid(),
  deliveryAddress: z
    .object({
      recipientName: z.string().min(1),
      phone: z.string().min(5),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
    })
    .optional(),
  paymentMethod: paymentMethodSchema,
  cryptoAsset: z.string().optional(),
  promoCode: z.string().max(40).optional(),
  idempotencyKey: z.string().min(8).max(100),
});

/** Full order with items, payments, history and how-to-pay instructions. */
export async function loadOrderDetail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;

  const [items, paymentRows, history, branch, method] = await Promise.all([
    itemsWithImages([orderId]),
    db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt)),
    order.branchId ? db.select().from(schema.branches).where(eq(schema.branches.id, order.branchId)) : Promise.resolve([]),
    db.select().from(schema.paymentMethods).where(eq(schema.paymentMethods.code, order.paymentMethod)),
  ]);

  let paymentInstructions: PaymentInstructions | null = null;
  if (order.status === "pending_payment") {
    paymentInstructions = { method: order.paymentMethod, text: method[0]?.instructions ?? null };
    if (order.paymentMethod === "bank_transfer") {
      const bank = await getSetting<{ bankName: string | null; accountName: string | null; accountNumber: string | null }>("bank_transfer");
      Object.assign(paymentInstructions, bank);
    }
    if (order.paymentMethod === "crypto" && order.cryptoAsset) {
      const [asset] = await db.select().from(schema.cryptoAssets).where(eq(schema.cryptoAssets.symbol, order.cryptoAsset));
      Object.assign(paymentInstructions, {
        cryptoAsset: asset?.symbol,
        cryptoNetwork: asset?.network,
        receivingAddress: asset?.receivingAddress,
      });
    }
  }

  const { idempotencyKey: _k, ...publicOrder } = order;
  return { ...publicOrder, items, payments: paymentRows.map(({ raw: _raw, ...p }) => p), history, branch: branch[0] ?? null, paymentInstructions };
}

/** Order items with the product's first photo, for thumbnails. */
export async function itemsWithImages(orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db
    .select({ ...getTableColumns(orderItems), productId: schema.products.id, imageUrl: sql<string | null>`${schema.products.images}[1]` })
    .from(orderItems)
    .leftJoin(schema.productVariants, eq(schema.productVariants.id, orderItems.variantId))
    .leftJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(inArray(orderItems.orderId, orderIds));
}

export const orderRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .post("/", zValidator("json", placeOrderSchema), async (c) => {
    const input = c.req.valid("json");
    const features = await requireFeature("ordering", "Online ordering is paused right now. Please try again later.");
    if (input.fulfilmentType === "delivery" && !features.delivery) throw badRequest("Delivery isn't available right now. Choose store pickup.");
    if (input.fulfilmentType === "pickup" && !features.pickup) throw badRequest("Store pickup isn't available right now. Choose delivery.");
    if (input.promoCode && !features.promoCodes) throw badRequest("Promo codes can't be used right now");
    // Don't take an order nobody can pay for.
    if (input.paymentMethod === "online" && !moneyMovesConfigured()) throw new HttpError(503, "Online payments aren't set up yet. Please contact us to order.");
    const order = await placeOrder(c.get("user").id, input);
    return c.json(order, 201);
  })
  .get("/", async (c) => {
    const rows = await db.select().from(orders).where(eq(orders.customerId, c.get("user").id)).orderBy(desc(orders.createdAt)).limit(100);
    const items = await itemsWithImages(rows.map((r) => r.id));
    return c.json(rows.map(({ idempotencyKey: _k, ...o }) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })));
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const [owned] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id)));
    if (!owned) throw notFound("Order not found");
    return c.json(await loadOrderDetail(owned.id));
  })
  .post("/:id/cancel", async (c) => {
    return c.json(await cancelOrder(c.get("user"), c.req.param("id")));
  });
