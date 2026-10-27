import Link from "next/link";
import type { ReactNode } from "react";
import { getStoreSession } from "@/lib/api";
import { Illo } from "./illustrations";
import { btn } from "./ui";

/**
 * Wraps a page that only verified stores can use (adding products, walk-in sales, featuring, notifications).
 * Until Sotechy approves the store, it explains what's left instead of showing the page.
 */
export async function VerifiedOnly({ what, children }: { what: string; children: ReactNode }) {
  const { store } = await getStoreSession();
  if (store.status === "approved") return <>{children}</>;

  if (store.status === "suspended") {
    return (
      <Panel title="Your store is paused" body={`You can't ${what} while your store is paused. Email support@sotechy.shop and we'll help you sort it out.`}>
        <Link href="/" className={btn.outline}>Back to your dashboard</Link>
      </Panel>
    );
  }

  const idDone = store.kycStatus === "approved";
  return (
    <Panel
      title={`You can ${what} once you're verified`}
      body="Sotechy checks every store before it starts selling, to keep shoppers safe and your payouts secure. Finish your setup and we'll review it, usually within 1 to 2 working days. We'll email you the moment you're approved."
    >
      <ul className="flex w-full max-w-sm flex-col gap-2 text-left text-sm">
        <Check done label="Store opened" />
        <Check done={idDone} label={idDone ? "Identity verified" : "Verify your identity (ID and selfie)"} />
        <Check done={false} label="Sotechy reviews your store" />
      </ul>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href={idDone ? "/onboarding" : "/onboarding?step=you"} className={btn.dark}>Finish setup</Link>
        <Link href="/" className={btn.ghost}>Back to your dashboard</Link>
      </div>
    </Panel>
  );
}

function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-line bg-surface px-6 py-10 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
        <Illo name="shield" size={48} />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
      </div>
      {children}
    </div>
  );
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-alt px-4 py-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-good text-white" : "border-2 border-line"}`}>{done ? "✓" : ""}</span>
      <span className={done ? "text-muted line-through" : "font-semibold"}>{label}</span>
    </li>
  );
}
