"use client";

import React, { useState } from "react";
import {
  Calendar,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  FileText,
  Target,
  Flame,
} from "lucide-react";

interface DemoStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  interactivePreview: React.ReactNode;
}

export function GuidedDemonstration() {
  const [activeTab, setActiveTab] = useState(0);

  const steps: DemoStep[] = [
    {
      id: "step-1",
      badge: "01 / Horizon Planning",
      title: "Daily Horizon & Conflict-Free Scheduling",
      subtitle: "Never double-book study hours against exams or classes",
      description:
        "AMAHAS evaluates your working hours, classes, and priority assignments. The Horizon engine slots deep work sessions and alerts you to overlapping blocks before your day begins.",
      icon: Calendar,
      interactivePreview: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-300">Today's Scheduled Blocks</span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              Buffer Optimized
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-400">09:00 - 10:30 • Class</span>
              <p className="text-xs font-bold text-white">Distributed Systems & Consensus</p>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Lecture Hall 3</span>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400">11:00 - 12:30 • Deep Work</span>
              <p className="text-xs font-bold text-cyan-200">Kernel Latency Benchmark Coding</p>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">90m Focus</span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Available Buffer Today:</span>
            <span className="font-bold text-white">4.5 Hours Open</span>
          </div>
        </div>
      ),
    },
    {
      id: "step-2",
      badge: "02 / Research Agent",
      title: "Autonomous Literature & Note Synthesis",
      subtitle: "Multi-step academic paper ingestion and structured synthesis",
      description:
        "The built-in Autonomous Assistant orchestrates literature reviews, extracts reproducible experimental metrics, and formats notes directly linked to your active projects.",
      icon: Sparkles,
      interactivePreview: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-300">Autonomous Execution Plan</span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
              4 Steps Executed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Query arXiv & OpenAlex for "INT4 Kernel Matrix Multiplication"</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Extracted 3 top papers with reproducible throughput metrics</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Generated structured note in Project "Metal INT4"</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Citation Pipeline Attached</span>
            </span>
            <span className="text-emerald-400 font-bold">100% Verified</span>
          </div>
        </div>
      ),
    },
    {
      id: "step-3",
      badge: "03 / Active Recall",
      title: "SuperMemo SM-2 Spaced Retention",
      subtitle: "Scientific interval calculation before forgetting curve dips",
      description:
        "Every syllabus topic, formula, and conceptual card automatically schedules its next review based on your recall rating (1 to 5), ensuring mastery for competitive exams and finals.",
      icon: BookOpen,
      interactivePreview: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-300">Active Recall Card</span>
            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
              GATE CS • OS
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <p className="text-[11px] font-mono text-zinc-400">Concept Prompt:</p>
            <p className="text-xs font-semibold text-white">
              What are the 4 Coffman conditions required for deadlock to occur?
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <button className="py-1.5 rounded-lg bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">
              1 • Reset
            </button>
            <button className="py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[10px] text-amber-300 hover:bg-amber-900/50">
              2 • Hard
            </button>
            <button className="py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-[10px] text-cyan-300 hover:bg-cyan-900/50">
              4 • Good
            </button>
            <button className="py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-[10px] text-emerald-300 font-bold hover:bg-emerald-900/50">
              5 • Easy (+6d)
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "step-4",
      badge: "04 / Deep Focus",
      title: "Distraction-Free Deep Work Launcher",
      subtitle: "Measured focus accumulation with binaural acoustic soundscapes",
      description:
        "Launch targeted 25, 45, or 90-minute focus sprints linked to concrete tasks. Accumulate measured Focus XP, trigger automated break reminders, and protect your flow state.",
      icon: Clock,
      interactivePreview: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-300">Live Focus Session</span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-center space-y-1">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              34:12
            </span>
            <p className="text-[11px] text-zinc-400">Target: 45 min • Alpha Wave Generator (10Hz)</p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Streak: 6 Days</span>
            </span>
            <span className="text-zinc-300 font-medium">+45 Focus XP</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[activeTab];

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl bg-[#09090b]/90 border border-zinc-800 p-6 md:p-9 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-2.5">
            <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Guided Demonstration</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            A Realistic Day Inside AMAHAS Student OS
          </h2>
        </div>

        <p className="text-xs text-zinc-400 max-w-md font-light">
          Step through the four core pillars that transform chaotic semesters into an organized, high-performance personal operating system.
        </p>
      </div>

      {/* Stepper Navigation Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === activeTab;
          return (
            <button
              key={s.id}
              onClick={() => setActiveTab(idx)}
              className={`p-3 rounded-2xl text-left border transition-all ${
                isActive
                  ? "bg-zinc-800 border-zinc-600 text-white shadow-lg"
                  : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                <span className="text-[10px] font-mono tracking-wider uppercase font-bold">
                  {s.badge.split(" / ")[0]}
                </span>
              </div>
              <p className="text-xs font-bold truncate">{s.title.split("&")[0].trim()}</p>
            </button>
          );
        })}
      </div>

      {/* Step Content & Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 md:p-8">
        <div className="lg:col-span-6 space-y-4 text-left">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            {current.badge}
          </span>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {current.title}
          </h3>
          <p className="text-xs font-medium text-zinc-300">{current.subtitle}</p>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            {current.description}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setActiveTab((prev) => (prev + 1) % steps.length)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shadow-md"
            >
              <span>{activeTab === steps.length - 1 ? "Restart Demo" : "Next Pillar"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-zinc-500 font-mono">
              Step {activeTab + 1} of {steps.length}
            </span>
          </div>
        </div>

        {/* Live Interactive Widget Canvas */}
        <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-[#0d0d0f] border border-zinc-800 shadow-xl">
          {current.interactivePreview}
        </div>
      </div>
    </div>
  );
}
