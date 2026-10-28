import type { Promotion } from "@sotechy/shared";
import { api } from "@/lib/api";
import { PromosView } from "./promos-view";

export default async function PromotionsPage() {
  return <PromosView promos={await api.get<Promotion[]>("/merchant/promotions")} />;
}
