"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  CheckSquare,
  Clock,
  Sparkles,
  BookOpen,
  FolderKanban,
  Flame,
  ArrowRight,
  ExternalLink,
  Lock,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

interface SampleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignUp: () => void;
}

export function SampleWorkspaceModal({
  isOpen,
  onClose,
  onOpenSignUp,
}: SampleWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "planner" | "notes" | "academics">("dashboard");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden relative text-white">
        {/* Top Isolated Demo Banner */}
        <div className="bg-gradient-to-r from-cyan-950/80 via-zinc-900 to-cyan-950/80 border-b border-cyan-800/40 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-cyan-200">
              DEMONSTRATION MODE: Isolated Sample Workspace (Read-Only Preview)
            </span>
            <span className="hidden md:inline text-[11px] text-zinc-400">
              • Zero real user data accessed or modified.
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Demo Header */}
        <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <AmahasLogo variant="primary" size="sm" showSubtitle={false} />
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-xs text-zinc-400">Sample Student:</span>
            <span className="text-xs font-bold text-white">Alex Sharma (B.Tech CSE)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenSignUp();
              }}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Situation Summary Card */}
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">Saturday, Operational Horizon</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                All Systems Normal
              </span>
            </div>
            <h1 className="text-lg font-bold text-white">Good afternoon, Alex.</h1>
            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              You have 3 pending tasks and 1.5h scheduled today (ready to launch focus). You have completed 8 tasks this week across your Operating Systems coursework and autonomous research project.
            </p>
          </div>

          {/* 2-Column Responsive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (60%) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Needs Your Attention Widget */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h2 className="text-sm font-bold text-white">Needs Your Attention</h2>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">1 Action Signal</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Schedule Horizon</span>
                  <p className="text-xs font-semibold text-white">
                    Unscheduled Priority Task: "Design Cache Coherence Benchmark"
                  </p>
                  <p className="text-[11px] text-zinc-400 font-light">
                    High priority task has no dedicated time block today. Slot it before your available buffer diminishes.
                  </p>
                </div>
              </div>

              {/* Today's Focus Queue */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Today's Focus Queue</h2>
                  <span className="text-[10px] text-zinc-500 font-mono">3 Tasks</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-zinc-200 font-medium">Kernel Latency Benchmark Coding</span>
                    </div>
                    <span className="text-[10px] text-red-400 font-mono font-bold">HIGH</span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-zinc-200 font-medium">Review GATE Discrete Math Topic</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">MEDIUM</span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-zinc-200 font-medium">Literature Review: Page Tables</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">LOW</span>
                  </div>
                </div>
              </div>

              {/* Active Projects Widget */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Active Projects</h2>
                  <span className="text-[10px] text-zinc-500 font-mono">2 Projects</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Autonomous INT4 Quantization Kernel</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">60%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: "60%" }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">3 / 5 tasks completed</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">GATE 2027 Comprehensive Prep</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">42%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: "42%" }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">14 / 33 syllabus units mastered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (40%) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Next Scheduled Activity */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Next Scheduled Activity</span>
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1">
                  <p className="text-xs font-bold text-cyan-200">Deep Work: INT4 Quantization</p>
                  <p className="text-[11px] text-cyan-400 font-mono">Starts in 25 minutes • 90m focus block</p>
                </div>
              </div>

              {/* Pick Up Where You Left Off */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Pick Up Where You Left Off</span>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500">In-Progress Task</span>
                  <p className="text-xs font-bold text-white">Kernel Latency Benchmark Coding</p>
                  <p className="text-[11px] text-zinc-400 font-light">Project: Autonomous INT4 Kernel</p>
                </div>
              </div>

              {/* Weekly Progress Pulse */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <h2 className="text-sm font-bold text-white">Weekly Pulse</h2>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                    <span className="text-xl font-bold text-white font-mono">8</span>
                    <p className="text-[10px] text-zinc-400">Tasks Completed</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                    <span className="text-xl font-bold text-white font-mono">4.5h</span>
                    <p className="text-[10px] text-zinc-400">Deep Focus Logged</p>
                  </div>
                </div>
              </div>

              {/* Habits Routine */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Habits & Routine</h2>
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                    <Flame className="w-3 h-3" /> 6-Day Streak
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">Read 1 Research Paper</span>
                    <span className="text-emerald-400 text-[10px] font-bold">✓ Done</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">Solve 2 DSA LeetCode Problems</span>
                    <span className="text-emerald-400 text-[10px] font-bold">✓ Done</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">Review SM-2 Flashcards</span>
                    <span className="text-zinc-500 text-[10px]">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="p-4 px-6 border-t border-zinc-900 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-zinc-400">
            Ready to organize your courses, projects, and focus?
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              Exit Preview
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenSignUp();
              }}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Activate Your 7-Day Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
