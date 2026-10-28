import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { ZonePage } from "../zone-page";

export default async function EditZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = (await api.deliveryZones()).find((z) => z.id === id);
  if (!zone) notFound();
  return <ZonePage zone={zone} />;
}
