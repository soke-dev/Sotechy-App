import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { demoMedia } from "@/lib/mock-api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { Txt } from "./ui";

// Banner slides. Copy and offers here are placeholders — later these should come from the admin.
type Slide =
  | {
      kind: "promo";
      bg: string;
      fg: string;
      accent: string;
      overline: string;
      title: string;
      subtitle: string;
      cta: string;
      href: Href;
      circle: string;
      /** cut-out product image shown over the circle */
      image?: ImageSource;
      /** photo cropped inside the circle */
      photo?: ImageSource;
      /** big text inside the circle instead of an image */
      badge?: string;
    }
  | { kind: "photo"; image: ImageSource; overline: string; title: string; caption: string; href: Href }
  | { kind: "flyer"; image: ImageSource; background: string };

const slides: Slide[] = [
  {
    kind: "promo",
    bg: colors.ink,
    fg: colors.white,
    accent: colors.brandYellow,
    overline: "Home appliance week",
    title: "Fridges, cookers\n& ACs",
    subtitle: "Up to 15% off selected items",
    cta: "Shop now",
    href: { pathname: "/shop", params: { category: "home-appliances" } },
    circle: colors.brand,
    image: demoMedia.cutoutHome,
  },
  {
    kind: "promo",
    bg: colors.brand,
    fg: colors.white,
    accent: colors.ink,
    overline: "Crypto checkout",
    title: "Pay with\n$MOVE",
    subtitle: "Save up to 10% on eligible orders",
    cta: "Start shopping",
    href: "/shop",
    circle: colors.ink,
    badge: "10%",
  },
  { kind: "photo", image: demoMedia.storeInside, overline: "Benin City", title: "Walk in.\nGet Techy.", caption: "Order online, pick up the same day", href: "/shop" },
  {
    kind: "promo",
    bg: colors.brandSoft,
    fg: colors.ink,
    accent: colors.brandPressed,
    overline: "Power solutions",
    title: "Power that\nkeeps going",
    subtitle: "Generators & stabilizers",
    cta: "Shop power",
    href: { pathname: "/shop", params: { category: "power-solutions" } },
    circle: colors.brand,
    photo: demoMedia.power,
  },
  { kind: "flyer", image: demoMedia.flyerWalkIn, background: "#F1AA36" },
];

function PromoSlide({ s, width, height }: { s: Extract<Slide, { kind: "promo" }>; width: number; height: number }) {
  const circle = Math.round(height * 0.86);
  return (
    <View style={{ flex: 1, backgroundColor: s.bg, flexDirection: "row" }}>
      <View style={{ position: "absolute", right: -circle * 0.18, top: (height - circle) / 2, width: circle, height: circle, borderRadius: circle / 2, backgroundColor: s.circle, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {s.photo ? <Image source={s.photo} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
        {s.badge ? (
          <Txt variant="display" color={colors.brandYellow} style={{ fontSize: circle * 0.3, lineHeight: circle * 0.34, marginRight: circle * 0.12 }}>
            {s.badge}
          </Txt>
        ) : null}
      </View>
      {s.image ? (
        <Image source={s.image} style={{ position: "absolute", right: 4, bottom: height * 0.1, width: width * 0.52, height: height * 0.72 }} contentFit="contain" />
      ) : null}
      <View style={{ width: "58%", padding: space.xl, justifyContent: "space-between" }}>
        <View style={{ gap: 6 }}>
          <Txt variant="overline" color={s.accent}>{s.overline}</Txt>
          <Txt variant="title" color={s.fg} style={{ fontFamily: fonts.displayHeavy, fontSize: 25, lineHeight: 27 }}>{s.title}</Txt>
          <Txt variant="small" color={s.fg} style={{ opacity: 0.8 }}>{s.subtitle}</Txt>
        </View>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: s.bg === colors.ink ? colors.white : colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Txt variant="label" color={s.bg === colors.ink ? colors.ink : colors.white} style={{ fontSize: 13 }}>{s.cta}</Txt>
          <Ionicons name="arrow-forward" size={14} color={s.bg === colors.ink ? colors.ink : colors.white} />
        </View>
      </View>
    </View>
  );
}

export function HeroCarousel({ width }: { width: number }) {
  const [index, setIndex] = useState(0);
  const height = Math.round(width * 0.52);

  return (
    <View>
      <ScrollView
        horizontal
        snapToInterval={width + space.md}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (width + space.md)))}
      >
        {slides.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => router.push(s.kind === "flyer" ? "/shop" : s.href)}
            style={{ width, height, borderRadius: radius.xl, overflow: "hidden", backgroundColor: s.kind === "flyer" ? s.background : colors.surface }}
          >
            {s.kind === "promo" && <PromoSlide s={s} width={width} height={height} />}
            {s.kind === "flyer" && <Image source={s.image} style={{ flex: 1 }} contentFit="contain" />}
            {s.kind === "photo" && (
              <>
                <Image source={s.image} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
                <LinearGradient colors={["rgba(23,18,14,0.88)", "rgba(23,18,14,0.05)"]} start={{ x: 0, y: 0.5 }} end={{ x: 0.9, y: 0.5 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ flex: 1, justifyContent: "flex-end", padding: space.xl, gap: 6, maxWidth: "70%" }}>
                  <Txt variant="overline" color={colors.brandYellow}>{s.overline}</Txt>
                  <Txt variant="title" color={colors.white} style={{ fontFamily: fonts.displayHeavy, fontSize: 25, lineHeight: 27 }}>{s.title}</Txt>
                  <Txt variant="small" color="#E2DAD1">{s.caption}</Txt>
                </View>
              </>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: space.md }}>
        {slides.map((_, i) => (
          <View key={i} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: 3, backgroundColor: i === index ? colors.ink : colors.line }} />
        ))}
      </View>
    </View>
  );
}
