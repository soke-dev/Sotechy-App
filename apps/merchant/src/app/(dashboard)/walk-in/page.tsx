"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Illo } from "@/components/illustrations";
import { btn, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { formatNaira, formatTokens, PLATFORM_FEE, SOTECHY_CROSS_BONUS, timeAgo } from "@/lib/money";
import { store } from "@/lib/mock";

// Demo directory of Sotechy customers the cashier can look up
const people = [
  { name: "Chidi Okeke", username: "chidi", phone: "08035550142" },
  { name: "Tunde Bakare", username: "tunde", phone: "07051184420" },
  { name: "Ifeoma Obi", username: "ife", phone: "08116402299" },
];

const recent = [
  { who: "@tunde", amount: 45_000, at: new Date(Date.now() - 26 * 3_600_000).toISOString() },
  { who: "@ife", amount: 12_500, at: new Date(Date.now() - 50 * 3_600_000).toISOString() },
];

export default function WalkInPage() {
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"form" | "paying" | "done">("form");
  const q = query.trim().replace(/^@/, "").replace(/\s/g, "").toLowerCase();
  const found = q ? people.find((p) => p.username === q || p.phone.endsWith(q.replace(/^0/, ""))) : undefined;
  const fee = Math.round(amount * PLATFORM_FEE);
  const t = store.ticker;

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md pt-6 text-center">
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-good-soft">
          <Illo name="coin" size={64} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">Tokens sent</h1>
        <p className="mt-2 text-muted">
          @{found?.username} received <b className="text-ink">{formatTokens(amount)} ${t}</b> and <b className="text-ink">{formatTokens(Math.round(amount * SOTECHY_CROSS_BONUS))} $SOTECHY</b>.
        </p>
        <a href="#" className="mt-2 inline-block text-sm font-semibold text-brand-strong hover:underline">View on Monad explorer</a>
        <button onClick={() => { setStep("form"); setQuery(""); setAmount(0); setNote(""); }} className={`${btn.dark} mt-6 w-full`}>
          New walk-in sale
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader illo="receipt" title="Walk-in sale" description={`Reward customers who buy in your shop. You pay Sotechy ${PLATFORM_FEE * 100}% of the sale, and they get $${t} plus ${SOTECHY_CROSS_BONUS * 100}% in $SOTECHY.`} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Sale details">
          <div className="flex flex-col gap-5">
            <Field label="Customer" hint="Their Sotechy @username or phone number. They need a Sotechy account to receive tokens.">
              <div className="relative">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-11`} placeholder="@chidi or 0803 555 0142" />
              </div>
            </Field>
            {q && (
              found ? (
                <div className="flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{found.name.split(" ").map((p) => p[0]).join("")}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{found.name}</p>
                    <p className="text-sm text-muted">@{found.username}</p>
                  </div>
                  <Check size={18} className="text-good" />
                </div>
              ) : (
                <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">No Sotechy account found. Ask them to download the app and sign up, then try again.</p>
              )
            )}
            <Field label="Sale amount (₦)">
              <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className={`${inputClass} font-display text-xl font-bold`} placeholder="0" />
            </Field>
            <Field label="Note (optional)">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. 2× Fast Charger, receipt 0451" />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Summary">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
                <span className="flex items-center gap-2 font-semibold"><Illo name="coin" size={24} /> Customer gets</span>
                <span className="text-right text-sm font-semibold">
                  {formatTokens(amount)} ${t}
                  <br />
                  <span className="text-muted">+ {formatTokens(Math.round(amount * SOTECHY_CROSS_BONUS))} $SOTECHY</span>
                </span>
              </div>
              <div className="flex items-center justify-between px-1 text-sm">
                <span className="text-muted">You pay Sotechy ({PLATFORM_FEE * 100}%)</span>
                <span className="font-display text-xl font-bold">{formatNaira(fee)}</span>
              </div>
              <p className="px-1 text-xs text-muted">Tokens are only sent after this fee is paid. The sale itself stays between you and the customer.</p>
            </div>
            <button
              disabled={!found || amount <= 0 || step === "paying"}
              onClick={() => {
                setStep("paying");
                setTimeout(() => setStep("done"), 1200);
              }}
              className={`${btn.primary} mt-5 w-full`}
            >
              {step === "paying" ? "Paying…" : `Pay ${formatNaira(fee)} and send tokens`}
            </button>
          </Card>

          <Card title="Recent walk-in sales">
            <ul className="flex flex-col gap-3">
              {recent.map((r) => (
                <li key={r.at} className="flex items-center justify-between text-sm">
                  <span>
                    <b>{r.who}</b>
                    <span className="text-muted"> · {timeAgo(r.at)}</span>
                  </span>
                  <span className="font-semibold">{formatNaira(r.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
