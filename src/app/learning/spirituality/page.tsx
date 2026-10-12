"use client";

import React from "react";
import { Compass, Sparkles, BookOpen } from "lucide-react";

export default function SpiritualityPage() {
  const traditions = [
    {
      tradition: "Stoic Philosophy",
      coreText: "Enchiridion & Discourses — Epictetus",
      theme: "The Dichotomy of Control",
      reflection:
        "Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions. Things not in our control are body, property, reputation, command, and, in one word, whatever are not our own actions.",
      application: "In academic preparation: release fixation on exam percentiles; pour 100% of energy into the derivation on your desk right now.",
    },
    {
      tradition: "Vedantic Philosophy",
      coreText: "Katha Upanishad & Bhagavad Gita",
      theme: "Equanimity of Mind (Samatvam)",
      reflection:
        "Perform your work with an unattached mind, steadfast in discipline, abandoning attachment to results, and remaining unperturbed by both success and failure.",
      application: "Engineering research requires hundreds of failed configurations before a reproducible result. Maintain emotional balance across experiments.",
    },
    {
      tradition: "Classical Logic & Epistemology",
      coreText: "Nyāya Sūtras & Aristotle's Organon",
      theme: "Pramāṇa (Valid Means of Knowledge)",
      reflection:
        "Knowledge arises through direct perception (pratyakṣa), inference (anumāna), comparison (upamāna), and reliable testimony (śabda). Critical scrutiny distinguishes truth from cognitive illusion.",
      application: "Verify mathematical derivations from first principles before relying on textbook assertion.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-amber-400" />
            Philosophy &amp; Reflective Traditions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comparative philosophical perspectives, equanimity in effort, and non-coercive wisdom traditions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {traditions.map((t, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {t.tradition}
              </span>
              <h2 className="text-sm font-bold text-white">{t.theme}</h2>
              <p className="text-[11px] text-slate-400 font-serif italic">
                {t.coreText}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed font-serif bg-white/[0.02] p-3 rounded-xl border border-white/5">
                &ldquo;{t.reflection}&rdquo;
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400">
              <strong className="text-cyan-400">Student Practice: </strong>
              {t.application}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
