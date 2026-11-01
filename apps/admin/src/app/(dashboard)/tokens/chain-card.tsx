"use client";

// The contracts on chain: where they are, whether they're running, the operator's gas, what's
// waiting to be written, and the button that copies everything to Base.
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { usePasswordPrompt } from "@/components/password-prompt";
import { RelTime } from "@/components/rel-time";
import { Card, ErrorNote, Pill, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { copyToNewContract, retryStuck, sendBaseBatch, setPrimaryChain } from "./actions";

interface Wallet {
  address: string;
  url: string;
  balance: number | null;
  low?: boolean;
}

interface Contract {
  contract: "tokens" | "receipts";
  address: string;
  version: number;
  url: string;
  reachable: boolean;
  state?: "running" | "paused" | "retired";
  perMint?: number;
  perDay?: number;
  mintedToday?: number;
  issued?: number;
  /** A newer version is deployed and waits for the ledger to be copied to it */
  needsCopy?: boolean;
}

export interface ChainStatus {
  chain: "monad" | "base";
  chainName: string;
  primary: boolean;
  symbol: string;
  operator: Wallet;
  owner: Wallet;
  lowGas: number;
  contracts: Contract[];
}

export interface QueueStats {
  monadWaiting: number;
  monadStuck: number;
  monadDone: number;
  baseWaiting: number;
  baseStuck?: number;
  baseDone: number;
  lastMonad: string | null;
  lastBase: string | null;
  lastError: string | null;
  writesOn: boolean;
  /** The main chain: written to as things happen, and every link points at it */
  primary?: "monad" | "base";
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const amount = (n: number) => n.toLocaleString("en-NG", { maximumFractionDigits: 4 });
const count = (n: number) => n.toLocaleString("en-NG");
const STATE = { running: { label: "Running", tone: "good" }, paused: { label: "Paused", tone: "warn" }, retired: { label: "Retired", tone: "bad" } } as const;
const NAME = { tokens: "Sotechy Tokens", receipts: "Sotechy Receipts" } as const;

function Address({ wallet }: { wallet: { address: string; url: string } }) {
  return (
    <a href={wallet.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink">
      {short(wallet.address)} <ExternalLink size={12} />
    </a>
  );
}

function Gas({ label, wallet, symbol, hint }: { label: string; wallet: Wallet; symbol: string; hint: string }) {
  return (
    <div className={`rounded-2xl p-4 ${wallet.low ? "bg-bad-soft" : "bg-surface-alt"}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display text-2xl font-extrabold ${wallet.low ? "text-bad" : ""}`}>{wallet.balance === null ? "—" : `${amount(wallet.balance)} ${symbol}`}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <Address wallet={wallet} />
    </div>
  );
}

function ContractRow({ c, onCopy, busy }: { c: Contract; onCopy: () => void; busy: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      {c.needsCopy && (
        <div className="mb-2 flex w-full flex-wrap items-center gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <span className="min-w-0 flex-1">
            v{c.version} is deployed but empty. Nothing is written to it until you copy everything across from the ledger.
          </span>
          <button type="button" disabled={busy} onClick={onCopy} className={primaryButtonClass}>
            Copy everything to v{c.version}
          </button>
        </div>
      )}
      <span className="font-semibold">{NAME[c.contract]}</span>
      {c.reachable && c.state ? <Pill tone={STATE[c.state].tone}>{STATE[c.state].label}</Pill> : <Pill tone="warn">Can&apos;t reach the chain</Pill>}
      <span className="text-sm text-muted">
        {c.contract === "tokens" && c.perDay !== undefined && `Up to ${count(c.perDay)} a day, ${count(c.perMint ?? 0)} at once`}
        {c.contract === "receipts" && c.issued !== undefined && `${count(c.issued)} receipts issued`}
      </span>
      <a href={c.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink">
        v{c.version} · {short(c.address)} <ExternalLink size={12} />
      </a>
    </li>
  );
}

export function ChainCards({ chains, queue, error }: { chains: ChainStatus[]; queue: QueueStats | null; error: string | null }) {
  const router = useRouter();
  const { ask, prompt } = usePasswordPrompt();
  const [busy, start] = useTransition();
  const [note, setNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  if (error) return <ErrorNote error={error} />;

  const batch = () =>
    start(async () => {
      setNote(null);
      const password = await ask("Send a batch to Base?", `${count(queue?.baseWaiting ?? 0)} changes from Monad will be copied to Base. This uses the operator's ETH on Base.`);
      if (!password) return;
      const r = await sendBaseBatch(password);
      if ("error" in r) return setNote({ tone: "bad", text: r.error });
      setNote({ tone: "good", text: `Copied ${count(r.sent)} changes to Base${r.left ? `, ${count(r.left)} still waiting` : ""}.` });
      router.refresh();
    });

  const copy = (contract: "tokens" | "receipts", chain: "monad" | "base", version: number) =>
    start(async () => {
      setNote(null);
      const password = await ask(
        `Copy everything to ${NAME[contract]} v${version}?`,
        contract === "tokens" ? "Every token and every balance is created on the new contract from the ledger. Retire the old contract from your computer once it's done." : "Every receipt is issued again on the new contract, with the same numbers.",
      );
      if (!password) return;
      const r = await copyToNewContract(contract, chain, password);
      if ("error" in r) return setNote({ tone: "bad", text: r.error });
      setNote({ tone: "good", text: `${r.queued} changes queued for v${r.version}. ${chain === "monad" ? "Monad picks them up within seconds." : "Send a batch to Base to write them."}` });
      router.refresh();
    });

  const primary = queue?.primary ?? "monad";
  const switchTo = (chain: "monad" | "base") =>
    start(async () => {
      setNote(null);
      const name = chain === "base" ? "Base" : "Monad";
      const password = await ask(
        `Make ${name} the main chain?`,
        chain === "base"
          ? "Every new token change and receipt is written to Base as it happens, and everything Monad already has is written to Base too. The app and dashboards link to Basescan. Uses the operator's ETH on Base."
          : "Every new token change and receipt is written to Monad as it happens, and the app and dashboards link to Monad again.",
      );
      if (!password) return;
      const r = await setPrimaryChain(chain, password);
      if ("error" in r) return setNote({ tone: "bad", text: r.error });
      setNote({ tone: "good", text: `${name} is the main chain now.` });
      router.refresh();
    });

  const retry = () =>
    start(async () => {
      const r = await retryStuck();
      setNote("error" in r ? { tone: "bad", text: r.error } : { tone: "good", text: `${r.retried} changes will be tried again.` });
      router.refresh();
    });

  return (
    <div className="mb-6 flex flex-col gap-4">
      {prompt}
      {note && <p className={`rounded-2xl px-4 py-3 text-sm ${note.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{note.text}</p>}
      {/* Which chain is the main record */}
      <Card title="Main chain" description="New token changes and NFT receipts are written here as they happen, and every link in the app and dashboards points at it.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-surface-alt p-1">
            {(["monad", "base"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                disabled={busy || ch === primary || !chains.some((c) => c.chain === ch && c.contracts.length >= 2)}
                onClick={() => switchTo(ch)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-default ${ch === primary ? "bg-surface shadow-sm" : "text-muted hover:text-ink disabled:opacity-50"}`}
              >
                {ch === "base" ? "Base" : "Monad"}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted">{primary === "base" ? "Writing to Base. Links go to Basescan." : "Writing to Monad. Links go to MonadVision."}</span>
        </div>
      </Card>
      {chains.map((c) => (
        <Card key={c.chain} title={c.primary ? c.chainName : `${c.chainName} (copy)`} description={c.primary ? "Every token change and receipt is written here within seconds." : c.chain === "base" ? "Gets a copy of everything on Monad when you send a batch." : "Not written to while Base is the main chain."}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Gas label="Operator gas" wallet={c.operator} symbol={c.symbol} hint={c.operator.low ? `Under ${c.lowGas} ${c.symbol}: top it up so writing doesn't stop. ` : "Pays for every write. "} />
            <Gas label="Owner gas" wallet={c.owner} symbol={c.symbol} hint="Only for rule changes, from your computer. " />
            {queue && (
              <div className="rounded-2xl bg-surface-alt p-4">
                <p className="text-sm text-muted">{c.primary ? "Waiting to be written" : "Waiting for a batch"}</p>
                <p className="font-display text-2xl font-extrabold">{count(c.chain === "monad" ? queue.monadWaiting : queue.baseWaiting)}</p>
                <p className="mt-1 text-xs text-muted">
                  {count(c.chain === "monad" ? queue.monadDone : queue.baseDone)} written
                  {(c.chain === "monad" ? queue.lastMonad : queue.lastBase) && (
                    <>
                      , last <RelTime iso={(c.chain === "monad" ? queue.lastMonad : queue.lastBase)!} />
                    </>
                  )}
                  {c.primary && !queue.writesOn && " · writing is off on this server"}
                </p>
              </div>
            )}
          </div>
          {c.contracts.length === 0 && <p className="mt-3 text-sm text-muted">Not deployed on {c.chainName} yet. Once the gas is there, the contracts go up and batches can start.</p>}
          <ul className="mt-3 divide-y divide-line">
            {c.contracts.map((x) => (
              <ContractRow key={x.contract} c={x} busy={busy} onCopy={() => copy(x.contract, c.chain, x.version)} />
            ))}
          </ul>
          {c.primary && queue && (c.chain === "monad" ? queue.monadStuck : (queue.baseStuck ?? 0)) > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
              <span className="min-w-0 flex-1">
                {count(c.chain === "monad" ? queue.monadStuck : (queue.baseStuck ?? 0))} changes failed {queue.lastError ? `(${queue.lastError})` : ""}. The ledger is right; only the chain copy is behind.
              </span>
              <button disabled={busy} onClick={retry} className={secondaryButtonClass}>
                Try again
              </button>
            </div>
          )}
          {!c.primary && c.chain === "base" && c.contracts.length > 0 && (
            <div className="mt-3 flex justify-end">
              <button disabled={busy || !queue?.baseWaiting} onClick={batch} className={primaryButtonClass}>
                {busy ? "Sending…" : "Send batch to Base"}
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
