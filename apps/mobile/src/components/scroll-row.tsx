// A row that scrolls sideways. On desktop, where there's no swipe, round arrow buttons at each end
// move it along (each hides when there's nothing more that way).
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Pressable, ScrollView, View, type ScrollViewProps } from "react-native";
import { useIsDesktop } from "@/lib/layout";
import { colors } from "@/lib/theme";

function Arrow({ side, onPress }: { side: "left" | "right"; onPress: () => void }) {
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, [side]: 4, justifyContent: "center" }}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={side === "left" ? "Scroll left" : "Scroll right"}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed || hovered ? colors.inverse : colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: "#2B1D0E",
          shadowOpacity: 0.14,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        })}
      >
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          <Ionicons name={side === "left" ? "chevron-back" : "chevron-forward"} size={18} color={pressed || hovered ? colors.onInverse : colors.ink} />
        )}
      </Pressable>
    </View>
  );
}

export function ScrollRow({ children, ...props }: Omit<ScrollViewProps, "horizontal"> & { children: ReactNode }) {
  const desktop = useIsDesktop();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [x, setX] = useState(0);
  const [view, setView] = useState(0);
  const [content, setContent] = useState(0);
  const max = Math.max(0, content - view);
  const move = (dir: 1 | -1) => ref.current?.scrollTo({ x: Math.min(max, Math.max(0, x + dir * view * 0.8)), animated: true });

  return (
    <View>
      <ScrollView
        {...props}
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onLayout={(e) => {
          setView(e.nativeEvent.layout.width);
          props.onLayout?.(e);
        }}
        onContentSizeChange={(w, h) => {
          setContent(w);
          props.onContentSizeChange?.(w, h);
        }}
        onScroll={(e) => {
          setX(e.nativeEvent.contentOffset.x);
          props.onScroll?.(e);
        }}
      >
        {children}
      </ScrollView>
      {desktop && x > 4 && <Arrow side="left" onPress={() => move(-1)} />}
      {desktop && x < max - 4 && <Arrow side="right" onPress={() => move(1)} />}
    </View>
  );
}
