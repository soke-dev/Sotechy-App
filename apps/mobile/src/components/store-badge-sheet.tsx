// What a store's badge means, from its page: an official store is a registered business whose documents
// Sotechy checked (orange tick); a verified store is a freelancer or individual whose ID it checked (blue tick).
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { colors, fonts, radius, space } from "@/lib/theme";
import { Sheet } from "./shop-filters";
import { Button, Txt } from "./ui";

const ORANGE = "#F7931E";
const BLUE = "#2F6FB3";

export function StoreBadgeSheet({ visible, official, storeName, onClose }: { visible: boolean; official: boolean; storeName: string; onClose: () => void }) {
  const tint = official ? ORANGE : BLUE;
  const checks = official
    ? [
        ["business", "A registered business", "Its CAC registration and business documents were checked by Sotechy."],
        ["person", "The owner is who they say", "Their ID and a live selfie were checked."],
        ["bicycle", "Real delivery areas", "Every area it delivers to was approved by Sotechy."],
      ]
    : [
        ["person", "A real, checked person", "Their ID and a live selfie were checked by Sotechy."],
        ["bicycle", "Real delivery areas", "Every area they deliver to was approved by Sotechy."],
      ];
  return (
    <Sheet visible={visible} title={official ? "Official store" : "Verified store"} onClose={onClose} footer={<Button title="Got it" variant="dark" onPress={onClose} />}>
      <View style={{ alignItems: "center", gap: space.sm, paddingBottom: space.sm }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${tint}22`, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark-circle" size={46} color={tint} />
        </View>
        <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 20, textAlign: "center", color: colors.ink }}>
          {official ? `${storeName} is an official store` : `${storeName} is verified`}
        </Txt>
        <Txt variant="small" color={colors.ink2} style={{ textAlign: "center" }}>
          {official ? "The orange tick is for registered businesses Sotechy has checked." : "The blue tick is for freelancers and individuals Sotechy has checked."}
        </Txt>
      </View>
      <View style={{ gap: space.md }}>
        {checks.map(([icon, title, body]) => (
          <View key={title} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.md }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: `${tint}22`, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={icon as "person"} size={17} color={tint} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">{title}</Txt>
              <Txt variant="small" color={colors.ink2}>{body}</Txt>
            </View>
          </View>
        ))}
        <Txt variant="caption" style={{ textAlign: "center" }}>Something wrong with an order? Tell Sotechy from the order and we step in.</Txt>
      </View>
    </Sheet>
  );
}
