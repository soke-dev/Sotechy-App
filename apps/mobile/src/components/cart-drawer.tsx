// On desktop the cart slides in from the right over the page; on phones it's its own screen.
// Anything that opens the cart calls useOpenCart() instead of going to /cart.
import { router, usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { CartView } from "@/app/cart";
import { useCart } from "@/lib/cart";
import { useIsDesktop } from "@/lib/layout";
import { colors, radius, space } from "@/lib/theme";
import { IconButton, Txt } from "./ui";

const PANEL = 440;
const OpenCartContext = createContext<() => void>(() => router.push("/cart"));
export const useOpenCart = () => useContext(OpenCartContext);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  const { count } = useCart();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    if (!isOpen.current) return;
    isOpen.current = false;
    Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => setVisible(false));
  }, [anim]);

  const open = useCallback(() => {
    if (!desktop) return router.push("/cart");
    isOpen.current = true;
    setVisible(true);
    Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [desktop, anim]);

  // Going anywhere (checkout, a product) closes it
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <OpenCartContext.Provider value={open}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(23,18,14,0.35)", opacity: anim }]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close cart" />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: PANEL,
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderBottomLeftRadius: radius.xl,
            overflow: "hidden",
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [PANEL, 0] }) }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
            <Txt variant="heading">Your cart{count ? ` (${count})` : ""}</Txt>
            <IconButton icon="close" onPress={close} />
          </View>
          <View style={{ flex: 1 }}>{visible && <CartView inDrawer />}</View>
        </Animated.View>
      </Modal>
    </OpenCartContext.Provider>
  );
}
