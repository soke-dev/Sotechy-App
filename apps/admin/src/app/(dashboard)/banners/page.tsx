import { Images } from "lucide-react";
import type { Banner, Category } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { LiveSwitch, SwitchField } from "@/components/switch";
import { Card, ErrorNote, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { load } from "@/lib/api";
import { deleteBanner, saveBanner, setBannerActive } from "../actions";

type AdminBanner = Banner & { storeName?: string | null };
/** The admin store list is flat: one object per store */
type StoreRow = { slug: string; name: string; status: string };

const STYLES = {
  dark: { bg: "#17120E", fg: "#FFFFFF", accent: "#FDB913", circle: "#F7931E", cta: "bg-white text-ink" },
  orange: { bg: "#F7931E", fg: "#17120E", accent: "#17120E", circle: "#FDB913", cta: "bg-ink text-white" },
  light: { bg: "#FFF1DF", fg: "#17120E", accent: "#E07F0C", circle: "#F7931E", cta: "bg-ink text-white" },
} as const;

/** ISO → "YYYY-MM-DDTHH:mm" in Lagos time (UTC+1) for datetime-local inputs. */
const lagos = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 16) : "");

function linkLabel(b: Banner, stores: StoreRow[]) {
  if (b.linkType === "deals") return "Opens: Deals";
  if (b.linkType === "stores") return "Opens: all stores";
  if (b.linkType === "wallet") return "Opens: the wallet";
  if (b.linkType === "store") return `Opens the store: ${stores.find((s) => s.slug === b.linkValue)?.name ?? b.linkValue}`;
  if (b.linkType === "none" || !b.linkValue) return "No link";
  return `Opens ${b.linkType}: ${b.linkValue}`;
}

/** Where it stands: showing now, waiting to start, or switched off (a store's banner switches off when its feature ends) */
function state(b: Banner, now: number) {
  if (!b.isActive) return { label: "Off", tone: "neutral" as const };
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: b.merchantId ? "Feature ended" : "Ended", tone: "warn" as const };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: "Starts later", tone: "info" as const };
  return { label: "Showing", tone: "good" as const };
}

/** Roughly how the slide looks in the app */
function Preview({ banner }: { banner: Banner }) {
  const s = STYLES[banner.style];
  if (banner.layout === "image" && banner.imageUrl)
    return (
      <div className="relative aspect-[1/0.52] w-full overflow-hidden rounded-xl bg-surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {(banner.title || banner.ctaLabel) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            {banner.title && <p className="text-sm font-extrabold leading-tight">{banner.title}</p>}
            {banner.ctaLabel && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink">{banner.ctaLabel} →</span>}
          </div>
        )}
      </div>
    );
  return (
    <div className="relative flex aspect-[1/0.52] w-full overflow-hidden rounded-xl" style={{ background: s.bg, color: s.fg }}>
      <div className="relative z-10 flex w-3/5 flex-col justify-between p-3">
        <div>
          {banner.eyebrow && <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.accent }}>{banner.eyebrow}</p>}
          {banner.title && <p className="text-sm font-extrabold leading-tight">{banner.title}</p>}
          {banner.subtitle && <p className="mt-0.5 text-[10px] opacity-80">{banner.subtitle}</p>}
        </div>
        {banner.ctaLabel && <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cta}`}>{banner.ctaLabel} →</span>}
      </div>
      <div className="absolute -right-[8%] top-[10%] aspect-square h-[80%] rounded-full" style={{ background: s.circle }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {banner.imageUrl && <img src={banner.imageUrl} alt="" className="absolute bottom-[6%] right-[4%] h-[60%] w-[40%] object-contain" />}
    </div>
  );
}

function BannerFields({ banner, categories, stores }: { banner?: Banner; categories: Category[]; stores: StoreRow[] }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field label="Kind of banner">
        <select name="layout" defaultValue={banner?.layout ?? "art"} className={inputClass}>
          <option value="art">Designed: colours, words and a picture</option>
          <option value="image">Just an image (words and button optional)</option>
        </select>
      </Field>
      <Field label="Picture" hint="For an image-only banner, use a wide picture about 1600 × 830 px.">
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
        {banner?.imageUrl && (
          <span className="mt-1 flex items-center gap-2 text-xs text-muted">
            <input type="hidden" name="imageUrl" value={banner.imageUrl} />
            <label><input type="checkbox" name="removeImage" /> Remove current picture</label>
          </span>
        )}
      </Field>
      <Field label="Title (optional on an image banner)"><input name="title" maxLength={80} defaultValue={banner?.title ?? ""} placeholder="Fridges, cookers & ACs" className={inputClass} /></Field>
      <Field label="Button text (empty = no button)"><input name="ctaLabel" maxLength={30} defaultValue={banner ? (banner.ctaLabel ?? "") : "Shop now"} className={inputClass} /></Field>
      <Field label="Small heading"><input name="eyebrow" maxLength={60} defaultValue={banner?.eyebrow ?? ""} placeholder="Home appliance week" className={inputClass} /></Field>
      <Field label="Subtitle"><input name="subtitle" maxLength={140} defaultValue={banner?.subtitle ?? ""} placeholder="Up to 15% off selected items" className={inputClass} /></Field>
      <Field label="Colour (designed banners)">
        <select name="style" defaultValue={banner?.style ?? "dark"} className={inputClass}>
          <option value="dark">Dark with orange circle</option>
          <option value="orange">Sotechy orange</option>
          <option value="light">Light cream</option>
        </select>
      </Field>
      <Field label="When tapped, open">
        <select name="linkType" defaultValue={banner?.linkType ?? "none"} className={inputClass}>
          <option value="none">Nothing</option>
          <option value="store">A store (choose below)</option>
          <option value="stores">All stores</option>
          <option value="category">A category (choose below)</option>
          <option value="product">A product (its slug below)</option>
          <option value="deals">Deals</option>
          <option value="wallet">The wallet</option>
          <option value="url">A web link (https://…)</option>
        </select>
      </Field>
      <Field label="Store, category, product slug or link">
        <input name="linkValue" list="banner-links" defaultValue={banner?.linkValue ?? ""} placeholder="a store or category" className={inputClass} />
      </Field>
      <Field label="Order (lower shows first)"><input name="sortOrder" type="number" defaultValue={banner?.sortOrder ?? 0} className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts (Lagos time)"><input name="startsAt" type="datetime-local" defaultValue={lagos(banner?.startsAt ?? null)} className={inputClass} /></Field>
        <Field label="Ends"><input name="endsAt" type="datetime-local" defaultValue={lagos(banner?.endsAt ?? null)} className={inputClass} /></Field>
      </div>
      <SwitchField name="isActive" label="Show in the app" defaultChecked={banner?.isActive ?? true} />
      <datalist id="banner-links">
        {stores.map((s) => (
          <option key={`s-${s.slug}`} value={s.slug}>Store: {s.name}</option>
        ))}
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>Category: {c.name}</option>
        ))}
      </datalist>
    </div>
  );
}

/** One banner: a small preview, where it stands, its switch, and edit / delete */
function BannerCard({ b, now, cats, stores }: { b: AdminBanner; now: number; cats: Category[]; stores: StoreRow[] }) {
  const st = state(b, now);
  return (
    <Card>
      <div className="flex flex-col gap-2 text-sm">
        <Preview banner={b} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={st.tone}>{st.label}</Pill>
          {b.storeName && <Pill tone="brand">{b.storeName}</Pill>}
          {b.layout === "image" && <Pill tone="neutral">Image</Pill>}
        </div>
        <p className="truncate text-xs text-muted">
          {linkLabel(b, stores)} · order {b.sortOrder}
          {(b.startsAt || b.endsAt) && ` · ${b.startsAt ? lagos(b.startsAt).slice(0, 10) : "now"} → ${b.endsAt ? lagos(b.endsAt).slice(0, 10) : "no end"}`}
        </p>
        <div className="-my-2">
          <LiveSwitch label="Showing in the app" initial={b.isActive && st.label !== "Feature ended" && st.label !== "Ended"} onChange={setBannerActive.bind(null, b.id)} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <details className="min-w-0 flex-1 [&[open]]:w-full">
            <summary className="cursor-pointer py-2 text-sm font-medium text-ink-2">Edit</summary>
            <div className="mt-2">
              <ActionForm action={saveBanner} submitLabel="Save banner" className="flex flex-col items-start gap-4">
                <BannerFields banner={b} categories={cats} stores={stores} />
              </ActionForm>
            </div>
          </details>
          <ActionForm action={deleteBanner} submitLabel="Delete" className="shrink-0">
            <input type="hidden" name="id" value={b.id} />
          </ActionForm>
        </div>
      </div>
    </Card>
  );
}

export default async function BannersPage() {
  const [banners, categories, merchants] = await Promise.all([load<AdminBanner[]>("/admin/banners"), load<Category[]>("/admin/categories"), load<StoreRow[]>("/admin/merchants")]);
  const cats = categories.data ?? [];
  const stores = (merchants.data ?? []).filter((m) => m.status === "approved");
  const now = Date.now();
  const all = banners.data ?? [];
  const groups = [
    { title: "Sotechy's banners", note: "Made here by the Sotechy team.", rows: all.filter((b) => !b.merchantId), empty: "None yet: the app is showing its built-in ones." },
    { title: "Stores' banners", note: "Bought with a paid feature. Each shows for its paid months, then switches off; you can switch it back on.", rows: all.filter((b) => b.merchantId), empty: "No store has bought a banner yet." },
  ];

  return (
    <>
      <PageHeader icon={Images} title="Home banners" description="The sliding banners at the top of the app's Home screen." />
      <Card className="mb-4">
        <details>
          <summary className="cursor-pointer text-base font-semibold">+ Add a banner</summary>
          <div className="mt-4">
            <ActionForm action={saveBanner} submitLabel="Add banner" className="flex flex-col items-start gap-4">
              <BannerFields categories={cats} stores={stores} />
            </ActionForm>
          </div>
        </details>
      </Card>

      <ErrorNote error={banners.error} />
      {groups.map((g) => (
        <section key={g.title} className="mb-6">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-base font-bold">
              {g.title} <span className="font-normal text-muted">({g.rows.length})</span>
            </h2>
            <p className="text-xs text-muted">{g.note}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.rows.map((b) => (
              <BannerCard key={b.id} b={b} now={now} cats={cats} stores={stores} />
            ))}
          </div>
          {g.rows.length === 0 && <p className="text-sm text-muted">{g.empty}</p>}
        </section>
      ))}
    </>
  );
}
