import { api } from "@/lib/api";
import { WalkInView, type WalkInSale } from "./walk-in-view";

export default async function WalkInPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const [sales, { paid }] = await Promise.all([api.get<WalkInSale[]>("/merchant/walk-in").catch(() => [] as WalkInSale[]), searchParams]);
  return <WalkInView sales={sales} paidId={paid ?? null} />;
}
