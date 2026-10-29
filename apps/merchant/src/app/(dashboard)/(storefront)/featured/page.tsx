import { api } from "@/lib/api";
import { FeaturedView, type Featuring } from "./featured-view";

export default async function FeaturedPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const [data, { paid }] = await Promise.all([api.get<Featuring>("/merchant/featuring"), searchParams]);
  return <FeaturedView data={data} justPaid={paid === "1"} />;
}
