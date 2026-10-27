"use client";

import { ArrowLeft, Building2, Check, ChevronRight, CircleHelp, FileText, Loader2, Plus, Trash2, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { BUSINESS_DOCUMENTS, MIN_BUSINESS_DESCRIPTION, tickerProblem, type BusinessStructure, type KycStatus, type MerchantApplicationInput } from "@sotechy/shared";
import { checkTicker, saveApplication, uploadFiles } from "@/lib/market-actions";
import { IdCheck } from "@/components/id-check";
import { SellsPicker } from "@/components/sells-picker";
import { Illo } from "@/components/illustrations";
import { btn, Field, inputClass } from "@/components/ui";
import { formatNaira, SOTECHY_CROSS_BONUS } from "@/lib/money";
import { AddressInput } from "@/components/address-input";
import { PayoutAccountForm, type SavedAccount } from "@/components/payout-account-form";

type Kind = "registered" | "individual";
export type StepId = "setup" | "business" | "documents" | "you" | "people" | "store" | "payout" | "review";

const STEPS: Record<StepId, { title: string; intro: string }> = {
  setup: { title: "Business type", intro: "How your business is set up decides what we ask for next." },
  business: { title: "Business details", intro: "Your business exactly as it's registered with CAC." },
  documents: { title: "Documents", intro: "We check these against CAC. They're stored privately and only Sotechy's review team sees them." },
  you: { title: "Your ID", intro: "A short ID and selfie check for the store owner, done securely with Didit." },
  people: { title: "Directors and owners", intro: "Everyone who is a director, or owns 25% or more of the business." },
  store: { title: "Your store", intro: "Tell us what you do and what you sell, and name your store's token." },
  payout: { title: "Payout account", intro: "Where Sotechy sends the money for your orders." },
  review: { title: "Review and submit", intro: "Check everything, then send your store to Sotechy for review." },
};

const STRUCTURES: [BusinessStructure, string, string][] = [
  ["BN", "Business name", "Registered as a business name (BN number)"],
  ["LTD", "Private limited company", "Ltd, with an RC number"],
  ["PLC", "Public limited company", "Plc, with an RC number"],
  ["IT", "Incorporated trustees", "NGOs, churches and associations"],
];
const ROLES = ["Director", "Shareholder", "Director and shareholder"];

export interface OnboardingStart {
  storeName: string;
  ticker: string;
  ownerName: string;
  kind: Kind;
  sells: string[];
  application: (Omit<MerchantApplicationInput, "sellerKind" | "sells" | "submit"> & { tickerChosen?: boolean }) | null;
  submitted: boolean;
  /** The checked payout account, if one was saved */
  payout: SavedAccount | null;
  kycStatus: KycStatus;
  /** Sotechy approved the token, so the ticker can't change */
  tokenApproved: boolean;
}

type TickerCheck = { ticker: string; available: boolean; reason: string | null } | null;

/** Tickers made from the store name: its first word, initials, and mixes of the two */
function tickerIdeas(storeName: string): string[] {
  const words = storeName.toUpperCase().replace(/&/g, " ").replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const [first, second = ""] = words;
  const initials = words.map((w) => w[0]).join("");
  const ideas = [
    first.slice(0, 6),
    first.slice(0, 4),
    first.slice(0, 4) + second.slice(0, 2),
    first.slice(0, 3) + second.slice(0, 1),
    initials.length >= 3 ? initials.slice(0, 5) : initials + first.slice(1, 4 - initials.length + 1),
    first.slice(0, 5) + "S",
    words.join("").slice(0, 8),
  ];
  return [...new Set(ideas.filter((t) => !tickerProblem(t)))].slice(0, 6);
}

export default function OnboardingView({ initialStep, start }: { initialStep?: StepId; start: OnboardingStart }) {
  const app = start.application;
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(start.kind);
  const [structure, setStructure] = useState<BusinessStructure>(app?.structure ?? "LTD");
  const [business, setBusiness] = useState({
    registeredName: app?.registeredName ?? "",
    registrationNumber: app?.registrationNumber ?? "",
    registeredOn: app?.registeredOn ?? "",
    tin: app?.tin ?? "",
    businessAddress: app?.businessAddress ?? "",
  });
  const [description, setDescription] = useState(app?.description ?? "");
  const [sells, setSells] = useState<string[]>(start.sells);
  // A ticker made from the store name is only a suggestion until the store saves its own
  const [ticker, setTicker] = useState(app?.tickerChosen ? start.ticker : "");
  const [tickerCheck, setTickerCheck] = useState<TickerCheck>(app?.tickerChosen ? { ticker: start.ticker, available: true, reason: null } : null);
  const [uploaded, setUploaded] = useState<Record<string, string>>(app?.documents ?? {});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [people, setPeople] = useState(app?.people?.length ? app.people : [{ name: start.ownerName, role: "Director and shareholder", share: 100 }]);
  const [bank, setBank] = useState(app?.bank ?? null);
  const [payoutReady, setPayoutReady] = useState(!!start.payout);
  const [kyc, setKyc] = useState<KycStatus>(start.kycStatus);
  const [step, setStep] = useState<StepId>(initialStep ?? "setup");
  const [submitted, setSubmitted] = useState(start.submitted);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const steps: StepId[] = useMemo(
    () => (kind === "registered" ? ["setup", "business", "documents", "you", "people", "store", "payout", "review"] : ["setup", "you", "store", "payout", "review"]),
    [kind],
  );
  const index = Math.max(0, steps.indexOf(step));
  const docs = BUSINESS_DOCUMENTS[structure];
  const shares = people.reduce((n, p) => n + (Number(p.share) || 0), 0);
  const cleanTicker = ticker.trim().toUpperCase().replace(/^\$/, "");

  // Live ticker check, after a pause in typing
  useEffect(() => {
    if (!cleanTicker || tickerProblem(cleanTicker)) return;
    let live = true;
    const t = setTimeout(() => checkTicker(cleanTicker).then((r) => live && setTickerCheck(r)), 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [cleanTicker]);
  const tickerLocal = cleanTicker ? tickerProblem(cleanTicker) : "Choose a ticker";
  const tickerOk = !tickerLocal && tickerCheck?.ticker === cleanTicker && tickerCheck.available;

  // Suggestions from the store name, keeping only the free ones
  const [ideas, setIdeas] = useState<string[]>([]);
  useEffect(() => {
    if (start.tokenApproved) return;
    let live = true;
    Promise.all(tickerIdeas(start.storeName).map((t) => checkTicker(t))).then((rs) => {
      if (live) setIdeas(rs.filter((r) => r?.available).map((r) => r!.ticker).slice(0, 4));
    });
    return () => {
      live = false;
    };
  }, [start.storeName, start.tokenApproved]);

  /** What's still missing on each step; null when it's complete */
  const missing: Record<StepId, string | null> = {
    setup: null,
    business: !business.registeredName.trim()
      ? "Add the registered name"
      : !business.registrationNumber.trim()
        ? "Add the registration number"
        : !business.businessAddress.trim()
          ? "Add the business address"
          : null,
    documents: (() => {
      const left = docs.filter((d) => !d.optional && !uploaded[d.name]);
      return left.length ? `Upload ${left.map((d) => d.name).join(", ")}` : null;
    })(),
    you: kyc === "approved" || kyc === "in_review" ? null : kyc === "declined" ? "Your ID couldn't be verified" : "Finish your ID check",
    people: !people.length
      ? "Add at least one person"
      : people.some((p) => !p.name.trim())
        ? "Fill in everyone's name"
        : shares > 100
          ? "Shares add up to more than 100%"
          : null,
    store:
      description.trim().length < MIN_BUSINESS_DESCRIPTION
        ? `Describe your business (at least ${MIN_BUSINESS_DESCRIPTION} characters)`
        : !sells.length
          ? "Choose what you sell"
          : !tickerOk
            ? "Choose an available ticker"
            : null,
    payout: payoutReady ? null : "Add and check your payout account",
    review: null,
  };
  const outstanding = steps.filter((s) => s !== "review" && missing[s]);

  const details = (submit: boolean): MerchantApplicationInput => ({
    sellerKind: kind,
    sells,
    structure: kind === "registered" ? structure : null,
    ...(kind === "registered" ? business : { registeredName: null, registrationNumber: null, registeredOn: null, tin: null, businessAddress: null }),
    documents: uploaded,
    people: kind === "registered" ? people.map((p) => ({ ...p, name: p.name.trim(), share: Number(p.share) || 0 })) : [],
    bank,
    description: description.trim() || null,
    // Only a ticker that's been checked is saved
    ticker: tickerOk && !start.tokenApproved ? cleanTicker : null,
    submit,
  });
  const persist = (submit: boolean, then: () => void) =>
    startSaving(async () => {
      setError(null);
      const r = await saveApplication(details(submit));
      if ("error" in r) setError(r.error);
      else then();
    });
  /** Keeps what's filled in so far (even if a step isn't complete) and goes to the dashboard */
  const finishLater = () => persist(false, () => router.push("/"));
  const next = () => persist(false, () => setStep(steps[Math.min(index + 1, steps.length - 1)]));

  const uploadDoc = async (name: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) return setError(`${name}: files can be up to 10 MB`);
    const form = new FormData();
    form.append("kind", "document");
    form.append("file", file);
    setUploadingDoc(name);
    setError(null);
    const r = await uploadFiles(form);
    setUploadingDoc(null);
    if ("error" in r) setError(r.error);
    else setUploaded((u) => ({ ...u, [name]: r.ok[0].url }));
  };

  if (submitted) return <Submitted ticker={start.tokenApproved || tickerOk ? cleanTicker || start.ticker : null} />;

  const blocked = step !== "review" ? missing[step] : outstanding.length ? `Still to do: ${outstanding.map((s) => STEPS[s].title).join(", ")}` : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-7" />
            <span className="hidden h-5 w-px bg-line sm:block" />
            <span className="hidden text-sm font-semibold text-ink-2 sm:block">Setting up {start.storeName}</span>
          </div>
          <button type="button" disabled={saving} onClick={finishLater} className="text-sm font-semibold text-muted hover:text-ink">
            Save and exit
          </button>
        </div>
        {/* Phone: progress */}
        <div className="h-1 bg-line lg:hidden">
          <div className="h-full bg-brand transition-all" style={{ width: `${((steps.length - outstanding.length) / steps.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-12">
        {/* Steps, with what each still needs */}
        <nav aria-label="Setup steps" className="hidden lg:block">
          <ol className="sticky top-28">
            {steps.map((s, i) => {
              const on = s === step;
              const done = s === "review" ? false : !missing[s];
              return (
                <li key={s} className="relative pb-6 last:pb-0">
                  {i < steps.length - 1 && <span className={`absolute left-[13px] top-8 h-[calc(100%-28px)] w-px ${done ? "bg-good/50" : "bg-line"}`} />}
                  <button type="button" onClick={() => setStep(s)} className="group flex w-full items-start gap-3 text-left">
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                        done ? "border-good bg-good text-white" : on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted group-hover:border-faint"
                      }`}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={`block text-[15px] leading-tight ${on ? "font-semibold text-ink" : "text-ink-2"}`}>{STEPS[s].title}</span>
                      <span className={`mt-0.5 block text-xs ${done ? "text-good" : "text-muted"}`}>{s === "review" ? (outstanding.length ? `${outstanding.length} to go` : "Ready to submit") : done ? "Done" : missing[s]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="min-w-0 max-w-[640px]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Step {index + 1} of {steps.length}
          </p>
          <h1 className="mt-2 font-display text-[28px] font-bold leading-tight sm:text-[32px]">{STEPS[step].title}</h1>
          <p className="mt-2 text-ink-2">{STEPS[step].intro}</p>

          <div className="mt-7 rounded-2xl border border-line bg-surface">
            {step === "setup" && (
              <div className="divide-y divide-line">
                <Section label="How do you sell?">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Option on={kind === "registered"} onClick={() => setKind("registered")} icon={<Building2 size={20} />} title="Registered business" body="Registered with CAC" />
                    <Option on={kind === "individual"} onClick={() => setKind("individual")} icon={<UserRound size={20} />} title="Freelancer or individual" body="Selling in your own name" />
                  </div>
                </Section>
                {kind === "registered" && (
                  <Section label="Type of registration">
                    <div className="flex flex-col gap-2">
                      {STRUCTURES.map(([v, title, body]) => (
                        <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${structure === v ? "border-ink" : "border-line hover:border-faint"}`}>
                          <input type="radio" name="structure" checked={structure === v} onChange={() => setStructure(v)} className="accent-[var(--color-ink)]" />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{title}</span>
                            <span className="block text-xs text-muted">{body}</span>
                          </span>
                          <span className="font-mono text-xs text-faint">{v}</span>
                        </label>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {step === "business" && (
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2">
                  <Field label="Registered business name" required hint="Exactly as it appears on your CAC certificate.">
                    <input value={business.registeredName} onChange={(e) => setBusiness({ ...business, registeredName: e.target.value })} className={inputClass} placeholder="e.g. Xena Gadgets Ltd" />
                  </Field>
                </div>
                <Field label={`${structure === "BN" ? "BN" : structure === "IT" ? "IT" : "RC"} number`} required>
                  <input value={business.registrationNumber} onChange={(e) => setBusiness({ ...business, registrationNumber: e.target.value })} inputMode="numeric" className={inputClass} placeholder="e.g. 1234567" />
                </Field>
                <Field label="Date registered">
                  <input value={business.registeredOn} onChange={(e) => setBusiness({ ...business, registeredOn: e.target.value })} type="date" className={inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Business address" required>
                    <AddressInput value={business.businessAddress} onChange={(businessAddress) => setBusiness({ ...business, businessAddress })} placeholder="Start typing your street" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Tax ID (TIN)" hint="Optional.">
                    <input value={business.tin} onChange={(e) => setBusiness({ ...business, tin: e.target.value })} inputMode="numeric" className={inputClass} />
                  </Field>
                </div>
              </div>
            )}

            {step === "documents" && (
              <>
                <ul className="divide-y divide-line">
                  {docs.map((d) => {
                    const done = !!uploaded[d.name];
                    const busy = uploadingDoc === d.name;
                    return (
                      <li key={d.name} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done ? "bg-good-soft text-good" : "bg-surface-alt text-muted"}`}>
                          {done ? <Check size={18} /> : <FileText size={18} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{d.name}</span>
                          <span className={`block text-sm ${done ? "text-good" : "text-muted"}`}>{busy ? "Uploading…" : done ? "Uploaded" : d.optional ? "Optional" : "Required"}</span>
                        </span>
                        <label className={`${done ? btn.ghost : btn.outline} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {done ? "Replace" : "Upload"}
                          <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDoc(d.name, e.target.files[0])} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="border-t border-line px-5 py-3 text-xs text-muted sm:px-6">PDF, JPG or PNG, up to 10 MB each.</p>
              </>
            )}

            {step === "you" && (
              <div className="p-5 sm:p-6">
                <IdCheck onStatus={setKyc} />
              </div>
            )}

            {step === "people" && (
              <>
                <ul className="divide-y divide-line">
                  {people.map((p, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_230px_88px_auto] sm:items-end sm:px-6">
                      <Field label={i === 0 ? "Full name" : `Person ${i + 1}`}>
                        <input value={p.name} onChange={(e) => setPeople(people.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputClass} placeholder="As on their ID" />
                      </Field>
                      <div className="col-span-2 sm:col-span-1">
                        <Field label="Role">
                          <select value={p.role} onChange={(e) => setPeople(people.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} className={inputClass}>
                            {[...new Set([...ROLES, p.role])].map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Shares %">
                        <input
                          value={p.share}
                          inputMode="numeric"
                          onChange={(e) => setPeople(people.map((x, j) => (j === i ? { ...x, share: Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0) } : x)))}
                          className={inputClass}
                        />
                      </Field>
                      <button
                        type="button"
                        disabled={people.length === 1}
                        onClick={() => setPeople(people.filter((_, j) => j !== i))}
                        aria-label="Remove person"
                        className="mb-1 flex h-10 w-10 items-center justify-center self-end rounded-full text-muted hover:bg-bad-soft hover:text-bad disabled:invisible"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                  <button type="button" onClick={() => setPeople([...people, { name: "", role: "Director", share: 0 }])} className={btn.outline}>
                    <Plus size={16} /> Add a person
                  </button>
                  <span className={`text-sm ${shares > 100 ? "font-semibold text-bad" : "text-muted"}`}>Shares listed: {shares}%</span>
                </div>
              </>
            )}

            {step === "store" && (
              <div className="divide-y divide-line">
                <Section label="About your business" required>
                  <textarea
                    value={description}
                    maxLength={1000}
                    rows={5}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What you sell, who your customers are, how long you've been trading and where you're based."
                    className={`${inputClass} resize-y py-3 leading-relaxed`}
                  />
                  <p className={`mt-1.5 text-xs ${description.trim().length < MIN_BUSINESS_DESCRIPTION ? "text-muted" : "text-good"}`}>
                    {description.trim().length < MIN_BUSINESS_DESCRIPTION ? `${MIN_BUSINESS_DESCRIPTION - description.trim().length} more characters needed` : "Good"} · {description.length}/1000
                  </p>
                </Section>
                <Section label="What you sell" required>
                  <SellsPicker value={sells} onChange={setSells} />
                </Section>
                <Section label="Token ticker" required help={<TokenHelp />}>
                  {start.tokenApproved ? (
                    <p className="rounded-xl bg-surface-alt px-4 py-3 text-sm">
                      Your token is <b>${start.ticker}</b>. It&apos;s created, so the ticker can&apos;t change.
                    </p>
                  ) : (
                    <>
                      <div className={`flex items-center overflow-hidden rounded-2xl border bg-surface transition focus-within:border-ink ${cleanTicker && (tickerLocal || tickerCheck?.available === false) ? "border-bad" : "border-line"}`}>
                        <span className="pl-4 font-display text-lg font-bold text-muted">$</span>
                        <input
                          value={ticker}
                          maxLength={8}
                          onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                          placeholder={start.ticker}
                          className="h-12 min-w-0 flex-1 bg-transparent px-1.5 font-display text-lg font-bold tracking-wide outline-none placeholder:text-faint"
                          aria-label="Token ticker"
                        />
                        {cleanTicker && !tickerLocal && (
                          <span className="pr-4 text-sm font-semibold">
                            {tickerCheck?.ticker !== cleanTicker ? (
                              <Loader2 size={16} className="animate-spin text-muted" />
                            ) : tickerCheck.available ? (
                              <span className="text-good">Available</span>
                            ) : (
                              <span className="text-bad">Taken</span>
                            )}
                          </span>
                        )}
                      </div>
                      <p className={`mt-1.5 text-xs ${cleanTicker && (tickerLocal || tickerCheck?.available === false) ? "text-bad" : "text-muted"}`}>
                        {cleanTicker
                          ? (tickerLocal ?? (tickerCheck?.ticker === cleanTicker && !tickerCheck.available ? (tickerCheck.reason ?? "Taken") : "3 to 8 letters or numbers. It's fixed once Sotechy approves your store."))
                          : `3 to 8 letters or numbers, e.g. ${start.ticker}. It's fixed once Sotechy approves your store.`}
                      </p>
                      {ideas.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted">Ideas from your store name:</span>
                          {ideas.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTicker(t)}
                              className={`rounded-full border px-3 py-1 font-display text-sm font-bold transition ${cleanTicker === t ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}
                            >
                              ${t}
                            </button>
                          ))}
                        </div>
                      )}
                      {tickerOk && (
                        <p className="mt-3 text-sm text-ink-2">
                          Customers earn <b>1 ${cleanTicker}</b> for every ₦1 they spend with you. A {formatNaira(50_000)} order earns 50,000 ${cleanTicker}.
                        </p>
                      )}
                    </>
                  )}
                </Section>
              </div>
            )}

            {step === "payout" && (
              <div className="p-5 sm:p-6">
                <PayoutAccountForm
                  saved={start.payout}
                  onSaved={(a) => {
                    setBank({ bankName: a.bankName, accountNumber: a.accountNumber });
                    setPayoutReady(true);
                  }}
                />
              </div>
            )}

            {step === "review" && (
              <>
                <ul className="divide-y divide-line">
                  {steps
                    .filter((s) => s !== "review")
                    .map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => setStep(s)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-alt sm:px-6">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${missing[s] ? "border border-line" : "bg-good text-white"}`}>{!missing[s] && <Check size={13} strokeWidth={3} />}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{STEPS[s].title}</span>
                            {missing[s] && <span className="block text-sm text-warn">{missing[s]}</span>}
                          </span>
                          <span className="text-sm font-semibold text-muted">{missing[s] ? "Finish" : "Edit"}</span>
                          <ChevronRight size={16} className="text-faint" />
                        </button>
                      </li>
                    ))}
                </ul>
                <label className="flex items-start gap-3 border-t border-line px-5 py-4 text-sm text-ink-2 sm:px-6">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-[var(--color-ink)]" />
                  I confirm these details are true and that I&apos;m allowed to act for this business.
                </label>
              </>
            )}
          </div>

          {error && <p className="mt-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          {!error && blocked && <p className="mt-4 text-sm text-muted">{blocked}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button type="button" disabled={index === 0 || saving} onClick={() => setStep(steps[index - 1])} className={`${btn.ghost} disabled:invisible`}>
              <ArrowLeft size={16} /> Back
            </button>
            <span className="flex-1" />
            <button type="button" disabled={saving || uploadingDoc !== null} onClick={finishLater} className={btn.outline}>
              Finish later
            </button>
            {step === "review" ? (
              <button type="button" disabled={saving || !confirmed || outstanding.length > 0} onClick={() => persist(true, () => setSubmitted(true))} className={btn.primary}>
                {saving ? "Submitting…" : "Submit for review"}
              </button>
            ) : (
              <button type="button" disabled={saving || !!blocked || uploadingDoc !== null} onClick={next} className={btn.dark}>
                {saving ? "Saving…" : "Save and continue"} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ label, required, help, children }: { label: string; required?: boolean; help?: ReactNode; children: ReactNode }) {
  return (
    <section className="p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold">
          {label}
          {required && <span className="text-bad"> *</span>}
        </h2>
        {help}
      </div>
      {children}
    </section>
  );
}

function Option({ on, onClick, icon, title, body }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${on ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-ink text-white" : "bg-surface-alt text-ink-2"}`}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </button>
  );
}

/** The ? next to the ticker: what a store token is, when asked */
function TokenHelp() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="What is a store token?" className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
        <CircleHelp size={17} />
      </button>
      {open && (
        <span className="absolute left-0 top-8 z-30 block w-[min(340px,80vw)] rounded-2xl border border-line bg-surface p-4 text-sm shadow-[0_18px_40px_-18px_rgba(23,18,14,0.35)]">
          <span className="mb-2 flex items-center justify-between">
            <b>What is a store token?</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-ink">
              <X size={15} />
            </button>
          </span>
          <span className="block text-ink-2">Your store gets its own reward token on the Monad blockchain, named by this ticker.</span>
          <span className="mt-2 block text-ink-2">Customers earn 1 token per ₦1 they spend with you when an order completes, plus {SOTECHY_CROSS_BONUS * 100}% in $SOTECHY. They can only spend it at your store, so it brings them back, and Sotechy pays you in naira for what they spend.</span>
          <span className="mt-2 block text-muted">It&apos;s a reward, not money or an investment, and it can&apos;t be cashed out.</span>
        </span>
      )}
    </span>
  );
}

function Submitted({ ticker }: { ticker: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
        <Illo name="sparkle" size={48} />
      </span>
      <h1 className="mt-5 text-center font-display text-3xl font-bold">Submitted for review</h1>
      <p className="mt-2 text-center text-muted">We usually review new stores within 1–2 working days and we&apos;ll email you. Meanwhile, you can explore your dashboard and get your store ready.</p>
      <ol className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        {[
          ["Submitted", "Just now", true],
          ["In review", "Sotechy checks your documents and ID", false],
          ["Approved", ticker ? `Your $${ticker} token is created and you can start selling` : "Your token is created and you can start selling", false],
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
      <Link href="/" className={`${btn.primary} mt-6 w-full`}>
        Go to my dashboard
      </Link>
    </main>
  );
}
