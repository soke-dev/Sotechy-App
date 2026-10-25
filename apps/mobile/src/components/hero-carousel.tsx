import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { demoMedia } from "@/lib/mock-api";
import { colors, gutter, radius, space } from "@/lib/theme";
import { Txt } from "./ui";

type Slide =
  | { kind: "photo"; image: ImageSource; overline: string; title: string; caption: string; tone: "dark" | "light" }
  | { kind: "flyer"; image: ImageSource; background: string };

// Sotechy's own flyers are shown whole (never cropped) on a matching background.
const slides: Slide[] = [
  { kind: "photo", image: demoMedia.storeInside, overline: "Benin City", title: "Walk in.\nGet Techy.", caption: "Order online, pick up the same day", tone: "dark" },
  { kind: "flyer", image: demoMedia.flyerWalkIn, background: "#F1AA36" },
  { kind: "photo", image: demoMedia.appliances, overline: "Home appliances", title: "Cookers, fridges\n& more", caption: "Trusted brands with warranty", tone: "light" },
  { kind: "flyer", image: demoMedia.flyerMaxi, background: "#202020" },
];

export function HeroCarousel({ width }: { width: number }) {
  const [index, setIndex] = useState(0);
  const height = Math.round(width * 0.62);

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
          <Pressable key={i} onPress={() => router.push("/shop")} style={{ width, height, borderRadius: radius.xl, overflow: "hidden", backgroundColor: s.kind === "flyer" ? s.background : colors.surface }}>
            {s.kind === "flyer" ? (
              <Image source={s.image} style={{ flex: 1 }} contentFit="contain" />
            ) : (
              <>
                <Image source={s.image} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition={s.tone === "light" ? "right" : "center"} />
                <LinearGradient
                  colors={s.tone === "dark" ? ["rgba(23,18,14,0.85)", "rgba(23,18,14,0.1)"] : ["rgba(255,255,255,0.97)", "rgba(255,255,255,0)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 0.85, y: 0.5 }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ flex: 1, justifyContent: "flex-end", padding: space.xl, gap: 6, maxWidth: "70%" }}>
                  <Txt variant="overline" color={s.tone === "dark" ? colors.brandYellow : colors.brandPressed}>{s.overline}</Txt>
                  <Txt variant="title" color={s.tone === "dark" ? colors.white : colors.ink} style={{ fontSize: 26, lineHeight: 29 }}>{s.title}</Txt>
                  <Txt variant="small" color={s.tone === "dark" ? "#E2DAD1" : colors.ink2}>{s.caption}</Txt>
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
