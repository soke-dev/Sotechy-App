"use client";

// The store's name, about line, what it sells, socials and website. Changes go to Sotechy for approval: the
// app keeps showing the current details until they're approved, and a declined request shows Sotechy's reason.
import { Clock, Pencil, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StoreProfileChange } from "@sotechy/shared";
import { useAccount } from "@/components/account-context";
import { SellsPicker } from "@/components/sells-picker";
import { btn, Field, inputClass } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { sendProfileChange, withdrawProfileChange } from "@/lib/market-actions";

const SOCIALS = [
  { key: "instagram", label: "Instagram", placeholder: "@yourstore" },
  { key: "x", label: "X", placeholder: "@yourstore" },
  { key: "facebook", label: "Facebook", placeholder: "Page name or link" },
  { key: "tiktok", label: "TikTok", placeholder: "@yourstore" },
] as const;

export function StoreDetails() {
  const { store } = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const current: StoreProfileChange = {
    name: store.name,
    tagline: store.tagline ?? null,
    sells: store.sells ?? [],
    socials: store.application?.socials ?? {},
    website: store.application?.website ?? null,
  };
  const waiting = store.profileChangeStatus === "pending" ? store.profileChange : null;
  const declined = store.profileChangeStatus === "declined";
  // The form starts from what's waiting (or was declined), so it can be fixed and sent again
  const [form, setForm] = useState<StoreProfileChange>(store.profileChange ?? current);
  const set = (patch: Partial<StoreProfileChange>) => setForm((f) => ({ ...f, ...patch }));

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendProfileChange(form);
      if ("error" in r) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  const withdraw = () =>
    start(async () => {
      const r = await withdrawProfileChange();
      if ("error" in r) return setError(r.error);
      setForm(current);
      router.refresh();
    });

  const socials = SOCIALS.filter((s) => current.socials[s.key]).map((s) => `${s.label}: ${current.socials[s.key]}`);
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-1.5 text-sm">
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Name</dt><dd className="font-semibold">{current.name}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">About</dt><dd>{current.tagline || <span className="text-faint">Not added</span>}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Sells</dt><dd>{current.sells.join(" · ") || <span className="text-faint">Not chosen</span>}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Socials</dt><dd className="min-w-0 break-words">{socials.length ? socials.join(" · ") : <span className="text-faint">None</span>}{current.website ? ` · ${current.website}` : ""}</dd></div>
      </dl>

      {waiting && (
        <div className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">Your changes are waiting for Sotechy. Customers see the details above until they&apos;re approved.</span>
          <button onClick={withdraw} disabled={busy} className="shrink-0 font-semibold underline">Take back</button>
        </div>
      )}
      {declined && (
        <div className="flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2.5 text-sm text-bad">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            <b>Sotechy didn&apos;t approve your changes.</b> {store.profileChangeNote}
          </span>
        </div>
      )}
      {error && !open && <p className="text-sm text-bad">{error}</p>}
      <button onClick={() => setOpen(true)} className={`${btn.outline} self-start`}>
        <Pencil size={15} /> {waiting ? "Edit your request" : declined ? "Fix and send again" : "Edit store details"}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Store details">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">Sotechy checks changes before they show in the app, usually within 24 hours. Until then customers see your current details.</p>
          <Field label="Store name">
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} className={inputClass} />
          </Field>
          <Field label="About" hint="A line under your store name, and on your About page.">
            <textarea value={form.tagline ?? ""} onChange={(e) => set({ tagline: e.target.value })} maxLength={90} rows={2} placeholder="e.g. Phones and gadgets, delivered across Benin City" className={inputClass} />
          </Field>
          <Field label="What you sell" hint="Up to 3. Customers find stores by these.">
            <SellsPicker value={form.sells} onChange={(sells) => set({ sells })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <Field key={s.key} label={s.label}>
                <input value={form.socials[s.key] ?? ""} onChange={(e) => set({ socials: { ...form.socials, [s.key]: e.target.value } })} placeholder={s.placeholder} className={inputClass} />
              </Field>
            ))}
          </div>
          <Field label="Website">
            <input value={form.website ?? ""} onChange={(e) => set({ website: e.target.value })} placeholder="yourstore.com" className={inputClass} />
          </Field>
          {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className={btn.ghost}>Cancel</button>
            <button onClick={send} disabled={busy} className={btn.primary}>{busy ? "Sending…" : "Send for approval"}</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
