// Which chain is the main record (Admin → Tokens → chains): new token changes and receipts are written there
// first, and every link people see (wallets, activity, receipts) points at it. Monad until an admin switches.
// Monad and Base are EVM chains written by chain.ts; NEAR is written by near.ts, which mirrors everything whichever
// chain is the main one.
import { deployments, type ContractName } from "@sotechy/contracts";
import { schema } from "../db/client";
import { env } from "../env";
import { getSetting } from "./settings";

export type EvmChain = "monad" | "base";
export type ChainName = EvmChain | "near";

export const EXPLORER: Record<ChainName, string> = {
  monad: "https://monadvision.com",
  base: "https://basescan.org",
  near: env.NEAR_NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io",
};
export const CHAIN_LABEL: Record<ChainName, string> = { monad: "Monad", base: "Base", near: "NEAR" };

const ops = schema.chainOps;
let cache: { chain: ChainName; at: number } | null = null;

export async function primaryChain(): Promise<ChainName> {
  if (cache && Date.now() - cache.at < 15_000) return cache.chain;
  const s = await getSetting<{ primary?: ChainName }>("chain");
  const chain: ChainName = s?.primary === "base" || s?.primary === "near" ? s.primary : "monad";
  cache = { chain, at: Date.now() };
  return chain;
}

/** After a switch, so the next read sees it straight away */
export const forgetPrimary = () => void (cache = null);

/** A chain's columns on a queued change: its transaction, when it went through, and why it last failed */
export const colsOf = (chain: ChainName) =>
  chain === "monad"
    ? { tx: ops.monadTx, at: ops.monadAt, error: ops.monadError, tries: ops.monadTries }
    : chain === "base"
      ? { tx: ops.baseTx, at: ops.baseAt, error: ops.baseError, tries: ops.baseTries }
      : { tx: ops.nearTx, at: ops.nearAt, error: ops.nearError, tries: ops.nearTries };

/** Where a contract lives on a chain: the latest EVM deploy, or the one Sotechy contract on NEAR */
export const contractOn = (contract: ContractName, chain: ChainName) =>
  chain === "near" ? (env.NEAR_CONTRACT ?? null) : (deployments[contract][chain]?.at(-1)?.address ?? null);

/**
 * Explorer links on a chain. NEAR names a customer's wallet by its lowercase 0x address (an eth-implicit account),
 * and its receipts by order number rather than receipt number.
 */
export function linksOn(chain: ChainName) {
  const ex = EXPLORER[chain];
  const tokens = contractOn("tokens", chain);
  const receipts = contractOn("receipts", chain);
  if (chain === "near") {
    return {
      tx: (hash: string) => `${ex}/txns/${hash}`,
      address: (address: string) => `${ex}/address/${address.toLowerCase()}`,
      tokensContract: tokens ? `${ex}/address/${tokens}` : null,
      token: () => (tokens ? `${ex}/address/${tokens}` : null),
      receipt: (r: { id: number; order?: string | null }) => (receipts && r.order ? `${ex}/nft-token/${receipts}/${encodeURIComponent(r.order)}` : null),
    };
  }
  return {
    tx: (hash: string) => `${ex}/tx/${hash}`,
    address: (address: string) => `${ex}/address/${address}`,
    tokensContract: tokens ? `${ex}/address/${tokens}` : null,
    token: (tokenId: number) => (tokens ? `${ex}/nft/${tokens}/${tokenId}` : null),
    receipt: (r: { id: number; order?: string | null }) => (receipts ? `${ex}/nft/${receipts}/${r.id}` : null),
  };
}

/** The main chain, its explorer, its columns and its links */
export async function chainView() {
  const chain = await primaryChain();
  return { chain, label: CHAIN_LABEL[chain], explorer: EXPLORER[chain], cols: colsOf(chain), links: linksOn(chain) };
}
