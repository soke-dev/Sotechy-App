// The contracts on chain, for the admin: where they are, whether they're running, the operator's gas,
// what's waiting to be written, and the button that sends a batch to Base.
import { chainView, forgetPrimary, primaryChain } from "../../services/chain-primary";
import { deployments, sotechyReceiptsAbi, sotechyTokensAbi, type ContractName } from "@sotechy/contracts";
import { Hono } from "hono";
import { formatEther } from "viem";
import { audit } from "../../lib/audit";
import { requirePassword, requireRole, type AppEnv } from "../../lib/auth";
import { HttpError } from "../../lib/errors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CHAINS, copyToNewContract, currentContract, needsCopy, publicClient, queueStats, retryStuck, sendBaseBatch, type EvmChain } from "../../services/chain";
import { nearBalance, nearOn, nearRead } from "../../services/near";
import { linksOn } from "../../services/chain-primary";
import { env } from "../../env";
import { CROSS_BONUS, latestActivity, reserveSummary, tokenRegistry } from "../../services/tokens";
import { db, schema } from "../../db/client";

const ADMIN = requireRole("admin");

/** Below this the operator could run out mid-day, so the admin is warned */
const LOW_GAS = { monad: 2, base: 0.00005 } as const;

async function contractStatus(contract: ContractName, chain: EvmChain) {
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

async function chainStatus(chain: EvmChain) {
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
    primary: chain === (await primaryChain()),
    symbol: c.nativeCurrency.symbol,
    operator: { ...operator, low: operator.balance !== null && operator.balance < LOW_GAS[chain] },
    owner,
    lowGas: LOW_GAS[chain],
    contracts: [tokens, receipts].filter((x) => x !== null),
  };
}

/** Below this the NEAR operator could run out of gas, so the admin is warned */
const LOW_NEAR = 0.05;

/** The Sotechy contract on NEAR (store tokens and receipts in one), as a card like Monad's and Base's */
async function nearStatus() {
  if (!env.NEAR_CONTRACT || !env.NEAR_OPERATOR_ACCOUNT) return null;
  const links = linksOn("near");
  const contract = env.NEAR_CONTRACT;
  const wallet = async (accountId: string) => {
    const b = await nearBalance(accountId).catch(() => null);
    return { address: accountId, url: links.address(accountId), balance: b ? Math.round(b.free * 10_000) / 10_000 : null };
  };
  const base = { address: contract, version: 1, url: links.address(contract), earlier: [] };
  // Each read stands alone, so one refused request doesn't blank the whole card
  const [paused, limits, issued, ownerId] = await Promise.allSettled([
    nearRead<boolean>("is_paused"),
    nearRead<{ max_mint_per_op: string; max_mint_per_day: string; minted_today: string }>("limits"),
    nearRead<string>("nft_total_supply"),
    nearRead<string>("owner"),
  ]);
  const got = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
  const reachable = paused.status === "fulfilled";
  const state = got(paused) ? "paused" : "running";
  const l = got(limits);
  const contracts: object[] = [
    { ...base, contract: "tokens", reachable, state, needsCopy: false, ...(l && { perMint: Number(l.max_mint_per_op), perDay: Number(l.max_mint_per_day), mintedToday: Number(l.minted_today) }) },
    { ...base, contract: "receipts", reachable, state, needsCopy: false, ...(got(issued) !== undefined && { issued: Number(got(issued)) }) },
  ];
  const owner = got(ownerId) ? await wallet(got(ownerId)!) : { address: "", url: "", balance: null as number | null };
  const operator = await wallet(env.NEAR_OPERATOR_ACCOUNT);
  return {
    chain: "near" as const,
    chainName: "NEAR",
    primary: (await chainView()).chain === "near",
    symbol: "NEAR",
    // What's free to spend: the rest of the balance holds the account's storage
    operator: { ...operator, low: operator.balance !== null && operator.balance < LOW_NEAR },
    owner,
    lowGas: LOW_NEAR,
    contracts,
    writesOn: nearOn(),
  };
}

export const adminChainRoutes = new Hono<AppEnv>()
  .get("/chain", async (c) => {
    const [evm, near, queue, tokens, activity, reserve] = await Promise.all([Promise.all((["monad", "base"] as const).map(chainStatus)), nearStatus(), queueStats(), tokenRegistry(), latestActivity(), reserveSummary()]);
    const chains = [...evm, near];
    const { chain: primary, links } = await chainView();
    return c.json({
      chains: chains.filter((x) => x !== null),
      primary,
      queue,
      tokens,
      tokensUrl: links.tokensContract,
      activity: activity.map((a) => ({ ...a, txUrl: a.tx ? links.tx(a.tx) : null })),
      rules: { perNaira: 1, crossBonus: CROSS_BONUS },
      reserve: {
        ...reserve,
        wallets: reserve.wallets.map((w) => ({
          ...w,
          url: links.address(w.address),
          byToken: w.byToken.map((t) => ({ ...t, ticker: tokens.find((x) => x.tokenId === t.tokenId)?.ticker ?? `#${t.tokenId}` })),
        })),
      },
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
  /** Makes Monad, Base or NEAR the main chain: new changes are written there and every link points at it. Switching
   *  to Base writes everything already recorded onto Base too. NEAR gets every change whichever chain is main. */
  .put("/chain/primary", ADMIN, requirePassword, zValidator("json", z.object({ chain: z.enum(["monad", "base", "near"]) })), async (c) => {
    const { chain } = c.req.valid("json");
    if (chain === "near") {
      if (!nearOn()) throw new HttpError(400, "NEAR isn't set up on this server yet (NEAR_CONTRACT, NEAR_OPERATOR_ACCOUNT and NEAR_OPERATOR_KEY)");
    } else if (!currentContract("tokens", chain) || !currentContract("receipts", chain)) throw new HttpError(400, `The contracts aren't deployed on ${chain === "base" ? "Base" : "Monad"} yet`);
    const value = { primary: chain };
    await db.insert(schema.appSettings).values({ key: "chain", value }).onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
    forgetPrimary();
    await audit(db, { actorId: c.get("user").id, action: "chain.primary", entityType: "chain", details: value });
    return c.json(value);
  })
  /** Lets changes that failed too often on Monad go again */
  .post("/chain/retry", ADMIN, async (c) => {
    const retried = await retryStuck();
    await audit(db, { actorId: c.get("user").id, action: "chain.retry", entityType: "chain", details: { retried } });
    return c.json({ retried });
  });
