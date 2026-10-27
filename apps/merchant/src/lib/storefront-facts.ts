import type { DeliveryZone } from "@sotechy/shared";
import { api } from "@/lib/api";

const TIMES = ["Same day", "Same day – 1 day", "1–2 days", "2–3 days", "3–5 days", "5–7 days"];

/** The delivery, time and rating customers see on the store page (live areas only) */
export async function storefrontFacts(slug: string) {
  const [zones, listing] = await Promise.all([
    api.deliveryZones().catch(() => [] as DeliveryZone[]),
    api.get<{ ratingAverage: number | null; ratingCount?: number }>(`/store/stores/${encodeURIComponent(slug)}`).catch(() => null),
  ]);
  const live = zones.filter((z) => z.active && z.review === "approved");
  return {
    deliveryFrom: live.length ? Math.min(...live.map((z) => z.homeFee)) : null,
    deliveryTime: live.map((z) => z.days).sort((a, b) => TIMES.indexOf(a) - TIMES.indexOf(b))[0] ?? null,
    rating: listing?.ratingAverage ?? null,
    ratingCount: listing?.ratingCount ?? 0,
  };
}
