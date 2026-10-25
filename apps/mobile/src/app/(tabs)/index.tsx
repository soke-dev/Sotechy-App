import { router } from "expo-router";
import { useState } from "react";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { ProductCard } from "@/components/product-card";
import { Card, Chip, ErrorView, Input, Loading, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useAsync(async () => {
    const [config, categories, featured, latest] = await Promise.all([
      api.storeConfig(),
      api.categories(),
      api.products({ featured: true }),
      api.products({ sort: "newest" }),
    ]);
    return { config, categories, featured, latest: latest.slice(0, 8) };
  });

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const movePromo = data.config.promotions.find((p) => p.cryptoAsset === "MOVE");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Image source={require("../../../assets/brand/light-logo-small.png")} style={{ width: 120, height: 60 }} resizeMode="contain" />
      <Input
        placeholder="Search phones, laptops, appliances…"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => router.push({ pathname: "/shop", params: { q: query } })}
      />

      {movePromo && (
        <Card style={{ backgroundColor: colors.primary }}>
          <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 16 }}>{movePromo.name}</Text>
          <Text style={{ color: colors.primaryText }}>On eligible purchases paid with $MOVE.</Text>
        </Card>
      )}

      <SectionTitle>Shop by category</SectionTitle>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {data.categories.map((c) => (
          <Chip key={c.id} label={c.name} onPress={() => router.push({ pathname: "/shop", params: { category: c.slug } })} />
        ))}
      </View>

      {data.featured.length > 0 && (
        <>
          <SectionTitle>Featured</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {data.featured.map((p) => (
              <ProductCard key={p.id} product={p} width={170} />
            ))}
          </ScrollView>
        </>
      )}

      <SectionTitle>New arrivals</SectionTitle>
      <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
        {data.latest.map((p) => (
          <ProductCard key={p.id} product={p} width={170} />
        ))}
      </View>

      <SectionTitle>Visit our stores</SectionTitle>
      {data.config.branches.map((b) => (
        <Card key={b.id}>
          <Text style={{ fontWeight: "600" }}>{b.name}</Text>
          <Text style={styles.muted}>
            {b.address}, {b.city}
          </Text>
          {b.openingHours && <Text style={styles.muted}>{b.openingHours}</Text>}
        </Card>
      ))}

      <Card>
        <Text style={{ fontWeight: "600" }}>Delivery & pickup</Text>
        <Text style={styles.muted}>{data.config.delivery.note ?? "Order online and collect from a branch, or get it delivered."}</Text>
        <Text style={styles.muted}>{BUSINESS.headOffice}</Text>
      </Card>
    </ScrollView>
  );
}
