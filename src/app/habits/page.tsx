"use client";

import React, { useState, useEffect } from "react";
import { Flame, CheckCircle2, Circle, Plus, Award } from "lucide-react";

interface HabitItem {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  currentStreak: number;
  longestStreak: number;
  isCompletedToday: boolean;
  logs: { dateString: string; completed: boolean }[];
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = async () => {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      if (data.habits) setHabits(data.habits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleToggleHabit = async (habit: HabitItem) => {
    const nextCompleted = !habit.isCompletedToday;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              isCompletedToday: nextCompleted,
              currentStreak: nextCompleted ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
            }
          : h
      )
    );

    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitId: habit.id,
        completed: nextCompleted,
      }),
    });
    fetchHabits();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-rose-400" />
            Habits &amp; Daily Disciplines
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Flexible streak tracking with guilt-free recovery and non-punitive reflections.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading habits...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">{h.name}</h2>
                  {h.description && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {h.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleToggleHabit(h)}
                  className="text-slate-500 hover:text-cyan-400 shrink-0 transition-colors"
                >
                  {h.isCompletedToday ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
              </div>

              {/* Streak Counters */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Flame className="w-4 h-4 fill-rose-500/30" />
                  {h.currentStreak} Day Streak
                </span>
                <span className="text-slate-500 text-[11px]">
                  Best: {h.longestStreak} days
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
