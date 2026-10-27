// The contracts on chain, for the admin: where they are, whether they're running, the operator's gas,
// what's waiting to be written, and the button that sends a batch to Base.
import { deployments, sotechyReceiptsAbi, sotechyTokensAbi, type ContractName } from "@sotechy/contracts";
import { Hono } from "hono";
import { formatEther } from "viem";
import { audit } from "../../lib/audit";
import { requirePassword, requireRole, type AppEnv } from "../../lib/auth";
import { HttpError } from "../../lib/errors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CHAINS, copyToNewContract, currentContract, needsCopy, publicClient, queueStats, retryStuck, sendBaseBatch, type ChainName } from "../../services/chain";
import { CROSS_BONUS, latestActivity, reserveSummary, tokenRegistry } from "../../services/tokens";
import { db } from "../../db/client";

const ADMIN = requireRole("admin");

/** Below this the operator could run out mid-day, so the admin is warned */
const LOW_GAS = { monad: 2, base: 0.00005 } as const;

async function contractStatus(contract: ContractName, chain: ChainName) {
  const current = currentContract(contract, chain);
  if (!current) return null;
  const { explorer } = CHAINS[chain];
  const base = {
    contract,
    address: current.address,
    version: current.version,
    deployedAt: current.deployedAt,
    url: `${explorer}/address/${current.address}`,
    earlier: (deployments[contract][chain] ?? []).slice(0, -1).map((d) => ({ version: d.version, address: d.address, url: `${explorer}/address/${d.address}` })),
  };
  try {
    const client = publicClient(chain);
    const abi = contract === "tokens" ? sotechyTokensAbi : sotechyReceiptsAbi;
    const read = (functionName: "paused" | "retired") => client.readContract({ address: current.address, abi, functionName }) as Promise<boolean>;
    const [paused, retired] = await Promise.all([read("paused"), read("retired")]);
    let detail: Record<string, number> = {};
    if (contract === "tokens") {
      const r = (functionName: "maxMintPerOp" | "maxMintPerDay" | "mintedToday") => client.readContract({ address: current.address, abi: sotechyTokensAbi, functionName });
      const [perMint, perDay, mintedToday] = await Promise.all([r("maxMintPerOp"), r("maxMintPerDay"), r("mintedToday")]);
      detail = { perMint: Number(perMint), perDay: Number(perDay), mintedToday: Number(mintedToday) };
    } else {
      detail = { issued: Number(await client.readContract({ address: current.address, abi: sotechyReceiptsAbi, functionName: "totalIssued" })) };
    }
    return { ...base, reachable: true, state: retired ? "retired" : paused ? "paused" : "running", needsCopy: await needsCopy(contract, chain), ...detail };
  } catch {
    return { ...base, reachable: false };
  }
}

async function chainStatus(chain: ChainName) {
  const [tokens, receipts] = await Promise.all([contractStatus("tokens", chain), contractStatus("receipts", chain)]);
  // Before a chain has contracts, its card still shows the wallets' gas (same wallets everywhere)
  const any = currentContract("tokens", chain) ?? currentContract("receipts", chain) ?? currentContract("tokens", "monad");
  if (!any) return null;
  const { explorer, chain: c } = CHAINS[chain];
  const wallet = async (address: `0x${string}`) => {
    try {
      return { address, url: `${explorer}/address/${address}`, balance: Number(formatEther(await publicClient(chain).getBalance({ address }))) };
    } catch {
      return { address, url: `${explorer}/address/${address}`, balance: null };
    }
  };
  const [operator, owner] = await Promise.all([wallet(any.operator), wallet(any.owner)]);
  return {
    chain,
    chainName: c.name,
    primary: chain === "monad",
    symbol: c.nativeCurrency.symbol,
    operator: { ...operator, low: operator.balance !== null && operator.balance < LOW_GAS[chain] },
    owner,
    lowGas: LOW_GAS[chain],
    contracts: [tokens, receipts].filter((x) => x !== null),
  };
}

export const adminChainRoutes = new Hono<AppEnv>()
  .get("/chain", async (c) => {
    const [chains, queue, tokens, activity, reserve] = await Promise.all([Promise.all((["monad", "base"] as const).map(chainStatus)), queueStats(), tokenRegistry(), latestActivity(), reserveSummary()]);
    const tokensContract = currentContract("tokens", "monad");
    const explorer = CHAINS.monad.explorer;
    return c.json({
      chains: chains.filter((x) => x !== null),
      queue,
      tokens,
      tokensUrl: tokensContract ? `${explorer}/address/${tokensContract.address}` : null,
      activity: activity.map((a) => ({ ...a, txUrl: a.tx ? `${explorer}/tx/${a.tx}` : null })),
      rules: { perNaira: 1, crossBonus: CROSS_BONUS },
      reserve,
    });
  })
  /** The reserve and this month's fees, for the dashboard (no chain reads) */
  .get("/reserve", async (c) => {
    const reserve = await reserveSummary();
    // Orders: the reserve gets half of the fee and the rest is revenue. Walk-ins: all of their 1% goes to the reserve.
    const fromOrders = Math.max(0, reserve.inThisMonth - reserve.walkInFeesThisMonth);
    return c.json({ ...reserve, feesThisMonth: { total: fromOrders * 2 + reserve.walkInFeesThisMonth, reserve: reserve.inThisMonth, revenue: fromOrders } });
  })
  /** Copies everything Monad has onto Base, only when an admin asks */
  .post("/chain/base-batch", ADMIN, requirePassword, async (c) => {
    try {
      const result = await sendBaseBatch();
      await audit(db, { actorId: c.get("user").id, action: "chain.base_batch", entityType: "chain", details: result });
      return c.json(result);
    } catch (err) {
      throw new HttpError(400, err instanceof Error ? err.message : "The Base batch failed");
    }
  })
  /** After deploying a new contract: rebuild it from the ledger (tokens, balances or receipts) */
  .post("/chain/copy", ADMIN, requirePassword, zValidator("json", z.object({ contract: z.enum(["tokens", "receipts"]), chain: z.enum(["monad", "base"]) })), async (c) => {
    const { contract, chain } = c.req.valid("json");
    try {
      const result = await copyToNewContract(contract, chain);
      await audit(db, { actorId: c.get("user").id, action: "chain.copy_to_new_contract", entityType: "chain", details: { contract, chain, ...result } });
      return c.json(result);
    } catch (err) {
      throw new HttpError(400, err instanceof Error ? err.message : "The copy failed");
    }
  })
  /** Lets changes that failed too often on Monad go again */
  .post("/chain/retry", ADMIN, async (c) => {
    const retried = await retryStuck();
    await audit(db, { actorId: c.get("user").id, action: "chain.retry", entityType: "chain", details: { retried } });
    return c.json({ retried });
  });
