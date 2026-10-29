import type { ReactNode } from "react";
import { AccountProvider } from "@/components/account-context";
import { MerchantShell } from "@/components/shell";
import { api, getFeeRate, getStoreSession } from "@/lib/api";
import { FeeProvider } from "@/components/fee-context";
import { ROLE_LABEL } from "@/lib/roles";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, store, role } = await getStoreSession();
  // Not every team role can see payouts; their balance just stays hidden
  const [{ waiting, offersWaiting, reviewsToReply }, { payouts }, fee] = await Promise.all([api.merchantSummary(), api.merchantPayouts().catch(() => ({ payouts: [] })), getFeeRate()]);
  // Money on its way to the store: payouts set up but not paid yet
  const balance = payouts.filter((p) => ["scheduled", "sending", "held", "failed"].includes(p.status)).reduce((n, p) => n + p.amount, 0);
  return (
    <MerchantShell
      store={{ name: store.name, ticker: store.tokenApprovedAt ? store.ticker : null, logo: store.logoUrl ?? null, verified: store.status === "approved", paused: store.status === "suspended", review: store.reviewNote ? { note: store.reviewNote, declined: store.status === "declined" } : null, newOrders: waiting, offersWaiting, storefrontWaiting: (reviewsToReply ?? 0) + (store.profileChangeStatus ? 1 : 0), balance, access: role }}
      user={{ name: user.fullName || (user.username ? `@${user.username}` : user.email), role: user.username ? `@${user.username} · ${ROLE_LABEL[role]}` : ROLE_LABEL[role], avatar: user.avatarUrl ?? null }}
    >
      <AccountProvider value={{ user, store, role }}>
        <FeeProvider fee={fee}>{children}</FeeProvider>
      </AccountProvider>
    </MerchantShell>
  );
}
