"use client";

import React, { useState } from "react";
import {
  Palette,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Clock,
  Laptop,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/lib/themes/theme-provider";
import { THEME_CATEGORIES, DEFAULT_THEME_ID } from "@/lib/themes/registry";
import { Theme, ThemeCategory, AppearanceMode } from "@/lib/themes/types";

/**
 * Miniature Theme Preview Card rendering actual design tokens
 */
function ThemePreviewCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { tokens } = theme;

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Select ${theme.name} theme`}
      className={`group relative flex flex-col rounded-2xl border p-4 cursor-pointer transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] ${
        isActive
          ? "border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]"
          : "border-[var(--border)] hover:border-[var(--border-focus)]/50 hover:bg-[var(--border)]/20"
      }`}
      style={{ backgroundColor: tokens.bgSecondary }}
    >
      {/* Active Pill Badge */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm">
          <Check className="w-3 h-3" /> Active
        </div>
      )}

      {/* Miniature UI Canvas Preview */}
      <div
        className="w-full h-24 rounded-xl border overflow-hidden p-2.5 flex gap-2 relative shadow-inner mb-3 transition-transform group-hover:scale-[1.01]"
        style={{
          backgroundColor: tokens.bgPrimary,
          borderColor: tokens.border,
        }}
      >
        {/* Mock Sidebar */}
        <div
          className="w-8 h-full rounded-lg border flex flex-col items-center py-1.5 gap-1.5 flex-shrink-0"
          style={{
            backgroundColor: tokens.bgSidebar,
            borderColor: tokens.borderSubtle,
          }}
        >
          <span
            className="w-3.5 h-3.5 rounded-md"
            style={{ backgroundColor: tokens.accentPrimary }}
          />
          <span
            className="w-4 h-1 rounded-full opacity-60"
            style={{ backgroundColor: tokens.textMuted }}
          />
          <span
            className="w-4 h-1 rounded-full opacity-60"
            style={{ backgroundColor: tokens.textMuted }}
          />
        </div>

        {/* Mock Main Dashboard Area */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold truncate"
              style={{ color: tokens.textPrimary }}
            >
              {theme.name}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: tokens.statusSuccess }}
            />
          </div>

          {/* Miniature Card Widget */}
          <div
            className="rounded-lg p-1.5 border space-y-1"
            style={{
              backgroundColor: tokens.bgCard,
              borderColor: tokens.border,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] font-medium leading-none"
                style={{ color: tokens.textSecondary }}
              >
                Focus Session
              </span>
              <span
                className="text-[8px] px-1 py-0.2 rounded font-bold"
                style={{
                  backgroundColor: tokens.badgeBg,
                  color: tokens.badgeText,
                }}
              >
                +45m
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: tokens.inputBg }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: "68%",
                  backgroundColor: tokens.accentPrimary,
                }}
              />
            </div>
          </div>

          {/* Palette Swatches Bar */}
          <div className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: tokens.accentPrimary }}
              title="Primary Accent"
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: tokens.accentSecondary }}
              title="Secondary Accent"
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: tokens.accentTertiary }}
              title="Tertiary Accent"
            />
            <span
              className="text-[8px] font-mono ml-auto opacity-70"
              style={{ color: tokens.textMuted }}
            >
              {theme.isDark ? "Dark" : "Light"}
            </span>
          </div>
        </div>
      </div>

      {/* Info Lockup */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold leading-tight"
            style={{ color: tokens.textPrimary }}
          >
            {theme.name}
          </span>
          <span
            className="text-[10px] capitalize px-1.5 py-0.5 rounded-md border font-medium"
            style={{
              backgroundColor: tokens.bgElevated,
              color: tokens.textSecondary,
              borderColor: tokens.borderSubtle,
            }}
          >
            {theme.category}
          </span>
        </div>
        <p
          className="text-[11px] leading-relaxed line-clamp-2"
          style={{ color: tokens.textSecondary }}
        >
          {theme.description}
        </p>
      </div>

      {/* Select Button */}
      <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: tokens.borderSubtle }}>
        <span className="text-[10px] font-mono" style={{ color: tokens.textMuted }}>
          {tokens.accentPrimary}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            isActive
              ? "opacity-90 font-bold"
              : "hover:scale-[1.02]"
          }`}
          style={{
            backgroundColor: isActive ? tokens.buttonBg : tokens.bgElevated,
            color: isActive ? tokens.buttonText : tokens.textPrimary,
            border: `1px solid ${tokens.border}`,
          }}
        >
          {isActive ? "Active Theme" : "Apply"}
        </button>
      </div>
    </div>
  );
}

/**
 * Main Theme & Appearance Browser Component
 */
export function ThemeBrowser() {
  const {
    themeId,
    mode,
    schedule,
    setTheme,
    setMode,
    setSchedule,
    resetToDefault,
    allThemes,
  } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredThemes =
    selectedCategory === "all"
      ? allThemes
      : allThemes.filter((t) => t.category === selectedCategory);

  return (
    <div id="appearance" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            Theme &amp; Visual Identity Engine
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Choose from 24 complete architectural themes or enable automatic time-based switching.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToDefault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to AMAHAS Signature</span>
        </button>
      </div>

      {/* Mode Selector (Manual / System / Time-based) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
          Appearance Mode
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Manual */}
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "manual"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-focus)]/40"
            }`}
          >
            <div className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--accent-primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Manual</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Always use your explicitly chosen theme.
              </div>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setMode("system")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "system"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-focus)]/40"
            }`}
          >
            <div className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--accent-primary)]">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Follow System</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Syncs automatically with your OS light/dark setting.
              </div>
            </div>
          </button>

          {/* Time-based */}
          <button
            type="button"
            onClick={() => setMode("time")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "time"
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-focus)]/40"
            }`}
          >
            <div className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--accent-primary)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Time-Based Schedule</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Dawn in morning, Daylight during day, Night Focus in evening.
              </div>
            </div>
          </button>
        </div>

        {/* Time-Based Config Drawer */}
        {mode === "time" && (
          <div className="pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            {/* Morning */}
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sun className="w-3.5 h-3.5" /> Morning Slot
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={schedule.morningTime}
                  onChange={(e) => setSchedule({ morningTime: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Assigned Theme
                </label>
                <select
                  value={schedule.morningThemeId}
                  onChange={(e) =>
                    setSchedule({ morningThemeId: e.target.value as any })
                  }
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  {allThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Daytime */}
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <Sun className="w-3.5 h-3.5" /> Daytime Slot
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={schedule.daytimeTime}
                  onChange={(e) => setSchedule({ daytimeTime: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Assigned Theme
                </label>
                <select
                  value={schedule.daytimeThemeId}
                  onChange={(e) =>
                    setSchedule({ daytimeThemeId: e.target.value as any })
                  }
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  {allThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Night */}
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Moon className="w-3.5 h-3.5" /> Night Slot
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={schedule.nightTime}
                  onChange={(e) => setSchedule({ nightTime: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Assigned Theme
                </label>
                <select
                  value={schedule.nightThemeId}
                  onChange={(e) =>
                    setSchedule({ nightThemeId: e.target.value as any })
                  }
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  {allThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === "all"
              ? "bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm"
              : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          All (24)
        </button>
        {THEME_CATEGORIES.map((cat) => {
          const count = allThemes.filter((t) => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[var(--accent-primary)] text-[var(--accent-text)] shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 24 Themes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThemes.map((t) => (
          <ThemePreviewCard
            key={t.id}
            theme={t}
            isActive={t.id === themeId}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
export default ThemeBrowser;
