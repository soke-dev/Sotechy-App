// Pay with almost any coin on almost any chain through NEAR Intents (the 1Click API): the customer sends what they
// hold to a one-off deposit address, solvers swap it, and Sotechy receives exactly the order's total in USDC on Base.
// Nothing is held by 1Click; if the swap can't happen, the customer's coins go back to the address they gave.
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../env";
import { getUsdRate } from "./moneymoves";
import { getSetting } from "./settings";
import { confirmPayment } from "./orders";
import { findDepositTx } from "./deposit-watch";

const API = "https://1click.chaindefuser.com/v0";
/** What Sotechy receives: USDC on Base */
export const USDC_BASE = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";

/** Networks for USDT and USDC, in the order they're offered (Solana first). Keys are 1Click's chain codes. */
const STABLE_NETWORKS = ["sol", "tron", "bsc", "base", "eth", "ton", "near", "monad", "arb", "pol", "op", "avax", "aptos", "sui", "stellar"];
/** Native coins after the stablecoins: [chain, symbol as 1Click lists it] */
const NATIVES: [string, string][] = [
  ["sol", "SOL"], ["btc", "BTC"], ["eth", "ETH"], ["bsc", "BNB"], ["tron", "TRX"], ["near", "wNEAR"], ["monad", "MON"], ["xrp", "XRP"], ["doge", "DOGE"],
  ["ltc", "LTC"], ["ton", "TON"], ["avax", "AVAX"], ["pol", "POL"], ["sui", "SUI"], ["aptos", "APT"], ["cardano", "ADA"],
  ["stellar", "XLM"], ["bch", "BCH"], ["zec", "ZEC"], ["base", "ETH"], ["arb", "ETH"],
];
/** Where a chain lists more than one token with the same symbol, the canonical one */
const PREFERRED: Record<string, string> = {
  "near:USDT": "nep141:usdt.tether-token.near",
  "near:USDC": "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
};

const CHAIN_NAME: Record<string, string> = {
  tron: "Tron", bsc: "BNB Chain", monad: "Monad", base: "Base", eth: "Ethereum", sol: "Solana", ton: "TON", near: "NEAR", arb: "Arbitrum",
  pol: "Polygon", op: "Optimism", avax: "Avalanche", aptos: "Aptos", sui: "Sui", stellar: "Stellar", btc: "Bitcoin",
  xrp: "XRP Ledger", doge: "Dogecoin", ltc: "Litecoin", cardano: "Cardano", bch: "Bitcoin Cash", zec: "Zcash",
};

/** A coin on offer. `net` (1Click's chain code) and `contract` are for spotting payments, not shown in the app. */
export type IntentsAsset = { assetId: string; symbol: string; chain: string; decimals: number; priceUsd: number; net?: string; contract?: string | null };

/** Set up when Sotechy has a Base address to receive USDC at */
export const intentsOn = () => !!env.INTENTS_RECIPIENT;

/** Offered in the app: set up, and not switched off in Admin → Settings (on until an admin turns it off) */
export async function intentsAvailable() {
  if (!intentsOn()) return false;
  const s = await getSetting<{ enabled?: string | null }>("intents");
  return !s || s.enabled === "on";
}

async function oneClick<T>(method: "GET" | "POST", path: string, body?: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(env.ONECLICK_JWT && { authorization: `Bearer ${env.ONECLICK_JWT}` }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `1Click answered ${res.status}`);
  return data;
}

let assets: { list: IntentsAsset[]; at: number } | null = null;

/** The coins on offer, with 1Click's current prices (kept for five minutes) */
export async function intentsAssets(): Promise<IntentsAsset[]> {
  if (assets && Date.now() - assets.at < 5 * 60_000) return assets.list;
  const all = await oneClick<{ assetId: string; symbol: string; blockchain: string; decimals: number; price: number; contractAddress?: string }[]>("GET", "/tokens");
  // USDT0 is Tether's own cross-chain USDT (on Monad, for one), so it's shown as USDT
  const SAME: Record<string, string[]> = { USDT: ["USDT", "USDT0"] };
  const pick = (chain: string, symbol: string) => {
    const found = all.filter((t) => t.blockchain === chain && (SAME[symbol] ?? [symbol]).includes(t.symbol));
    const t = found.find((x) => x.assetId === PREFERRED[`${chain}:${symbol}`]) ?? found[0];
    const shown = t?.symbol === "wNEAR" ? "NEAR" : t?.symbol === "USDT0" ? "USDT" : t?.symbol;
    return t ? [{ assetId: t.assetId, symbol: shown!, chain: CHAIN_NAME[chain] ?? chain, decimals: t.decimals, priceUsd: t.price, net: chain, contract: t.contractAddress || null }] : [];
  };
  // Stablecoins first (USDC before USDT on Solana, USDT before USDC elsewhere), then native coins
  const stables = (chain: string) => (chain === "sol" ? ["USDC", "USDT"] : ["USDT", "USDC"]);
  const list = [...STABLE_NETWORKS.flatMap((chain) => stables(chain).flatMap((symbol) => pick(chain, symbol))), ...NATIVES.flatMap(([chain, symbol]) => pick(chain, symbol))];
  assets = { list, at: Date.now() };
  return list;
}

/** What one Intents payment keeps on payments.raw */
export type SavedIntent = {
  depositAddress: string;
  depositMemo: string | null;
  originAsset: string;
  symbol: string;
  chain: string;
  amountIn: string;
  amountInFormatted: string;
  amountOutUsdc: string;
  rate: number;
  deadline: string;
};

export const savedIntent = (raw: unknown) => (raw as { intents?: SavedIntent } | null)?.intents ?? null;

/** Every deposit address this payment has been given, newest first: a customer may pay one, leave, and come back
 *  for another coin, and the first payment must still confirm the order */
export const allIntents = (raw: unknown): SavedIntent[] => {
  const r = raw as { intents?: SavedIntent; earlier?: SavedIntent[] } | null;
  return [...(r?.intents ? [r.intents] : []), ...(r?.earlier ?? [])];
};

/** payments.raw with a new deposit address in front and the earlier ones kept (the last five) */
export const withIntent = (raw: unknown, intent: SavedIntent) => ({
  ...((raw as object | null) ?? {}),
  intents: intent,
  earlier: allIntents(raw).filter((i) => i.depositAddress !== intent.depositAddress).slice(0, 5),
});

/** The crypto deposits on payments.raw, to carry over when another way to pay rewrites it */
export const keepIntents = (raw: unknown) => {
  const [intents, ...earlier] = allIntents(raw);
  return intents ? { intents, earlier } : {};
};

/**
 * A live quote for the order's pending payment: how much of the chosen coin to send, and where. The amount comes from
 * the database (the order's naira total at today's rate), never from the app.
 */
export async function openIntent(payment: typeof schema.payments.$inferSelect, originAsset: string, refundTo: string): Promise<SavedIntent> {
  const asset = (await intentsAssets()).find((a) => a.assetId === originAsset);
  if (!asset) throw new Error("That coin isn't offered");
  const { rate } = await getUsdRate();
  // Rounded up to the cent, so Sotechy never receives less than the order's total
  const usdc = Math.ceil((payment.amount / rate) * 100) / 100;
  const deadline = new Date(Date.now() + 30 * 60_000).toISOString();
  const q = await oneClick<{ quote: { depositAddress: string; depositMemo?: string; amountIn: string; amountInFormatted: string; deadline?: string } }>("POST", "/quote", {
    dry: false,
    swapType: "EXACT_OUTPUT",
    slippageTolerance: 100,
    originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: USDC_BASE,
    amount: String(Math.round(usdc * 1_000_000)),
    refundTo,
    refundType: "ORIGIN_CHAIN",
    recipient: env.INTENTS_RECIPIENT,
    recipientType: "DESTINATION_CHAIN",
    deadline,
  });
  return {
    depositAddress: q.quote.depositAddress,
    depositMemo: q.quote.depositMemo ?? null,
    originAsset,
    symbol: asset.symbol,
    chain: asset.chain,
    amountIn: q.quote.amountIn,
    amountInFormatted: q.quote.amountInFormatted,
    amountOutUsdc: usdc.toFixed(2),
    rate,
    deadline: q.quote.deadline ?? deadline,
  };
}

type Status = "PENDING_DEPOSIT" | "KNOWN_DEPOSIT_TX" | "PROCESSING" | "SUCCESS" | "INCOMPLETE_DEPOSIT" | "REFUNDED" | "FAILED";

/** Where an Intents payment is now; a finished swap confirms the payment (and so the order) */
export async function checkIntent(payment: typeof schema.payments.$inferSelect): Promise<Status | null> {
  const all = allIntents(payment.raw);
  if (!all.length) return null;
  type Swap = { status: Status; swapDetails?: { destinationChainTxHashes?: { hash: string }[]; originChainTxHashes?: { hash: string }[] } };
  const statusOf = (saved: SavedIntent) =>
    oneClick<Swap>("GET", `/status?depositAddress=${encodeURIComponent(saved.depositAddress)}${saved.depositMemo ? `&depositMemo=${encodeURIComponent(saved.depositMemo)}` : ""}`);
  // The newest address first; the earlier ones too, in case the customer paid one of those before switching coins
  let current: Status | null = null;
  for (const [i, saved] of all.entries()) {
    let s = await statusOf(saved).catch(() => null);
    if (!s) continue;
    // Not seen by 1Click yet: look on the network ourselves, and if it's there, hand 1Click the transaction
    if (s.status === "PENDING_DEPOSIT" && (await nudge(saved))) s = (await statusOf(saved).catch(() => null)) ?? s;
    if (i === 0) current = s.status;
    if (s.status === "SUCCESS") {
      await settle(payment, saved, s);
      return "SUCCESS";
    }
    // An earlier address that's already received money takes over from an unpaid new one
    if (i > 0 && current === "PENDING_DEPOSIT" && (s.status === "KNOWN_DEPOSIT_TX" || s.status === "PROCESSING")) current = s.status;
  }
  return current;
}

/** A finished swap confirms the payment, and so the order */
async function settle(payment: typeof schema.payments.$inferSelect, saved: SavedIntent, s: { status: Status; swapDetails?: { destinationChainTxHashes?: { hash: string }[]; originChainTxHashes?: { hash: string }[] } }) {
  if (s.status === "SUCCESS" && payment.status === "pending") {
    const tx = s.swapDetails?.destinationChainTxHashes?.[0]?.hash ?? s.swapDetails?.originChainTxHashes?.[0]?.hash;
    await confirmPayment(payment.id, {
      // 1Click delivered exactly the quoted USDC, which was the order's total at the quoted rate
      amountPaid: payment.amount,
      provider: "near-intents",
      providerReference: `intents:${saved.depositAddress}`,
      txHash: tx,
      raw: { ...withIntent(payment.raw, saved), status: s },
      verifiedBy: null,
      note: `Paid ${saved.amountInFormatted} ${saved.symbol} on ${saved.chain}; received ${saved.amountOutUsdc} USDC on Base through NEAR Intents`,
    });
  }
}

/**
 * Tells 1Click about the customer's transaction, so it picks the deposit up straight away instead of waiting to spot
 * it on the network. Optional: without it the deposit is still found, just later.
 */
export async function submitDeposit(payment: typeof schema.payments.$inferSelect, txHash: string) {
  const saved = savedIntent(payment.raw);
  if (!saved) throw new Error("This payment has no crypto deposit open");
  await submitTx(saved, txHash);
}

const submitTx = (saved: SavedIntent, txHash: string) =>
  oneClick("POST", "/deposit/submit", { depositAddress: saved.depositAddress, txHash, ...(saved.depositMemo && { memo: saved.depositMemo }) });

/** Deposit addresses already looked for (when, and the transaction found), so the networks aren't asked too often */
const nudged = new Map<string, { at: number; tx?: string }>();

/**
 * Looks for the customer's transfer on its network (Solana, Tron, BNB Chain, Base, Ethereum) and hands it to 1Click,
 * so the payment is picked up within seconds. At most every 6 seconds per address, and once per transaction found.
 * True when a transaction was just handed over.
 */
async function nudge(saved: SavedIntent): Promise<boolean> {
  const seen = nudged.get(saved.depositAddress);
  if (seen && (seen.tx || Date.now() - seen.at < 6_000)) return false;
  if (nudged.size > 5_000) nudged.clear();
  nudged.set(saved.depositAddress, { at: Date.now() });
  const asset = (await intentsAssets().catch(() => [])).find((a) => a.assetId === saved.originAsset);
  if (!asset) return false;
  const tx = await findDepositTx(saved.depositAddress, asset).catch(() => null);
  if (!tx) return false;
  nudged.set(saved.depositAddress, { at: Date.now(), tx });
  // Already known to 1Click is fine too
  await submitTx(saved, tx).catch((err) => console.warn(`Deposit ${tx} not handed to 1Click:`, err instanceof Error ? err.message : err));
  return true;
}

/** When each open payment was last checked in the background */
const lastChecked = new Map<string, number>();

/**
 * Confirms Intents payments in the background, for customers who close the app before the swap finishes: every 10
 * seconds while a payment is in its first hour (when nearly every payment arrives), every 30 seconds after that.
 */
export function startIntentsWatcher() {
  if (!intentsOn()) return;
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const open = await db
        .select()
        .from(schema.payments)
        .where(and(eq(schema.payments.status, "pending"), sql`${schema.payments.raw} ? 'intents'`, sql`${schema.payments.createdAt} > now() - interval '4 days'`));
      for (const p of open) {
        const young = Date.now() - p.createdAt.getTime() < 60 * 60_000;
        if (!young && Date.now() - (lastChecked.get(p.id) ?? 0) < 30_000) continue;
        lastChecked.set(p.id, Date.now());
        await checkIntent(p).catch((err) => console.error(`Intents check for payment ${p.id} failed`, err instanceof Error ? err.message : err));
      }
      if (lastChecked.size > 5_000) lastChecked.clear();
    } catch (err) {
      console.error("Intents watcher failed", err);
    } finally {
      busy = false;
    }
  }, 10_000);
}
