// The token contract on chain: where it is, whether it's running, and the operator's gas.
import { ExternalLink } from "lucide-react";
import { Card, ErrorNote, Pill } from "@/components/ui";

interface Wallet {
  address: string;
  url: string;
  balance?: number;
  low?: boolean;
}

export interface ChainStatus {
  chain: string;
  chainName: string;
  primary: boolean;
  symbol: string;
  address: string;
  version: number;
  deployedAt: string;
  contractUrl: string;
  operator: Wallet;
  owner: Wallet;
  reachable: boolean;
  state?: "running" | "paused" | "retired";
  limits?: { perMint: number; perDay: number; mintedToday: number };
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const amount = (n: number) => n.toLocaleString("en-NG", { maximumFractionDigits: 4 });
const STATE = { running: { label: "Running", tone: "good" }, paused: { label: "Paused", tone: "warn" }, retired: { label: "Retired", tone: "bad" } } as const;

function Address({ wallet }: { wallet: Wallet }) {
  return (
    <a href={wallet.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink">
      {short(wallet.address)} <ExternalLink size={12} />
    </a>
  );
}

export function ChainCards({ chains, lowGas, error }: { chains: ChainStatus[]; lowGas: number; error: string | null }) {
  if (error) return <ErrorNote error={error} />;
  if (!chains.length) return null;
  return (
    <div className="mb-6 flex flex-col gap-4">
      {chains.map((c) => (
        <Card
          key={c.chain}
          title={`${c.chainName}${c.primary ? "" : " (mirror)"}`}
          description={c.primary ? "Every token movement is written here as it happens." : "Gets the same movements in hourly batches."}
          actions={
            <span className="flex items-center gap-2">
              {c.reachable && c.state ? <Pill tone={STATE[c.state].tone}>{STATE[c.state].label}</Pill> : <Pill tone="warn">Can&apos;t reach the chain</Pill>}
              <a href={c.contractUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                Contract v{c.version} <ExternalLink size={14} />
              </a>
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-2xl p-4 ${c.operator.low ? "bg-bad-soft" : "bg-surface-alt"}`}>
              <p className="text-sm text-muted">Operator gas</p>
              <p className={`font-display text-2xl font-extrabold ${c.operator.low ? "text-bad" : ""}`}>{c.operator.balance === undefined ? "—" : `${amount(c.operator.balance)} ${c.symbol}`}</p>
              <p className="mt-1 text-xs text-muted">{c.operator.low ? `Under ${lowGas} ${c.symbol}: top it up so token updates don't stop. ` : "Pays for every token update. "}</p>
              <Address wallet={c.operator} />
            </div>
            <div className="rounded-2xl bg-surface-alt p-4">
              <p className="text-sm text-muted">Owner gas</p>
              <p className="font-display text-2xl font-extrabold">{c.owner.balance === undefined ? "—" : `${amount(c.owner.balance)} ${c.symbol}`}</p>
              <p className="mt-1 text-xs text-muted">Only for rule changes, from your computer. </p>
              <Address wallet={c.owner} />
            </div>
            <div className="rounded-2xl bg-surface-alt p-4">
              <p className="text-sm text-muted">Mint limits</p>
              {c.limits ? (
                <>
                  <p className="font-display text-2xl font-extrabold">{c.limits.perDay.toLocaleString("en-NG")}</p>
                  <p className="mt-1 text-xs text-muted">
                    a day across all stores, up to {c.limits.perMint.toLocaleString("en-NG")} at once. {c.limits.mintedToday.toLocaleString("en-NG")} minted on the last minting day.
                  </p>
                </>
              ) : (
                <p className="font-display text-2xl font-extrabold">—</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
