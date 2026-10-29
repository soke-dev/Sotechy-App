import { api } from "@/lib/api";
import { WalkInView, type WalkInSale } from "./walk-in-view";

export default async function WalkInPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const [sales, payMethods, { paid }] = await Promise.all([
    api.get<WalkInSale[]>("/merchant/walk-in").catch(() => [] as WalkInSale[]),
    api.get<{ stablecoin: boolean; bank: boolean }>("/merchant/walk-in/pay-methods").catch(() => ({ stablecoin: true, bank: false })),
    searchParams,
  ]);
  return <WalkInView sales={sales} paidId={paid ?? null} payMethods={payMethods} />;
}
