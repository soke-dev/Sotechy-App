import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type CatalogProduct, type ProductDetail, type ProductReviews, type Review } from "@sotechy/shared";
import { useCartFeedback } from "@/components/cart-feedback";
import { Illo, type IlloName } from "@/components/illustrations";
import { ProductCard } from "@/components/product-card";
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors, fonts, gutter, lightPalette, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { openWhatsApp } from "@/lib/whatsapp";

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
function ProductTabs({ tab, onChange, rating, count }: { tab: Tab; onChange: (t: Tab) => void; rating: number; count: number }) {
  const items: { key: Tab; label: string; sub?: string }[] = [
    { key: "overview", label: "Overview", sub: "Options & store" },
    { key: "about", label: "About & specs", sub: "Full details" },
    { key: "reviews", label: "Reviews" },
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
  return (
    <View style={{ gap: space.lg }}>
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
        {product.allowPickup && (
          <InfoRow
            illo="store"
            title={pickupBranch ? `Pick up at ${pickupBranch}` : "Store pickup"}
            subtitle={pickupBranch ? "Usually ready the same day" : "Currently unavailable"}
          />
        )}
        {product.allowDelivery && <InfoRow illo="bike" title="Delivery in Benin City" subtitle="Fee and timing shown at checkout" />}
        <InfoRow illo="shield" title={product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "Warranty details on request"} subtitle={product.returnPolicy ?? undefined} />
        <InfoRow illo="wallet" title="Pay your way" subtitle="Bank transfer, online payment or $MOVE" />
      </View>

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
        <InfoRow illo="shield" title={product.warrantyMonths ? `${product.warrantyMonths}-month Sotechy warranty` : "Warranty details on request"} subtitle="Keep your receipt or order number for warranty claims at any branch." />
        <InfoRow illo="receipt" title="Returns" subtitle={product.returnPolicy ?? "Faulty items can be returned for inspection within 7 days."} />
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

      <Button title={mine ? "Edit your review" : "Write a review"} icon={mine ? "create-outline" : "star-outline"} variant="outline" onPress={onWrite} />

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
  const { width } = useWindowDimensions();
  const { data: product, error, loading, reload } = useAsync(() => api.product(id), [id]);
  const reviews = useAsync(() => api.productReviews(id), [id]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  // ?tab=about or ?tab=reviews opens straight on that tab (e.g. from "Rate your purchase")
  const [tab, setTab] = useState<Tab>(tabParam === "about" || tabParam === "reviews" ? tabParam : "overview");
  const [reviewOpen, setReviewOpen] = useState(false);
  const galleryRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cart = useCart();
  const showAdded = useCartFeedback();
  const { user } = useAuth();
  const toast = useToast();
  const config = useAsync(() => api.storeConfig());
  const heroHeight = Math.round(Math.min(width, 720) * 0.95);

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

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = product.stock.filter((s) => s.variantId === variant?.id);
  const available = stock.reduce((n, s) => n + s.quantity - s.reserved, 0);
  const storesWithStock = stock.filter((s) => s.quantity - s.reserved > 0);
  const off = variant ? discountPercent(variant.price, variant.compareAtPrice) : 0;
  const rating = reviews.data?.summary.average ?? product.ratingAverage ?? 0;
  const ratingCount = reviews.data?.summary.count ?? product.ratingCount ?? 0;
  const mine = user ? reviews.data?.reviews.find((r) => r.userId === user.id) : undefined;

  function addToCart() {
    if (!variant || !product) return;
    cart.add(
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.name,
        unitPrice: variant.price,
        imageUrl: product.images[0] ?? null,
      },
      qty,
    );
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

  async function submitReview(input: { rating: number; title: string; body: string }) {
    await api.submitReview({ productId: product!.id, rating: input.rating, title: input.title || null, body: input.body });
    setReviewOpen(false);
    setTab("reviews");
    reviews.reload();
    toast(mine ? "Review updated" : "Thanks for your review!", { icon: "star" });
  }

  return (
    <View style={ui.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        {/* Photo gallery: swipe, or tap a thumbnail below */}
        <View style={{ height: heroHeight, backgroundColor: lightPalette.brand }}>
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
          <Pressable
            onPress={() =>
              openWhatsApp(
                config.data?.support.whatsapp,
                `Hello Sotechy, I'd like to order: ${product.name}${product.variants.length > 1 && variant ? ` (${variant.name})` : ""} – ${formatNaira(variant?.price)}`,
              )
            }
            accessibilityLabel="Order on WhatsApp"
            style={({ pressed }) => ({ position: "absolute", right: gutter, bottom: radius.xl + space.md, flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingLeft: 14, paddingRight: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceAlt : `${colors.surface}F2` })}
          >
            <Txt variant="label">Order on</Txt>
            <Ionicons name="logo-whatsapp" size={21} color={colors.brandPressed} />
          </Pressable>
          <View style={[ui.between, { position: "absolute", top: insets.top + space.sm, left: gutter, right: gutter }]}>
            <IconButton icon="chevron-back" tone="glass" onPress={() => router.back()} />
            <View style={ui.row}>
              <IconButton icon={saved ? "heart" : "heart-outline"} color={saved ? colors.danger : colors.ink} tone="glass" onPress={toggleSaved} />
              <IconButton icon="bag-handle-outline" tone="glass" badge={cart.count} onPress={() => router.push("/cart")} />
            </View>
          </View>
        </View>

        {/* Details sheet */}
        <View style={{ marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: gutter, paddingTop: space.xl, gap: space.lg }}>
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
            <Pressable onPress={() => setTab("reviews")} hitSlop={6} style={[ui.row, { gap: 6, alignSelf: "flex-start" }]}>
              <Stars value={rating} size={14} />
              <Txt variant="small" color={colors.ink2}>
                {ratingCount ? `${rating.toFixed(1)} · ${ratingCount} review${ratingCount === 1 ? "" : "s"}` : "No reviews yet"}
              </Txt>
            </Pressable>
            <View style={[ui.row, { marginTop: 4 }]}>
              <Price amount={variant?.price ?? 0} compareAt={variant?.compareAtPrice} size="lg" />
              {off > 0 && <Pill label={`Save ${off}%`} tone="brand" />}
            </View>
            {available > 0 ? (
              <Pill
                icon="checkmark-circle"
                tone={available <= product.lowStockThreshold ? "warning" : "success"}
                label={available <= product.lowStockThreshold ? `Only ${available} left` : `In stock at ${storesWithStock.length} store${storesWithStock.length === 1 ? "" : "s"}`}
              />
            ) : (
              <Pill icon="close-circle" tone="danger" label="Out of stock" />
            )}
          </View>

          <ProductTabs tab={tab} onChange={setTab} rating={rating} count={ratingCount} />

          {tab === "overview" && <OverviewTab product={product} variantId={variant?.id} onVariant={setVariantId} pickupBranch={storesWithStock[0]?.branchName} />}
          {tab === "about" && <AboutTab product={product} />}
          {tab === "reviews" && <ReviewsTab data={reviews.data} loading={reviews.loading} mine={mine} onWrite={openReview} />}
        </View>

        {related.data && related.data.items.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            <View style={{ paddingHorizontal: gutter }}>
              <SectionHeader title="Related products" action="See all" onAction={() => router.push({ pathname: "/shop", params: { category: related.data?.slug ?? "" } })} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
              {related.data.items.map((p) => (
                <ProductCard key={p.id} product={p} width={150} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <BottomBar>
        <IconButton
          icon="call-outline"
          size={48}
          onPress={() => config.data?.support.phone && Linking.openURL(`tel:${config.data.support.phone.replace(/[^\d+]/g, "")}`)}
        />
        <QtyStepper value={qty} onChange={setQty} max={Math.max(1, available)} />
        <Button title={available > 0 ? `Add · ${formatNaira((variant?.price ?? 0) * qty)}` : "Out of stock"} icon="bag-add-outline" onPress={addToCart} disabled={available <= 0} style={{ flex: 1 }} />
      </BottomBar>

      <ReviewSheet visible={reviewOpen} productName={product.name} initial={mine} onClose={() => setReviewOpen(false)} onSubmit={submitReview} />
    </View>
  );
}
