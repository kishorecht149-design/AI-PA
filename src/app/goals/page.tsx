"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  X,
  Flag,
  Sparkles,
} from "lucide-react";

interface MilestoneItem {
  id: string;
  title: string;
  completed: boolean;
}

interface GoalItem {
  id: string;
  title: string;
  objective: string | null;
  category: string;
  targetDate: string | null;
  progressPct: number;
  status: string;
  isDemo?: boolean;
  project?: { name: string } | null;
  milestones: MilestoneItem[];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New goal form state
  const [newTitle, setNewTitle] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newCategory, setNewCategory] = useState("academics");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newMilestones, setNewMilestones] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      const d = await res.json();
      if (d.goals) setGoals(d.goals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleToggleMilestone = async (goalId: string, milestoneId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;

    // Optimistic UI update
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updatedMs = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: nextCompleted } : m
        );
        const total = updatedMs.length;
        const done = updatedMs.filter((m) => m.completed).length;
        const nextPct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          ...g,
          milestones: updatedMs,
          progressPct: nextPct,
          status: nextPct === 100 ? "ACHIEVED" : done > 0 ? "IN_PROGRESS" : g.status,
        };
      })
    );

    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId,
          completed: nextCompleted,
        }),
      });
      if (!res.ok) {
        fetchGoals();
      }
    } catch {
      fetchGoals();
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);

    try {
      const validMilestones = newMilestones.filter((m) => m.trim().length > 0);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          objective: newObjective,
          category: newCategory,
          targetDate: newTargetDate || null,
          milestones: validMilestones,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewObjective("");
        setNewTargetDate("");
        setNewMilestones([""]);
        setShowCreateModal(false);
        fetchGoals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Target className="w-6 h-6 text-teal-400" />
            Long-Term Goals &amp; OKRs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Strategic milestones coordinating competitive exams, research publications, and career horizons.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition-all shadow-md shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500 space-y-2">
          <Target className="w-8 h-8 mx-auto text-slate-600" />
          <p>No goals defined yet. Create your first academic or exam milestone goal above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-teal-400 font-bold">
                        {g.category}
                      </span>
                      {g.isDemo && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                          Demo Sample
                        </span>
                      )}
                      {g.status === "ACHIEVED" && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                          Achieved
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white">{g.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                      {g.progressPct}%
                    </span>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {g.objective && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {g.objective}
                  </p>
                )}

                {g.targetDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target Date: {new Date(g.targetDate).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${g.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Milestones list with interactive toggling */}
                {g.milestones && g.milestones.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Actionable Milestones</span>
                      <span>
                        {g.milestones.filter((m) => m.completed).length} / {g.milestones.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {g.milestones.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleToggleMilestone(g.id, m.id, m.completed)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer transition-colors text-xs"
                        >
                          {m.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span
                            className={`flex-1 truncate ${
                              m.completed ? "line-through text-slate-500" : "text-slate-300"
                            }`}
                          >
                            {m.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b1120] border border-teal-500/30 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-400" /> Create Long-Term Goal
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master GATE EC Core Subjects & Secure Rank < 200"
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Objective &amp; Target Outcome
                </label>
                <textarea
                  rows={2}
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="Measurable criteria, expected score, or research deliverable..."
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-400"
                  >
                    <option value="academics">Academics & Exams</option>
                    <option value="research">Research & Publications</option>
                    <option value="career">Career & Internships</option>
                    <option value="personal">Personal Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Milestones list inputs */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-300">
                    Milestones (Progress steps)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewMilestones([...newMilestones, ""])}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    + Add Step
                  </button>
                </div>

                {newMilestones.map((ms, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ms}
                      onChange={(e) => {
                        const copy = [...newMilestones];
                        copy[idx] = e.target.value;
                        setNewMilestones(copy);
                      }}
                      placeholder={`Step ${idx + 1}: e.g. Complete Networks & Signals review`}
                      className="flex-1 bg-[#070b14] border border-white/10 rounded-xl px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-400"
                    />
                    {newMilestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewMilestones(newMilestones.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-500 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
