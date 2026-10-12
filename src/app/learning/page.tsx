"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Languages,
  Globe2,
  Headphones,
  Brain,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LearningStudioHub() {
  const learningTracks = [
    {
      title: "Language Learning (8 Languages)",
      desc: "Spanish, German, Japanese, French, Sanskrit, Mandarin, Russian, Hindi with SM-2 flashcard drilling.",
      href: "/learning/languages",
      icon: Languages,
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "General Knowledge & Concepts",
      desc: "Topic encyclopedias, facts, quizzes, and live Wikipedia/Wikidata concept verification.",
      href: "/learning/knowledge",
      icon: Globe2,
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    },
    {
      title: "Reading & Audiobooks",
      desc: "Structured reading lists, page/audio time tracking, bookmarks, and legal open resources.",
      href: "/learning/reading",
      icon: Headphones,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Psychology & Deliberate Practice",
      desc: "Cognitive science, memory formation, and mental models (strictly educational boundary).",
      href: "/learning/psychology",
      icon: Brain,
      color: "from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30",
    },
    {
      title: "Philosophy & Spirituality",
      desc: "Comparative texts, Stoic principles, Upanishadic dialogues, and reflective inquiry.",
      href: "/learning/spirituality",
      icon: Compass,
      color: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            Learning Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Lifelong inquiry encompassing 8 languages, cognitive models, audiobooks, and philosophical foundations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {learningTracks.map((track) => {
          const Icon = track.icon;
          return (
            <Link
              key={track.href}
              href={track.href}
              className="group p-5 rounded-2xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${track.color} border w-fit`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {track.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {track.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold pt-2">
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
