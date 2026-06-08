/**
 * KT theme system — 3 swappable palettes.
 *
 * Each theme defines the same set of semantic tokens. They get applied to the
 * document root as CSS variables and as a JS object that components can read
 * directly via `useTheme()` (no styled-components, no Tailwind — keeps the
 * migration 1:1 with the prototype).
 */

/** The app ships locked to the official Kingdoms Touch brand palette. */
export type ThemeName = 'forest';

export interface KtColors {
  forest: string;
  forestDeep: string;
  forestSoft: string;
  gold: string;
  goldSoft: string;
  goldDeep: string;
  charcoal: string;
  ink: string;
  ivory: string;
  ivoryDeep: string;
  sage: string;
  sageSoft: string;
  line: string;
  lineStrong: string;
  muted: string;
  /** Destructive / warning accent (reused across reset, sign-out, needs-update). */
  danger: string;
  dangerSoft: string;
  dangerLine: string;
}

/** Forest & Gold — premium nature-services palette (default) */
export const FOREST_GOLD: KtColors = {
  forest: '#1F3D2B',
  forestDeep: '#15291D',
  forestSoft: '#2A5238',
  gold: '#C4984C',
  goldSoft: '#E0C079',
  // Darkened from #9C7228 to meet WCAG AA (4.5:1) for small label text on ivory.
  goldDeep: '#8A6420',
  charcoal: '#1A1A1A',
  ink: '#2A2620',
  ivory: '#F7F3E8',
  ivoryDeep: '#ECE5D3',
  sage: '#8FA58B',
  sageSoft: '#C5D0BD',
  line: 'rgba(31,61,43,0.12)',
  lineStrong: 'rgba(31,61,43,0.18)',
  muted: '#6B6358',
  danger: '#A04A2E',
  dangerSoft: 'rgba(160,74,46,0.12)',
  dangerLine: 'rgba(160,74,46,0.28)',
};

export const THEMES: Record<ThemeName, KtColors> = {
  forest: FOREST_GOLD,
};

const DEFAULT_THEME: ThemeName = ((import.meta.env.VITE_DEFAULT_THEME as
  | ThemeName
  | undefined) ?? 'forest') as ThemeName;

const STORAGE_KEY = 'kt:theme';

/** Read the currently-active theme name (defaults to env or 'forest'). */
export function getActiveThemeName(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
  if (saved && saved in THEMES) return saved;
  return DEFAULT_THEME;
}

/** Resolve the colour object for the currently-active theme. */
export function getActiveTheme(): KtColors {
  return THEMES[getActiveThemeName()];
}

/** Apply a theme: write CSS variables to <html> + persist choice. */
export function applyTheme(name: ThemeName): void {
  const colors = THEMES[name];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(colors)) {
    root.style.setProperty(`--kt-${kebab(k)}`, v);
  }
  root.dataset.theme = name;
  window.localStorage.setItem(STORAGE_KEY, name);
  // Also update theme-color meta so the install / status bar follows.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors.forest);
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Shared typography tokens. */
export const FONTS = {
  body: "'Manrope', system-ui, -apple-system, Segoe UI, sans-serif",
  display: "'Cinzel', Georgia, 'Times New Roman', serif",
  mono: "'ui-monospace', 'SF Mono', Menlo, monospace",
};

/** Phone artboard dimensions (the prototype's design grid). */
export const PHONE = { width: 390, height: 844 } as const;
