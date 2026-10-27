import type { OfferView } from "@sotechy/shared";
import { api } from "@/lib/api";
import { OffersView } from "./offers-view";

export default async function OffersPage() {
  return <OffersView offers={await api.get<OfferView[]>("/merchant/offers")} />;
}
