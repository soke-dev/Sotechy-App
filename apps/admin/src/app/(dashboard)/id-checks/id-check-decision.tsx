"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ID_REDO_ITEMS } from "@sotechy/shared";
import { buttonClass, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { decideIdCheck } from "./actions";

const CHECKS = ["Name on the ID matches the store owner", "Selfie is the same person as the ID photo", "The ID is readable and not expired", "The video is live: they move and smile"];

/** Your own checklist, then approve, send back with what to redo, or decline with a reason. Each one emails the owner. */
export function IdCheckDecision({ id, ownerName }: { id: string; ownerName: string | null }) {
  const router = useRouter();
  const [ticked, setTicked] = useState<boolean[]>(CHECKS.map(() => false));
  const [mode, setMode] = useState<"none" | "redo" | "decline">("none");
  const [items, setItems] = useState<string[]>([]);
  const [note, setNote] = useState("");
  // The name exactly as it's printed on the ID; it becomes the name on their profile when approved
  const [idName, setIdName] = useState(ownerName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const decide = (outcome: "approve" | "redo" | "decline") =>
    start(async () => {
      setError(null);
      const r = await decideIdCheck(id, outcome, outcome === "redo" ? items : [], outcome === "approve" ? "" : note, outcome === "approve" ? idName : undefined);
      if ("error" in r) return setError(r.error);
      setMode("none");
      setItems([]);
      setNote("");
      router.refresh();
    });

  return (
    <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-surface-alt p-4">
        <p className="mb-2 text-sm font-semibold">Your checks</p>
        <div className="flex flex-col gap-2">
          {CHECKS.map((c, i) => (
            <label key={c} className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={ticked[i]} onChange={(e) => setTicked(ticked.map((t, j) => (j === i ? e.target.checked : t)))} className="h-4 w-4" />
              {i === 0 ? `Name on the ID matches the one you typed${idName.trim() ? ` (${idName.trim()})` : ""}` : c}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {mode === "none" && (
          <label className="block rounded-2xl border border-line bg-surface p-4 text-sm font-semibold">
            Name on the ID
            <span className="block text-xs font-normal text-muted">Type it as it&apos;s printed on the ID. It becomes the name on their profile, and they can&apos;t change it after.</span>
            <input value={idName} onChange={(e) => setIdName(e.target.value)} maxLength={120} placeholder="e.g. Ovie Akpo" className={`${inputClass} mt-2 w-full`} />
          </label>
        )}
        {mode === "redo" && (
          <div className="rounded-2xl bg-warn-soft p-4">
            <p className="mb-2 text-sm font-semibold">What was missed? They only redo these.</p>
            <div className="flex flex-wrap gap-2">
              {ID_REDO_ITEMS.map((x) => {
                const on = items.includes(x.code);
                return (
                  <button
                    key={x.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setItems(on ? items.filter((c) => c !== x.code) : [...items, x.code])}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "bg-panel text-white" : "border border-line bg-surface"}`}
                  >
                    {x.label}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block text-xs font-semibold text-ink-2">
              Note to the owner (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. We can't read your date of birth." className={`${inputClass} mt-1 w-full`} />
            </label>
          </div>
        )}
        {mode === "decline" && (
          <div className="rounded-2xl bg-bad-soft p-4">
            <label className="block text-sm font-semibold">
              Why is it declined? The owner sees this.
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. The ID belongs to someone else." className={`${inputClass} mt-1 w-full`} />
            </label>
          </div>
        )}
        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {mode === "none" && (
            <>
              <button type="button" disabled={busy || idName.trim().length < 3} onClick={() => decide("approve")} className={buttonClass} title={idName.trim().length < 3 ? "Enter the name on the ID first" : undefined}>
                <Check size={16} /> {busy ? "Saving…" : "Approve ID"}
              </button>
              <button type="button" disabled={busy} onClick={() => setMode("redo")} className={secondaryButtonClass}>
                Send back to redo
              </button>
              <button type="button" disabled={busy} onClick={() => setMode("decline")} className={dangerButtonClass}>
                Decline…
              </button>
            </>
          )}
          {mode === "redo" && (
            <>
              <button type="button" disabled={busy || !items.length} onClick={() => decide("redo")} className={buttonClass}>
                {busy ? "Sending…" : `Send back to redo${items.length ? ` (${items.length})` : ""}`}
              </button>
              <button type="button" disabled={busy} onClick={() => setMode("none")} className={secondaryButtonClass}>
                <X size={16} /> Cancel
              </button>
            </>
          )}
          {mode === "decline" && (
            <>
              <button type="button" disabled={busy || !note.trim()} onClick={() => decide("decline")} className={dangerButtonClass}>
                {busy ? "Saving…" : "Decline with this reason"}
              </button>
              <button type="button" disabled={busy} onClick={() => setMode("none")} className={secondaryButtonClass}>
                <X size={16} /> Cancel
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-muted">Each choice emails the owner. Approving the ID doesn&apos;t approve the store.</p>
      </div>
    </div>
  );
}
