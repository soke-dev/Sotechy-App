// Pop-ups over Home, made in Admin → App pop-ups: one picture with buttons on it, or Sotechy's own design
// (colours, vector doodles, a picture as a sticker, a title and words). It springs up from the bottom as a
// floating sheet and can be swiped down. The newest live one this phone hasn't closed shows, once per app open.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { Popup } from "@sotechy/shared";
import { useStoreConfig } from "@/lib/store-config";
import { fonts, lightPalette as colors, space } from "@/lib/theme";
import { bannerLink } from "./hero-carousel";
import { useTabBarInset } from "./tab-bar";
import { tap, Txt } from "./ui";

const SEEN_KEY = "sotechy_popups_closed";
/** Only one pop-up an app open */
let shownThisOpen = false;
const native = Platform.OS !== "web";

// Designed pop-ups keep the same colours in light and dark mode, like the banners
const THEMES: Record<Popup["style"], { bg: string; fg: string; sub: string; doodle: string; accent: string; btnBg: string; btnFg: string }> = {
  orange: { bg: colors.brand, fg: colors.ink, sub: "rgba(23,18,14,0.78)", doodle: colors.ink, accent: colors.brandYellow, btnBg: colors.ink, btnFg: colors.white },
  dark: { bg: colors.ink, fg: colors.white, sub: "rgba(255,255,255,0.72)", doodle: colors.brandYellow, accent: colors.brand, btnBg: colors.brand, btnFg: colors.ink },
  light: { bg: colors.brandSoft, fg: colors.ink, sub: colors.ink2, doodle: colors.brand, accent: colors.brandYellow, btnBg: colors.ink, btnFg: colors.white },
};

/** A four-point sparkle */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

/** Shapes behind a designed pop-up: blobs, a dot grid, a squiggle and sparkles */
function Doodles({ width, height, color, accent }: { width: number; height: number; color: string; accent: string }) {
  const dots = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) dots.push(<Circle key={`${r}-${c}`} cx={width - 118 + c * 16} cy={height - 70 + r * 16} r={2.2} fill={color} opacity={0.18} />);
  return (
    <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      <Circle cx={-30} cy={height * 0.32} r={110} fill={accent} opacity={0.55} />
      <Circle cx={width + 20} cy={-10} r={90} fill={accent} opacity={0.35} />
      {dots}
      <Path d={`M24 ${height - 40} q 18 -26 36 0 t 36 0 t 36 0`} stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.22} />
      <Path d={sparkle(width - 52, 58, 14)} fill={color} opacity={0.85} />
      <Path d={sparkle(width - 82, 96, 7)} fill={color} opacity={0.5} />
      <Path d={sparkle(40, 48, 9)} fill={color} opacity={0.55} />
    </Svg>
  );
}

/** Sparkles over a picture pop-up's corner */
function PictureSparkles() {
  return (
    <Svg width={90} height={70} style={{ position: "absolute", top: 14, left: 14 }} pointerEvents="none">
      <Path d={sparkle(22, 24, 14)} fill="#FFFFFF" opacity={0.95} />
      <Path d={sparkle(52, 14, 7)} fill={colors.brandYellow} />
      <Path d={sparkle(46, 46, 5)} fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
}

export function HomePopup() {
  const popups = useStoreConfig().config?.popups;
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    if (shownThisOpen || !popups?.length) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(SEEN_KEY)
      .catch(() => null)
      .then((raw) => {
        const closed: string[] = raw ? JSON.parse(raw) : [];
        const next = popups.find((p) => !p.showOnce || !closed.includes(p.id));
        if (cancelled || !next || shownThisOpen) return;
        // After the app's opening has played, so it doesn't land on top of it
        t = setTimeout(() => {
          shownThisOpen = true;
          setPopup(next);
        }, 2600);
      });
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [popups]);

  if (!popup) return null;
  return <PopupSheet popup={popup} onGone={() => setPopup(null)} />;
}

function PopupSheet({ popup, onGone }: { popup: Popup; onGone: () => void }) {
  const insets = useSafeAreaInsets();
  // Sits just above the tab bar, so its icons stay in view
  const tabInset = useTabBarInset();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const width = Math.min(screenW - 24, 420);
  const [ratio, setRatio] = useState(4 / 5);
  const [artHeight, setArtHeight] = useState(420);
  const y = useRef(new Animated.Value(screenH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: native, damping: 18, stiffness: 160, mass: 0.9 }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: native }),
    ]).start();
  }, [y, fade]);

  const remember = () => {
    if (!popup.showOnce) return;
    AsyncStorage.getItem(SEEN_KEY)
      .catch(() => null)
      .then((raw) => {
        // Keeps the last 50, so the list can't grow for ever
        const closed: string[] = raw ? JSON.parse(raw) : [];
        return AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...closed.filter((x) => x !== popup.id), popup.id].slice(-50)));
      })
      .catch(() => {});
  };
  const close = (then?: () => void) => {
    remember();
    Animated.parallel([
      Animated.timing(y, { toValue: screenH, duration: 220, useNativeDriver: native }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: native }),
    ]).start(() => {
      onGone();
      then?.();
    });
  };
  const go = () => {
    tap();
    const link = bannerLink(popup.linkType, popup.linkValue);
    close(() => (typeof link === "function" ? link() : router.push(link)));
  };

  // Swipe it down to close
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.2) close();
        else Animated.spring(y, { toValue: 0, useNativeDriver: native, damping: 18, stiffness: 180 }).start();
      },
    }),
  ).current;

  const t = THEMES[popup.style];
  const picture = popup.layout === "image" && !!popup.imageUrl;
  const maxPicture = screenH - insets.top - tabInset - 110;
  const pictureHeight = Math.min(width / ratio, maxPicture);

  const closeButton = (glass: boolean) => (
    <Pressable
      onPress={() => close()}
      hitSlop={10}
      accessibilityLabel="Close"
      style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: glass ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="close" size={20} color={glass ? colors.white : colors.ink} />
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(12,9,7,0.62)", opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={() => close()} accessibilityLabel="Close" />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: tabInset + 6 }} pointerEvents="box-none">
        <Animated.View {...pan.panHandlers} style={{ width, transform: [{ translateY: y }] }}>
          {/* Grab bar */}
          <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.7)", marginBottom: 10 }} />
          <View style={{ borderRadius: 32, overflow: "hidden", backgroundColor: picture ? colors.ink : t.bg, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
            {picture ? (
              // The picture is the whole card; the buttons sit on a dark fade at its foot
              <View style={{ width, height: pictureHeight }}>
                <Image
                  source={{ uri: popup.imageUrl! }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  contentFit="cover"
                  transition={200}
                  onLoad={(e) => e.source.width && setRatio(Math.max(0.55, e.source.width / e.source.height))}
                />
                <PictureSparkles />
                <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 70, paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.sm }}>
                  <Buttons popup={popup} onGo={go} onClose={() => close()} bg={colors.white} fg={colors.ink} sub="rgba(255,255,255,0.85)" />
                </LinearGradient>
                {closeButton(true)}
              </View>
            ) : (
              <View onLayout={(e) => setArtHeight(e.nativeEvent.layout.height)} style={{ paddingHorizontal: space.xl, paddingTop: 44, paddingBottom: space.xl }}>
                <Doodles width={width} height={artHeight} color={t.doodle} accent={t.accent} />
                {popup.imageUrl && (
                  // The picture as a tilted sticker, with a block of colour behind it
                  <View style={{ alignSelf: "center", width: 168, height: 168, marginBottom: space.xl }}>
                    <View style={{ position: "absolute", top: 8, left: 10, right: -10, bottom: -8, borderRadius: 30, backgroundColor: t.accent, transform: [{ rotate: "6deg" }] }} />
                    <Image source={{ uri: popup.imageUrl }} style={{ width: 168, height: 168, borderRadius: 30, transform: [{ rotate: "-4deg" }] }} contentFit="cover" transition={200} />
                  </View>
                )}
                <Txt color={t.fg} style={{ fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 35, textAlign: "center", letterSpacing: -0.5 }}>{popup.title}</Txt>
                {popup.body && (
                  <Txt color={t.sub} style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: space.md }}>{popup.body}</Txt>
                )}
                <View style={{ marginTop: space.xl, gap: space.sm }}>
                  <Buttons popup={popup} onGo={go} onClose={() => close()} bg={t.btnBg} fg={t.btnFg} sub={t.sub} />
                </View>
                {closeButton(popup.style === "dark")}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Buttons({ popup, onGo, onClose, bg, fg, sub }: { popup: Popup; onGo: () => void; onClose: () => void; bg: string; fg: string; sub: string }) {
  return (
    <>
      <Pressable onPress={onGo} style={({ pressed }) => ({ height: 54, borderRadius: 27, backgroundColor: bg, opacity: pressed ? 0.85 : 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 })}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 16, color: fg }}>{popup.ctaLabel}</Txt>
        <Ionicons name="arrow-forward" size={18} color={fg} />
      </Pressable>
      {popup.dismissLabel && (
        <Pressable onPress={onClose} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 8 }}>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, color: sub }}>{popup.dismissLabel}</Txt>
        </Pressable>
      )}
    </>
  );
}
