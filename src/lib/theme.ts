// Theme + palette manager. Persists to localStorage; applies CSS variables and
// the `.dark` class to <html>. Only official presets are available — no custom
// palettes or per-color overrides.

export type ThemeMode = "light" | "dark";
export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  ring: string;
  sidebar: string;
  "sidebar-primary": string;
};

const STORAGE_KEY = "app-theme-v2";
const LEGACY_KEY = "app-theme-v1";

type Stored = { mode: ThemeMode; preset: string };

export const PRESETS: Record<string, { label: string; light: Palette; dark: Palette }> = {
  azul: {
    label: "Azul",
    light: {
      primary: "oklch(0.55 0.18 255)",
      secondary: "oklch(0.94 0.02 255)",
      accent: "oklch(0.70 0.14 240)",
      ring: "oklch(0.55 0.18 255)",
      sidebar: "oklch(0.22 0.04 255)",
      "sidebar-primary": "oklch(0.70 0.14 240)",
    },
    dark: {
      primary: "oklch(0.72 0.15 250)",
      secondary: "oklch(0.28 0.03 255)",
      accent: "oklch(0.75 0.14 240)",
      ring: "oklch(0.72 0.15 250)",
      sidebar: "oklch(0.14 0.02 255)",
      "sidebar-primary": "oklch(0.75 0.14 240)",
    },
  },
  verde: {
    label: "Verde",
    light: {
      primary: "oklch(0.55 0.15 150)",
      secondary: "oklch(0.94 0.02 150)",
      accent: "oklch(0.72 0.15 155)",
      ring: "oklch(0.55 0.15 150)",
      sidebar: "oklch(0.22 0.03 150)",
      "sidebar-primary": "oklch(0.72 0.15 155)",
    },
    dark: {
      primary: "oklch(0.75 0.16 150)",
      secondary: "oklch(0.26 0.02 150)",
      accent: "oklch(0.78 0.15 155)",
      ring: "oklch(0.75 0.16 150)",
      sidebar: "oklch(0.13 0.015 150)",
      "sidebar-primary": "oklch(0.78 0.15 155)",
    },
  },
  roxo: {
    label: "Roxo",
    light: {
      primary: "oklch(0.55 0.20 300)",
      secondary: "oklch(0.94 0.02 300)",
      accent: "oklch(0.72 0.17 315)",
      ring: "oklch(0.55 0.20 300)",
      sidebar: "oklch(0.22 0.04 300)",
      "sidebar-primary": "oklch(0.72 0.17 315)",
    },
    dark: {
      primary: "oklch(0.72 0.18 305)",
      secondary: "oklch(0.28 0.03 300)",
      accent: "oklch(0.75 0.16 315)",
      ring: "oklch(0.72 0.18 305)",
      sidebar: "oklch(0.14 0.02 300)",
      "sidebar-primary": "oklch(0.75 0.16 315)",
    },
  },
  vermelho: {
    label: "Vermelho",
    light: {
      primary: "oklch(0.55 0.20 25)",
      secondary: "oklch(0.94 0.02 25)",
      accent: "oklch(0.70 0.18 25)",
      ring: "oklch(0.55 0.20 25)",
      sidebar: "oklch(0.22 0.04 25)",
      "sidebar-primary": "oklch(0.70 0.18 25)",
    },
    dark: {
      primary: "oklch(0.72 0.19 25)",
      secondary: "oklch(0.28 0.03 25)",
      accent: "oklch(0.76 0.18 25)",
      ring: "oklch(0.72 0.19 25)",
      sidebar: "oklch(0.14 0.02 25)",
      "sidebar-primary": "oklch(0.76 0.18 25)",
    },
  },
  laranja: {
    label: "Laranja",
    light: {
      primary: "oklch(0.65 0.17 55)",
      secondary: "oklch(0.94 0.03 55)",
      accent: "oklch(0.75 0.15 65)",
      ring: "oklch(0.65 0.17 55)",
      sidebar: "oklch(0.24 0.04 55)",
      "sidebar-primary": "oklch(0.75 0.15 65)",
    },
    dark: {
      primary: "oklch(0.75 0.16 55)",
      secondary: "oklch(0.28 0.03 55)",
      accent: "oklch(0.80 0.14 65)",
      ring: "oklch(0.75 0.16 55)",
      sidebar: "oklch(0.15 0.02 55)",
      "sidebar-primary": "oklch(0.80 0.14 65)",
    },
  },
  ciano: {
    label: "Ciano",
    light: {
      primary: "oklch(0.60 0.12 200)",
      secondary: "oklch(0.94 0.02 200)",
      accent: "oklch(0.72 0.13 195)",
      ring: "oklch(0.60 0.12 200)",
      sidebar: "oklch(0.22 0.03 200)",
      "sidebar-primary": "oklch(0.72 0.13 195)",
    },
    dark: {
      primary: "oklch(0.75 0.13 200)",
      secondary: "oklch(0.28 0.03 200)",
      accent: "oklch(0.78 0.13 195)",
      ring: "oklch(0.75 0.13 200)",
      sidebar: "oklch(0.14 0.02 200)",
      "sidebar-primary": "oklch(0.78 0.13 195)",
    },
  },
  indigo: {
    label: "Índigo",
    light: {
      primary: "oklch(0.48 0.18 275)",
      secondary: "oklch(0.94 0.02 275)",
      accent: "oklch(0.65 0.17 275)",
      ring: "oklch(0.48 0.18 275)",
      sidebar: "oklch(0.20 0.04 275)",
      "sidebar-primary": "oklch(0.65 0.17 275)",
    },
    dark: {
      primary: "oklch(0.70 0.16 275)",
      secondary: "oklch(0.26 0.03 275)",
      accent: "oklch(0.75 0.16 275)",
      ring: "oklch(0.70 0.16 275)",
      sidebar: "oklch(0.12 0.02 275)",
      "sidebar-primary": "oklch(0.75 0.16 275)",
    },
  },
  cinza: {
    label: "Cinza",
    light: {
      primary: "oklch(0.40 0.02 260)",
      secondary: "oklch(0.94 0.005 260)",
      accent: "oklch(0.58 0.03 260)",
      ring: "oklch(0.40 0.02 260)",
      sidebar: "oklch(0.22 0.01 260)",
      "sidebar-primary": "oklch(0.62 0.03 260)",
    },
    dark: {
      primary: "oklch(0.75 0.02 260)",
      secondary: "oklch(0.26 0.01 260)",
      accent: "oklch(0.62 0.03 260)",
      ring: "oklch(0.75 0.02 260)",
      sidebar: "oklch(0.13 0.005 260)",
      "sidebar-primary": "oklch(0.72 0.02 260)",
    },
  },
};

const DEFAULT: Stored = { mode: "light", preset: "azul" };

export function loadStored(): Stored {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>;
      const mode: ThemeMode = parsed.mode === "dark" ? "dark" : "light";
      const preset = parsed.preset && PRESETS[parsed.preset] ? parsed.preset : DEFAULT.preset;
      return { mode, preset };
    }
    // Migrate legacy v1 (may contain custom palette + auto mode)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { mode?: string; preset?: string };
      const mode: ThemeMode =
        parsed.mode === "dark"
          ? "dark"
          : parsed.mode === "auto"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : "light";
      const preset = parsed.preset && PRESETS[parsed.preset] ? parsed.preset : DEFAULT.preset;
      const migrated = { mode, preset };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* noop */
  }
  return { ...DEFAULT };
}

export function saveStored(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
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
  html.classList.toggle("dark", stored.mode === "dark");

  for (const cssVar of Object.values(VAR_MAP)) html.style.removeProperty(cssVar);

  const presetKey = PRESETS[stored.preset] ? stored.preset : DEFAULT.preset;
  const palette = PRESETS[presetKey][stored.mode];
  for (const [k, v] of Object.entries(palette) as [keyof Palette, string][]) {
    html.style.setProperty(VAR_MAP[k], v);
  }
}

export function setMode(mode: ThemeMode) {
  const next = { ...loadStored(), mode };
  saveStored(next);
  applyTheme(next);
}

export function setPreset(preset: string) {
  if (!PRESETS[preset]) return;
  const next = { ...loadStored(), preset };
  saveStored(next);
  applyTheme(next);
}

export function initTheme() {
  applyTheme(loadStored());
}
