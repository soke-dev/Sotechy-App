import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import { ZonesView, type ZoneRow } from "./zones-view";

export default async function DeliveryAreasPage() {
  const { data, error } = await load<ZoneRow[]>("/admin/delivery-zones");
  if (!data) return <ErrorNote error={error} />;
  return <ZonesView zones={data} />;
}
