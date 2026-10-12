import test from "node:test";
import assert from "node:assert/strict";
import {
  THEMES,
  THEMES_LIST,
  getTheme,
  getThemesByCategory,
  calculateTimeBasedTheme,
  calculateContrastRatio,
  DEFAULT_THEME_ID,
  DEFAULT_SCHEDULE,
  THEME_CATEGORIES,
} from "../src/lib/themes/registry.ts";

test("Theme Engine: Exactly 24 complete themes are registered", () => {
  const themeKeys = Object.keys(THEMES);
  assert.equal(themeKeys.length, 24, "Registry must contain exactly 24 themes");
  assert.equal(THEMES_LIST.length, 24, "THEMES_LIST must contain exactly 24 themes");

  // Expected 24 theme IDs
  const requiredThemeIds = [
    "amahas-signature",
    "morning-dawn",
    "night-focus",
    "daylight",
    "light-classic",
    "dark-classic",
    "grey-studio",
    "pure-white",
    "pure-black",
    "graphite",
    "crimson-red",
    "ocean-blue",
    "sea-breeze",
    "nature-green",
    "forest",
    "mountain",
    "sky",
    "sunset",
    "space-explorer",
    "scientific-lab",
    "electronics-bench",
    "cyber-circuit",
    "aurora",
    "solar-flare",
  ];

  for (const id of requiredThemeIds) {
    assert.ok(THEMES[id], `Required theme "${id}" must exist in registry`);
    assert.equal(THEMES[id].id, id);
    assert.ok(THEMES[id].name);
    assert.ok(THEMES[id].description);
    assert.equal(typeof THEMES[id].isDark, "boolean");
  }
});

test("Theme Engine: Every theme defines a 100% complete set of design tokens", () => {
  const requiredTokenKeys = [
    "bgPrimary",
    "bgSecondary",
    "bgElevated",
    "bgSidebar",
    "bgCard",
    "border",
    "borderFocus",
    "borderSubtle",
    "textPrimary",
    "textSecondary",
    "textMuted",
    "accentPrimary",
    "accentSecondary",
    "accentTertiary",
    "accentHover",
    "accentText",
    "buttonBg",
    "buttonText",
    "buttonHover",
    "buttonSecondaryBg",
    "buttonSecondaryText",
    "inputBg",
    "inputBorder",
    "inputText",
    "inputPlaceholder",
    "statusSuccess",
    "statusWarning",
    "statusError",
    "statusInfo",
    "badgeBg",
    "badgeText",
    "ring",
    "scrollbarTrack",
    "scrollbarThumb",
    "chartColors",
  ];

  for (const theme of THEMES_LIST) {
    for (const tokenKey of requiredTokenKeys) {
      assert.ok(
        theme.tokens[tokenKey] !== undefined,
        `Theme "${theme.id}" is missing design token "${tokenKey}"`
      );
    }

    // Chart palette validation
    assert.ok(
      Array.isArray(theme.tokens.chartColors) && theme.tokens.chartColors.length === 5,
      `Theme "${theme.id}" chartColors must contain exactly 5 harmonious palette colors`
    );
  }
});

test("Theme Engine: Color contrast between textPrimary and bgPrimary satisfies WCAG AA (>= 4.5:1)", () => {
  for (const theme of THEMES_LIST) {
    const bg = theme.tokens.bgPrimary;
    const text = theme.tokens.textPrimary;

    // Only test if hex colors
    if (bg.startsWith("#") && text.startsWith("#")) {
      const ratio = calculateContrastRatio(text, bg);
      assert.ok(
        ratio >= 4.5,
        `Theme "${theme.id}" contrast ratio (${ratio.toFixed(2)}:1) between textPrimary (${text}) and bgPrimary (${bg}) must satisfy WCAG AA (>= 4.5:1)`
      );
    }
  }
});

test("Theme Engine: Category classification covers all themes", () => {
  const validCategoryIds = new Set(THEME_CATEGORIES.map((c) => c.id));

  for (const theme of THEMES_LIST) {
    assert.ok(
      validCategoryIds.has(theme.category),
      `Theme "${theme.id}" category "${theme.category}" must be valid`
    );
  }

  // Ensure every category has at least one theme
  for (const cat of THEME_CATEGORIES) {
    const list = getThemesByCategory(cat.id);
    assert.ok(list.length >= 1, `Category "${cat.id}" must contain at least 1 theme`);
  }
});

test("Theme Engine: Time-based schedule correctly evaluates morning, day, and night", () => {
  const schedule = {
    morningThemeId: "morning-dawn",
    morningTime: "06:00",
    daytimeThemeId: "daylight",
    daytimeTime: "12:00",
    nightThemeId: "night-focus",
    nightTime: "19:00",
  };

  // Morning window (06:00 - 11:59)
  assert.equal(calculateTimeBasedTheme(schedule, "06:00"), "morning-dawn");
  assert.equal(calculateTimeBasedTheme(schedule, "09:30"), "morning-dawn");
  assert.equal(calculateTimeBasedTheme(schedule, "11:59"), "morning-dawn");

  // Daytime window (12:00 - 18:59)
  assert.equal(calculateTimeBasedTheme(schedule, "12:00"), "daylight");
  assert.equal(calculateTimeBasedTheme(schedule, "15:45"), "daylight");
  assert.equal(calculateTimeBasedTheme(schedule, "18:59"), "daylight");

  // Night window (19:00 - 05:59)
  assert.equal(calculateTimeBasedTheme(schedule, "19:00"), "night-focus");
  assert.equal(calculateTimeBasedTheme(schedule, "23:30"), "night-focus");
  assert.equal(calculateTimeBasedTheme(schedule, "03:15"), "night-focus");
  assert.equal(calculateTimeBasedTheme(schedule, "05:59"), "night-focus");
});

test("Theme Engine: Fallback handles missing or invalid IDs safely", () => {
  assert.equal(getTheme("non-existent-theme-xyz").id, DEFAULT_THEME_ID);
  assert.equal(getTheme(null).id, DEFAULT_THEME_ID);
  assert.equal(getTheme(undefined).id, DEFAULT_THEME_ID);
  assert.equal(getTheme("amahas-signature").id, "amahas-signature");
  assert.equal(getTheme("cyber-circuit").id, "cyber-circuit");
});
