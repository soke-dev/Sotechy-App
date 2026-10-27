// Storefront themes merchants can pick (or start from a preset and choose their own accent).

export interface StoreTheme {
  id: string;
  name: string;
  /** Buttons, prices, highlights */
  accent: string;
  /** Text on the accent colour */
  onAccent: string;
  /** Page background */
  background: string;
  /** Cards */
  surface: string;
  text: string;
  muted: string;
  /** Store header band */
  hero: string;
  onHero: string;
  dark?: boolean;
}

export const THEME_PRESETS: StoreTheme[] = [
  { id: "sotechy", name: "Sotechy Orange", accent: "#F7931E", onAccent: "#FFFFFF", background: "#FAF7F3", surface: "#FFFFFF", text: "#17120E", muted: "#7F756C", hero: "#17120E", onHero: "#FFFFFF" },
  { id: "midnight", name: "Midnight", accent: "#FDB913", onAccent: "#17120E", background: "#0F1420", surface: "#171E2E", text: "#F3F4F6", muted: "#9AA3B2", hero: "#1E2740", onHero: "#FFFFFF", dark: true },
  { id: "forest", name: "Forest", accent: "#1F7A4D", onAccent: "#FFFFFF", background: "#F3F7F2", surface: "#FFFFFF", text: "#13241A", muted: "#5E7365", hero: "#1F3D2B", onHero: "#FFFFFF" },
  { id: "ocean", name: "Ocean", accent: "#1D6FD6", onAccent: "#FFFFFF", background: "#F2F6FB", surface: "#FFFFFF", text: "#0F1B2D", muted: "#5B6B80", hero: "#0E3A6E", onHero: "#FFFFFF" },
  { id: "blush", name: "Blush", accent: "#D94F7A", onAccent: "#FFFFFF", background: "#FDF5F6", surface: "#FFFFFF", text: "#2A1418", muted: "#86656C", hero: "#F9D9E0", onHero: "#2A1418" },
  { id: "mono", name: "Mono", accent: "#111111", onAccent: "#FFFFFF", background: "#F6F6F6", surface: "#FFFFFF", text: "#111111", muted: "#6B6B6B", hero: "#111111", onHero: "#FFFFFF" },
];

const luminance = (hex: string) => {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** White or dark text, whichever reads better on a colour */
const readableOn = (colour: string) => (contrast(colour, "#FFFFFF") >= contrast(colour, "#17120E") ? "#FFFFFF" : "#17120E");

/** A preset with the merchant's own accent; text on the accent flips to stay readable. */
export function withAccent(base: StoreTheme, accent: string): StoreTheme {
  return { ...base, id: "custom", accent, onAccent: readableOn(accent) };
}

/** A preset with the merchant's own brand (header) colour and accent */
export function withColours(base: StoreTheme, colours: { accent?: string | null; hero?: string | null }): StoreTheme {
  const t = colours.accent ? withAccent(base, colours.accent) : base;
  return colours.hero ? { ...t, id: "custom", hero: colours.hero, onHero: readableOn(colours.hero) } : t;
}

/** A store's saved look */
export const storeTheme = (sf: { themeId?: string; accent?: string | null; hero?: string | null } | null | undefined) =>
  withColours(THEME_PRESETS.find((p) => p.id === sf?.themeId) ?? THEME_PRESETS[0], { accent: sf?.accent, hero: sf?.hero });

/** Readability check for a merchant's own accent (the presets are already checked). */
export function themeWarnings(t: StoreTheme) {
  const warnings: string[] = [];
  if (t.id !== "custom") return warnings;
  if (contrast(t.accent, t.background) < 1.5) warnings.push("This colour almost disappears on your page background. Pick a darker or brighter one.");
  if (contrast(t.accent, t.onAccent) < 2.2) warnings.push("Text on buttons will be hard to read in this colour.");
  return warnings;
}
