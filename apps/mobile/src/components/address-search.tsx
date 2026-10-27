// The street field with address suggestions while typing (Nigeria only). Picking one fills the street,
// city and state; "Enter it manually" hides the list so people can type anything.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { AddressSuggestion } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, radius, space } from "@/lib/theme";
import { Input, Txt } from "./ui";

export function AddressSearch({ label = "Street address", value, onChangeText, onPick }: { label?: string; value: string; onChangeText: (v: string) => void; onPick: (s: AddressSuggestion) => void }) {
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [manual, setManual] = useState(false);
  const [focused, setFocused] = useState(false);
  // Only look up what the person typed, not what a pick filled in
  const typed = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || manual || q.length < 3) {
      setResults([]);
      return;
    }
    let live = true;
    // Wait for a pause in typing before asking
    const t = setTimeout(() => {
      api.addressSuggestions(q).then(
        (r) => live && setResults(r),
        () => live && setResults([]),
      );
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [value, manual]);

  const open = focused && !manual && results.length > 0;
  return (
    <View style={{ gap: 6 }}>
      <Input
        label={label}
        icon="home-outline"
        value={value}
        placeholder="Start typing your street"
        autoComplete="street-address"
        onChangeText={(v) => {
          typed.current = true;
          onChangeText(v);
        }}
        onFocus={() => setFocused(true)}
        // Leave time for a tap on a suggestion to land
        onBlur={() => setTimeout(() => setFocused(false), 200)}
      />
      {open && (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: "hidden" }}>
          {results.map((s, i) => (
            <Pressable
              key={s.label}
              onPress={() => {
                typed.current = false;
                setResults([]);
                onPick(s);
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface })}
            >
              <Ionicons name="location-outline" size={17} color={colors.muted} />
              <Txt variant="body" numberOfLines={2} style={{ flex: 1, fontSize: 14.5 }}>{s.label}</Txt>
            </Pressable>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt }}>
            <Pressable onPress={() => setManual(true)} hitSlop={6} style={{ flexShrink: 1 }}>
              <Txt variant="small">
                Can&apos;t see it?{" "}
                <Txt variant="label" color={colors.brandPressed} style={{ fontSize: 13 }}>
                  Enter it manually
                </Txt>
              </Txt>
            </Pressable>
            <Txt variant="caption" style={{ fontSize: 10.5 }}>Powered by Geoapify</Txt>
          </View>
        </View>
      )}
    </View>
  );
}
