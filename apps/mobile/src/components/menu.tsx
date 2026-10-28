// Slide-out menu: quick links, categories that open into sub-menus, and the head office pinned at the bottom.
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
import { anyCategory, directionsUrl, MARKET_DEPARTMENTS, type Category } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { MenuIcon } from "./tab-icons";
import { ArtButton, Button, Divider, IconButton, productIcon, Txt, ui, type IconName } from "./ui";
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
  return (
    <ArtButton label="Menu" onPress={open}>
      <MenuIcon size={28} />
    </ArtButton>
  );
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

/** One place in the categories menu: what "Shop all" filters by, and what opens under it */
interface MenuNode {
  key: string;
  label: string;
  icon?: IconName;
  value: string;
  children?: MenuNode[];
}

/** Every department, its sections and their categories, with Sotechy's own catalogue folded in */
function categoryTree(all: Category[]): MenuNode[] {
  const tops = all.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const kidsOf = (id: string) => all.filter((c) => c.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const covered = new Set(MARKET_DEPARTMENTS.flatMap((d) => d.sotechy ?? []));
  const leaf = (label: string, value = label): MenuNode => ({ key: value, label, value });

  const departments = MARKET_DEPARTMENTS.map((d): MenuNode => {
    const own = tops.filter((c) => d.sotechy?.includes(c.slug));
    const ownKids = own.flatMap((c) => kidsOf(c.id));
    const sections: MenuNode[] = d.sections.map((x) => ({ key: `${d.name}/${x.name}`, label: x.name, value: anyCategory(...x.items), children: x.items.map((i) => leaf(i)) }));
    // Sotechy's own sub-categories in this department, as a section of their own
    if (ownKids.length) sections.unshift({ key: `${d.name}/sotechy`, label: "Sold by Sotechy", value: anyCategory(...own.map((c) => c.slug)), children: ownKids.map((k) => leaf(k.name, k.slug)) });
    return { key: d.name, label: d.name, icon: d.icon as IconName, value: anyCategory(...d.sections.flatMap((x) => x.items), ...own.map((c) => c.slug)), children: sections };
  });
  // Any other Sotechy category added later still shows
  const extra = tops
    .filter((c) => !covered.has(c.slug))
    .map((c): MenuNode => {
      const kids = kidsOf(c.id);
      return { key: c.id, label: c.name, icon: productIcon(c.name), value: c.slug, children: kids.length ? kids.map((k) => leaf(k.name, k.slug)) : undefined };
    });
  // Last: everything else, in Shop
  return [...departments, ...extra, { key: "more", label: "Much more", icon: "apps-outline", value: "" }];
}

function MenuDrawer({ anim, onClose }: { anim: Animated.Value; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.88, 380);
  const { user } = useAuth();
  const categories = useAsync(() => api.categories());
  const config = useAsync(() => api.storeConfig());
  const [path, setPath] = useState<MenuNode[]>([]);
  const roots = categoryTree(categories.data ?? []);
  const here = path[path.length - 1];
  const support = config.data?.support;
  const headOffice = config.data?.branches[0];

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };
  const shopNode = (n: MenuNode) => go({ pathname: "/shop", params: { category: n.value, label: n.label } });
  const step = (next: MenuNode[]) => {
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPath(next);
  };
  const open = (n: MenuNode) => step([...path, n]);
  const back = () => step(path.slice(0, -1));


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
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space.xl, paddingHorizontal: space.lg, gap: space.xl }}>
          {/* Header */}
          <View style={ui.between}>
            <Image source={require("../../assets/brand/light-logo-small.png")} style={{ width: 104, height: 44 }} contentFit="contain" contentPosition="left" />
            <IconButton icon="close" onPress={onClose} />
          </View>

          {/* Quick links */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm }}>
            <QuickLink illo="tag" label="Deals" onPress={() => go({ pathname: "/shop", params: { featured: "1" } })} />
            <QuickLink illo="sparkle" label="New in" onPress={() => go({ pathname: "/shop", params: { sort: "newest" } })} />
            <QuickLink illo="receipt" label="Track order" onPress={() => go("/orders")} />
            <QuickLink illo="heart" label="Saved" onPress={() => go("/wishlist")} />
            <QuickLink illo="store" label="Stores" onPress={() => go("/stores")} />
            <QuickLink illo="coin" label="Wallet" onPress={() => go("/wallet")} />
            <QuickLink illo="chat" label="Store news" onPress={() => go("/notifications")} />
            <QuickLink illo="tag" label="My offers" onPress={() => go("/offers")} />
          </View>

          {/* Guests only: sign-in prompt */}
          {!user && (
            <Pressable onPress={() => go("/sign-in")} style={{ backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Illo name="user" size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="label" color={colors.white}>Sign in or create account</Txt>
                <Txt variant="caption" color="#BDB3A8">Track orders and check out faster</Txt>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.brandYellow} />
            </Pressable>
          )}

          {/* Categories: department → section → category, each opening the next */}
          <View style={{ gap: space.sm }}>
            <Txt variant="overline" style={{ paddingHorizontal: 4 }}>All categories</Txt>
            <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
              {here && (
                <>
                  <Pressable onPress={back} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.md, paddingVertical: 12, backgroundColor: pressed ? colors.surfaceAlt : colors.brandSoft })}>
                    <Ionicons name="chevron-back" size={17} color={colors.brandPressed} />
                    <Txt variant="label" color={colors.brandPressed} numberOfLines={1} style={{ flex: 1 }}>
                      {path.length > 1 ? path[path.length - 2].label : "All categories"}
                    </Txt>
                  </Pressable>
                  <Pressable onPress={() => shopNode(here)} style={({ pressed }) => [ui.between, { paddingHorizontal: space.md, paddingVertical: 13, backgroundColor: pressed ? colors.surfaceAlt : "transparent" }]}>
                    <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>Shop all {here.label}</Txt>
                    <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                  </Pressable>
                  <Divider />
                </>
              )}
              {(here?.children ?? roots).map((n, i) => (
                <View key={n.key}>
                  {i > 0 && <Divider style={{ marginLeft: n.icon ? 58 : space.md }} />}
                  <Pressable
                    onPress={() => (n.children?.length ? open(n) : shopNode(n))}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: n.icon ? 10 : 12, paddingHorizontal: space.md, backgroundColor: pressed ? colors.surfaceAlt : "transparent" })}
                  >
                    {n.icon && (
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={n.icon} size={17} color={colors.ink2} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Txt variant={n.icon ? "label" : "medium"} numberOfLines={1}>{n.label}</Txt>
                      {n.children?.length ? <Txt variant="caption">{n.children.length} {here ? "kinds" : "sections"}</Txt> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={n.children?.length ? colors.ink : colors.faint} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <Pressable onPress={() => go("/support")} style={[ui.row, { justifyContent: "center" }]}>
            <Ionicons name="help-circle-outline" size={16} color={colors.muted} />
            <Txt variant="caption">Help, delivery & returns</Txt>
          </Pressable>
        </ScrollView>

        {/* Sotechy head office: stays in view while the categories scroll */}
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.md, gap: space.sm }}>
          {headOffice && (
            <Pressable
              onPress={() => Linking.openURL(directionsUrl(`${headOffice.address}, ${headOffice.city}, Nigeria`, headOffice.mapUrl))}
              style={[ui.row, { gap: space.md }]}
            >
              <Image source={require("../../assets/brand/sotechy-office.jpg")} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="cover" contentPosition="top" />
              <View style={{ flex: 1 }}>
                <Txt variant="label">Sotechy head office</Txt>
                <Txt variant="caption" numberOfLines={1}>{headOffice.address}, {headOffice.city}{headOffice.openingHours ? ` · ${headOffice.openingHours}` : ""}</Txt>
              </View>
              <Ionicons name="navigate-outline" size={16} color={colors.brandPressed} />
            </Pressable>
          )}
          <View style={[ui.row, { gap: space.sm }]}>
            <Button title="Live chat" icon="chatbubbles-outline" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => go("/support?chat=1")} />
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
      </Animated.View>
    </View>
  );
}
