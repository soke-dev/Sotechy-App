import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageSource } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Banner as AdminBanner } from "@sotechy/shared";
import { useStoreConfig } from "@/lib/store-config";
import { colors as theme, fonts, gutter, lightPalette, radius, space } from "@/lib/theme";

// Banners are designed artwork: they keep the same colours in light and dark mode.
const colors = lightPalette;
import { Txt } from "./ui";

/** A product picture placed on the banner; sizes and offsets are fractions of the banner. */
interface Art {
  source: ImageSource;
  w: number;
  h: number;
  right: number;
  bottom: number;
}

interface Slide {
  bg: string;
  fg: string;
  accent: string;
  overline: string;
  title: string;
  subtitle: string;
  cta: string;
  circle: string;
  action: Href | (() => void);
  /** cut-out product images composed over the circle */
  art?: Art[];
  /** a photo cropped inside the circle */
  photo?: ImageSource;
  /** big text inside the circle */
  badge?: string;
  /** draw a hairline border (for light backgrounds) */
  outlined?: boolean;
  /** An image-only banner: the picture fills it, with optional words and button over it */
  cover?: ImageSource;
}

// Shown only while there are no banners at all in Admin → Home banners (they're added there as real banners)
const builtInSlides: Slide[] = [
  {
    bg: colors.ink,
    fg: colors.white,
    accent: colors.brandYellow,
    overline: "Verified stores",
    title: "Shop stores\nyou can trust",
    subtitle: "Every store is checked by Sotechy",
    cta: "Browse stores",
    circle: colors.brand,
    action: "/stores",
    photo: require("../../assets/brand/sotechy-icon-512.png"),
  },
  {
    bg: colors.brandSoft,
    fg: colors.ink,
    accent: colors.brandPressed,
    overline: "Store tokens",
    title: "Earn on every\norder",
    subtitle: "1 token per ₦1, spend it like cash",
    cta: "See your wallet",
    circle: colors.brandYellow,
    action: "/wallet",
    badge: "$",
    outlined: true,
  },
];

/** A picture that is the whole banner; the title and button sit over a soft shade when there are any */
function ImageBanner({ s }: { s: Slide }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }}>
      <Image source={s.cover} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} />
      {s.title || s.cta ? (
        <LinearGradient colors={["rgba(23,18,14,0)", "rgba(23,18,14,0.72)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.lg, gap: 8 }}>
          {s.title ? (
            <Txt variant="title" color={colors.white} numberOfLines={2} style={{ fontFamily: fonts.displayHeavy, fontSize: 22, lineHeight: 25 }}>
              {s.title}
            </Txt>
          ) : null}
          {s.cta ? (
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Txt variant="label" color={colors.ink} style={{ fontSize: 13 }}>{s.cta}</Txt>
              <Ionicons name="arrow-forward" size={14} color={colors.ink} />
            </View>
          ) : null}
        </LinearGradient>
      ) : null}
    </View>
  );
}

function Banner({ s, width, height }: { s: Slide; width: number; height: number }) {
  if (s.cover) return <ImageBanner s={s} />;
  const circle = Math.round(height * 0.88);
  const darkBg = s.bg === colors.ink || s.bg === colors.brand;
  return (
    <View style={{ flex: 1, backgroundColor: s.bg }}>
      {/* decorative ring for depth */}
      <View style={{ position: "absolute", right: -circle * 0.32, top: -circle * 0.2, width: circle * 1.25, height: circle * 1.25, borderRadius: circle, borderWidth: 1.5, borderColor: darkBg ? "rgba(255,255,255,0.08)" : "rgba(23,18,14,0.06)" }} />
      <View
        style={{
          position: "absolute",
          right: -circle * 0.16,
          top: (height - circle) / 2,
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          backgroundColor: s.circle,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {s.photo ? <Image source={s.photo} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
        {s.badge ? (
          <Txt variant="display" color={colors.brandYellow} style={{ fontSize: circle * 0.3, lineHeight: circle * 0.34, marginRight: circle * 0.12 }}>
            {s.badge}
          </Txt>
        ) : null}
      </View>
      {s.art?.map((a, i) => (
        <Image key={i} source={a.source} style={{ position: "absolute", right: width * a.right, bottom: height * a.bottom, width: width * a.w, height: height * a.h }} contentFit="contain" />
      ))}
      <View style={{ width: "56%", padding: space.xl, justifyContent: "space-between", flex: 1 }}>
        <View style={{ gap: 6 }}>
          <Txt variant="overline" color={s.accent}>{s.overline}</Txt>
          <Txt variant="title" color={s.fg} style={{ fontFamily: fonts.displayHeavy, fontSize: 25, lineHeight: 27 }}>{s.title}</Txt>
          <Txt variant="small" color={s.fg} style={{ opacity: 0.8 }}>{s.subtitle}</Txt>
        </View>
        {s.cta ? (
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: s.fg === colors.white ? colors.white : colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Txt variant="label" color={s.fg === colors.white ? colors.ink : colors.white} style={{ fontSize: 13 }}>{s.cta}</Txt>
            <Ionicons name="arrow-forward" size={14} color={s.fg === colors.white ? colors.ink : colors.white} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Admin colour styles mapped onto the banner artwork. */
const STYLES: Record<AdminBanner["style"], Pick<Slide, "bg" | "fg" | "accent" | "circle" | "outlined">> = {
  dark: { bg: colors.ink, fg: colors.white, accent: colors.brandYellow, circle: colors.brand },
  orange: { bg: colors.brand, fg: colors.ink, accent: colors.ink, circle: colors.brandYellow },
  light: { bg: colors.brandSoft, fg: colors.ink, accent: colors.brandPressed, circle: colors.brand, outlined: true },
};

function fromAdmin(b: AdminBanner): Slide {
  const action: Slide["action"] =
    b.linkType === "category" && b.linkValue
      ? { pathname: "/shop", params: { category: b.linkValue } }
      : b.linkType === "product" && b.linkValue
        ? { pathname: "/product/[id]", params: { id: b.linkValue } }
        : b.linkType === "deals"
          ? { pathname: "/shop", params: { featured: "1" } }
          : b.linkType === "store" && b.linkValue
            ? { pathname: "/store/[slug]", params: { slug: b.linkValue } }
            : b.linkType === "stores"
              ? "/stores"
              : b.linkType === "wallet"
                ? "/wallet"
          : b.linkType === "url" && b.linkValue?.startsWith("https://")
            ? () => Linking.openURL(b.linkValue!)
            : () => {};
  return {
    ...STYLES[b.style],
    overline: b.eyebrow ?? "",
    title: b.title ?? "",
    subtitle: b.subtitle ?? "",
    cta: b.ctaLabel ?? "",
    action,
    ...(b.layout === "image" && b.imageUrl
      ? { cover: { uri: b.imageUrl }, outlined: false }
      : { art: b.imageUrl ? [{ source: { uri: b.imageUrl }, w: 0.5, h: 0.7, right: 0.02, bottom: 0.1 }] : undefined }),
  };
}

const AUTOPLAY_MS = 5000;

export function HeroCarousel({ width }: { width: number }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const pausedUntil = useRef(0);
  const height = Math.round(width * 0.52);
  const step = width + space.md;
  const adminBanners = useStoreConfig().config?.banners;
  const slides = adminBanners?.length ? adminBanners.map(fromAdmin) : builtInSlides;

  // Auto-advance; pauses for a while after the user swipes.
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setIndex((i) => {
        const next = (i + 1) % Math.max(1, slides.length);
        scroller.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [step, slides.length]);

  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        snapToInterval={step}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + AUTOPLAY_MS * 2;
        }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
      >
        {slides.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => (typeof s.action === "function" ? s.action() : router.push(s.action))}
            style={{ width, height, borderRadius: radius.xl, overflow: "hidden", borderWidth: s.outlined ? 1 : 0, borderColor: colors.line }}
          >
            <Banner s={s} width={width} height={height} />
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: space.md }}>
        {slides.map((_, i) => (
          <View key={i} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: 3, backgroundColor: i === index ? theme.ink : theme.line }} />
        ))}
      </View>
    </View>
  );
}
