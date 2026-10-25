import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MenuProvider } from "@/components/menu";
import { ToastProvider } from "@/components/toast";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { colors, fonts } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <MenuProvider>
              <StatusBar style="dark" />
              <Stack
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
                <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
                <Stack.Screen name="order/[id]" options={{ title: "Order details" }} />
                <Stack.Screen name="sign-in" options={{ title: "", presentation: "modal" }} />
                <Stack.Screen name="wishlist" options={{ title: "Saved items" }} />
                <Stack.Screen name="support" options={{ title: "Help & support" }} />
              </Stack>
              </MenuProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
