export type ThemeId =
  | "amahas-signature"
  | "morning-dawn"
  | "night-focus"
  | "daylight"
  | "light-classic"
  | "dark-classic"
  | "grey-studio"
  | "pure-white"
  | "pure-black"
  | "graphite"
  | "crimson-red"
  | "ocean-blue"
  | "sea-breeze"
  | "nature-green"
  | "forest"
  | "mountain"
  | "sky"
  | "sunset"
  | "space-explorer"
  | "scientific-lab"
  | "electronics-bench"
  | "cyber-circuit"
  | "aurora"
  | "solar-flare";

export type ThemeCategory =
  | "recommended"
  | "time-of-day"
  | "light"
  | "dark"
  | "neutral"
  | "nature"
  | "color"
  | "science-engineering";

export type AppearanceMode = "manual" | "system" | "time";

export interface ThemeTokens {
  // Surface Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgSidebar: string;
  bgCard: string;

  // Borders & Dividers
  border: string;
  borderFocus: string;
  borderSubtle: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accents
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  accentHover: string;
  accentText: string; // readable text color over accentPrimary (e.g. #070b14 or #ffffff)

  // Interactive controls: Buttons & Inputs
  buttonBg: string;
  buttonText: string;
  buttonHover: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;

  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  // System States
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;

  // Badges & Highlights
  badgeBg: string;
  badgeText: string;

  // Visual cues: Focus rings, Scrollbars, Shadows/Glow
  ring: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  glow?: string;

  // Data Visualizations & Charts (at least 5 harmonious colors)
  chartColors: [string, string, string, string, string];
}

export interface Theme {
  id: ThemeId;
  name: string;
  category: ThemeCategory;
  isDark: boolean;
  description: string;
  tokens: ThemeTokens;
}

export interface ThemeSchedule {
  morningThemeId: ThemeId;
  morningTime: string; // "06:00"
  daytimeThemeId: ThemeId;
  daytimeTime: string; // "12:00"
  nightThemeId: ThemeId;
  nightTime: string; // "19:00"
}

export interface ThemePreferences {
  activeThemeId: ThemeId;
  mode: AppearanceMode;
  schedule: ThemeSchedule;
  reducedMotion?: boolean;
}

export interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  mode: AppearanceMode;
  schedule: ThemeSchedule;
  setTheme: (id: ThemeId) => void;
  setMode: (mode: AppearanceMode) => void;
  setSchedule: (schedule: Partial<ThemeSchedule>) => void;
  resetToDefault: () => void;
  allThemes: Theme[];
}
