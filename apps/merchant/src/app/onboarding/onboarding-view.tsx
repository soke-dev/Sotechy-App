"use client";

import { Check, ChevronRight, FileUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { IdCheck } from "@/components/id-check";
import { SellsPicker } from "@/components/sells-picker";
import { Illo, type IlloName } from "@/components/illustrations";
import { btn, Field, inputClass, Req } from "@/components/ui";
import { formatNaira, SOTECHY_CROSS_BONUS, STORE_VALUE_PER_TOKEN } from "@/lib/money";

type Kind = "registered" | "individual";
type Structure = "BN" | "LTD" | "PLC" | "IT";
export type StepId = "setup" | "business" | "documents" | "you" | "people" | "token" | "payout" | "review";

const STEP_INFO: Record<StepId, { title: string; illo: IlloName }> = {
  setup: { title: "Business type", illo: "store" },
  business: { title: "Business details", illo: "doc" },
  documents: { title: "Documents", illo: "receipt" },
  you: { title: "Your ID", illo: "shield" },
  people: { title: "Directors and owners", illo: "user" },
  token: { title: "Store and token", illo: "coin" },
  payout: { title: "Payout account", illo: "bank" },
  review: { title: "Review and submit", illo: "sparkle" },
};

const DOCS: Record<Structure, string[]> = {
  BN: ["CAC certificate", "Proof of address"],
  LTD: ["CAC certificate", "MEMART", "Status report", "Proof of address"],
  PLC: ["CAC certificate", "MEMART", "Status report", "Proof of address"],
  IT: ["CAC certificate", "Constitution", "Proof of address"],
};
/** Helpful but not needed to be approved */
const OPTIONAL_DOCS = ["Proof of address"];

export interface OnboardingStart {
  storeName: string;
  ticker: string;
  ownerName: string;
  kind: Kind;
}

const RESERVED = ["SOTECHY", "NGN", "NAIRA", "USD", "USDT", "USDC", "MON", "MONAD", "BTC", "ETH", "CBN", "SEC"];
const TAKEN = ["COLLINS", "MAXI", "AFRO"];

function tickerProblem(t: string) {
  if (!t) return "Choose a ticker.";
  if (t.length < 3 || t.length > 8) return "Use 3 to 8 letters or numbers.";
  if (!/^[A-Z][A-Z0-9]*$/.test(t)) return "Letters and numbers only, starting with a letter.";
  if (RESERVED.includes(t)) return `$${t} is reserved.`;
  if (TAKEN.includes(t)) return `$${t} is already taken by another store.`;
  return null;
}

export default function OnboardingView({ initialStep, start }: { initialStep?: StepId; start: OnboardingStart }) {
  const [kind, setKind] = useState<Kind>(start.kind);
  const [structure, setStructure] = useState<Structure>("LTD");
  const [step, setStep] = useState<StepId>(initialStep ?? "setup");
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [people, setPeople] = useState([{ name: start.ownerName, role: "Director and owner", share: 100 }]);
  const [storeName, setStoreName] = useState(start.storeName);
  const [ticker, setTicker] = useState(start.ticker);
  const [sells, setSells] = useState<string[]>([]);
  const [account, setAccount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const steps: StepId[] = useMemo(
    () => (kind === "registered" ? ["setup", "business", "documents", "you", "people", "token", "payout", "review"] : ["setup", "you", "token", "payout", "review"]),
    [kind],
  );
  const index = steps.indexOf(step);
  const next = () => {
    setDone((d) => new Set(d).add(step));
    setStep(steps[Math.min(index + 1, steps.length - 1)]);
  };
  const problem = tickerProblem(ticker);

  if (submitted) {
    return (
      <Centered>
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
          <Illo name="sparkle" size={60} />
        </span>
        <h1 className="mt-5 text-center text-3xl font-extrabold">Submitted for review</h1>
        <p className="mt-2 text-center text-muted">We usually review new stores within 1–2 working days. We&apos;ll email you. Meanwhile you can explore your dashboard and get your store ready.</p>
        <ol className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          {[
            ["Submitted", "Just now", true],
            ["In review", "Sotechy checks your documents and ID", false],
            ["Approved", `Your $${ticker} token is created and you can sell for real`, false],
          ].map(([title, body, on], i) => (
            <li key={String(title)} className="flex gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${on ? "bg-brand text-white" : "bg-surface-alt text-muted"}`}>{on ? <Check size={16} /> : i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/" className={`${btn.primary} mt-6 w-full`}>Go to my dashboard</Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[320px_1fr]">
      {/* Steps */}
      <aside className="hidden border-r border-line bg-surface px-6 py-8 lg:block">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-8" />
          <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Merchant</span>
        </div>
        <p className="mb-1 text-sm font-semibold text-muted">Set up {storeName}</p>
        <p className="mb-6 font-display text-2xl font-bold">{done.size} of {steps.length} done</p>
        <ol className="flex flex-col gap-1">
          {steps.map((s, i) => {
            const on = s === step;
            const isDone = done.has(s);
            return (
              <li key={s}>
                <button onClick={() => setStep(s)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? "bg-brand-soft" : "hover:bg-surface-alt"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-good text-white" : on ? "bg-surface shadow-sm" : "bg-surface-alt"}`}>
                    {isDone ? <Check size={16} /> : <Illo name={STEP_INFO[s].illo} size={24} />}
                  </span>
                  <span className={`flex-1 text-[15px] ${on ? "font-semibold" : "text-ink-2"}`}>{STEP_INFO[s].title}</span>
                  <span className="text-xs text-faint">{i + 1}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-muted hover:text-ink">Finish later</Link>
      </aside>

      <main className="px-4 pb-16 pt-6 sm:px-10 lg:pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 lg:hidden">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">{STEP_INFO[step].title}</span>
              <span className="text-muted">Step {index + 1} of {steps.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
              <Illo name={STEP_INFO[step].illo} size={38} />
            </span>
            <h1 className="text-3xl font-extrabold">{STEP_INFO[step].title}</h1>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            {step === "setup" && (
              <div className="flex flex-col gap-5">
                <Choice
                  value={kind}
                  onChange={setKind}
                  options={[
                    ["registered", "Registered business", "Registered with CAC: business name, limited company or trustees", "store"],
                    ["individual", "Freelancer or individual", "Selling in your own name. You'll verify your ID and add a bank account in your name.", "user"],
                  ]}
                />
                {kind === "registered" && (
                  <Field label="Type of registration" required>
                    <select value={structure} onChange={(e) => setStructure(e.target.value as Structure)} className={inputClass}>
                      <option value="BN">Business name (BN)</option>
                      <option value="LTD">Private limited company (LTD)</option>
                      <option value="PLC">Public limited company (PLC)</option>
                      <option value="IT">Incorporated trustees (IT)</option>
                    </select>
                  </Field>
                )}
              </div>
            )}

            {step === "business" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Registered business name" required hint="Exactly as on your CAC certificate."><input required className={inputClass} placeholder="e.g. Xena Gadgets Ltd" /></Field></div>
                <Field label={`${structure === "BN" ? "BN" : structure === "IT" ? "IT" : "RC"} number`} required><input required inputMode="numeric" className={inputClass} placeholder="e.g. 1234567" /></Field>
                <Field label="Date registered" required><input required type="date" className={inputClass} /></Field>
                <div className="sm:col-span-2"><Field label="TIN" hint="Optional. Your tax ID number, if you have one."><input inputMode="numeric" className={inputClass} /></Field></div>
                <div className="sm:col-span-2"><Field label="Business address" required><input required className={inputClass} placeholder="Street, city, state" /></Field></div>
              </div>
            )}

            {step === "documents" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">PDF, JPG or PNG, up to 10 MB each. Stored encrypted and only seen by Sotechy&apos;s review team. Ones marked <Req /> are needed.</p>
                {DOCS[structure].map((d) => (
                  <label key={d} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition ${uploaded[d] ? "border-good/40 bg-good-soft" : "border-line hover:border-brand"}`}>
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${uploaded[d] ? "bg-good text-white" : "bg-surface-alt text-muted"}`}>
                      {uploaded[d] ? <Check size={18} /> : <FileUp size={18} />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">
                        {d}
                        {OPTIONAL_DOCS.includes(d) ? <span className="ml-1.5 text-sm font-normal text-muted">(optional)</span> : <Req />}
                      </span>
                      <span className="text-sm text-muted">{uploaded[d] ?? "Tap to upload"}</span>
                    </span>
                    <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && setUploaded({ ...uploaded, [d]: e.target.files[0].name })} />
                  </label>
                ))}
              </div>
            )}

            {step === "you" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted">Sotechy checks that every store owner is who they say they are. Your name and date of birth are read from your ID, so there&apos;s nothing to type.</p>
                <IdCheck />
              </div>
            )}

            {step === "people" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">Everyone who is a director or owns 25% or more.</p>
                {people.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-line p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-strong">{p.name[0]}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted">{p.role}{p.share ? ` · ${p.share}%` : ""}</p>
                    </div>
                    {i > 0 && (
                      <button onClick={() => setPeople(people.filter((_, j) => j !== i))} aria-label="Remove" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-bad-soft hover:text-bad">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setPeople([...people, { name: "New person", role: "Director", share: 0 }])} className={`${btn.outline} self-start`}>
                  <Plus size={16} /> Add a person
                </button>
              </div>
            )}

            {step === "token" && (
              <div className="flex flex-col gap-5">
                <Field label="What you sell" required>
                  <SellsPicker value={sells} onChange={setSells} />
                </Field>
                <Field label="Store name" required hint="Shown on your storefront in the Sotechy app.">
                  <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputClass} />
                </Field>

                <div className="rounded-2xl bg-brand-soft p-4">
                  <p className="flex items-center gap-2 font-semibold"><Illo name="coin" size={24} /> What is a store token?</p>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
                    <li>Your store gets its own token on the Monad blockchain, named by the ticker you choose here.</li>
                    <li>Customers earn 1 token for every ₦1 they spend with you, released when their order completes, plus {SOTECHY_CROSS_BONUS * 100}% in $SOTECHY.</li>
                    <li>They can only spend it at your store, so it brings them back. Sotechy pays you in naira for what they spend.</li>
                    <li>It&apos;s a reward, not money or an investment, and it can&apos;t be cashed out.</li>
                  </ul>
                </div>

                <Field label="Your ticker" required hint="3–8 letters or numbers. Usually your store name, e.g. $XENA. You can ask Sotechy to rename it later if you rebrand.">
                  <div className={`flex items-center rounded-2xl border bg-surface pl-4 ${problem ? "border-line" : "border-good"}`}>
                    <span className="font-display text-xl font-bold text-brand-strong">$</span>
                    <input
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                      className="min-h-12 flex-1 rounded-r-2xl bg-transparent px-2 font-display text-xl font-bold uppercase tracking-wide outline-none"
                    />
                    {!problem && <Check size={18} className="mr-4 text-good" />}
                  </div>
                </Field>
                <p className={`-mt-3 text-sm ${problem ? "text-bad" : "text-good"}`}>{problem ?? `$${ticker} is available.`}</p>

                {/* Token preview */}
                <div className="relative overflow-hidden rounded-2xl bg-panel p-5 text-white">
                  <div className="relative flex items-center gap-4">
                    <Illo name="coin" size={56} />
                    <div>
                      <p className="font-display text-3xl font-extrabold">${ticker || "TICKER"}</p>
                      <p className="text-sm text-white/70">{storeName || "Your store"} Token</p>
                    </div>
                  </div>
                  <p className="relative mt-4 text-sm text-white/75">
                    1 ${ticker || "TICKER"} = ₦{STORE_VALUE_PER_TOKEN.toFixed(5)} to spend at {storeName || "your store"}. A {formatNaira(50_000)} order earns 50,000 ${ticker || "TICKER"}.
                  </p>
                </div>
              </div>
            )}

            {step === "payout" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted">Every payout for your orders goes to this account. It can be in {kind === "registered" ? "your registered business name" : "your business name"} or your own name, as on your ID.</p>
                <Field label="Bank" required>
                  <select className={inputClass}>
                    {["GTBank", "Access Bank", "First Bank", "UBA", "Zenith Bank", "Opay", "Moniepoint", "Kuda", "PalmPay"].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Account number" required>
                  <input value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" className={`${inputClass} font-mono tracking-wider`} placeholder="10 digits" />
                </Field>
                {account.length === 10 && (
                  <p className="rounded-2xl bg-surface-alt px-4 py-3 text-sm text-ink-2">Sotechy checks the account name matches your business or your ID before your first payout.</p>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="flex flex-col gap-3">
                {steps.filter((s) => s !== "review").map((s) => (
                  <button key={s} onClick={() => setStep(s)} className="flex items-center gap-3 rounded-2xl border border-line p-4 text-left hover:bg-surface-alt">
                    <Illo name={STEP_INFO[s].illo} size={28} />
                    <span className="flex-1 font-semibold">{STEP_INFO[s].title}</span>
                    {done.has(s) ? <span className="text-sm font-semibold text-good">Done</span> : <span className="text-sm font-semibold text-warn">Still needed</span>}
                    <ChevronRight size={16} className="text-faint" />
                  </button>
                ))}
                <label className="mt-2 flex items-start gap-3 text-sm text-ink-2">
                  <input type="checkbox" required className="mt-0.5" /> I confirm these details are true and I&apos;m allowed to act for this business.<Req />
                </label>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <button disabled={index === 0} onClick={() => setStep(steps[index - 1])} className={btn.ghost}>Back</button>
            {step === "review" ? (
              <button onClick={() => setSubmitted(true)} className={btn.primary}>Submit for review</button>
            ) : (
              <button disabled={step === "token" && !!problem} onClick={next} className={btn.dark}>
                Save and continue <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string, string, IlloName])[] }) {
  return (
    <div className="flex flex-col gap-3">
      {options.map(([v, title, body, illo]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${value === v ? "border-ink" : "border-line hover:border-faint"}`}>
          <Illo name={illo} size={40} />
          <span className="flex-1">
            <span className="block font-semibold">{title}</span>
            <span className="text-sm text-muted">{body}</span>
          </span>
          <span className={`h-5 w-5 rounded-full border-2 ${value === v ? "border-[6px] border-ink" : "border-line"}`} />
        </button>
      ))}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">{children}</main>;
}
