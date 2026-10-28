"use client";

// Paying to have the store featured: shown first on the Sotechy app's Home, in Shop and in Stores.
// The monthly price and how many stores can be featured at once are set by Sotechy.
import { ArrowRight, Check, CreditCard, ImagePlus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { IlloName } from "@/components/illustrations";
import { useAccount } from "@/components/account-context";
import { BANNER_SPEC, ImageCropper } from "@/components/image-cropper";
import { btn, Card, Field, inputClass, PageHeader, Pill, StatCard } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { buyFeaturing, uploadFiles } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

export interface Featuring {
  pricePerMonth: number;
  maxStores: number;
  spotsLeft: number;
  featuredUntil: string | null;
  purchases: {
    id: string;
    months: number;
    amount: number;
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
const BENEFITS: { illo: IlloName; title: string; text: string }[] = [
  { illo: "home", title: "Top of Home", text: "Your store leads the “Stores on Sotechy” row on the app's Home." },
  { illo: "bag", title: "First in Shop", text: "Your products lead the Shop grid and the store product rows." },
  { illo: "store", title: "First in Stores", text: "You're listed at the top of the Stores tab, with a Featured label." },
  { illo: "sparkle", title: "Featured label", text: "A gold ★ Featured tag on your store and products everywhere they appear." },
  { illo: "receipt", title: "Your own Home banner", text: "A banner you design, at the front of the app's Home slides. Tapping it opens your store." },
];
const fmtDate = (d: string | number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export function FeaturedView({ data, justPaid }: { data: Featuring; justPaid: boolean }) {
  const { store } = useAccount();
  const [months, setMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // The store's banner for this payment: one banner per feature payment
  const [withBanner, setWithBanner] = useState(true);
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
  const needsImage = withBanner && !bannerImage;
  const [now] = useState(() => Date.now());
  const until = data.featuredUntil ? new Date(data.featuredUntil).getTime() : null;
  const active = until !== null && until > now;
  const daysLeft = active ? Math.ceil((until! - now) / DAY) : 0;
  const total = data.pricePerMonth * months;
  const newUntil = (active ? until! : now) + months * 30 * DAY;
  const full = !active && data.spotsLeft === 0;
  const approved = store.status === "approved";

  const pay = () =>
    start(async () => {
      setError(null);
      const r = await buyFeaturing(months, withBanner && bannerImage ? { imageUrl: bannerImage, title: bannerTitle.trim() || null, ctaLabel: bannerCta.trim() || null } : undefined);
      if ("error" in r) return setError(r.error);
      window.location.href = r.ok.checkoutUrl;
    });

  return (
    <>
      <PageHeader illo="sparkle" title="Get featured" description="Pay to be shown first in the Sotechy app: on Home, in Shop and in the Stores tab, with a Featured label." />
      {justPaid && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> Thanks! Your feature starts as soon as Money Moves confirms the payment, usually within a minute.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="sparkle" label="Status" value={active ? "Featured" : "Not featured"} hint={active ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left, until ${fmtDate(until!)}` : "Shown in normal order"} />
        <StatCard illo="wallet" label="Price a month" value={formatNaira(data.pricePerMonth)} hint="Set by Sotechy" />
        <StatCard illo="store" label="Spots left" value={`${data.spotsLeft} of ${data.maxStores}`} hint="Stores featured at once" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title={active ? "Add more time" : "Feature your store"} description={active ? "Extra months start when your current feature ends." : "Starts as soon as your payment is confirmed."}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-2xl border p-3 text-left transition ${months === m ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}>
                  <span className="block font-semibold">
                    {m} month{m === 1 ? "" : "s"}
                  </span>
                  <span className="block text-sm text-muted">{formatNaira(data.pricePerMonth * m)}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">Featured until {fmtDate(newUntil)}</p>
            {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            {needsImage && <p className="text-xs text-warn">Add your banner picture below, or switch the banner off.</p>}
            <button disabled={busy || full || !approved || needsImage || uploading} onClick={pay} className={btn.primary}>
              <CreditCard size={16} /> {busy ? "Opening payment…" : `Pay ${formatNaira(total)}`}
            </button>
            {!approved && <p className="text-xs text-warn">You can be featured once Sotechy approves your store.</p>}
            {full && <p className="text-xs text-warn">All featured spots are taken right now. A spot opens when another store&apos;s feature ends.</p>}
            <p className="text-xs text-muted">Paid securely through Money Moves. Not refundable once it starts.</p>
          </div>
        </Card>

        <Card title="What you get">
          <ul className="flex flex-col gap-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <Check size={18} className="mt-0.5 shrink-0 text-good" />
                <span>
                  <span className="block font-semibold">{b.title}</span>
                  <span className="block text-sm text-muted">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Sheet open={cropping !== null} onClose={() => setCropping(null)} title="Your banner picture">
        {cropping && <ImageCropper file={cropping} spec={BANNER_SPEC} onDone={upload} onCancel={() => setCropping(null)} />}
      </Sheet>
      <Card
        className="mt-6"
        title="Your Home banner"
        description="Included with this payment: one banner, shown at the front of the app's Home slides for the months you pay for, then it switches off. Want another banner? That's another feature payment."
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={withBanner} onChange={(e) => setWithBanner(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" /> Add a banner
          </label>
        }
      >
        {withBanner ? (
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
        ) : (
          <p className="text-sm text-muted">No banner this time. Your store is still featured on Home, in Shop and in Stores.</p>
        )}
      </Card>

      <Card className="mt-6" title="Payments">
        {data.purchases.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {data.purchases.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {h.months} month{h.months === 1 ? "" : "s"} featured
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
