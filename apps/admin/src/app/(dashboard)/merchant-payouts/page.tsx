import type { AdminPayoutRow, PayoutSettings } from "@sotechy/shared";
import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminStore } from "../merchants/store-types";
import { PayoutsView } from "./payouts-view";

export interface AdminPayouts {
  ready: boolean;
  /** Local stand-in: transfers aren't real */
  testMode: boolean;
  balance: number | null;
  settings: PayoutSettings;
  payouts: AdminPayoutRow[];
}

export default async function MerchantPayoutsPage() {
  const [payouts, stores] = await Promise.all([load<AdminPayouts>("/admin/payouts"), load<AdminStore[]>("/admin/merchants")]);
  if (!payouts.data) return <ErrorNote error={payouts.error ?? "Couldn't load payouts"} />;
  return <PayoutsView data={payouts.data} stores={(stores.data ?? []).filter((s) => s.status !== "pending")} />;
}
