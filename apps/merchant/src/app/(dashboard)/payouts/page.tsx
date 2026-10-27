import Link from "next/link";
import { Illo } from "@/components/illustrations";
import { btn, Card, PageHeader, StatCard } from "@/components/ui";
import { PayoutHistory } from "@/components/payout-history";
import { formatNaira } from "@/lib/money";
import { bank, orderMoney, orders, payouts } from "@/lib/mock";

export default function PayoutsPage() {
  const paid = payouts.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount, 0);
  const onTheWay = orders.filter((o) => ["accepted", "shipped", "delivered"].includes(o.status)).reduce((n, o) => n + orderMoney(o).second, 0);
  const payback = orders.filter((o) => o.status === "payback").reduce((n, o) => n + orderMoney(o).first, 0);

  return (
    <>
      <PageHeader illo="bank" title="Payouts" description="Sent automatically to your bank: 50% when you accept an order, 50% when the customer confirms delivery. Sotechy's 2% fee is taken first." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="wallet" label="Paid to you, last 30 days" value={formatNaira(paid)} hint={`${payouts.length} payouts`} />
        <StatCard illo="bike" label="Second halves on the way" value={formatNaira(onTheWay)} hint="Paid when customers confirm" />
        <StatCard wide illo="doc" label="To pay back" value={formatNaira(payback)} hint={payback ? "For orders you couldn't ship" : "Nothing owed"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <PayoutHistory payouts={payouts} />

        <div className="flex flex-col gap-6">
          <Card title="Paid into">
            {bank ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-alt p-4">
                <Illo name="bank" size={44} />
                <div>
                  <p className="font-semibold">{bank.accountName}</p>
                  <p className="text-sm text-muted">{bank.bankName} · ••••{bank.accountNumber.slice(-4)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-alt p-4">
                <Illo name="bank" size={44} />
                <p className="text-sm text-muted">No payout account yet. Add the bank account your money should go to.</p>
              </div>
            )}
            <Link href="/settings?tab=payout" className={`${bank ? btn.outline : btn.dark} mt-4 w-full`}>{bank ? "Change payout account" : "Add payout account"}</Link>
          </Card>

          <Card title="How you're paid">
            <ol className="flex flex-col gap-4">
              {[
                { illo: "box" as const, title: "You accept the order", body: "The first part of your share is sent straight away." },
                { illo: "bike" as const, title: "You deliver it", body: "Mark it delivered when the customer has it." },
                { illo: "heart" as const, title: "Customer confirms", body: "The second 50% is sent. If they don't respond, Sotechy reviews and confirms." },
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
