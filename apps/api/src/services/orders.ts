// Order lifecycle. All totals, discounts and stock changes are computed here, inside
// database transactions with row locks, so online and in-store sales cannot oversell.
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { OrderStatus, PaymentMethodCode, PlaceOrderInput } from "@sotechy/shared";
import { notifyOrderStatus } from "./order-notices";
import { db, schema, type Tx } from "../db/client";
import { audit } from "../lib/audit";
import type { AuthUser } from "../lib/auth";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { findPromotion } from "./promotions";
import { deliveryFeeFor, getSetting, type DeliverySettings } from "./settings";
import { agreedPriceFor, releaseOffers } from "./offers";
import { payoutsForStatus } from "./payouts";
import { commitSpent, spendForOrder, tokensForStatus } from "./tokens";
import { storeDeliveryCharge } from "./store-delivery";

const { orders, orderItems, payments, inventory, productVariants, products, orderStatusHistory } = schema;
type OrderRow = typeof orders.$inferSelect;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Merge duplicate lines and sort by id so concurrent transactions lock rows in the same order. */
function normaliseLines(items: { variantId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const i of items) {
    if (!Number.isInteger(i.quantity) || i.quantity <= 0) throw badRequest("Invalid quantity");
    merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity);
  }
  return [...merged.entries()]
    .map(([variantId, quantity]) => ({ variantId, quantity }))
    .sort((a, b) => a.variantId.localeCompare(b.variantId));
}

async function lockInventory(tx: Tx, variantId: string, branchId: string) {
  const [row] = await tx
    .select()
    .from(inventory)
    .where(and(eq(inventory.variantId, variantId), eq(inventory.branchId, branchId)))
    .for("update");
  return row;
}

async function loadVariants(tx: Tx, ids: string[]) {
  return tx
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      price: productVariants.price,
      costPrice: productVariants.costPrice,
      isActive: productVariants.isActive,
      productName: products.name,
      isPublished: products.isPublished,
      merchantId: products.merchantId,
      allowDelivery: products.allowDelivery,
      allowPickup: products.allowPickup,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, ids));
}

/**
 * Prices lines from the database and either reserves stock (unpaid orders) or deducts it
 * immediately (in-store sales paid on the spot).
 */
async function priceAndHoldStock(
  tx: Tx,
  lines: { variantId: string; quantity: number }[],
  opts: { branchId: string; mode: "reserve" | "deduct"; fulfilment: "delivery" | "pickup"; requirePublished: boolean; merchantId?: string | null; prices?: Map<string, number> },
) {
  const variants = await loadVariants(tx, lines.map((l) => l.variantId));
  let subtotal = 0;
  const items: Omit<typeof orderItems.$inferInsert, "orderId">[] = [];

  for (const line of lines) {
    const v = variants.find((x) => x.id === line.variantId);
    // A branch sells only its own products: Sotechy's branches Sotechy's stock, a store's branch that store's
    if (!v || !v.isActive || (v.merchantId ?? null) !== (opts.merchantId ?? null) || (opts.requirePublished && !v.isPublished)) {
      throw badRequest("A product in the cart is no longer available");
    }
    if (opts.fulfilment === "delivery" && !v.allowDelivery) throw badRequest(`${v.productName} is available for pickup only`);
    if (opts.fulfilment === "pickup" && !v.allowPickup) throw badRequest(`${v.productName} is available for delivery only`);

    const inv = await lockInventory(tx, v.id, opts.branchId);
    if (!inv || inv.quantity - inv.reserved < line.quantity) {
      throw conflict(`Not enough stock for ${v.productName} at the selected branch`);
    }
    if (opts.mode === "reserve") {
      await tx.update(inventory).set({ reserved: inv.reserved + line.quantity }).where(eq(inventory.id, inv.id));
    } else {
      await tx.update(inventory).set({ quantity: inv.quantity - line.quantity }).where(eq(inventory.id, inv.id));
    }

    // A price agreed with the store replaces the shop price
    const unit = opts.prices?.get(v.id) ?? v.price;
    const lineTotal = round2(unit * line.quantity);
    subtotal += lineTotal;
    items.push({
      variantId: v.id,
      productName: v.productName,
      variantName: v.name,
      sku: v.sku,
      unitPrice: unit,
      unitCost: v.costPrice,
      quantity: line.quantity,
      lineTotal,
    });
  }
  return { subtotal: round2(subtotal), items };
}

async function assertPaymentMethod(tx: Tx, code: PaymentMethodCode, channel: "online" | "in_store", cryptoAsset?: string | null) {
  const [method] = await tx.select().from(schema.paymentMethods).where(eq(schema.paymentMethods.code, code));
  const allowed = method?.isEnabled && (channel === "online" ? method.online : method.inStore);
  if (!allowed) throw badRequest(`${method?.label ?? code} is not available ${channel === "online" ? "online" : "in store"}`);
  if (code === "crypto") {
    const [asset] = await tx
      .select()
      .from(schema.cryptoAssets)
      .where(and(eq(schema.cryptoAssets.symbol, cryptoAsset ?? ""), eq(schema.cryptoAssets.isEnabled, true)));
    if (!asset) throw badRequest("Select a supported crypto asset");
    return asset;
  }
  return null;
}

async function assertBranch(tx: Tx, branchId: string) {
  const [branch] = await tx.select().from(schema.branches).where(eq(schema.branches.id, branchId));
  if (!branch?.isActive) throw badRequest("Select a valid branch");
  return branch;
}

async function holdMinutes(tx: Tx) {
  return (await getSetting<{ minutes: number }>("reservation_hold", tx))?.minutes ?? 30;
}

async function recordStatus(tx: Tx, orderId: string, from: OrderStatus | null, to: OrderStatus, actorId: string | null, note?: string) {
  await tx.insert(orderStatusHistory).values({ orderId, fromStatus: from, toStatus: to, changedBy: actorId, note: note ?? null });
}

async function bumpPromotionUsage(tx: Tx, promotionId: string | null) {
  if (!promotionId) return;
  await tx
    .update(schema.promotions)
    .set({ usageCount: sql`${schema.promotions.usageCount} + 1` })
    .where(eq(schema.promotions.id, promotionId));
}

// ---------------------------------------------------------------------------
// Online checkout
// ---------------------------------------------------------------------------
export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<OrderRow> {
  const existing = await db
    .select()
    .from(orders)
    .where(and(eq(orders.idempotencyKey, input.idempotencyKey), eq(orders.customerId, userId)));
  if (existing[0]) return existing[0];

  if (input.fulfilmentType === "delivery" && !input.deliveryAddress?.line1) {
    throw badRequest("Delivery address is required");
  }

  try {
    return await db.transaction(async (tx) => {
      const asset = await assertPaymentMethod(tx, input.paymentMethod, "online", input.cryptoAsset);
      const branch = await assertBranch(tx, input.branchId);
      if (branch.merchantId) {
        const [store] = await tx.select({ status: schema.merchants.status }).from(schema.merchants).where(eq(schema.merchants.id, branch.merchantId));
        if (store?.status !== "approved") throw badRequest("This store isn't taking orders right now");
      }

      const lines = normaliseLines(input.items);
      if (lines.length === 0) throw badRequest("Cart is empty");
      // Agreed prices: each one is this customer's, still held, and for one item
      const agreed = [];
      for (const line of input.items.filter((i) => i.offerId)) {
        if (input.items.filter((i) => i.variantId === line.variantId).length > 1) throw badRequest("Buy extra ones at the shop price in a separate order");
        agreed.push(await agreedPriceFor(tx, userId, line));
      }
      const prices = new Map(agreed.map((o) => [o!.variantId, o!.agreedPrice!]));

      const { subtotal, items } = await priceAndHoldStock(tx, lines, {
        branchId: input.branchId,
        mode: "reserve",
        fulfilment: input.fulfilmentType,
        requirePublished: true,
        merchantId: branch.merchantId,
        prices,
      });

      // A store charges from its own delivery areas; Sotechy uses its delivery settings
      const { fee: deliveryFee, zoneId, spot } = branch.merchantId
        ? await storeDeliveryCharge(tx, branch.merchantId, {
            fulfilment: input.fulfilmentType,
            state: input.deliveryAddress?.state,
            city: input.deliveryAddress?.city,
            pickupZoneId: input.pickupZoneId,
            pickupPlace: input.pickupPlace,
            variantIds: lines.map((l) => l.variantId),
            subtotal,
          })
        : { fee: input.fulfilmentType === "delivery" ? deliveryFeeFor(await getSetting<DeliverySettings>("delivery", tx), subtotal) : 0, zoneId: null };
      const { promotion, discount } = await findPromotion(tx, {
        subtotal,
        paymentMethod: input.paymentMethod,
        cryptoAsset: input.cryptoAsset,
        code: input.promoCode,
      });
      const total = round2(subtotal - discount + deliveryFee);

      const [order] = await tx
        .insert(orders)
        .values({
          customerId: userId,
          channel: "online",
          branchId: input.branchId,
          merchantId: branch.merchantId,
          deliveryZoneId: zoneId,
          pickupSpot: input.fulfilmentType === "pickup" ? (spot ?? null) : null,
          fulfilmentType: input.fulfilmentType,
          deliveryAddress: input.fulfilmentType === "delivery" ? ({ ...input.deliveryAddress } as Record<string, string>) : null,
          paymentMethod: input.paymentMethod,
          cryptoAsset: asset?.symbol ?? null,
          promotionId: promotion?.id ?? null,
          subtotal,
          discountTotal: discount,
          deliveryFee,
          total,
          idempotencyKey: input.idempotencyKey,
          reservationExpiresAt: new Date(Date.now() + (await holdMinutes(tx)) * 60_000),
          createdBy: userId,
        })
        .returning();

      // Tokens pay for part of it (held now, spent once it's paid); the store is still paid in full
      const spent = await spendForOrder(tx, { userId, orderId: order.id, merchantId: branch.merchantId, total, tokens: input.tokens ?? [] });
      const due = round2(total - spent.value);
      if (spent.value > 0) {
        const [withTokens] = await tx.update(orders).set({ tokensValue: spent.value, tokensUsed: spent.used, total: due }).where(eq(orders.id, order.id)).returning();
        Object.assign(order, withTokens);
      }

      await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order.id })));
      if (agreed.length) await tx.update(schema.offers).set({ status: "used", orderId: order.id }).where(inArray(schema.offers.id, agreed.map((o) => o!.id)));
      await tx.insert(payments).values({
        orderId: order.id,
        method: input.paymentMethod,
        amount: due,
        cryptoAsset: asset?.symbol ?? null,
        cryptoNetwork: asset?.network ?? null,
      });
      await recordStatus(tx, order.id, null, "pending_payment", userId, "Order placed");
      return order;
    });
  } catch (err) {
    // A concurrent request with the same idempotency key won the race: return its order.
    if ((err as { code?: string }).code === "23505") {
      const [dup] = await db.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey));
      if (dup && dup.customerId === userId) return dup;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Stock helpers
// ---------------------------------------------------------------------------
async function itemsFor(tx: Tx, orderId: string) {
  return tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(orderItems.variantId);
}

/** Converts an order's reservation into a real deduction. */
async function commitReservedStock(tx: Tx, order: OrderRow, actorId: string | null) {
  if (order.stockCommitted || !order.branchId) return;
  for (const item of await itemsFor(tx, order.id)) {
    const inv = await lockInventory(tx, item.variantId, order.branchId);
    if (!inv) throw conflict(`Inventory row missing for ${item.productName}`);
    await tx
      .update(inventory)
      .set({ quantity: inv.quantity - item.quantity, reserved: Math.max(inv.reserved - item.quantity, 0) })
      .where(eq(inventory.id, inv.id));
    await tx.insert(schema.stockMovements).values({
      variantId: item.variantId,
      branchId: order.branchId,
      movementType: "sale",
      quantity: -item.quantity,
      referenceType: "order",
      referenceId: order.id,
      performedBy: actorId,
    });
  }
  await tx.update(orders).set({ stockCommitted: true }).where(eq(orders.id, order.id));
}

async function releaseReservedStock(tx: Tx, order: OrderRow) {
  if (order.stockCommitted || !order.branchId) return;
  for (const item of await itemsFor(tx, order.id)) {
    await tx
      .update(inventory)
      .set({ reserved: sql`greatest(${inventory.reserved} - ${item.quantity}, 0)` })
      .where(and(eq(inventory.variantId, item.variantId), eq(inventory.branchId, order.branchId)));
  }
}

async function returnCommittedStock(tx: Tx, order: OrderRow, actorId: string) {
  if (!order.stockCommitted || !order.branchId) return;
  for (const item of await itemsFor(tx, order.id)) {
    await tx
      .update(inventory)
      .set({ quantity: sql`${inventory.quantity} + ${item.quantity}` })
      .where(and(eq(inventory.variantId, item.variantId), eq(inventory.branchId, order.branchId)));
    await tx.insert(schema.stockMovements).values({
      variantId: item.variantId,
      branchId: order.branchId,
      movementType: "return",
      quantity: item.quantity,
      referenceType: "order",
      referenceId: order.id,
      performedBy: actorId,
      note: "Order cancelled",
    });
  }
  await tx.update(orders).set({ stockCommitted: false }).where(eq(orders.id, order.id));
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

/**
 * Marks a payment confirmed and the order paid. Only call this after a trusted source verified
 * the money arrived: a signed provider webhook, a provider/chain lookup, or a manager checking
 * the bank account. Idempotent: confirming twice is a no-op.
 */
export async function confirmPayment(
  paymentId: string,
  opts: {
    amountPaid: number;
    providerReference?: string;
    txHash?: string;
    provider?: string;
    raw?: unknown;
    verifiedBy: string | null;
    note?: string;
  },
) {
  let paidOrderId: string | null = null;
  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!payment) throw notFound("Payment not found");
    if (payment.status === "confirmed") return { payment, alreadyConfirmed: true };
    if (payment.status !== "pending") throw conflict(`Payment is already ${payment.status}`);
    if (opts.amountPaid + 0.005 < payment.amount) throw badRequest("Amount received is less than the amount due");

    const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).for("update");

    const [updated] = await tx
      .update(payments)
      .set({
        status: "confirmed",
        verifiedAt: new Date(),
        verifiedBy: opts.verifiedBy,
        provider: opts.provider ?? payment.provider,
        providerReference: opts.providerReference ?? payment.providerReference,
        txHash: opts.txHash ?? payment.txHash,
        verificationNote: opts.note ?? null,
        raw: opts.raw ?? payment.raw,
      })
      .where(eq(payments.id, paymentId))
      .returning();

    if (order.status === "pending_payment" || order.status === "payment_failed") {
      await commitReservedStock(tx, order, opts.verifiedBy);
      await tx.update(orders).set({ status: "paid", reservationExpiresAt: null }).where(eq(orders.id, order.id));
      // The tokens held for it are spent now that it's paid
      await commitSpent(tx, order);
      await recordStatus(tx, order.id, order.status, "paid", opts.verifiedBy, "Payment confirmed");
      await bumpPromotionUsage(tx, order.promotionId);
      paidOrderId = order.id;
    } else {
      // Money arrived for an order that was cancelled/expired: needs a manual refund or reinstatement.
      await audit(tx, {
        actorId: opts.verifiedBy,
        action: "payment.confirmed_for_inactive_order",
        entityType: "order",
        entityId: order.id,
        details: { orderStatus: order.status, paymentId },
      });
    }

    await audit(tx, {
      actorId: opts.verifiedBy,
      action: "payment.confirmed",
      entityType: "payment",
      entityId: paymentId,
      details: { orderId: order.id, amount: opts.amountPaid, reference: opts.providerReference ?? opts.txHash ?? null },
    });
    return { payment: updated, alreadyConfirmed: false };
  });
  if (paidOrderId) void notifyOrderStatus(paidOrderId, "paid");
  return result;
}

/** Manager confirms a bank transfer / in-store crypto transfer after checking the account or chain. */
export async function verifyPaymentManually(actor: AuthUser, paymentId: string, input: { reference: string; note?: string }) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment) throw notFound("Payment not found");
  if (payment.method !== "bank_transfer" && payment.method !== "crypto") {
    throw badRequest("Only bank transfers and direct crypto transfers are verified manually");
  }
  return confirmPayment(paymentId, {
    amountPaid: payment.amount,
    providerReference: payment.method === "bank_transfer" ? input.reference : undefined,
    txHash: payment.method === "crypto" ? input.reference : undefined,
    provider: "manual",
    verifiedBy: actor.id,
    note: input.note,
  });
}

// ---------------------------------------------------------------------------
// Status changes & cancellation
// ---------------------------------------------------------------------------
const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["processing", "ready_for_pickup", "dispatched"],
  processing: ["ready_for_pickup", "dispatched"],
  ready_for_pickup: ["delivered"],
  dispatched: ["delivered"],
};

export async function updateOrderStatus(actor: AuthUser, orderId: string, to: OrderStatus, note?: string) {
  const updated = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw notFound("Order not found");
    if (!TRANSITIONS[order.status]?.includes(to)) {
      throw badRequest(`Cannot move an order from ${order.status} to ${to}. Payments and cancellations have their own actions.`);
    }
    if (to === "ready_for_pickup" && order.fulfilmentType !== "pickup") throw badRequest("This is a delivery order");
    if (to === "dispatched" && order.fulfilmentType !== "delivery") throw badRequest("This is a pickup order");

    const [updated] = await tx.update(orders).set({ status: to }).where(eq(orders.id, orderId)).returning();
    await recordStatus(tx, orderId, order.status, to, actor.id, note);
    await audit(tx, { actorId: actor.id, action: "order.status", entityType: "order", entityId: orderId, details: { from: order.status, to } });
    return updated;
  });
  void notifyOrderStatus(orderId, to);
  if (updated.merchantId) await payoutsForStatus(orderId, to);
  await tokensForStatus(orderId, to);
  return updated;
}

/** `asStoreId`: a marketplace store declining its own order (it can't cancel anyone else's) */
export async function cancelOrder(actor: AuthUser, orderId: string, note?: string, opts: { asStoreId?: string } = {}) {
  const updated = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw notFound("Order not found");

    if (opts.asStoreId) {
      if (order.merchantId !== opts.asStoreId) throw notFound("Order not found");
    } else if (actor.role === "customer") {
      if (order.customerId !== actor.id) throw notFound("Order not found");
      if (order.status !== "pending_payment") throw badRequest("Only unpaid orders can be cancelled. Contact support for help.");
    }
    const cancellable: OrderStatus[] = ["pending_payment", "payment_failed", "paid", "processing", "ready_for_pickup"];
    if (!cancellable.includes(order.status)) throw badRequest(`A ${order.status} order cannot be cancelled`);

    if (order.stockCommitted) await returnCommittedStock(tx, order, actor.id);
    else await releaseReservedStock(tx, order);
    if (order.status === "pending_payment" || order.status === "payment_failed") await releaseOffers(tx, orderId);

    await tx.update(payments).set({ status: "expired" }).where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));

    // Paid orders get a refund request that a manager processes from the admin dashboard.
    const [confirmed] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, "confirmed")));
    if (confirmed) {
      await tx.insert(schema.refunds).values({
        orderId,
        paymentId: confirmed.id,
        amount: confirmed.amount,
        reason: note ?? "Order cancelled",
        requestedBy: actor.id,
      });
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: "cancelled", reservationExpiresAt: null })
      .where(eq(orders.id, orderId))
      .returning();
    await recordStatus(tx, orderId, order.status, "cancelled", actor.id, note ?? "Cancelled");
    await audit(tx, { actorId: actor.id, action: "order.cancel", entityType: "order", entityId: orderId, details: { from: order.status } });
    return updated;
  });
  // Customers who cancel their own unpaid order don't need telling
  if (actor.id !== updated.customerId) void notifyOrderStatus(orderId, "cancelled");
  if (updated.merchantId) await payoutsForStatus(orderId, "cancelled");
  await tokensForStatus(orderId, "cancelled");
  return updated;
}

/** Changes the tokens put towards one of the customer's unpaid orders (they're only held until it's paid).
 *  The amount to pay changes with them, and any open payment page is replaced by a fresh one. */
export async function setOrderTokens(userId: string, orderId: string, tokens: { ticker: string; amount: number }[]) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, userId))).for("update");
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending_payment") throw badRequest("This order isn't waiting for payment");
    const gross = round2(order.total + order.tokensValue);
    // Free this order's own hold first, so its tokens count as available again
    await tx.update(orders).set({ tokensUsed: null, tokensValue: 0 }).where(eq(orders.id, order.id));
    const held = await spendForOrder(tx, { userId, orderId: order.id, merchantId: order.merchantId, total: gross, tokens });
    const due = round2(gross - held.value);
    const [updated] = await tx
      .update(orders)
      .set({ tokensUsed: held.used.length ? held.used : null, tokensValue: held.value, total: due })
      .where(eq(orders.id, order.id))
      .returning();
    // The pending payment asks for the new amount; the next payment page is made fresh (keeping the attempt count)
    const [payment] = await tx.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")));
    if (payment) {
      const attempt = (payment.raw as { checkout?: { attempt?: number } } | null)?.checkout?.attempt ?? 0;
      await tx.update(payments).set({ amount: due, raw: { checkout: { attempt } } }).where(eq(payments.id, payment.id));
    }
    return updated;
  });
}

/** Cancels unpaid orders whose stock hold has expired. Runs on an interval from index.ts. */
export async function releaseExpiredReservations() {
  const expired = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), eq(orders.stockCommitted, false), lt(orders.reservationExpiresAt, new Date())))
    .limit(100);

  for (const { id } of expired) {
    const cancelled = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update", { skipLocked: true });
      if (!order || order.status !== "pending_payment") return false;
      await releaseReservedStock(tx, order);
      await releaseOffers(tx, id);
      await tx.update(payments).set({ status: "expired" }).where(and(eq(payments.orderId, id), eq(payments.status, "pending")));
      await tx.update(orders).set({ status: "cancelled", reservationExpiresAt: null }).where(eq(orders.id, id));
      await recordStatus(tx, id, "pending_payment", "cancelled", null, "Payment window expired");
      return true;
    });
    if (cancelled) {
      void notifyOrderStatus(id, "cancelled");
      await tokensForStatus(id, "cancelled");
    }
  }
  return expired.length;
}

// ---------------------------------------------------------------------------
// In-store (walk-in) sales
// ---------------------------------------------------------------------------
export interface WalkInSaleInput {
  branchId: string;
  items: { variantId: string; quantity: number }[];
  paymentMethod: PaymentMethodCode;
  paymentReference?: string;
  cryptoAsset?: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
}

export async function recordWalkInSale(actor: AuthUser, input: WalkInSaleInput) {
  if (actor.role === "staff" && actor.branchId && actor.branchId !== input.branchId) {
    throw forbidden("Staff can only record sales for their own branch");
  }
  // Cash and POS-terminal payments are confirmed by the staff member at the till.
  // Transfers and crypto stay pending until a manager verifies them.
  const paidOnTheSpot = input.paymentMethod === "cash" || input.paymentMethod === "pos_terminal";

  return db.transaction(async (tx) => {
    const asset = await assertPaymentMethod(tx, input.paymentMethod, "in_store", input.cryptoAsset);
    await assertBranch(tx, input.branchId);
    const lines = normaliseLines(input.items);
    if (lines.length === 0) throw badRequest("Add at least one item");

    const { subtotal, items } = await priceAndHoldStock(tx, lines, {
      branchId: input.branchId,
      mode: paidOnTheSpot ? "deduct" : "reserve",
      fulfilment: "pickup",
      requirePublished: false,
    });
    const { promotion, discount } = await findPromotion(tx, { subtotal, paymentMethod: input.paymentMethod, cryptoAsset: asset?.symbol });
    const total = round2(subtotal - discount);

    const [order] = await tx
      .insert(orders)
      .values({
        channel: "in_store",
        branchId: input.branchId,
        fulfilmentType: "pickup",
        walkInCustomer: { name: input.customerName, phone: input.customerPhone },
        status: paidOnTheSpot ? "delivered" : "pending_payment",
        paymentMethod: input.paymentMethod,
        cryptoAsset: asset?.symbol ?? null,
        promotionId: promotion?.id ?? null,
        subtotal,
        discountTotal: discount,
        total,
        stockCommitted: paidOnTheSpot,
        reservationExpiresAt: paidOnTheSpot ? null : new Date(Date.now() + (await holdMinutes(tx)) * 60_000),
        notes: input.note ?? null,
        createdBy: actor.id,
      })
      .returning();

    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order.id })));
    await tx.insert(payments).values({
      orderId: order.id,
      method: input.paymentMethod,
      provider: paidOnTheSpot ? "in_store" : null,
      providerReference: paidOnTheSpot ? (input.paymentReference ?? null) : null,
      amount: total,
      cryptoAsset: asset?.symbol ?? null,
      cryptoNetwork: asset?.network ?? null,
      status: paidOnTheSpot ? "confirmed" : "pending",
      verifiedAt: paidOnTheSpot ? new Date() : null,
      verifiedBy: paidOnTheSpot ? actor.id : null,
    });

    if (paidOnTheSpot) {
      for (const item of items) {
        await tx.insert(schema.stockMovements).values({
          variantId: item.variantId,
          branchId: input.branchId,
          movementType: "sale",
          quantity: -item.quantity,
          referenceType: "order",
          referenceId: order.id,
          performedBy: actor.id,
        });
      }
      await bumpPromotionUsage(tx, promotion?.id ?? null);
      await recordStatus(tx, order.id, null, "delivered", actor.id, "Walk-in sale");
    } else {
      await recordStatus(tx, order.id, null, "pending_payment", actor.id, "Walk-in sale awaiting payment verification");
    }
    await audit(tx, { actorId: actor.id, action: "pos.sale", entityType: "order", entityId: order.id, details: { total, method: input.paymentMethod } });
    return order;
  });
}
