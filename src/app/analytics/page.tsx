"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  FileCheck,
  ChevronRight,
} from "lucide-react";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRatePct: number;
  totalActualMinutes: number;
  totalEstimatedMinutes: number;
  reviews: any[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewWizard, setShowReviewWizard] = useState(false);

  // Review wizard form state
  const [reviewType, setReviewType] = useState("WEEKLY");
  const [highlightInput, setHighlightInput] = useState("");
  const [challengeInput, setChallengeInput] = useState("");
  const [adjustmentInput, setAdjustmentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType: reviewType,
          highlights: [highlightInput],
          challenges: [challengeInput],
          adjustments: [adjustmentInput],
        }),
      });
      setShowReviewWizard(false);
      setHighlightInput("");
      setChallengeInput("");
      setAdjustmentInput("");
      fetchAnalytics();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Productivity Analytics &amp; Reviews
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Super Productivity execution tracking based on measured event data.
          </p>
        </div>

        <button
          onClick={() => setShowReviewWizard(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
        >
          <FileCheck className="w-4 h-4" /> Start Weekly Review
        </button>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Measured Focus Time
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {Math.round(data.totalActualMinutes / 60)}h {data.totalActualMinutes % 60}m
              </div>
              <p className="text-[11px] text-slate-500">
                Estimated: {Math.round(data.totalEstimatedMinutes / 60)}h
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-mono text-cyan-400">
                Task Completion Rate
              </span>
              <div className="text-2xl font-bold text-cyan-300 font-mono">
                {data.completionRatePct}%
              </div>
              <p className="text-[11px] text-slate-500">
                {data.completedTasks} of {data.totalTasks} tasks done
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-mono text-emerald-400">
                Revision Consistency
              </span>
              <div className="text-2xl font-bold text-emerald-300 font-mono">
                100%
              </div>
              <p className="text-[11px] text-slate-500">
                SM-2 spaced repetitions on track
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-2">
              <span className="text-[10px] uppercase font-mono text-violet-400">
                Reviews Completed
              </span>
              <div className="text-2xl font-bold text-violet-300 font-mono">
                {data.reviews.length}
              </div>
              <p className="text-[11px] text-slate-500">
                Structured reflection records
              </p>
            </div>
          </div>

          {/* Past Reviews Archive */}
          <div className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4">
            <h2 className="text-sm font-bold text-white">
              Recent Productivity Reviews
            </h2>

            {data.reviews.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No past reviews logged yet. Complete your first review using the button above.
              </p>
            ) : (
              <div className="space-y-3">
                {data.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-indigo-400 font-bold">
                        {rev.periodType} REVIEW
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(rev.startDate).toLocaleDateString()} – {new Date(rev.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic">
                      &ldquo;{rev.aiSummary || "Completed review."}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Wizard Modal */}
      {showReviewWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b1120] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" /> Super Productivity Guided Review Wizard
            </div>

            <h2 className="text-base font-bold text-white">
              Weekly Progress Reflection
            </h2>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. What went well this period? (Key breakthroughs)
                </label>
                <textarea
                  required
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  placeholder="e.g. Mastered Multi-level Paging formulas in OS, derived INT3 outlier matrix."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2. What challenges or roadblocks occurred?
                </label>
                <textarea
                  required
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  placeholder="e.g. Graph theory recurrence relations took longer than estimated."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  3. What should be adjusted for next period?
                </label>
                <textarea
                  required
                  value={adjustmentInput}
                  onChange={(e) => setAdjustmentInput(e.target.value)}
                  placeholder="e.g. Schedule 15-minute buffers after math blocks; do German drill before lunch."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewWizard(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submittingReview ? "Saving..." : "Save & Archive Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
