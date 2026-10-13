"use client";

import React from "react";
import { Sparkles, Bot } from "lucide-react";

export type AiOrbState = "idle" | "listening" | "thinking" | "speaking";

interface AiOrbProps {
  state?: AiOrbState;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  showStatusLabel?: boolean;
}

export function AiOrb({
  state = "idle",
  size = "md",
  className = "",
  onClick,
  showStatusLabel = false,
}: AiOrbProps) {
  const sizeConfig = {
    sm: {
      container: "w-8 h-8",
      core: "w-5 h-5",
      ring1: "w-8 h-8",
      ring2: "w-6 h-6",
      iconSize: "w-2.5 h-2.5",
    },
    md: {
      container: "w-12 h-12",
      core: "w-8 h-8",
      ring1: "w-12 h-12",
      ring2: "w-10 h-10",
      iconSize: "w-3.5 h-3.5",
    },
    lg: {
      container: "w-16 h-16",
      core: "w-11 h-11",
      ring1: "w-16 h-16",
      ring2: "w-13 h-13",
      iconSize: "w-5 h-5",
    },
  }[size];

  // Dynamic theme colors per state
  const stateThemes = {
    idle: {
      glow: "from-cyan-500/30 via-violet-600/20 to-blue-500/30",
      core: "bg-gradient-to-br from-cyan-400 via-violet-500 to-blue-600",
      borderRing1: "border-cyan-400/40",
      borderRing2: "border-violet-400/40",
      label: "Ready",
      labelColor: "text-cyan-400",
    },
    listening: {
      glow: "from-rose-500/40 via-red-600/30 to-amber-500/30",
      core: "bg-gradient-to-br from-rose-400 via-red-500 to-amber-500",
      borderRing1: "border-rose-400/60 animate-ping",
      borderRing2: "border-red-400/50",
      label: "Listening...",
      labelColor: "text-rose-400",
    },
    thinking: {
      glow: "from-amber-400/40 via-violet-600/40 to-cyan-400/40",
      core: "bg-gradient-to-br from-amber-300 via-violet-500 to-cyan-400",
      borderRing1: "border-amber-400/60",
      borderRing2: "border-cyan-400/60",
      label: "Reasoning & Searching...",
      labelColor: "text-violet-400",
    },
    speaking: {
      glow: "from-emerald-400/30 via-cyan-500/30 to-violet-500/30",
      core: "bg-gradient-to-br from-emerald-400 via-cyan-400 to-violet-500",
      borderRing1: "border-emerald-400/50",
      borderRing2: "border-cyan-400/50",
      label: "Voice Synthesizing...",
      labelColor: "text-emerald-400",
    },
  }[state];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center gap-2.5 select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
      title={`AMAHAS Intelligence Core — ${stateThemes.label}`}
    >
      <div className={`relative ${sizeConfig.container} flex items-center justify-center shrink-0`}>
        {/* 1. Ambient Background Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${stateThemes.glow} blur-md transition-all duration-500 ${
            state === "thinking"
              ? "animate-pulse"
              : state === "listening"
              ? "scale-125 opacity-100"
              : "opacity-75"
          }`}
        />

        {/* 2. Outer Rotating Orbital Ring */}
        <div
          className={`absolute ${sizeConfig.ring1} rounded-full border border-dashed ${
            stateThemes.borderRing1
          } transition-all duration-300 ${
            state === "thinking"
              ? "animate-ai-orbit-fast"
              : state === "listening"
              ? ""
              : "animate-ai-orbit"
          }`}
        />

        {/* 3. Inner Reverse Orbital Ring with Planetary Particle */}
        <div
          className={`absolute ${sizeConfig.ring2} rounded-full border border-dotted ${
            stateThemes.borderRing2
          } transition-all duration-300 ${
            state === "thinking" ? "animate-ai-orbit-reverse" : "animate-ai-orbit-reverse"
          }`}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
        </div>

        {/* 4. Center Glowing Energy Core Sphere */}
        <div
          className={`relative ${sizeConfig.core} rounded-full ${stateThemes.core} shadow-lg flex items-center justify-center transition-transform duration-300 ${
            state === "idle"
              ? "animate-ai-pulse"
              : state === "listening"
              ? "scale-110"
              : state === "thinking"
              ? "scale-105"
              : ""
          }`}
        >
          {/* Inner Highlights */}
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/60 blur-[1px]" />

          {/* Center Graphic Based on State */}
          {state === "speaking" ? (
            <div className="flex items-center gap-0.5 z-10">
              <span className="w-0.5 bg-white rounded-full animate-wave-1" />
              <span className="w-0.5 bg-white rounded-full animate-wave-2" />
              <span className="w-0.5 bg-white rounded-full animate-wave-3" />
            </div>
          ) : state === "listening" ? (
            <div className="w-2 h-2 rounded-full bg-white animate-ping z-10" />
          ) : state === "thinking" ? (
            <Sparkles className={`${sizeConfig.iconSize} text-white animate-spin z-10 duration-1000`} />
          ) : (
            <Bot className={`${sizeConfig.iconSize} text-white/90 z-10 drop-shadow`} />
          )}
        </div>
      </div>

      {showStatusLabel && (
        <div className="flex flex-col leading-none">
          <span className={`text-[11px] font-bold ${stateThemes.labelColor} tracking-wide`}>
            {stateThemes.label}
          </span>
          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
            AMAHAS Neural Core
          </span>
        </div>
      )}
    </div>
  );
}

export default AiOrb;
