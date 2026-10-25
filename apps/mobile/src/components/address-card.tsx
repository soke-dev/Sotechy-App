import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { Address } from "@sotechy/shared";
import { colors, radius, space } from "@/lib/theme";
import { Illo } from "./illustrations";
import { Pill, tap, Txt } from "./ui";

export const formatAddress = (a: Pick<Address, "line1" | "line2" | "city" | "state">) => [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ");

/** A saved address. Pass `selected` to show it as a selectable option (checkout). */
export function AddressCard({ address, selected, onPress, footer }: { address: Address; selected?: boolean; onPress?: () => void; footer?: ReactNode }) {
  const selectable = selected !== undefined;
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              tap();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.ink : colors.line,
        padding: space.lg,
        gap: space.md,
      }}
    >
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Illo name={address.label?.toLowerCase() === "office" ? "store" : "home"} size={28} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Txt variant="label">{address.label ?? "Address"}</Txt>
            {address.isDefault && <Pill label="Default" tone="brand" />}
          </View>
          <Txt variant="medium" style={{ fontSize: 14 }}>
            {address.recipientName} · {address.phone}
          </Txt>
          <Txt variant="small">{formatAddress(address)}</Txt>
        </View>
        {selectable && (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 7 : 1.5, borderColor: selected ? colors.ink : colors.faint, marginTop: 2 }} />
        )}
      </View>
      {footer}
    </Pressable>
  );
}
