"use client";

import { BadgeHint } from "@/components/badge-hint";
import { ArrowLeft, Building2, Check, ChevronRight, CircleHelp, FileText, Loader2, Plus, Trash2, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { BUSINESS_DOCUMENTS, isMapLink, MIN_BUSINESS_DESCRIPTION, TOKEN_RULES, TOKEN_VALUE, tickerIdeas, tickerProblem, tokensToNaira, type BusinessStructure, type KycStatus, type MerchantApplicationInput } from "@sotechy/shared";
import { checkTicker, saveApplication, uploadFiles } from "@/lib/market-actions";
import { IdCheck } from "@/components/id-check";
import { SellsPicker } from "@/components/sells-picker";
import { Illo } from "@/components/illustrations";
import { WhySell } from "@/components/why-sell";
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

/** The icon for each step, in the phone's step bar */
const STEP_ICON: Record<StepId, Parameters<typeof Illo>[0]["name"]> = {
  setup: "store",
  business: "doc",
  documents: "receipt",
  you: "user",
  people: "heart",
  store: "bag",
  payout: "bank",
  review: "shield",
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
  /** Sotechy sent the store back for changes (with what to change), or declined it */
  review?: { note: string; declined: boolean } | null;
}

type TickerCheck = { ticker: string; available: boolean; reason: string | null } | null;

export default function OnboardingView({ initialStep, start }: { initialStep?: StepId; start: OnboardingStart }) {
  const app = start.application;
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(start.kind);
  const [structure, setStructure] = useState<BusinessStructure>(app?.structure ?? "LTD");
  // CAC numbers carry their prefix: RC (companies), BN (business names), IT (incorporated trustees)
  const cacPrefix = structure === "BN" ? "BN" : structure === "IT" ? "IT" : "RC";
  /** Upper case, no spaces, and the prefix added when only the digits were typed */
  const cleanRegNo = (v: string) => {
    const t = v.toUpperCase().replace(/\s+/g, "");
    return /^\d+$/.test(t) ? `${cacPrefix}${t}` : t;
  };
  const [business, setBusiness] = useState({
    registeredName: app?.registeredName ?? "",
    registrationNumber: app?.registrationNumber ?? "",
    registeredOn: app?.registeredOn ?? "",
    tin: app?.tin ?? "",
  });
  const [description, setDescription] = useState(app?.description ?? "");
  // Where the business is, for everyone and all optional: the address, a map link and a photo of the shop
  const [ownAddress, setOwnAddress] = useState(app?.businessAddress ?? "");
  const [shopPhoto, setShopPhoto] = useState<string | null>(app?.businessPhotoUrl ?? null);
  const [uploadingShop, setUploadingShop] = useState(false);
  // Optional: a Google Maps link to the business, for the exact spot
  const [mapUrl, setMapUrl] = useState(app?.businessMapUrl ?? "");
  const badMapUrl = !!mapUrl.trim() && !isMapLink(mapUrl);
  const mapField = (
    <Field label="Google Maps link" hint={badMapUrl ? "That isn't a Google Maps link. In Google Maps, tap Share and copy the link." : "Optional. Shows the exact spot; without it we use the address."}>
      <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} inputMode="url" maxLength={500} className={inputClass} placeholder="https://maps.app.goo.gl/…" />
    </Field>
  );
  // Websites aren't asked for any more; one saved earlier is kept as it was
  const website = app?.website ?? "";
  const [socials, setSocials] = useState({ instagram: app?.socials?.instagram ?? "", x: app?.socials?.x ?? "", facebook: app?.socials?.facebook ?? "", tiktok: app?.socials?.tiktok ?? "" });
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
    ...(kind === "registered" ? { ...business, registrationNumber: cleanRegNo(business.registrationNumber) || "" } : { registeredName: null, registrationNumber: null, registeredOn: null, tin: null }),
    businessAddress: ownAddress.trim() || null,
    businessMapUrl: mapUrl.trim() && !badMapUrl ? mapUrl.trim() : null,
    businessPhotoUrl: shopPhoto,
    website: website.trim() || null,
    socials: Object.values(socials).some((v) => v.trim()) ? { instagram: socials.instagram.trim() || null, x: socials.x.trim() || null, facebook: socials.facebook.trim() || null, tiktok: socials.tiktok.trim() || null } : null,
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

  const uploadShop = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return setError("Photos can be up to 10 MB");
    const form = new FormData();
    form.append("kind", "image");
    form.append("file", file);
    setUploadingShop(true);
    setError(null);
    const r = await uploadFiles(form);
    setUploadingShop(false);
    if ("error" in r) setError(r.error);
    else setShopPhoto(r.ok[0].url);
  };

  if (start.review?.declined) return <Declined store={start.storeName} note={start.review.note} />;
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
          <div className="flex items-center gap-3">
            <WhySell tone="light" />
            {/* Phones have "Finish later" under the form instead */}
            <button type="button" disabled={saving} onClick={finishLater} className="hidden text-sm font-semibold text-muted hover:text-ink lg:inline">
              Save and exit
            </button>
          </div>
        </div>
        {/* Phone: each step as an icon, done ones ticked; tap one to go there */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
          {steps.map((s, i) => {
            const done = s !== "review" && !missing[s];
            const here = s === step;
            return (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <span className={`h-0.5 w-3 shrink-0 rounded-full ${done || here ? "bg-brand" : "bg-line"}`} />}
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  aria-label={STEPS[s].title}
                  aria-current={here ? "step" : undefined}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${here ? "border-brand bg-brand-soft" : done ? "border-good/40 bg-good-soft" : "border-line bg-surface"}`}
                >
                  <Illo name={STEP_ICON[s]} size={20} />
                  {done && !here && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-good text-white">
                      <Check size={9} strokeWidth={3} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </header>

      {/* Sent back by Sotechy: what to change before submitting again */}
      {start.review && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="rounded-2xl border border-warn/40 bg-warn-soft px-5 py-4">
            <p className="font-semibold">Sotechy asked for a few changes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{start.review.note}</p>
            <p className="mt-2 text-xs text-muted">Make the changes below, then submit again from the last step.</p>
          </div>
        </div>
      )}

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
                  <div className="mt-3">
                    <BadgeHint />
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
                    <input value={business.registeredName} onChange={(e) => setBusiness({ ...business, registeredName: e.target.value })} className={inputClass} placeholder="e.g. Sotechy Shop Ltd" />
                  </Field>
                </div>
                <Field label="Registration number" required hint="Include the CAC prefix, e.g. RC123456 for a company, BN123456 for a business name, or IT123456 for incorporated trustees.">
                  <input
                    value={business.registrationNumber}
                    onChange={(e) => setBusiness({ ...business, registrationNumber: e.target.value.toUpperCase() })}
                    onBlur={(e) => e.target.value.trim() && setBusiness({ ...business, registrationNumber: cleanRegNo(e.target.value) })}
                    autoCapitalize="characters"
                    maxLength={30}
                    className={inputClass}
                    placeholder={`e.g. ${cacPrefix}1234567`}
                  />
                </Field>
                <Field label="Date registered">
                  <input value={business.registeredOn} onChange={(e) => setBusiness({ ...business, registeredOn: e.target.value })} type="date" className={inputClass} />
                </Field>
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
                <Section label="What you sell" required>
                  <SellsPicker value={sells} onChange={setSells} />
                </Section>
                <Section label="About your business" required>
                  <textarea
                    value={description}
                    maxLength={1000}
                    rows={5}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Who your customers are, how long you've been trading, and what makes your store different."
                    className={`${inputClass} resize-y py-3 leading-relaxed`}
                  />
                  <p className={`mt-1.5 text-xs ${description.trim().length < MIN_BUSINESS_DESCRIPTION ? "text-muted" : "text-good"}`}>
                    {description.trim().length < MIN_BUSINESS_DESCRIPTION ? `${MIN_BUSINESS_DESCRIPTION - description.trim().length} more characters needed` : "Good"} · {description.length}/1000
                  </p>
                </Section>
                <Section label="Business location">
                  <p className="mb-3 text-sm text-muted">All optional. If you have a shop or office, it helps customers trust you.</p>
                  <Field label="Address" hint="Optional.">
                    <AddressInput value={ownAddress} onChange={setOwnAddress} placeholder="Where you work from, if you have a shop or office" />
                  </Field>
                  <div className="mt-3">{mapField}</div>
                  <div className="mt-3">
                    <Field label="Photo of your shop or office" hint="Optional. The front of the shop, or inside it.">
                      <div className="flex flex-wrap items-center gap-3">
                        {shopPhoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={shopPhoto} alt="Your shop" className="h-20 w-28 rounded-xl border border-line object-cover" />
                        )}
                        <label className={`${btn.outline} cursor-pointer`}>
                          {uploadingShop ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {shopPhoto ? "Change photo" : uploadingShop ? "Uploading…" : "Add a photo"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingShop} onChange={(e) => e.target.files?.[0] && void uploadShop(e.target.files[0])} />
                        </label>
                        {shopPhoto && (
                          <button type="button" onClick={() => setShopPhoto(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-bad">
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>
                    </Field>
                  </div>
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
                          placeholder={ideas[0] ?? start.ticker}
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
                          : `3 to 8 letters or numbers, e.g. ${ideas[0] ?? start.ticker}. It's fixed once Sotechy approves your store.`}
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
                <Section label="Socials">
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                    <Handle icon={<Brand name="instagram" />} label="Instagram" prefix="@" value={socials.instagram} onChange={(instagram) => setSocials({ ...socials, instagram })} placeholder="yourstore" />
                    <Handle icon={<Brand name="x" />} label="X" prefix="@" value={socials.x} onChange={(x) => setSocials({ ...socials, x })} placeholder="yourstore" />
                    <Handle icon={<Brand name="tiktok" />} label="TikTok" prefix="@" value={socials.tiktok} onChange={(tiktok) => setSocials({ ...socials, tiktok })} placeholder="yourstore" />
                    <Handle icon={<Brand name="facebook" />} label="Facebook" value={socials.facebook} onChange={(facebook) => setSocials({ ...socials, facebook })} placeholder="Page name or link" />
                  </div>
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
            {/* Computers: beside the main button; phones: plain text in the middle, below */}
            <div className="order-last w-full text-center sm:order-none sm:w-auto">
              <button type="button" disabled={saving || uploadingDoc !== null} onClick={finishLater} className="py-2 text-sm font-semibold text-muted hover:text-ink sm:hidden">
                Save and finish later
              </button>
              <span className="hidden sm:inline">
                <button type="button" disabled={saving || uploadingDoc !== null} onClick={finishLater} className={btn.outline}>
                  Save and finish later
                </button>
              </span>
            </div>
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

/** One row of the socials list: the site's mark, then the handle */
function Handle({ icon, label, prefix, value, onChange, placeholder }: { icon: ReactNode; label: string; prefix?: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-11 items-center gap-2.5 px-3.5 text-sm focus-within:bg-surface-alt">
      <span className="flex w-5 shrink-0 justify-center text-ink-2" title={label}>
        {icon}
      </span>
      {prefix && <span className="-mr-1.5 text-muted">{prefix}</span>}
      <input
        value={value}
        maxLength={200}
        aria-label={label}
        onChange={(e) => onChange(prefix ? e.target.value.replace(/^@/, "") : e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
      />
    </label>
  );
}

const BRAND_PATHS = {
  x: "M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2.3 3h6.2l4.3 5.7L17.8 3zm-1 16.2h1.7L7.3 4.7H5.5l11.3 14.5z",
  tiktok:
    "M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2-2.8V9.2a6.3 6.3 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.6 1.5V6.8a4.6 4.6 0 0 1-4.6-4.6V2z",
  facebook: "M14 22v-8.1h2.7l.4-3.2H14V8.7c0-.9.3-1.5 1.6-1.5h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.8v3.2h2.8V22H14z",
} as const;

/** Small brand marks for the socials list (the icon set has no logos) */
function Brand({ name }: { name: keyof typeof BRAND_PATHS | "instagram" }) {
  if (name === "instagram")
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden>
      <path d={BRAND_PATHS[name]} />
    </svg>
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
/** The "?" beside the ticker: what a store token is, what it's for, what it's worth and where that value comes from */
function TokenHelp() {
  const [open, setOpen] = useState(false);
  const fee = TOKEN_RULES.feeRate * 100;
  const reserve = TOKEN_RULES.feeRate * TOKEN_RULES.reserveShare * 100;
  const parts: { title: string; body: ReactNode }[] = [
    {
      title: "What it is",
      body: <>Your store gets its own reward token on the Monad blockchain, named by this ticker (like $SOTECHY for Sotechy Shop). It&apos;s created when Sotechy approves your store.</>,
    },
    {
      title: "What it's used for",
      body: (
        <>
          Customers earn 1 of your tokens for every ₦1 they spend with you, released when the order is delivered, plus {SOTECHY_CROSS_BONUS * 100}% in $SOTECHY. They also earn more for reviewing what they bought. Your tokens can only be spent at your store, so every token is a reason to come back to you.
        </>
      ),
    },
    {
      title: "What it's worth",
      body: (
        <>
          1 token = ₦{TOKEN_VALUE.toFixed(5)} at your store, so 10,000 tokens take about {formatNaira(tokensToNaira(10_000))} off an order. Customers mix tokens with money, and at least {formatNaira(TOKEN_RULES.minCashPerOrder)} of every order is paid in money.
        </>
      ),
    },
    {
      title: "How it gets its value",
      body: (
        <>
          Every sale pays Sotechy a {fee}% fee, and half of it ({reserve}% of the sale) goes into a token reserve. When a customer pays with your tokens, the reserve pays you that amount in naira, so you never lose money on a token sale. It costs you nothing extra.
        </>
      ),
    },
  ];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="What is a store token?" className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
        <CircleHelp size={17} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="What is a store token?" onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name="coin" size={30} />
                </span>
                <h3 className="font-display text-xl font-bold">Your store token</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4 text-sm">
              {parts.map((p) => (
                <div key={p.title}>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 text-ink-2">{p.body}</p>
                </div>
              ))}
              <div>
                <p className="font-semibold">Why customers love it</p>
                <p className="mt-1 text-ink-2">
                  Holding your token is a bragging right. It shows they&apos;re a real customer of yours, and the more they buy, the more they hold. It makes them feel part of your business, not just someone who bought once.
                </p>
              </div>
              <p className="rounded-xl bg-surface-alt px-4 py-3 text-muted">It&apos;s a reward, not money or an investment. Customers can&apos;t cash it out, sell it or send it outside Sotechy, and its value doesn&apos;t go up.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className={`${btn.primary} mt-5 w-full`}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Sotechy declined the store: the reason, and who to talk to */
function Declined({ store, note }: { store: string; note: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-bad-soft">
        <Illo name="shield" size={48} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold">{store} wasn&apos;t approved</h1>
      <p className="mt-3 whitespace-pre-line rounded-2xl border border-line bg-surface px-5 py-4 text-left text-sm text-ink-2">{note}</p>
      <p className="mt-4 text-sm text-muted">If you think this is a mistake, or things have changed, email support@sotechy.shop and we&apos;ll look again.</p>
      <Link href="/" className={`${btn.outline} mx-auto mt-6`}>
        Back to your dashboard
      </Link>
    </main>
  );
}

function Submitted({ ticker }: { ticker: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
        <Illo name="doc" size={48} />
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
