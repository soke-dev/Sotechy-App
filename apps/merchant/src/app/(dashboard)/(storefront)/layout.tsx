import type { ReactNode } from "react";
import { StorefrontTabs } from "@/components/storefront-tabs";
import { api, getStoreSession } from "@/lib/api";

/** Storefront and the pages inside it share one menu, with a number on anything waiting */
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const [{ store }, summary] = await Promise.all([getStoreSession(), api.merchantSummary().catch(() => null)]);
  const details = store.profileChangeStatus === "pending" || store.profileChangeStatus === "declined" ? 1 : 0;
  return (
    <>
      <StorefrontTabs counts={{ "/store-details": details, "/reviews": summary?.reviewsToReply ?? 0 }} />
      {children}
    </>
  );
}
