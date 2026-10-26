import { Images } from "lucide-react";
import type { Banner, Category } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { LiveSwitch, SwitchField } from "@/components/switch";
import { Card, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { deleteBanner, saveBanner, setBannerActive } from "../actions";

const STYLES = {
  dark: { bg: "#17120E", fg: "#FFFFFF", accent: "#FDB913", circle: "#F7931E", cta: "bg-white text-ink" },
  orange: { bg: "#F7931E", fg: "#17120E", accent: "#17120E", circle: "#FDB913", cta: "bg-ink text-white" },
  light: { bg: "#FFF1DF", fg: "#17120E", accent: "#E07F0C", circle: "#F7931E", cta: "bg-ink text-white" },
} as const;

/** ISO → "YYYY-MM-DDTHH:mm" in Lagos time (UTC+1) for datetime-local inputs. */
const lagos = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 16) : "");

function linkLabel(b: Banner) {
  if (b.linkType === "deals") return "Opens: Deals";
  if (b.linkType === "none" || !b.linkValue) return "No link";
  return `Opens ${b.linkType}: ${b.linkValue}`;
}

/** Roughly how the slide looks in the app. */
function Preview({ banner }: { banner: Banner }) {
  const s = STYLES[banner.style];
  return (
    <div className="relative flex h-40 w-full max-w-md overflow-hidden rounded-2xl" style={{ background: s.bg, color: s.fg }}>
      <div className="relative z-10 flex w-3/5 flex-col justify-between p-4">
        <div>
          {banner.eyebrow && <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.accent }}>{banner.eyebrow}</p>}
          <p className="text-lg font-extrabold leading-tight">{banner.title}</p>
          {banner.subtitle && <p className="mt-1 text-xs opacity-80">{banner.subtitle}</p>}
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${s.cta}`}>{banner.ctaLabel} →</span>
      </div>
      <div className="absolute -right-8 top-4 h-40 w-40 rounded-full" style={{ background: s.circle }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {banner.imageUrl && <img src={banner.imageUrl} alt="" className="absolute bottom-3 right-3 h-28 w-36 object-contain" />}
    </div>
  );
}

function BannerFields({ banner, categories }: { banner?: Banner; categories: Category[] }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <Field label="Small heading"><input name="eyebrow" maxLength={60} defaultValue={banner?.eyebrow ?? ""} placeholder="Home appliance week" className={inputClass} /></Field>
      <Field label="Title *"><input name="title" required maxLength={80} defaultValue={banner?.title} placeholder="Fridges, cookers & ACs" className={inputClass} /></Field>
      <Field label="Subtitle"><input name="subtitle" maxLength={140} defaultValue={banner?.subtitle ?? ""} placeholder="Up to 15% off selected items" className={inputClass} /></Field>
      <Field label="Button text"><input name="ctaLabel" maxLength={30} defaultValue={banner?.ctaLabel ?? "Shop now"} className={inputClass} /></Field>
      <Field label="Colour">
        <select name="style" defaultValue={banner?.style ?? "dark"} className={inputClass}>
          <option value="dark">Dark with orange circle</option>
          <option value="orange">Sotechy orange</option>
          <option value="light">Light cream</option>
        </select>
      </Field>
      <Field label="When tapped, open">
        <select name="linkType" defaultValue={banner?.linkType ?? "none"} className={inputClass}>
          <option value="none">Nothing</option>
          <option value="category">A category (choose below)</option>
          <option value="product">A product (its slug below)</option>
          <option value="deals">Deals</option>
          <option value="url">A web link (https://…)</option>
        </select>
      </Field>
      <Field label="Category, product slug or link">
        <input name="linkValue" list="banner-links" defaultValue={banner?.linkValue ?? ""} placeholder="home-appliances" className={inputClass} />
      </Field>
      <Field label="Order (lower shows first)"><input name="sortOrder" type="number" defaultValue={banner?.sortOrder ?? 0} className={inputClass} /></Field>
      <Field label="Picture (PNG with a clear background looks best)">
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
        {banner?.imageUrl && (
          <span className="mt-1 flex items-center gap-2 text-xs text-muted">
            <input type="hidden" name="imageUrl" value={banner.imageUrl} />
            <label><input type="checkbox" name="removeImage" /> Remove current picture</label>
          </span>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts (Lagos time)"><input name="startsAt" type="datetime-local" defaultValue={lagos(banner?.startsAt ?? null)} className={inputClass} /></Field>
        <Field label="Ends"><input name="endsAt" type="datetime-local" defaultValue={lagos(banner?.endsAt ?? null)} className={inputClass} /></Field>
      </div>
      <SwitchField name="isActive" label="Show in the app" defaultChecked={banner?.isActive ?? true} />
      <datalist id="banner-links">
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </datalist>
    </div>
  );
}

export default async function BannersPage() {
  const [banners, categories] = await Promise.all([load<Banner[]>("/admin/banners"), load<Category[]>("/admin/categories")]);
  const cats = categories.data ?? [];

  return (
    <>
      <PageHeader icon={Images} title="Home banners" description="The sliding banners at the top of the app's Home screen. With none switched on, the app shows its built-in banners." />
      <Card title="Add a banner" className="mb-4">
        <ActionForm action={saveBanner} submitLabel="Add banner" className="flex flex-col items-start gap-4">
          <BannerFields categories={cats} />
        </ActionForm>
      </Card>

      <ErrorNote error={banners.error} />
      <div className="flex flex-col gap-4">
        {(banners.data ?? []).map((b) => (
          <Card key={b.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <Preview banner={b} />
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <p className="text-muted">{linkLabel(b)} · order {b.sortOrder}</p>
                {(b.startsAt || b.endsAt) && <p className="text-muted">Runs {b.startsAt ? lagos(b.startsAt).replace("T", " ") : "now"} → {b.endsAt ? lagos(b.endsAt).replace("T", " ") : "no end"}</p>}
                <div className="max-w-xs">
                  <LiveSwitch label="Showing in the app" initial={b.isActive} onChange={setBannerActive.bind(null, b.id)} />
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium text-ink-2">Edit</summary>
                  <div className="mt-3">
                    <ActionForm action={saveBanner} submitLabel="Save banner" className="flex flex-col items-start gap-4">
                      <BannerFields banner={b} categories={cats} />
                    </ActionForm>
                  </div>
                </details>
                <ActionForm action={deleteBanner} submitLabel="Delete banner" className="mt-2">
                  <input type="hidden" name="id" value={b.id} />
                </ActionForm>
              </div>
            </div>
          </Card>
        ))}
        {banners.data?.length === 0 && <p className="text-sm text-muted">No banners yet: the app is showing its built-in ones.</p>}
      </div>
    </>
  );
}
