// A compact category button (Home's "Shop by category" and Shop's category row): a small round
// picture or icon, then the name. `active` marks the one Shop is showing.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";
import { Txt, type IconName } from "./ui";

export function CategoryTile({ label, onPress, image, icon, active }: { label: string; onPress: () => void; image?: string | null; icon: IconName; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 5,
        paddingRight: 14,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.inverse : pressed ? colors.surfaceAlt : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.inverse : colors.line,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: active ? colors.brand : colors.brandSoft, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {image ? <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Ionicons name={icon} size={17} color={active ? colors.white : colors.brandPressed} />}
      </View>
      <Txt variant="label" numberOfLines={1} color={active ? colors.onInverse : colors.ink} style={{ fontSize: 13.5, fontFamily: active ? fonts.semibold : undefined }}>
        {label}
      </Txt>
    </Pressable>
  );
}
