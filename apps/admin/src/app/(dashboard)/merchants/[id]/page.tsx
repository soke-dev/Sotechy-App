import { notFound } from "next/navigation";
import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminStoreDetail } from "../store-types";
import { StoreReview } from "./store-review";

export default async function MerchantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await load<AdminStoreDetail>(`/admin/merchants/${id}`);
  if (!data) return error?.includes("not found") || error?.includes("Not found") ? notFound() : <ErrorNote error={error} />;
  return <StoreReview store={data} />;
}
