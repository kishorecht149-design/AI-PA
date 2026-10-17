"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  ArrowRight,
} from "lucide-react";
import { DashboardOverviewData } from "@/types/dashboard";

interface WeeklyProgressWidgetProps {
  progress: DashboardOverviewData["weeklyProgress"];
}

export function WeeklyProgressWidget({ progress }: WeeklyProgressWidgetProps) {
  const focusHrsThisWeek = Math.round((progress.focusMinutesThisWeek / 60) * 10) / 10;
  const habitPct = progress.totalHabitsCount > 0
    ? Math.round((progress.habitsCompletedToday / progress.totalHabitsCount) * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Weekly Progress
          </h2>
        </div>

        <Link
          href="/analytics"
          className="text-xs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 font-semibold"
        >
          <span>Analytics</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Metric 1: Tasks Completed */}
        <div className="p-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-secondary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tasks Done</span>
          </div>
          <div className="text-lg font-black text-[var(--text-primary)]">
            {progress.tasksCompletedThisWeek}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Past 7 days</div>
        </div>

        {/* Metric 2: Focus Hours */}
        <div className="p-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Focus Hours</span>
          </div>
          <div className="text-lg font-black text-[var(--text-primary)]">
            {focusHrsThisWeek}h
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Measured deep work</div>
        </div>

        {/* Metric 3: Habits Rate */}
        <div className="p-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-secondary)]">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Habits Today</span>
          </div>
          <div className="text-lg font-black text-[var(--text-primary)]">
            {progress.habitsCompletedToday} / {progress.totalHabitsCount}
          </div>
          <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: `${habitPct}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Goal Milestones */}
        <div className="p-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-secondary)]">
            <Target className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            <span>Goal Progress</span>
          </div>
          <div className="text-lg font-black text-[var(--text-primary)]">
            {progress.averageGoalProgressPct}%
          </div>
          <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-[var(--accent-secondary)] h-full rounded-full transition-all"
              style={{ width: `${progress.averageGoalProgressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
