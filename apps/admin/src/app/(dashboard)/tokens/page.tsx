import { load } from "@/lib/api";
import { ChainCards, type ChainStatus, type QueueStats } from "./chain-card";
import { TokensView, type ReserveSummary, type TokenActivity, type TokenRow } from "./tokens-view";

interface ChainResponse {
  chains: ChainStatus[];
  queue: QueueStats;
  tokens: TokenRow[];
  tokensUrl: string | null;
  activity: TokenActivity[];
  rules: { perNaira: number; crossBonus: number };
  reserve: ReserveSummary;
}

export default async function TokensPage() {
  const { data, error } = await load<ChainResponse>("/admin/chain");
  return (
    <TokensView
      chain={<ChainCards chains={data?.chains ?? []} queue={data?.queue ?? null} error={error} />}
      tokens={data?.tokens ?? []}
      tokensUrl={data?.tokensUrl ?? null}
      activity={data?.activity ?? []}
      rules={data?.rules ?? { perNaira: 1, crossBonus: 0.1 }}
      reserve={data?.reserve ?? { wallets: [], balance: 0, tokensHeld: 0, owed: 0, cover: null, recyclePool: 0, inThisMonth: 0, outThisMonth: 0, walkInFeesThisMonth: 0 }}
    />
  );
}
