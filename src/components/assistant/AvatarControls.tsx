"use client";

import React, { useState } from "react";
import {
  ORIGINAL_ANIMATION_METAS,
  EXPANDED_ANIMATION_METAS,
} from "./AvatarAnimationRegistry";
import { AssistantState } from "./types";
import { Sparkles, Play, Volume2, FastForward, CheckCircle2 } from "lucide-react";

interface AvatarControlsProps {
  currentState: AssistantState;
  currentClipName: string | null;
  playbackSpeed: number;
  onStateSelect: (state: AssistantState) => void;
  onClipSelect: (clipName: string) => void;
  onSpeedChange: (speed: number) => void;
  onTestSpeech?: (sampleText: string) => void;
}

export function AvatarControls({
  currentState,
  currentClipName,
  playbackSpeed,
  onStateSelect,
  onClipSelect,
  onSpeedChange,
  onTestSpeech,
}: AvatarControlsProps) {
  const [activeTab, setActiveTab] = useState<"expanded" | "original" | "states">("expanded");

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-950/90 border border-white/10 text-xs shadow-2xl backdrop-blur-md">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold uppercase tracking-wider text-cyan-300 text-[11px]">
            Animation Testing Deck
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-zinc-400 font-mono">
            18 Total Clips
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("expanded")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeTab === "expanded"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Expanded (12)
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeTab === "original"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Original (6)
          </button>
          <button
            onClick={() => setActiveTab("states")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              activeTab === "states"
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.25)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            States (13)
          </button>
        </div>
      </div>

      {/* Active Clip Status Pill */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Playing:</span>
          <span className="font-semibold text-white">
            {currentClipName || "Natural Idle"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span>State:</span>
          <span className="text-cyan-300 font-bold uppercase">{currentState}</span>
        </div>
      </div>

      {/* Tab 1: 12 Expanded Rigged Animations */}
      {activeTab === "expanded" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPANDED_ANIMATION_METAS.map((meta) => {
            const isActive = currentClipName === meta.name;
            return (
              <button
                key={meta.name}
                onClick={() => onClipSelect(meta.name)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                }`}
                title={meta.description}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{meta.label}</span>
                  {meta.isLoop ? (
                    <span className="text-[8px] px-1 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                      LOOP
                    </span>
                  ) : (
                    <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-400 font-mono">
                      1-SHOT
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-400 block mt-0.5 truncate">
                  {meta.duration}s • {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 2: 6 Original Rigged Animations */}
      {activeTab === "original" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ORIGINAL_ANIMATION_METAS.map((meta) => {
            const isActive = currentClipName === meta.name;
            return (
              <button
                key={meta.name}
                onClick={() => onClipSelect(meta.name)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-amber-500/20 border-amber-400 text-amber-200 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                }`}
                title={meta.description}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{meta.label}</span>
                  <span className="text-[8px] px-1 rounded bg-yellow-500/20 text-yellow-300 font-mono">
                    NATIVE
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 block mt-0.5 truncate">
                  {meta.duration}s • {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 3: Semantic Assistant State Machine */}
      {activeTab === "states" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              "idle",
              "greeting",
              "listening",
              "thinking",
              "speaking",
              "explaining",
              "acknowledging",
              "success",
              "warning",
              "error",
              "goodbye",
              "dance",
              "power_surge",
            ] as AssistantState[]
          ).map((st) => {
            const isActive = currentState === st;
            return (
              <button
                key={st}
                onClick={() => onStateSelect(st)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-violet-500/25 border-violet-400 text-violet-200 font-semibold shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <span className="font-semibold capitalize block">{st}</span>
                <span className="text-[9px] text-zinc-400 font-mono">State trigger</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Controls: Speed Slider & Speech Test Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FastForward className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-[10px] text-zinc-400 font-mono">Speed: {playbackSpeed.toFixed(2)}x</span>
          <input
            type="range"
            min="0.25"
            max="2.0"
            step="0.25"
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-24 accent-cyan-400 cursor-pointer"
          />
        </div>

        {onTestSpeech && (
          <button
            onClick={() =>
              onTestSpeech(
                "Hello, Kishore. I am your AMAHAS engineering assistant. I am ready to coordinate your academic workflows."
              )
            }
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-200 flex items-center gap-1.5 transition-all self-end sm:self-auto font-mono text-[11px]"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Test Speech Sync</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default AvatarControls;
