import type { ReactNode } from "react";
import { AccountProvider } from "@/components/account-context";
import { MerchantShell } from "@/components/shell";
import { api, getStoreSession } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, store } = await getStoreSession();
  const { waiting } = await api.merchantSummary();
  return (
    <MerchantShell
      store={{ name: store.name, ticker: store.ticker, logo: user.avatarUrl ?? null, verified: store.status === "approved", paused: store.status === "suspended", newOrders: waiting }}
      user={{ name: user.fullName || (user.username ? `@${user.username}` : user.email), role: user.username ? `@${user.username} · Owner` : "Owner", avatar: user.avatarUrl ?? null }}
    >
      <AccountProvider value={{ user, store }}>{children}</AccountProvider>
    </MerchantShell>
  );
}
