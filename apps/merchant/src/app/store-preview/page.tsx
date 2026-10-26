import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StorefrontView } from "@/components/storefront-view";
import { products, store } from "@/lib/mock";
import { THEME_PRESETS } from "@/lib/themes";

export default function StorePreviewPage() {
  const theme = THEME_PRESETS.find((t) => t.id === store.themeId) ?? THEME_PRESETS[0];
  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-panel px-4 py-3 text-sm text-white">
        <Link href="/storefront" className="inline-flex items-center gap-1.5 font-semibold">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <span className="text-white/60">Preview of your storefront</span>
      </div>
      <StorefrontView
        look={{ theme, header: "cover", layout: "grid", name: store.name, tagline: store.tagline, announcement: "Free delivery in Benin City on orders over ₦100,000", logo: store.logo, cover: store.cover, ticker: store.ticker, rating: store.rating, followers: store.followers }}
        products={products}
      />
    </div>
  );
}
