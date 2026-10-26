import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type CatalogProduct, type Category } from "@sotechy/shared";
import { CartButton } from "@/components/cart-button";
import { HeroCarousel } from "@/components/hero-carousel";
import { MenuButton } from "@/components/menu";
import { ProductRail } from "@/components/product-rail";
import { SupportChat } from "@/components/support-chat";
import { useTabBarInset } from "@/components/tab-bar";
import { FeaturedStoreCard } from "@/components/store-bits";
import { AccountIcon } from "@/components/tab-icons";
import { UserAvatar } from "@/components/user-avatar";
import { ArtButton, Button, discountPercent, ErrorView, IconButton, Loading, productIcon, SectionHeader, Txt, ui, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { stores } from "@/lib/marketplace";
import { useStoreNotifications } from "@/lib/store-notifications";
import { useFeatures } from "@/lib/store-config";
import { demoMedia } from "@/lib/mock-api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { openWhatsApp, ORDER_MESSAGE } from "@/lib/whatsapp";
import { Illo, type IlloName } from "@/components/illustrations";

function CircleLink({ label, onPress, image, icon, illo, dark }: { label: string; onPress: () => void; image?: string | null; icon?: IconName; illo?: IlloName; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ width: "25%", alignItems: "center", gap: 6, paddingHorizontal: 2 }}>
      <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: dark ? colors.panel : colors.brandSoft, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}>
        {illo ? <Illo name={illo} size={40} /> : image ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Ionicons name={icon ?? "grid-outline"} size={26} color={dark ? colors.brandYellow : colors.brandPressed} />}
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
          <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: colors.inverse, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 2, borderColor: colors.surface }}>
            <Txt variant="caption" color={colors.onInverse} style={{ fontSize: 11 }}>-{off}%</Txt>
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
  const { unread } = useStoreNotifications();
  const { user } = useAuth();
  const tabInset = useTabBarInset();
  const features = useFeatures();
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
    <View style={ui.screen}>
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: tabInset + space.xl, gap: space.xxl }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header, search and WhatsApp ordering */}
      <View style={{ paddingHorizontal: gutter, gap: space.md }}>
        <View style={ui.between}>
          <View style={[ui.row, { gap: space.md }]}>
            <MenuButton />
            <Image source={require("../../../assets/brand/light-logo-small.png")} style={{ width: 100, height: 42 }} contentFit="contain" contentPosition="left" />
          </View>
          <View style={ui.row}>
            <ArtButton label={user ? "My account" : "Sign in"} onPress={() => router.push("/account")}>
              {/* Avatar sits inside the ring like the signed-out icon */}
              {user ? <UserAvatar seed={user.id} preset={user.avatarStyle} size={30} /> : <AccountIcon active size={32} />}
            </ArtButton>
            <ArtButton label="Notifications" badge={unread} onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications" size={22} color={colors.brand} />
            </ArtButton>
            <CartButton />
          </View>
        </View>
        {features.announcementOn && features.announcement ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.brandSoft, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 }}>
            <Ionicons name="megaphone-outline" size={16} color={colors.brandPressed} />
            <Txt variant="label" color={colors.ink} style={{ flex: 1, fontSize: 13 }}>{features.announcement}</Txt>
          </View>
        ) : null}
        <Pressable
          onPress={() => shop({ focus: "1" })}
          style={{ height: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}
        >
          <Ionicons name="search" size={18} color={colors.ink2} />
          <Txt variant="body" color={colors.faint}>Search products, brands and categories</Txt>
        </Pressable>
        <View style={[ui.row, { gap: space.sm }]}>
          {features.whatsapp && (
            <Pressable
              onPress={() => openWhatsApp(support.whatsapp, ORDER_MESSAGE)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: pressed ? colors.panelPressed : colors.panel,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingHorizontal: 14,
              })}
            >
              <Ionicons name="logo-whatsapp" size={19} color={colors.brand} />
              <Txt variant="label" color={colors.white} numberOfLines={1} style={{ fontSize: 14 }}>WhatsApp</Txt>
            </Pressable>
          )}
          {[
            { icon: "pricetag" as const, label: "Deals", onPress: () => shop({ featured: "1" }) },
            { icon: "storefront" as const, label: "Stores", onPress: () => router.push("/stores") },
          ].map((b) => (
            <Pressable
              key={b.label}
              onPress={b.onPress}
              style={({ pressed }) => ({ height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 6 })}
            >
              <Ionicons name={b.icon} size={15} color={colors.brandPressed} />
              <Txt variant="label" style={{ fontSize: 13.5 }}>{b.label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <HeroCarousel width={contentWidth} />

      {/* Marketplace stores */}
      <View>
        <View style={{ paddingHorizontal: gutter }}>
          <SectionHeader title="Stores on Sotechy" action="All stores" onAction={() => router.push("/stores")} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={Math.min(contentWidth * 0.78, 290) + space.md} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
          {stores.map((s) => (
            <FeaturedStoreCard key={s.slug} store={s} width={Math.min(contentWidth * 0.78, 290)} />
          ))}
        </ScrollView>
      </View>

      {/* Deals of the day */}
      {deals.length > 0 && (
        <View style={{ marginHorizontal: gutter, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line }}>
          <View style={[ui.between, { marginBottom: space.lg }]}>
            <View>
              <Txt variant="title" style={{ fontFamily: fonts.displayHeavy }}>Deals of the day</Txt>
              <Txt variant="small">While stock lasts</Txt>
            </View>
            <Pressable onPress={() => shop({ featured: "1" })} style={{ height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.inverse, justifyContent: "center" }}>
              <Ionicons name="arrow-forward" size={18} color={colors.onInverse} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {deals.slice(0, 3).map((p) => (
              <DealBubble key={p.id} product={p} size={bubbleSize} />
            ))}
          </View>
        </View>
      )}

      {/* How store tokens work */}
      <View style={{ marginHorizontal: gutter, borderRadius: radius.xl, backgroundColor: colors.brandSoft, padding: space.lg, gap: space.md }}>
        <View style={ui.between}>
          <Txt variant="title" style={{ fontFamily: fonts.displayHeavy, fontSize: 21 }}>Earn while you shop</Txt>
          <Illo name="sparkle" size={30} />
        </View>
        {[
          { illo: "coin" as const, title: "1 token for every ₦1", text: "Each store gives its own token, like $XENA. Spend it there like cash." },
          { illo: "tag" as const, title: "+10% $SOTECHY at other stores", text: "Spend $SOTECHY at any Sotechy store." },
          { illo: "heart" as const, title: "Up to 10% more for a review", text: "Review what you bought, with a photo for the full 10%." },
        ].map((x) => (
          <View key={x.title} style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Illo name={x.illo} size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label">{x.title}</Txt>
              <Txt variant="small" color={colors.ink2}>{x.text}</Txt>
            </View>
          </View>
        ))}
      </View>

      {/* Categories */}
      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title="Everything for your home & office" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, marginHorizontal: -2 }}>
          {tops.map((c) => (
            <CircleLink key={c.id} label={c.name} image={c.imageUrl} icon={productIcon(c.name)} onPress={() => shop({ category: c.slug })} />
          ))}
          <CircleLink label="Deals" illo="tag" onPress={() => shop({ featured: "1" })} />
          <CircleLink label="New in" illo="sparkle" onPress={() => shop({ sort: "newest" })} />
          <CircleLink label="Stores" illo="pin" onPress={() => headOffice && Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${headOffice.address}, ${headOffice.city}, Nigeria`)}`)} />
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
        onPress={async () => {
          if (!features.whatsapp || !(await openWhatsApp(support.whatsapp, "Hello Sotechy, I'm looking for: "))) router.push("/support");
        }}
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
          { illo: "store" as const, label: "Pick up\nin store" },
          { illo: "bike" as const, label: "Fast local\ndelivery" },
          { illo: "shield" as const, label: "Genuine\nwarranty" },
          { illo: "wallet" as const, label: "Bank, online\n& crypto" },
        ].map((item) => (
          <View key={item.label} style={{ alignItems: "center", gap: 6, flex: 1 }}>
            <Illo name={item.illo} size={34} />
            <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>{item.label}</Txt>
          </View>
        ))}
      </View>
    </ScrollView>
    {features.liveChat && <SupportChat teaser bottomOffset={tabInset} />}
    </View>
  );
}
