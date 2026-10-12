"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { Theme, ThemeId, AppearanceMode, ThemeSchedule, ThemeContextValue } from "./types.ts";
import { getTheme, DEFAULT_THEME_ID, DEFAULT_SCHEDULE, calculateTimeBasedTheme, THEMES_LIST } from "./registry.ts";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "amahas_theme_pref";

/**
 * Applies all design tokens as CSS variables to the document element.
 */
function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const { tokens } = theme;

  // Set data-theme and color scheme class
  root.setAttribute("data-theme", theme.id);
  if (theme.isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }

  // Inject CSS Custom Properties
  root.style.setProperty("--bg-primary", tokens.bgPrimary);
  root.style.setProperty("--bg-secondary", tokens.bgSecondary);
  root.style.setProperty("--bg-elevated", tokens.bgElevated);
  root.style.setProperty("--bg-sidebar", tokens.bgSidebar);
  root.style.setProperty("--bg-card", tokens.bgCard);

  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--border-focus", tokens.borderFocus);
  root.style.setProperty("--border-subtle", tokens.borderSubtle);

  root.style.setProperty("--text-primary", tokens.textPrimary);
  root.style.setProperty("--text-secondary", tokens.textSecondary);
  root.style.setProperty("--text-muted", tokens.textMuted);

  root.style.setProperty("--accent-primary", tokens.accentPrimary);
  root.style.setProperty("--accent-secondary", tokens.accentSecondary);
  root.style.setProperty("--accent-tertiary", tokens.accentTertiary);
  root.style.setProperty("--accent-hover", tokens.accentHover);
  root.style.setProperty("--accent-text", tokens.accentText);

  root.style.setProperty("--btn-bg", tokens.buttonBg);
  root.style.setProperty("--btn-text", tokens.buttonText);
  root.style.setProperty("--btn-hover", tokens.buttonHover);
  root.style.setProperty("--btn-sec-bg", tokens.buttonSecondaryBg);
  root.style.setProperty("--btn-sec-text", tokens.buttonSecondaryText);

  root.style.setProperty("--input-bg", tokens.inputBg);
  root.style.setProperty("--input-border", tokens.inputBorder);
  root.style.setProperty("--input-text", tokens.inputText);
  root.style.setProperty("--input-placeholder", tokens.inputPlaceholder);

  root.style.setProperty("--status-success", tokens.statusSuccess);
  root.style.setProperty("--status-warning", tokens.statusWarning);
  root.style.setProperty("--status-error", tokens.statusError);
  root.style.setProperty("--status-info", tokens.statusInfo);

  root.style.setProperty("--badge-bg", tokens.badgeBg);
  root.style.setProperty("--badge-text", tokens.badgeText);

  root.style.setProperty("--ring", tokens.ring);
  root.style.setProperty("--scrollbar-track", tokens.scrollbarTrack);
  root.style.setProperty("--scrollbar-thumb", tokens.scrollbarThumb);

  if (tokens.glow) {
    root.style.setProperty("--theme-glow", tokens.glow);
  }

  // Chart palette variables
  tokens.chartColors.forEach((color, idx) => {
    root.style.setProperty(`--chart-${idx + 1}`, color);
  });
}

export function ThemeProvider({
  children,
  initialThemeId = DEFAULT_THEME_ID,
}: {
  children: React.ReactNode;
  initialThemeId?: ThemeId;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  const [mode, setModeState] = useState<AppearanceMode>("manual");
  const [schedule, setScheduleState] = useState<ThemeSchedule>(DEFAULT_SCHEDULE);
  const [mounted, setMounted] = useState(false);

  // Load stored preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.activeThemeId) setThemeId(parsed.activeThemeId);
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.schedule) setScheduleState({ ...DEFAULT_SCHEDULE, ...parsed.schedule });
      }
    } catch {
      // Safe fallback
    }
    setMounted(true);
  }, []);

  // Compute active theme based on mode
  const activeThemeId = useMemo<ThemeId>(() => {
    if (mode === "time") {
      return calculateTimeBasedTheme(schedule);
    }
    if (mode === "system" && typeof window !== "undefined") {
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return isSystemDark ? DEFAULT_THEME_ID : "daylight";
    }
    return themeId;
  }, [mode, themeId, schedule]);

  const currentTheme = useMemo(() => getTheme(activeThemeId), [activeThemeId]);

  // Apply theme to DOM
  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  // Listen to system changes when mode === "system"
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newId: ThemeId = e.matches ? DEFAULT_THEME_ID : "daylight";
      setThemeId(newId);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  // Recalculate time-based theme on visibilitychange and focus (no polling leaks)
  useEffect(() => {
    if (mode !== "time" || typeof window === "undefined") return;

    const checkTimeTheme = () => {
      const targetId = calculateTimeBasedTheme(schedule);
      if (targetId !== themeId) {
        setThemeId(targetId);
      }
    };

    window.addEventListener("focus", checkTimeTheme);
    document.addEventListener("visibilitychange", checkTimeTheme);

    return () => {
      window.removeEventListener("focus", checkTimeTheme);
      document.removeEventListener("visibilitychange", checkTimeTheme);
    };
  }, [mode, schedule, themeId]);

  // Save changes to localStorage and optionally sync to backend
  const persistPreferences = useCallback(
    (newThemeId: ThemeId, newMode: AppearanceMode, newSched: ThemeSchedule) => {
      try {
        const data = {
          activeThemeId: newThemeId,
          mode: newMode,
          schedule: newSched,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // Background sync to /api/settings if authenticated
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newThemeId }),
        }).catch(() => {});
      } catch {
        // Fallback
      }
    },
    []
  );

  const setTheme = useCallback(
    (newId: ThemeId) => {
      setThemeId(newId);
      setModeState("manual");
      persistPreferences(newId, "manual", schedule);
    },
    [schedule, persistPreferences]
  );

  const setMode = useCallback(
    (newMode: AppearanceMode) => {
      setModeState(newMode);
      persistPreferences(themeId, newMode, schedule);
    },
    [themeId, schedule, persistPreferences]
  );

  const setSchedule = useCallback(
    (schedPatch: Partial<ThemeSchedule>) => {
      const updated = { ...schedule, ...schedPatch };
      setScheduleState(updated);
      persistPreferences(themeId, mode, updated);
    },
    [schedule, themeId, mode, persistPreferences]
  );

  const resetToDefault = useCallback(() => {
    setThemeId(DEFAULT_THEME_ID);
    setModeState("manual");
    setScheduleState(DEFAULT_SCHEDULE);
    persistPreferences(DEFAULT_THEME_ID, "manual", DEFAULT_SCHEDULE);
  }, [persistPreferences]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: currentTheme,
      themeId: activeThemeId,
      mode,
      schedule,
      setTheme,
      setMode,
      setSchedule,
      resetToDefault,
      allThemes: THEMES_LIST,
    }),
    [currentTheme, activeThemeId, mode, schedule, setTheme, setMode, setSchedule, resetToDefault]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for non-provider contexts or testing
    const defaultTheme = getTheme(DEFAULT_THEME_ID);
    return {
      theme: defaultTheme,
      themeId: DEFAULT_THEME_ID,
      mode: "manual",
      schedule: DEFAULT_SCHEDULE,
      setTheme: () => {},
      setMode: () => {},
      setSchedule: () => {},
      resetToDefault: () => {},
      allThemes: THEMES_LIST,
    };
  }
  return context;
}
