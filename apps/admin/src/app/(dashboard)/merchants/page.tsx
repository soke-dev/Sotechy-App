import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import { MerchantsList } from "./merchants-list";
import type { AdminStore } from "./store-types";

export default async function MerchantsPage() {
  const { data, error } = await load<AdminStore[]>("/admin/merchants");
  if (!data) return <ErrorNote error={error} />;
  return <MerchantsList stores={data} />;
}
