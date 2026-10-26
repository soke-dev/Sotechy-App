// Each marketplace store's own brand mark and cover, drawn in its colours, so stores don't borrow
// Sotechy's shop photos. Sotechy keeps its real logo and shop photo. Real stores upload theirs from
// the merchant dashboard (Storefront → Branding).
import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import type { MarketStore } from "@/lib/marketplace";

/** The store's logo mark, filling a square */
export function BrandMark({ store, size }: { store: MarketStore; size: number }) {
  const t = store.theme;
  if (store.slug === "xena")
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={14} fill="#1E2433" />
        <Path d="M14 13 L34 35 M34 13 L14 35" stroke={t.accent} strokeWidth={6.5} strokeLinecap="round" />
        <Circle cx={37} cy={11} r={3} fill="#FFFFFF" />
      </Svg>
    );
  if (store.slug === "brighthome")
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={14} fill={t.accent} />
        <Path d="M10 23 L24 11 L38 23 V37 a2 2 0 0 1 -2 2 H12 a2 2 0 0 1 -2 -2 Z" fill="#FFFFFF" />
        <Path d="M26 19 L19 29 H24 L22 36 L29 26 H24 Z" fill="#FDB913" />
      </Svg>
    );
  if (store.slug === "kola")
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={14} fill={t.accent} />
        <G stroke="#FDB913" strokeWidth={2.6} strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return <Path key={a} d={`M${24 + Math.cos(r) * 12} ${20 + Math.sin(r) * 12} L${24 + Math.cos(r) * 16} ${20 + Math.sin(r) * 16}`} />;
          })}
        </G>
        <Circle cx={24} cy={20} r={8} fill="#FDB913" />
        <Path d="M25 26 L19 36 H24 L22 43 L30 32 H25 Z" fill="#FFFFFF" />
      </Svg>
    );
  // Sotechy and any store without drawn art: its uploaded logo on its colour
  return (
    <View style={{ width: size, height: size, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
      <Image source={store.logo} style={{ width: "76%", height: "76%" }} contentFit="contain" />
    </View>
  );
}

/** A wide banner for the store: its colours, a pattern, its name and a few of its products */
export function StoreCover({ store, style }: { store: MarketStore; style?: StyleProp<ViewStyle> }) {
  const t = store.theme;
  if (store.isSotechy) return <Image source={store.cover} style={[{ backgroundColor: t.hero }, style as object]} contentFit="cover" />;
  const items = store.products.slice(0, 3);
  return (
    <View style={[{ backgroundColor: t.hero, overflow: "hidden" }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute" }}>
        {/* soft dot grid */}
        <G fill="#FFFFFF" opacity={0.07}>
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 18 }).map((__, col) => <Circle key={`${row}-${col}`} cx={12 + col * 22} cy={12 + row * 22} r={1.6} />),
          )}
        </G>
        <Circle cx={330} cy={150} r={120} fill={t.accent} opacity={0.95} />
        <Circle cx={330} cy={150} r={150} fill="none" stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1.5} />
        <SvgText x={20} y={190} fontSize={64} fontWeight="800" fill="#FFFFFF" opacity={0.08}>
          {store.ticker}
        </SvgText>
      </Svg>
      {/* the store's products, arranged on the colour */}
      <View style={{ position: "absolute", right: "4%", bottom: "6%", width: "58%", height: "82%", flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end" }}>
        {items.map((it, i) => (
          <Image
            key={it.id}
            source={it.image}
            style={{ width: i === 1 ? "44%" : "34%", height: i === 1 ? "92%" : "70%", marginLeft: i ? "-6%" : 0, zIndex: i === 1 ? 2 : 1 }}
            contentFit="contain"
          />
        ))}
      </View>
    </View>
  );
}
