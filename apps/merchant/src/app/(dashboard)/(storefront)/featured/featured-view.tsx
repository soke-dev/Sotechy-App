"use client";

// Paying to have the store featured: shown first on the Sotechy app's Home, in Shop and in Stores, with a
// Home banner. Pro costs more and adds the store's own dark row of products on Home (two stores at a time).
// Prices and how many stores can have each at once are set by Sotechy.
import { ArrowRight, Check, ChevronRight, CreditCard, Crown, ImagePlus, Landmark, Megaphone, Star, Trash2, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import { useAccount } from "@/components/account-context";
import { BANNER_SPEC, ImageCropper } from "@/components/image-cropper";
import { btn, Card, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { buyFeaturing, uploadFiles } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

type Tier = "standard" | "pro";

export interface Featuring {
  pricePerMonth: number;
  maxStores: number;
  /** Pro: price, how many stores can have it at once, and how many spots are open */
  proPricePerMonth: number;
  maxPro: number;
  proSpotsLeft: number;
  proUntil: string | null;
  /** When the paid Featured months end (they run alongside Pro) */
  standardUntil?: string | null;
  /** Features one store can hold at a time, and how many this store holds */
  maxPerStore: number;
  activeFeatures: number;
  spotsLeft: number;
  /** Ways to pay right now */
  payMethods?: { stablecoin: boolean; bank: boolean };
  featuredUntil: string | null;
  purchases: {
    id: string;
    months: number;
    amount: number;
    tier?: Tier;
    paidAt: string | null;
    until: string | null;
    banner: { imageUrl: string | null; title: string | null; ctaLabel: string | null; state: "live" | "scheduled" | "ended" | "off" } | null;
  }[];
}

const BANNER_STATE = { live: { label: "Banner showing", tone: "good" }, scheduled: { label: "Banner starts later", tone: "info" }, ended: { label: "Banner ended", tone: "neutral" }, off: { label: "Banner off", tone: "neutral" } } as const;

/** How the banner looks at the top of the app's Home screen */
function BannerPreview({ imageUrl, title, cta }: { imageUrl: string | null; title: string; cta: string }) {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[28px] border border-line bg-canvas p-3">
      <div className="relative aspect-[1/0.52] w-full overflow-hidden rounded-2xl bg-surface-alt">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">Your picture shows here</span>
        )}
        {(title || cta) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-white">
            {title && <p className="font-display text-lg font-extrabold leading-tight">{title}</p>}
            {cta && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                {cta} <ArrowRight size={12} />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-ink" />
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
      </div>
    </div>
  );
}

const DAY = 86_400_000;
const BENEFITS: { title: string; text: string }[] = [
  { title: "Your own Home banner", text: "At the front of the app's Home slides. Tapping it opens your store." },
  { title: "In “Featured stores” on Home", text: "Your products in the row shared by featured stores." },
  { title: "First on Home, in Shop and in Stores", text: "You lead the stores row, Shop and the Stores tab." },
  { title: "★ on your products", text: "On your store and products everywhere." },
];
const PRO_EXTRA = { title: "Your own row on Home", text: "A dark row of up to 10 of your products, with your name on it. Only two stores have one at a time." };

/** A small phone showing where a feature puts the store on Home; the parts it gets are lit up in orange */
function HomeMock({ pro, name }: { pro: boolean; name: string }) {
  const lit = "ring-2 ring-brand ring-offset-1 ring-offset-[#FAF7F3]";
  const tile = (on: boolean, i: number) => <span key={i} className={`h-9 w-9 shrink-0 rounded-lg ${on ? "bg-brand/80" : "bg-[#E9E1D7]"}`} />;
  const label = (text: string) => (
    <span className="absolute -right-1 -top-2 z-10 rounded-full bg-brand px-1.5 py-px text-[8px] font-bold text-white shadow">{text}</span>
  );
  return (
    <div className="mx-auto w-[170px] rounded-[26px] border-[5px] border-[#17120E] bg-[#FAF7F3] p-2 shadow-[0_12px_30px_rgba(23,18,14,0.18)]" aria-hidden>
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#17120E]/80" />
      {/* Banner slides */}
      <div className={`relative mb-2 h-[52px] overflow-hidden rounded-xl bg-[#17120E] ${lit}`}>
        {label("Banner")}
        <span className="absolute -right-3 top-2 h-12 w-12 rounded-full bg-brand" />
        <span className="absolute left-2 top-2 h-1.5 w-14 rounded bg-white/80" />
        <span className="absolute left-2 top-5 h-1 w-10 rounded bg-white/40" />
        <span className="absolute bottom-2 left-2 h-2.5 w-9 rounded-full bg-white" />
      </div>
      {/* Stores row: yours first */}
      <p className="mb-1 text-[7px] font-bold text-[#17120E]">Stores on Sotechy</p>
      <div className="mb-2 flex gap-1.5">
        <span className={`relative flex h-10 w-16 shrink-0 items-end rounded-lg bg-white p-1 ${lit}`}>
          <Star size={8} className="absolute left-1 top-1 fill-[#FDB913] text-[#FDB913]" />
          <span className="truncate text-[6px] font-bold text-[#17120E]">{name}</span>
        </span>
        <span className="h-10 w-16 shrink-0 rounded-lg bg-white" />
      </div>
      {/* Featured stores row */}
      <p className="mb-1 text-[7px] font-bold text-[#17120E]">Featured stores</p>
      <div className="relative mb-2 flex gap-1 overflow-hidden">{[1, 0, 1, 0].map((on, i) => tile(!!on, i))}</div>
      {/* Pro: the store's own dark row */}
      {pro ? (
        <div className={`relative rounded-xl bg-[#17120E] p-1.5 ${lit}`}>
          {label("Your row")}
          <p className="mb-1 truncate text-[7px] font-bold text-white">From {name}</p>
          <div className="flex gap-1 overflow-hidden">{[0, 1, 2, 3].map((i) => <span key={i} className="h-8 w-8 shrink-0 rounded-md bg-brand/80" />)}</div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#D9CFC4] p-1.5">
          <p className="mb-1 text-[7px] font-bold text-[#B5A99C]">A Pro store&apos;s own row</p>
          <div className="flex gap-1 overflow-hidden">{[0, 1, 2, 3].map((i) => <span key={i} className="h-8 w-8 shrink-0 rounded-md bg-[#EFE8E0]" />)}</div>
        </div>
      )}
    </div>
  );
}
const fmtDate = (d: string | number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export function FeaturedView({ data, justPaid }: { data: Featuring; justPaid: boolean }) {
  const { store } = useAccount();
  const [tier, setTier] = useState<Tier>("standard");
  const [months, setMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // The store's banner for this payment: one banner per feature payment. Without a picture, Sotechy designs one.
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerCta, setBannerCta] = useState("Visit store");
  const [cropping, setCropping] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setCropping(null);
    const form = new FormData();
    form.append("kind", "image");
    form.append("file", file);
    setUploading(true);
    const r = await uploadFiles(form);
    setUploading(false);
    if ("error" in r) setError(r.error);
    else setBannerImage(r.ok[0].url);
  };
  const [now] = useState(() => Date.now());
  const until = data.featuredUntil ? new Date(data.featuredUntil).getTime() : null;
  const active = until !== null && until > now;
  const daysLeft = active ? Math.ceil((until! - now) / DAY) : 0;
  const proUntil = data.proUntil ? new Date(data.proUntil).getTime() : null;
  const proActive = proUntil !== null && proUntil > now;
  const price = tier === "pro" ? data.proPricePerMonth : data.pricePerMonth;
  const total = price * months;
  // Featured and Pro run side by side: new months go on the end of the same kind only
  const stdUntil = data.standardUntil ? new Date(data.standardUntil).getTime() : null;
  const stdActive = stdUntil !== null && stdUntil > now;
  const newUntil = ((tier === "pro" ? (proActive ? proUntil : null) : stdActive ? stdUntil : null) ?? now) + months * 30 * DAY;
  const full = (!active && data.spotsLeft === 0) || (tier === "pro" && !proActive && data.proSpotsLeft === 0);
  const atLimit = data.activeFeatures >= data.maxPerStore;
  const approved = store.status === "approved";

  const [choosing, setChoosing] = useState(false);
  const ways = data.payMethods ?? { stablecoin: true, bank: false };
  const pay = (method: "stablecoin" | "bank") =>
    start(async () => {
      setChoosing(false);
      setError(null);
      const r = await buyFeaturing(months, bannerImage ? { imageUrl: bannerImage, title: bannerTitle.trim() || null, ctaLabel: bannerCta.trim() || null } : undefined, tier, method);
      if ("error" in r) return setError(r.error);
      window.location.href = r.ok.checkoutUrl;
    });

  return (
    <>
      <PageHeader illo="store" title="Get featured" description="Be the first store customers see in the Sotechy app, with your own banner on Home." />
      {justPaid && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> Thanks! Your feature starts as soon as your payment is confirmed, usually within a minute or two.
        </p>
      )}

      {/* Where you stand */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <span className={`font-display font-bold ${active ? "text-good" : ""}`}>{proActive ? "Featured Pro" : active ? "Featured" : "Not featured"}</span>
        <span className="text-muted">{active
            ? [proActive && `Pro until ${fmtDate(proUntil!)}`, stdActive && `Featured until ${fmtDate(stdUntil!)}`, !proActive && !stdActive && `Featured until ${fmtDate(until!)}`].filter(Boolean).join(" · ") +
              ` (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`
            : "Your store shows in its normal place"}</span>
      </div>

      {/* The two kinds of feature, each with where it puts you on Home */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["standard", "pro"] as const).map((t) => {
          const pro = t === "pro";
          const on = tier === t;
          const left = pro ? data.proSpotsLeft : data.spotsLeft;
          const max = pro ? data.maxPro : data.maxStores;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              aria-pressed={on}
              className={`flex flex-col gap-4 rounded-3xl border p-5 text-left transition ${pro ? "bg-[#17120E] text-white" : "bg-surface"} ${on ? "border-brand ring-2 ring-brand" : pro ? "border-[#17120E]" : "border-line hover:border-faint"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="flex items-center gap-1.5 font-display text-xl font-bold">
                    {pro ? <Crown size={18} className="text-[#FDB913]" /> : <Megaphone size={18} className="text-brand" />} {pro ? "Featured Pro" : "Featured"}
                  </span>
                  <span className={`text-sm ${pro ? "text-white/70" : "text-muted"}`}>
                    <b className={pro ? "text-white" : "text-ink"}>{formatNaira(pro ? data.proPricePerMonth : data.pricePerMonth)}</b> a month
                  </span>
                </div>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-brand bg-brand text-white" : pro ? "border-white/40" : "border-line"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
              </div>
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[auto_1fr]">
                <HomeMock pro={pro} name={store.name} />
                <ul className="flex flex-col gap-2 text-[13px]">
                  {pro && (
                    <li className="flex gap-1.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-[#FDB913]" />
                      <span><b>{PRO_EXTRA.title}.</b> <span className="text-white/70">{PRO_EXTRA.text}</span></span>
                    </li>
                  )}
                  {pro && <li className="text-xs font-semibold text-white/60">Plus everything in Featured:</li>}
                  {BENEFITS.map((x) => (
                    <li key={x.title} className="flex gap-1.5">
                      <Check size={15} className={`mt-0.5 shrink-0 ${pro ? "text-[#FDB913]" : "text-good"}`} />
                      <span><b>{x.title}.</b> <span className={pro ? "text-white/70" : "text-muted"}>{x.text}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${left === 0 ? "bg-bad-soft text-bad" : pro ? "bg-white/10 text-white" : "bg-brand-soft text-brand-strong"}`}>
                {left === 0 ? `All ${max} spots taken` : `${left} of ${max} spot${max === 1 ? "" : "s"} left`}
              </span>
            </button>
          );
        })}
      </div>

      <Card
        title={(tier === "pro" ? proActive : stdActive) ? "Add more time" : "Get featured"}
        description={`${tier === "pro" ? "Featured Pro" : "Featured"} · ${(tier === "pro" ? proActive : stdActive) ? "extra months start when your current one ends." : "starts as soon as your payment is confirmed, alongside any other feature you have."}`}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((m) => (
              <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-xl border px-3 py-2 text-left transition ${months === m ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}>
                <span className="block text-sm font-semibold">
                  {m} month{m === 1 ? "" : "s"}
                </span>
                <span className="block text-xs text-muted">{formatNaira(price * m)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{tier === "pro" ? "Featured Pro" : "Featured"} until {fmtDate(newUntil)} · includes one Home banner (design it below)</p>
          {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          {!bannerImage && <p className="text-xs text-muted">No banner picture? Pay anyway: Sotechy designs your banner for you, and it goes live within 24 hours.</p>}
          <button disabled={busy || full || atLimit || !approved || uploading || (!ways.stablecoin && !ways.bank)} onClick={() => setChoosing(true)} className={btn.primary}>
            <CreditCard size={16} /> {busy ? "Opening payment…" : `Pay ${formatNaira(total)}`}
          </button>
          {!approved && <p className="text-xs text-warn">You can be featured once Sotechy approves your store.</p>}
          {full && <p className="text-xs text-warn">{tier === "pro" ? `Both Pro spots are taken. One opens when another store's Pro ends; Featured is still open.` : `All ${data.maxStores} featured spots are taken. One opens when another store's feature ends.`}</p>}
          {atLimit && <p className="text-xs text-warn">You have {data.activeFeatures} features already, the most a store can hold at a time. Buy another when one ends.</p>}
          <p className="text-xs text-muted">
            Up to {data.maxStores} stores are featured at once, {data.maxPro} of them Pro, and a store can hold {data.maxPerStore} features at a time. Paid through Money Moves; not refundable once it starts.
          </p>
        </div>
      </Card>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title={`Pay ${formatNaira(total)}`}>
        <p className="mb-4 text-sm text-muted">
          {tier === "pro" ? "Featured Pro" : "Featured"} for {months} month{months === 1 ? "" : "s"}. Choose how to pay:
        </p>
        <div className="flex flex-col gap-3">
          {[
            { id: "bank" as const, on: ways.bank, icon: Landmark, title: "Bank transfer", text: "Send the exact amount from any Nigerian bank app" },
            { id: "stablecoin" as const, on: ways.stablecoin, icon: Wallet, title: "Pay with stablecoin", text: "USDT or USDC, through Money Moves" },
          ].map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={!w.on || busy}
              onClick={() => pay(w.id)}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-ink disabled:opacity-50 disabled:hover:border-line"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <w.icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{w.title}</span>
                <span className="block text-sm text-muted">{w.on ? w.text : "Not available right now"}</span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Your feature starts as soon as the payment is confirmed. A bank transfer usually shows within a minute or two.</p>
      </Sheet>
      <Sheet open={cropping !== null} onClose={() => setCropping(null)} title="Your banner picture">
        {cropping && <ImageCropper file={cropping} spec={BANNER_SPEC} onDone={upload} onCancel={() => setCropping(null)} />}
      </Sheet>
      <Card
        className="mt-4"
        title="Your Home banner"
        description="Included with this payment: one banner at the front of the app's Home slides for the months you pay for. Upload your own, or leave it to us: without a picture, Sotechy designs one for your store and it goes live within 24 hours."
      >
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${btn.outline} cursor-pointer`}>
                  <ImagePlus size={16} /> {bannerImage ? "Change picture" : uploading ? "Uploading…" : "Upload picture"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && setCropping(e.target.files[0])} />
                </label>
                {bannerImage && (
                  <button type="button" onClick={() => setBannerImage(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-bad">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">Best at 1600 × 833 px, wide. The picture can be the whole banner: put your words in the design if you like, and leave the title empty.</p>
              <Field label="Title (optional)">
                <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} maxLength={80} placeholder="e.g. New air fryers in stock" className={inputClass} />
              </Field>
              <Field label="Button text (optional)">
                <input value={bannerCta} onChange={(e) => setBannerCta(e.target.value)} maxLength={30} placeholder="Leave empty for no button" className={inputClass} />
              </Field>
              <p className="text-xs text-muted">Tapping the banner opens your store in the app.</p>
            </div>
            <div>
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">How it looks in the app</p>
              <BannerPreview imageUrl={bannerImage} title={bannerTitle.trim()} cta={bannerCta.trim()} />
            </div>
          </div>
      </Card>

      <Card className="mt-4" title="Payments">
        {data.purchases.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {data.purchases.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {h.months} month{h.months === 1 ? "" : "s"} {h.tier === "pro" ? "Featured Pro" : "featured"}
                  </span>
                  <span className="text-sm text-muted">
                    Paid {h.paidAt ? fmtDate(h.paidAt) : ""}
                    {h.until ? ` · until ${fmtDate(h.until)}` : ""}
                  </span>
                </span>
                {h.banner?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.banner.imageUrl} alt="" className="hidden h-10 w-20 rounded-lg object-cover sm:block" />
                )}
                {h.banner && <Pill tone={BANNER_STATE[h.banner.state].tone}>{BANNER_STATE[h.banner.state].label}</Pill>}
                <span className="font-display font-bold">{formatNaira(h.amount)}</span>
                <Pill tone="good">Paid</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No payments yet.</p>
        )}
      </Card>
    </>
  );
}
