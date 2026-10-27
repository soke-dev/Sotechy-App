import { load } from "@/lib/api";
import { ChainCards, type ChainStatus } from "./chain-card";
import { TokensView } from "./tokens-view";

export default async function TokensPage() {
  const { data, error } = await load<{ chains: ChainStatus[]; lowGas: number }>("/admin/chain");
  return <TokensView chain={<ChainCards chains={data?.chains ?? []} lowGas={data?.lowGas ?? 2} error={error} />} />;
}
