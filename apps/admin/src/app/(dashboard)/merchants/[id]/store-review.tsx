"use client";

import { ArrowLeft, Check, ExternalLink, FileText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { formatNaira } from "@sotechy/shared";
import { CheckIcon } from "@/components/merchant-bits";
import { RelTime } from "@/components/rel-time";
import { Card, dangerButtonClass, inputClass, Pill, primaryButtonClass, secondaryButtonClass, Sheet } from "@/components/ui";
import { reviewZone, setStoreStatus } from "../actions";
import { StoreAvatar } from "../merchants-list";
import { KYC, STAGE, stageOf, type AdminStoreDetail, type AdminZone } from "../store-types";
import { usePasswordPrompt } from "@/components/password-prompt";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0 first:pt-0">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 text-right font-medium">{children ?? <span className="text-faint">—</span>}</span>
    </div>
  );
}

function Step({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm font-semibold">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${ok === true ? "bg-good-soft" : ok === false ? "bg-bad-soft" : "bg-warn-soft"}`}>
        <CheckIcon ok={ok} size={14} />
      </span>
      {label}
    </li>
  );
}

/** A private document's address on the API ("/media/private/<id>") → the admin's own viewer */
const viewer = (url: string) => {
  const id = url.split("/").pop();
  return id ? `/files/${id}` : url;
};

export function StoreReview({ store }: { store: AdminStoreDetail }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [declining, setDeclining] = useState<AdminZone | null>(null);
  const [zoneNote, setZoneNote] = useState("");

  const stage = stageOf(store);
  const kyc = KYC[store.kycStatus];
  const k = store.kycResult;
  const app = store.application;
  const docs = Object.entries(app?.documents ?? {});
  const run = (fn: () => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if ("error" in r) setError(r.error || null);
      else {
        after?.();
        router.refresh();
      }
    });
  // Opening, suspending or reinstating a store needs the admin's password
  const { ask, prompt } = usePasswordPrompt();
  const confirmStatus = async (status: "approved" | "suspended", note?: string): Promise<{ ok: true } | { error: string }> => {
    const title = status === "suspended" ? `Suspend ${store.name}?` : store.status === "suspended" ? `Reinstate ${store.name}?` : `Approve ${store.name} and go live?`;
    const detail =
      status === "approved" && store.status === "pending"
        ? `Its token $${store.ticker} is created with this ticker, and the store can start selling.`
        : status === "suspended"
          ? "Its storefront closes straight away and it can't take orders."
          : "Its storefront opens again.";
    const password = await ask(title, detail);
    return password ? setStoreStatus(store.id, status, password, note) : { error: "" };
  };

  return (
    <>
      <Link href="/merchants" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> All merchants
      </Link>

      <section className="relative mb-4 overflow-hidden rounded-[28px] bg-panel p-6 text-white sm:p-8">
        <p aria-hidden className="font-display pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none text-[96px] font-extrabold leading-none text-white/[0.06] sm:text-[140px]">
          ${store.ticker}
        </p>
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <StoreAvatar name={store.name} logo={store.logoUrl} size={64} dark />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold sm:text-3xl">
                {store.name}
                <Pill tone={STAGE[stage].tone}>{STAGE[stage].label}</Pill>
              </h1>
              <p className="mt-1 text-sm text-white/65">
                @{store.slug} · {store.sellerKind === "registered" ? "Registered business" : "Individual"} · opened <RelTime iso={store.createdAt} />
                {store.submittedAt && (
                  <>
                    {" "}· submitted <RelTime iso={store.submittedAt} />
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {store.status === "pending" && (
              <button
                disabled={busy}
                onClick={() => run(() => confirmStatus("approved"))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-40"
              >
                <Check size={16} /> {busy ? "Saving…" : "Approve and go live"}
              </button>
            )}
            {store.status === "approved" && (
              <button onClick={() => setSuspending(true)} className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-[#ffb4aa] hover:bg-white/15">
                Suspend store
              </button>
            )}
            {store.status === "suspended" && (
              <button disabled={busy} onClick={() => run(() => confirmStatus("approved"))} className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">
                Reinstate store
              </button>
            )}
          </div>
        </div>
        {store.status === "pending" && !store.submittedAt && (
          <p className="relative mt-4 text-xs text-white/55">They haven&apos;t submitted their setup yet, so some details may be missing.</p>
        )}
      </section>

      {prompt}
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <ul className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-surface px-5 py-4">
        <Step ok={kyc.ok} label={kyc.label} />
        <Step ok={app?.bank ? true : null} label={app?.bank ? "Payout account added" : "No payout account yet"} />
        <Step ok={store.sellerKind === "individual" ? true : docs.length ? true : null} label={store.sellerKind === "individual" ? "No business documents needed" : `${docs.length} document${docs.length === 1 ? "" : "s"} uploaded`} />
        <Step ok={store.status === "approved" ? true : null} label={store.status === "approved" ? "Live" : "Not live yet"} />
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Identity check" description="The owner's ID and live selfie, checked by Didit. Sotechy keeps the result, not the photos.">
            {k ? (
              <div>
                <Row label="Result">
                  <Pill tone={kyc.ok ? "good" : kyc.ok === false ? "bad" : "warn"}>{k.diditStatus}</Pill>
                </Row>
                <Row label="Name on the ID">{k.fullName}</Row>
                <Row label="Date of birth">{k.dateOfBirth}</Row>
                <Row label="Document">{[k.documentType, k.issuingCountry, k.documentNumberEnding && `ending ${k.documentNumberEnding}`].filter(Boolean).join(" · ") || null}</Row>
                <Row label="Document check">{k.documentStatus}</Row>
                <Row label="Liveness">{k.livenessStatus ? `${k.livenessStatus}${k.livenessScore != null ? ` (${k.livenessScore})` : ""}` : null}</Row>
                <Row label="Face match">{k.faceMatchStatus ? `${k.faceMatchStatus}${k.faceMatchScore != null ? ` (${k.faceMatchScore})` : ""}` : null}</Row>
                {!!k.warnings?.length && <p className="mt-3 rounded-2xl bg-warn-soft px-3 py-2 text-sm text-warn">{k.warnings.join(" · ")}</p>}
                {store.kycUpdatedAt && (
                  <p className="mt-3 text-xs text-muted">
                    Updated <RelTime iso={store.kycUpdatedAt} />
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">{kyc.label}. Results show here once Didit has checked them.</p>
            )}
          </Card>

          {store.sellerKind === "registered" && (
            <Card title="Business">
              <Row label="Registered name">{app?.registeredName}</Row>
              <Row label="Type">{app?.structure}</Row>
              <Row label="Registration number">{app?.registrationNumber}</Row>
              <Row label="Registered on">{app?.registeredOn}</Row>
              <Row label="TIN">{app?.tin}</Row>
              <Row label="Address">{app?.businessAddress}</Row>
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm font-semibold">Documents</p>
                {docs.length ? (
                  docs.map(([name, url]) => (
                    <a key={name} href={viewer(url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm hover:bg-surface-alt">
                      <FileText size={18} className="text-muted" />
                      <span className="flex-1 font-semibold">{name}</span>
                      <ExternalLink size={15} className="text-faint" />
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted">Nothing uploaded yet.</p>
                )}
              </div>
              {!!app?.people?.length && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold">Directors and owners</p>
                  {app.people.map((p) => (
                    <Row key={p.name} label={p.role}>
                      {p.name}
                      {p.share ? ` · ${p.share}%` : ""}
                    </Row>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card title="Delivery areas" description="Approve an area once you're sure they can really deliver there. Customers only see approved areas.">
            {store.zones.length === 0 ? (
              <p className="text-sm text-muted">No delivery areas yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {store.zones.map((z) => (
                  <li key={z.id} className="rounded-2xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{z.areas.length ? `${z.areas.join(", ")} (${z.state})` : `All of ${z.state}`}</p>
                        <p className="text-sm text-muted">
                          Home {z.homeFee ? formatNaira(z.homeFee) : "free"}
                          {z.pickupPoint ? ` · pickup ${z.pickupFee ? formatNaira(z.pickupFee) : "free"} at ${z.pickupPoint}` : ""} · {z.days}
                          {z.freeOver ? ` · free over ${formatNaira(z.freeOver)}` : ""}
                        </p>
                        {z.review === "declined" && z.reviewNote && <p className="mt-1 text-sm text-bad">{z.reviewNote}</p>}
                      </div>
                      <Pill tone={z.review === "approved" ? "good" : z.review === "declined" ? "bad" : "warn"}>{z.review === "pending" ? "Waiting" : z.review === "approved" ? "Approved" : "Declined"}</Pill>
                    </div>
                    {z.review !== "approved" && (
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy} onClick={() => run(() => reviewZone(store.id, z.id, "approved"))} className={primaryButtonClass}>
                          <Check size={15} /> Approve
                        </button>
                        {z.review === "pending" && (
                          <button disabled={busy} onClick={() => setDeclining(z)} className={secondaryButtonClass}>
                            <X size={15} /> Decline
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Owner">
            <Row label="Name">{store.owner?.name}</Row>
            <Row label="Email">{store.owner?.email}</Row>
            <Row label="Username">{store.owner?.username ? `@${store.owner.username}` : null}</Row>
            <Row label="Phone">{store.owner?.phone}</Row>
            <Row label="Order phone">{store.contactPhone}</Row>
            <Row label="WhatsApp alerts">{store.contactWhatsapp ?? store.contactPhone}</Row>
          </Card>
          <Card title="Store">
            <Row label="Token ticker">{`$${store.ticker}`}{!store.tokenApprovedAt && <span className="block text-xs font-normal text-muted">{store.application?.tickerChosen ? "Chosen by the store · fixed when you approve" : "Not chosen yet"}</span>}</Row>
            <Row label="Sells">{store.sells.length ? store.sells.join(", ") : null}</Row>
            {store.sellerKind === "individual" && <Row label="Business address">{store.application?.businessAddress}</Row>}
            <Row label="Website">{store.application?.website ? <a href={/^https?:/.test(store.application.website) ? store.application.website : `https://${store.application.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-strong hover:underline">{store.application.website}</a> : null}</Row>
            <Row label="Socials">
              {store.application?.socials && Object.values(store.application.socials).some(Boolean)
                ? [
                    store.application.socials.instagram && `IG @${store.application.socials.instagram}`,
                    store.application.socials.x && `X @${store.application.socials.x}`,
                    store.application.socials.tiktok && `TikTok @${store.application.socials.tiktok}`,
                    store.application.socials.facebook && `FB ${store.application.socials.facebook}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null}
            </Row>
            {store.application?.description && <p className="mt-2 whitespace-pre-line border-t border-line pt-3 text-sm text-ink-2">{store.application.description}</p>}
            <Row label="Products">{store.products}</Row>
            <Row label="Orders">{store.orders}</Row>
            <Row label="Sales">{formatNaira(store.sales)}</Row>
          </Card>
          <Card title="Payout account">
            {app?.bank ? (
              <>
                <Row label="Bank">{app.bank.bankName}</Row>
                <Row label="Account number">{app.bank.accountNumber}</Row>
                <p className="mt-3 text-xs text-muted">
                  Check the account name matches {store.sellerKind === "registered" ? `${app.registeredName ?? "the business"} or ` : ""}
                  {k?.fullName ?? "the owner's ID"} before the first payout.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Not added yet.</p>
            )}
          </Card>
        </div>
      </div>

      <Sheet open={suspending} onClose={() => setSuspending(false)} title="Suspend this store?">
        <p className="mb-3 text-sm text-ink-2">Their storefront closes straight away and they can&apos;t take orders.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputClass} placeholder="Why? e.g. Accepted orders and never shipped them" />
        <button
          disabled={busy || !reason.trim()}
          onClick={() =>
            run(
              () => confirmStatus("suspended", reason.trim()),
              () => setSuspending(false),
            )
          }
          className={`${dangerButtonClass} mt-4 w-full`}
        >
          Suspend store
        </button>
      </Sheet>

      <Sheet open={declining !== null} onClose={() => setDeclining(null)} title="Decline this delivery area?">
        <p className="mb-3 text-sm text-ink-2">The store sees your reason and can change the area and send it again.</p>
        <textarea value={zoneNote} onChange={(e) => setZoneNote(e.target.value)} rows={3} className={inputClass} placeholder="e.g. We couldn't confirm a courier there. Send a waybill receipt." />
        <button
          disabled={busy || !zoneNote.trim() || !declining}
          onClick={() =>
            declining &&
            run(
              () => reviewZone(store.id, declining.id, "declined", zoneNote.trim()),
              () => {
                setDeclining(null);
                setZoneNote("");
              },
            )
          }
          className={`${dangerButtonClass} mt-4 w-full`}
        >
          Decline area
        </button>
      </Sheet>
    </>
  );
}
