// Slide-out menu: account, search, quick links, expandable categories and store contacts.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Category } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { Button, Divider, IconButton, productIcon, Txt, ui, type IconName } from "./ui";
import { Illo, type IlloName } from "./illustrations";

const MenuContext = createContext<{ open: () => void; close: () => void }>({ open: () => {}, close: () => {} });
export const useMenu = () => useContext(MenuContext);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setVisible(true);
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
  }, [anim]);

  const close = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start(() => setVisible(false));
  }, [anim]);

  return (
    <MenuContext.Provider value={{ open, close }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <MenuDrawer anim={anim} onClose={close} />
      </Modal>
    </MenuContext.Provider>
  );
}

export function MenuButton() {
  const { open } = useMenu();
  return <IconButton icon="menu" onPress={open} />;
}

function QuickLink({ illo, label, onPress }: { illo: IlloName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width: "48%", flexDirection: "row", alignItems: "center", gap: 10, padding: space.md, borderRadius: radius.md, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
    >
      <Illo name={illo} size={26} />
      <Txt variant="label">{label}</Txt>
    </Pressable>
  );
}

function CategoryThumb({ category }: { category: Category }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
      {category.imageUrl ? (
        <Image source={{ uri: category.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <Ionicons name={productIcon(category.name)} size={20} color={colors.ink2} />
      )}
    </View>
  );
}

function MenuDrawer({ anim, onClose }: { anim: Animated.Value; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.88, 380);
  const { user } = useAuth();
  const categories = useAsync(() => api.categories());
  const config = useAsync(() => api.storeConfig());
  const [expanded, setExpanded] = useState<string | null>(null);

  const all = categories.data ?? [];
  const tops = all.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (id: string) => all.filter((c) => c.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const support = config.data?.support;

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };
  const shopCategory = (slug: string) => go({ pathname: "/shop", params: { category: slug } });

  const toggle = (id: string) => {
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => (current === id ? null : id));
  };

  const initials = (user?.fullName ?? user?.email ?? "")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(23,18,14,0.5)", opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: panelWidth,
          backgroundColor: colors.bg,
          borderTopRightRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
          overflow: "hidden",
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.lg, gap: space.xl }}>
          {/* Header */}
          <View style={ui.between}>
            <Image source={require("../../assets/brand/light-logo-small.png")} style={{ width: 104, height: 44 }} contentFit="contain" contentPosition="left" />
            <IconButton icon="close" onPress={onClose} />
          </View>

          {/* Account */}
          {user ? (
            <Pressable onPress={() => go("/account")} style={[ui.card, ui.row, { gap: space.md }]}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Txt variant="label" color={colors.brandPressed} style={{ fontFamily: fonts.displayHeavy }}>{initials}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label" numberOfLines={1}>{user.fullName ?? user.email}</Txt>
                <Txt variant="caption">View account</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ) : (
            <Pressable onPress={() => go("/sign-in")} style={{ backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="label" color={colors.white}>Sign in or create account</Txt>
                <Txt variant="caption" color="#BDB3A8">Track orders and check out faster</Txt>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.brandYellow} />
            </Pressable>
          )}

          {/* Search */}
          <Pressable
            onPress={() => go({ pathname: "/shop", params: { focus: "1" } })}
            style={{ height: 46, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }}
          >
            <Ionicons name="search" size={17} color={colors.ink2} />
            <Txt variant="body" color={colors.faint}>Search products</Txt>
          </Pressable>

          {/* Quick links */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm }}>
            <QuickLink illo="tag" label="Deals" onPress={() => go({ pathname: "/shop", params: { featured: "1" } })} />
            <QuickLink illo="sparkle" label="New in" onPress={() => go({ pathname: "/shop", params: { sort: "newest" } })} />
            <QuickLink illo="receipt" label="Track order" onPress={() => go("/orders")} />
            <QuickLink illo="heart" label="Saved" onPress={() => go("/wishlist")} />
          </View>

          {/* Categories */}
          <View style={{ gap: space.sm }}>
            <Txt variant="overline" style={{ paddingHorizontal: 4 }}>All categories</Txt>
            <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
              {tops.map((c, i) => {
                const kids = childrenOf(c.id);
                const isOpen = expanded === c.id;
                return (
                  <View key={c.id}>
                    {i > 0 && <Divider style={{ marginLeft: 70 }} />}
                    <Pressable
                      onPress={() => (kids.length ? toggle(c.id) : shopCategory(c.slug))}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, backgroundColor: pressed ? colors.surfaceAlt : "transparent" })}
                    >
                      <CategoryThumb category={c} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="label">{c.name}</Txt>
                        {kids.length > 0 && <Txt variant="caption">{kids.length} sections</Txt>}
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isOpen ? colors.ink : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons
                          name={kids.length ? "chevron-down" : "chevron-forward"}
                          size={15}
                          color={isOpen ? colors.white : colors.ink}
                          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
                        />
                      </View>
                    </Pressable>
                    {isOpen && (
                      <View style={{ marginLeft: 70, marginRight: space.md, marginBottom: space.md, borderLeftWidth: 2, borderLeftColor: colors.brand, paddingLeft: space.md }}>
                        <Pressable onPress={() => shopCategory(c.slug)} style={[ui.between, { paddingVertical: 9 }]}>
                          <Txt variant="label" color={colors.brandPressed}>Shop all {c.name}</Txt>
                          <Ionicons name="arrow-forward" size={15} color={colors.brandPressed} />
                        </Pressable>
                        {kids.map((k) => (
                          <Pressable key={k.id} onPress={() => shopCategory(k.slug)} style={[ui.between, { paddingVertical: 9 }]}>
                            <Txt variant="medium" color={colors.ink2}>{k.name}</Txt>
                            <Ionicons name="chevron-forward" size={14} color={colors.faint} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Stores & help */}
          <View style={{ gap: space.sm }}>
            <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Our stores</Txt>
            <View style={[ui.card, { gap: space.md }]}>
              {(config.data?.branches ?? []).map((b, i) => (
                <View key={b.id} style={{ gap: space.md }}>
                  {i > 0 && <Divider />}
                  <Pressable
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${b.address}, ${b.city}, Nigeria`)}`)}
                    style={[ui.row, { gap: space.md }]}
                  >
                    <Illo name="pin" size={28} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="label">{b.name}</Txt>
                      <Txt variant="caption">{b.address}, {b.city}{b.openingHours ? ` · ${b.openingHours}` : ""}</Txt>
                    </View>
                    <Ionicons name="navigate-outline" size={16} color={colors.brandPressed} />
                  </Pressable>
                </View>
              ))}
              <View style={[ui.row, { gap: space.sm }]}>
                <Button title="Call" icon="call-outline" variant="outline" size="sm" style={{ flex: 1 }} disabled={!support?.phone} onPress={() => Linking.openURL(`tel:${support?.phone?.replace(/[^\d+]/g, "")}`)} />
                <Button
                  title="WhatsApp"
                  icon="logo-whatsapp"
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  disabled={!support?.whatsapp}
                  onPress={() => Linking.openURL(`https://wa.me/${support?.whatsapp?.replace(/[^\d]/g, "")}`)}
                />
              </View>
            </View>
          </View>

          <Pressable onPress={() => go("/support")} style={[ui.row, { justifyContent: "center" }]}>
            <Ionicons name="help-circle-outline" size={16} color={colors.muted} />
            <Txt variant="caption">Help, delivery & returns</Txt>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
