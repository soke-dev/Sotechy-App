// Copies the ledger onto the chains. The main chain (Monad, or Base once an admin switches) gets whatever's
// queued every few seconds. While Monad is the main one, Base is a mirror that only gets a batch when an admin
// sends one. Each queued change keeps its transaction per chain, so nothing is written twice and a failed
// write is simply tried again.
import { deployments, sotechyReceiptsAbi, sotechyTokensAbi, type ContractName } from "@sotechy/contracts";
import { and, asc, eq, inArray, isNotNull, isNull, like, lt, lte, not, or, sql } from "drizzle-orm";
import { createPublicClient, createWalletClient, http, type Address, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, monad } from "viem/chains";
import { db, schema } from "../db/client";
import { env } from "../env";
import { getSetting } from "./settings";
import { ensureStoreTokens, walletAddress } from "./tokens";
import { colsOf, EXPLORER, primaryChain, type ChainName } from "./chain-primary";

const ops = schema.chainOps;
export type { ChainName };

export const CHAINS: Record<ChainName, { chain: Chain; explorer: string; rpc?: string }> = {
  monad: { chain: monad, explorer: EXPLORER.monad, rpc: env.MONAD_RPC_URL },
  base: { chain: base, explorer: EXPLORER.base, rpc: env.BASE_RPC_URL },
};

/** After this many failed tries a change waits for an admin to try it again */
export const MAX_TRIES = 5;
const BATCH = 50;

export const chainWritesOn = () => !!env.CHAIN_OPERATOR_KEY && (env.NODE_ENV === "production" || env.CHAIN_WRITES_IN_DEV === "true");

/** The contract in use on a chain: the latest deploy */
export const currentContract = (contract: ContractName, chain: string) => deployments[contract][chain]?.at(-1) ?? null;

export const publicClient = (chain: ChainName) => createPublicClient({ chain: CHAINS[chain].chain, transport: http(CHAINS[chain].rpc) });

function walletClient(chain: ChainName) {
  const account = privateKeyToAccount(env.CHAIN_OPERATOR_KEY as Hex);
  return createWalletClient({ chain: CHAINS[chain].chain, transport: http(CHAINS[chain].rpc), account });
}

type Op = typeof ops.$inferSelect;
type Call = { contract: ContractName; functionName: string; args: unknown[] };

/** Sends one transaction and waits for it; throws if it's refused or reverts */
async function write(chain: ChainName, call: Call): Promise<Hex> {
  const deployed = currentContract(call.contract, chain);
  if (!deployed) throw new Error(`No ${call.contract} contract on ${chain}`);
  const pub = publicClient(chain);
  const wallet = walletClient(chain);
  const abi = call.contract === "tokens" ? sotechyTokensAbi : sotechyReceiptsAbi;
  const request = { address: deployed.address, abi, functionName: call.functionName, args: call.args, account: wallet.account } as const;
  // Monad charges for the gas limit, not the gas used, so keep the limit close to the estimate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gas = await pub.estimateContractGas(request as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hash = await wallet.writeContract({ ...(request as any), gas: (gas * 115n) / 100n, chain: CHAINS[chain].chain });
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 90_000 });
  if (receipt.status !== "success") throw Object.assign(new Error("The transaction reverted"), { hash });
  return hash;
}

const col = colsOf;

async function markDone(chain: ChainName, list: Op[], hash: Hex) {
  const ids = list.map((o) => o.id);
  const set = chain === "monad" ? { monadTx: hash, monadAt: new Date(), monadError: null } : { baseTx: hash, baseAt: new Date(), baseError: null };
  await db.update(ops).set(set).where(inArray(ops.id, ids));
}

async function markFailed(chain: ChainName, op: Op, err: unknown) {
  const e = err as { shortMessage?: string; message?: string };
  const message = (e.shortMessage ?? e.message ?? String(err)).slice(0, 500);
  if (chain === "monad") await db.update(ops).set({ monadError: message, monadTries: sql`${ops.monadTries} + 1` }).where(eq(ops.id, op.id));
  else await db.update(ops).set({ baseError: message, baseTries: sql`${ops.baseTries} + 1` }).where(eq(ops.id, op.id));
  console.error(`Chain write failed on ${chain} (op ${op.id})`, message);
}

/** Sends a group in one transaction; if that fails, one by one, stopping at the first that fails (later ones may depend on it) */
async function sendGroup(chain: ChainName, list: Op[], build: (list: Op[]) => Call): Promise<boolean> {
  if (!list.length) return true;
  try {
    await markDone(chain, list, await write(chain, build(list)));
    return true;
  } catch (err) {
    if (list.length === 1) {
      await markFailed(chain, list[0], err);
      return false;
    }
    for (const op of list) if (!(await sendGroup(chain, [op], build))) return false;
    return true;
  }
}

const tokenOp = (o: Op) => ({
  kind: o.kind === "mint" ? 0 : o.kind === "burn" ? 1 : 2,
  id: BigInt(o.data.tokenId),
  from: (o.data.from ?? "0x0000000000000000000000000000000000000000") as Address,
  to: (o.data.to ?? "0x0000000000000000000000000000000000000000") as Address,
  amount: BigInt(o.data.amount),
  ref: o.ref as Hex,
});

const receiptOp = (o: Op) => ({
  id: BigInt(o.data.receiptId),
  to: o.data.to as Address,
  store: BigInt(o.data.store),
  order: o.ref as Hex,
  fingerprint: o.data.fingerprint as Hex,
});

/**
 * What's waiting on a chain, oldest first. The main chain skips changes that have failed too often; the mirror
 * only copies what the main chain already has.
 */
async function waiting(chain: ChainName, contract: ContractName, kinds: string[], limit: number) {
  const c = col(chain);
  const primary = await primaryChain();
  const extra = chain === primary ? lt(c.tries, MAX_TRIES) : isNotNull(col(primary).at);
  return db
    .select()
    .from(ops)
    .where(and(eq(ops.contract, contract), inArray(ops.kind, kinds), isNull(c.at), extra))
    .orderBy(asc(ops.id))
    .limit(limit);
}

/** Token ids whose token is created on this chain's current contract (registrations from before a move don't count) */
async function registeredOn(chain: ChainName) {
  const c = col(chain);
  const rows = await db
    .select({ data: ops.data })
    .from(ops)
    .where(and(eq(ops.contract, "tokens"), eq(ops.kind, "register"), isNotNull(c.at), or(isNull(c.tx), not(like(c.tx, "moved:%")))));
  return new Set(rows.map((r) => Number(r.data.tokenId)));
}

// ---------------------------------------------------------------------------
// Moving to a new contract
// ---------------------------------------------------------------------------

const VERSIONS_KEY = "chainContractVersions";
type Versions = Record<string, number>;

const saveVersions = (v: Versions) =>
  db.insert(schema.appSettings).values({ key: VERSIONS_KEY, value: v }).onConflictDoUpdate({ target: schema.appSettings.key, set: { value: v } });

/** The contract version on each chain that the ledger has been copied to (the first deploy needs no copy) */
async function copiedVersions(): Promise<Versions> {
  const saved = (await getSetting<Versions>(VERSIONS_KEY)) ?? {};
  let changed = false;
  for (const contract of ["tokens", "receipts"] as const)
    for (const chain of ["monad", "base"] as const) {
      const key = `${contract}:${chain}`;
      const current = currentContract(contract, chain);
      if (current && saved[key] === undefined) {
        // First seen: the first deploy is where everything has been going; any later one needs a copy
        saved[key] = deployments[contract][chain][0].version;
        changed = true;
      }
    }
  if (changed) await saveVersions(saved);
  return saved;
}

/** A newer contract is deployed on this chain but the ledger hasn't been copied to it yet */
export async function needsCopy(contract: ContractName, chain: ChainName) {
  const current = currentContract(contract, chain);
  if (!current) return false;
  return current.version > ((await copiedVersions())[`${contract}:${chain}`] ?? current.version);
}

/** Largest amount one mint can carry, so a big balance is copied in several mints */
const MINT_CHUNK = 10_000_000;

/**
 * Rebuilds a new contract from the ledger: every token and every balance (for receipts: every receipt,
 * same numbers). What went to the old contract isn't sent again, and the other chain is left alone.
 */
export async function copyToNewContract(contract: ContractName, chain: ChainName) {
  const current = currentContract(contract, chain);
  if (!current) throw new Error(`No ${contract} contract on ${chain}`);
  if (!(await needsCopy(contract, chain))) throw new Error(`The ${contract} contract on ${chain} is already up to date`);
  const v = current.version;
  const movedTx = `moved:v${v}`;
  // The other chain never sees these
  const skipOther = chain === "monad" ? { baseAt: new Date(), baseTx: "n/a" } : { monadAt: new Date(), monadTx: "n/a" };
  const zero = `0x${"0".repeat(64)}`;
  let queued = 0;
  await db.transaction(async (tx) => {
    const [{ last }] = await tx.select({ last: sql<number>`coalesce(max(${ops.id}), 0)::int` }).from(ops).where(eq(ops.contract, contract));
    // Everything before now was for the old contract: never send it to the new one
    await tx
      .update(ops)
      .set(chain === "monad" ? { monadAt: sql`coalesce(${ops.monadAt}, now())`, monadTx: sql`coalesce(${ops.monadTx}, ${movedTx})` } : { baseAt: sql`coalesce(${ops.baseAt}, now())`, baseTx: sql`coalesce(${ops.baseTx}, ${movedTx})` })
      .where(and(eq(ops.contract, contract), lte(ops.id, last)));
    if (contract === "tokens") {
      await tx.update(ops).set(chain === "monad" ? { monadTx: movedTx } : { baseTx: movedTx }).where(and(eq(ops.contract, "tokens"), eq(ops.kind, "register"), lte(ops.id, last)));
      const tokens = await tx.select({ data: ops.data }).from(ops).where(and(eq(ops.contract, "tokens"), eq(ops.kind, "register"), lte(ops.id, last)));
      const seen = new Set<number>();
      for (const t of tokens) {
        const tokenId = Number(t.data.tokenId);
        if (seen.has(tokenId)) continue;
        seen.add(tokenId);
        await tx.insert(ops).values({ contract, kind: "register", sourceId: `v${v}:token:${tokenId}`, ref: zero, data: { tokenId, ticker: String(t.data.ticker) }, ...skipOther }).onConflictDoNothing();
        queued++;
      }
      const e = schema.tokenEntries;
      const moves = await tx
        .select({ tokenId: e.tokenId, from: e.fromUserId, to: e.toUserId, amount: e.amount })
        .from(e);
      const held = new Map<string, number>();
      for (const m of moves) {
        if (m.to) held.set(`${m.tokenId}|${m.to}`, (held.get(`${m.tokenId}|${m.to}`) ?? 0) + m.amount);
        if (m.from) held.set(`${m.tokenId}|${m.from}`, (held.get(`${m.tokenId}|${m.from}`) ?? 0) - m.amount);
      }
      for (const [key, total] of held) {
        const [tokenId, holder] = key.split("|");
        let left = total;
        for (let i = 0; left > 0; i++) {
          const amount = Math.min(left, MINT_CHUNK);
          left -= amount;
          await tx
            .insert(ops)
            .values({ contract, kind: "mint", sourceId: `v${v}:balance:${tokenId}:${holder}:${i}`, ref: zero, data: { tokenId: Number(tokenId), amount, to: walletAddress(holder) }, ...skipOther })
            .onConflictDoNothing();
          queued++;
        }
      }
    } else {
      const old = await tx.select().from(ops).where(and(eq(ops.contract, "receipts"), eq(ops.kind, "receipt"), lte(ops.id, last)));
      for (const r of old) {
        await tx.insert(ops).values({ contract, kind: "receipt", sourceId: `v${v}:${r.sourceId}`, ref: r.ref, data: r.data, ...skipOther }).onConflictDoNothing();
        queued++;
      }
    }
  });
  await saveVersions({ ...(await copiedVersions()), [`${contract}:${chain}`]: v });
  return { version: v, queued };
}

/** One pass over a chain: create new tokens, then token changes, then receipts. Returns how many went through. */
async function pass(chain: ChainName, limit: number) {
  let done = 0;
  // A newer contract waiting for its copy gets nothing until an admin starts the copy
  if (currentContract("tokens", chain) && !(await needsCopy("tokens", chain))) {
    for (const reg of await waiting(chain, "tokens", ["register"], limit)) {
      // Already there (e.g. written before a restart lost the result)? Then just note it.
      const deployed = currentContract("tokens", chain)!;
      const ticker = await publicClient(chain).readContract({ address: deployed.address, abi: sotechyTokensAbi, functionName: "tickerOf", args: [BigInt(reg.data.tokenId)] });
      if (ticker) await markDone(chain, [reg], "0x" as Hex);
      else if (await sendGroup(chain, [reg], (l) => ({ contract: "tokens", functionName: "registerToken", args: [BigInt(l[0].data.tokenId), String(l[0].data.ticker)] }))) done++;
    }
    const registered = await registeredOn(chain);
    const changes = (await waiting(chain, "tokens", ["mint", "burn", "move"], limit)).filter((o) => registered.has(Number(o.data.tokenId)));
    // Changes for a token that isn't on chain yet wait for it, without holding up the others
    if (await sendGroup(chain, changes, (l) => ({ contract: "tokens", functionName: "applyOps", args: [l.map(tokenOp)] }))) done += changes.length;
  }
  if (currentContract("receipts", chain) && !(await needsCopy("receipts", chain))) {
    const list = await waiting(chain, "receipts", ["receipt"], limit);
    if (await sendGroup(chain, list, (l) => ({ contract: "receipts", functionName: "issue", args: [l.map(receiptOp)] }))) done += list.length;
  }
  return done;
}

let mainBusy = false;
/** One round on the main chain (whichever an admin chose) */
async function mainTick() {
  if (mainBusy) return;
  mainBusy = true;
  const chain = await primaryChain().catch(() => "monad" as const);
  try {
    await pass(chain, BATCH);
  } catch (err) {
    console.error(`${chain} round failed`, err);
  } finally {
    mainBusy = false;
  }
}

/** Starts writing to Monad in the background (only with an operator key, and in dev only when asked) */
export function startChainWorker() {
  ensureStoreTokens().catch((err) => console.error("Store tokens check failed", err));
  if (!chainWritesOn()) {
    console.log("Chain writes are off: token changes and receipts wait in the queue");
    return;
  }
  console.log(`Writing to the main chain as ${privateKeyToAccount(env.CHAIN_OPERATOR_KEY as Hex).address}`);
  setInterval(() => void mainTick(), 8_000);
}

let baseBusy = false;
/** An admin's batch to Base: everything Monad has that Base doesn't, in as few transactions as it takes */
export async function sendBaseBatch() {
  if (!chainWritesOn()) throw new Error("Chain writes are off on this server");
  if ((await primaryChain()) === "base") throw new Error("Base is the main chain now: everything is written there as it happens");
  if (!currentContract("tokens", "base") && !currentContract("receipts", "base")) throw new Error("Nothing is deployed on Base yet");
  if (baseBusy) throw new Error("A Base batch is already going out");
  baseBusy = true;
  try {
    let total = 0;
    for (;;) {
      const sent = await pass("base", 200);
      total += sent;
      if (sent === 0) break;
    }
    const [left] = await db.select({ n: sql<number>`count(*)::int` }).from(ops).where(and(isNotNull(ops.monadAt), isNull(ops.baseAt)));
    return { sent: total, left: Number(left?.n ?? 0) };
  } finally {
    baseBusy = false;
  }
}

/** Queue numbers for the admin */
export async function queueStats() {
  const [row] = await db
    .select({
      monadWaiting: sql<number>`count(*) filter (where ${ops.monadAt} is null and ${ops.monadTries} < ${MAX_TRIES})::int`,
      monadStuck: sql<number>`count(*) filter (where ${ops.monadAt} is null and ${ops.monadTries} >= ${MAX_TRIES})::int`,
      monadDone: sql<number>`count(*) filter (where ${ops.monadAt} is not null)::int`,
      baseWaiting: sql<number>`count(*) filter (where ${ops.baseAt} is null and ${ops.baseTries} < ${MAX_TRIES})::int`,
      baseStuck: sql<number>`count(*) filter (where ${ops.baseAt} is null and ${ops.baseTries} >= ${MAX_TRIES})::int`,
      baseDone: sql<number>`count(*) filter (where ${ops.baseAt} is not null)::int`,
      lastMonad: sql<string | null>`max(${ops.monadAt})`,
      lastBase: sql<string | null>`max(${ops.baseAt})`,
    })
    .from(ops);
  // The main chain's oldest failure
  const primary = await primaryChain();
  const c = col(primary);
  const [lastError] = await db
    .select({ error: c.error, kind: ops.kind })
    .from(ops)
    .where(and(isNull(c.at), isNotNull(c.error)))
    .orderBy(asc(ops.id))
    .limit(1);
  return { ...row, primary, lastError: lastError ? `${lastError.kind}: ${lastError.error}` : null, writesOn: chainWritesOn() };
}

/** Lets changes that failed too often go again */
export async function retryStuck() {
  // Changes that failed too often on either chain go again
  const rows = await db
    .update(ops)
    .set({ monadTries: 0, monadError: null, baseTries: 0, baseError: null })
    .where(or(and(isNull(ops.monadAt), sql`${ops.monadTries} >= ${MAX_TRIES}`), and(isNull(ops.baseAt), sql`${ops.baseTries} >= ${MAX_TRIES}`)))
    .returning({ id: ops.id });
  return rows.length;
}
