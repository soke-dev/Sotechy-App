// Pay with almost any coin on almost any chain through NEAR Intents (the 1Click API): the customer sends what they
// hold to a one-off deposit address, solvers swap it, and Sotechy receives exactly the order's total in USDC on Base.
// Nothing is held by 1Click; if the swap can't happen, the customer's coins go back to the address they gave.
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../env";
import { getUsdRate } from "./moneymoves";
import { getSetting } from "./settings";
import { confirmPayment } from "./orders";

const API = "https://1click.chaindefuser.com/v0";
/** What Sotechy receives: USDC on Base */
export const USDC_BASE = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";

/** The coins customers can pay with (1Click asset ids), in the order they're offered */
const OFFERED = [
  "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", // USDC on Base
  "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", // USDC on Ethereum
  "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near", // USDC on Solana
  "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", // USDC on Arbitrum
  "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", // USDC on NEAR
  "nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near", // USDT on Tron
  "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near", // USDT on Ethereum
  "nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near", // USDT on Solana
  "nep141:usdt.tether-token.near", // USDT on NEAR
  "nep141:btc.omft.near", // BTC
  "nep141:eth.omft.near", // ETH
  "nep141:base.omft.near", // ETH on Base
  "nep141:sol.omft.near", // SOL
  "nep141:wrap.near", // NEAR
];

const CHAIN_NAME: Record<string, string> = { base: "Base", eth: "Ethereum", sol: "Solana", arb: "Arbitrum", near: "NEAR", tron: "Tron", btc: "Bitcoin" };

export type IntentsAsset = { assetId: string; symbol: string; chain: string; decimals: number; priceUsd: number };

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
  const all = await oneClick<{ assetId: string; symbol: string; blockchain: string; decimals: number; price: number }[]>("GET", "/tokens");
  const byId = new Map(all.map((t) => [t.assetId, t]));
  const list = OFFERED.flatMap((id) => {
    const t = byId.get(id);
    return t ? [{ assetId: id, symbol: t.symbol === "wNEAR" ? "NEAR" : t.symbol, chain: CHAIN_NAME[t.blockchain] ?? t.blockchain, decimals: t.decimals, priceUsd: t.price }] : [];
  });
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
  const saved = savedIntent(payment.raw);
  if (!saved) return null;
  const memo = saved.depositMemo ? `&depositMemo=${encodeURIComponent(saved.depositMemo)}` : "";
  const s = await oneClick<{ status: Status; swapDetails?: { destinationChainTxHashes?: { hash: string }[]; originChainTxHashes?: { hash: string }[] } }>(
    "GET",
    `/status?depositAddress=${encodeURIComponent(saved.depositAddress)}${memo}`,
  );
  if (s.status === "SUCCESS" && payment.status === "pending") {
    const tx = s.swapDetails?.destinationChainTxHashes?.[0]?.hash ?? s.swapDetails?.originChainTxHashes?.[0]?.hash;
    await confirmPayment(payment.id, {
      // 1Click delivered exactly the quoted USDC, which was the order's total at the quoted rate
      amountPaid: payment.amount,
      provider: "near-intents",
      providerReference: `intents:${saved.depositAddress}`,
      txHash: tx,
      raw: { intents: saved, status: s },
      verifiedBy: null,
      note: `Paid ${saved.amountInFormatted} ${saved.symbol} on ${saved.chain}; received ${saved.amountOutUsdc} USDC on Base through NEAR Intents`,
    });
  }
  return s.status;
}

/** Confirms Intents payments in the background, for customers who close the app before the swap finishes */
export function startIntentsWatcher() {
  if (!intentsOn()) return;
  setInterval(async () => {
    try {
      const open = await db
        .select()
        .from(schema.payments)
        .where(and(eq(schema.payments.status, "pending"), eq(schema.payments.provider, "near-intents"), sql`${schema.payments.createdAt} > now() - interval '2 days'`));
      for (const p of open) await checkIntent(p).catch((err) => console.error(`Intents check for payment ${p.id} failed`, err instanceof Error ? err.message : err));
    } catch (err) {
      console.error("Intents watcher failed", err);
    }
  }, 30_000);
}
