import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { directionsUrl, formatNaira, type Category } from "@sotechy/shared";
import { CartButton } from "@/components/cart-button";
import { HeroCarousel } from "@/components/hero-carousel";
import { HomeSearch } from "@/components/home-search";
import { MenuButton } from "@/components/menu";
import { ProductRail } from "@/components/product-rail";
import { SupportChat } from "@/components/support-chat";
import { MaintenanceNotice } from "@/components/maintenance";
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
import { Illo } from "@/components/illustrations";

/** A compact category chip: a small round picture or icon, then the name */
function CategoryTile({ label, onPress, image, icon }: { label: string; onPress: () => void; image?: string | null; icon: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 5, paddingRight: 14, height: 44, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {image ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Ionicons name={icon} size={17} color={colors.brandPressed} />}
      </View>
      <Txt variant="label" numberOfLines={1} style={{ fontSize: 13.5 }}>{label}</Txt>
    </Pressable>
  );
}

/** The kinds of stores on the marketplace, beyond Sotechy's gadgets (they open Stores, filtered) */
const STORE_KINDS: { kind: string; label: string; icon: IconName }[] = [
  { kind: "Fashion & clothing", label: "Fashion", icon: "shirt-outline" },
  { kind: "Beauty & makeup", label: "Beauty & makeup", icon: "color-palette-outline" },
  { kind: "Groceries", label: "Groceries", icon: "nutrition-outline" },
  { kind: "Furniture & home decor", label: "Home & decor", icon: "bed-outline" },
  { kind: "Shoes & bags", label: "Shoes & bags", icon: "footsteps-outline" },
  { kind: "Hair, wigs & extensions", label: "Hair & wigs", icon: "cut-outline" },
  { kind: "Skincare & personal care", label: "Skincare", icon: "water-outline" },
  { kind: "Perfume & fragrance", label: "Perfume", icon: "flower-outline" },
  { kind: "Jewellery & watches", label: "Jewellery & watches", icon: "diamond-outline" },
  { kind: "Food & restaurants", label: "Food", icon: "fast-food-outline" },
  { kind: "Drinks", label: "Drinks", icon: "wine-outline" },
  { kind: "Kitchen & cookware", label: "Kitchen", icon: "restaurant-outline" },
  { kind: "Home appliances", label: "Appliances", icon: "snow-outline" },
  { kind: "Power & solar", label: "Power & solar", icon: "sunny-outline" },
  { kind: "Baby & kids", label: "Baby & kids", icon: "happy-outline" },
  { kind: "Toys & games", label: "Toys", icon: "game-controller-outline" },
  { kind: "Health & pharmacy", label: "Health", icon: "medkit-outline" },
  { kind: "Sports & fitness", label: "Sports & fitness", icon: "barbell-outline" },
  { kind: "Books & stationery", label: "Books", icon: "book-outline" },
  { kind: "Auto parts & accessories", label: "Auto parts", icon: "car-outline" },
  { kind: "Building & hardware", label: "Hardware", icon: "hammer-outline" },
  { kind: "Agriculture & farm produce", label: "Farm produce", icon: "leaf-outline" },
  { kind: "Pets", label: "Pets", icon: "paw-outline" },
  { kind: "Gifts & crafts", label: "Gifts & crafts", icon: "gift-outline" },
];

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

/** The floating live chat bubble on Home (off for now) */
const HOME_CHAT_BUBBLE = false;

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
        <MaintenanceNotice />
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
        <HomeSearch />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={Math.min(contentWidth * 0.7, 260) + space.md} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
          {byFeatured([SOTECHY_STORE, ...marketStores]).map((s) => (
            <FeaturedStoreCard key={s.slug} store={s} width={Math.min(contentWidth * 0.7, 260)} />
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
      <View style={{ marginHorizontal: gutter, borderRadius: radius.xl, backgroundColor: colors.brandSoft, padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Illo name="coin" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="title" style={{ fontFamily: fonts.displayHeavy, fontSize: 19 }}>Earn while you shop</Txt>
            <Txt variant="small" color={colors.ink2}>1 store token for every ₦1 you spend. Use them like cash on your next order at that store.</Txt>
          </View>
        </View>
        {/* The extras, small, side by side on one row ($SOTECHY gets the wider pill) */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[
            { icon: "star" as IconName, text: "+10% for a review", flex: 2 },
            { icon: "add-circle" as IconName, text: "+10% $SOTECHY on any order", flex: 3 },
          ].map((x) => (
            <View key={x.text} style={{ flex: x.flex, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface }}>
              <Ionicons name={x.icon} size={12} color={colors.brandPressed} />
              <Txt variant="caption" color={colors.ink} numberOfLines={1} style={{ flexShrink: 1, fontSize: 11, fontFamily: fonts.medium }}>{x.text}</Txt>
            </View>
          ))}
        </View>
      </View>

      {/* Categories */}
      <View>
        <View style={{ paddingHorizontal: gutter }}>
          <SectionHeader title="Shop by category" action="All stores" onAction={() => router.push("/stores")} />
        </View>
        {/* Sotechy's own categories, then every kind of store on the marketplace, in two rows that scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter }}>
          <View style={{ gap: space.md }}>
            {[0, 1].map((row) => {
              const all = [
                ...tops.map((c) => ({ key: c.id, label: c.name, image: c.imageUrl, icon: productIcon(c.name), onPress: () => shop({ category: c.slug }) })),
                ...STORE_KINDS.map((k) => ({ key: k.kind, label: k.label, image: null, icon: k.icon, onPress: () => router.push({ pathname: "/stores", params: { kind: k.kind } }) })),
                // Last: everything else, in Shop
                { key: "more", label: "Much more", image: null, icon: "apps-outline" as IconName, onPress: () => shop({}) },
              ];
              return (
                <View key={row} style={{ flexDirection: "row", gap: space.sm }}>
                  {all.filter((_, i) => i % 2 === row).map((c) => (
                    <CategoryTile key={c.key} label={c.label} image={c.image} icon={c.icon} onPress={c.onPress} />
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <MarketRail title="Fresh from the store" subtitle="Verified shops, each with its own token" items={storeItems} onSeeAll={() => router.push("/stores")} />

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

      {/* Sotechy head office: a photo of the shop, darkened at the bottom for the text */}
      {headOffice && (
        <View style={{ marginHorizontal: gutter, borderRadius: radius.xl, overflow: "hidden", height: Math.round(contentWidth * 1.05), backgroundColor: colors.panel }}>
          <Image source={require("../../../assets/brand/sotechy-office.jpg")} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={["transparent", "rgba(23,18,14,0.55)", "rgba(23,18,14,0.92)"]} locations={[0.3, 0.6, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ flex: 1, justifyContent: "flex-end", padding: space.xl, gap: 6 }}>
            <Txt variant="overline" color={colors.brandYellow}>Visit Sotechy head office</Txt>
            <Txt variant="title" color={colors.white}>{headOffice.address}, {headOffice.city}</Txt>
            {headOffice.openingHours ? <Txt variant="small" color="#E2DAD1">{headOffice.openingHours} · Pick up online orders here</Txt> : null}
            <Button
              title="Get directions"
              icon="navigate"
              size="sm"
              variant="outline"
              style={{ alignSelf: "flex-start", marginTop: space.sm }}
              onPress={() => Linking.openURL(directionsUrl(`SoTechy, ${headOffice.address}, ${headOffice.city}, Nigeria`, headOffice.mapUrl))}
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
          { illo: "wallet" as const, label: "Pay by bank,\napp or tokens" },
        ].map((item) => (
          <View key={item.label} style={{ alignItems: "center", gap: 6, flex: 1 }}>
            <Illo name={item.illo} size={34} />
            <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>{item.label}</Txt>
          </View>
        ))}
      </View>
    </ScrollView>
    {/* Live chat bubble hidden on Home for now (chat is still in the menu and on orders) */}
    {HOME_CHAT_BUBBLE && features.liveChat && <SupportChat teaser bottomOffset={tabInset} />}
    </View>
  );
}
