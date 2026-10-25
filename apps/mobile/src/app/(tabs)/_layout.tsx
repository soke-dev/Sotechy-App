import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { StyleSheet } from "react-native";
import type { IconName } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { colors, fonts } from "@/lib/theme";

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: unknown }) {
    return <Ionicons name={focused ? filled : outline} size={23} color={color as string} />;
  };

export default function TabsLayout() {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
        tabBarBadgeStyle: { backgroundColor: colors.brand, fontFamily: fonts.bold, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: icon("search-outline", "search") }} />
      <Tabs.Screen name="cart" options={{ title: "Cart", tabBarIcon: icon("bag-handle-outline", "bag-handle"), tabBarBadge: count > 0 ? count : undefined }} />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: icon("receipt-outline", "receipt") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("person-outline", "person") }} />
    </Tabs>
  );
}
