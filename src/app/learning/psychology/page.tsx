"use client";

import React from "react";
import { Brain, AlertCircle, Sparkles, BookOpen } from "lucide-react";

export default function PsychologyPage() {
  const models = [
    {
      title: "Deliberate Practice Framework",
      author: "K. Anders Ericsson",
      concept: "True mastery requires operating at the very edge of current capability with immediate error feedback, rather than mindless repetition.",
      application: "Apply to GATE problem sets: focus exclusively on sub-topics where accuracy drops below 60%.",
    },
    {
      title: "Cognitive Load Theory",
      author: "John Sweller",
      concept: "Working memory has finite capacity (typically 4±1 chunks). Extraneous load (cluttered notes, distractions) impairs germane schema formation.",
      application: "Keep formulas distilled to minimal canonical representations before solving derivation problems.",
    },
    {
      title: "The Spacing Effect & Testing Effect",
      author: "Hermann Ebbinghaus & Roediger",
      concept: "Active retrieval from long-term memory strengthens neural traces far more effectively than passive rereading or highlighting.",
      application: "Drill flashcards without looking at answers; write out derivations from memory before verification.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-violet-400" />
            Learning Psychology &amp; Cognitive Models
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical principles of human memory, deliberate practice, and conceptual consolidation.
          </p>
        </div>
      </div>

      {/* Strict Ethical & Educational Notice */}
      <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-violet-400" />
        <span>
          <strong>Educational Scope:</strong> This module covers cognitive learning theory and deliberate practice for academic productivity. It is strictly educational and does not provide medical or mental-health advice.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {models.map((m, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-3"
          >
            <div className="text-[10px] uppercase font-mono text-cyan-400 font-semibold">
              {m.author}
            </div>
            <h2 className="text-sm font-bold text-white">{m.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {m.concept}
            </p>
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-300">
              <strong className="text-emerald-400">Application: </strong>
              {m.application}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
