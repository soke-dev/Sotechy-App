// Pop-ups over Home, made in Admin → App pop-ups: one picture with buttons under it, or Sotechy's own design
// (colours, title, a picture and words). The newest live one this phone hasn't closed shows, once per app open.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import type { Popup } from "@sotechy/shared";
import { useStoreConfig } from "@/lib/store-config";
import { fonts, lightPalette as colors, radius, space } from "@/lib/theme";
import { bannerLink } from "./hero-carousel";
import { tap, Txt } from "./ui";

const SEEN_KEY = "sotechy_popups_closed";
/** Only one pop-up an app open */
let shownThisOpen = false;

// Designed pop-ups keep the same colours in light and dark mode, like the banners
const STYLES: Record<Popup["style"], { bg: string; fg: string; circle: string }> = {
  orange: { bg: colors.brand, fg: colors.ink, circle: colors.brandYellow },
  dark: { bg: colors.ink, fg: colors.white, circle: colors.brand },
  light: { bg: colors.brandSoft, fg: colors.ink, circle: colors.brand },
};

export function HomePopup() {
  const popups = useStoreConfig().config?.popups;
  const [popup, setPopup] = useState<Popup | null>(null);
  const [ratio, setRatio] = useState(4 / 5);

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
        // A moment after Home appears, so it doesn't land on a half-drawn screen
        t = setTimeout(() => {
          shownThisOpen = true;
          setPopup(next);
        }, 1200);
      });
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [popups]);

  if (!popup) return null;

  const close = () => {
    const id = popup.id;
    setPopup(null);
    if (!popup.showOnce) return;
    AsyncStorage.getItem(SEEN_KEY)
      .catch(() => null)
      .then((raw) => {
        // Keeps the last 50, so the list can't grow for ever
        const closed: string[] = raw ? JSON.parse(raw) : [];
        return AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...closed.filter((x) => x !== id), id].slice(-50)));
      })
      .catch(() => {});
  };
  const go = () => {
    tap();
    const link = bannerLink(popup.linkType, popup.linkValue);
    close();
    if (typeof link === "function") link();
    else router.push(link);
  };

  const s = STYLES[popup.style];
  const picture = popup.layout === "image" && popup.imageUrl;
  const buttons = (
    <View style={{ gap: space.sm, alignItems: "center", paddingHorizontal: space.xl, paddingBottom: space.xl, paddingTop: space.lg }}>
      <Pressable onPress={go} style={({ pressed }) => ({ alignSelf: "stretch", height: 50, borderRadius: radius.pill, backgroundColor: pressed ? "#3A322C" : colors.ink, alignItems: "center", justifyContent: "center" })}>
        <Txt variant="label" color={colors.white} style={{ fontSize: 16 }}>{popup.ctaLabel}</Txt>
      </Pressable>
      {popup.dismissLabel && (
        <Pressable onPress={close} hitSlop={8} style={{ paddingVertical: 6 }}>
          <Txt variant="label" color={colors.ink2}>{popup.dismissLabel}</Txt>
        </Pressable>
      )}
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(23,18,14,0.6)", alignItems: "center", justifyContent: "center", padding: space.xl }}>
        <View style={{ width: "100%", maxWidth: 380, borderRadius: 28, backgroundColor: colors.white, overflow: "hidden" }}>
          {picture ? (
            <Image source={{ uri: popup.imageUrl! }} style={{ width: "100%", aspectRatio: ratio, maxHeight: 460 }} contentFit="cover" onLoad={(e) => e.source.width && setRatio(Math.max(0.6, e.source.width / e.source.height))} />
          ) : (
            <>
              <View style={{ height: 170, backgroundColor: s.bg, alignItems: "center", paddingTop: space.xxl, paddingHorizontal: space.xl, overflow: "hidden" }}>
                <View style={{ position: "absolute", left: -40, bottom: -50, width: 130, height: 130, borderRadius: 65, backgroundColor: s.circle }} />
                <View style={{ position: "absolute", right: -30, top: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: s.circle, opacity: 0.55 }} />
                <Txt color={s.fg} style={{ fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 32, textAlign: "center" }}>{popup.title}</Txt>
              </View>
              {popup.imageUrl && (
                <Image source={{ uri: popup.imageUrl }} style={{ alignSelf: "center", marginTop: -56, width: 150, height: 150, borderRadius: 24, borderWidth: 4, borderColor: colors.white }} contentFit="cover" />
              )}
              {popup.body && (
                <Txt variant="body" color={colors.ink2} style={{ textAlign: "center", paddingHorizontal: space.xl, paddingTop: space.lg }}>{popup.body}</Txt>
              )}
            </>
          )}
          {buttons}
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityLabel="Close"
            style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
