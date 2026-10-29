import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { useFonts } from "expo-font";
import { router, Stack, usePathname, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartFeedbackProvider } from "@/components/cart-feedback";
import { DialogProvider } from "@/components/dialog";
import { MenuProvider } from "@/components/menu";
import { ToastProvider } from "@/components/toast";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { StoreConfigProvider } from "@/lib/store-config";
import { AccountExtrasProvider } from "@/lib/account-extras";
import { PushNotifications } from "@/lib/push";
import { StoreNotificationsProvider } from "@/lib/store-notifications";
import { PulseProvider } from "@/lib/pulse";
import { colors, fonts } from "@/lib/theme";
import { ThemeModeProvider, useThemeMode } from "@/lib/theme-mode";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** The navigator re-mounts when the theme changes so every screen re-reads the palette; we return to the same page. */
function ThemedNavigator() {
  const { resolved } = useThemeMode();
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const lastTheme = useRef(resolved);

  useEffect(() => {
    lastPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (lastTheme.current === resolved) return;
    lastTheme.current = resolved;
    const back = lastPath.current;
    if (back && back !== "/") setTimeout(() => router.replace(back as Href), 0);
  }, [resolved]);

  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <PushNotifications />
      <Stack
        key={resolved}
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ title: "Cart" }} />
        <Stack.Screen name="wallet-activity" options={{ title: "Activity" }} />
        <Stack.Screen name="store/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="item/[store]/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="wallet" options={{ title: "Wallet" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="offers" options={{ title: "My offers" }} />
        <Stack.Screen name="offer/[id]" options={{ title: "Offer" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Track order" }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="wishlist" options={{ title: "Saved items" }} />
        <Stack.Screen name="support" options={{ title: "Help & support" }} />
        <Stack.Screen name="profile" options={{ title: "My profile" }} />
        <Stack.Screen name="addresses" options={{ title: "Saved addresses" }} />
        <Stack.Screen name="address/[id]" options={{ title: "Address" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeModeProvider>
          <StoreConfigProvider>
            <AuthProvider>
              <PulseProvider>
              <CartProvider>
                <ToastProvider>
                  <CartFeedbackProvider>
                    <DialogProvider>
                      <MenuProvider>
                        <StoreNotificationsProvider>
                            <AccountExtrasProvider>
                              <ThemedNavigator />
                            </AccountExtrasProvider>
                        </StoreNotificationsProvider>
                      </MenuProvider>
                    </DialogProvider>
                  </CartFeedbackProvider>
                </ToastProvider>
              </CartProvider>
              </PulseProvider>
            </AuthProvider>
          </StoreConfigProvider>
        </ThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
