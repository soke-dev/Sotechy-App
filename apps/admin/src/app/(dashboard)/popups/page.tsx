import { MessageSquareMore } from "lucide-react";
import type { Category, Popup } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { LiveSwitch, SwitchField } from "@/components/switch";
import { Card, ErrorNote, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { LivePopupPreview, PopupPreview } from "@/components/live-preview";
import { load } from "@/lib/api";
import { deletePopup, savePopup, setPopupActive } from "../actions";

/** The admin store list is flat: one object per store */
type StoreRow = { slug: string; name: string; status: string };

/** ISO → "YYYY-MM-DDTHH:mm" in Lagos time (UTC+1) for datetime-local inputs. */
const lagos = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 16) : "");

function linkLabel(p: Popup, stores: StoreRow[]) {
  if (p.linkType === "deals") return "Opens: Deals";
  if (p.linkType === "stores") return "Opens: all stores";
  if (p.linkType === "wallet") return "Opens: the wallet";
  if (p.linkType === "store") return `Opens the store: ${stores.find((s) => s.slug === p.linkValue)?.name ?? p.linkValue}`;
  if (p.linkType === "none" || !p.linkValue) return "Button only closes it";
  return `Opens ${p.linkType}: ${p.linkValue}`;
}

function state(p: Popup, now: number) {
  if (!p.isActive) return { label: "Off", tone: "neutral" as const };
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: "Ended", tone: "warn" as const };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: "Starts later", tone: "info" as const };
  return { label: "Showing", tone: "good" as const };
}

function PopupFields({ popup, categories, stores }: { popup?: Popup; categories: Category[]; stores: StoreRow[] }) {
  return (
    // Preview beside the fields on a wide form, under them in a narrow card
    <div className="@container w-full">
      <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 @lg:grid-cols-2">
          {popup && <input type="hidden" name="id" value={popup.id} />}
          <Field label="Kind of pop-up">
            <select name="layout" defaultValue={popup?.layout ?? "art"} className={inputClass}>
              <option value="art">Designed: Sotechy colours, title, words and a picture</option>
              <option value="image">Just a picture, with the buttons on it</option>
            </select>
          </Field>
          <Field label="Picture" hint="A picture pop-up: portrait, about 1080 × 1350 px (keep words away from the bottom, where the buttons sit). A designed one: a square photo, shown as a tilted sticker.">
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
            {popup?.imageUrl && (
              <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                <input type="hidden" name="imageUrl" value={popup.imageUrl} />
                <label>
                  <input type="checkbox" name="removeImage" /> Remove current picture
                </label>
              </span>
            )}
          </Field>
          <Field label="Title (designed pop-ups)">
            <input name="title" maxLength={60} defaultValue={popup?.title ?? ""} placeholder="We're all ears!" className={inputClass} />
          </Field>
          <Field label="Colour (designed pop-ups)">
            <select name="style" defaultValue={popup?.style ?? "orange"} className={inputClass}>
              <option value="orange">Sotechy orange</option>
              <option value="dark">Dark</option>
              <option value="light">Light cream</option>
            </select>
          </Field>
          <div className="@lg:col-span-2">
            <Field label="Words (designed pop-ups)">
              <textarea
                name="body"
                rows={3}
                maxLength={300}
                defaultValue={popup?.body ?? ""}
                placeholder="Tell us how we're doing and help make Sotechy even better."
                className={`${inputClass} w-full`}
              />
            </Field>
          </div>
          <Field label="Button text">
            <input name="ctaLabel" required maxLength={30} defaultValue={popup?.ctaLabel ?? "Take a look"} className={inputClass} />
          </Field>
          <Field label="Second button (empty = none)" hint="It only closes the pop-up, e.g. “Not now”.">
            <input name="dismissLabel" maxLength={20} defaultValue={popup?.dismissLabel ?? ""} placeholder="Not now" className={inputClass} />
          </Field>
          <Field label="When the button is tapped, open">
            <select name="linkType" defaultValue={popup?.linkType ?? "none"} className={inputClass}>
              <option value="none">Nothing (just close)</option>
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
            <input name="linkValue" list="popup-links" defaultValue={popup?.linkValue ?? ""} placeholder="a store or category" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts (Lagos time)">
              <input name="startsAt" type="datetime-local" defaultValue={lagos(popup?.startsAt ?? null)} className={inputClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" defaultValue={lagos(popup?.endsAt ?? null)} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <SwitchField name="showOnce" label="Show once per phone (off: every app open)" defaultChecked={popup?.showOnce ?? true} />
            <SwitchField name="isActive" label="Show in the app" defaultChecked={popup?.isActive ?? true} />
          </div>
          <datalist id="popup-links">
            {stores.map((s) => (
              <option key={`s-${s.slug}`} value={s.slug}>
                Store: {s.name}
              </option>
            ))}
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                Category: {c.name}
              </option>
            ))}
          </datalist>
        </div>
        <div className="self-start @3xl:sticky @3xl:top-4">
          <LivePopupPreview initial={popup} />
        </div>
      </div>
    </div>
  );
}

export default async function PopupsPage() {
  const [popups, categories, merchants] = await Promise.all([load<Popup[]>("/admin/popups"), load<Category[]>("/admin/categories"), load<StoreRow[]>("/admin/merchants")]);
  const cats = categories.data ?? [];
  const stores = (merchants.data ?? []).filter((m) => m.status === "approved");
  const now = Date.now();

  return (
    <>
      <PageHeader
        icon={MessageSquareMore}
        title="App pop-ups"
        description="A card over the app's Home screen: a picture with buttons, or Sotechy's own design. The newest live one a phone hasn't closed shows, one per app open."
      />
      <Card className="mb-4">
        <details>
          <summary className="cursor-pointer text-base font-semibold">+ Make a pop-up</summary>
          <div className="mt-4">
            <ActionForm action={savePopup} submitLabel="Add pop-up" className="flex flex-col items-start gap-4">
              <PopupFields categories={cats} stores={stores} />
            </ActionForm>
          </div>
        </details>
      </Card>

      <ErrorNote error={popups.error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(popups.data ?? []).map((p) => {
          const st = state(p, now);
          return (
            <Card key={p.id}>
              <div className="flex flex-col gap-2 text-sm">
                <PopupPreview popup={p} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={st.tone}>{st.label}</Pill>
                  <Pill tone="neutral">{p.layout === "image" ? "Picture" : "Designed"}</Pill>
                  <Pill tone="neutral">{p.showOnce ? "Once per phone" : "Every app open"}</Pill>
                </div>
                <p className="truncate text-xs text-muted">
                  {linkLabel(p, stores)}
                  {(p.startsAt || p.endsAt) && ` · ${p.startsAt ? lagos(p.startsAt).slice(0, 10) : "now"} → ${p.endsAt ? lagos(p.endsAt).slice(0, 10) : "no end"}`}
                </p>
                <div className="-my-2">
                  <LiveSwitch label="Showing in the app" initial={p.isActive && st.label !== "Ended"} onChange={setPopupActive.bind(null, p.id)} />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer py-2 text-sm font-medium text-ink-2">Edit</summary>
                    <div className="mt-2">
                      <ActionForm action={savePopup} submitLabel="Save pop-up" className="flex flex-col items-start gap-4">
                        <PopupFields popup={p} categories={cats} stores={stores} />
                      </ActionForm>
                    </div>
                  </details>
                  <ActionForm action={deletePopup} submitLabel="Delete" className="shrink-0">
                    <input type="hidden" name="id" value={p.id} />
                  </ActionForm>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {popups.data?.length === 0 && <p className="text-sm text-muted">No pop-ups yet.</p>}
    </>
  );
}
