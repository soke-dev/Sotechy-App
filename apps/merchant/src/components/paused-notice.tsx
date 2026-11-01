// A product Sotechy paused: why (if Sotechy said), and a way to sort it out with support
import { MessageCircle, PauseCircle } from "lucide-react";

/** Sotechy's support on WhatsApp */
export const SOTECHY_WHATSAPP = "2348071473936";

export function PausedNotice({ product, note, store }: { product: string; note?: string | null; store: string }) {
  const href = `https://wa.me/${SOTECHY_WHATSAPP}?text=${encodeURIComponent(`Hi Sotechy, my product "${product}" at ${store} was paused. Can you help me get it back on sale?`)}`;
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3">
      <PauseCircle size={22} className="mt-0.5 shrink-0 text-bad" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-bad">Paused by Sotechy</p>
        <p className="text-sm text-ink-2">{note ? note : "Sotechy took this product off sale."} You can still edit it, but it stays off sale until Sotechy resumes it.</p>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-inverse px-4 text-sm font-semibold text-on-inverse hover:opacity-90">
        <MessageCircle size={16} /> Contact support
      </a>
    </div>
  );
}
