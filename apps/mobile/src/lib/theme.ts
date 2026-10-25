// Sotechy design tokens. Orange and yellow come from the SoTechy logo; neutrals are warm, not grey-blue.
// `colors` is a live object: applyTheme() swaps its values between the light and dark palettes,
// and the navigation tree re-mounts so every screen picks the new values up (see lib/theme-mode).

export type ThemeName = "light" | "dark";

export const lightPalette = {
  brand: "#F7931E",
  brandPressed: "#E07F0C",
  brandSoft: "#FFF1DF",
  brandYellow: "#FDB913",

  /** text */
  ink: "#17120E",
  ink2: "#3A322C",
  muted: "#7F756C",
  faint: "#B3A99F",

  bg: "#FAF7F3",
  surface: "#FFFFFF",
  surfaceAlt: "#F2EDE6",
  line: "#E9E2D9",

  /** cards that stay dark in both themes (white text on top) */
  panel: "#17120E",
  panelPressed: "#3A322C",
  /** highest-contrast fill for primary dark buttons, active chips and badges */
  inverse: "#17120E",
  inversePressed: "#3A322C",
  onInverse: "#FFFFFF",

  success: "#1C8A4C",
  successSoft: "#E4F3E9",
  warning: "#A86A12",
  warningSoft: "#FFF3D9",
  danger: "#C9372A",
  dangerSoft: "#FBE7E4",
  white: "#FFFFFF",
  overlay: "rgba(23,18,14,0.5)",
};

export type Palette = typeof lightPalette;

export const darkPalette: Palette = {
  brand: "#F7931E",
  brandPressed: "#FFAB52",
  brandSoft: "#3A2914",
  brandYellow: "#FDB913",

  ink: "#F6F0E9",
  ink2: "#D8CEC4",
  muted: "#A79C90",
  faint: "#6E655D",

  bg: "#121010",
  surface: "#1C1816",
  surfaceAlt: "#272220",
  line: "#332C28",

  panel: "#2A2420",
  panelPressed: "#352E29",
  inverse: "#F6F0E9",
  inversePressed: "#E2D8CD",
  onInverse: "#17120E",

  success: "#4CC985",
  successSoft: "#15301F",
  warning: "#F2B54F",
  warningSoft: "#33281A",
  danger: "#FF7A6B",
  dangerSoft: "#3B1E1A",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.62)",
};

export const colors: Palette = { ...lightPalette };
export let themeName: ThemeName = "light";

export function applyTheme(name: ThemeName) {
  if (name === themeName) return;
  themeName = name;
  Object.assign(colors, name === "dark" ? darkPalette : lightPalette);
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
};

/** Screen side padding */
export const gutter = space.lg;
