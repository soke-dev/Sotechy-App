import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageSource } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Banner as AdminBanner } from "@sotechy/shared";
import Svg, { Circle, Path } from "react-native-svg";
import { useFeatures, useStoreConfig } from "@/lib/store-config";
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
  /** Drawn by its own design instead of the shared layout */
  design?: "earn";
}

/** "Earn while you shop": always the first slide while it's switched on (Admin → App switches) */
const earnSlide: Slide = {
  bg: colors.ink,
  fg: colors.white,
  accent: colors.brandYellow,
  overline: "Store tokens",
  title: "Earn while\nyou shop",
  subtitle: "1 token for every ₦1. Spend them like cash at that store.",
  cta: "See your wallet",
  circle: colors.brand,
  action: "/wallet",
  design: "earn",
};

/** A four-point sparkle */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

/** A gold coin seen a little from the side */
function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rim = r * 0.22;
  return (
    <>
      <Circle cx={cx} cy={cy + rim} r={r} fill="#C97A0A" />
      <Circle cx={cx} cy={cy} r={r} fill={colors.brandYellow} />
      <Circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke="#E9A21A" strokeWidth={r * 0.1} />
      <Path d={`M${cx - r * 0.5} ${cy - r * 0.55} q ${r * 0.3} ${-r * 0.25} ${r * 0.75} ${-r * 0.2}`} stroke="#FFF3C4" strokeWidth={r * 0.12} strokeLinecap="round" fill="none" opacity={0.9} />
    </>
  );
}

/** The earn banner: a stack of gold coins and sparkles on dark, with the two extras as chips */
function EarnBanner({ s, width, height }: { s: Slide; width: number; height: number }) {
  const r = height * 0.17;
  const cx = width * 0.78;
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <LinearGradient colors={["rgba(247,147,30,0.0)", "rgba(247,147,30,0.28)"]} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
        <Circle cx={cx} cy={height * 0.5} r={height * 0.46} fill={colors.brand} opacity={0.22} />
        <Circle cx={cx} cy={height * 0.5} r={height * 0.33} fill={colors.brand} opacity={0.25} />
        <Coin cx={cx - r * 0.9} cy={height * 0.64} r={r * 0.8} />
        <Coin cx={cx + r * 0.85} cy={height * 0.58} r={r * 0.85} />
        <Coin cx={cx} cy={height * 0.4} r={r} />
        <Path d={sparkle(cx + r * 1.7, height * 0.2, r * 0.32)} fill={colors.brandYellow} />
        <Path d={sparkle(cx - r * 1.6, height * 0.24, r * 0.2)} fill={colors.white} opacity={0.8} />
        <Path d={sparkle(cx + r * 0.3, height * 0.86, r * 0.18)} fill={colors.white} opacity={0.6} />
      </Svg>
      <View style={{ flex: 1, width: "62%", paddingHorizontal: space.xl, paddingVertical: space.lg, justifyContent: "space-between" }}>
        <View style={{ gap: 4 }}>
          <Txt variant="caption" color={colors.brandYellow} style={{ fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 11 }}>{s.overline}</Txt>
          <Txt color={colors.white} style={{ fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 26 }}>{s.title}</Txt>
          <Txt variant="caption" color="rgba(255,255,255,0.72)" numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 15 }}>{s.subtitle}</Txt>
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {["+10% for a review", "+10% $SOTECHY"].map((t) => (
              <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)" }}>
                <Txt color={colors.white} numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 10 }}>{t}</Txt>
              </View>
            ))}
          </View>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Txt variant="label" color={colors.ink} style={{ fontSize: 13 }}>{s.cta}</Txt>
            <Ionicons name="arrow-forward" size={14} color={colors.ink} />
          </View>
        </View>
      </View>
    </View>
  );
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
  if (s.design === "earn") return <EarnBanner s={s} width={width} height={height} />;
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

/** Where an admin banner (or pop-up) link goes: a screen, or a function for web links and "nothing" */
export function bannerLink(linkType: AdminBanner["linkType"], linkValue: string | null): Slide["action"] {
  return linkType === "category" && linkValue
    ? { pathname: "/shop", params: { category: linkValue } }
    : linkType === "product" && linkValue
      ? { pathname: "/product/[id]", params: { id: linkValue } }
      : linkType === "deals"
        ? { pathname: "/shop", params: { featured: "1" } }
        : linkType === "store" && linkValue
          ? { pathname: "/store/[slug]", params: { slug: linkValue } }
          : linkType === "stores"
            ? "/stores"
            : linkType === "wallet"
              ? "/wallet"
              : linkType === "url" && linkValue?.startsWith("https://")
                ? () => Linking.openURL(linkValue)
                : () => {};
}

function fromAdmin(b: AdminBanner): Slide {
  const action = bannerLink(b.linkType, b.linkValue);
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
  const { earnBanner } = useFeatures();
  const slides = [...(earnBanner ? [earnSlide] : []), ...(adminBanners?.length ? adminBanners.map(fromAdmin) : builtInSlides.filter((b) => !earnBanner || b.action !== "/wallet"))];

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
