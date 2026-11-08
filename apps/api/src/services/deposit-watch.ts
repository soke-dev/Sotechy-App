// Spots a customer's crypto payment on its own network as soon as it lands, on the networks most customers use
// (Solana, Tron, BNB Chain, Base, Ethereum), so NEAR Intents can be handed the transaction straight away instead of
// waiting to notice it. Payments on other networks, and native coins on the EVM ones, are still found by NEAR Intents
// itself, just later.
import { createPublicClient, fallback, http, parseAbiItem, type Address, type PublicClient } from "viem";
import { base, bsc, mainnet } from "viem/chains";
import { env } from "../env";

/** An Alchemy endpoint, when there's a key (ALCHEMY_API_KEY) */
const alchemy = (network: string) => (env.ALCHEMY_API_KEY ? [`https://${network}.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`] : []);

/** EVM networks: Alchemy first, then a free node; and how far back to look for the transfer (about an hour or more) */
const EVM = {
  eth: { chain: mainnet, rpcs: [...alchemy("eth-mainnet"), "https://ethereum-rpc.publicnode.com"], window: 900n },
  base: { chain: base, rpcs: [...alchemy("base-mainnet"), "https://base-rpc.publicnode.com"], window: 3600n },
  bsc: { chain: bsc, rpcs: [...alchemy("bnb-mainnet"), "https://bsc-rpc.publicnode.com"], window: 5000n },
} as const;
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
/** Free Solana nodes refuse token-account lookups without a key, so Alchemy goes first when there is one */
const SOLANA_RPCS = [...alchemy("solana-mainnet"), "https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
const TRONGRID = "https://api.trongrid.io";

/** What's needed to find a coin's transfers: 1Click's chain code, and the token's contract (none for native coins) */
export type Watchable = { net?: string; contract?: string | null };

/** The transaction that paid this deposit address, if one has landed */
export async function findDepositTx(depositAddress: string, asset: Watchable): Promise<string | null> {
  const contract = asset.contract || null;
  if (asset.net === "sol") return solana(depositAddress, contract);
  if (asset.net === "tron") return tron(depositAddress, contract);
  if (asset.net && asset.net in EVM && contract) return evm(asset.net as keyof typeof EVM, depositAddress as Address, contract as Address);
  return null;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return (await res.json()) as T;
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  let last: unknown = null;
  for (const url of SOLANA_RPCS) {
    try {
      const r = await json<{ result?: T; error?: { message: string } }>(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (r.error) throw new Error(r.error.message);
      return r.result as T;
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

/** Solana: a token arrives in the deposit address's token account for that mint; SOL arrives at the address itself */
async function solana(owner: string, mint: string | null) {
  // The address itself: a fresh deposit address's first token transfer creates its token account in the same
  // transaction, which lists the address. Then its token accounts for the mint, for transfers after that.
  const accounts = [owner];
  if (mint) {
    const r = await solanaRpc<{ value: { pubkey: string }[] }>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]).catch(() => ({ value: [] }));
    accounts.push(...r.value.slice(0, 3).map((a) => a.pubkey));
  }
  // The newest transfer wins
  let best: { signature: string; blockTime: number } | null = null;
  for (const account of accounts) {
    const signatures = await solanaRpc<{ signature: string; err: unknown; blockTime: number | null }[]>("getSignaturesForAddress", [account, { limit: 3 }]);
    const s = signatures.find((x) => !x.err);
    if (s && (!best || (s.blockTime ?? 0) > best.blockTime)) best = { signature: s.signature, blockTime: s.blockTime ?? 0 };
  }
  return best?.signature ?? null;
}

/** Tron: TRC-20 transfers (USDT) or TRX sent to the deposit address */
async function tron(address: string, contract: string | null) {
  if (contract) {
    const r = await json<{ data?: { transaction_id: string; to: string }[] }>(`${TRONGRID}/v1/accounts/${address}/transactions/trc20?only_to=true&limit=3&contract_address=${contract}`);
    return r.data?.find((t) => t.to === address)?.transaction_id ?? null;
  }
  const r = await json<{ data?: { txID: string }[] }>(`${TRONGRID}/v1/accounts/${address}/transactions?only_to=true&limit=3`);
  return r.data?.[0]?.txID ?? null;
}

const clients: Partial<Record<keyof typeof EVM, PublicClient>> = {};

/** EVM: the token's Transfer events to the deposit address in the last stretch of blocks */
async function evm(net: keyof typeof EVM, to: Address, token: Address) {
  const c = EVM[net];
  const client = (clients[net] ??= createPublicClient({ chain: c.chain, transport: fallback(c.rpcs.map((url) => http(url))) }) as PublicClient);
  const latest = await client.getBlockNumber();
  const logs = await client.getLogs({ address: token, event: TRANSFER, args: { to }, fromBlock: latest > c.window ? latest - c.window : 0n, toBlock: latest });
  return logs.at(-1)?.transactionHash ?? null;
}
