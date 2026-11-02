import type { ReactNode } from "react";
import { ShareStore } from "@/components/share-store";
import { StorefrontTabs } from "@/components/storefront-tabs";
import { api, getStoreSession } from "@/lib/api";

/** Storefront and the pages inside it share one menu, with a number on anything waiting */
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const [{ store }, summary] = await Promise.all([getStoreSession(), api.merchantSummary().catch(() => null)]);
  const details = store.profileChangeStatus === "pending" || store.profileChangeStatus === "declined" ? 1 : 0;
  return (
    <>
      <ShareStore slug={store.slug} name={store.name} live={store.status === "approved"} />
      <StorefrontTabs counts={{ "/store-details": details, "/reviews": summary?.reviewsToReply ?? 0 }} />
      {children}
    </>
  );
}
