// Pay with USDT on X Layer. The buyer's USD₮0 waits in Sotechy's escrow on X Layer, and TapeOut circuits decide what
// happens to it (github.com/soke-dev/sotechy-xlayer): released to Sotechy's wallet once the order is delivered,
// which unlocks the store's normal naira payout, or refunded to the buyer. Sotechy can't move it any other way.
//
// The buyer pays no gas: they sign a USD₮0 permit on the pay page and Sotechy's operator (CHAIN_OPERATOR_KEY)
// sends it, and every later step (shipped, delivered, disputes, settling) is sent by the operator too.
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createPublicClient, createWalletClient, defineChain, encodePacked, http, keccak256, parseAbi, parseSignature, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { OrderStatus } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { env } from "../env";
import { audit } from "../lib/audit";
import { STAFF } from "../lib/auth";
import { badRequest, HttpError } from "../lib/errors";
import { getUsdRate } from "./moneymoves";
import { getSetting } from "./settings";
import { primaryChain } from "./chain-primary";
import { earning, tokenOf } from "./tokens";

const { orders, payments, merchantPayouts: payouts, refunds, merchants, appSettings, users } = schema;

export const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
  blockExplorers: { default: { name: "OKLink", url: "https://www.oklink.com/xlayer" } },
});
export const USDT0: Address = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
export const XLAYER_EXPLORER = "https://www.oklink.com/xlayer";
/** The public order checker, stored on chain on DeWEB */
export const XLAYER_CHECKER = "https://26-2-272.tapekit.org";

const ESCROW_ABI = parseAbi([
  "function open(uint256 orderId, address payTo, uint32 storeId, uint96 amount, uint40 payBy, uint40 shipBy, uint32 tokenId, uint96 tokens)",
  "function withdraw(uint256 orderId)",
  "function payFor(uint256 orderId, address buyer, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function markShipped(uint256 orderId)",
  "function confirmDelivered(uint256 orderId)",
  "function openDispute(uint256 orderId)",
  "function resolveDispute(uint256 orderId, bool buyerWins)",
  "function cancel(uint256 orderId)",
  "function settle(uint256 orderId)",
  "function setStore(uint32 storeId, bool verified, bool established, uint8 limit)",
  "function order(uint256 orderId) view returns ((address payTo, uint96 amount, uint32 storeId, uint40 payBy, uint40 shipBy, uint16 feeBps, uint32 tokenId, uint96 tokens, uint8 stage, address buyer, uint40 paidAt, uint40 shippedAt, bool delivered, bool disputeOpen, bool buyerWon, bool cancelled, bool reviewed))",
  "function verdictOf(uint256 orderId) view returns (bool release, bool refund, bool limitOk, bool breakerOk, bool verdictRelease)",
  "function stores(uint32 storeId) view returns (bool verified, bool established, uint8 limit, bytes1 breaker)",
  "function treasury() view returns (address)",
  "function rewards() view returns (address)",
  "event Paid(uint256 indexed orderId, address indexed buyer, uint256 amount)",
  "event Released(uint256 indexed orderId, address indexed payTo, uint256 toStore, uint256 fee)",
  "event Refunded(uint256 indexed orderId, address indexed buyer, uint256 amount)",
  "event EmergencyRefund(uint256 indexed orderId, address indexed buyer, uint256 amount)",
]);
const TOKENS_ABI = parseAbi(["function tickerOf(uint256 id) view returns (string)", "function registerToken(uint256 id, string ticker)"]);
const USDT_ABI = parseAbi([
  "function nonces(address owner) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]);

/** The escrow's stages (SotechyEscrow.Stage) */
const STAGE = { None: 0, Open: 1, Paid: 2, Released: 3, Refunded: 4 } as const;
/** How long the buyer has to pay once they choose USDT, and the store to ship */
const PAY_WINDOW_S = 30 * 60;
/** Paying with another coin through NEAR Intents: time for the deposit to confirm on its own chain and be swapped */
export const INTENTS_WINDOW_S = 3 * 60 * 60;
const SHIP_DAYS = 5;
/** A new store's orders up to this many $10 steps are released automatically (above it, Sotechy reviews) */
const NEW_STORE_LIMIT = 10;
/** A store with this many delivered orders is past the new-store limit */
const ESTABLISHED_AFTER = 5;

const escrow = env.XLAYER_ESCROW as Address | undefined;
const writesAllowed = env.NODE_ENV === "production" || env.CHAIN_WRITES_IN_DEV === "true";
const operator = env.CHAIN_OPERATOR_KEY ? privateKeyToAccount(env.CHAIN_OPERATOR_KEY as Hex) : null;
const transport = http(env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech", { retryCount: 3, timeout: 20_000 });
const reader = createPublicClient({ chain: xlayer, transport });
const writer = operator ? createWalletClient({ chain: xlayer, transport, account: operator }) : null;

/** Set up on this server: the escrow's address and the operator key */
export const xlayerOn = () => !!escrow && !!operator;

export type XlayerMode = "off" | "staff" | "everyone";
export async function xlayerMode(): Promise<XlayerMode> {
  const s = await getSetting<{ mode?: XlayerMode }>("xlayer");
  return s?.mode === "staff" || s?.mode === "everyone" ? s.mode : "off";
}

/** Whether this person sees "Pay with USDT on X Layer": everyone, or only Sotechy's team while it's being tried */
export async function xlayerAvailableFor(userId: string | null | undefined) {
  if (!xlayerOn()) return false;
  const mode = await xlayerMode();
  if (mode === "everyone") return true;
  if (mode !== "staff" || !userId) return false;
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  return !!u && STAFF.includes(u.role);
}

/** The escrow's order id: the number in SOT-1037 */
export const chainOrderId = (orderNumber: string) => BigInt(orderNumber.replace(/\D/g, ""));
export const usdtText = (units: bigint) => (Number(units) / 1e6).toFixed(2);

// ---------------------------------------------------------------------------
// Sending: one transaction at a time, so the operator's nonces never clash
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();

function send(address: Address, abi: typeof ESCROW_ABI | typeof TOKENS_ABI | typeof USDT_ABI, functionName: string, args: readonly unknown[]): Promise<Hex> {
  if (!writer || !operator) throw new HttpError(503, "X Layer isn't set up on this server");
  if (!writesAllowed) throw new HttpError(503, "X Layer writes are off outside production (CHAIN_WRITES_IN_DEV)");
  const run = async () => {
    const hash = await writer.writeContract({ address, abi, functionName, args, account: operator, chain: xlayer } as never);
    const receipt = await reader.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") throw new Error(`${functionName} reverted (${hash})`);
    return hash;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}
const sendEscrow = (fn: string, args: readonly unknown[]) => send(escrow!, ESCROW_ABI, fn, args);

export async function chainOrder(orderNumber: string) {
  return reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "order", args: [chainOrderId(orderNumber)] });
}

// ---------------------------------------------------------------------------
// Stores and their tokens, as the escrow needs them
// ---------------------------------------------------------------------------

/** The store's on-chain id (its token id: $SOTECHY is 1) and how the circuits treat it */
async function storeTerms(merchantId: string | null) {
  const tokenId = await tokenOf(merchantId);
  if (!tokenId) throw badRequest("This store's token isn't set up yet");
  if (!merchantId) return { storeId: tokenId, ticker: "SOTECHY", verified: true, established: true };
  const [m] = await db.select({ status: merchants.status, ticker: merchants.ticker }).from(merchants).where(eq(merchants.id, merchantId));
  const [{ delivered }] = await db
    .select({ delivered: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.merchantId, merchantId), eq(orders.status, "delivered")));
  return { storeId: tokenId, ticker: m?.ticker ?? `STORE${tokenId}`, verified: m?.status === "approved", established: delivered >= ESTABLISHED_AFTER };
}

/** Makes the escrow's record of a store match Sotechy's, and its token exist on X Layer */
async function syncStore(t: Awaited<ReturnType<typeof storeTerms>>) {
  const [verified, established, limit] = await reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "stores", args: [t.storeId] });
  if (verified !== t.verified || established !== t.established || limit !== NEW_STORE_LIMIT) {
    await sendEscrow("setStore", [t.storeId, t.verified, t.established, NEW_STORE_LIMIT]);
  }
  const rewards = await reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "rewards" });
  if (rewards !== "0x0000000000000000000000000000000000000000") {
    const ticker = await reader.readContract({ address: rewards, abi: TOKENS_ABI, functionName: "tickerOf", args: [BigInt(t.storeId)] });
    if (!ticker) await send(rewards, TOKENS_ABI, "registerToken", [BigInt(t.storeId), t.ticker]);
  }
}

// ---------------------------------------------------------------------------
// Paying
// ---------------------------------------------------------------------------

/** Saved on payments.raw while a USDT payment is open, and after */
export interface SavedXlayer {
  orderId: string;
  amount: string; // USD₮0 base units
  payBy: number;
  escrow: string;
  buyer?: string;
  paidTx?: string;
  released?: boolean;
  settledTx?: string;
}
export const savedXlayer = (raw: unknown): SavedXlayer | null => (raw as { xlayer?: SavedXlayer } | null)?.xlayer ?? null;

/**
 * Opens (or reuses) the order's terms on the escrow: the exact USDT (the naira total at today's rate, rounded up to
 * the cent), Sotechy's wallet for the release, the ship-by date and the tokens it earns. Returns the pay page link.
 */
export async function openXlayerPayment(
  order: typeof orders.$inferSelect,
  payment: typeof payments.$inferSelect,
  opts: { windowS?: number; minLeftS?: number; amount?: bigint } = {},
) {
  const saved = savedXlayer(payment.raw);
  const now = Math.floor(Date.now() / 1000);
  const id = chainOrderId(order.orderNumber);
  if (saved && saved.payBy > now + (opts.minLeftS ?? 5 * 60) && (!opts.amount || BigInt(saved.amount) === opts.amount)) {
    return { saved, payUrl: payUrl(payment.id, saved.payBy) };
  }

  const { rate } = await getUsdRate();
  const usd = Math.ceil((payment.amount / rate) * 100) / 100;
  // A swap that already delivered a set amount gets terms for exactly that
  const amount = opts.amount ?? BigInt(Math.round(usd * 1_000_000));
  const terms = await storeTerms(order.merchantId);
  await syncStore(terms);

  // Terms nobody paid are taken back before new ones are set
  const onChain = await chainOrder(order.orderNumber);
  if (onChain.stage === STAGE.Open) await sendEscrow("withdraw", [id]);
  else if (onChain.stage !== STAGE.None) throw badRequest("This order already has a USDT payment on X Layer");

  const payTo = await reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "treasury" });
  const payBy = now + (opts.windowS ?? PAY_WINDOW_S);
  // The escrow mints the store tokens on release, to the paying wallet. With X Layer as Sotechy's main chain, Sotechy's
  // own record writes them instead (to the customer's Sotechy wallet, where every other token change is), so the
  // escrow mints none and nothing is minted twice.
  const tokens = (await primaryChain()) === "xlayer" ? 0n : BigInt(earning(order));
  await sendEscrow("open", [id, payTo, terms.storeId, amount, payBy, now + SHIP_DAYS * 86_400, terms.storeId, tokens]);
  const next: SavedXlayer = { orderId: id.toString(), amount: amount.toString(), payBy, escrow: escrow! };
  await db
    .update(payments)
    .set({ provider: "xlayer", raw: { ...(payment.raw as object | null), xlayer: next } })
    .where(eq(payments.id, payment.id));
  return { saved: next, payUrl: payUrl(payment.id, payBy) };
}

// The pay page has no Sotechy session: the app gives it a link token for this one payment, valid until payBy
const sign = (paymentId: string, exp: number) => createHmac("sha256", env.JWT_SECRET).update(`xlayer:${paymentId}:${exp}`).digest("base64url");
const payUrl = (paymentId: string, exp: number) => `${env.XLAYER_PAY_PAGE}?t=${paymentId}.${exp}.${sign(paymentId, exp)}`;

/** The payment a pay-page link token is for, or a 403 */
export async function paymentForToken(token: string) {
  const [paymentId, expText, mac] = token.split(".");
  const exp = Number(expText);
  const good = paymentId && mac && Number.isFinite(exp) && exp > Date.now() / 1000;
  const want = good ? Buffer.from(sign(paymentId, exp)) : Buffer.alloc(0);
  if (!good || want.length !== Buffer.from(mac).length || !timingSafeEqual(want, Buffer.from(mac))) throw new HttpError(403, "This payment link has expired. Go back to the app and choose USDT again.");
  const [row] = await db.select({ payment: payments, order: orders }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(eq(payments.id, paymentId));
  if (!row || !savedXlayer(row.payment.raw)) throw new HttpError(404, "Payment not found");
  return row;
}

/** What the pay page shows and asks the buyer's wallet to sign: a USD₮0 permit for the exact amount, to the escrow */
export const permitFor = (saved: SavedXlayer, buyer: Address) => permit(buyer, saved.escrow as Address, BigInt(saved.amount), BigInt(saved.payBy));

async function permit(owner: Address, spender: Address, value: bigint, deadline: bigint) {
  const nonce = await reader.readContract({ address: USDT0, abi: USDT_ABI, functionName: "nonces", args: [owner] });
  return {
    domain: { name: "USD₮0", version: "1", chainId: 196, verifyingContract: USDT0 },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit" as const,
    message: { owner, spender, value: value.toString(), nonce: nonce.toString(), deadline: deadline.toString() },
  };
}

/** Sends the buyer's signed permit: the USDT moves into the escrow, Sotechy pays the gas, and the order is paid */
export async function relayXlayerPayment(paymentId: string, buyer: Address, signature: Hex) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  const saved = payment && savedXlayer(payment.raw);
  if (!saved) throw badRequest("No USDT payment is open for this order");
  if (payment.status !== "pending") return { paid: true, tx: saved.paidTx ?? null };
  const { v, r, s } = parseSignature(signature);
  const hash = await sendEscrow("payFor", [BigInt(saved.orderId), buyer, BigInt(saved.payBy), Number(v ?? 27n), r, s]);
  await paidOnChain(BigInt(saved.orderId), buyer, hash);
  return { paid: true, tx: hash };
}

// ---------------------------------------------------------------------------
// Paying with any other coin through NEAR Intents (while X Layer is Sotechy's main chain)
// ---------------------------------------------------------------------------
//
// The swap delivers exactly the order's USD₮0 to a pay-in address Sotechy holds for that one order (its key comes from
// the operator key and the order's number, so nothing extra is stored). The pay-in address signs the same permit a
// wallet buyer would and the operator sends it: from there the escrow and its circuits treat the order like any other.
// A refund comes back to the pay-in address, and Sotechy sends it on to the customer through NEAR Intents.

/** One order's pay-in account */
function payInAccount(chainId: string) {
  if (!env.CHAIN_OPERATOR_KEY) throw new HttpError(503, "X Layer isn't set up on this server");
  return privateKeyToAccount(keccak256(encodePacked(["bytes32", "string"], [env.CHAIN_OPERATOR_KEY as Hex, `sotechy:xlayer:pay-in:${chainId}`])));
}
export const payInAddress = (chainId: string) => payInAccount(chainId).address;

/** Paying with other coins goes through the escrow while X Layer is Sotechy's main chain */
export async function intentsToXlayer() {
  return xlayerOn() && (await primaryChain()) === "xlayer";
}

const usdtOf = (owner: Address) => reader.readContract({ address: USDT0, abi: USDT_ABI, functionName: "balanceOf", args: [owner] });

/** A USD₮0 permit signed by an order's pay-in account */
async function payInPermit(chainId: string, spender: Address, value: bigint, deadline: bigint) {
  const account = payInAccount(chainId);
  const p = await permit(account.address, spender, value, deadline);
  const signature = await account.signTypedData({
    domain: p.domain,
    types: p.types,
    primaryType: "Permit",
    message: { owner: account.address, spender, value, nonce: BigInt(p.message.nonce), deadline },
  });
  return parseSignature(signature);
}

const paying = new Set<string>();

/**
 * The swap's USD₮0 is on the pay-in address: it goes into the escrow and the order is paid. Terms that ran out while
 * the swap was on its way are opened again for the same amount. Until the USD₮0 arrives, nothing happens.
 */
export async function payEscrowFromPayIn(paymentId: string) {
  if (paying.has(paymentId)) return false;
  paying.add(paymentId);
  try {
    const [row] = await db.select({ payment: payments, order: orders }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(eq(payments.id, paymentId));
    let saved = row && savedXlayer(row.payment.raw);
    if (!row || !saved || row.payment.status !== "pending") return false;
    const payIn = payInAddress(saved.orderId);
    const amount = BigInt(saved.amount);
    if ((await usdtOf(payIn)) < amount) return false;
    const onChain = await chainOrder(row.order.orderNumber);
    if (onChain.stage === STAGE.Paid) return false; // already in; the watcher records it
    if (onChain.stage !== STAGE.Open || onChain.payBy < Math.floor(Date.now() / 1000) + 120 || onChain.amount !== amount) {
      ({ saved } = await openXlayerPayment(row.order, row.payment, { amount, minLeftS: Number.MAX_SAFE_INTEGER }));
    }
    const { v, r, s } = await payInPermit(saved.orderId, escrow!, amount, BigInt(saved.payBy));
    const hash = await sendEscrow("payFor", [BigInt(saved.orderId), payIn, BigInt(saved.payBy), Number(v ?? 27n), r, s]);
    await paidOnChain(BigInt(saved.orderId), payIn, hash);
    return true;
  } finally {
    paying.delete(paymentId);
  }
}

type IntentOnPayment = { originAsset: string; symbol: string; chain: string; refundTo?: string; amountInFormatted: string; settlesTo?: string };
const intentOf = (raw: unknown) => {
  const i = (raw as { intents?: IntentOnPayment } | null)?.intents;
  return i?.settlesTo === "xlayer" ? i : null;
};

/**
 * A refund the escrow paid to an order's pay-in address goes back to the customer through NEAR Intents, as the coin
 * they paid with, to the refund address they gave. If 1Click won't take it (a coin's minimum, say), the USD₮0 moves to
 * Sotechy's wallet and the refund is left for staff to send another way.
 */
async function sendBack(saved: SavedXlayer, intent: IntentOnPayment) {
  const payIn = payInAddress(saved.orderId);
  const amount = await usdtOf(payIn);
  if (amount === 0n) return null;
  const { quoteBack, handDeposit } = await import("./intents");
  const back = intent.refundTo
    ? await quoteBack(amount, intent.originAsset, intent.refundTo, payIn).catch((err) => {
        console.warn("Refund through NEAR Intents not quoted:", err instanceof Error ? err.message : err);
        return null;
      })
    : null;
  const to = (back?.depositAddress ?? (await reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "treasury" }))) as Address;
  // The pay-in address has no OKB: it signs a permit, and the operator moves the USD₮0 and pays the gas
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const { v, r, s } = await payInPermit(saved.orderId, operator!.address, amount, deadline);
  await send(USDT0, USDT_ABI, "permit", [payIn, operator!.address, amount, deadline, Number(v ?? 27n), r, s]);
  const tx = await send(USDT0, USDT_ABI, "transferFrom", [payIn, to, amount]);
  if (back) await handDeposit(back.depositAddress, tx).catch(() => null);
  const usdt = usdtText(amount);
  return back
    ? { processed: true, tx, asset: intent.symbol, network: intent.chain, note: `${usdt} USDT from the escrow sent back through NEAR Intents as about ${back.amountOutFormatted} ${intent.symbol} on ${intent.chain} to ${intent.refundTo}` }
    : { processed: false, tx, asset: "USDT", network: "X Layer", note: `${usdt} USDT from the escrow moved to Sotechy's wallet (${tx}): NEAR Intents couldn't send it back as ${intent.symbol} on ${intent.chain}. Refund the customer another way.` };
}

// ---------------------------------------------------------------------------
// What happens on chain → Sotechy's records
// ---------------------------------------------------------------------------

async function paymentForChainId(id: bigint) {
  const rows = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.provider, "xlayer"), sql`${payments.raw}->'xlayer'->>'orderId' = ${id.toString()}`));
  return rows.find((r) => r.payment.status !== "expired") ?? rows[0] ?? null;
}

async function saveXlayer(paymentId: string, raw: unknown, patch: Partial<SavedXlayer>) {
  const next = { ...(raw as object | null), xlayer: { ...savedXlayer(raw)!, ...patch } };
  await db.update(payments).set({ raw: next }).where(eq(payments.id, paymentId));
}

/** The USDT is in the escrow: the order is paid */
async function paidOnChain(id: bigint, buyer: string, tx: string) {
  const row = await paymentForChainId(id);
  if (!row || row.payment.status !== "pending") return;
  const saved = savedXlayer(row.payment.raw)!;
  const intent = intentOf(row.payment.raw);
  await saveXlayer(row.payment.id, row.payment.raw, { buyer, paidTx: tx });
  const { confirmPayment } = await import("./orders");
  await confirmPayment(row.payment.id, {
    amountPaid: row.payment.amount,
    providerReference: tx,
    provider: "xlayer",
    raw: { ...(row.payment.raw as object | null), xlayer: { ...saved, buyer, paidTx: tx } },
    verifiedBy: null,
    note: intent
      ? `Paid ${intent.amountInFormatted} ${intent.symbol} on ${intent.chain} through NEAR Intents; ${usdtText(BigInt(saved.amount))} USDT held in the escrow on X Layer`
      : `${usdtText(BigInt(saved.amount))} USDT on X Layer, held in the escrow`,
  });
}

/** The circuits released the money to Sotechy: the store's held payouts can go out */
async function releasedOnChain(id: bigint, tx: string) {
  const row = await paymentForChainId(id);
  if (!row || savedXlayer(row.payment.raw)?.released) return;
  await saveXlayer(row.payment.id, row.payment.raw, { released: true, settledTx: tx });
  await db
    .update(payouts)
    .set({ status: "scheduled", dueAt: new Date() })
    .where(and(eq(payouts.orderId, row.order.id), eq(payouts.status, "held"), inArray(payouts.stage, ["first", "final"])));
  await audit(db, { actorId: null, action: "xlayer.released", entityType: "order", entityId: row.order.id, details: { tx } });
}

const refunding = new Set<string>();

/** The circuits sent the money back to the buyer: recorded as a sent refund, the way staff record one */
async function refundedOnChain(id: bigint, tx: string) {
  const key = id.toString();
  if (refunding.has(key)) return;
  refunding.add(key);
  try {
    await recordRefund(id, tx);
  } finally {
    refunding.delete(key);
  }
}

async function recordRefund(id: bigint, tx: string) {
  const row = await paymentForChainId(id);
  if (!row || row.payment.status === "refunded") return;
  const { cancelOrder } = await import("./orders");
  if (["paid", "processing", "ready_for_pickup"].includes(row.order.status)) {
    await cancelOrder(null, row.order.id, "Refunded on X Layer: the TapeOut circuits sent the money back");
  }
  const saved = savedXlayer(row.payment.raw)!;
  // Paid through NEAR Intents: the refund is on the order's pay-in address, and goes on to the customer from there
  const intent = intentOf(row.payment.raw);
  const viaPayIn = !!intent && saved.buyer?.toLowerCase() === payInAddress(saved.orderId).toLowerCase();
  const sent = viaPayIn ? await sendBack(saved, intent) : null;
  const done = !viaPayIn || !!sent?.processed;
  const how = sent
    ? { txHash: sent.tx, cryptoAsset: sent.asset, network: sent.network, note: sent.note }
    : { txHash: tx, cryptoAsset: "USDT", network: "X Layer", note: `${usdtText(BigInt(saved.amount))} USDT back to ${saved.buyer ?? "the buyer"}` };
  await db.transaction(async (t) => {
    let [refund] = await t.select().from(refunds).where(and(eq(refunds.orderId, row.order.id), inArray(refunds.status, ["requested", "approved", "needs_info"])));
    if (!refund) {
      [refund] = await t.insert(refunds).values({ orderId: row.order.id, paymentId: row.payment.id, amount: row.payment.amount, reason: "Refunded on X Layer by the TapeOut circuits" }).returning();
    }
    await t
      .update(refunds)
      .set(done ? { status: "processed", processedAt: new Date(), method: "crypto", ...how } : { status: "approved", method: "crypto", note: how.note })
      .where(eq(refunds.id, refund.id));
    if (done) await t.update(orders).set({ status: "refunded" }).where(eq(orders.id, row.order.id));
    await t.update(payments).set({ status: "refunded", raw: { ...(row.payment.raw as object), xlayer: { ...saved, settledTx: tx } } }).where(eq(payments.id, row.payment.id));
    await audit(t, { actorId: null, action: "xlayer.refunded", entityType: "order", entityId: row.order.id, details: { tx } });
  });
  const [{ notifyOrderStatus }, { payoutsForStatus }, { tokensForStatus }] = await Promise.all([import("./order-notices"), import("./payouts"), import("./tokens")]);
  if (done) void notifyOrderStatus(row.order.id, "refunded");
  await payoutsForStatus(row.order.id, "refunded");
  await tokensForStatus(row.order.id, "refunded");
}

/** A paid order whose money is still in the escrow keeps the store's payouts held until the circuits release it */
export async function xlayerHoldsPayouts(orderId: string) {
  const [p] = await db.select({ raw: payments.raw }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.provider, "xlayer"), eq(payments.status, "confirmed")));
  const saved = p && savedXlayer(p.raw);
  return !!saved && !saved.released;
}

// ---------------------------------------------------------------------------
// Sotechy's order steps → the escrow (each is safe to retry; a failure is logged and the sweep catches up)
// ---------------------------------------------------------------------------

async function paidXlayerOrder(orderId: string) {
  if (!xlayerOn()) return null;
  const [row] = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.orderId, orderId), eq(payments.provider, "xlayer"), eq(payments.status, "confirmed")));
  return row ?? null;
}

async function step(orderId: string, what: string, run: (id: bigint, onChain: Awaited<ReturnType<typeof chainOrder>>) => Promise<unknown>) {
  try {
    const row = await paidXlayerOrder(orderId);
    if (!row) return;
    const onChain = await chainOrder(row.order.orderNumber);
    if (onChain.stage !== STAGE.Paid) return;
    await run(chainOrderId(row.order.orderNumber), onChain);
  } catch (err) {
    console.error(`X Layer ${what} for order ${orderId} failed`, err);
  }
}

/** Called after an order's status changes */
export async function xlayerForStatus(orderId: string, status: OrderStatus) {
  if (status === "dispatched" || status === "ready_for_pickup" || status === "delivered") {
    await step(orderId, "shipped", async (id, o) => (o.shippedAt === 0 ? sendEscrow("markShipped", [id]) : null));
  } else if (status === "cancelled") {
    await step(orderId, "cancel", async (id) => {
      await sendEscrow("cancel", [id]);
      await processEscrowLogs();
    });
  }
}

/** The customer said they got it */
export const xlayerReceived = (orderId: string) =>
  step(orderId, "delivered", async (id, o) => {
    if (!o.delivered) await sendEscrow("confirmDelivered", [id]);
    await processEscrowLogs();
  });

/** The customer said it didn't arrive: the money is held and the store's breaker trips */
export const xlayerIssue = (orderId: string) => step(orderId, "dispute", async (id, o) => (o.disputeOpen ? null : sendEscrow("openDispute", [id])));

/** Sotechy looked into it: the order arrived after all (the store wins) */
export const xlayerIssueResolved = (orderId: string) =>
  step(orderId, "resolve", async (id, o) => {
    if (o.disputeOpen) await sendEscrow("resolveDispute", [id, false]);
    if (!o.delivered) await sendEscrow("confirmDelivered", [id]);
    await processEscrowLogs();
  });

// ---------------------------------------------------------------------------
// Watching the escrow, and settling what the circuits have decided
// ---------------------------------------------------------------------------

const CURSOR_KEY = "xlayer_cursor";
/** X Layer's RPC returns events for at most 100 blocks per request */
const LOG_SPAN = 100n;

/** Reads the escrow's Paid, Released and Refunded events since last time, and applies them */
export async function processEscrowLogs() {
  if (!xlayerOn()) return;
  const latest = await reader.getBlockNumber();
  const saved = await getSetting<{ block?: string }>(CURSOR_KEY);
  let from = saved?.block ? BigInt(saved.block) + 1n : latest - 1_000n;
  while (from <= latest) {
    const to = from + LOG_SPAN - 1n < latest ? from + LOG_SPAN - 1n : latest;
    const logs = await reader.getContractEvents({ address: escrow!, abi: ESCROW_ABI, fromBlock: from, toBlock: to });
    for (const log of logs) {
      const args = log.args as { orderId: bigint; buyer?: Address };
      if (log.eventName === "Paid") await paidOnChain(args.orderId, args.buyer!, log.transactionHash);
      else if (log.eventName === "Released") await releasedOnChain(args.orderId, log.transactionHash);
      else if (log.eventName === "Refunded" || log.eventName === "EmergencyRefund") await refundedOnChain(args.orderId, log.transactionHash);
    }
    await db
      .insert(appSettings)
      .values({ key: CURSOR_KEY, value: { block: to.toString() } })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: { block: to.toString() } } });
    from = to + 1n;
  }
}

/** Paid orders whose money is still held: catch up on shipping, and settle any the circuits have decided */
export async function settleDecided() {
  if (!xlayerOn() || !writesAllowed) return;
  const rows = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.provider, "xlayer"), eq(payments.status, "confirmed")));
  for (const { payment, order } of rows) {
    if (savedXlayer(payment.raw)?.released) continue;
    try {
      const id = chainOrderId(order.orderNumber);
      const o = await chainOrder(order.orderNumber);
      if (o.stage !== STAGE.Paid) continue;
      if (o.shippedAt === 0 && ["dispatched", "ready_for_pickup", "delivered"].includes(order.status)) await sendEscrow("markShipped", [id]);
      const [release, refund] = await reader.readContract({ address: escrow!, abi: ESCROW_ABI, functionName: "verdictOf", args: [id] });
      if (release || refund) await sendEscrow("settle", [id]);
    } catch (err) {
      console.error(`X Layer settle for ${order.orderNumber} failed`, err);
    }
  }
  await processEscrowLogs();
}

export function startXlayerWatcher() {
  if (!xlayerOn()) return;
  setInterval(() => void processEscrowLogs().catch((err) => console.error("X Layer watch failed", err)), 15_000);
  setInterval(() => void settleDecided().catch((err) => console.error("X Layer settling failed", err)), 10 * 60_000);
}

/** For Admin → Settings: whether it's set up, and the operator's gas */
export async function xlayerStatus() {
  if (!xlayerOn()) return { setUp: false, escrow: escrow ?? null, operator: operator?.address ?? null, gas: null, mode: await xlayerMode() };
  const gas = await reader.getBalance({ address: operator!.address }).catch(() => null);
  return { setUp: true, escrow: escrow!, operator: operator!.address, gas: gas === null ? null : Number(gas) / 1e18, mode: await xlayerMode(), checker: XLAYER_CHECKER };
}
