import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import { Button, ErrorView, IconButton, Loading, Pill, SectionHeader, Txt, ui } from "@/components/ui";
import { api, DEMO_MODE } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { demoMedia } from "@/lib/mock-api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { count } = useCart();
  const contentWidth = Math.min(width, 720) - gutter * 2;

  const { data, error, loading, reload } = useAsync(async () => {
    const [config, categories, featured, latest] = await Promise.all([
      api.storeConfig(),
      api.categories(),
      api.products({ featured: true }),
      api.products({ sort: "newest" }),
    ]);
    return { config, categories, featured, latest: latest.slice(0, 6) };
  });

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const movePromo = data.config.promotions.find((p) => p.cryptoAsset === "MOVE");
  const headOffice = data.config.branches[0];
  const half = (contentWidth - space.md) / 2;

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: space.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={[ui.between, { paddingHorizontal: gutter }]}>
        <Image source={require("../../../assets/brand/light-logo-small.png")} style={{ width: 112, height: 48 }} contentFit="contain" contentPosition="left" />
        <View style={ui.row}>
          {DEMO_MODE && <Pill label="Demo data" tone="warning" />}
          <IconButton icon="bag-handle-outline" badge={count} onPress={() => router.push("/cart")} />
        </View>
      </View>

      {/* Search */}
      <Pressable
        onPress={() => router.push({ pathname: "/shop", params: { focus: "1" } })}
        style={{ marginHorizontal: gutter, marginTop: space.md, height: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}
      >
        <Ionicons name="search" size={18} color={colors.ink2} />
        <Txt variant="body" color={colors.faint}>Search phones, TVs, generators…</Txt>
      </Pressable>

      {/* Banners */}
      <View style={{ marginTop: space.lg }}>
        <HeroCarousel width={contentWidth} />
      </View>

      {/* Categories */}
      <View style={{ marginTop: space.xl }}>
        <View style={{ paddingHorizontal: gutter }}>
          <SectionHeader title="Shop by category" action="All" onAction={() => router.push("/shop")} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
          {data.categories.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: "/shop", params: { category: c.slug } })} style={{ width: 92, gap: 8 }}>
              <View style={{ width: 92, height: 92, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceAlt }}>
                {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ flex: 1 }} contentFit="cover" /> : null}
              </View>
              <Txt variant="caption" color={colors.ink2} numberOfLines={2} style={{ textAlign: "center" }}>
                {c.name}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* $MOVE offer */}
      {movePromo && (
        <View style={{ marginHorizontal: gutter, marginTop: space.xl, borderRadius: radius.xl, backgroundColor: colors.ink, padding: space.xl, flexDirection: "row", alignItems: "center", gap: space.lg, overflow: "hidden" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="overline" color={colors.brandYellow}>Crypto checkout</Txt>
            <Txt variant="heading" color={colors.white}>Pay with $MOVE and save on eligible orders</Txt>
            <Txt variant="small" color="#BDB3A8">Bank transfer and online payment also available.</Txt>
          </View>
          <View style={{ alignItems: "center" }}>
            <Txt variant="overline" color={colors.white}>Up to</Txt>
            <Txt variant="display" color={colors.brandYellow} style={{ fontSize: 40, lineHeight: 44 }}>10%</Txt>
            <Txt variant="overline" color={colors.white}>off</Txt>
          </View>
        </View>
      )}

      {/* Featured */}
      {data.featured.length > 0 && (
        <View style={{ marginTop: space.xxl }}>
          <View style={{ paddingHorizontal: gutter }}>
            <SectionHeader title="Featured deals" action="See all" onAction={() => router.push("/shop")} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
            {data.featured.map((p) => (
              <ProductCard key={p.id} product={p} width={158} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Brands */}
      <View style={{ paddingHorizontal: gutter, marginTop: space.xxl }}>
        <SectionHeader title="Brands we stock" />
        <View style={[ui.row, { gap: space.md }]}>
          {demoMedia.brands.map((src, i) => (
            <View key={i} style={{ flex: 1, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg }}>
              <Image source={src} style={{ width: "100%", height: 30 }} contentFit="contain" />
            </View>
          ))}
        </View>
      </View>

      {/* New arrivals */}
      <View style={{ paddingHorizontal: gutter, marginTop: space.xxl }}>
        <SectionHeader title="New arrivals" action="See all" onAction={() => router.push({ pathname: "/shop", params: { sort: "newest" } })} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, rowGap: space.xl }}>
          {data.latest.map((p) => (
            <ProductCard key={p.id} product={p} width={half} />
          ))}
        </View>
      </View>

      {/* Store */}
      {headOffice && (
        <View style={{ marginHorizontal: gutter, marginTop: space.xxl, borderRadius: radius.xl, overflow: "hidden", height: Math.round(contentWidth * 0.72) }}>
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
      <View style={[ui.row, { marginHorizontal: gutter, marginTop: space.xxl, justifyContent: "space-between" }]}>
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
