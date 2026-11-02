import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, formatUsd, type CatalogProduct, type OfferView, type ProductDetail, type ProductReviews, type Review } from "@sotechy/shared";
import { useCartFeedback } from "@/components/cart-feedback";
import { Illo, type IlloName } from "@/components/illustrations";
import { ProductCard } from "@/components/product-card";
import { SupportChatModal } from "@/components/support-chat";
import { ProductImage } from "@/components/product-image";
import { ReviewSheet } from "@/components/review-sheet";
import { Stars } from "@/components/stars";
import { useToast } from "@/components/toast";
import {
  BottomBar,
  Button,
  Chip,
  discountPercent,
  Divider,
  ErrorView,
  IconButton,
  Loading,
  Pill,
  Price,
  QtyStepper,
  SectionHeader,
  tap,
  Txt,
  ui,
  type IconName,
} from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { refreshHeldTokens } from "@/lib/held-tokens";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openPolicy } from "@/lib/policies";
import { useCart } from "@/lib/cart";
import { useFeatures } from "@/lib/store-config";
import { colors, fonts, gutter, lightPalette, radius, space } from "@/lib/theme";
import { ScrollRow } from "@/components/scroll-row";
import { useOpenCart } from "@/components/cart-drawer";
import { useIsDesktop, useScreenWidth } from "@/lib/layout";
import { useAsync } from "@/lib/use-async";
import { loadStore } from "@/lib/marketplace";
import { sellerOf, useAddToCart } from "@/components/add-to-cart";

type Tab = "overview" | "about" | "reviews";

function InfoRow({ illo, title, subtitle }: { illo: IlloName; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: space.sm }}>
      <Illo name={illo} size={32} />
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

/** "Lead first +3": the first item, with a +N that opens the whole list (pickup points, delivery states) */
function ListRow({ illo, lead, items, subtitle }: { illo: IlloName; lead: string; items: string[]; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const more = items.length - 1;
  return (
    <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: space.sm }}>
      <Illo name={illo} size={32} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <Txt variant="label" style={{ flexShrink: 1 }}>{lead}{items[0]}</Txt>
          {more > 0 && (
            <Pressable
              onPress={() => {
                tap();
                setOpen(!open);
              }}
              hitSlop={6}
              accessibilityLabel={open ? "Show fewer" : `Show ${more} more`}
              style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.brandPressed }}
            >
              <Txt variant="caption" color={colors.brandPressed} style={{ fontFamily: fonts.bold }}>{open ? "Less" : `+${more}`}</Txt>
            </Pressable>
          )}
        </View>
        {open &&
          items.slice(1).map((it) => (
            <View key={it} style={{ flexDirection: "row", gap: 6 }}>
              <Txt variant="small" color={colors.brandPressed}>•</Txt>
              <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>{it}</Txt>
            </View>
          ))}
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 35) {
    const w = Math.floor(days / 7);
    return `${w} week${w > 1 ? "s" : ""} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m > 1 ? "s" : ""} ago`;
  }
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", year: "numeric" });
}

/** Segmented tabs; the Reviews tab shows the product's star rating. */
function ProductTabs({ tab, onChange, rating, count, reviews }: { tab: Tab; onChange: (t: Tab) => void; rating: number; count: number; reviews: boolean }) {
  const items: { key: Tab; label: string; sub?: string }[] = [
    { key: "overview", label: "Overview", sub: "Options & store" },
    { key: "about", label: "About & specs", sub: "Full details" },
    ...(reviews ? [{ key: "reviews" as const, label: "Reviews" }] : []),
  ];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
      {items.map((t) => {
        const active = t.key === tab;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(t.key);
            }}
            style={{
              flex: 1,
              minHeight: 54,
              paddingHorizontal: 4,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              backgroundColor: active ? colors.surface : "transparent",
              borderWidth: active ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.line,
            }}
          >
            <Txt variant="label" numberOfLines={1} color={active ? colors.ink : colors.muted} style={{ fontSize: 13 }}>
              {t.label}
            </Txt>
            {t.key === "reviews" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Stars value={rating} size={10} emptyColor={colors.faint} />
                <Txt variant="caption" style={{ fontSize: 11 }}>{count ? `${rating.toFixed(1)} (${count})` : "New"}</Txt>
              </View>
            ) : (
              <Txt variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>{t.sub}</Txt>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function OverviewTab({
  product,
  variantId,
  onVariant,
  pickupBranch,
}: {
  product: ProductDetail;
  variantId: string | undefined;
  onVariant: (id: string) => void;
  pickupBranch: string | undefined;
}) {
  const store = product.store;
  // A store's approved delivery areas and pickup locations (ones awaiting approval aren't offered yet)
  const storeInfo = useAsync(async () => (store ? loadStore(store.slug) : null), [store?.slug]);
  const areas = storeInfo.data?.areas ?? [];
  // Every pickup point in the store's areas (each area can have several), and the states it delivers to
  const points = [...new Set(areas.flatMap((a) => (a.pickupPlaces?.length ? a.pickupPlaces.map((pl) => [pl.name, pl.address].filter(Boolean).join(", ")) : a.pickupPoint ? [[a.pickupPoint, a.pickupAddress].filter(Boolean).join(", ")] : [])))];
  const states = [...new Set(areas.map((a) => a.state))];
  const known = !store || !!storeInfo.data;
  return (
    <View style={{ gap: space.lg }}>
      {store ? (
        <Pressable onPress={() => router.push(`/store/${store.slug}`)} style={({ pressed }) => [ui.card, { gap: space.md, opacity: pressed ? 0.85 : 1 }]}>
          <View style={[ui.row, { gap: space.md }]}>
            {store.logoUrl ? (
              <Image source={{ uri: store.logoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Txt variant="label" color={colors.brandPressed}>{store.name.slice(0, 2).toUpperCase()}</Txt>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Txt variant="overline">Sold by</Txt>
              <Txt variant="label" numberOfLines={1}>{store.name}</Txt>
            </View>
            {store.isOfficial ? <Pill label="Official store" tone="brand" icon="checkmark-circle" /> : <Pill label="Verified" tone="success" icon="shield-checkmark" />}
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </View>
          <Divider />
          {[
            ["shield-checkmark-outline", "Checked and verified by Sotechy"],
            ["sparkles-outline", `Earn $${store.ticker} on this order, plus 10% in $SOTECHY`],
            ["chatbubbles-outline", "Ask the store or make an offer in the app"],
          ].map(([icon, text]) => (
            <View key={text} style={[ui.row, { gap: space.sm }]}>
              <Ionicons name={icon as IconName} size={16} color={colors.success} />
              <Txt variant="small" color={colors.ink2}>{text}</Txt>
            </View>
          ))}
        </Pressable>
      ) : (
        <View style={[ui.card, { gap: space.md }]}>
          <View style={[ui.row, { gap: space.md }]}>
            <Image source={require("../../../assets/brand/sotechylogo.png")} style={{ width: 40, height: 40 }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Txt variant="overline">Sold by</Txt>
              <Txt variant="label">Sotechy Shop · Benin City</Txt>
            </View>
            <Pill label="Official store" tone="brand" icon="checkmark-circle" />
          </View>
          <Divider />
          {[
            ["shield-checkmark-outline", "Genuine products with warranty"],
            ["storefront-outline", "Inspect and pick up in store"],
            ["chatbubbles-outline", "Real people on call and WhatsApp"],
          ].map(([icon, text]) => (
            <View key={text} style={[ui.row, { gap: space.sm }]}>
              <Ionicons name={icon as IconName} size={16} color={colors.success} />
              <Txt variant="small" color={colors.ink2}>{text}</Txt>
            </View>
          ))}
        </View>
      )}

      {product.variants.length > 1 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="label">Choose an option</Txt>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {product.variants.map((v) => (
              <Chip key={v.id} label={v.name} active={v.id === variantId} onPress={() => onVariant(v.id)} />
            ))}
          </View>
        </View>
      )}

      <View style={[ui.card, { paddingVertical: space.sm }]}>
        {product.allowPickup &&
          (store ? (
            known && (
              points.length ? (
                <ListRow illo="pin" lead="Pick up at " items={points} subtitle="Choose where at checkout" />
              ) : (
                <InfoRow illo="pin" title="Pickup location" subtitle="Not available yet" />
              )
            )
          ) : (
            <InfoRow illo="pin" title={pickupBranch ? `Pick up at ${pickupBranch}` : "Pickup location"} subtitle={pickupBranch ? "Usually ready the same day" : "Currently unavailable"} />
          ))}
        {product.allowDelivery &&
          (store ? (
            known &&
            (states.length ? (
              <ListRow illo="bike" lead="Home delivery to " items={states} subtitle={`By ${store.name} · fee and timing shown at checkout`} />
            ) : (
              <InfoRow illo="bike" title={`Home delivery by ${store.name}`} subtitle="Not available yet" />
            ))
          ) : (
            <InfoRow illo="bike" title="Home delivery in Benin City" subtitle="Fee and timing shown at checkout" />
          ))}
        <InfoRow illo="shield" title={product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "No warranty listed"} subtitle={product.returnPolicy ?? undefined} />
        <InfoRow illo="wallet" title="Pay your way" subtitle="Bank transfer or stablecoin, and your tokens" />
      </View>

    </View>
  );
}

function AboutTab({ product }: { product: ProductDetail }) {
  const paragraphs = (product.description ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const highlights = product.highlights ?? [];
  const box = product.inTheBox ?? [];
  const specs = Object.entries(product.specifications);
  return (
    <View style={{ gap: space.xl }}>
      {paragraphs.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">About this item</Txt>
          {paragraphs.map((p, i) => (
            <Txt key={i} variant="body" color={colors.ink2}>{p}</Txt>
          ))}
        </View>
      )}

      {highlights.length > 0 && (
        <View style={[ui.card, { gap: space.md }]}>
          <Txt variant="heading">Key features</Txt>
          {highlights.map((h) => (
            <View key={h} style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Ionicons name="checkmark" size={13} color={colors.brandPressed} />
              </View>
              <Txt variant="body" color={colors.ink2} style={{ flex: 1 }}>{h}</Txt>
            </View>
          ))}
        </View>
      )}

      {box.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">What’s in the box</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {box.map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12 }}>
                <Ionicons name="cube-outline" size={14} color={colors.muted} />
                <Txt variant="small" color={colors.ink2}>{item}</Txt>
              </View>
            ))}
          </View>
        </View>
      )}

      {specs.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">Specifications</Txt>
          <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden", backgroundColor: colors.surface }}>
            {specs.map(([k, v], i) => (
              <View key={k} style={{ flexDirection: "row", gap: space.md, paddingVertical: 11, paddingHorizontal: space.md, backgroundColor: i % 2 ? colors.surface : colors.surfaceAlt }}>
                <Txt variant="small" style={{ width: "40%" }}>{k}</Txt>
                <Txt variant="label" color={colors.ink} style={{ flex: 1 }}>{v}</Txt>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[ui.card, { gap: space.xs }]}>
        <Txt variant="heading">Warranty & returns</Txt>
        <InfoRow illo="shield" title={product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "No warranty listed"} subtitle="Your order number is your proof of purchase for claims." />
        <InfoRow illo="receipt" title="Returns" subtitle={product.returnPolicy ?? "Faulty, damaged or wrong items can be reported within 7 days of delivery."} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingTop: space.xs }}>
          {(
            [
              ["returns", "Returns & refunds"],
              ["warranty", "Warranty"],
              ["delivery", "Delivery"],
            ] as const
          ).map(([slug, label]) => (
            <Pressable
              key={slug}
              onPress={() => openPolicy(slug)}
              accessibilityRole="link"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface })}
            >
              <Txt variant="caption" color={colors.ink} style={{ fontFamily: fonts.semibold }}>{label}</Txt>
              <Ionicons name="open-outline" size={12} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </View>

      {paragraphs.length === 0 && specs.length === 0 && highlights.length === 0 && <Txt variant="small">More details for this product are coming soon.</Txt>}
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={[ui.card, { gap: space.sm }]}>
      <View style={[ui.row, { gap: space.sm }]}>
        <UserAvatar seed={review.userId} preset={review.avatarStyle} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label" numberOfLines={1}>{review.authorName}</Txt>
          <View style={[ui.row, { gap: 6 }]}>
            <Stars value={review.rating} size={12} />
            <Txt variant="caption">{timeAgo(review.createdAt)}</Txt>
          </View>
        </View>
        {review.verified && <Pill label="Verified purchase" tone="success" icon="checkmark-circle" />}
      </View>
      {review.title ? <Txt variant="label">{review.title}</Txt> : null}
      <Txt variant="body" color={colors.ink2}>{review.body}</Txt>
      {review.storeReply ? (
        <View style={{ marginTop: 6, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, gap: 2 }}>
          <Txt variant="caption" style={{ fontWeight: "700" }}>Reply from the store</Txt>
          <Txt variant="small" color={colors.ink2}>{review.storeReply}</Txt>
        </View>
      ) : null}
    </View>
  );
}

function ReviewsTab({ data, loading, mine, onWrite }: { data: ProductReviews | undefined; loading: boolean; mine: Review | undefined; onWrite: () => void }) {
  const [showAll, setShowAll] = useState(false);
  if (loading && !data) return <Txt variant="small">Loading reviews…</Txt>;
  const summary = data?.summary ?? { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  const reviews = data?.reviews ?? [];
  const visible = showAll ? reviews : reviews.slice(0, 4);
  const top = Math.max(1, ...summary.distribution);

  return (
    <View style={{ gap: space.lg }}>
      {summary.count > 0 ? (
        <View style={[ui.card, { flexDirection: "row", gap: space.lg, alignItems: "center" }]}>
          <View style={{ alignItems: "center", gap: 4, minWidth: 92 }}>
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 42, lineHeight: 46, color: colors.ink }}>{summary.average.toFixed(1)}</Text>
            <Stars value={summary.average} size={14} />
            <Txt variant="caption">{summary.count} review{summary.count === 1 ? "" : "s"}</Txt>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star - 1] ?? 0;
              return (
                <View key={star} style={[ui.row, { gap: 6 }]}>
                  <Txt variant="caption" style={{ width: 10, textAlign: "right" }}>{star}</Txt>
                  <Ionicons name="star" size={10} color={colors.brandYellow} />
                  <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" }}>
                    <View style={{ width: `${(n / top) * 100}%`, height: "100%", borderRadius: 4, backgroundColor: colors.brandYellow }} />
                  </View>
                  <Txt variant="caption" style={{ width: 18, textAlign: "right" }}>{n}</Txt>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[ui.card, { alignItems: "center", gap: space.sm, paddingVertical: space.xl }]}>
          <Illo name="chat" size={56} />
          <Txt variant="heading">No reviews yet</Txt>
          <Txt variant="small" style={{ textAlign: "center" }}>Bought this item? Tell other shoppers what you think.</Txt>
        </View>
      )}

      {/* One review per product: once it's posted, it's final */}
      {!mine && <Button title="Write a review" icon="star-outline" variant="outline" onPress={onWrite} />}

      {visible.map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
      {reviews.length > visible.length && <Button title={`Show all ${reviews.length} reviews`} variant="ghost" icon="chevron-down" onPress={() => setShowAll(true)} />}
    </View>
  );
}

export default function ProductScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  // Desktop: photos on the left, details beside them
  const desktop = useIsDesktop();
  const width = desktop ? Math.round((screenWidth - gutter * 2 - space.xl) / 2) : screenWidth;
  const { data: product, error, loading, reload } = useAsync(() => api.product(id), [id]);
  const reviews = useAsync(() => api.productReviews(id), [id]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  // ?tab=about or ?tab=reviews opens straight on that tab (e.g. from "Rate your purchase")
  const [tab, setTab] = useState<Tab>(tabParam === "about" || tabParam === "reviews" ? tabParam : "overview");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const galleryRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cart = useCart();
  const openCart = useOpenCart();
  const addToCart = useAddToCart();
  const features = useFeatures();
  const showAdded = useCartFeedback();
  const { user } = useAuth();
  const toast = useToast();
  const config = useAsync(() => api.storeConfig());
  const fx = useAsync(() => api.exchangeRate());
  // This customer's offers, to show the one on this product instead of "Make an offer"
  const offers = useAsync(async () => (user ? api.offers() : ([] as OfferView[])), [user?.id], { live: true });
  useFocusEffect(
    useCallback(() => {
      offers.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const heroHeight = desktop ? width : Math.round(Math.min(width, 720) * 0.95);

  // Related = other products in the same top-level category.
  const related = useAsync(async () => {
    if (!product) return { slug: null as string | null, items: [] as CatalogProduct[] };
    const cats = await api.categories();
    const own = cats.find((c) => c.id === product.categoryId);
    const group = own?.parentId ? cats.find((c) => c.id === own.parentId) : own;
    if (!group) return { slug: null, items: [] };
    const items = await api.products({ category: group.slug });
    return { slug: group.slug, items: items.filter((p) => p.id !== product.id).slice(0, 10) };
  }, [product?.id]);

  if (loading && !product) return <Loading />;
  if (error || !product) return <ErrorView message={error ?? "Product not found"} onRetry={reload} />;

  // A price the store agreed for this customer, still held: its option opens first
  const agreedOffer = (offers.data ?? []).find((o) => o.product.id === product.id && o.status === "agreed" && o.agreedPrice != null && (!o.agreedUntil || new Date(o.agreedUntil).getTime() > now));
  const variant = product.variants.find((v) => v.id === (variantId ?? agreedOffer?.product.variantId)) ?? product.variants[0];
  /** The agreed price applies to this option, one unit, for this customer only */
  const deal = agreedOffer && agreedOffer.product.variantId === variant?.id ? agreedOffer : null;
  const stock = product.stock.filter((s) => s.variantId === variant?.id);
  const available = stock.reduce((n, s) => n + s.quantity - s.reserved, 0);
  const storesWithStock = stock.filter((s) => s.quantity - s.reserved > 0);
  const off = variant ? discountPercent(variant.price, variant.compareAtPrice) : 0;
  const lowStock = features.lowStockBadges && available <= product.lowStockThreshold;
  // The Reviews tab disappears when reviews are switched off in admin.
  const shownTab: Tab = tab === "reviews" && !features.reviews ? "overview" : tab;
  const rating = reviews.data?.summary.average ?? product.ratingAverage ?? 0;
  const ratingCount = reviews.data?.summary.count ?? product.ratingCount ?? 0;
  const mine = user ? reviews.data?.reviews.find((r) => r.userId === user.id) : undefined;
  // An open offer on this product: the store's turn, the customer's turn, or a price held for them
  const openOffer = (offers.data ?? [])
    .filter((o) => o.product.id === product.id && (o.status === "waiting_store" || o.status === "waiting_customer" || (o.status === "agreed" && (!o.agreedUntil || new Date(o.agreedUntil).getTime() > now))))
    .sort((a, b) => (a.product.variantId === variant?.id ? -1 : 0) - (b.product.variantId === variant?.id ? -1 : 0) || b.updatedAt.localeCompare(a.updatedAt))[0];
  const left = (iso: string) => {
    const secs = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h ? `${h}h ` : ""}${m}m ${String(secs % 60).padStart(2, "0")}s left`;
  };

  async function addCurrent() {
    if (!variant || !product) return;
    if (deal?.agreedPrice != null) {
      // One at the agreed price; more can be added at the normal price afterwards
      const line = {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.name,
        unitPrice: deal.agreedPrice,
        imageUrl: product.images[0] ?? null,
        offerId: deal.id,
        store: sellerOf(product.store),
      };
      if (!(await addToCart(line, 1))) return;
      showAdded({ name: product.name, variant: product.variants.length > 1 ? variant.name : undefined, imageUrl: product.images[0] ?? null, quantity: 1, unitPrice: deal.agreedPrice });
      return;
    }
    const line = {
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      unitPrice: variant.price,
      imageUrl: product.images[0] ?? null,
      store: sellerOf(product.store),
    };
    if (!(await addToCart(line, qty))) return;
    showAdded({ name: product.name, variant: product.variants.length > 1 ? variant.name : undefined, imageUrl: product.images[0] ?? null, quantity: qty, unitPrice: variant.price });
  }

  async function toggleSaved() {
    if (!user) return router.push("/sign-in");
    tap();
    const res = await api.toggleWishlist(product!.id);
    setSaved(res.saved);
    toast(res.saved ? "Saved for later" : "Removed from saved", { icon: res.saved ? "heart" : "heart-dislike" });
  }

  function openReview() {
    if (!user) return router.push("/sign-in");
    setReviewOpen(true);
  }

  async function submitReview(input: { rating: number; title: string; body: string; photos: string[] }) {
    const r = await api.submitReview({ productId: product!.id, rating: input.rating, title: input.title || null, body: input.body, photos: input.photos });
    setReviewOpen(false);
    setTab("reviews");
    reviews.reload();
    if (r.bonus) {
      void refreshHeldTokens();
      toast(`Thanks! You earned ${r.bonus.amount.toLocaleString("en-NG")} tokens for your review`, { icon: "star" });
    } else toast(mine ? "Review updated" : "Thanks for your review!", { icon: "star" });
  }

  return (
    <View style={ui.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={desktop ? { flexDirection: "row", alignItems: "flex-start", gap: space.xl, padding: gutter } : undefined}>
        {/* Photo gallery: swipe, or tap a thumbnail below */}
        <View style={[{ height: heroHeight, backgroundColor: "#F1ECE5" }, desktop && { width, borderRadius: radius.xl, overflow: "hidden" }]}>
          {product.images.length > 0 ? (
            <ScrollView
              ref={galleryRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {product.images.map((src, i) => (
                <ProductImage key={i} uri={src} name={product.name} style={{ width, height: heroHeight }} padding={heroHeight * 0.12} />
              ))}
            </ScrollView>
          ) : (
            <ProductImage name={product.name} style={{ flex: 1 }} iconSize={80} />
          )}
          {product.images.length > 1 && (
            <View style={{ position: "absolute", left: gutter, bottom: radius.xl + space.md + 8, backgroundColor: "rgba(23,18,14,0.7)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Txt variant="caption" color={colors.white}>{imageIndex + 1} / {product.images.length}</Txt>
            </View>
          )}
          <View style={[ui.between, { position: "absolute", top: insets.top + space.sm, left: gutter, right: gutter }]}>
            <IconButton icon="chevron-back" tone="glass" onPress={() => router.back()} />
            <View style={ui.row}>
              <IconButton icon={saved ? "heart" : "heart-outline"} color={saved ? colors.danger : colors.ink} tone="glass" onPress={toggleSaved} />
              <IconButton icon="bag-handle-outline" tone="glass" badge={cart.count} onPress={openCart} />
            </View>
          </View>
        </View>

        {/* Details sheet */}
        <View style={[{ marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: gutter, paddingTop: space.xl, gap: space.lg }, desktop && { flex: 1, marginTop: 0, paddingHorizontal: 0, paddingTop: 0 }]}>
          {product.images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {product.images.map((src, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setImageIndex(i);
                    galleryRef.current?.scrollTo({ x: i * width, animated: true });
                  }}
                  style={{ width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: i === imageIndex ? colors.ink : "transparent", padding: 2 }}
                >
                  <ProductImage uri={src} name={product.name} style={{ flex: 1 }} radius={radius.sm} padding={4} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={{ gap: 6 }}>
            {product.brand ? <Txt variant="overline">{product.brand}{product.model ? ` · ${product.model}` : ""}</Txt> : null}
            <Txt variant="title">{product.name}</Txt>
            {/* Price, its dollar value, the saving and stock, all centred on one line */}
            <View style={[ui.row, { marginTop: 4, flexWrap: "wrap", rowGap: 6 }]}>
              <Price amount={deal?.agreedPrice ?? variant?.price ?? 0} compareAt={deal ? variant?.price : variant?.compareAtPrice} size="lg" />
              {features.usdPrices && fx.data && variant ? (
                <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Txt variant="label" color={colors.ink2} style={{ fontSize: 12, lineHeight: 16 }}>≈ {formatUsd(variant.price, fx.data.rate)}</Txt>
                </View>
              ) : null}
              {off > 0 && (
                <View>
                  <Pill label={`Save ${off}%`} tone="brand" />
                </View>
              )}
              <View>
                {available > 0 ? (
                  <Pill
                    icon="checkmark-circle"
                    tone={lowStock ? "warning" : "success"}
                    label={lowStock ? `Only ${available} left` : `In stock at ${storesWithStock.length} store${storesWithStock.length === 1 ? "" : "s"}`}
                  />
                ) : (
                  <Pill icon="close-circle" tone="danger" label="Out of stock" />
                )}
              </View>
            </View>
            {/* The offer, under the price */}
            <View style={[ui.row, { gap: space.sm, flexWrap: "wrap" }]}>
            {openOffer ? (
              <Pressable
                onPress={() => router.push({ pathname: "/offer/[id]", params: { id: openOffer.id } })}
                style={({ pressed }) => [
                  ui.row,
                  {
                    gap: 5,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: openOffer.status === "waiting_store" ? colors.line : colors.brand,
                    backgroundColor: pressed ? colors.surfaceAlt : openOffer.status === "waiting_store" ? colors.surface : colors.brandSoft,
                  },
                ]}
              >
                <Ionicons name={openOffer.status === "agreed" ? "time-outline" : openOffer.status === "waiting_customer" ? "chatbubble-ellipses-outline" : "hourglass-outline"} size={14} color={openOffer.status === "waiting_store" ? colors.ink : colors.brandPressed} />
                <Txt variant="label" style={{ fontSize: 13 }}>
                  {openOffer.status === "agreed"
                    ? `${formatNaira(openOffer.agreedPrice ?? openOffer.lastAmount)}${openOffer.agreedUntil ? ` · ${left(openOffer.agreedUntil)}` : ""}`
                    : openOffer.status === "waiting_customer"
                      ? "Store replied"
                      : "Offer sent"}
                </Txt>
                <Ionicons name="chevron-forward" size={12} color={colors.muted} />
              </Pressable>
            ) : product.negotiable && product.store && variant && available > 0 ? (
              <Pressable
                onPress={() =>
                  user
                    ? router.push({ pathname: "/offer/[id]", params: { id: "new", variant: variant.id, name: product.name, price: String(variant.price), image: product.images[0] ?? "", store: product.store!.name } })
                    : router.push("/sign-in")
                }
                style={({ pressed }) => [ui.row, { gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface }]}
              >
                <Ionicons name="pricetag-outline" size={14} color={colors.ink} />
                <Txt variant="label" style={{ fontSize: 13 }}>Make an offer</Txt>
              </Pressable>
            ) : null}
            </View>
          </View>

          <ProductTabs tab={shownTab} onChange={setTab} rating={rating} count={ratingCount} reviews={features.reviews} />

          {shownTab === "overview" && <OverviewTab product={product} variantId={variant?.id} onVariant={setVariantId} pickupBranch={storesWithStock[0]?.branchName} />}
          {shownTab === "about" && <AboutTab product={product} />}
          {shownTab === "reviews" && <ReviewsTab data={reviews.data} loading={reviews.loading} mine={mine} onWrite={openReview} />}
        </View>
        </View>

        {related.data && related.data.items.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            <View style={{ paddingHorizontal: gutter }}>
              <SectionHeader title="Related products" action="See all" onAction={() => router.push({ pathname: "/shop", params: { category: related.data?.slug ?? "" } })} />
            </View>
            <ScrollRow contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
              {related.data.items.map((p) => (
                <ProductCard key={p.id} product={p} width={150} />
              ))}
            </ScrollRow>
          </View>
        )}
      </ScrollView>

      <BottomBar>
        <IconButton icon="chatbubbles-outline" size={48} onPress={() => (user ? setChatOpen(true) : router.push("/sign-in"))} />
        {!deal && <QtyStepper value={qty} onChange={setQty} max={Math.max(1, available)} />}
        <Button title={available <= 0 ? "Out of stock" : deal?.agreedPrice != null ? `Buy at ${formatNaira(deal.agreedPrice)}` : `Add · ${formatNaira((variant?.price ?? 0) * qty)}`} icon="bag-add-outline" onPress={addCurrent} disabled={available <= 0} style={{ flex: 1 }} />
      </BottomBar>

      <SupportChatModal visible={chatOpen} onClose={() => setChatOpen(false)} />
      <ReviewSheet visible={reviewOpen} productName={product.name} initial={mine} onClose={() => setReviewOpen(false)} onSubmit={submitReview} />
    </View>
  );
}
