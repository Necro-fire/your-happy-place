// Theme + palette manager. Persists to localStorage; applies CSS variables and
// the `.dark` class to <html>. Public routes and admin routes both use this.

export type ThemeMode = "light" | "dark" | "auto";
export type Palette = {
  primary: string;      // oklch()
  secondary: string;
  accent: string;
  ring: string;
  sidebar: string;
  "sidebar-primary": string;
};

const STORAGE_KEY = "app-theme-v1";

type Stored = { mode: ThemeMode; palette?: Partial<Palette>; preset?: string };

export const PRESETS: Record<string, { label: string; light: Palette; dark: Palette }> = {
  profissional: {
    label: "Profissional",
    light: {
      primary: "oklch(0.45 0.10 250)",
      secondary: "oklch(0.94 0.02 250)",
      accent: "oklch(0.68 0.14 220)",
      ring: "oklch(0.45 0.10 250)",
      sidebar: "oklch(0.22 0.03 250)",
      "sidebar-primary": "oklch(0.68 0.14 220)",
    },
    dark: {
      primary: "oklch(0.72 0.13 240)",
      secondary: "oklch(0.28 0.025 250)",
      accent: "oklch(0.72 0.14 220)",
      ring: "oklch(0.72 0.13 240)",
      sidebar: "oklch(0.15 0.02 250)",
      "sidebar-primary": "oklch(0.72 0.14 220)",
    },
  },
  moderno: {
    label: "Moderno",
    light: {
      primary: "oklch(0.55 0.20 300)",
      secondary: "oklch(0.94 0.02 300)",
      accent: "oklch(0.72 0.17 340)",
      ring: "oklch(0.55 0.20 300)",
      sidebar: "oklch(0.22 0.04 300)",
      "sidebar-primary": "oklch(0.72 0.17 340)",
    },
    dark: {
      primary: "oklch(0.72 0.18 310)",
      secondary: "oklch(0.28 0.03 300)",
      accent: "oklch(0.75 0.16 340)",
      ring: "oklch(0.72 0.18 310)",
      sidebar: "oklch(0.14 0.02 300)",
      "sidebar-primary": "oklch(0.75 0.16 340)",
    },
  },
  premium: {
    label: "Escuro Premium",
    light: {
      primary: "oklch(0.55 0.15 160)",
      secondary: "oklch(0.94 0.02 160)",
      accent: "oklch(0.75 0.15 90)",
      ring: "oklch(0.55 0.15 160)",
      sidebar: "oklch(0.20 0.02 160)",
      "sidebar-primary": "oklch(0.75 0.15 90)",
    },
    dark: {
      primary: "oklch(0.72 0.16 160)",
      secondary: "oklch(0.26 0.02 160)",
      accent: "oklch(0.80 0.15 90)",
      ring: "oklch(0.72 0.16 160)",
      sidebar: "oklch(0.12 0.015 160)",
      "sidebar-primary": "oklch(0.80 0.15 90)",
    },
  },
};

export function loadStored(): Stored {
  if (typeof window === "undefined") return { mode: "light" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "light" };
    return JSON.parse(raw) as Stored;
  } catch { return { mode: "light" }; }
}

export function saveStored(s: Stored) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* empty */ }
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

const VAR_MAP: Record<keyof Palette, string> = {
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  ring: "--ring",
  sidebar: "--sidebar",
  "sidebar-primary": "--sidebar-primary",
};

export function applyTheme(stored: Stored) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const resolved = resolveMode(stored.mode);
  html.classList.toggle("dark", resolved === "dark");

  // Clear previous overrides
  for (const cssVar of Object.values(VAR_MAP)) html.style.removeProperty(cssVar);

  // Apply preset baseline first, then user overrides
  const presetKey = stored.preset && PRESETS[stored.preset] ? stored.preset : "padaria";
  const preset = PRESETS[presetKey][resolved];
  for (const [k, v] of Object.entries(preset) as [keyof Palette, string][]) {
    html.style.setProperty(VAR_MAP[k], v);
  }
  if (stored.palette) {
    for (const [k, v] of Object.entries(stored.palette) as [keyof Palette, string | undefined][]) {
      if (v) html.style.setProperty(VAR_MAP[k], v);
    }
  }
}

export function initTheme() {
  applyTheme(loadStored());
  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => {
      const s = loadStored();
      if (s.mode === "auto") applyTheme(s);
    });
  }
}
