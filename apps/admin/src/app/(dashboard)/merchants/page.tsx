import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import { MerchantsList } from "./merchants-list";
import { SetupSotechyStore } from "./setup-sotechy-store";
import type { AdminStore } from "./store-types";

export default async function MerchantsPage() {
  const { data, error } = await load<AdminStore[]>("/admin/merchants");
  if (!data) return <ErrorNote error={error} />;
  // Until Sotechy's own store exists (the one selling with $SOTECHY)
  const hasSotechy = data.some((s) => s.tokenId === 1);
  return (
    <>
      {!hasSotechy && <SetupSotechyStore />}
      <MerchantsList stores={data} />
    </>
  );
}
