// The token contract on chain, for the admin: where it is, whether it's running, its limits,
// and how much gas the operator wallet has left. Read live from the chain; no keys needed.
import { deployments, sotechyTokensAbi } from "@sotechy/contracts";
import { Hono } from "hono";
import { createPublicClient, formatEther, http, type Chain } from "viem";
import { base, baseSepolia, monad, monadTestnet } from "viem/chains";
import type { AppEnv } from "../../lib/auth";

const CHAINS: Record<string, { chain: Chain; explorer: string; primary: boolean }> = {
  monad: { chain: monad, explorer: "https://monadvision.com", primary: true },
  base: { chain: base, explorer: "https://basescan.org", primary: false },
  "monad-testnet": { chain: monadTestnet, explorer: "https://testnet.monadvision.com", primary: false },
  "base-sepolia": { chain: baseSepolia, explorer: "https://sepolia.basescan.org", primary: false },
};

/** Below this the operator could run out mid-day, so the admin is warned */
const LOW_GAS = 2;

async function chainStatus(name: string) {
  const known = CHAINS[name];
  const list = deployments[name] ?? [];
  const current = list.at(-1);
  if (!known || !current) return null;
  const client = createPublicClient({ chain: known.chain, transport: http() });
  const read = (functionName: "paused" | "retired" | "maxMintPerOp" | "maxMintPerDay" | "mintedToday") => client.readContract({ address: current.address, abi: sotechyTokensAbi, functionName });
  const base = {
    chain: name,
    chainName: known.chain.name,
    chainId: current.chainId,
    primary: known.primary,
    symbol: known.chain.nativeCurrency.symbol,
    address: current.address,
    version: current.version,
    deployedAt: current.deployedAt,
    contractUrl: `${known.explorer}/address/${current.address}`,
    operator: { address: current.operator, url: `${known.explorer}/address/${current.operator}` },
    owner: { address: current.owner, url: `${known.explorer}/address/${current.owner}` },
    earlier: list.slice(0, -1).map((d) => ({ version: d.version, address: d.address, url: `${known.explorer}/address/${d.address}` })),
  };
  try {
    const [paused, retired, maxMintPerOp, maxMintPerDay, mintedToday, operatorWei, ownerWei] = await Promise.all([
      read("paused"),
      read("retired"),
      read("maxMintPerOp"),
      read("maxMintPerDay"),
      read("mintedToday"),
      client.getBalance({ address: current.operator }),
      client.getBalance({ address: current.owner }),
    ]);
    const operatorBalance = Number(formatEther(operatorWei));
    return {
      ...base,
      reachable: true as const,
      state: retired ? "retired" : paused ? "paused" : "running",
      limits: { perMint: Number(maxMintPerOp), perDay: Number(maxMintPerDay), mintedToday: Number(mintedToday) },
      operator: { ...base.operator, balance: operatorBalance, low: operatorBalance < LOW_GAS },
      owner: { ...base.owner, balance: Number(formatEther(ownerWei)) },
    };
  } catch {
    return { ...base, reachable: false as const };
  }
}

export const adminChainRoutes = new Hono<AppEnv>().get("/chain", async (c) => {
  const chains = (await Promise.all(Object.keys(deployments).map(chainStatus))).filter((x) => x !== null);
  return c.json({ chains, lowGas: LOW_GAS });
});
