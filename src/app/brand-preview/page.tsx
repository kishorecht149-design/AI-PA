"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  Sliders,
  Award,
} from "lucide-react";
import { AmahasAnimatedLogo } from "@/components/brand/AmahasAnimatedLogo";
import { useTheme } from "@/lib/themes/theme-provider";

export default function BrandPreviewApprovalPage() {
  const { theme, setTheme } = useTheme();
  const [selectedEdition, setSelectedEdition] = useState<"auto" | "silver" | "gold">("auto");
  const [interactive3D, setInteractive3D] = useState(true);
  const [enableShimmer, setEnableShimmer] = useState(true);
  const [activeSize, setActiveSize] = useState<number>(320);
  const [isApproved, setIsApproved] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-colors duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500/20 via-zinc-400/20 to-purple-500/20 border border-[var(--border)] flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  AMAHAS Official 3D Animated Logo — Approval Deck
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                  Exact Master Artwork
                </span>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-0.5">
                Authentic 3D master artwork with hardware-accelerated anisotropic specular sweeps, cursor reflection tracking, and neural constellation pulses.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTheme("daylight")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 text-xs font-semibold shadow-sm hover:bg-zinc-100 transition-all"
            title="Switch to Daylight Light Theme"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light Theme (Gold B)</span>
          </button>

          <button
            onClick={() => setTheme("pure-black")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-black text-white text-xs font-semibold shadow-sm hover:bg-zinc-900 transition-all"
            title="Switch to Pure Black Dark Theme"
          >
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span>Dark Theme (Silver A)</span>
          </button>

          {!isApproved ? (
            <button
              onClick={() => setIsApproved(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 fill-black text-yellow-400" />
              <span>Approve Logo for Website</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Approved by Kishore! Ready to Deploy</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Stage: 3D Animated Hero Showcase (Cols 7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden min-h-[460px]">
            {/* The Animated Emblem */}
            <div className="relative z-10 py-2 flex items-center justify-center">
              <AmahasAnimatedLogo
                edition={selectedEdition}
                size={activeSize}
                interactive3D={interactive3D}
                enableShimmer={enableShimmer}
                showText={true}
              />
            </div>

            {/* Hint Badge */}
            <div className="mt-4 px-3.5 py-1.5 rounded-full bg-[var(--bg-primary)]/80 backdrop-blur-md border border-[var(--border)] text-[11px] text-[var(--text-secondary)] z-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Move mouse over emblem for 3D tilt & dynamic specular light reflection</span>
            </div>
          </div>

          {/* Interactive Inspection Controls Bar */}
          <div className="w-full mt-4 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Edition Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                Edition:
              </span>
              <div className="flex rounded-xl bg-[var(--bg-primary)] p-1 border border-[var(--border)]">
                <button
                  onClick={() => setSelectedEdition("auto")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedEdition === "auto"
                      ? "bg-white text-black shadow-md font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Auto ({theme.isDark ? "Silver A" : "Gold B"})
                </button>
                <button
                  onClick={() => setSelectedEdition("silver")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedEdition === "silver"
                      ? "bg-zinc-200 text-black shadow-md font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Silver (Edition A)
                </button>
                <button
                  onClick={() => setSelectedEdition("gold")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedEdition === "gold"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Gold (Edition B)
                </button>
              </div>
            </div>

            {/* Effects Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnableShimmer(!enableShimmer)}
                className={`px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                  enableShimmer
                    ? "bg-purple-950/60 border-purple-800 text-purple-300"
                    : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                Light Sweep: {enableShimmer ? "Active" : "Off"}
              </button>
              <button
                onClick={() => setInteractive3D(!interactive3D)}
                className={`px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                  interactive3D
                    ? "bg-sky-950/60 border-sky-800 text-sky-300"
                    : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                3D Parallax: {interactive3D ? "Active" : "Off"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Stage: Side-by-Side Light vs Dark Theme Previews (Cols 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Light Theme Showcase Card */}
          <div className="rounded-3xl bg-white border border-zinc-200 p-5 shadow-xl flex flex-col gap-3 text-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                Light & White Theme (Edition B: Champagne Gold)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold font-mono">
                Auto
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              When user selects a light theme, AMAHAS renders the <strong>Champagne Gold & Dark Titanium</strong> master emblem with warm amber specular sweeps.
            </p>

            <div className="p-3 rounded-2xl bg-gradient-to-b from-zinc-50 to-amber-50/40 border border-zinc-200 flex items-center justify-center">
              <AmahasAnimatedLogo
                edition="gold"
                size={140}
                interactive3D={true}
                enableShimmer={true}
                showText={false}
              />
            </div>
          </div>

          {/* Dark Theme Showcase Card */}
          <div className="rounded-3xl bg-[#08080a] border border-zinc-800 p-5 shadow-xl flex flex-col gap-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                Dark & Black Theme (Edition A: Platinum Titanium)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 font-semibold font-mono">
                Auto
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              When user selects Pure Black or any dark theme, AMAHAS renders the <strong>Platinum Titanium Silver</strong> master emblem with chrome caustics.
            </p>

            <div className="p-3 rounded-2xl bg-black border border-zinc-900 flex items-center justify-center">
              <AmahasAnimatedLogo
                edition="silver"
                size={140}
                interactive3D={true}
                enableShimmer={true}
                showText={false}
              />
            </div>
          </div>

          {/* Navigation Scale Previews */}
          <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] p-5 shadow-xl flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Scale & Navigation Lockups
            </h4>

            {/* Sidebar 36px */}
            <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AmahasAnimatedLogo size={36} interactive3D={false} />
                <div className="flex flex-col">
                  <span className="text-xs font-black tracking-widest text-[var(--text-primary)]">AMAHAS</span>
                  <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Autonomous OS</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">36px Sidebar</span>
            </div>

            {/* Header 28px */}
            <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AmahasAnimatedLogo size={28} interactive3D={false} />
                <span className="text-xs font-black tracking-wider text-[var(--text-primary)]">AMAHAS</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">28px Top Navbar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
