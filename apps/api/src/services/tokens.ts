// Store tokens and receipts. The ledger here is what counts: every change is a token entry, and each
// entry (and each receipt) is queued for the chain, where the chain service copies it.
// Customers earn 1 of the store's token per ₦1 of goods when an order is delivered, plus 10% in
// $SOTECHY at other stores. Wallets are custodial: an address worked out from the user id, with no key.
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getAddress, keccak256, stringToHex, toBytes, type Address, type Hex } from "viem";
import type { OrderStatus } from "@sotechy/shared";
import { db, schema, type Tx } from "../db/client";
import { badRequest, notFound } from "../lib/errors";

const { tokenEntries: entries, chainOps, receipts, merchants, orders, users } = schema;

export const SOTECHY_TOKEN = { id: 1, ticker: "SOTECHY", name: "Sotechy" } as const;
/** $SOTECHY given at other stores, on top of the store's own token */
export const CROSS_BONUS = 0.1;
const PENDING: OrderStatus[] = ["paid", "processing", "ready_for_pickup", "dispatched"];

/** A customer's wallet address: from their id, so there's no key to lose or steal */
export const walletAddress = (userId: string): Address => getAddress(`0x${keccak256(toBytes(`sotechy:wallet:${userId}`)).slice(-40)}`);

/** A ledger id as the bytes32 recorded with the change on chain */
const refOf = (uuid: string): Hex => `0x${uuid.replace(/-/g, "").padEnd(64, "0")}`;

type Entry = typeof entries.$inferInsert;

/** Writes a ledger entry and queues it for the chain, in the caller's transaction */
async function record(tx: Tx, entry: Omit<Entry, "id">) {
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
      const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${merchants.tokenId}), ${SOTECHY_TOKEN.id}) + 1` }).from(merchants);
      const [store] = await tx.update(merchants).set({ tokenId: next }).where(and(eq(merchants.id, id), isNull(merchants.tokenId))).returning();
      if (!store) return;
      await tx
        .insert(chainOps)
        .values({ contract: "tokens", kind: "register", sourceId: `token:${next}`, ref: refOf("0"), data: { tokenId: next, ticker: store.ticker } })
        .onConflictDoNothing();
    });
  }
}

/** Called after an order's status changes: tokens and a receipt on delivery, tokens back on refund */
export async function tokensForStatus(orderId: string, status: OrderStatus) {
  try {
    if (status === "delivered") await earnForOrder(orderId);
    else if (status === "refunded") await giveBackForOrder(orderId);
  } catch (err) {
    console.error(`Tokens for order ${orderId} failed`, err);
  }
}

/** The goods' value, which is what earns tokens (delivery doesn't) */
const earning = (o: { subtotal: number; discountTotal: number }) => Math.max(0, Math.floor(o.subtotal - o.discountTotal));

async function tokenOf(merchantId: string | null) {
  if (!merchantId) return SOTECHY_TOKEN.id;
  const [store] = await db.select({ tokenId: merchants.tokenId }).from(merchants).where(eq(merchants.id, merchantId));
  return store?.tokenId ?? null;
}

async function earnForOrder(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order?.customerId) return;
  const tokenId = await tokenOf(order.merchantId);
  if (!tokenId) return;
  const amount = earning(order);
  await db.transaction(async (tx) => {
    if (amount > 0) {
      await record(tx, { tokenId, kind: "mint", toUserId: order.customerId, amount, reason: "earned", orderId });
      const bonus = Math.floor(amount * CROSS_BONUS);
      if (tokenId !== SOTECHY_TOKEN.id && bonus > 0) await record(tx, { tokenId: SOTECHY_TOKEN.id, kind: "mint", toUserId: order.customerId, amount: bonus, reason: "bonus", orderId });
    }
    await issueReceipt(tx, order, tokenId);
  });
}

/** A refunded order takes back what it earned, as far as the customer still has it */
async function giveBackForOrder(orderId: string) {
  await db.transaction(async (tx) => {
    const earned = await tx.select().from(entries).where(and(eq(entries.orderId, orderId), eq(entries.kind, "mint")));
    for (const e of earned) {
      if (!e.toUserId) continue;
      await lockWallet(tx, e.toUserId);
      const amount = Math.min(e.amount, await balanceOf(tx, e.toUserId, e.tokenId));
      if (amount > 0) await record(tx, { tokenId: e.tokenId, kind: "burn", fromUserId: e.toUserId, amount, reason: "refunded", orderId, note: e.reason });
    }
  });
}

const lockWallet = (tx: Tx, userId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet:${userId}`}))`);

async function balanceOf(tx: Pick<Tx, "select">, userId: string, tokenId: number) {
  const [row] = await tx
    .select({ n: sql<number>`coalesce(sum(case when ${entries.toUserId} = ${userId} then ${entries.amount} else -${entries.amount} end), 0)::int` })
    .from(entries)
    .where(and(eq(entries.tokenId, tokenId), or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId))));
  return Number(row?.n ?? 0);
}

async function issueReceipt(tx: Tx, order: typeof orders.$inferSelect, tokenId: number) {
  const [done] = await tx.select({ id: receipts.id }).from(receipts).where(eq(receipts.orderId, order.id));
  if (done) return;
  const items = await tx
    .select({ name: schema.orderItems.productName, option: schema.orderItems.variantName, qty: schema.orderItems.quantity, unitPrice: schema.orderItems.unitPrice, lineTotal: schema.orderItems.lineTotal })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));
  const [store] = order.merchantId ? await tx.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, order.merchantId)) : [{ name: SOTECHY_TOKEN.name }];
  const [row] = await tx
    .insert(receipts)
    .values({ orderId: order.id, userId: order.customerId!, tokenId, content: {}, fingerprint: "" })
    .returning({ id: receipts.id });
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
    data: { receiptId: row.id, to: walletAddress(order.customerId!), store: tokenId, fingerprint },
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

// ---------------------------------------------------------------------------
// The customer's wallet
// ---------------------------------------------------------------------------

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
    .select({ merchantId: orders.merchantId, subtotal: orders.subtotal, discountTotal: orders.discountTotal })
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

  const ids = [...new Set([...held.map((h) => h.tokenId), ...pending.keys()])];
  const stores = await tokenStores(ids);
  const balances = ids
    .map((id) => ({ ...stores.get(id)!, amount: Number(held.find((h) => h.tokenId === id)?.amount ?? 0), pending: pending.get(id) ?? 0 }))
    .filter((b) => b.ticker && (b.amount > 0 || b.pending > 0))
    .sort((a, b) => (a.tokenId === SOTECHY_TOKEN.id ? -1 : b.tokenId === SOTECHY_TOKEN.id ? 1 : b.amount - a.amount));
  return { address: walletAddress(userId), balances, activity: await activityFor(userId) };
}

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

export async function activityFor(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(entries)
    .where(or(eq(entries.toUserId, userId), eq(entries.fromUserId, userId)))
    .orderBy(desc(entries.createdAt))
    .limit(limit);
  const stores = await tokenStores([...new Set(rows.map((r) => r.tokenId))]);
  const others = [...new Set(rows.flatMap((r) => (r.kind === "move" ? [r.fromUserId === userId ? r.toUserId : r.fromUserId] : [])).filter((x): x is string => !!x))];
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
      kind: r.kind === "move" ? (incoming ? "received" : "sent") : r.reason === "refunded" ? "refunded" : r.kind === "burn" ? "spent" : r.reason === "bonus" ? "bonus" : "earned",
      ticker: stores.get(r.tokenId)?.ticker ?? "",
      store: stores.get(r.tokenId)?.store ?? "",
      amount: incoming ? r.amount : -r.amount,
      who: other ? (names.find((n) => n.id === other)?.username ?? null) : null,
      order: numbers.find((n) => n.id === r.orderId)?.number ?? null,
      at: r.createdAt.toISOString(),
      /** Set once it's written on Monad */
      tx: op?.at ? op.tx : null,
    };
  });
}

/** Sends tokens to another Sotechy account by @username */
export async function sendTokens(fromUserId: string, input: { to: string; ticker: string; amount: number }) {
  const username = input.to.trim().replace(/^@/, "").toLowerCase();
  const [to] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (!to) throw notFound(`No one on Sotechy is @${username}`);
  if (to.id === fromUserId) throw badRequest("You can't send tokens to yourself");
  const ticker = input.ticker.toUpperCase();
  const tokenId = ticker === SOTECHY_TOKEN.ticker ? SOTECHY_TOKEN.id : (await db.select({ id: merchants.tokenId }).from(merchants).where(eq(merchants.ticker, ticker)))[0]?.id;
  if (!tokenId) throw notFound(`There's no $${ticker} token`);
  return db.transaction(async (tx) => {
    await lockWallet(tx, fromUserId);
    const has = await balanceOf(tx, fromUserId, tokenId);
    if (input.amount > has) throw badRequest(`You have ${has.toLocaleString("en-NG")} $${ticker}`);
    const row = await record(tx, { tokenId, kind: "move", fromUserId, toUserId: to.id, amount: input.amount, reason: "sent", createdBy: fromUserId });
    return { id: row!.id, to: username, ticker, amount: input.amount };
  });
}

/** The receipt for one of the customer's orders, with what's needed to check it on chain */
export async function receiptFor(userId: string, orderId: string) {
  const [r] = await db.select().from(receipts).where(and(eq(receipts.orderId, orderId), eq(receipts.userId, userId)));
  if (!r) return null;
  const [op] = await db.select({ tx: chainOps.monadTx, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "receipts"), eq(chainOps.sourceId, String(r.id))));
  return { id: r.id, content: r.content, fingerprint: r.fingerprint, tx: op?.at ? op.tx : null };
}

/** Each token's supply and holders, for the admin */
export async function tokenRegistry() {
  const rows = await db
    .select({
      tokenId: entries.tokenId,
      minted: sql<number>`coalesce(sum(case when ${entries.kind} = 'mint' then ${entries.amount} end), 0)::int`,
      burned: sql<number>`coalesce(sum(case when ${entries.kind} = 'burn' then ${entries.amount} end), 0)::int`,
      holders: sql<number>`count(distinct ${entries.toUserId})::int`,
    })
    .from(entries)
    .groupBy(entries.tokenId);
  const registered = await db.select({ sourceId: chainOps.sourceId, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "tokens"), eq(chainOps.kind, "register")));
  const ids = registered.map((r) => Number(r.sourceId.replace("token:", "")));
  const stores = await tokenStores(ids);
  return ids
    .map((id) => {
      const r = rows.find((x) => x.tokenId === id);
      return { ...stores.get(id)!, supply: r ? r.minted - r.burned : 0, minted: r?.minted ?? 0, holders: r?.holders ?? 0, onChain: !!registered.find((x) => x.sourceId === `token:${id}`)?.at };
    })
    .filter((t) => t.ticker)
    .sort((a, b) => a.tokenId - b.tokenId);
}

/** The latest ledger changes across everyone, for the admin */
export async function latestActivity(limit = 20) {
  const rows = await db.select().from(entries).orderBy(desc(entries.createdAt)).limit(limit);
  const stores = await tokenStores([...new Set(rows.map((r) => r.tokenId))]);
  const people = [...new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]).filter((x): x is string => !!x))];
  const names = people.length ? await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(inArray(users.id, people)) : [];
  const who = (id: string | null) => {
    const u = names.find((n) => n.id === id);
    return u ? (u.username ? `@${u.username}` : u.email) : null;
  };
  const ops = rows.length ? await db.select({ sourceId: chainOps.sourceId, tx: chainOps.monadTx, at: chainOps.monadAt }).from(chainOps).where(and(eq(chainOps.contract, "tokens"), inArray(chainOps.sourceId, rows.map((r) => r.id)))) : [];
  return rows.map((r) => {
    const op = ops.find((o) => o.sourceId === r.id);
    return {
      id: r.id,
      kind: r.kind === "move" ? "sent" : r.reason === "refunded" ? "refunded" : r.kind === "burn" ? "spent" : r.reason === "bonus" ? "bonus" : "earned",
      ticker: stores.get(r.tokenId)?.ticker ?? "",
      amount: r.amount,
      from: who(r.fromUserId),
      to: who(r.toUserId),
      at: r.createdAt.toISOString(),
      tx: op?.at ? op.tx : null,
    };
  });
}
