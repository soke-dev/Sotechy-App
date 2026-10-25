import type { Branch, PaymentMethodConfig } from "@sotechy/shared";
import { ErrorNote, PageHeader } from "@/components/ui";
import { getCurrentUser, load } from "@/lib/api";
import type { PosSearchRow } from "@/lib/types";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const user = await getCurrentUser();
  const [branches, products, settings] = await Promise.all([
    load<Branch[]>("/admin/branches"),
    load<PosSearchRow[]>(`/admin/pos/search${user.branchId ? `?branchId=${user.branchId}` : ""}`),
    load<{ paymentMethods: PaymentMethodConfig[] }>("/admin/settings"),
  ]);
  const methods = (settings.data?.paymentMethods ?? []).filter((m) => m.isEnabled && m.inStore);

  return (
    <>
      <PageHeader title="Walk-in sale" description="Record in-store sales in the same system as online orders" />
      <ErrorNote error={branches.error ?? products.error} />
      <PosClient
        branches={(branches.data ?? []).filter((b) => b.isActive)}
        defaultBranchId={user.branchId}
        products={products.data ?? []}
        paymentMethods={methods}
      />
    </>
  );
}
