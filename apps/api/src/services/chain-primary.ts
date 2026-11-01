// Which chain is the main record (Admin → Tokens → chains): new token changes and receipts are written there
// first, and every link people see (wallets, activity, receipts) points at it. Monad until an admin switches.
import { schema } from "../db/client";
import { getSetting } from "./settings";

export type ChainName = "monad" | "base";

export const EXPLORER: Record<ChainName, string> = { monad: "https://monadvision.com", base: "https://basescan.org" };
export const CHAIN_LABEL: Record<ChainName, string> = { monad: "Monad", base: "Base" };

const ops = schema.chainOps;
let cache: { chain: ChainName; at: number } | null = null;

export async function primaryChain(): Promise<ChainName> {
  if (cache && Date.now() - cache.at < 15_000) return cache.chain;
  const s = await getSetting<{ primary?: ChainName }>("chain");
  const chain: ChainName = s?.primary === "base" ? "base" : "monad";
  cache = { chain, at: Date.now() };
  return chain;
}

/** After a switch, so the next read sees it straight away */
export const forgetPrimary = () => void (cache = null);

/** A chain's columns on a queued change: its transaction, when it went through, and why it last failed */
export const colsOf = (chain: ChainName) =>
  chain === "monad" ? { tx: ops.monadTx, at: ops.monadAt, error: ops.monadError, tries: ops.monadTries } : { tx: ops.baseTx, at: ops.baseAt, error: ops.baseError, tries: ops.baseTries };

/** The main chain, its explorer and its columns, for building links */
export async function chainView() {
  const chain = await primaryChain();
  return { chain, label: CHAIN_LABEL[chain], explorer: EXPLORER[chain], cols: colsOf(chain) };
}
