"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Quote,
  TrendingUp,
} from "lucide-react";
import { DashboardOverviewData } from "@/types/dashboard";

interface DashboardHeaderProps {
  data: DashboardOverviewData;
  isCustomizing: boolean;
  onToggleCustomizing: () => void;
  onOpenPersonalize: () => void;
}

export function DashboardHeader({
  data,
  isCustomizing,
  onToggleCustomizing,
  onOpenPersonalize,
}: DashboardHeaderProps) {
  const [showQuote, setShowQuote] = useState(false);
  const { todaySummary, weeklyProgress, user } = data;

  const focusHrs = Math.round((todaySummary.focusMinutesToday / 60) * 10) / 10;
  const targetHrs = Math.round((todaySummary.focusTargetMinutes / 60) * 10) / 10;
  const focusPct = Math.min(100, Math.round((todaySummary.focusMinutesToday / Math.max(1, todaySummary.focusTargetMinutes)) * 100));

  return (
    <div className="space-y-4">
      {/* Top Greeting & Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {todaySummary.greeting}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border)]">
              {user.role || "Workspace"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            {todaySummary.dateString}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenPersonalize}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Configure working hours and preferences"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="hidden sm:inline">Preferences</span>
          </button>

          <button
            onClick={onToggleCustomizing}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isCustomizing
                ? "bg-[var(--accent-primary)] text-black ring-2 ring-[var(--accent-primary)]/40"
                : "bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isCustomizing ? "Editing Layout..." : "Customize"}</span>
          </button>
        </div>
      </div>

      {/* Natural Language Situation Summary */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm space-y-3">
        <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-sans">
          {todaySummary.situationSummary}
        </p>

        {/* 4 Real Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
          {/* 1. Deep Work Today */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)]">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
                Focus Today
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {focusHrs}h / {targetHrs}h ({focusPct}%)
              </div>
            </div>
          </div>

          {/* 2. Tasks Due Today */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)]">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-secondary)] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
                Pending Tasks
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {todaySummary.tasksDueTodayCount} due today
              </div>
            </div>
          </div>

          {/* 3. Schedule Reality / Buffer */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)]">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-tertiary)] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
                Schedule Buffer
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {todaySummary.availableHoursToday}h open capacity
              </div>
            </div>
          </div>

          {/* 4. Weekly Progress Accomplishments */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)]">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)] shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
                Weekly Wins
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {weeklyProgress.tasksCompletedThisWeek} tasks done
              </div>
            </div>
          </div>
        </div>

        {/* Optional Ambient Quote Dropdown */}
        {todaySummary.quote && (
          <div className="pt-2">
            <button
              onClick={() => setShowQuote(!showQuote)}
              className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
            >
              <Quote className="w-3 h-3" />
              <span>{showQuote ? "Hide daily reflection" : "Show daily reflection"}</span>
              {showQuote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showQuote && (
              <blockquote className="mt-2 p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] italic">
                &ldquo;{todaySummary.quote.quote}&rdquo;
                <footer className="not-italic text-[10px] uppercase font-semibold text-[var(--accent-primary)] mt-1 tracking-wider">
                  — {todaySummary.quote.author}
                </footer>
              </blockquote>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
