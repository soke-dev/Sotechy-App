// Floating pill tab bar with illustrated icons, a burst behind the active tab,
// a small bounce animation and a gentle haptic tick on every tap.
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useRef, type ComponentType } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/lib/cart";
import { colors, fonts } from "@/lib/theme";
import { AccountIcon, Burst, CartIcon, HomeIcon, OrdersIcon, ShopIcon } from "./tab-icons";

const ICONS: Record<string, ComponentType<{ active: boolean; size?: number }>> = {
  index: HomeIcon,
  shop: ShopIcon,
  cart: CartIcon,
  orders: OrdersIcon,
  account: AccountIcon,
};

const useNative = Platform.OS !== "web";

/** Height of the floating pill itself. */
const PILL_HEIGHT = 78;

/** Space tab screens must leave at the bottom so content can scroll clear of the floating bar. */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return PILL_HEIGHT + Math.max(insets.bottom, 10) + 14;
}

function TabItem({ label, routeName, focused, badge, onPress }: { label: string; routeName: string; focused: boolean; badge?: number; onPress: () => void }) {
  const Icon = ICONS[routeName] ?? HomeIcon;
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(active, { toValue: focused ? 1 : 0, useNativeDriver: useNative, friction: 6, tension: 120 }).start();
    if (focused) {
      bounce.setValue(0.82);
      Animated.spring(bounce, { toValue: 1, useNativeDriver: useNative, friction: 4, tension: 160 }).start();
    }
  }, [focused, active, bounce]);

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 6 }}
    >
      <View style={{ width: 56, height: 46, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            opacity: active,
            transform: [
              { scale: active.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              { rotate: active.interpolate({ inputRange: [0, 1], outputRange: ["-40deg", "0deg"] }) },
            ],
          }}
        >
          <Burst size={58} />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: bounce }, { translateY: active.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
          <Icon active={focused} size={38} />
        </Animated.View>
        {badge ? (
          <View style={{ position: "absolute", top: 0, right: 4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.white }}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ marginTop: 2, fontFamily: focused ? fonts.bold : fonts.medium, fontSize: 12, color: focused ? colors.ink : colors.faint }}>{label}</Text>
    </Pressable>
  );
}

export function SotechyTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { count } = useCart();
  return (
    // Absolutely positioned and transparent so page content keeps showing behind the pill.
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View
        role="tablist"
        style={{
          height: PILL_HEIGHT,
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 999,
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: "#2B1D0E",
          shadowOpacity: 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);
          return (
            <TabItem
              key={route.key}
              label={label}
              routeName={route.name}
              focused={focused}
              badge={route.name === "cart" ? count : undefined}
              onPress={() => {
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
