import type { ReactNode } from "react";
import { MerchantShell } from "@/components/shell";
import { me, orders, store } from "@/lib/mock";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <MerchantShell
      store={{ name: store.name, ticker: store.ticker, logo: store.logo, verified: store.status === "verified", newOrders: orders.filter((o) => o.status === "new").length }}
      user={{ name: me.name, role: me.role }}
    >
      {children}
    </MerchantShell>
  );
}
