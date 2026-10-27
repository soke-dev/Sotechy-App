import type { ReactNode } from "react";
import { AccountProvider } from "@/components/account-context";
import { MerchantShell } from "@/components/shell";
import { getStoreSession } from "@/lib/api";
import { orders } from "@/lib/mock";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, store } = await getStoreSession();
  return (
    <MerchantShell
      store={{ name: store.name, ticker: store.ticker, logo: user.avatarUrl ?? null, verified: store.status === "approved", paused: store.status === "suspended", newOrders: orders.filter((o) => o.status === "new").length }}
      user={{ name: user.fullName || (user.username ? `@${user.username}` : user.email), role: user.username ? `@${user.username} · Owner` : "Owner", avatar: user.avatarUrl ?? null }}
    >
      <AccountProvider value={{ user, store }}>{children}</AccountProvider>
    </MerchantShell>
  );
}
