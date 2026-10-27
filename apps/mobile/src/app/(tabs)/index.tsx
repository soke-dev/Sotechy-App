import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type Category } from "@sotechy/shared";
import { CartButton } from "@/components/cart-button";
import { HeroCarousel } from "@/components/hero-carousel";
import { MenuButton } from "@/components/menu";
import { ProductRail } from "@/components/product-rail";
import { SupportChat } from "@/components/support-chat";
import { useTabBarInset } from "@/components/tab-bar";
import { FeaturedStoreCard, MarketRail, openStore } from "@/components/store-bits";
import { AccountIcon } from "@/components/tab-icons";
import { UserAvatar } from "@/components/user-avatar";
import { ArtButton, Button, discountPercent, ErrorView, IconButton, Loading, productIcon, SectionHeader, Txt, ui, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { byFeatured, SOTECHY_STORE, tileColor, toStoreProduct, useStores, type Img as MarketImg } from "@/lib/marketplace";
import { useStoreNotifications } from "@/lib/store-notifications";
import { useFeatures } from "@/lib/store-config";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { openWhatsApp } from "@/lib/whatsapp";
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

/** One deal in "Deals of the day": from Sotechy's catalogue or a marketplace store */
interface Deal {
  key: string;
  name: string;
  price: number;
  compareAt: number | null;
  image: MarketImg | null;
  seller: string;
  tint: string;
  onPress: () => void;
}

function DealBubble({ deal, size }: { deal: Deal; size: number }) {
  const off = discountPercent(deal.price, deal.compareAt);
  return (
    <Pressable onPress={deal.onPress} style={{ width: size, alignItems: "center", gap: 4 }}>
      <View style={{ width: size, height: size }}>
        <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: deal.tint, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {deal.image ? (
            <Image source={deal.image} style={{ width: "74%", height: "74%" }} contentFit="contain" />
          ) : (
            <Ionicons name={productIcon(deal.name)} size={size * 0.4} color={colors.faint} />
          )}
        </View>
        {off > 0 && (
          <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: colors.inverse, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 2, borderColor: colors.surface }}>
            <Txt variant="caption" color={colors.onInverse} style={{ fontSize: 11 }}>-{off}%</Txt>
          </View>
        )}
      </View>
      <Txt variant="price" style={{ fontSize: 14 }}>{formatNaira(deal.price)}</Txt>
      <Txt variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>{deal.seller}</Txt>
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
  const { stores } = useStores();
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
  // The catalogue holds Sotechy's products and every approved store's
  const marketStores = byFeatured(stores ?? []);
  const storeOf = new Map(marketStores.map((st) => [st.slug, st]));
  const own = products.filter((p) => !p.storeSlug);
  const storeItems = products.flatMap((p) => {
    const store = p.storeSlug ? storeOf.get(p.storeSlug) : undefined;
    return store ? [{ store, product: toStoreProduct(p) }] : [];
  });
  const isDeal = (p: (typeof products)[number]) => discountPercent(p.minPrice, p.compareAtPrice) > 0 || p.isFeatured;
  const deals = own.filter(isDeal);
  const mixedDeals: Deal[] = products.filter(isDeal).map((d) => {
    const store = d.storeSlug ? storeOf.get(d.storeSlug) : undefined;
    return {
      key: d.id,
      name: d.name,
      price: d.minPrice,
      compareAt: d.compareAtPrice,
      image: d.imageUrl ? { uri: d.imageUrl } : null,
      seller: d.storeName ?? "Sotechy",
      tint: store ? tileColor(store.theme) : "#F1ECE5",
      onPress: () => router.push({ pathname: "/product/[id]", params: { id: d.slug } }),
    };
  });
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
          <Txt variant="body" color={colors.faint}>Search products, stores and brands</Txt>
        </Pressable>
        <View style={[ui.row, { gap: space.sm }]}>
          <Pressable
              onPress={() => router.push("/stores")}
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
              <Ionicons name="storefront" size={18} color={colors.brand} />
              <Txt variant="label" color={colors.white} numberOfLines={1} style={{ fontSize: 14 }}>Explore stores</Txt>
            </Pressable>
          {[
            { icon: "bag-handle" as const, label: "Shop", onPress: () => shop({}) },
            { icon: "pricetag" as const, label: "Deals", onPress: () => shop({ featured: "1" }) },
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
          {byFeatured([SOTECHY_STORE, ...marketStores]).map((s) => (
            <FeaturedStoreCard key={s.slug} store={s} width={Math.min(contentWidth * 0.78, 290)} />
          ))}
        </ScrollView>
      </View>

      {/* Deals of the day */}
      {mixedDeals.length > 0 && (
        <View style={{ marginHorizontal: gutter, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line }}>
          <View style={[ui.between, { marginBottom: space.lg }]}>
            <View>
              <Txt variant="title" style={{ fontFamily: fonts.displayHeavy }}>Deals of the day</Txt>
              <Txt variant="small">From Sotechy and stores on Sotechy</Txt>
            </View>
            <Pressable onPress={() => shop({ featured: "1" })} style={{ height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.inverse, justifyContent: "center" }}>
              <Ionicons name="arrow-forward" size={18} color={colors.onInverse} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {mixedDeals.slice(0, 3).map((d) => (
              <DealBubble key={d.key} deal={d} size={bubbleSize} />
            ))}
          </View>
        </View>
      )}

      {/* How store tokens work */}
      <View style={{ marginHorizontal: gutter, borderRadius: radius.xl, backgroundColor: colors.brandSoft, padding: space.lg, gap: space.md }}>
        <View style={ui.between}>
          <Txt variant="title" style={{ fontFamily: fonts.displayHeavy, fontSize: 21 }}>Earn while you shop</Txt>
          <Illo name="coin" size={30} />
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
        <SectionHeader title="Shop by category" action="All stores" onAction={() => router.push("/stores")} />
        {/* Eight shortcuts: Sotechy's top gadget categories, then the marketplace's other store types */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.lg, marginHorizontal: -2 }}>
          {tops.slice(0, 4).map((c) => (
            <CircleLink key={c.id} label={c.name} image={c.imageUrl} icon={productIcon(c.name)} onPress={() => shop({ category: c.slug })} />
          ))}
          <CircleLink label="Fashion" icon="shirt-outline" onPress={() => router.push({ pathname: "/stores", params: { kind: "Fashion & clothing" } })} />
          <CircleLink label="Beauty" icon="color-palette-outline" onPress={() => router.push({ pathname: "/stores", params: { kind: "Beauty & makeup" } })} />
          <CircleLink label="Groceries" icon="nutrition-outline" onPress={() => router.push({ pathname: "/stores", params: { kind: "Groceries" } })} />
          <CircleLink label="Home & decor" icon="bed-outline" onPress={() => router.push({ pathname: "/stores", params: { kind: "Furniture & home decor" } })} />
        </View>
      </View>

      <MarketRail title="Fresh from stores on Sotechy" subtitle="Verified shops, each with its own token" items={storeItems} onSeeAll={() => router.push("/stores")} />

      <ProductRail title="Top deals" subtitle="Sold by Sotechy" products={deals} dark onSeeAll={() => shop({ featured: "1" })} />

      {/* Sotechy's category rows take turns with a row from each marketplace store */}
      {tops.map((c, i) => {
        const st = marketStores[i];
        return (
          <View key={c.id} style={{ gap: space.xxl }}>
            <ProductRail
              title={c.name}
              products={own.filter((p) => topOf(categories, p.categoryId) === c.id)}
              dark={i % 3 === 2}
              subtitle={i % 3 === 2 ? "Sold by Sotechy, with warranty" : "Sold by Sotechy"}
              onSeeAll={() => shop({ category: c.slug })}
            />
            {st ? (
              <MarketRail
                title={`From ${st.name}`}
                subtitle={`Earn $${st.ticker} on every order`}
                items={storeItems.filter((x) => x.store.slug === st.slug)}
                dark={i % 3 === 1}
                onSeeAll={() => openStore(st.slug)}
              />
            ) : null}
          </View>
        );
      })}

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
          <LinearGradient colors={[colors.brand, "#17120E"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ position: "absolute", right: space.xl, top: space.xl }}>
            <Illo name="store" size={72} />
          </View>
          <View style={{ flex: 1, justifyContent: "flex-end", padding: space.xl, gap: 6 }}>
            <Txt variant="overline" color={colors.brandYellow}>Visit Sotechy&apos;s shop</Txt>
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
