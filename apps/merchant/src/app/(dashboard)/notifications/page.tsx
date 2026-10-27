import type { MerchantNotice } from "@sotechy/shared";
import { api } from "@/lib/api";
import { NotificationsView } from "./notifications-view";

export default async function NotificationsPage() {
  const [{ followers, notices }, products] = await Promise.all([api.get<{ followers: number; notices: MerchantNotice[] }>("/merchant/notices"), api.merchantProducts()]);
  return <NotificationsView followers={followers} sent={notices} products={products} />;
}
