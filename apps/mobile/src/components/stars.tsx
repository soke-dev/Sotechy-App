import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { colors } from "@/lib/theme";

/** Five stars filled to `value` (supports halves). */
export function Stars({ value, size = 14, color = colors.brandYellow, emptyColor = colors.line }: { value: number; size?: number; color?: string; emptyColor?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i ? "star" : value >= i - 0.5 ? "star-half" : "star";
        return <Ionicons key={i} name={name} size={size} color={value >= i - 0.5 ? color : emptyColor} />;
      })}
    </View>
  );
}
