"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Check,
  Square,
  ArrowRight,
  Plus,
} from "lucide-react";

export function HabitsRoutineWidget() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchHabits = async () => {
    try {
      const res = await fetch("/api/habits");
      if (res.ok) {
        const data = await res.json();
        setHabits(data.habits || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
    const handleUpdate = () => fetchHabits();
    window.addEventListener("amahas:data-update", handleUpdate);
    return () => window.removeEventListener("amahas:data-update", handleUpdate);
  }, []);

  const toggleHabit = async (habit: any) => {
    setTogglingId(habit.id);
    const newStatus = !habit.isCompletedToday;
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitId: habit.id,
          completed: newStatus,
        }),
      });
      if (res.ok) {
        // Optimistic update
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habit.id ? { ...h, isCompletedToday: newStatus } : h
          )
        );
        window.dispatchEvent(new CustomEvent("amahas:data-update"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Daily Habits &amp; Routine
          </h2>
        </div>

        <Link
          href="/habits"
          className="text-xs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 font-semibold"
        >
          <span>All Habits</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-9 bg-[var(--bg-primary)] rounded-xl animate-pulse" />
          <div className="h-9 bg-[var(--bg-primary)] rounded-xl animate-pulse" />
        </div>
      ) : habits.length === 0 ? (
        <div className="py-4 px-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] text-center space-y-1.5">
          <p className="text-xs text-[var(--text-secondary)]">
            No daily habits tracked yet.
          </p>
          <Link
            href="/habits"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>Create a Habit</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.slice(0, 5).map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => toggleHabit(habit)}
                  disabled={togglingId === habit.id}
                  className={`p-1 rounded-md transition-colors ${
                    habit.isCompletedToday
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-400/10"
                  }`}
                >
                  {habit.isCompletedToday ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-medium truncate block ${
                      habit.isCompletedToday
                        ? "line-through text-[var(--text-muted)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {habit.name}
                  </span>
                </div>
              </div>

              {habit.currentStreak > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0">
                  <Flame className="w-3 h-3 fill-amber-400/20" />
                  <span>{habit.currentStreak}d</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
