"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Star,
  Clock,
  BookOpen,
  ArrowRight,
  Brain,
  Check,
  Award,
} from "lucide-react";
import { calculateSM2 } from "@/lib/spaced-repetition";

interface TopicRevisionProps {
  topic: {
    id: string;
    title: string;
    courseCode: string;
    courseName?: string;
    unitTitle?: string;
    confidenceLevel?: number;
    revisionCount?: number;
  };
  onClose: () => void;
  onRevisionLogged: () => void;
}

export function RevisionFlashcardModal({ topic, onClose, onRevisionLogged }: TopicRevisionProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [recallRating, setRecallRating] = useState<number>(4);
  const [errorNotes, setErrorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Dynamic SM-2 forecast based on selected rating
  const sm2Forecast = calculateSM2({
    rating: recallRating,
    repetitions: topic.revisionCount || 0,
    intervalDays: 1,
    easeFactor: 2.5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/academics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: topic.id,
          rating: recallRating,
          notes: errorNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessResult(data);
        setTimeout(() => {
          onRevisionLogged();
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingColor = (r: number) => {
    if (r >= 4) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (r === 3) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-[#0a0f1d] border border-cyan-500/30 p-6 md:p-8 space-y-6 shadow-2xl shadow-cyan-950/50 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                {topic.courseCode}
              </span>
              <span className="text-xs text-slate-400 font-medium">SM-2 Spaced Repetition</span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              {topic.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Flashcard Surface */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`cursor-pointer rounded-2xl p-6 min-h-[180px] border transition-all duration-300 relative flex flex-col justify-between ${
            isFlipped
              ? "bg-gradient-to-br from-cyan-950/40 via-black/60 to-purple-950/30 border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "bg-white/[0.03] hover:bg-white/[0.05] border-white/10"
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{isFlipped ? "💡 Key Concept & Derivation" : "❓ Active Recall Challenge"}</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Click card to {isFlipped ? "hide explanation" : "reveal answer"}
              </span>
            </div>

            <div className="text-sm font-medium text-slate-100 leading-relaxed pt-2">
              {isFlipped ? (
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="font-semibold text-cyan-300">Core Principles &amp; Derivations:</p>
                  <p>
                    Reconstruct the fundamental mathematical equations, boundary conditions, and state transitions for <strong className="text-white">{topic.title}</strong>.
                  </p>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-slate-300">
                    Verify: EAT = Hit_Ratio × Hit_Time + (1 - Hit_Ratio) × Miss_Penalty
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-300 text-xs">
                    Before revealing the explanation, challenge yourself to explain the core mechanism of:
                  </p>
                  <p className="text-base font-bold text-white">
                    &ldquo;{topic.title}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    What are the inputs, constraints, primary equations, and edge cases?
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Prior Repetitions: {topic.revisionCount || 0}</span>
            <span>SuperMemo 2 Formula Model</span>
          </div>
        </div>

        {/* Confidence Rating Bar (0 - 5) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Assess Your Active Recall Quality:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${getRatingColor(recallRating)}`}>
                Rating: {recallRating}/5
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { r: 1, label: "Blackout", desc: "Reset" },
                { r: 2, label: "Hard", desc: "Reset" },
                { r: 3, label: "Effort", desc: "Pass" },
                { r: 4, label: "Good", desc: "Advance" },
                { r: 5, label: "Mastered", desc: "Perfect" },
              ].map(({ r, label, desc }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecallRating(r)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                    recallRating === r
                      ? "bg-cyan-500 text-black border-cyan-400 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5"
                  }`}
                >
                  <span className="text-xs">{label}</span>
                  <span className={`text-[9px] ${recallRating === r ? "text-black/80" : "text-slate-500"}`}>{desc}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Forecast Notice */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Next SM-2 Review scheduled in: <strong className="text-cyan-300">{sm2Forecast.intervalDays} day(s)</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {sm2Forecast.nextReviewDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* Student Error Log Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Error Log &amp; Key Insight (Optional):
            </label>
            <input
              type="text"
              value={errorNotes}
              onChange={(e) => setErrorNotes(e.target.value)}
              placeholder="e.g. Remembered formula, but forgot to account for 2-level page walk penalty"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-sans"
            />
          </div>

          {/* Submission feedback */}
          {successResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Revision recorded! Next SM-2 session set for {new Date(successResult.nextRevisionDate).toLocaleDateString()}.
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Log Revision &amp; Update SM-2</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
