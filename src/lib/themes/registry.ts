import type { Theme, ThemeId, ThemeCategory, ThemeSchedule } from "./types.ts";
import { THEMES } from "./tokens.ts";
export { THEMES };

export const DEFAULT_THEME_ID: ThemeId = "amahas-signature";

export const THEMES_LIST: Theme[] = Object.values(THEMES);

export const THEME_CATEGORIES: { id: ThemeCategory; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "time-of-day", label: "Time of Day" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "neutral", label: "Neutral" },
  { id: "nature", label: "Nature" },
  { id: "color", label: "Color" },
  { id: "science-engineering", label: "Science & Engineering" },
];

export const DEFAULT_SCHEDULE: ThemeSchedule = {
  morningThemeId: "morning-dawn",
  morningTime: "06:00",
  daytimeThemeId: "daylight",
  daytimeTime: "12:00",
  nightThemeId: "night-focus",
  nightTime: "19:00",
};

/**
 * Retrieve a theme by ID with safe fallback to AMAHAS Signature.
 */
export function getTheme(id?: string | null): Theme {
  if (id && THEMES[id]) {
    return THEMES[id];
  }
  return THEMES[DEFAULT_THEME_ID];
}

/**
 * Filter themes by category.
 */
export function getThemesByCategory(category: ThemeCategory): Theme[] {
  return THEMES_LIST.filter((t) => t.category === category);
}

/**
 * Calculate the active theme for time-based mode.
 * @param schedule Student's configured time schedule
 * @param currentHourMinute e.g. "14:30" (defaults to current local time)
 */
export function calculateTimeBasedTheme(
  schedule: ThemeSchedule = DEFAULT_SCHEDULE,
  currentHourMinute?: string
): ThemeId {
  let timeStr = currentHourMinute;
  if (!timeStr) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    timeStr = `${hours}:${minutes}`;
  }

  const { morningTime, daytimeTime, nightTime } = schedule;

  // Between morning and daytime: Morning theme
  if (timeStr >= morningTime && timeStr < daytimeTime) {
    return schedule.morningThemeId || "morning-dawn";
  }

  // Between daytime and night: Daytime theme
  if (timeStr >= daytimeTime && timeStr < nightTime) {
    return schedule.daytimeThemeId || "daylight";
  }

  // Otherwise (night until morning): Night theme
  return schedule.nightThemeId || "night-focus";
}

/**
 * Relative luminance calculation for WCAG contrast verification.
 */
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  if (hex.length < 6) return 0.5;

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Contrast ratio calculation between two hex colors.
 * Returns ratio from 1 to 21 (e.g. 4.5 = WCAG AA normal text).
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
