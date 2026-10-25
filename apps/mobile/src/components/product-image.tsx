// Product photo on Sotechy orange with a soft glow and an optional white brand mark.
// Product images are transparent cut-outs, so the orange shows through around the item.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { lightPalette } from "@/lib/theme";
import { productIcon } from "./ui";

const ORANGE = lightPalette.brand;
const GLOW = "#FFB25C";

export function ProductImage({
  uri,
  name,
  style,
  radius = 0,
  padding = 10,
  iconSize = 40,
  mark = false,
  dimmed = false,
}: {
  uri?: string | null;
  name: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  padding?: number;
  iconSize?: number;
  /** small white SoTechy mark in the corner (product cards) */
  mark?: boolean;
  dimmed?: boolean;
}) {
  return (
    <View style={[{ backgroundColor: ORANGE, borderRadius: radius, overflow: "hidden" }, style]}>
      <View style={{ position: "absolute", top: "14%", left: "14%", right: "14%", bottom: "14%", borderRadius: 999, backgroundColor: GLOW, opacity: 0.55 }} />
      {uri ? (
        <Image source={{ uri }} style={{ flex: 1, margin: padding, opacity: dimmed ? 0.5 : 1 }} contentFit="contain" transition={150} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={productIcon(name)} size={iconSize} color="#FFFFFF" />
        </View>
      )}
      {mark && (
        <Image
          source={require("../../assets/brand/sotechylogo.png")}
          tintColor="#FFFFFF"
          style={{ position: "absolute", right: 8, bottom: 8, width: 18, height: 18, opacity: 0.9 }}
          contentFit="contain"
        />
      )}
    </View>
  );
}
