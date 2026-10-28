// Store tokens and receipts. The ledger here is what counts: every change is a token entry, and each
// entry (and each receipt) is queued for the chain, where the chain service copies it.
//
// Earning: 1 of the store's token per ₦1 of goods (paid in money) when an order is delivered, plus 10%
// in $SOTECHY at other stores, plus a review bonus. Spending: tokens pay for part of an order at the
// store that issued them ($SOTECHY anywhere). Spent tokens go to Sotechy's reserve wallet; once the order
// is delivered half move on to the recycling pool, which pays review bonuses before anything new is minted.
// The naira side is the reserve: 1% of every sale comes in, and it covers the stores for spent tokens.
// Wallets are custodial: an address worked out from the user id, with no key.
import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, isNull, like, notInArray, or, sql } from "drizzle-orm";
import { getAddress, keccak256, stringToHex, toBytes, type Address, type Hex } from "viem";
import { TOKEN_RULES, tokensToNaira, type OrderStatus } from "@sotechy/shared";
import { db, schema, type Tx } from "../db/client";
import { badRequest, notFound } from "../lib/errors";
import { sendPushLater } from "./push";

const { tokenEntries: entries, chainOps, receipts, merchants, orders, users, reserveEntries } = schema;

export const SOTECHY_TOKEN = { id: 1, ticker: "SOTECHY", name: "Sotechy" } as const;
export const CROSS_BONUS = TOKEN_RULES.crossBonus;
/** Sotechy's own wallets on the ledger (and on chain): spent tokens land in the reserve wallet, half then go to the recycling pool */
export const RESERVE_WALLET = "00000000-0000-4000-8000-000000000001";
export const RECYCLE_WALLET = "00000000-0000-4000-8000-000000000002";
const SYSTEM = [RESERVE_WALLET, RECYCLE_WALLET];
const PENDING: OrderStatus[] = ["paid", "processing", "ready_for_pickup", "dispatched"];

/** A wallet's address: from the user id, so there's no key to lose or steal */
export const walletAddress = (userId: string): Address => getAddress(`0x${keccak256(toBytes(`sotechy:wallet:${userId}`)).slice(-40)}`);

/** A real transaction (not one marked as moved to a new contract, or skipped on the other chain) */
const isTxHash = (tx: string | null): tx is string => !!tx && /^0x[0-9a-f]{64}$/i.test(tx);

/** A ledger id as the bytes32 recorded with the change on chain */
const refOf = (uuid: string): Hex => `0x${uuid.replace(/-/g, "").padEnd(64, "0")}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

type Entry = Omit<typeof entries.$inferInsert, "id">;

/** Writes a ledger entry and queues it for the chain, in the caller's transaction. Null if its source was already recorded. */
async function record(tx: Tx, entry: Entry) {
  const [row] = await tx.insert(entries).values(entry).onConflictDoNothing().returning();
  if (!row) return null;
  await tx.insert(chainOps).values({
    contract: "tokens",
    kind: row.kind,
    sourceId: row.id,
    ref: refOf(row.id),
    data: {
      tokenId: row.tokenId,
      amount: row.amount,
      ...(row.fromUserId && { from: walletAddress(row.fromUserId) }),
      ...(row.toUserId && { to: walletAddress(row.toUserId) }),
    },
  });
  return row;
}

/** A change to the naira reserve; each source once */
const toReserve = (tx: Tx, entry: Omit<typeof reserveEntries.$inferInsert, "id">) => tx.insert(reserveEntries).values(entry).onConflictDoNothing();

const lockWallet = (tx: Tx, userId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet:${userId}`}))`);

async function balanceOf(tx: Pick<Tx, "select">, userId: string, tokenId: number) {
  const [row] = await tx
    .select({ n: sql<number>`coalesce(sum(case when ${entries.toUserId} = ${userId} then ${entries.amount} else -${entries.amount} end), 0)::int` })
    .from(entries)
    .where(and(eq(entries.tokenId, tokenId), or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId))));
  return Number(row?.n ?? 0);
}

/** Gives every approved store a token id and queues its token for the chain (and $SOTECHY's) */
export async function ensureStoreTokens() {
  await db
    .insert(chainOps)
    .values({ contract: "tokens", kind: "register", sourceId: `token:${SOTECHY_TOKEN.id}`, ref: refOf("0"), data: { tokenId: SOTECHY_TOKEN.id, ticker: SOTECHY_TOKEN.ticker } })
    .onConflictDoNothing();
  const waiting = await db.select({ id: merchants.id }).from(merchants).where(and(isNotNull(merchants.tokenApprovedAt), isNull(merchants.tokenId))).orderBy(merchants.tokenApprovedAt);
  for (const { id } of waiting) {
    await db.transaction(async (tx) => {
      // One at a time, so two approvals can't take the same number
      await tx.execute(sql`select pg_advisory_xact_lock(4207)`);
      // Past the highest number any store has or that was ever created on chain (a deleted store's number isn't reused)
      const [{ next }] = (
        await tx.execute<{ next: number }>(sql`select greatest(
          coalesce((select max(${merchants.tokenId}) from ${merchants}), ${SOTECHY_TOKEN.id}),
          coalesce((select max((${chainOps.data}->>'tokenId')::int) from ${chainOps} where ${chainOps.contract} = 'tokens' and ${chainOps.kind} = 'register'), ${SOTECHY_TOKEN.id})
        ) + 1 as next`)
      ).rows;
      const [store] = await tx.update(merchants).set({ tokenId: next }).where(and(eq(merchants.id, id), isNull(merchants.tokenId))).returning();
      if (!store) return;
      await tx
        .insert(chainOps)
        .values({ contract: "tokens", kind: "register", sourceId: `token:${next}`, ref: refOf("0"), data: { tokenId: next, ticker: store.ticker } })
        .onConflictDoNothing();
    });
  }
}

async function tokenOf(merchantId: string | null, tx: Pick<Tx, "select"> = db) {
  if (!merchantId) return SOTECHY_TOKEN.id;
  const [store] = await tx.select({ tokenId: merchants.tokenId }).from(merchants).where(eq(merchants.id, merchantId));
  return store?.tokenId ?? null;
}

/** What an order earns: its goods, less what tokens paid for (delivery doesn't earn) */
const earning = (o: { subtotal: number; discountTotal: number; tokensValue: number }) => Math.max(0, Math.floor(o.subtotal - o.discountTotal - o.tokensValue));

/** Called after an order's status changes */
export async function tokensForStatus(orderId: string, status: OrderStatus) {
  try {
    if (status === "delivered") await settleDelivered(orderId);
    else if (status === "cancelled") await returnSpent(orderId);
    else if (status === "refunded") await giveBackForOrder(orderId);
  } catch (err) {
    console.error(`Tokens for order ${orderId} failed`, err);
  }
}

/** Delivery: tokens and a receipt for the customer, 1% of the sale to the reserve, and half the spent tokens to the recycling pool */
async function settleDelivered(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;
  const tokenId = await tokenOf(order.merchantId);
  const goods = Math.max(0, order.subtotal - order.discountTotal);
  // What the customer earned this time (nothing if it was already settled), to tell them
  let earned: { amount: number; bonus: number } | null = null;
  await db.transaction(async (tx) => {
    const feeRate = await currentFeeRate(tx);
    if (goods > 0) await toReserve(tx, { kind: "fee_share", amount: round2(goods * feeRate * TOKEN_RULES.reserveShare), orderId, sourceKey: `fee:${orderId}` });
    for (const used of order.tokensUsed ?? []) {
      const half = Math.floor(used.amount / 2);
      if (half > 0) await record(tx, { tokenId: used.tokenId, kind: "move", fromUserId: RESERVE_WALLET, toUserId: RECYCLE_WALLET, amount: half, reason: "recycled", orderId, sourceKey: `recycle:${orderId}:${used.tokenId}` });
    }
    if (!order.customerId || !tokenId) return;
    const amount = earning(order);
    if (amount > 0) {
      const minted = await record(tx, { tokenId, kind: "mint", toUserId: order.customerId, amount, reason: "earned", orderId, sourceKey: `earn:${orderId}:${tokenId}` });
      const bonus = Math.floor(amount * CROSS_BONUS);
      const gotBonus = tokenId !== SOTECHY_TOKEN.id && bonus > 0;
      if (gotBonus) await record(tx, { tokenId: SOTECHY_TOKEN.id, kind: "mint", toUserId: order.customerId, amount: bonus, reason: "bonus", orderId, sourceKey: `bonus:${orderId}` });
      if (minted) earned = { amount, bonus: gotBonus ? bonus : 0 };
    }
    await issueReceipt(tx, order, tokenId);
  });
  // "You earned 850 $STAND", plus the $SOTECHY bonus from another store
  const got = earned as { amount: number; bonus: number } | null;
  if (got && order.customerId) {
    const ticker = tokenId === SOTECHY_TOKEN.id ? SOTECHY_TOKEN.ticker : ((await db.select({ ticker: merchants.ticker }).from(merchants).where(eq(merchants.tokenId, tokenId!)))[0]?.ticker ?? "tokens");
    sendPushLater([order.customerId], {
      kind: "tokens",
      title: `You earned ${got.amount.toLocaleString("en-NG")} $${ticker}`,
      body: got.bonus ? `Plus ${got.bonus.toLocaleString("en-NG")} $SOTECHY, for order ${order.orderNumber}. Spend them at checkout.` : `For order ${order.orderNumber}. Spend them at checkout.`,
      data: { url: "/wallet" },
    });
  }
}

async function currentFeeRate(tx: Tx) {
  const [row] = await tx.select({ value: schema.appSettings.value }).from(schema.appSettings).where(eq(schema.appSettings.key, "payouts"));
  const rate = (row?.value as { feeRate?: number } | undefined)?.feeRate;
  return typeof rate === "number" ? rate : TOKEN_RULES.feeRate;
}

/** A refunded order takes back what it earned, as far as the customer still has it */
async function giveBackForOrder(orderId: string) {
  await db.transaction(async (tx) => {
    const earned = await tx.select().from(entries).where(and(eq(entries.orderId, orderId), eq(entries.kind, "mint")));
    for (const e of earned) {
      if (!e.toUserId) continue;
      await lockWallet(tx, e.toUserId);
      const amount = Math.min(e.amount, await balanceOf(tx, e.toUserId, e.tokenId));
      if (amount > 0) await record(tx, { tokenId: e.tokenId, kind: "burn", fromUserId: e.toUserId, amount, reason: "refunded", orderId, note: e.reason, sourceKey: `refund:${e.id}` });
    }
  });
}

// ---------------------------------------------------------------------------
// Paying with tokens
// ---------------------------------------------------------------------------

/**
 * Takes the tokens a customer chose to pay with, in the order's transaction. Only the store's own token
 * and $SOTECHY count, and some money is always paid. Returns their naira value and what was used.
 */
export async function spendForOrder(tx: Tx, input: { userId: string; orderId: string; merchantId: string | null; total: number; tokens: { ticker: string; amount: number }[] }) {
  // Placing the order only holds the tokens: they're spent when the payment is confirmed (commitSpent), so
  // a customer who leaves the payment keeps them. Held tokens can't be used for anything else meanwhile.
  const wanted = input.tokens.filter((t) => t.amount > 0);
  if (!wanted.length) return { value: 0, used: [] as { tokenId: number; ticker: string; amount: number }[] };
  const storeToken = input.merchantId ? (await tx.select({ id: merchants.tokenId, ticker: merchants.ticker }).from(merchants).where(eq(merchants.id, input.merchantId)))[0] : null;
  const used: { tokenId: number; ticker: string; amount: number }[] = [];
  for (const t of wanted) {
    const ticker = t.ticker.toUpperCase().replace(/^\$/, "");
    const tokenId = ticker === SOTECHY_TOKEN.ticker ? SOTECHY_TOKEN.id : storeToken?.id && storeToken.ticker === ticker ? storeToken.id : null;
    if (!tokenId) throw badRequest(`$${ticker} can't be spent on this order. Use this store's own token or $SOTECHY.`);
    if (used.some((u) => u.tokenId === tokenId)) throw badRequest(`$${ticker} is listed twice`);
    used.push({ tokenId, ticker, amount: Math.floor(t.amount) });
  }
  const value = round2(used.reduce((n, u) => n + tokensToNaira(u.amount), 0));
  const most = Math.max(0, input.total - TOKEN_RULES.minCashPerOrder);
  if (value > most) throw badRequest(`Tokens can pay up to ₦${most.toLocaleString("en-NG")} of this order; at least ₦${TOKEN_RULES.minCashPerOrder} is paid in money`);
  await lockWallet(tx, input.userId);
  for (const u of used) {
    const has = await availableOf(tx, input.userId, u.tokenId);
    if (u.amount > has) throw badRequest(`You have ${has.toLocaleString("en-NG")} $${u.ticker} free to use`);
  }
  return { value, used };
}

/** The payment arrived: the tokens held for the order are spent now (moved to the reserve wallet) */
export async function commitSpent(tx: Tx, order: { id: string; customerId: string | null; tokensUsed: { tokenId: number; ticker: string; amount: number }[] | null; tokensValue: number }) {
  if (!order.customerId || !order.tokensUsed?.length) return;
  const [already] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.orderId, order.id), eq(entries.reason, "spent"))).limit(1);
  if (already) return; // spent when placed, before this change
  await lockWallet(tx, order.customerId);
  for (const u of order.tokensUsed) {
    // Held since the order was placed, so it's there; never take more than the balance
    const amount = Math.min(u.amount, await balanceOf(tx, order.customerId, u.tokenId));
    if (amount > 0) await record(tx, { tokenId: u.tokenId, kind: "move", fromUserId: order.customerId, toUserId: RESERVE_WALLET, amount, reason: "spent", orderId: order.id, createdBy: order.customerId, sourceKey: `spend:${order.id}:${u.tokenId}` });
  }
  if (order.tokensValue > 0) await toReserve(tx, { kind: "spent", amount: -order.tokensValue, orderId: order.id, sourceKey: `spend:${order.id}` });
}

/** Tokens a customer has put towards orders not paid yet: kept for those orders, not spendable elsewhere */
async function heldFor(tx: Pick<Tx, "execute">, userId: string, tokenId?: number) {
  const result = await tx.execute(sql`
    select (u->>'tokenId')::int as "tokenId", coalesce(sum((u->>'amount')::int), 0)::int as amount
    from orders o, jsonb_array_elements(coalesce(o.tokens_used, '[]'::jsonb)) u
    where o.customer_id = ${userId}
      and o.status in ('pending_payment', 'payment_failed')
      and not exists (select 1 from token_entries e where e.order_id = o.id and e.reason = 'spent')
      ${tokenId === undefined ? sql`` : sql`and (u->>'tokenId')::int = ${tokenId}`}
    group by 1`);
  return result.rows as { tokenId: number; amount: number }[];
}

/** What a customer can use right now: their balance less what's held for unpaid orders */
async function availableOf(tx: Pick<Tx, "select" | "execute">, userId: string, tokenId: number) {
  const [held] = await heldFor(tx, userId, tokenId);
  return (await balanceOf(tx, userId, tokenId)) - Number(held?.amount ?? 0);
}

/** A cancelled (or expired) order gives back the tokens it was paying with */
async function returnSpent(orderId: string) {
  await db.transaction(async (tx) => {
    const spent = await tx.select().from(entries).where(and(eq(entries.orderId, orderId), eq(entries.reason, "spent")));
    if (!spent.length) return;
    const [order] = await tx.select({ tokensValue: orders.tokensValue }).from(orders).where(eq(orders.id, orderId));
    for (const e of spent) {
      if (!e.fromUserId) continue;
      await record(tx, { tokenId: e.tokenId, kind: "move", fromUserId: RESERVE_WALLET, toUserId: e.fromUserId, amount: e.amount, reason: "returned", orderId, sourceKey: `return:${orderId}:${e.tokenId}` });
    }
    if (order?.tokensValue) await toReserve(tx, { kind: "returned", amount: order.tokensValue, orderId, sourceKey: `return:${orderId}` });
  });
}

// ---------------------------------------------------------------------------
// Review bonus
// ---------------------------------------------------------------------------

/**
 * A review of something the customer had delivered earns a share of its price in the store's token:
 * 5%, or 10% with a photo (adding a photo later tops it up). Paid from the recycling pool first.
 */
export async function reviewBonus(userId: string, productId: string, hasPhoto: boolean) {
  const [line] = await db
    .select({ orderId: orders.id, merchantId: orders.merchantId, lineTotal: schema.orderItems.lineTotal })
    .from(orders)
    .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, orders.id))
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
    .where(and(eq(orders.customerId, userId), eq(orders.status, "delivered"), eq(schema.productVariants.productId, productId)))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (!line) return null;
  const tokenId = await tokenOf(line.merchantId);
  if (!tokenId) return null;
  const key = `review:${line.orderId}:${productId}`;
  const target = Math.floor(line.lineTotal * (hasPhoto ? TOKEN_RULES.photoReviewBonus : TOKEN_RULES.reviewBonus));
  return db.transaction(async (tx) => {
    await lockWallet(tx, RECYCLE_WALLET);
    const [given] = await tx.select({ n: sql<number>`coalesce(sum(${entries.amount}), 0)::int` }).from(entries).where(like(entries.sourceKey, `${key}:%`));
    const owed = target - Number(given?.n ?? 0);
    if (owed <= 0) return null;
    const stage = hasPhoto ? "photo" : "text";
    const fromPool = Math.min(owed, await balanceOf(tx, RECYCLE_WALLET, tokenId));
    if (fromPool > 0) await record(tx, { tokenId, kind: "move", fromUserId: RECYCLE_WALLET, toUserId: userId, amount: fromPool, reason: "review", orderId: line.orderId, sourceKey: `${key}:${stage}:pool` });
    if (owed > fromPool) await record(tx, { tokenId, kind: "mint", toUserId: userId, amount: owed - fromPool, reason: "review", orderId: line.orderId, sourceKey: `${key}:${stage}:mint` });
    return { tokenId, amount: owed };
  });
}

// ---------------------------------------------------------------------------
// Walk-in sales (the store pays the fee first; see walk-in.ts)
// ---------------------------------------------------------------------------

export async function earnForWalkIn(tx: Tx, sale: { id: string; merchantId: string; customerId: string; amount: number; fee: number }) {
  const tokenId = await tokenOf(sale.merchantId, tx);
  if (!tokenId) throw badRequest("This store's token isn't created yet");
  const amount = Math.floor(sale.amount);
  await record(tx, { tokenId, kind: "mint", toUserId: sale.customerId, amount, reason: "walk_in", sourceKey: `walkin:${sale.id}:earn` });
  const bonus = Math.floor(amount * CROSS_BONUS);
  if (bonus > 0) await record(tx, { tokenId: SOTECHY_TOKEN.id, kind: "mint", toUserId: sale.customerId, amount: bonus, reason: "bonus", sourceKey: `walkin:${sale.id}:bonus` });
  // The whole walk-in fee backs the tokens it pays for
  await toReserve(tx, { kind: "walk_in_fee", amount: round2(sale.fee), walkInId: sale.id, sourceKey: `walkin:${sale.id}` });
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

async function issueReceipt(tx: Tx, order: typeof orders.$inferSelect, tokenId: number) {
  const [done] = await tx.select({ id: receipts.id }).from(receipts).where(eq(receipts.orderId, order.id));
  if (done || !order.customerId) return;
  const items = await tx
    .select({ name: schema.orderItems.productName, option: schema.orderItems.variantName, qty: schema.orderItems.quantity, unitPrice: schema.orderItems.unitPrice, lineTotal: schema.orderItems.lineTotal })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));
  const [store] = order.merchantId ? await tx.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, order.merchantId)) : [{ name: SOTECHY_TOKEN.name }];
  const [row] = await tx.insert(receipts).values({ orderId: order.id, userId: order.customerId, tokenId, content: {}, fingerprint: "" }).returning({ id: receipts.id });
  const content = {
    receipt: row.id,
    order: order.orderNumber,
    store: store?.name ?? "",
    storeToken: tokenId,
    date: new Date().toISOString(),
    items,
    subtotal: order.subtotal,
    discount: order.discountTotal,
    deliveryFee: order.deliveryFee,
    paidWithTokens: order.tokensValue,
    tokens: order.tokensUsed ?? [],
    total: order.total,
    salt: randomBytes(16).toString("hex"),
  };
  const fingerprint = fingerprintOf(content);
  await tx.update(receipts).set({ content, fingerprint }).where(eq(receipts.id, row.id));
  await tx.insert(chainOps).values({
    contract: "receipts",
    kind: "receipt",
    sourceId: String(row.id),
    ref: stringToHex(order.orderNumber, { size: 32 }),
    data: { receiptId: row.id, to: walletAddress(order.customerId), store: tokenId, fingerprint },
  });
}

/** keccak256 of the receipt with its keys in a fixed order, so anyone can recompute it */
export function fingerprintOf(content: Record<string, unknown>): Hex {
  const canonical = (v: unknown): string =>
    Array.isArray(v)
      ? `[${v.map(canonical).join(",")}]`
      : v && typeof v === "object"
        ? `{${Object.keys(v)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
            .join(",")}}`
        : JSON.stringify(v);
  return keccak256(toBytes(canonical(content)));
}

/** The receipt for one of the customer's orders, with what's needed to check it on chain */
export async function receiptFor(userId: string, orderId: string) {
  const [r] = await db.select().from(receipts).where(and(eq(receipts.orderId, orderId), eq(receipts.userId, userId)));
  if (!r) return null;
  const [op] = await db.select({ tx: chainOps.monadTx, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "receipts"), eq(chainOps.sourceId, String(r.id))));
  return { id: r.id, content: r.content, fingerprint: r.fingerprint, tx: op?.at && isTxHash(op.tx) ? op.tx : null };
}

// ---------------------------------------------------------------------------
// The customer's wallet
// ---------------------------------------------------------------------------

async function tokenStores(ids: number[]) {
  const map = new Map<number, { tokenId: number; ticker: string; store: string; slug: string | null; logoUrl: string | null }>();
  map.set(SOTECHY_TOKEN.id, { tokenId: SOTECHY_TOKEN.id, ticker: SOTECHY_TOKEN.ticker, store: SOTECHY_TOKEN.name, slug: null, logoUrl: null });
  const storeIds = ids.filter((id) => id !== SOTECHY_TOKEN.id);
  if (storeIds.length) {
    const rows = await db.select({ tokenId: merchants.tokenId, ticker: merchants.ticker, store: merchants.name, slug: merchants.slug, logoUrl: merchants.logoUrl }).from(merchants).where(inArray(merchants.tokenId, storeIds));
    for (const r of rows) map.set(r.tokenId!, { ...r, tokenId: r.tokenId! });
  }
  return map;
}

/** Every token the customer holds or has on the way, with the store it belongs to */
export async function walletFor(userId: string) {
  const held = await db
    .select({
      tokenId: entries.tokenId,
      amount: sql<number>`sum(case when ${entries.toUserId} = ${userId} then ${entries.amount} else -${entries.amount} end)::int`,
    })
    .from(entries)
    .where(or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId)))
    .groupBy(entries.tokenId);
  const pendingOrders = await db
    .select({ merchantId: orders.merchantId, subtotal: orders.subtotal, discountTotal: orders.discountTotal, tokensValue: orders.tokensValue })
    .from(orders)
    .where(and(eq(orders.customerId, userId), inArray(orders.status, PENDING)));

  const pending = new Map<number, number>();
  const add = (id: number, n: number) => n > 0 && pending.set(id, (pending.get(id) ?? 0) + n);
  for (const o of pendingOrders) {
    const tokenId = await tokenOf(o.merchantId);
    if (!tokenId) continue;
    add(tokenId, earning(o));
    if (tokenId !== SOTECHY_TOKEN.id) add(SOTECHY_TOKEN.id, Math.floor(earning(o) * CROSS_BONUS));
  }

  // Held for orders not paid yet: shown apart, back in the balance if the order is cancelled or expires
  const reserved = await heldFor(db, userId);
  const ids = [...new Set([...held.map((h) => h.tokenId), ...pending.keys()])];
  const stores = await tokenStores(ids);
  const balances = ids
    .map((id) => {
      const onHold = Number(reserved.find((r) => r.tokenId === id)?.amount ?? 0);
      return { ...stores.get(id)!, amount: Number(held.find((h) => h.tokenId === id)?.amount ?? 0) - onHold, held: onHold, pending: pending.get(id) ?? 0 };
    })
    .filter((b) => b.ticker && (b.amount > 0 || b.pending > 0 || b.held > 0))
    .sort((a, b) => (a.tokenId === SOTECHY_TOKEN.id ? -1 : b.tokenId === SOTECHY_TOKEN.id ? 1 : b.amount - a.amount));
  // Earned in all, per token: orders, the $SOTECHY bonus, reviews and walk-ins, less what refunds took back
  const earnedRows = await db
    .select({
      tokenId: entries.tokenId,
      n: sql<number>`coalesce(sum(case when ${entries.toUserId} = ${userId} and ${entries.reason} in ('earned', 'bonus', 'review', 'walk_in') then ${entries.amount} when ${entries.fromUserId} = ${userId} and ${entries.reason} = 'refunded' then -${entries.amount} else 0 end), 0)::int`,
    })
    .from(entries)
    .where(or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId)))
    .groupBy(entries.tokenId);
  const earnedOf = (id: number) => Math.max(0, Number(earnedRows.find((e) => e.tokenId === id)?.n ?? 0));
  return {
    address: walletAddress(userId),
    balances: balances.map((b) => ({ ...b, earned: earnedOf(b.tokenId) })),
    totalEarned: earnedRows.reduce((n, e) => n + Math.max(0, Number(e.n)), 0),
    activity: await activityFor(userId),
  };
}

type ActivityKind = "earned" | "bonus" | "review" | "walk_in" | "spent" | "returned" | "sent" | "received" | "refunded";

function kindOf(r: typeof entries.$inferSelect, userId: string): ActivityKind {
  if (r.reason === "spent") return "spent";
  if (r.reason === "returned") return "returned";
  if (r.reason === "review") return "review";
  if (r.reason === "walk_in") return "walk_in";
  if (r.reason === "refunded") return "refunded";
  if (r.reason === "bonus") return "bonus";
  if (r.kind === "move") return r.toUserId === userId ? "received" : "sent";
  return "earned";
}

export async function activityFor(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(entries)
    .where(or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId)))
    .orderBy(desc(entries.createdAt))
    .limit(limit);
  const stores = await tokenStores([...new Set(rows.map((r) => r.tokenId))]);
  const others = [...new Set(rows.flatMap((r) => (r.kind === "move" ? [r.fromUserId === userId ? r.toUserId : r.fromUserId] : [])).filter((x): x is string => !!x && !SYSTEM.includes(x)))];
  const names = others.length ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, others)) : [];
  const orderIds = [...new Set(rows.map((r) => r.orderId).filter((x): x is string => !!x))];
  const numbers = orderIds.length ? await db.select({ id: orders.id, number: orders.orderNumber }).from(orders).where(inArray(orders.id, orderIds)) : [];
  const ops = rows.length ? await db.select({ sourceId: chainOps.sourceId, tx: chainOps.monadTx, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "tokens"), inArray(chainOps.sourceId, rows.map((r) => r.id)))) : [];
  return rows.map((r) => {
    const incoming = r.toUserId === userId;
    const other = r.kind === "move" ? (incoming ? r.fromUserId : r.toUserId) : null;
    const op = ops.find((o) => o.sourceId === r.id);
    return {
      id: r.id,
      kind: kindOf(r, userId),
      ticker: stores.get(r.tokenId)?.ticker ?? "",
      store: stores.get(r.tokenId)?.store ?? "",
      amount: incoming ? r.amount : -r.amount,
      who: other && !SYSTEM.includes(other) ? (names.find((n) => n.id === other)?.username ?? null) : null,
      order: numbers.find((n) => n.id === r.orderId)?.number ?? null,
      at: r.createdAt.toISOString(),
      /** Set once it's written on Monad */
      tx: op?.at && isTxHash(op.tx) ? op.tx : null,
    };
  });
}

/** The account behind a Sotechy wallet address. Addresses are worked out from user ids, so any account
 *  that hasn't had its address saved yet gets it saved here before looking again. */
async function userByWallet(address: string) {
  const wanted = getAddress(address);
  const find = () => db.select({ id: users.id }).from(users).where(eq(users.walletAddress, wanted));
  const [found] = await find();
  if (found) return found;
  const missing = await db.select({ id: users.id }).from(users).where(isNull(users.walletAddress));
  for (const u of missing) await db.update(users).set({ walletAddress: walletAddress(u.id) }).where(eq(users.id, u.id));
  return missing.length ? (await find())[0] : undefined;
}

export const isWalletAddress = (s: string) => /^0x[0-9a-f]{40}$/i.test(s.trim());

/** Who "@username" or "0x…" (a Sotechy wallet address) is, or undefined */
export async function recipientFor(to: string) {
  const value = to.trim();
  const found = isWalletAddress(value) ? await userByWallet(value) : (await db.select({ id: users.id }).from(users).where(eq(users.username, value.replace(/^@/, "").toLowerCase())))[0];
  if (!found) return undefined;
  const [u] = await db.select({ id: users.id, username: users.username, fullName: users.fullName, avatarStyle: users.avatarStyle, isActive: users.isActive }).from(users).where(eq(users.id, found.id));
  return u?.isActive ? u : undefined;
}

/** What to say when no account matches */
export const noRecipient = (to: string) => (isWalletAddress(to) ? "No Sotechy wallet has that address" : `No one on Sotechy is @${to.trim().replace(/^@/, "").toLowerCase()}`);

/** Sends tokens to another Sotechy account by @username or Sotechy wallet address */
export async function sendTokens(fromUserId: string, input: { to: string; ticker: string; amount: number }) {
  const to = await recipientFor(input.to);
  if (!to) throw notFound(noRecipient(input.to));
  if (to.id === fromUserId) throw badRequest("You can't send tokens to yourself");
  const ticker = input.ticker.toUpperCase().replace(/^\$/, "");
  const tokenId = ticker === SOTECHY_TOKEN.ticker ? SOTECHY_TOKEN.id : (await db.select({ id: merchants.tokenId }).from(merchants).where(eq(merchants.ticker, ticker)))[0]?.id;
  if (!tokenId) throw notFound(`There's no $${ticker} token`);
  return db.transaction(async (tx) => {
    await lockWallet(tx, fromUserId);
    const has = await availableOf(tx, fromUserId, tokenId);
    if (input.amount > has) throw badRequest(`You have ${has.toLocaleString("en-NG")} $${ticker} free to send`);
    const row = await record(tx, { tokenId, kind: "move", fromUserId, toUserId: to.id, amount: input.amount, reason: "sent", createdBy: fromUserId });
    const [sender] = await tx.select({ username: users.username }).from(users).where(eq(users.id, fromUserId));
    sendPushLater([to.id], { kind: "tokens", title: `You received ${input.amount.toLocaleString("en-NG")} $${ticker}`, body: `From ${sender?.username ? `@${sender.username}` : "a Sotechy user"}`, data: { url: "/wallet" } });
    return { id: row!.id, to: to.username, ticker, amount: input.amount };
  });
}

// ---------------------------------------------------------------------------
// Totals for the admin and the stores
// ---------------------------------------------------------------------------

/** Per token: what customers hold, what's ever been earned, what's in Sotechy's two wallets */
async function supplyByToken(tokenIds?: number[]) {
  const scope = tokenIds ? inArray(entries.tokenId, tokenIds) : undefined;
  const signed = (id: string) => sql<number>`coalesce(sum(case when ${entries.toUserId} = ${id} then ${entries.amount} when ${entries.fromUserId} = ${id} then -${entries.amount} else 0 end), 0)::int`;
  return db
    .select({
      tokenId: entries.tokenId,
      minted: sql<number>`coalesce(sum(case when ${entries.kind} = 'mint' then ${entries.amount} end), 0)::int`,
      burned: sql<number>`coalesce(sum(case when ${entries.kind} = 'burn' then ${entries.amount} end), 0)::int`,
      spent: sql<number>`coalesce(sum(case when ${entries.reason} = 'spent' then ${entries.amount} when ${entries.reason} = 'returned' then -${entries.amount} end), 0)::int`,
      walkIn: sql<number>`coalesce(sum(case when ${entries.reason} = 'walk_in' then ${entries.amount} end), 0)::int`,
      reserveWallet: signed(RESERVE_WALLET),
      recyclePool: signed(RECYCLE_WALLET),
    })
    .from(entries)
    .where(scope)
    .groupBy(entries.tokenId);
}

const customerHeld = (s: { minted: number; burned: number; reserveWallet: number; recyclePool: number }) => s.minted - s.burned - s.reserveWallet - s.recyclePool;

/** Customers holding a token now, biggest first */
async function holdersOf(tokenId: number, limit?: number) {
  const balance = sql<number>`sum(case when ${entries.toUserId} = ${users.id} then ${entries.amount} else -${entries.amount} end)::int`;
  const q = db
    .select({ userId: users.id, username: users.username, amount: balance })
    .from(entries)
    .innerJoin(users, or(eq(entries.toUserId, users.id), eq(entries.fromUserId, users.id)))
    .where(and(eq(entries.tokenId, tokenId), notInArray(users.id, SYSTEM)))
    .groupBy(users.id, users.username)
    .having(sql`${balance} > 0`)
    .orderBy(desc(balance));
  return limit ? q.limit(limit) : q;
}

/** Each token's supply and holders, for the admin */
export async function tokenRegistry() {
  const rows = await supplyByToken();
  const registered = await db.select({ data: chainOps.data, at: chainOps.monadAt, tx: chainOps.monadTx }).from(chainOps).where(and(eq(chainOps.contract, "tokens"), eq(chainOps.kind, "register")));
  const ids = [...new Set(registered.map((r) => Number(r.data.tokenId)))];
  // On chain when created on the current contract (a token copied to a new contract counts once that's written)
  const live = new Set(registered.filter((r) => r.at && !r.tx?.startsWith("moved:")).map((r) => Number(r.data.tokenId)));
  const stores = await tokenStores(ids);
  const holders = await Promise.all(ids.map(async (id) => [id, (await holdersOf(id)).length] as const));
  return ids
    .map((id) => {
      const r = rows.find((x) => x.tokenId === id);
      return {
        ...stores.get(id)!,
        supply: r ? customerHeld(r) : 0,
        minted: r?.minted ?? 0,
        spent: r?.spent ?? 0,
        recyclePool: r?.recyclePool ?? 0,
        holders: holders.find(([h]) => h === id)?.[1] ?? 0,
        onChain: live.has(id),
      };
    })
    .filter((t) => t.ticker)
    .sort((a, b) => a.tokenId - b.tokenId);
}

/** The naira reserve against the tokens customers hold */
export async function reserveSummary() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [totals] = await db
    .select({
      balance: sql<number>`coalesce(sum(${reserveEntries.amount}), 0)::float`,
      inThisMonth: sql<number>`coalesce(sum(case when ${reserveEntries.amount} > 0 and ${reserveEntries.createdAt} >= ${monthStart} then ${reserveEntries.amount} end), 0)::float`,
      outThisMonth: sql<number>`coalesce(-sum(case when ${reserveEntries.amount} < 0 and ${reserveEntries.createdAt} >= ${monthStart} then ${reserveEntries.amount} end), 0)::float`,
      walkInFeesThisMonth: sql<number>`coalesce(sum(case when ${reserveEntries.kind} = 'walk_in_fee' and ${reserveEntries.createdAt} >= ${monthStart} then ${reserveEntries.amount} end), 0)::float`,
    })
    .from(reserveEntries);
  const supply = await supplyByToken();
  const held = supply.reduce((n, s) => n + customerHeld(s), 0);
  const recyclePool = supply.reduce((n, s) => n + s.recyclePool, 0);
  const owed = tokensToNaira(held);
  const balance = round2(Number(totals?.balance ?? 0));
  // Where spent tokens go: the reserve wallet, then half on to the recycling pool for review bonuses
  const wallet = (key: "reserve" | "recycle", id: string, pick: (s: (typeof supply)[number]) => number) => ({
    key,
    address: walletAddress(id),
    total: supply.reduce((n, s) => n + pick(s), 0),
    byToken: supply.filter((s) => pick(s) > 0).map((s) => ({ tokenId: s.tokenId, amount: pick(s) })),
  });
  return {
    wallets: [wallet("reserve", RESERVE_WALLET, (s) => s.reserveWallet), wallet("recycle", RECYCLE_WALLET, (s) => s.recyclePool)],
    balance,
    tokensHeld: held,
    owed,
    cover: owed > 0 ? balance / owed : null,
    recyclePool,
    inThisMonth: round2(Number(totals?.inThisMonth ?? 0)),
    outThisMonth: round2(Number(totals?.outThisMonth ?? 0)),
    walkInFeesThisMonth: round2(Number(totals?.walkInFeesThisMonth ?? 0)),
  };
}

/** A store's own token, for its dashboard */
export async function storeTokenStats(merchantId: string) {
  const [store] = await db.select({ tokenId: merchants.tokenId, ticker: merchants.ticker }).from(merchants).where(eq(merchants.id, merchantId));
  if (!store?.tokenId) return null;
  const tokenId = store.tokenId;
  const [supply] = await supplyByToken([tokenId]);
  const pendingOrders = await db
    .select({ subtotal: orders.subtotal, discountTotal: orders.discountTotal, tokensValue: orders.tokensValue })
    .from(orders)
    .where(and(eq(orders.merchantId, merchantId), inArray(orders.status, PENDING)));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [walkIns] = await db
    .select({ n: sql<number>`coalesce(sum(${entries.amount}), 0)::int` })
    .from(entries)
    .where(and(eq(entries.tokenId, tokenId), eq(entries.reason, "walk_in"), gte(entries.createdAt, monthStart)));
  const [reserve] = await db
    .select({ n: sql<number>`coalesce(sum(${reserveEntries.amount}), 0)::float` })
    .from(reserveEntries)
    .innerJoin(orders, eq(orders.id, reserveEntries.orderId))
    .where(eq(orders.merchantId, merchantId));
  const [walkInReserve] = await db
    .select({ n: sql<number>`coalesce(sum(${reserveEntries.amount}), 0)::float` })
    .from(reserveEntries)
    .innerJoin(schema.walkInSales, eq(schema.walkInSales.id, reserveEntries.walkInId))
    .where(eq(schema.walkInSales.merchantId, merchantId));
  const holders = await holdersOf(tokenId);
  const recent = await db.select().from(entries).where(eq(entries.tokenId, tokenId)).orderBy(desc(entries.createdAt)).limit(15);
  const people = [...new Set(recent.flatMap((r) => [r.toUserId, r.fromUserId]).filter((x): x is string => !!x && !SYSTEM.includes(x)))];
  const names = people.length ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, people)) : [];
  const who = (id: string | null) => {
    const u = names.find((n) => n.id === id);
    return u?.username ? `@${u.username}` : id && SYSTEM.includes(id) ? "Sotechy" : "A customer";
  };
  const withCustomers = supply ? customerHeld(supply) : 0;
  return {
    tokenId,
    ticker: store.ticker,
    withCustomers,
    pending: pendingOrders.reduce((n, o) => n + earning(o), 0),
    recyclePool: supply?.recyclePool ?? 0,
    reserveWallet: supply?.reserveWallet ?? 0,
    issued: supply?.minted ?? 0,
    spent: supply?.spent ?? 0,
    walkInThisMonth: Number(walkIns?.n ?? 0),
    holders: holders.length,
    topHolders: holders.slice(0, 5).map((h) => ({ username: h.username, amount: Number(h.amount) })),
    reserveNaira: round2(Number(reserve?.n ?? 0) + Number(walkInReserve?.n ?? 0)),
    outstandingNaira: tokensToNaira(withCustomers),
    activity: recent
      .filter((r) => r.reason !== "recycled")
      .map((r) => ({ id: r.id, kind: r.reason, amount: r.amount, who: r.reason === "spent" ? who(r.fromUserId) : who(r.toUserId), at: r.createdAt.toISOString() })),
  };
}

/** The latest ledger changes across everyone, for the admin */
export async function latestActivity(limit = 20) {
  const rows = await db.select().from(entries).where(sql`${entries.reason} <> 'recycled'`).orderBy(desc(entries.createdAt)).limit(limit);
  const stores = await tokenStores([...new Set(rows.map((r) => r.tokenId))]);
  const people = [...new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]).filter((x): x is string => !!x && !SYSTEM.includes(x)))];
  const names = people.length ? await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(inArray(users.id, people)) : [];
  const who = (id: string | null) => {
    if (id && SYSTEM.includes(id)) return id === RESERVE_WALLET ? "Reserve wallet" : "Recycling pool";
    const u = names.find((n) => n.id === id);
    return u ? (u.username ? `@${u.username}` : u.email) : null;
  };
  const ops = rows.length ? await db.select({ sourceId: chainOps.sourceId, tx: chainOps.monadTx, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "tokens"), inArray(chainOps.sourceId, rows.map((r) => r.id)))) : [];
  return rows.map((r) => {
    const op = ops.find((o) => o.sourceId === r.id);
    return {
      id: r.id,
      kind: r.reason === "sent" ? "sent" : r.reason === "refunded" ? "refunded" : r.reason === "spent" ? "spent" : r.reason === "returned" ? "returned" : r.reason === "review" ? "review" : r.reason === "walk_in" ? "walk_in" : r.reason === "bonus" ? "bonus" : "earned",
      ticker: stores.get(r.tokenId)?.ticker ?? "",
      amount: r.amount,
      from: who(r.fromUserId),
      to: who(r.toUserId),
      at: r.createdAt.toISOString(),
      tx: op?.at && isTxHash(op.tx) ? op.tx : null,
    };
  });
}
