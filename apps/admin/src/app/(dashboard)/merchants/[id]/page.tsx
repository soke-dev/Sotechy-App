"use client";

import { ArrowLeft, Check, Maximize2, RotateCw, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState, type ReactNode } from "react";
import { formatNaira } from "@sotechy/shared";
import { DocArt } from "@/components/doc-art";
import { CheckIcon, MerchantAvatar } from "@/components/merchant-bits";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, dangerButtonClass, inputClass, Pill, SampleBadge, Sheet } from "@/components/ui";
import { docsChecked, MERCHANT_STATUS, merchants, type DocStatus, type Merchant, type MerchantEvent, type MerchantStatus } from "@/lib/marketplace";

type Decision = "info" | "reject" | "suspend";

const DOC_STATUS: Record<DocStatus, { label: string; tone: "good" | "bad" | "neutral" }> = {
  accepted: { label: "Accepted", tone: "good" },
  rejected: { label: "Not acceptable", tone: "bad" },
  unchecked: { label: "Not checked yet", tone: "neutral" },
};

const DECISION: Record<Decision, { title: string; ask: string; placeholder: string; button: string; status: MerchantStatus; event: string }> = {
  info: { title: "Ask for more", ask: "What do they need to send? They get this by email and WhatsApp.", placeholder: "e.g. A utility bill in your own name, from the last 3 months", button: "Send request", status: "info", event: "Asked for more" },
  reject: { title: "Reject application", ask: "Why are you rejecting them? They see this.", placeholder: "e.g. We couldn't confirm the business is real", button: "Reject", status: "rejected", event: "Rejected" },
  suspend: { title: "Suspend store", ask: "Why are you suspending them? Their storefront closes straight away.", placeholder: "e.g. Accepted orders and never shipped them", button: "Suspend store", status: "suspended", event: "Suspended" },
};

function Step({ ok, label }: { ok: boolean | null; label: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm font-semibold">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${ok === true ? "bg-good-soft" : ok === false ? "bg-bad-soft" : "bg-warn-soft"}`}>
        <CheckIcon ok={ok} size={14} />
      </span>
      {label}
    </li>
  );
}

export default function MerchantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const source = merchants.find((x) => x.id === id);
  if (!source) notFound();
  return <MerchantReview key={source.id} source={source} />;
}

function MerchantReview({ source }: { source: Merchant }) {
  const [m, setM] = useState(source);
  const [docId, setDocId] = useState(source.docs.find((d) => d.status === "unchecked")?.id ?? source.docs[0]?.id);
  const [rotate, setRotate] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [docReason, setDocReason] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState(source.teamNotes ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  const doc = m.docs.find((d) => d.id === docId) ?? m.docs[0];
  const allAccepted = m.docs.every((d) => d.status === "accepted");
  const anyRejected = m.docs.some((d) => d.status === "rejected");
  const ready = allAccepted && m.idCheck.ok === true && m.payout.matches !== null;
  const waiting = m.status === "review" || m.status === "info";

  // Saves a change here and in the shared sample list, so the list shows it when you go back
  const save = (patch: Partial<Merchant>, event?: Omit<MerchantEvent, "at">, message?: string) => {
    const next = { ...m, ...patch, history: event ? [{ ...event, at: new Date().toISOString() }, ...(patch.history ?? m.history)] : (patch.history ?? m.history) };
    Object.assign(source, next);
    setM(next);
    if (message) setNotice(message);
  };
  const setDoc = (status: DocStatus, note?: string) => {
    if (!doc) return;
    save(
      { docs: m.docs.map((d) => (d.id === doc.id ? { ...d, status, note: note ?? d.note } : d)) },
      status === "unchecked" ? undefined : { text: `${status === "accepted" ? "You accepted" : "You marked not acceptable:"} the ${doc.label}${note ? ` (${note})` : ""}`, tone: status === "accepted" ? "good" : "bad" },
    );
    setRejecting(false);
    setDocReason("");
    // Move on to the next document still to check
    const nextDoc = m.docs.find((d) => d.id !== doc.id && d.status === "unchecked");
    if (status !== "unchecked" && nextDoc) {
      setDocId(nextDoc.id);
      setRotate(0);
      setZoom(1);
    }
  };

  return (
    <>
      <Link href="/merchants" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> All merchants
      </Link>

      {notice && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> {notice}
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto text-good/70 hover:text-good">
            <X size={16} />
          </button>
        </p>
      )}

      {/* Header band */}
      <section className="relative mb-4 overflow-hidden rounded-[28px] bg-panel p-6 text-white sm:p-8">
        <p aria-hidden className="font-display pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none text-[96px] font-extrabold leading-none text-white/[0.06] sm:text-[140px]">
          ${m.ticker}
        </p>
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <MerchantAvatar m={m} size={64} dark />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold sm:text-3xl">
                {m.name}
                <Pill tone={MERCHANT_STATUS[m.status].tone}>{MERCHANT_STATUS[m.status].label}</Pill>
              </h1>
              <p className="mt-1 text-sm text-white/65">
                {m.owner} · {m.kind} · {m.city} · applied <RelTime iso={m.appliedAt} />
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {waiting && (
              <>
                <button onClick={() => setDecision("reject")} className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-[#ffb4aa] hover:bg-white/15">
                  Reject
                </button>
                <button onClick={() => setDecision("info")} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-surface-alt">
                  Ask for more
                </button>
                <button
                  disabled={!ready}
                  title={ready ? undefined : "Accept every document first"}
                  onClick={() => save({ status: "verified" }, { text: "Approved and went live", tone: "good" }, `${m.name} is live. Their $${m.ticker} token is being created on Monad.`)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={16} /> Approve and go live
                </button>
              </>
            )}
            {m.status === "verified" && (
              <button onClick={() => setDecision("suspend")} className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-[#ffb4aa] hover:bg-white/15">
                Suspend store
              </button>
            )}
            {(m.status === "suspended" || m.status === "rejected") && (
              <button onClick={() => save({ status: "verified", note: undefined }, { text: m.status === "suspended" ? "Reinstated" : "Approved after all", tone: "good" }, `${m.name} is live again.`)} className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">
                {m.status === "suspended" ? "Reinstate store" : "Approve after all"}
              </button>
            )}
          </div>
        </div>
        {waiting && !ready && <p className="relative mt-4 text-xs text-white/55">Approve unlocks once every document is accepted and identity and payout match.</p>}
      </section>

      {/* Checks */}
      <ul className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-surface px-5 py-4">
        <Step ok={m.idCheck.ok} label={m.idCheck.ok ? "Identity matched" : m.idCheck.ok === false ? "Identity needs a retry" : "Checking identity"} />
        <Step ok={m.payout.matches !== null} label={m.payout.matches ? "Payout account matched" : "Payout name doesn't match"} />
        <Step ok={allAccepted ? true : anyRejected ? false : null} label={`Documents: ${docsChecked(m)} of ${m.docs.length} checked`} />
        <Step ok={m.status === "verified" ? true : null} label={m.status === "verified" ? "Live" : "Go live"} />
        <li className="ml-auto"><SampleBadge /></li>
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Documents" description={`${m.docs.length} sent · tap one to look at it`}>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {m.docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDocId(d.id);
                    setRotate(0);
                    setZoom(1);
                    setRejecting(false);
                  }}
                  className={`flex min-w-0 flex-col gap-2 rounded-2xl border-2 p-2 text-left transition ${d.id === doc?.id ? "border-brand bg-brand-soft/50" : "border-line hover:border-faint"}`}
                >
                  <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-surface-alt p-2">
                    <DocArt doc={d} m={m} />
                  </span>
                  <span className="px-1">
                    <span className="block truncate text-sm font-semibold">{d.label}</span>
                    <span className={`flex items-center gap-1 text-xs ${d.status === "accepted" ? "text-good" : d.status === "rejected" ? "text-bad" : "text-muted"}`}>
                      {d.status === "accepted" ? <Check size={12} /> : d.status === "rejected" ? <X size={12} /> : null}
                      {DOC_STATUS[d.status].label}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {doc && (
              <div className="overflow-hidden rounded-3xl bg-panel text-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
                  <p className="min-w-0 basis-full text-sm sm:flex-1 sm:basis-0">
                    <b>{doc.label}</b>
                    <span className="text-white/50">
                      {" "}
                      · {doc.file} · uploaded <RelTime iso={doc.uploadedAt} />
                    </span>
                  </p>
                  {[
                    { icon: RotateCw, label: "Rotate", run: () => setRotate((r) => (r + 90) % 360) },
                    { icon: ZoomOut, label: "Zoom out", run: () => setZoom((z) => Math.max(0.6, z - 0.2)) },
                    { icon: ZoomIn, label: "Zoom in", run: () => setZoom((z) => Math.min(2.2, z + 0.2)) },
                    { icon: Maximize2, label: "Full screen", run: () => setFull(true) },
                  ].map(({ icon: Icon, label, run }) => (
                    <button key={label} onClick={run} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white">
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="flex h-[300px] items-center justify-center overflow-hidden bg-[#0f0c09] p-6 sm:h-[400px]">
                  <div className="h-full w-full max-w-md transition-transform duration-200" style={{ transform: `rotate(${rotate}deg) scale(${zoom})` }}>
                    <DocArt doc={doc} m={m} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3">
                  {rejecting ? (
                    <>
                      <input autoFocus value={docReason} onChange={(e) => setDocReason(e.target.value)} placeholder="Why not? The merchant sees this." className="min-h-10 min-w-0 basis-full rounded-full sm:flex-1 sm:basis-0 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/40" />
                      <button onClick={() => setRejecting(false)} className="min-h-10 rounded-full px-4 text-sm font-semibold text-white/70 hover:text-white">Cancel</button>
                      <button disabled={!docReason.trim()} onClick={() => setDoc("rejected", docReason.trim())} className="min-h-10 rounded-full bg-bad px-4 text-sm font-semibold disabled:opacity-40">
                        Mark not acceptable
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="min-w-0 basis-full text-sm text-white/70 sm:flex-1 sm:basis-0">{doc.note ?? "Check the name, address and dates match the application."}</p>
                      {doc.status === "unchecked" ? (
                        <>
                          <button onClick={() => setRejecting(true)} className="min-h-10 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">Not acceptable</button>
                          <button onClick={() => setDoc("accepted")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-good px-4 text-sm font-semibold hover:brightness-110">
                            <Check size={15} /> Accept
                          </button>
                        </>
                      ) : (
                        <>
                          <Pill tone={DOC_STATUS[doc.status].tone}>{DOC_STATUS[doc.status].label}</Pill>
                          <button onClick={() => setDoc("unchecked")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/70 hover:text-white">
                            <Undo2 size={15} /> Undo
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card title="History">
            <ol className="flex flex-col">
              {m.history.map((e, i) => (
                <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < m.history.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" />}
                  <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${e.tone === "good" ? "bg-good" : e.tone === "bad" ? "bg-bad" : e.tone === "warn" ? "bg-sun" : "bg-faint"}`} />
                  <span className="min-w-0 flex-1 text-sm">{e.text}</span>
                  <span className="shrink-0 text-xs text-muted"><RelTime iso={e.at} /></span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="About">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted">Email</dt>
              <dd className="truncate text-right font-semibold">{m.email}</dd>
              <dt className="text-muted">Phone</dt>
              <dd className="text-right font-semibold">{m.phone}</dd>
              <dt className="text-muted">City</dt>
              <dd className="text-right font-semibold">{m.city}</dd>
              <dt className="text-muted">Address</dt>
              <dd className="text-right font-semibold">{m.address}</dd>
              <dt className="text-muted">Ticker</dt>
              <dd className="text-right font-semibold text-brand-strong">${m.ticker}</dd>
              <dt className="text-muted">Registration</dt>
              <dd className="text-right font-semibold">{m.regNumber ?? "None (freelancer)"}</dd>
              {m.status === "verified" && (
                <>
                  <dt className="text-muted">Sales, 30 days</dt>
                  <dd className="text-right font-semibold">{formatNaira(m.sales30d)}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card title="Payout account">
            <p className="font-semibold">{m.payout.accountName}</p>
            <p className="text-sm text-muted">
              {m.payout.bank} ••••{m.payout.last4}
            </p>
            <p className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${m.payout.matches ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
              <CheckIcon ok={m.payout.matches !== null} />
              {m.payout.matches === "business" ? "Matches the business name" : m.payout.matches === "owner" ? "Matches the owner's own name" : "Doesn't match the business or the owner"}
            </p>
          </Card>

          <Card title="Wants to deliver to">
            <div className="flex flex-wrap gap-2">
              {m.states.map((s) => (
                <Pill key={s} dot={false}>{s}</Pill>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Each area is approved separately under{" "}
              <Link href="/delivery-areas" className="font-semibold text-brand-strong hover:underline">Delivery areas</Link>.
            </p>
          </Card>

          <section className="rounded-3xl border border-sun/40 bg-warn-soft p-5">
            <h2 className="text-lg font-bold">Team notes</h2>
            <p className="mb-3 text-xs text-warn">Only the Sotechy team sees this.</p>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} w-full bg-surface`} placeholder="e.g. Called Temitope, she'll send a newer bill tomorrow." />
            <button
              disabled={notes.trim() === (m.teamNotes ?? "").trim()}
              onClick={() => save({ teamNotes: notes.trim() }, { text: "Team note updated", tone: "neutral" })}
              className={`${buttonClass} mt-3 w-full`}
            >
              Save note
            </button>
          </section>
        </div>
      </div>

      <Sheet open={decision !== null} onClose={() => setDecision(null)} title={decision ? DECISION[decision].title : ""}>
        {decision && (
          <div className="flex flex-col gap-3 text-sm">
            <p>{DECISION[decision].ask}</p>
            <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} w-full`} placeholder={DECISION[decision].placeholder} />
            <button
              disabled={!reason.trim()}
              onClick={() => {
                const d = DECISION[decision];
                save({ status: d.status, note: `${d.event}: ${reason.trim()}` }, { text: `${d.event}: ${reason.trim()}`, tone: decision === "info" ? "warn" : "bad" }, decision === "info" ? `Sent to ${m.owner} by email and WhatsApp.` : `${m.name}: ${d.event.toLowerCase()}.`);
                setDecision(null);
                setReason("");
              }}
              className={decision === "info" ? buttonClass : dangerButtonClass}
            >
              {DECISION[decision].button}
            </button>
          </div>
        )}
      </Sheet>

      {/* Full-screen document */}
      {full && doc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0c09] text-white" onClick={() => setFull(false)}>
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-semibold">{doc.label}</p>
            <button aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="h-full w-full max-w-3xl" style={{ transform: `rotate(${rotate}deg)` }}>
              <DocArt doc={doc} m={m} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
