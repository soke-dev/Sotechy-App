// The app's opening: an orange burst from the native (white) splash, the logo popping in with shop icons
// floating around it, the name and a loading bar, then a fade into the app once it's ready.
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { fonts, lightPalette as colors } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";

const native = Platform.OS !== "web";
/** The intro plays at least this long, so it's never a flash */
const MIN_MS = 1600;

/** Shop icons orbiting the logo: where they sit (angle, distance as a share of the screen) and how big */
const ORBIT: { illo: IlloName; angle: number; r: number; size: number; delay: number }[] = [
  { illo: "bag", angle: -150, r: 0.34, size: 54, delay: 380 },
  { illo: "coin", angle: -35, r: 0.33, size: 50, delay: 460 },
  { illo: "tag", angle: 20, r: 0.36, size: 46, delay: 540 },
  { illo: "bike", angle: 150, r: 0.35, size: 54, delay: 620 },
  { illo: "store", angle: 95, r: 0.38, size: 48, delay: 700 },
];

function Floater({ illo, x, y, size, delay }: { illo: IlloName; x: number; y: number; size: number; delay: number }) {
  const show = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(show, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: native }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    ).start();
  }, [show, bob, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - size / 2 - 10,
        top: y - size / 2 - 10,
        width: size + 20,
        height: size + 20,
        borderRadius: (size + 20) / 2,
        backgroundColor: "rgba(255,255,255,0.92)",
        alignItems: "center",
        justifyContent: "center",
        opacity: show,
        transform: [{ scale: show }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
        shadowColor: "#7A3A00",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <Illo name={illo} size={size} />
    </Animated.View>
  );
}

/** Sits over the app until `ready`, then fades away and calls `onDone` */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const burst = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.spring(logo, { toValue: 1, friction: 5, tension: 90, useNativeDriver: native }),
    ]).start();
    Animated.timing(words, { toValue: 1, duration: 450, delay: 760, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    // The bar fills over the minimum time (scaled from its left edge)
    Animated.timing(bar, { toValue: 1, duration: MIN_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start();
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, [burst, logo, words, bar]);

  useEffect(() => {
    if (!ready || !minDone) return;
    Animated.timing(out, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => onDone());
  }, [ready, minDone, out, onDone]);

  const diameter = Math.hypot(width, height) * 1.1;
  const cx = width / 2;
  const cy = height * 0.44;
  const unit = Math.min(width, height);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.white, opacity: out, zIndex: 1000 }]}>
      {/* The orange burst from the middle */}
      <Animated.View
        style={{
          position: "absolute",
          left: cx - diameter / 2,
          top: cy - diameter / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: colors.brand,
          transform: [{ scale: burst }],
        }}
      />
      {/* Soft rings and dots behind everything */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: burst }]}>
        <Svg width={width} height={height}>
          <Circle cx={cx} cy={cy} r={unit * 0.24} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={unit * 0.37} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeDasharray="4 10" />
          <Circle cx={cx} cy={cy} r={unit * 0.5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
          <Circle cx={width * 0.12} cy={height * 0.12} r={70} fill={colors.brandYellow} opacity={0.35} />
          <Circle cx={width * 0.95} cy={height * 0.86} r={110} fill={colors.brandYellow} opacity={0.28} />
          <Rect x={width * 0.8} y={height * 0.1} width={18} height={18} rx={5} fill="rgba(255,255,255,0.35)" transform={`rotate(20 ${width * 0.8} ${height * 0.1})`} />
          <Path d={`M ${width * 0.08} ${height * 0.78} q 14 -18 28 0 t 28 0 t 28 0`} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>

      {ORBIT.map((o) => {
        const rad = (o.angle * Math.PI) / 180;
        return <Floater key={o.illo} illo={o.illo} x={cx + Math.cos(rad) * unit * o.r} y={cy + Math.sin(rad) * unit * o.r} size={o.size} delay={o.delay} />;
      })}

      {/* The logo on a white tile */}
      <Animated.View
        style={{
          position: "absolute",
          left: cx - 56,
          top: cy - 56,
          width: 112,
          height: 112,
          borderRadius: 32,
          backgroundColor: colors.white,
          alignItems: "center",
          justifyContent: "center",
          opacity: logo,
          transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: logo.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "0deg"] }) }],
          shadowColor: "#7A3A00",
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <Image source={require("../../assets/brand/sotechy-icon-512.png")} style={{ width: 82, height: 82 }} contentFit="contain" />
      </Animated.View>

      {/* Name and promise */}
      <Animated.View
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: cy + unit * 0.5,
          alignItems: "center",
          gap: 6,
          opacity: words,
          transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }}
      >
        <Animated.Text style={{ fontFamily: fonts.displayHeavy, fontSize: 38, letterSpacing: -0.8, color: colors.white }}>Sotechy</Animated.Text>
        <Animated.Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: "rgba(23,18,14,0.75)", textAlign: "center" }}>Shop and earn.</Animated.Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={{ position: "absolute", left: width * 0.3, right: width * 0.3, bottom: 64, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
        <Animated.View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 3,
            backgroundColor: colors.white,
            transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.4, 0] }) }],
          }}
        />
      </View>
    </Animated.View>
  );
}
