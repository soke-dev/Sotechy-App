import type { ReactNode } from "react";
import { AccountProvider } from "@/components/account-context";
import { MerchantShell } from "@/components/shell";
import { api, getStoreSession } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, store } = await getStoreSession();
  const [{ waiting, offersWaiting }, { payouts }] = await Promise.all([api.merchantSummary(), api.merchantPayouts()]);
  // Money on its way to the store: payouts set up but not paid yet
  const balance = payouts.filter((p) => ["scheduled", "sending", "held", "failed"].includes(p.status)).reduce((n, p) => n + p.amount, 0);
  return (
    <MerchantShell
      store={{ name: store.name, ticker: store.tokenApprovedAt ? store.ticker : null, logo: user.avatarUrl ?? null, verified: store.status === "approved", paused: store.status === "suspended", newOrders: waiting, offersWaiting, balance }}
      user={{ name: user.fullName || (user.username ? `@${user.username}` : user.email), role: user.username ? `@${user.username} · Owner` : "Owner", avatar: user.avatarUrl ?? null }}
    >
      <AccountProvider value={{ user, store }}>{children}</AccountProvider>
    </MerchantShell>
  );
}
