import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type CatalogProduct, type Category } from "@sotechy/shared";
import { HeroCarousel } from "@/components/hero-carousel";
import { MenuButton } from "@/components/menu";
import { ProductRail } from "@/components/product-rail";
import { Button, discountPercent, ErrorView, IconButton, Loading, Pill, productIcon, SectionHeader, Txt, ui, type IconName } from "@/components/ui";
import { api, DEMO_MODE } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { demoMedia } from "@/lib/mock-api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

function QuickTile({ title, icon, bg, fg, iconBg, onPress }: { title: string; icon: IconName; bg: string; fg: string; iconBg: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 112, height: 112, borderRadius: radius.lg, backgroundColor: bg, padding: space.md, justifyContent: "space-between", opacity: pressed ? 0.85 : 1 })}>
      <View style={ui.between}>
        <Txt variant="label" color={fg} style={{ flex: 1, fontSize: 13, lineHeight: 16 }}>{title}</Txt>
        <Ionicons name="arrow-forward" size={14} color={fg} />
      </View>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" }}>
        <Ionicons name={icon} size={20} color={bg === colors.ink ? colors.ink : colors.white} />
      </View>
    </Pressable>
  );
}

function CircleLink({ label, onPress, image, icon, dark }: { label: string; onPress: () => void; image?: string | null; icon?: IconName; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ width: "25%", alignItems: "center", gap: 6, paddingHorizontal: 2 }}>
      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: dark ? colors.ink : colors.brandSoft, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}>
        {image ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Ionicons name={icon ?? "grid-outline"} size={26} color={dark ? colors.brandYellow : colors.brandPressed} />}
      </View>
      <Txt variant="caption" color={colors.ink2} numberOfLines={2} style={{ textAlign: "center", fontFamily: fonts.medium }}>{label}</Txt>
    </Pressable>
  );
}

function DealBubble({ product, size }: { product: CatalogProduct; size: number }) {
  const off = discountPercent(product.minPrice, product.compareAtPrice);
  return (
    <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.slug } })} style={{ width: size, alignItems: "center", gap: 6 }}>
      <View style={{ width: size, height: size }}>
        <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "74%", height: "74%" }} contentFit="contain" />
          ) : (
            <Ionicons name={productIcon(product.name)} size={size * 0.4} color={colors.white} />
          )}
        </View>
        {off > 0 && (
          <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 2, borderColor: colors.surface }}>
            <Txt variant="caption" color={colors.white} style={{ fontSize: 11 }}>-{off}%</Txt>
          </View>
        )}
      </View>
      <Txt variant="price" style={{ fontSize: 14 }}>{formatNaira(product.minPrice)}</Txt>
    </Pressable>
  );
}

/** Top-level category id for any category (itself if already top-level). */
const topOf = (cats: Category[], id: string | null) => {
  const c = cats.find((x) => x.id === id);
  return c?.parentId ?? c?.id ?? null;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { count } = useCart();
  const contentWidth = Math.min(width, 720) - gutter * 2;

  const { data, error, loading, reload } = useAsync(async () => {
    const [config, categories, products] = await Promise.all([api.storeConfig(), api.categories(), api.products({ sort: "newest" })]);
    return { config, categories, products };
  });

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const { config, categories, products } = data;
  const tops = categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const deals = products.filter((p) => discountPercent(p.minPrice, p.compareAtPrice) > 0 || p.isFeatured);
  // Three circles in one row: card padding (2 × lg), card border (2 × 1px) and two gaps.
  const bubbleSize = Math.floor((contentWidth - space.lg * 2 - 2 - space.md * 2) / 3);
  const support = config.support;
  const headOffice = config.branches[0];
  const shop = (params: Record<string, string>) => router.push({ pathname: "/shop", params } as Href);

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: space.xxl * 2, gap: space.xxl }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header, search and call-to-order */}
      <View style={{ paddingHorizontal: gutter, gap: space.md }}>
        <View style={ui.between}>
          <View style={[ui.row, { gap: space.md }]}>
            <MenuButton />
            <Image source={require("../../../assets/brand/light-logo-small.png")} style={{ width: 100, height: 42 }} contentFit="contain" contentPosition="left" />
          </View>
          <View style={ui.row}>
            <IconButton icon="person-outline" onPress={() => router.push("/account")} />
            <IconButton icon="bag-handle-outline" badge={count} onPress={() => router.push("/cart")} />
          </View>
        </View>
        <Pressable
          onPress={() => shop({ focus: "1" })}
          style={{ height: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}
        >
          <Ionicons name="search" size={18} color={colors.ink2} />
          <Txt variant="body" color={colors.faint}>Search products, brands and categories</Txt>
        </Pressable>
        <View style={ui.between}>
          <Pressable onPress={() => support.phone && Linking.openURL(`tel:${support.phone.replace(/[^\d+]/g, "")}`)} style={ui.row}>
            <Ionicons name="call" size={14} color={colors.brandPressed} />
            <Txt variant="label" style={{ fontSize: 13 }}>
              CALL TO ORDER: <Txt variant="label" color={colors.brandPressed} style={{ fontSize: 13 }}>{support.phone ?? "coming soon"}</Txt>
            </Txt>
          </Pressable>
          {DEMO_MODE && <Pill label="Demo data" tone="warning" />}
        </View>
      </View>

      <HeroCarousel width={contentWidth} />

      {/* Quick tiles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
        <QuickTile title="Call to order" icon="call" bg={colors.brandSoft} fg={colors.ink} iconBg={colors.brand} onPress={() => support.phone && Linking.openURL(`tel:${support.phone.replace(/[^\d+]/g, "")}`)} />
        <QuickTile title="Pay with $MOVE" icon="flash" bg={colors.ink} fg={colors.white} iconBg={colors.brandYellow} onPress={() => shop({})} />
        <QuickTile title="Pick up today" icon="storefront" bg={colors.successSoft} fg={colors.ink} iconBg={colors.success} onPress={() => shop({})} />
        <QuickTile title="WhatsApp us" icon="logo-whatsapp" bg="#E3F6EA" fg={colors.ink} iconBg="#25A366" onPress={() => support.whatsapp && Linking.openURL(`https://wa.me/${support.whatsapp.replace(/[^\d]/g, "")}`)} />
        <QuickTile title="Track my order" icon="receipt" bg={colors.surfaceAlt} fg={colors.ink} iconBg={colors.ink2} onPress={() => router.push("/orders")} />
      </ScrollView>

      {/* Deals of the day */}
      {deals.length > 0 && (
        <View style={{ marginHorizontal: gutter, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line }}>
          <View style={[ui.between, { marginBottom: space.lg }]}>
            <View>
              <Txt variant="title" style={{ fontFamily: fonts.displayHeavy }}>Deals of the day</Txt>
              <Txt variant="small">While stock lasts</Txt>
            </View>
            <Pressable onPress={() => shop({ featured: "1" })} style={{ height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.ink, justifyContent: "center" }}>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {deals.slice(0, 3).map((p) => (
              <DealBubble key={p.id} product={p} size={bubbleSize} />
            ))}
          </View>
        </View>
      )}

      {/* Categories */}
      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title="Everything for your home & office" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, marginHorizontal: -2 }}>
          {tops.map((c) => (
            <CircleLink key={c.id} label={c.name} image={c.imageUrl} icon={productIcon(c.name)} onPress={() => shop({ category: c.slug })} />
          ))}
          <CircleLink label="Deals" icon="pricetag" dark onPress={() => shop({ featured: "1" })} />
          <CircleLink label="New in" icon="sparkles" onPress={() => shop({ sort: "newest" })} />
          <CircleLink label="Stores" icon="location" onPress={() => headOffice && Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${headOffice.address}, ${headOffice.city}, Nigeria`)}`)} />
        </View>
      </View>

      <ProductRail title="Top deals" subtitle="Save on selected items" products={deals} dark onSeeAll={() => shop({ featured: "1" })} />

      {/* One rail per top-level category; every other one on a dark panel */}
      {tops.map((c, i) => (
        <ProductRail
          key={c.id}
          title={c.name}
          products={products.filter((p) => topOf(categories, p.categoryId) === c.id)}
          dark={i % 3 === 2}
          subtitle={i % 3 === 2 ? "Trusted brands, with warranty" : undefined}
          onSeeAll={() => shop({ category: c.slug })}
        />
      ))}

      {/* Brands */}
      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title="Brands we stock" />
        <View style={[ui.row, { gap: space.md }]}>
          {demoMedia.brands.map((src, i) => (
            <View key={i} style={{ flex: 1, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg }}>
              <Image source={src} style={{ width: "100%", height: 30 }} contentFit="contain" />
            </View>
          ))}
        </View>
      </View>

      {/* Can't find it */}
      <Pressable
        onPress={() => (support.whatsapp ? Linking.openURL(`https://wa.me/${support.whatsapp.replace(/[^\d]/g, "")}`) : router.push("/support"))}
        style={{ marginHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubbles-outline" size={24} color={colors.brandPressed} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label">Can&apos;t find what you need?</Txt>
          <Txt variant="small">Tell us the product and we&apos;ll source it for you.</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>

      {/* Store */}
      {headOffice && (
        <View style={{ marginHorizontal: gutter, borderRadius: radius.xl, overflow: "hidden", height: Math.round(contentWidth * 0.72) }}>
          <Image source={demoMedia.storeFront} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(23,18,14,0.88)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" }} />
          <View style={{ flex: 1, justifyContent: "flex-end", padding: space.xl, gap: 6 }}>
            <Txt variant="overline" color={colors.brandYellow}>Visit the store</Txt>
            <Txt variant="title" color={colors.white}>{headOffice.address}, {headOffice.city}</Txt>
            {headOffice.openingHours ? <Txt variant="small" color="#E2DAD1">{headOffice.openingHours} · Pick up online orders here</Txt> : null}
            <Button
              title="Get directions"
              icon="navigate"
              size="sm"
              variant="outline"
              style={{ alignSelf: "flex-start", marginTop: space.sm }}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${headOffice.address}, ${headOffice.city}, Nigeria`)}`)}
            />
          </View>
        </View>
      )}

      {/* Promise strip */}
      <View style={[ui.row, { marginHorizontal: gutter, justifyContent: "space-between" }]}>
        {[
          { icon: "storefront-outline" as const, label: "Pick up\nin store" },
          { icon: "bicycle-outline" as const, label: "Fast local\ndelivery" },
          { icon: "shield-checkmark-outline" as const, label: "Genuine\nwarranty" },
          { icon: "wallet-outline" as const, label: "Bank, online\n& crypto" },
        ].map((item) => (
          <View key={item.label} style={{ alignItems: "center", gap: 6, flex: 1 }}>
            <Ionicons name={item.icon} size={22} color={colors.ink2} />
            <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>{item.label}</Txt>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
