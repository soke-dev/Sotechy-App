import { api } from "@/lib/api";
import { DeliveryView } from "./delivery-view";

export default async function DeliveryPage() {
  return <DeliveryView zones={await api.deliveryZones()} />;
}
