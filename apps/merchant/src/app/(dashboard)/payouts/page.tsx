import Link from "next/link";
import { Illo } from "@/components/illustrations";
import { btn, Card, PageHeader, StatCard } from "@/components/ui";
import { PayoutHistory } from "@/components/payout-history";
import { formatNaira } from "@/lib/money";
import { api, getStoreSession } from "@/lib/api";

const sum = (rows: { amount: number }[]) => rows.reduce((n, p) => n + p.amount, 0);
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export default async function PayoutsPage() {
  const [{ store }, { payouts, feeRate, finalAfterHours }] = await Promise.all([getStoreSession(), api.merchantPayouts()]);
  const monthAgo = daysAgo(30);
  const paid = payouts.filter((p) => p.status === "paid" && (p.paidAt ?? "") >= monthAgo);
  const coming = payouts.filter((p) => ["scheduled", "sending", "failed", "held"].includes(p.status));
  const owed = payouts.filter((p) => p.status === "owed");
  const fee = `${Math.round(feeRate * 1000) / 10}%`;

  return (
    <>
      <PageHeader illo="bank" title="Payouts" description={`Money for your orders is sent to your bank after Sotechy's ${fee} fee.`} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="wallet" label="Paid to you, last 30 days" value={formatNaira(sum(paid))} hint={`${paid.length} payout${paid.length === 1 ? "" : "s"}`} />
        <StatCard illo="bike" label="On the way to you" value={formatNaira(sum(coming))} hint={coming.length ? "For orders you've accepted" : "Nothing waiting"} />
        <StatCard wide illo="doc" label="To pay back" value={formatNaira(sum(owed))} hint={owed.length ? "For orders cancelled after payment" : "Nothing owed"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <PayoutHistory payouts={payouts} />

        <div className="flex flex-col gap-6">
          <Card title="Paid into">
            {store.payoutAccountNumber ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-alt p-4">
                <Illo name="bank" size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{store.payoutAccountName}</p>
                  <p className="text-sm text-muted">
                    {store.payoutBankName} · ••••{store.payoutAccountNumber.slice(-4)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-alt p-4">
                <Illo name="bank" size={44} />
                <p className="text-sm text-muted">No payout account yet. Add the bank account your money should go to.</p>
              </div>
            )}
            <Link href="/settings?tab=payout" className={`${store.payoutAccountNumber ? btn.outline : btn.dark} mt-4 w-full`}>
              {store.payoutAccountNumber ? "Change payout account" : "Add payout account"}
            </Link>
          </Card>

          <Card title="How you're paid">
            <ol className="flex flex-col gap-4">
              {[
                { illo: "box" as const, title: "You accept the order", body: "The first part of your share is sent to your bank." },
                { illo: "bike" as const, title: "You deliver it", body: "Mark it delivered when the customer has it." },
                { illo: "heart" as const, title: "The rest follows", body: `The rest of your share is sent ${finalAfterHours} hours after delivery, once there's no problem with the order.` },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                    <Illo name={s.illo} size={28} />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-panel text-[10px] font-bold text-white">{i + 1}</span>
                  </span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
