"use client";

import type { IdCheckState, KycStatus } from "@sotechy/shared";
import { idTypeLabel, redoItem } from "@sotechy/shared";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { idCheckStatus, startIdCheck } from "@/lib/session-actions";
import { FormError } from "./account-fields";
import { Illo } from "./illustrations";
import { btn } from "./ui";

const DIDIT: Record<KycStatus, { title: string; body: string; tone: string; action?: string }> = {
  not_started: { title: "Verify your identity", body: "Scan your ID (NIN slip, driver's licence, passport or voter's card) and take a quick live selfie. About 2 minutes on your phone.", tone: "bg-surface-alt", action: "Verify my identity" },
  in_progress: { title: "Waiting for your result", body: "Finish the check on Didit's page. If you closed it, you can start again.", tone: "bg-surface-alt", action: "Continue the check" },
  in_review: { title: "Being reviewed", body: "Your ID and selfie are with a reviewer. We'll email you the result, usually within a few hours.", tone: "bg-warn-soft" },
  approved: { title: "Identity verified", body: "Your ID and selfie matched.", tone: "bg-good-soft" },
  resubmit: { title: "Please try again", body: "Some photos weren't clear. Use good light, keep the whole ID in frame with no glare, and hold still for the selfie.", tone: "bg-warn-soft", action: "Try again" },
  expired: { title: "The check timed out", body: "It wasn't finished in time. Start a new one; it only takes a couple of minutes.", tone: "bg-surface-alt", action: "Start again" },
  declined: { title: "We couldn't verify your ID", body: "If you think this is a mistake, email support@sotechy.shop and we'll look at it with you.", tone: "bg-bad-soft" },
};

const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Sotechy's own check: start it, see it under verification, verified, what to redo, or declined */
function ManualCheck({ state }: { state: IdCheckState }) {
  const c = state.check;
  if (state.status === "approved") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-good-soft p-4 sm:flex-row sm:items-center">
        <Illo name="shield" size={40} />
        <div className="flex-1">
          <p className="font-semibold">Identity verified</p>
          <p className="text-sm text-muted">Your ID, selfie and smile video matched{c ? ` · ${idTypeLabel(c.idType)}` : ""}.</p>
        </div>
      </div>
    );
  }
  if (state.status === "in_review") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-warn-soft p-4">
        <div className="flex items-center gap-3">
          <Illo name="shield" size={40} />
          <div className="flex-1">
            <p className="font-semibold">Identity: under verification</p>
            {c && <p className="text-sm text-warn">Submitted {when(c.createdAt)} · {idTypeLabel(c.idType)}</p>}
          </div>
        </div>
        <p className="text-sm text-ink-2">Most checks are done within 24 hours, Monday to Sunday. We&apos;ll email you as soon as you&apos;re verified. You can carry on with the rest of your setup meanwhile.</p>
      </div>
    );
  }
  if (state.status === "declined") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-bad-soft p-4">
        <p className="font-semibold">We couldn&apos;t verify your ID</p>
        {c?.note && <p className="text-sm text-ink-2">&ldquo;{c.note}&rdquo;</p>}
        <p className="text-sm text-muted">If you think this is a mistake, email support@sotechy.shop or use live chat and we&apos;ll look at it with you.</p>
      </div>
    );
  }
  if (state.status === "resubmit" && c) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-warn-soft p-4">
        <div className="flex items-center gap-3">
          <Illo name="shield" size={40} />
          <div className="flex-1">
            <p className="font-semibold">Almost there: redo {c.redoItems.length === 1 ? "1 thing" : `${c.redoItems.length} things`}</p>
            <p className="text-sm text-warn">The rest was fine and stays as you sent it.</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {c.redoItems.map((code) => (
            <li key={code} className="rounded-xl bg-surface px-3 py-2 text-sm">
              <span className="font-semibold">{redoItem(code)?.label ?? code}</span>
              <span className="block text-muted">{redoItem(code)?.tip}</span>
            </li>
          ))}
        </ul>
        {c.note && <p className="text-sm text-ink-2">&ldquo;{c.note}&rdquo;</p>}
        <Link href="/onboarding/verify" className={`${btn.dark} self-start`}>
          Redo {c.redoItems.length === 1 ? "it" : "these"} now
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-panel p-5 text-white">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
          <Illo name="shield" size={32} />
        </span>
        <div>
          <p className="font-display text-xl font-extrabold">Verify your identity</p>
          <p className="text-sm text-white/65">About 3 minutes</p>
        </div>
      </div>
      <ol className="flex flex-col gap-2 text-sm text-white/85">
        <li>1. A photo of the front of your NIN, driver&apos;s licence or passport</li>
        <li>2. A selfie</li>
        <li>3. A 3-second video of you smiling</li>
      </ol>
      <Link href="/onboarding/verify" className={`${btn.primary} self-start`}>
        Verify my identity
      </Link>
      <p className="text-xs text-white/55">Your photos are only used to confirm it&apos;s you, and are kept private.</p>
    </div>
  );
}

/** The owner's ID check: Sotechy's own (photos reviewed by an admin), or Didit when that's switched on */
export function IdCheck({ onStatus }: { onStatus?: (status: KycStatus) => void } = {}) {
  const [state, setState] = useState<IdCheckState | null>(null);
  // Lets the setup form know when the check is done
  const report = useRef(onStatus);
  useEffect(() => {
    report.current = onStatus;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    const load = async () => {
      const r = await idCheckStatus();
      if (!live || !r) return;
      setState(r);
      report.current?.(r.status);
    };
    load();
    // While a result is on its way, keep asking
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const go = () =>
    start(async () => {
      setError(null);
      const r = await startIdCheck();
      if ("url" in r) window.location.href = r.url;
      else setError(r.error);
    });

  if (!state) return <div className="h-28 animate-pulse rounded-2xl bg-surface-alt" />;
  if (state.method === "manual") return <ManualCheck state={state} />;

  const c = DIDIT[state.status];
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center ${c.tone}`}>
        <Illo name="shield" size={40} />
        <div className="flex-1">
          <p className="font-semibold">{c.title}</p>
          <p className="text-sm text-muted">{state.available || state.status === "approved" ? c.body : "ID checks aren't switched on yet. You can finish the other steps for now."}</p>
        </div>
        {c.action && state.available && (
          <button type="button" disabled={pending} onClick={go} className={btn.dark}>
            {pending ? "Opening…" : c.action}
          </button>
        )}
      </div>
      <p className="px-1 text-xs text-muted">Checks are run by Didit. Sotechy only keeps the result and the name on your ID, never the photos.</p>
      <FormError message={error} />
    </div>
  );
}
