import { FilePen } from "lucide-react";
import type { StoreProfileChange } from "@sotechy/shared";
import { Card, ErrorNote, PageHeader, Pill } from "@/components/ui";
import { load } from "@/lib/api";
import { StoreChangeActions } from "./store-change-actions";

interface StoreChangeRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: "pending" | "declined";
  note: string | null;
  at: string | null;
  now: StoreProfileChange;
  change: StoreProfileChange | null;
}

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");
const socialsText = (s: StoreProfileChange["socials"]) =>
  (["instagram", "x", "facebook", "tiktok"] as const)
    .filter((k) => s[k])
    .map((k) => `${k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}: ${s[k]}`)
    .join(" · ");

/** One detail: what the app shows now beside what the store asked for, marked when it changes */
function Row({ label, now, next }: { label: string; now: string; next: string }) {
  const changed = now !== next;
  return (
    <div className={`grid gap-1 rounded-xl px-3 py-2 text-sm sm:grid-cols-[110px_1fr_1fr] sm:gap-3 ${changed ? "bg-brand-soft" : ""}`}>
      <span className="font-semibold text-ink-2">{label}</span>
      <span className={changed ? "text-muted line-through" : "text-muted"}>{now || "—"}</span>
      <span className={changed ? "font-semibold" : "text-muted"}>{next || "—"}</span>
    </div>
  );
}

export default async function StoreChangesPage() {
  const { data, error } = await load<StoreChangeRow[]>("/admin/store-changes");
  const rows = data ?? [];
  return (
    <>
      <PageHeader icon={FilePen} title="Store changes" description="Stores asking to change their name, about line, what they sell, socials or website. The app shows their current details until you approve." />
      <ErrorNote error={error} />
      <div className="flex flex-col gap-4">
        {rows.map((r) => {
          const c = r.change ?? r.now;
          return (
            <Card key={r.id}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <a href={`/merchants/${r.id}`} className="font-display text-lg font-bold hover:text-brand-strong">{r.name}</a>
                <Pill tone={r.status === "pending" ? "warn" : "neutral"}>{r.status === "pending" ? "Waiting" : "Declined"}</Pill>
                <span className="text-xs text-muted">Sent {fmt(r.at)}</span>
              </div>
              <div className="mb-1 hidden gap-3 px-3 text-[11px] font-bold uppercase tracking-wide text-muted sm:grid sm:grid-cols-[110px_1fr_1fr]">
                <span />
                <span>In the app now</span>
                <span>Asked for</span>
              </div>
              <div className="flex flex-col gap-1">
                <Row label="Name" now={r.now.name} next={c.name} />
                <Row label="About" now={r.now.tagline ?? ""} next={c.tagline ?? ""} />
                <Row label="Sells" now={r.now.sells.join(" · ")} next={c.sells.join(" · ")} />
                <Row label="Socials" now={socialsText(r.now.socials)} next={socialsText(c.socials)} />
                <Row label="Website" now={r.now.website ?? ""} next={c.website ?? ""} />
              </div>
              {r.status === "pending" ? (
                <StoreChangeActions id={r.id} />
              ) : (
                <p className="mt-3 text-sm text-muted">Declined: {r.note}</p>
              )}
            </Card>
          );
        })}
        {rows.length === 0 && !error && <p className="text-sm text-muted">No store changes waiting.</p>}
      </div>
    </>
  );
}
