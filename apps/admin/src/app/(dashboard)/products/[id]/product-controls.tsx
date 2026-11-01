"use client";

// Pause (with a note the store sees), resume or delete a product
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, dangerButtonClass, inputClass, secondaryButtonClass, Sheet } from "@/components/ui";
import { deleteProduct, pauseProduct, resumeProduct } from "../../actions";

export function ProductControls({ id, name, paused, storeName }: { id: string; name: string; paused: boolean; storeName: string | null }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ error?: string } | null>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r?.error) return setError(r.error);
      after?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {paused ? (
          <button disabled={busy} onClick={() => run(() => resumeProduct(id))} className={buttonClass}>
            <PlayCircle size={16} /> Resume (back on sale)
          </button>
        ) : (
          <button disabled={busy} onClick={() => setPausing(true)} className={secondaryButtonClass}>
            <PauseCircle size={16} /> Pause
          </button>
        )}
        <button disabled={busy} onClick={() => setDeleting(true)} className={dangerButtonClass}>
          <Trash2 size={16} /> Delete
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}

      <Sheet open={pausing} onClose={() => setPausing(false)} title={`Pause ${name}?`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            It comes off sale straight away.{storeName ? ` ${storeName} sees it as paused by Sotechy, with this note and a button to contact support, and can't put it back on sale.` : ""}
          </p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder="Why? (optional) e.g. The photos don't match the product" className={`${inputClass} w-full`} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setPausing(false)} className={secondaryButtonClass}>Cancel</button>
            <button disabled={busy} onClick={() => run(() => pauseProduct(id, note.trim() || undefined), () => setPausing(false))} className={buttonClass}>
              {busy ? "Pausing…" : "Pause product"}
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet open={deleting} onClose={() => setDeleting(false)} title={`Delete ${name}?`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            It comes off sale and out of every list, and this can&apos;t be undone. If it has sold, it&apos;s kept for those orders. Only want it off sale for now? Pause it instead.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(false)} className={secondaryButtonClass}>Cancel</button>
            <button disabled={busy} onClick={() => run(() => deleteProduct(id), () => router.push("/products"))} className={dangerButtonClass}>
              {busy ? "Deleting…" : "Delete product"}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
