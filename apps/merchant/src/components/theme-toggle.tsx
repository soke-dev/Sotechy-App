"use client";

// Light / dark switch. The choice is kept in this browser and applied by a small script in the page head
// (lib/theme-script) before anything paints, so the dashboard never flashes the wrong colours.
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme-script";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const current = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as const);
  const dark = theme === "dark";
  const flip = () => {
    const next = dark ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`flex items-center justify-center gap-2 rounded-full text-sm font-semibold text-ink-2 transition hover:bg-surface-alt ${withLabel ? "min-h-10 px-3" : "h-9 w-9"}`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {withLabel && (dark ? "Light mode" : "Dark mode")}
    </button>
  );
}
