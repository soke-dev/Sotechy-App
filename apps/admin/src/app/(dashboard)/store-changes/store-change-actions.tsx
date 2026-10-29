"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { decideStoreChange } from "../actions";

/** Approve, or decline with a reason the store sees */
export function StoreChangeActions({ id }: { id: string }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const decide = (decision: "approve" | "decline") =>
    start(async () => {
      setError(null);
      const r = await decideStoreChange(id, decision, note.trim() || undefined);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  return (
    <div className="mt-4 flex flex-col gap-2">
      {declining && (
        <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Why? The store sees this, e.g. “The name copies another brand”" className={`${inputClass} w-full`} />
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {declining ? (
          <>
            <button disabled={busy || !note.trim()} onClick={() => decide("decline")} className={buttonClass}>{busy ? "Sending…" : "Decline with this reason"}</button>
            <button disabled={busy} onClick={() => setDeclining(false)} className={secondaryButtonClass}>Cancel</button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={() => decide("approve")} className={buttonClass}>{busy ? "Saving…" : "Approve"}</button>
            <button disabled={busy} onClick={() => setDeclining(true)} className={secondaryButtonClass}>Decline</button>
          </>
        )}
      </div>
    </div>
  );
}
