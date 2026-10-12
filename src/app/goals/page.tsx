"use client";

import React, { useState, useEffect } from "react";
import { Target, Calendar, CheckCircle2, Award } from "lucide-react";

interface GoalItem {
  id: string;
  title: string;
  objective: string | null;
  category: string;
  targetDate: string | null;
  progressPct: number;
  project?: { name: string } | null;
  milestones: { id: string; title: string; completed: boolean }[];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => {
        if (d.goals) setGoals(d.goals);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
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
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading goals...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-teal-400 font-bold">
                    {g.category}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1.5">{g.title}</h2>
                </div>
                <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                  {g.progressPct}%
                </span>
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

              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                  style={{ width: `${g.progressPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
