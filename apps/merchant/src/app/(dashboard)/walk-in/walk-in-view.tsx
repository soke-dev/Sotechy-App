"use client";

// A sale in the store's own shop: find the customer on Sotechy, pay the 1% fee, and they get the tokens.
import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { TOKEN_RULES } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { btn, Card, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { formatNaira, formatTokens } from "@/lib/money";
import { useAccount } from "@/components/account-context";
import { findWalkInCustomer, startWalkIn } from "@/lib/market-actions";

export interface WalkInSale {
  id: string;
  amount: number;
  fee: number;
  note: string | null;
  status: "pending" | "paid";
  createdAt: string;
  username: string | null;
  name: string | null;
}

type Customer = { id: string; name: string | null; username: string | null };

export function WalkInView({ sales, paidId }: { sales: WalkInSale[]; paidId: string | null }) {
  const { store } = useAccount();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ q: string; customer: Customer | null; problem?: string } | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const q = query.trim();
  const fee = Math.round(amount * TOKEN_RULES.walkInFeeRate * 100) / 100;
  const t = store.ticker;
  const paid = paidId ? sales.find((s) => s.id === paidId) : undefined;
  const customer = found?.q === q ? found.customer : undefined;

  // Look the customer up as the cashier types
  useEffect(() => {
    if (q.replace(/^@/, "").length < 3) return;
    const timer = setTimeout(async () => {
      const r = await findWalkInCustomer(q);
      setFound({ q, customer: "ok" in r ? r.ok : null, problem: "error" in r ? r.error : undefined });
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  const pay = () =>
    start(async () => {
      setError(null);
      const r = await startWalkIn({ customer: q, amount, note: note.trim() || undefined });
      if ("error" in r) return setError(r.error);
      window.location.href = r.ok.checkoutUrl;
    });

  if (paid) {
    return (
      <div className="mx-auto max-w-md pt-6 text-center">
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-good-soft">
          <Illo name="coin" size={64} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">{paid.status === "paid" ? "Tokens sent" : "Waiting for the payment"}</h1>
        <p className="mt-2 text-muted">
          {paid.status === "paid" ? (
            <>
              @{paid.username} received <b className="text-ink">{formatTokens(Math.floor(paid.amount))} ${t}</b> and <b className="text-ink">{formatTokens(Math.floor(paid.amount * TOKEN_RULES.crossBonus))} $SOTECHY</b>.
            </>
          ) : (
            "As soon as Money Moves confirms your payment, the customer gets their tokens. Refresh in a moment."
          )}
        </p>
        <a href="/walk-in" className={`${btn.dark} mt-6 w-full`}>
          New walk-in sale
        </a>
      </div>
    );
  }

  return (
    <>
      <PageHeader illo="receipt" title="Walk-in sale" description={`Reward customers who buy in your shop. You pay ${TOKEN_RULES.walkInFeeRate * 100}% of the sale, which backs their tokens, and they get $${t} plus ${TOKEN_RULES.crossBonus * 100}% in $SOTECHY.`} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Sale details">
          <div className="flex flex-col gap-5">
            <Field label="Customer" hint="Their Sotechy @username or phone number. They need a Sotechy account to receive tokens.">
              <div className="relative">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-11`} placeholder="@chidi or 0803 555 0142" />
              </div>
            </Field>
            {q.replace(/^@/, "").length >= 3 &&
              (customer === undefined ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 size={15} className="animate-spin" /> Looking them up…
                </p>
              ) : customer ? (
                <div className="flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{(customer.name ?? customer.username ?? "?")[0].toUpperCase()}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{customer.name ?? "Sotechy customer"}</p>
                    {customer.username && <p className="text-sm text-muted">@{customer.username}</p>}
                  </div>
                  <Check size={18} className="text-good" />
                </div>
              ) : (
                <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">{found?.problem ?? "No Sotechy account found. Ask them to download the app and sign up, then try again."}</p>
              ))}
            <Field label="Sale amount (₦)">
              <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={`${inputClass} font-display text-xl font-bold`} placeholder="0" />
            </Field>
            <Field label="Note (optional)">
              <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. 2× Fast Charger, receipt 0451" />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Summary">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
                <span className="flex items-center gap-2 font-semibold">
                  <Illo name="coin" size={24} /> Customer gets
                </span>
                <span className="text-right text-sm font-semibold">
                  {formatTokens(Math.floor(amount))} ${t}
                  <br />
                  <span className="text-muted">+ {formatTokens(Math.floor(amount * TOKEN_RULES.crossBonus))} $SOTECHY</span>
                </span>
              </div>
              <div className="flex items-center justify-between px-1 text-sm">
                <span className="text-muted">You pay ({TOKEN_RULES.walkInFeeRate * 100}%)</span>
                <span className="font-display text-xl font-bold">{formatNaira(fee)}</span>
              </div>
              <p className="px-1 text-xs text-muted">Tokens are only sent after this fee is paid. The sale itself stays between you and the customer.</p>
            </div>
            {error && <p className="mt-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <button disabled={!customer || amount <= 0 || busy} onClick={pay} className={`${btn.primary} mt-5 w-full`}>
              {busy ? "Opening payment…" : `Pay ${formatNaira(fee)} and send tokens`}
            </button>
          </Card>

          <Card title="Recent walk-in sales">
            {sales.length === 0 ? (
              <p className="text-sm text-muted">None yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {sales.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <b>{r.username ? `@${r.username}` : (r.name ?? "Customer")}</b>
                      <span className="text-muted">
                        {" "}
                        · <RelTime iso={r.createdAt} />
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {r.status === "pending" && (
                        <Pill tone="warn" dot={false}>
                          Fee not paid
                        </Pill>
                      )}
                      <span className="font-semibold">{formatNaira(r.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
