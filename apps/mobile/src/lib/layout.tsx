// Phone or desktop. On a wide browser (app.sotechy.shop on a computer) the app gets a sidebar on the left
// and its pages sit in a centred column, so screens size themselves from that column, not the window.
import { createContext, useContext, type ReactNode } from "react";
import { Platform, useWindowDimensions, type ViewStyle } from "react-native";
import { gutter, radius, space } from "./theme";

/** From this width, a browser gets the desktop layout */
export const DESKTOP_MIN = 1024;
export const SIDEBAR_WIDTH = 256;

const ColumnContext = createContext<number | null>(null);

export function ColumnProvider({ width, children }: { width: number; children: ReactNode }) {
  return <ColumnContext.Provider value={width}>{children}</ColumnContext.Provider>;
}

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN;
}

/** The width a page has: the whole screen on a phone, the centre column on desktop */
export function useScreenWidth() {
  const column = useContext(ColumnContext);
  const { width } = useWindowDimensions();
  return column ?? width;
}

/** Room for content: as on phones (up to 720), or the centre column on desktop */
export function useContentWidth() {
  const column = useContext(ColumnContext);
  const { width } = useWindowDimensions();
  return column ?? Math.min(width, 720);
}

/** Product grids: 2 across on phones, 3 to 5 on desktop, cards about 230 wide */
export function useGrid(gap: number = space.md, padding: number = gutter) {
  const column = useContext(ColumnContext);
  const w = useContentWidth() - padding * 2;
  const columns = column ? Math.min(5, Math.max(3, Math.floor((w + gap) / (230 + gap)))) : 2;
  return { columns, cardWidth: (w - gap * (columns - 1)) / columns };
}

/** Bottom sheets become centred dialogs on desktop: the backdrop's layout and the panel's shape */
export function useSheetFrame(maxWidth = 540): { outer: ViewStyle; panel: ViewStyle } | null {
  const desktop = useIsDesktop();
  if (!desktop) return null;
  return {
    outer: { justifyContent: "center", alignItems: "center", padding: space.xl },
    panel: { width: maxWidth, maxWidth: "100%", maxHeight: "86%", borderRadius: radius.xl, overflow: "hidden" },
  };
}
