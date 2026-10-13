"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  X,
  Award,
} from "lucide-react";

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

const STARTER_HABITS = [
  {
    name: "Deep Work Focus Block",
    description: "90 minutes of continuous, distraction-free execution on core architecture.",
    frequency: "DAILY",
  },
  {
    name: "Literature & Concept Reading",
    description: "Read 2 research papers or 20 pages of technical documentation.",
    frequency: "DAILY",
  },
  {
    name: "Knowledge & Flashcard Review",
    description: "Complete daily SuperMemo SM-2 spaced repetition cards.",
    frequency: "DAILY",
  },
  {
    name: "Physical Activity & Reset",
    description: "45 minutes of training or active recovery to recharge focus.",
    frequency: "DAILY",
  },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New habit form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFrequency, setNewFrequency] = useState("DAILY");
  const [submitting, setSubmitting] = useState(false);

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

    try {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitId: habit.id,
          completed: nextCompleted,
        }),
      });
      fetchHabits();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateHabit = async (name: string, description?: string, frequency?: string) => {
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || null,
          frequency: frequency || "DAILY",
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName("");
        setNewDescription("");
        fetchHabits();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!confirm("Are you sure you want to remove this habit?")) return;
    try {
      await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
      fetchHabits();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-white" />
            Habits &amp; Daily Disciplines
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-light">
            Flexible streak tracking with guilt-free recovery and non-punitive reflections.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> New Habit
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Loading habits...</div>
      ) : habits.length === 0 ? (
        /* Rich Interactive Empty State with Starter Templates */
        <div className="space-y-6">
          <div className="py-12 px-6 text-center rounded-3xl border border-zinc-800 bg-[#0a0a0a] space-y-4 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
              <Flame className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">No habits registered yet</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Build lasting momentum. Choose a recommended discipline template below or craft your own custom daily habit.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Create Custom Habit
            </button>
          </div>

          {/* Quick Starter Templates Grid */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Quick 1-Click Starter Disciplines
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STARTER_HABITS.map((starter) => (
                <div
                  key={starter.name}
                  className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                        {starter.name}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {starter.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {starter.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCreateHabit(starter.name, starter.description, starter.frequency)}
                    disabled={submitting}
                    className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-white hover:text-black border border-zinc-800 text-xs text-zinc-300 font-medium transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to My Disciplines</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Habits Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {h.frequency}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white">{h.name}</h2>
                  {h.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {h.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleHabit(h)}
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                    title={h.isCompletedToday ? "Mark Incomplete" : "Mark Complete Today"}
                  >
                    {h.isCompletedToday ? (
                      <CheckCircle2 className="w-6 h-6 text-white fill-white/20" />
                    ) : (
                      <Circle className="w-6 h-6 text-zinc-600 hover:text-zinc-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(h.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                    title="Remove Habit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Streak Counters */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Flame className="w-4 h-4 fill-white/30" />
                  {h.currentStreak} Day Streak
                </span>
                <span className="text-zinc-500 text-[11px] font-mono">
                  Best: {h.longestStreak} days
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Habit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-white" /> Create New Habit
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateHabit(newName, newDescription, newFrequency);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="e.g. 90-min Deep Architecture Sprint"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. Complete morning technical work before opening email or comms."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Frequency
                </label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                >
                  <option value="DAILY">Daily (7 days / week)</option>
                  <option value="WEEKDAYS">Weekdays (Mon - Fri)</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Discipline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
