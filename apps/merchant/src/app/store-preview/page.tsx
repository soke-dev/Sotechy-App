import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StorefrontView } from "@/components/storefront-view";
import { getStoreSession } from "@/lib/api";
import { THEME_PRESETS } from "@/lib/themes";

export default async function StorePreviewPage() {
  const { user, store } = await getStoreSession();
  const theme = THEME_PRESETS[0];
  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-panel px-4 py-3 text-sm text-white">
        <Link href="/storefront" className="inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <span className="text-white/60">Preview of your storefront</span>
      </div>
      <StorefrontView
        look={{ theme, header: "cover", layout: "grid", name: store.name, tagline: "", announcement: "", logo: user.avatarUrl ?? null, cover: null, ticker: store.ticker, rating: null, followers: 0 }}
        products={[]}
      />
    </div>
  );
}
