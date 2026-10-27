// Product photo filling its tile, with an optional small brand mark. Without a photo, the product's
// icon sits on a soft warm tile with a white glow.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { lightPalette } from "@/lib/theme";
import { productIcon } from "./ui";

const TILE = "#F1ECE5";
const GLOW = "#FFFFFF";

export function ProductImage({
  uri,
  name,
  style,
  radius = 0,
  iconSize = 40,
  mark = false,
  dimmed = false,
}: {
  uri?: string | null;
  name: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** No longer used: photos fill the tile */
  padding?: number;
  iconSize?: number;
  /** small white SoTechy mark in the corner (product cards) */
  mark?: boolean;
  dimmed?: boolean;
}) {
  return (
    <View style={[{ backgroundColor: TILE, borderRadius: radius, overflow: "hidden" }, style]}>
      {!uri && <View style={{ position: "absolute", top: "14%", left: "14%", right: "14%", bottom: "14%", borderRadius: 999, backgroundColor: GLOW, opacity: 0.7 }} />}
      {uri ? (
        <Image source={{ uri }} style={{ flex: 1, opacity: dimmed ? 0.5 : 1 }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={productIcon(name)} size={iconSize} color={lightPalette.faint} />
        </View>
      )}
      {mark && (
        <Image
          source={require("../../assets/brand/sotechylogo.png")}
          tintColor={lightPalette.brand}
          style={{ position: "absolute", right: 8, bottom: 8, width: 16, height: 16, opacity: 0.55 }}
          contentFit="contain"
        />
      )}
    </View>
  );
}
