// Mirrors the ledger onto NEAR: every token change and receipt in the queue, oldest first, whichever chain is the
// main one. NEAR also keeps each receipt's status as the order moves (paid → on its way → delivered, or refunded),
// so receipts open on NEAR when an order is paid. A customer's wallet is the same address as on Base, which NEAR
// takes as an account name (an eth-implicit account), so each customer is the same on both chains.
import type { OrderStatus } from "@sotechy/shared";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Account, actions, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";
import { hexToString, type Hex } from "viem";
import { db, schema } from "../db/client";
import { env } from "../env";
import { MAX_TRIES } from "./chain";
import { fingerprintOf, SOTECHY_TOKEN, tokenOf, walletAddress } from "./tokens";

const ops = schema.chainOps;
type Op = typeof ops.$inferSelect;

export const NEAR_EXPLORER = { mainnet: "https://nearblocks.io", testnet: "https://testnet.nearblocks.io" }[env.NEAR_NETWORK];
const RPC = env.NEAR_RPC_URL ?? { mainnet: "https://rpc.mainnet.near.org", testnet: "https://rpc.testnet.near.org" }[env.NEAR_NETWORK];
const TGAS = 1_000_000_000_000n;
const BATCH = 50;

export const nearOn = () =>
  !!(env.NEAR_OPERATOR_ACCOUNT && env.NEAR_OPERATOR_KEY && env.NEAR_CONTRACT) &&
  (env.NODE_ENV === "production" || env.CHAIN_WRITES_IN_DEV === "true");

const provider = () => new JsonRpcProvider({ url: RPC });
const operator = () => new Account(env.NEAR_OPERATOR_ACCOUNT!, provider(), KeyPairSigner.fromSecretKey(env.NEAR_OPERATOR_KEY as KeyPairString));

/** A wallet address as its NEAR account (eth-implicit accounts are the lowercase 0x address) */
const nearAccount = (address: unknown) => String(address).toLowerCase();

const view = async <T>(contractId: string, method: string, args: Record<string, unknown>) => (await provider().callFunction({ contractId, method, args })) as T | undefined;

type Call = { method: string; args: object; tgas?: bigint };

/** Sends calls to one contract as one transaction (all or nothing) and returns its hash */
async function send(receiverId: string, calls: Call[]): Promise<string> {
  const res = await operator().signAndSendTransaction({
    receiverId,
    actions: calls.map((c) => actions.functionCall(c.method, c.args, (c.tgas ?? 50n) * TGAS, 0n)),
    waitUntil: "FINAL",
  });
  return (res as { transaction: { hash: string } }).transaction.hash;
}

async function markDone(list: Op[], tx: string) {
  await db.update(ops).set({ nearTx: tx, nearAt: new Date(), nearError: null }).where(inArray(ops.id, list.map((o) => o.id)));
}

async function markFailed(op: Op, err: unknown) {
  const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
  await db.update(ops).set({ nearError: message, nearTries: sql`${ops.nearTries} + 1` }).where(eq(ops.id, op.id));
  console.error(`NEAR write failed (op ${op.id})`, message);
}

// ---------------------------------------------------------------------------
// Store tokens
// ---------------------------------------------------------------------------

const tokenChange = (o: Op) => ({
  kind: o.kind,
  token_id: String(o.data.tokenId),
  from: o.data.from ? nearAccount(o.data.from) : null,
  to: o.data.to ? nearAccount(o.data.to) : null,
  amount: String(o.data.amount),
  memo: o.ref,
  // The contract skips what it has already applied, so a batch resent after a lost reply can't mint twice
  seq: o.id,
});

/** Token changes in one apply_ops; if that fails, one by one, stopping at the first that fails (later ones may depend on it) */
async function sendChanges(list: Op[]): Promise<boolean> {
  if (!list.length) return true;
  try {
    await markDone(list, await send(env.NEAR_CONTRACT!, [{ method: "apply_ops", args: { ops: list.map(tokenChange) }, tgas: 300n }]));
    return true;
  } catch (err) {
    if (list.length === 1) {
      await markFailed(list[0], err);
      return false;
    }
    for (const op of list) if (!(await sendChanges([op]))) return false;
    return true;
  }
}

async function register(op: Op) {
  const tokenId = String(op.data.tokenId);
  // Already there (e.g. written before a restart lost the result)? Then just note it.
  if (await view(env.NEAR_CONTRACT!, "store_token", { token_id: tokenId })) return markDone([op], "0x");
  await markDone([op], await send(env.NEAR_CONTRACT!, [{ method: "register_token", args: { token_id: tokenId, ticker: String(op.data.ticker) } }]));
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

type NearReceipt = { status: "paid" | "shipped" | "delivered" | "refunded" };

/** The calls that bring an order's NEAR receipt to where the op says, given what NEAR has now */
async function receiptCalls(op: Op): Promise<Call[]> {
  const delivered = op.kind === "receipt";
  // A delivered order's receipt carries the order number in its ref; NEAR status changes carry it in data
  const order = delivered ? hexToString(op.ref as Hex, { size: 32 }).replace(/\0+$/, "") : String(op.data.order);
  const tokenId = await view<string | null>(env.NEAR_CONTRACT!, "receipt_of_order", { order });
  const current = tokenId ? await view<NearReceipt>(env.NEAR_CONTRACT!, "receipt", { token_id: tokenId }) : null;
  const target = delivered ? "delivered" : String(op.data.status);
  const issue = async (): Promise<Call> => {
    const storeName = delivered ? await storeNameOfReceipt(Number(op.data.receiptId)) : String(op.data.storeName);
    return {
      method: "issue",
      args: { list: [{ token_id: order, owner_id: nearAccount(op.data.to), store_id: String(op.data.store), store_name: storeName, order, fingerprint: String(op.data.fingerprint) }] },
    };
  };
  const setStatus = (status: string, fingerprint: string | null = null): Call => ({ method: "set_status", args: { token_id: tokenId ?? order, status, fingerprint } });

  if (!current) {
    // Never opened on NEAR (paid before NEAR, or a refund of an order NEAR never saw)
    if (target === "refunded") return [];
    const calls = [await issue()];
    if (target === "shipped") calls.push(setStatus("shipped"));
    if (target === "delivered") calls.push(setStatus("delivered", String(op.data.fingerprint)));
    return calls;
  }
  const rank = { paid: 0, shipped: 1, delivered: 2, refunded: 2 } as const;
  // Already there or past it (refunded and delivered are both final)
  if (target === "paid" || rank[current.status] >= rank[target as keyof typeof rank]) return [];
  return [setStatus(target, delivered ? String(op.data.fingerprint) : null)];
}

async function storeNameOfReceipt(receiptId: number) {
  const [r] = await db.select({ content: schema.receipts.content }).from(schema.receipts).where(eq(schema.receipts.id, receiptId));
  return String((r?.content as { store?: string } | undefined)?.store ?? SOTECHY_TOKEN.name);
}

async function sendReceipt(op: Op): Promise<boolean> {
  try {
    const calls = await receiptCalls(op);
    await markDone([op], calls.length ? await send(env.NEAR_CONTRACT!, calls) : "0x");
    return true;
  } catch (err) {
    await markFailed(op, err);
    return false;
  }
}

/**
 * Queues the NEAR-only step for an order's receipt: opened when it's paid, on its way when it leaves, refunded if it's
 * refunded or cancelled after payment. Delivery needs nothing here: the delivered receipt every chain gets closes it.
 * Base and Monad never see these.
 */
export async function nearReceiptForStatus(orderId: string, status: OrderStatus) {
  const step = status === "paid" || status === "processing" ? "paid" : status === "dispatched" || status === "ready_for_pickup" ? "shipped" : status === "refunded" || status === "cancelled" ? "refunded" : null;
  if (!step) return;
  try {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!order?.customerId) return;
    if (step === "refunded") {
      // Only an order that was opened on NEAR gets closed there
      const [opened] = await db.select({ id: ops.id }).from(ops).where(and(eq(ops.contract, "receipts"), eq(ops.kind, "near_status"), eq(ops.sourceId, `${orderId}:paid`)));
      if (!opened) return;
    }
    const store = await tokenOf(order.merchantId);
    const [merchant] = order.merchantId ? await db.select({ name: schema.merchants.name }).from(schema.merchants).where(eq(schema.merchants.id, order.merchantId)) : [];
    await db
      .insert(ops)
      .values({
        contract: "receipts",
        kind: "near_status",
        sourceId: `${orderId}:${step}`,
        ref: `0x${"0".repeat(64)}`,
        data: {
          order: order.orderNumber,
          status: step,
          to: walletAddress(order.customerId),
          store: store ?? SOTECHY_TOKEN.id,
          storeName: merchant?.name ?? SOTECHY_TOKEN.name,
          // Until delivery the receipt's fingerprint covers what's known at payment
          fingerprint: fingerprintOf({ order: order.orderNumber, total: order.total, status: step, paidAt: new Date().toISOString() }),
        },
        // NEAR only
        monadTx: "n/a",
        monadAt: new Date(),
        baseTx: "n/a",
        baseAt: new Date(),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error(`NEAR receipt step for order ${orderId} failed`, err);
  }
}

// ---------------------------------------------------------------------------
// The worker
// ---------------------------------------------------------------------------

/**
 * One pass, oldest first, keeping order: store tokens are created before they're minted, receipts follow their order.
 * Nothing is skipped: a change that failed too often holds the rest until an admin tries it again, since the token
 * contract only takes queue numbers above the last one it applied.
 */
async function pass(limit: number) {
  const list = await db.select().from(ops).where(isNull(ops.nearAt)).orderBy(asc(ops.id)).limit(limit);
  let done = 0;
  for (let i = 0; i < list.length; ) {
    const op = list[i];
    if (op.nearTries >= MAX_TRIES) return done;
    if (op.contract === "tokens" && op.kind !== "register") {
      // Consecutive token changes go out together
      let j = i;
      while (j < list.length && list[j].contract === "tokens" && list[j].kind !== "register" && list[j].nearTries < MAX_TRIES) j++;
      const group = list.slice(i, j);
      if (!(await sendChanges(group))) return done;
      done += group.length;
      i = j;
      continue;
    }
    try {
      if (op.contract === "tokens") await register(op);
      else if (!(await sendReceipt(op))) return done;
    } catch (err) {
      await markFailed(op, err);
      return done;
    }
    done++;
    i++;
  }
  return done;
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await pass(BATCH);
  } catch (err) {
    console.error("NEAR round failed", err);
  } finally {
    busy = false;
  }
}

/** Starts the NEAR mirror in the background (only when it's set up, and in dev only when asked) */
export function startNearWorker() {
  if (!nearOn()) {
    console.log("NEAR mirror is off");
    return;
  }
  console.log(`Writing to NEAR ${env.NEAR_NETWORK} as ${env.NEAR_OPERATOR_ACCOUNT}`);
  setInterval(() => void tick(), 8_000);
}

/** A read from the Sotechy contract on NEAR, for the admin */
export const nearRead = <T>(method: string, args: Record<string, unknown> = {}) => view<T>(env.NEAR_CONTRACT!, method, args);

/** An account's NEAR balance, and what's free beyond what its storage locks (1 NEAR per 100 KB) */
export async function nearBalance(accountId: string) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
    signal: AbortSignal.timeout(15_000),
  });
  const r = ((await res.json()) as { result?: { amount: string; storage_usage: number } }).result;
  if (!r) return null;
  const balance = Number(BigInt(r.amount) / 10n ** 18n) / 1e6;
  return { balance, free: balance - r.storage_usage / 100_000 };
}

/** Queue numbers for the admin */
export async function nearStats() {
  const [row] = await db
    .select({
      waiting: sql<number>`count(*) filter (where ${ops.nearAt} is null and ${ops.nearTries} < ${MAX_TRIES})::int`,
      stuck: sql<number>`count(*) filter (where ${ops.nearAt} is null and ${ops.nearTries} >= ${MAX_TRIES})::int`,
      done: sql<number>`count(*) filter (where ${ops.nearAt} is not null)::int`,
      last: sql<string | null>`max(${ops.nearAt})`,
    })
    .from(ops);
  return { ...row, on: nearOn(), network: env.NEAR_NETWORK, explorer: NEAR_EXPLORER, contract: env.NEAR_CONTRACT ?? null };
}
