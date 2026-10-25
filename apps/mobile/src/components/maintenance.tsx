// Full-screen notice shown instead of the shop while maintenance mode is on (Admin → App switches).
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStoreConfig } from "@/lib/store-config";
import { colors, gutter, space } from "@/lib/theme";
import { Illo } from "./illustrations";
import { Button, Txt } from "./ui";

export function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const { config, features, reload } = useStoreConfig();
  const [checking, setChecking] = useState(false);
  const phone = config?.support.phone;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, paddingHorizontal: gutter, alignItems: "center", justifyContent: "center", gap: space.lg }}>
      <Image source={require("../../assets/brand/light-logo-small.png")} style={{ width: 120, height: 48 }} contentFit="contain" />
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Illo name="store" size={72} />
      </View>
      <Txt variant="title" style={{ textAlign: "center" }}>We&apos;ll be right back</Txt>
      <Txt variant="body" color={colors.ink2} style={{ textAlign: "center", maxWidth: 320 }}>{features.maintenanceMessage}</Txt>
      <View style={{ gap: space.sm, maxWidth: 360, width: "100%" }}>
        <Button
          title="Try again"
          icon="refresh"
          variant="dark"
          loading={checking}
          onPress={async () => {
            setChecking(true);
            await reload();
            setChecking(false);
          }}
        />
        {phone ? <Button title="Call the store" icon="call-outline" variant="outline" onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
      </View>
    </View>
  );
}
