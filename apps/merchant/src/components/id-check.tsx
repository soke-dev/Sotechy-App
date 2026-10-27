"use client";

import type { KycStatus } from "@sotechy/shared";
import { useEffect, useRef, useState, useTransition } from "react";
import { idCheckStatus, startIdCheck } from "@/lib/session-actions";
import { FormError } from "./account-fields";
import { Illo } from "./illustrations";
import { btn } from "./ui";

const COPY: Record<KycStatus, { title: string; body: string; tone: string; action?: string }> = {
  not_started: { title: "Verify your identity", body: "Scan your ID (NIN slip, driver's licence, passport or voter's card) and take a quick live selfie. About 2 minutes on your phone.", tone: "bg-surface-alt", action: "Verify my identity" },
  in_progress: { title: "Waiting for your result", body: "Finish the check on Didit's page. If you closed it, you can start again.", tone: "bg-surface-alt", action: "Continue the check" },
  in_review: { title: "Being reviewed", body: "Your ID and selfie are with a reviewer. We'll email you the result, usually within a few hours.", tone: "bg-warn-soft" },
  approved: { title: "Identity verified", body: "Your ID and selfie matched.", tone: "bg-good-soft" },
  resubmit: { title: "Please try again", body: "Some photos weren't clear. Use good light, keep the whole ID in frame with no glare, and hold still for the selfie.", tone: "bg-warn-soft", action: "Try again" },
  expired: { title: "The check timed out", body: "It wasn't finished in time. Start a new one; it only takes a couple of minutes.", tone: "bg-surface-alt", action: "Start again" },
  declined: { title: "We couldn't verify your ID", body: "If you think this is a mistake, email support@sotechy.shop and we'll look at it with you.", tone: "bg-bad-soft" },
};

/** The owner's ID + liveness check through Didit. Shows the live status and sends them to Didit's page. */
export function IdCheck({ onStatus }: { onStatus?: (status: KycStatus) => void } = {}) {
  const [status, setStatus] = useState<KycStatus | null>(null);
  // Lets the setup form know when the check is done
  const report = useRef(onStatus);
  useEffect(() => {
    report.current = onStatus;
  });
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    const load = async () => {
      const r = await idCheckStatus();
      if (!live || !r) return;
      setStatus(r.status);
      report.current?.(r.status);
      setAvailable(r.available);
    };
    load();
    // While a result is on its way, keep asking (Didit can take a moment after the selfie)
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

  if (!status) return <div className="h-28 animate-pulse rounded-2xl bg-surface-alt" />;
  const c = COPY[status];
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center ${c.tone}`}>
        <Illo name="shield" size={40} />
        <div className="flex-1">
          <p className="font-semibold">{c.title}</p>
          <p className="text-sm text-muted">{available || status === "approved" ? c.body : "ID checks aren't switched on yet. You can finish the other steps for now."}</p>
        </div>
        {c.action && available && (
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
