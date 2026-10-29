// A warning before leaving the app for a website Sotechy doesn't run (a store's socials, for one): what it
// opens, a reminder to keep payments and passwords in the app, and a choice to go on or stay.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { fonts, lightPalette as colors, radius, space } from "@/lib/theme";
import { tap, Txt } from "./ui";

const native = Platform.OS !== "web";
const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** A globe heading out of a phone, with a warning badge */
function LeavingArt() {
  return (
    <Svg width={150} height={110} viewBox="0 0 150 110">
      <Circle cx={75} cy={58} r={50} fill={colors.brandSoft} />
      {/* phone */}
      <Path d="M30 30 h34 a8 8 0 0 1 8 8 v58 a8 8 0 0 1 -8 8 h-34 a8 8 0 0 1 -8 -8 v-58 a8 8 0 0 1 8 -8z" fill={colors.ink} />
      <Path d="M34 40 h26 v50 h-26z" fill="#2E2621" />
      <Path d="M42 35 h10" stroke="#4A3F38" strokeWidth={3} strokeLinecap="round" />
      {/* arrow out */}
      <Path d="M58 64 C 74 60, 82 52, 92 44" stroke={colors.brand} strokeWidth={4} strokeLinecap="round" fill="none" strokeDasharray="2 7" />
      <Path d="M86 40 l8 3 -3 8" stroke={colors.brand} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* globe */}
      <Circle cx={110} cy={38} r={22} fill={colors.white} stroke={colors.ink} strokeWidth={3} />
      <Ellipse cx={110} cy={38} rx={9} ry={22} fill="none" stroke={colors.ink} strokeWidth={2.5} />
      <Path d="M89 38 h42 M93 27 h34 M93 49 h34" stroke={colors.ink} strokeWidth={2.5} />
      {/* warning badge */}
      <Circle cx={126} cy={62} r={13} fill={colors.brandYellow} stroke={colors.ink} strokeWidth={2.5} />
      <Path d="M126 55 v8" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={126} cy={68} r={1.8} fill={colors.ink} />
      {/* sparkles */}
      <Path d="M20 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={colors.brandYellow} />
      <Path d="M140 92 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill={colors.brand} />
    </Svg>
  );
}

function LeavingSheet({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: native, damping: 18, stiffness: 170 }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: native }),
    ]).start();
  }, [y, fade]);
  const leave = (then?: () => void) =>
    Animated.parallel([Animated.timing(y, { toValue: 400, duration: 180, useNativeDriver: native }), Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: native })]).start(() => {
      onClose();
      then?.();
    });
  const host = hostOf(url);
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => leave()} statusBarTranslucent>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(12,9,7,0.55)", opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={() => leave()} accessibilityLabel="Stay on Sotechy" />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <Animated.View
          style={{
            transform: [{ translateY: y }],
            backgroundColor: colors.white,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: space.xl,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.xl,
            alignItems: "center",
            gap: space.md,
          }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <LeavingArt />
          <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 28, color: colors.ink, textAlign: "center" }}>You&apos;re leaving Sotechy</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }}>
            <Ionicons name="globe-outline" size={14} color={colors.ink2} />
            <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2, flexShrink: 1 }}>{host}</Txt>
          </View>
          <Txt style={{ fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.ink2, textAlign: "center" }}>
            This is an outside website that Sotechy doesn&apos;t run. Never share your password there, and only pay for orders inside the Sotechy app, where your money is protected.
          </Txt>
          <Pressable
            onPress={() => {
              tap();
              leave(() => void Linking.openURL(url).catch(() => {}));
            }}
            style={({ pressed }) => ({ alignSelf: "stretch", height: 54, borderRadius: 27, backgroundColor: pressed ? "#3A322C" : colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: space.sm })}
          >
            <Txt style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.white }}>Continue</Txt>
            <Ionicons name="open-outline" size={17} color={colors.white} />
          </Pressable>
          <Pressable onPress={() => leave()} hitSlop={8} style={{ paddingVertical: 6 }}>
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 }}>Stay on Sotechy</Txt>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** `open(url)` asks first, then opens it outside the app; render `sheet` once in the screen */
export function useExternalLink() {
  const [url, setUrl] = useState<string | null>(null);
  const open = useCallback((u: string) => {
    tap();
    setUrl(u);
  }, []);
  return { open, sheet: url ? <LeavingSheet url={url} onClose={() => setUrl(null)} /> : null };
}
