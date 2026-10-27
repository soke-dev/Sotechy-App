// Store notifications: customers subscribe to a store, and only subscribers get what that store sends.
// New messages pop in at the top of the screen and land in the Notifications inbox.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StoreLogo } from "@/components/store-bits";
import { storeBySlug } from "./marketplace";
import { colors, fonts, radius, space } from "./theme";

export interface StoreNotice {
  id: string;
  store: string;
  title: string;
  body: string;
  minsAgo: number;
}

/** What stores have sent (none yet: store messages arrive once the merchant dashboard can send them) */
export const STORE_NOTICES: StoreNotice[] = [];

const SUBS_KEY = "sotechy_store_subs";
const READ_KEY = "sotechy_store_read";

interface StoreNotificationsState {
  subscribed: string[];
  isSubscribed: (slug: string) => boolean;
  toggle: (slug: string) => void;
  /** Messages from stores you're subscribed to, newest first */
  inbox: StoreNotice[];
  unread: number;
  markAllRead: () => void;
}

const Ctx = createContext<StoreNotificationsState>({ subscribed: [], isSubscribed: () => false, toggle: () => {}, inbox: [], unread: 0, markAllRead: () => {} });
export const useStoreNotifications = () => useContext(Ctx);

const useNative = Platform.OS !== "web";

/** The card that drops in from the top when a subscribed store sends something */
function NoticePop({ notice, onClose }: { notice: StoreNotice; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-160)).current;
  const store = storeBySlug(notice.store);

  useEffect(() => {
    Animated.spring(y, { toValue: 0, useNativeDriver: useNative, friction: 8, tension: 70 }).start();
    const t = setTimeout(() => Animated.timing(y, { toValue: -160, duration: 220, useNativeDriver: useNative }).start(onClose), 5200);
    return () => clearTimeout(t);
  }, [notice.id, y, onClose]);

  if (!store) return null;
  return (
    <Animated.View style={{ position: "absolute", top: insets.top + space.sm, left: space.md, right: space.md, transform: [{ translateY: y }], zIndex: 1000 }}>
      <Pressable
        onPress={() => {
          onClose();
          router.push("/notifications");
        }}
        style={{
          flexDirection: "row",
          gap: space.md,
          padding: space.md,
          borderRadius: radius.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: "#2B1D0E",
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        <StoreLogo store={store} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.muted }}>{store.name}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.faint }}>· now</Text>
          </View>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink }}>{notice.title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.ink2 }}>{notice.body}</Text>
        </View>
        <Ionicons name="notifications" size={16} color={colors.brand} />
      </Pressable>
    </Animated.View>
  );
}

export function StoreNotificationsProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState<string[]>(["sotechy", "xena"]);
  const [read, setRead] = useState<string[]>([]);
  const [pop, setPop] = useState<StoreNotice | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SUBS_KEY), AsyncStorage.getItem(READ_KEY)])
      .then(([s, r]) => {
        if (s) setSubscribed(JSON.parse(s));
        if (r) setRead(JSON.parse(r));
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      const on = !subscribed.includes(slug);
      const next = on ? [...subscribed, slug] : subscribed.filter((x) => x !== slug);
      setSubscribed(next);
      AsyncStorage.setItem(SUBS_KEY, JSON.stringify(next)).catch(() => {});
      // Sending isn't live yet: show the store's latest message the way a subscriber would get it
      const latest = STORE_NOTICES.filter((n) => n.store === slug).sort((a, b) => a.minsAgo - b.minsAgo)[0];
      if (on && latest) setTimeout(() => setPop(latest), 900);
    },
    [subscribed],
  );

  const inbox = useMemo(() => STORE_NOTICES.filter((n) => subscribed.includes(n.store)).sort((a, b) => a.minsAgo - b.minsAgo), [subscribed]);
  const unread = inbox.filter((n) => !read.includes(n.id)).length;
  const markAllRead = useCallback(() => {
    const next = [...new Set([...read, ...inbox.map((n) => n.id)])];
    setRead(next);
    AsyncStorage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
  }, [read, inbox]);
  const closePop = useCallback(() => setPop(null), []);

  return (
    <Ctx.Provider value={{ subscribed, isSubscribed: (s) => subscribed.includes(s), toggle, inbox, unread, markAllRead }}>
      <View style={{ flex: 1 }}>
        {children}
        {pop && <NoticePop key={pop.id} notice={pop} onClose={closePop} />}
      </View>
    </Ctx.Provider>
  );
}
