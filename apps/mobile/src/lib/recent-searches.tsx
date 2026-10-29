// The words someone searched for lately, kept on this phone and shared by Home's and Shop's search boxes.
// Tapping an empty search box shows them, newest first.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Txt } from "@/components/ui";
import { colors, radius, space } from "@/lib/theme";

const KEY = "sotechy_recent_searches";
const MAX = 8;

let list: string[] | null = null;
const listeners = new Set<(l: string[]) => void>();
const publish = (next: string[]) => {
  list = next;
  listeners.forEach((fn) => fn(next));
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
};

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>(list ?? []);
  useEffect(() => {
    listeners.add(setItems);
    if (list === null) {
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          list = raw ? (JSON.parse(raw) as string[]) : [];
          listeners.forEach((fn) => fn(list!));
        })
        .catch(() => (list = []));
    }
    return () => void listeners.delete(setItems);
  }, []);
  return {
    items,
    /** Remembers a search (newest first, no repeats whatever the capitals) */
    add: (term: string) => {
      const t = term.trim();
      if (t.length < 2) return;
      publish([t, ...(list ?? []).filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX));
    },
    remove: (term: string) => publish((list ?? []).filter((x) => x !== term)),
    clear: () => publish([]),
  };
}

/** The list under a search box: tap one to search it again, × to forget it */
export function RecentSearches({ items, onPick, onRemove, onClear }: { items: string[]; onPick: (term: string) => void; onRemove: (term: string) => void; onClear: () => void }) {
  if (!items.length) return null;
  return (
    <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md, paddingVertical: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.xs }}>
        <Txt variant="overline">Recent searches</Txt>
        <Pressable onPress={onClear} hitSlop={8}>
          <Txt variant="caption" color={colors.brandPressed}>Clear</Txt>
        </Pressable>
      </View>
      {items.map((term) => (
        <View key={term} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Pressable onPress={() => onPick(term)} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="time-outline" size={17} color={colors.faint} />
            <Txt variant="label" numberOfLines={1} style={{ flex: 1, fontSize: 14.5 }}>{term}</Txt>
          </Pressable>
          <Pressable onPress={() => onRemove(term)} hitSlop={10} accessibilityLabel={`Forget "${term}"`}>
            <Ionicons name="close" size={17} color={colors.faint} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
