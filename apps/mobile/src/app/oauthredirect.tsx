// Google hands sign-in back to the app at shop.sotechy.app:/oauthredirect (Android). The sign-in screen
// reads the result itself; this page only steps back to it, instead of "Unmatched route".
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/lib/theme";

export default function OAuthRedirect() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  }, []);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}
