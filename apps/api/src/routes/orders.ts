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
import { cancelOrder, placeOrder, updateOrderStatus } from "../services/orders";
import { finalDueNow, holdFinal } from "../services/payouts";
import { sendEmailLater } from "../lib/email";
import { orderNotReceivedEmail } from "../emails/templates";
import { sendPushLater } from "../services/push";
import { getSetting } from "../services/settings";

const { orders, orderItems, payments, orderStatusHistory } = schema;

export const paymentMethodSchema = z.enum(["bank_transfer", "online", "crypto", "cash", "pos_terminal"]);
export const lineSchema = z.object({ variantId: z.uuid(), quantity: z.number().int().positive().max(100), offerId: z.uuid().optional() });

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
  pickupZoneId: z.uuid().optional(),
  tokens: z.array(z.object({ ticker: z.string().min(1).max(12), amount: z.number().int().min(0).max(1_000_000_000) })).max(2).optional(),
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

  // A pickup order is collected at the store's pickup location, or at a change Sotechy approved
  let pickupLocation: string | null = null;
  if (order.fulfilmentType === "pickup") {
    const [zone] = order.deliveryZoneId
      ? await db.select({ point: schema.deliveryZones.pickupPoint, address: schema.deliveryZones.pickupAddress }).from(schema.deliveryZones).where(eq(schema.deliveryZones.id, order.deliveryZoneId))
      : [];
    pickupLocation = order.pickupChangeStatus === "approved" ? order.pickupChangePoint : [zone?.point, zone?.address].filter(Boolean).join(", ") || null;
  }
  const { idempotencyKey: _k, pickupChangePoint: _p, pickupChangeStatus: _ps, pickupChangeAt: _pa, ...publicOrder } = order;
  return { ...publicOrder, items, payments: paymentRows.map(({ raw: _raw, ...p }) => p), history, branch: branch[0] ?? null, paymentInstructions, pickupLocation };
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
  })
  /** The customer collected a pickup order that was ready: it's delivered and confirmed, and the store's final payment is due */
  .post("/:id/picked-up", async (c) => {
    const user = c.get("user");
    const [o] = await db.select().from(orders).where(and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id)));
    if (!o) throw notFound("Order not found");
    if (o.fulfilmentType !== "pickup") throw badRequest("This is a delivery order");
    if (o.status !== "ready_for_pickup") throw badRequest(o.status === "delivered" ? "This order is already collected" : "This order isn't ready for pickup yet");
    await db.update(orders).set({ customerConfirmedAt: new Date() }).where(eq(orders.id, o.id));
    await updateOrderStatus(user, o.id, "delivered", "Collected (confirmed by the customer)");
    if (o.merchantId) {
      await finalDueNow(o.id);
      const [store] = await db.select({ ownerId: schema.merchants.ownerId }).from(schema.merchants).where(eq(schema.merchants.id, o.merchantId));
      if (store?.ownerId) sendPushLater([store.ownerId], { audience: "store", kind: "order", title: "Order collected", body: `The customer collected ${o.orderNumber}. Your final payment is on its way.`, data: { url: `/orders/${o.id}` } });
    }
    return c.json(await loadOrderDetail(o.id));
  })
  /** The customer got their order. The store's final payment falls due straight away. */
  .post("/:id/received", async (c) => {
    const user = c.get("user");
    const [o] = await db
      .update(orders)
      .set({ customerConfirmedAt: new Date() })
      .where(and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id), eq(orders.status, "delivered"), sql`${orders.customerConfirmedAt} is null`))
      .returning();
    if (!o) {
      const [owned] = await db.select({ status: orders.status }).from(orders).where(and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id)));
      if (!owned) throw notFound("Order not found");
      if (owned.status !== "delivered") throw badRequest("The store hasn't marked this order delivered yet");
    } else {
      await db.insert(schema.orderStatusHistory).values({ orderId: o.id, fromStatus: "delivered", toStatus: "delivered", note: "Customer confirmed they got it", changedBy: user.id });
      if (o.merchantId) {
        await finalDueNow(o.id, !!o.customerIssueAt);
        const [store] = await db.select({ ownerId: schema.merchants.ownerId }).from(schema.merchants).where(eq(schema.merchants.id, o.merchantId));
        if (store?.ownerId) sendPushLater([store.ownerId], { audience: "store", kind: "order", title: "Delivery confirmed", body: `The customer got ${o.orderNumber}. Your final payment is on its way.`, data: { url: `/orders/${o.id}` } });
      }
    }
    return c.json(await loadOrderDetail(c.req.param("id")));
  })
  /** The store marked it delivered but the customer didn't get it: hold the final payment and tell Sotechy */
  .post("/:id/not-received", zValidator("json", z.object({ note: z.string().trim().max(300).optional() }).default({})), async (c) => {
    const user = c.get("user");
    const note = c.req.valid("json").note || null;
    const [o] = await db
      .update(orders)
      .set({ customerIssueAt: new Date(), customerIssueNote: note })
      .where(
        and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id), eq(orders.status, "delivered"), sql`${orders.customerConfirmedAt} is null`, sql`${orders.customerIssueAt} is null`),
      )
      .returning();
    if (!o) {
      const [owned] = await db.select({ status: orders.status }).from(orders).where(and(eq(orders.id, c.req.param("id")), eq(orders.customerId, user.id)));
      if (!owned) throw notFound("Order not found");
      if (owned.status !== "delivered") throw badRequest("The store hasn't marked this order delivered yet");
    } else {
      await db.insert(schema.orderStatusHistory).values({ orderId: o.id, fromStatus: "delivered", toStatus: "delivered", note: note ? `Customer says they didn't get it: ${note}` : "Customer says they didn't get it", changedBy: user.id });
      let storeName = "Sotechy";
      if (o.merchantId) {
        await holdFinal(o.id);
        const [store] = await db.select({ name: schema.merchants.name, ownerId: schema.merchants.ownerId }).from(schema.merchants).where(eq(schema.merchants.id, o.merchantId));
        storeName = store?.name ?? storeName;
        if (store?.ownerId) sendPushLater([store.ownerId], { audience: "store", kind: "order", title: "Customer didn't get it", body: `The customer says ${o.orderNumber} hasn't reached them. Sotechy will be in touch.`, data: { url: `/orders/${o.id}` } });
      }
      const [me] = await db.select({ username: schema.users.username, fullName: schema.users.fullName, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, user.id));
      const customer = me?.username ? `@${me.username}` : (me?.fullName ?? me?.email ?? "The customer");
      const admins = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.role, "admin"));
      for (const a of admins) sendEmailLater(orderNotReceivedEmail(a.email, { name: a.name, store: storeName, orderNumber: o.orderNumber, customer, note, orderId: o.id }));
    }
    return c.json(await loadOrderDetail(c.req.param("id")));
  });
