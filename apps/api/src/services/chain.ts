// Copies the ledger onto the chains. Monad is the main record: whatever's queued goes out every few
// seconds. Base is a mirror that only gets a batch when an admin sends one. Each queued change keeps
// its transaction per chain, so nothing is written twice and a failed write is simply tried again.
import { deployments, sotechyReceiptsAbi, sotechyTokensAbi, type ContractName } from "@sotechy/contracts";
import { and, asc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { createPublicClient, createWalletClient, http, type Address, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, monad } from "viem/chains";
import { db, schema } from "../db/client";
import { env } from "../env";
import { ensureStoreTokens } from "./tokens";

const ops = schema.chainOps;
export type ChainName = "monad" | "base";

export const CHAINS: Record<ChainName, { chain: Chain; explorer: string; rpc?: string }> = {
  monad: { chain: monad, explorer: "https://monadvision.com", rpc: env.MONAD_RPC_URL },
  base: { chain: base, explorer: "https://basescan.org", rpc: env.BASE_RPC_URL },
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

const col = (chain: ChainName) =>
  chain === "monad" ? { tx: ops.monadTx, at: ops.monadAt, error: ops.monadError } : { tx: ops.baseTx, at: ops.baseAt, error: ops.baseError };

async function markDone(chain: ChainName, list: Op[], hash: Hex) {
  const ids = list.map((o) => o.id);
  const set = chain === "monad" ? { monadTx: hash, monadAt: new Date(), monadError: null } : { baseTx: hash, baseAt: new Date(), baseError: null };
  await db.update(ops).set(set).where(inArray(ops.id, ids));
}

async function markFailed(chain: ChainName, op: Op, err: unknown) {
  const e = err as { shortMessage?: string; message?: string };
  const message = (e.shortMessage ?? e.message ?? String(err)).slice(0, 500);
  if (chain === "monad") await db.update(ops).set({ monadError: message, monadTries: sql`${ops.monadTries} + 1` }).where(eq(ops.id, op.id));
  else await db.update(ops).set({ baseError: message }).where(eq(ops.id, op.id));
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

/** What's waiting on a chain, oldest first. Monad skips changes that have failed too often; Base only copies what Monad has. */
async function waiting(chain: ChainName, contract: ContractName, kinds: string[], limit: number) {
  const c = col(chain);
  const extra = chain === "monad" ? lt(ops.monadTries, MAX_TRIES) : isNotNull(ops.monadAt);
  return db
    .select()
    .from(ops)
    .where(and(eq(ops.contract, contract), inArray(ops.kind, kinds), isNull(c.at), extra))
    .orderBy(asc(ops.id))
    .limit(limit);
}

/** Token ids whose token is created on this chain */
async function registeredOn(chain: ChainName) {
  const rows = await db.select({ data: ops.data }).from(ops).where(and(eq(ops.contract, "tokens"), eq(ops.kind, "register"), isNotNull(col(chain).at)));
  return new Set(rows.map((r) => Number(r.data.tokenId)));
}

/** One pass over a chain: create new tokens, then token changes, then receipts. Returns how many went through. */
async function pass(chain: ChainName, limit: number) {
  let done = 0;
  if (currentContract("tokens", chain)) {
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
  if (currentContract("receipts", chain)) {
    const list = await waiting(chain, "receipts", ["receipt"], limit);
    if (await sendGroup(chain, list, (l) => ({ contract: "receipts", functionName: "issue", args: [l.map(receiptOp)] }))) done += list.length;
  }
  return done;
}

let monadBusy = false;
async function monadTick() {
  if (monadBusy) return;
  monadBusy = true;
  try {
    await pass("monad", BATCH);
  } catch (err) {
    console.error("Monad round failed", err);
  } finally {
    monadBusy = false;
  }
}

/** Starts writing to Monad in the background (only with an operator key, and in dev only when asked) */
export function startChainWorker() {
  ensureStoreTokens().catch((err) => console.error("Store tokens check failed", err));
  if (!chainWritesOn()) {
    console.log("Chain writes are off: token changes and receipts wait in the queue");
    return;
  }
  console.log(`Writing to Monad as ${privateKeyToAccount(env.CHAIN_OPERATOR_KEY as Hex).address}`);
  setInterval(() => void monadTick(), 8_000);
}

let baseBusy = false;
/** An admin's batch to Base: everything Monad has that Base doesn't, in as few transactions as it takes */
export async function sendBaseBatch() {
  if (!chainWritesOn()) throw new Error("Chain writes are off on this server");
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
      baseWaiting: sql<number>`count(*) filter (where ${ops.monadAt} is not null and ${ops.baseAt} is null)::int`,
      baseDone: sql<number>`count(*) filter (where ${ops.baseAt} is not null)::int`,
      lastMonad: sql<string | null>`max(${ops.monadAt})`,
      lastBase: sql<string | null>`max(${ops.baseAt})`,
    })
    .from(ops);
  const [lastError] = await db
    .select({ error: ops.monadError, kind: ops.kind })
    .from(ops)
    .where(and(isNull(ops.monadAt), isNotNull(ops.monadError)))
    .orderBy(asc(ops.id))
    .limit(1);
  return { ...row, lastError: lastError ? `${lastError.kind}: ${lastError.error}` : null, writesOn: chainWritesOn() };
}

/** Lets changes that failed too often go again */
export async function retryStuck() {
  const rows = await db.update(ops).set({ monadTries: 0, monadError: null }).where(and(isNull(ops.monadAt), sql`${ops.monadTries} >= ${MAX_TRIES}`)).returning({ id: ops.id });
  return rows.length;
}
