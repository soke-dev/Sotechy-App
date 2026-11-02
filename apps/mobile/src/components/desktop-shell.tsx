// The desktop layout (a wide browser): a sidebar on the left with the tabs, your things and help, and the
// page in a centred column. Categories open in the same slide-in menu as on phones, from the left.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, usePathname, type Href } from "expo-router";
import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { ColumnProvider, SIDEBAR_WIDTH, useIsDesktop } from "@/lib/layout";
import { openPolicy } from "@/lib/policies";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useThemeMode } from "@/lib/theme-mode";
import { useOpenCart } from "./cart-drawer";
import { useMenu } from "./menu";
import { AccountIcon, HomeIcon, MenuIcon, OrdersIcon, ShopIcon, StoresIcon } from "./tab-icons";
import { Txt, type IconName } from "./ui";
import { UserAvatar } from "./user-avatar";

/** Pages that read best narrower (forms, lists); the rest get the wide column */
const NARROW = [/^\/(cart|checkout|sign-in|welcome|profile|security|addresses|support|wallet|wallet-activity|notifications|offers|account)$/, /^\/(order|offer|address)\//];
const WIDE_MAX = 1680;
const NARROW_MAX = 820;

const TABS: { href: Href; label: string; Icon: ComponentType<{ active: boolean; size?: number }>; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p) => p === "/" },
  { href: "/shop", label: "Shop", Icon: ShopIcon, match: (p) => p === "/shop" || p.startsWith("/product") },
  { href: "/stores", label: "Stores", Icon: StoresIcon, match: (p) => p === "/stores" || p.startsWith("/store/") || p.startsWith("/item/") },
  { href: "/orders", label: "Orders", Icon: OrdersIcon, match: (p) => p === "/orders" || p.startsWith("/order/") },
];

const YOURS: { href: Href; label: string; icon: IconName; path: string }[] = [
  { href: "/cart", label: "Cart", icon: "bag-handle-outline", path: "/cart" },
  { href: "/wallet", label: "Wallet", icon: "wallet-outline", path: "/wallet" },
  { href: "/wishlist", label: "Saved", icon: "heart-outline", path: "/wishlist" },
  { href: "/offers", label: "My offers", icon: "pricetag-outline", path: "/offers" },
  { href: "/notifications", label: "Store news", icon: "notifications-outline", path: "/notifications" },
];

function NavRow({ active, onPress, children, label }: { active: boolean; onPress: () => void; children: ReactNode; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        height: 46,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: active ? colors.brandSoft : pressed || hovered ? colors.surfaceAlt : "transparent",
      })}
    >
      {children}
    </Pressable>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count } = useCart();
  const menu = useMenu();
  const openCart = useOpenCart();
  const { resolved, setTheme } = useThemeMode();
  const dark = resolved === "dark";
  const go = (href: Href) => router.push(href);

  return (
    <View style={{ width: SIDEBAR_WIDTH, backgroundColor: colors.surface, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => go("/")} accessibilityLabel="Sotechy home" style={{ paddingHorizontal: 4, paddingTop: 4 }}>
          <Image source={require("../../assets/brand/light-logo-small.png")} style={{ width: 118, height: 50 }} contentFit="contain" contentPosition="left" />
        </Pressable>

        {/* Categories slide in from the left, as on phones */}
        <Pressable
          onPress={menu.open}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, height: 48, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: pressed ? colors.inversePressed : colors.inverse })}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <MenuIcon size={24} />
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14.5, color: colors.onInverse, flex: 1 }}>All categories</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.onInverse} />
        </Pressable>

        <View style={{ gap: 2 }}>
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <NavRow key={t.label} label={t.label} active={active} onPress={() => go(t.href)}>
                <t.Icon active={active} size={30} />
                <Text style={{ fontFamily: active ? fonts.bold : fonts.medium, fontSize: 15, color: colors.ink }}>{t.label}</Text>
              </NavRow>
            );
          })}
        </View>

        <View style={{ gap: 2 }}>
          <Txt variant="overline" style={{ paddingHorizontal: 12, marginBottom: 4 }}>Yours</Txt>
          {YOURS.map((y) => {
            const active = pathname === y.path;
            const badge = y.path === "/cart" ? count : 0;
            return (
              <NavRow key={y.label} label={y.label} active={active} onPress={() => (y.path === "/cart" ? openCart() : go(y.href))}>
                <View style={{ width: 30, alignItems: "center" }}>
                  <Ionicons name={y.icon} size={20} color={active ? colors.brandPressed : colors.ink2} />
                </View>
                <Text style={{ flex: 1, fontFamily: active ? fonts.bold : fonts.medium, fontSize: 14.5, color: colors.ink }}>{y.label}</Text>
                {badge > 0 && (
                  <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.white }}>{badge > 99 ? "99+" : badge}</Text>
                  </View>
                )}
              </NavRow>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: 2 }}>
          <NavRow label="Help & support" active={pathname === "/support"} onPress={() => go("/support")}>
            <View style={{ width: 30, alignItems: "center" }}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.ink2} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink }}>Help & support</Text>
          </NavRow>
          <NavRow label="Terms & policies" active={false} onPress={() => openPolicy()}>
            <View style={{ width: 30, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={20} color={colors.ink2} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink }}>Terms & policies</Text>
          </NavRow>
          <NavRow label={dark ? "Light mode" : "Dark mode"} active={false} onPress={() => setTheme(dark ? "light" : "dark")}>
            <View style={{ width: 30, alignItems: "center" }}>
              <Ionicons name={dark ? "sunny-outline" : "moon-outline"} size={20} color={colors.ink2} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink }}>{dark ? "Light mode" : "Dark mode"}</Text>
          </NavRow>
        </View>

        {/* You */}
        {user ? (
          <Pressable
            onPress={() => go("/account")}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: pathname === "/account" ? colors.brand : colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.bg })}
          >
            <UserAvatar seed={user.id} preset={user.avatarStyle} size={38} />
            <View style={{ flex: 1 }}>
              <Txt variant="label" numberOfLines={1}>{user.fullName?.split(" ")[0] ?? "Your account"}</Txt>
              <Txt variant="caption" numberOfLines={1}>{user.username ? `@${user.username}` : "Account"}</Txt>
            </View>
            <AccountIcon active={pathname === "/account"} size={24} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => go("/sign-in")}
            style={({ pressed }) => ({ padding: space.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.inversePressed : colors.panel, gap: 2 })}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: colors.white }}>Sign in or join</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: "#BDB3A8" }}>Track orders and earn tokens</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/** On desktop: sidebar + centred column. On phones (and narrow browsers) the app as it is. */
export function DesktopShell({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  if (!desktop) return <>{children}</>;
  const max = NARROW.some((r) => r.test(pathname)) ? NARROW_MAX : WIDE_MAX;
  const column = Math.min(width - SIDEBAR_WIDTH, max);
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg }}>
      <Sidebar />
      <View style={{ flex: 1, alignItems: "center", overflow: "hidden" }}>
        <View style={{ flex: 1, width: column }}>
          <ColumnProvider width={column}>{children}</ColumnProvider>
        </View>
      </View>
    </View>
  );
}
