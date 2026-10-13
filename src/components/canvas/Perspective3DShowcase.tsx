"use client";

import React, { useState } from "react";
import {
  Bot,
  Clock,
  BookOpen,
  FlaskConical,
  Sparkles,
  CheckCircle2,
  Terminal,
  Zap,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Layers,
} from "lucide-react";

export function Perspective3DShowcase() {
  const [activeTab, setActiveTab] = useState<"ai" | "focus" | "knowledge" | "lab">("ai");
  const [rotateX, setRotateX] = useState(6);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY(Math.max(-8, Math.min(8, (x / rect.width) * 16)));
    setRotateX(Math.max(0, Math.min(12, 6 - (y / rect.height) * 12)));
  };

  const handleMouseLeave = () => {
    setRotateX(6);
    setRotateY(0);
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto my-12 transition-transform duration-300 ease-out"
      style={{
        perspective: "1200px",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-full rounded-3xl bg-[#09090b]/90 border border-zinc-800 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Window Top Navigation Bar */}
        <div className="px-5 py-3.5 bg-black/60 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="text-[11px] font-mono text-zinc-500 ml-2">amahas-workspace-runtime</span>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "ai"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Autonomous AI</span>
            </button>
            <button
              onClick={() => setActiveTab("focus")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "focus"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Engine</span>
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "knowledge"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Knowledge (SM-2)</span>
            </button>
            <button
              onClick={() => setActiveTab("lab")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "lab"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Literature Lab</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Window Stage Content */}
        <div className="p-6 md:p-8 min-h-[340px] flex flex-col justify-between">
          {activeTab === "ai" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Autonomous Multi-Agent Orchestration</div>
                    <div className="text-[10px] text-zinc-400">Live multi-step web synthesis & research pipeline</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>
              </div>

              {/* Execution Prompt Card */}
              <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80 font-mono text-xs text-zinc-300 space-y-2">
                <div className="text-zinc-500 text-[11px] flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Prompt: Synthesize distributed consensus protocols with Byzantine fault tolerance</span>
                </div>
                <div className="text-white text-xs leading-relaxed pl-5 border-l border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Tool `search_web` executed (5 authoritative sources ingested)</span>
                  </div>
                  <div className="text-zinc-300 text-xs">
                    "Raft prioritizes leader election simplicity, whereas PBFT guarantees liveness under 3f + 1 asynchronous replicas. Applying threshold signatures reduces communication complexity from O(n²) to O(n)."
                  </div>
                </div>
              </div>

              {/* Real-time Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Response Latency</div>
                  <div className="text-sm font-bold text-white mt-0.5">38 ms</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Verified References</div>
                  <div className="text-sm font-bold text-white mt-0.5">14 Sources</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Data Isolation</div>
                  <div className="text-sm font-bold text-white mt-0.5">100% Tenant-Scoped</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Routing Mesh</div>
                  <div className="text-sm font-bold text-white mt-0.5">Resilient Failover</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "focus" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Deep Work Focus Block Engine</div>
                    <div className="text-[10px] text-zinc-400">Conflict-free time scheduling & momentum tracking</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                  Current Session: 48:15
                </div>
              </div>

              {/* Focus Timeline Schedule */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-white" />
                    <div>
                      <div className="text-xs font-semibold text-white">Deep Architecture & System Kernel Sprint</div>
                      <div className="text-[10px] text-zinc-400">09:00 - 11:30 • High Priority • 0 Conflicts</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">Active</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-zinc-800/60 flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-zinc-600" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">Literature Synthesis: Memory Paging Latency</div>
                      <div className="text-[10px] text-zinc-500">12:30 - 14:00 • Scheduled</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-500">Next</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">SuperMemo SM-2 Retention Engine</div>
                    <div className="text-[10px] text-zinc-400">Algorithmic interval spacing for long-term concept recall</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50">
                  Retention Rate: 96.4%
                </div>
              </div>

              {/* Retention Graph Visualization Preview */}
              <div className="p-4 rounded-xl bg-black/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Exponential Retention Decay vs Algorithmic Spaced Interval</span>
                  <span className="font-mono text-white text-[11px]">Interval Factor: 2.5x</span>
                </div>
                <div className="h-14 w-full flex items-end gap-1.5 pt-2">
                  {[20, 45, 60, 40, 75, 90, 85, 98, 92, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-zinc-800 to-zinc-400 rounded-t-sm transition-all"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "lab" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <FlaskConical className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Empirical Literature & Research Pipelines</div>
                    <div className="text-[10px] text-zinc-400">arXiv ingestion, citation graph extraction, and experiment reproducibility</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                  12 Papers Ingested
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    arXiv:2602.10984 • Mixed-Precision Quantization at Scale
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Verified Pipeline</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  Extracted 3 empirical benchmarks: FP16 baseline memory footprint vs 4-bit AWQ latency on memory-constrained systems.
                </p>
              </div>
            </div>
          )}

          {/* Bottom Card Footer */}
          <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Runtime Status: Synchronized</span>
            <span>Cryptographic Session Tokens Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perspective3DShowcase;
