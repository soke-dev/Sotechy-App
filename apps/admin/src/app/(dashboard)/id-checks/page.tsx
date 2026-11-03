import { ScanFace } from "lucide-react";
import Link from "next/link";
import { idTypeLabel, redoItem, type AdminIdCheck } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { ErrorNote, PageHeader, Pill } from "@/components/ui";
import { load } from "@/lib/api";
import { IdCheckDecision } from "./id-check-decision";

type Status = "in_review" | "resubmit" | "approved" | "declined";
const TABS: { status: Status; label: string }[] = [
  { status: "in_review", label: "Waiting" },
  { status: "resubmit", label: "Redo asked" },
  { status: "approved", label: "Verified" },
  { status: "declined", label: "Declined" },
];

/** A private file of the check (ID photo, selfie, video), streamed through the admin's own file viewer */
function Media({ id, label, kind }: { id: string | null; label: string; kind: "image" | "video" }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-surface-alt">
        {!id ? (
          <span className="text-sm text-muted">Not sent</span>
        ) : kind === "video" ? (
          <video src={`/files/${id}`} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
        ) : (
          <a href={`/files/${id}`} target="_blank" rel="noreferrer" className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/files/${id}`} alt={label} className="h-full w-full object-contain" />
          </a>
        )}
      </div>
      <figcaption className="flex flex-col gap-0.5 text-sm font-semibold">
        {label}
        {id && kind === "image" && (
          <a href={`/files/${id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-strong hover:underline">
            Open full size
          </a>
        )}
      </figcaption>
    </figure>
  );
}

export default async function IdChecksPage({ searchParams }: { searchParams: Promise<{ status?: string; id?: string }> }) {
  const sp = await searchParams;
  const status: Status = TABS.find((t) => t.status === sp.status)?.status ?? "in_review";
  const { data, error } = await load<{ checks: AdminIdCheck[]; counts: Record<Status, number> }>(`/admin/id-checks?status=${status}`);
  const checks = data?.checks ?? [];
  const selectedId = sp.id && checks.some((c) => c.id === sp.id) ? sp.id : checks[0]?.id;
  const picked = selectedId ? (await load<AdminIdCheck>(`/admin/id-checks/${selectedId}`)).data : null;

  return (
    <>
      <PageHeader
        icon={ScanFace}
        illo="shield"
        title="ID checks"
        description="Store owners verifying who they are: compare the face in the selfie and the smile video with the photo on their ID. Verifying the ID doesn't approve the store; do that in Merchants."
      />
      <ErrorNote error={error} />

      <nav aria-label="ID check status" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = data?.counts[t.status] ?? 0;
          const on = t.status === status;
          return (
            <Link
              key={t.status}
              href={`/id-checks?status=${t.status}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-panel text-white" : "border border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
            >
              {t.label} {n ? `(${n})` : ""}
            </Link>
          );
        })}
      </nav>

      {checks.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">{status === "in_review" ? "Nothing waiting. New ID checks show up here." : "None here yet."}</div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* The list */}
          <ul className="flex shrink-0 flex-col gap-2 lg:w-72">
            {checks.map((c) => {
              const on = c.id === selectedId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/id-checks?status=${status}&id=${c.id}`}
                    className={`flex flex-col gap-0.5 rounded-2xl border-2 bg-surface px-4 py-3 ${on ? "border-brand" : "border-transparent ring-1 ring-line hover:ring-ink-2"}`}
                  >
                    <span className="font-semibold">{c.ownerName ?? c.ownerEmail ?? "Store owner"}</span>
                    <span className="text-sm text-muted">
                      {c.storeName} · {idTypeLabel(c.idType)}
                      {c.attempt > 1 ? ` · try ${c.attempt}` : ""}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {status === "in_review" ? "Sent" : "Decided"} <RelTime iso={status === "in_review" ? c.createdAt : (c.reviewedAt ?? c.createdAt)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* The one being looked at */}
          {picked && (
            <section className="min-w-0 flex-1 rounded-3xl border border-line bg-surface p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-extrabold">{picked.ownerName ?? "Store owner"}</h2>
                  <p className="text-sm text-muted">
                    Owner of{" "}
                    <Link href={`/merchants/${picked.merchantId}`} className="font-semibold text-brand-strong hover:underline">
                      {picked.storeName}
                    </Link>{" "}
                    (@{picked.storeSlug}) · {[picked.ownerEmail, picked.ownerPhone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {picked.attempt > 1 && <Pill tone="warn">Try {picked.attempt}</Pill>}
                  <Pill tone="neutral">{idTypeLabel(picked.idType)}</Pill>
                  <Pill tone={picked.storeStatus === "approved" ? "good" : "neutral"}>Store {picked.storeStatus === "approved" ? "live" : picked.storeStatus}</Pill>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Media id={picked.idPhotoId} label={`${idTypeLabel(picked.idType)} (front)`} kind="image" />
                <Media id={picked.selfieId} label="Selfie" kind="image" />
                <Media id={picked.videoId} label="Smile video" kind="video" />
              </div>

              {picked.status === "in_review" ? (
                <IdCheckDecision id={picked.id} ownerName={picked.ownerName} />
              ) : (
                <div className="mt-6 rounded-2xl bg-surface-alt p-4 text-sm">
                  <p className="font-semibold">
                    {picked.status === "approved" ? "Verified" : picked.status === "resubmit" ? "Sent back to redo" : "Declined"}
                    {picked.reviewedByName ? ` by ${picked.reviewedByName}` : ""}
                    {picked.reviewedAt && (
                      <>
                        {" "}
                        · <RelTime iso={picked.reviewedAt} />
                      </>
                    )}
                  </p>
                  {picked.redoItems.length > 0 && <p className="mt-1 text-ink-2">To redo: {picked.redoItems.map((c) => redoItem(c)?.label ?? c).join(", ")}</p>}
                  {picked.note && <p className="mt-1 text-ink-2">&ldquo;{picked.note}&rdquo;</p>}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
