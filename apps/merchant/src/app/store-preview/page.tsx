import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StorefrontView } from "@/components/storefront-view";
import { api, getStoreSession } from "@/lib/api";
import { storeTheme } from "@/lib/themes";

export default async function StorePreviewPage() {
  const { user, store } = await getStoreSession();
  const products = await api.merchantProducts();
  const sf = store.storefront;
  const theme = storeTheme(sf);
  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-panel px-4 py-3 text-sm text-white">
        <Link href="/storefront" className="inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <span className="text-white/60">Preview of your storefront</span>
      </div>
      <StorefrontView
        look={{
          theme,
          header: sf?.header ?? "cover",
          layout: sf?.layout ?? "grid",
          name: store.name,
          tagline: store.tagline ?? "",
          announcement: sf?.announcement ?? "",
          logo: store.logoUrl ?? user.avatarUrl ?? null,
          cover: store.coverUrl ?? null,
          ticker: store.ticker,
          rating: null,
          followers: 0,
        }}
        products={products}
      />
    </div>
  );
}
