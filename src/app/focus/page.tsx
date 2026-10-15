"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  ShieldAlert,
  Flame,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  Sliders,
  Maximize2,
  Minimize2,
  ArrowRight,
  Headphones,
  Check,
  X,
  Target,
  ListTodo,
} from "lucide-react";
import {
  soundscape,
  BINAURAL_PRESETS,
  BinauralPreset,
  BinauralPresetId,
} from "@/lib/binaural-audio";
import {
  loadDeepWorkProfile,
  saveDeepWorkProfile,
  getRankProgress,
  recordCompletedSession,
  DeepWorkProfile,
  calculateSessionXp,
} from "@/lib/deep-work-xp";
import { FlowVisualizer } from "@/components/focus/FlowVisualizer";

const DURATION_PRESETS = [
  { min: 15, label: "15m Micro Sprint" },
  { min: 25, label: "25m Pomodoro" },
  { min: 45, label: "45m Tactical Block" },
  { min: 60, label: "60m Architectural Horizon" },
  { min: 90, label: "90m Deep Focus Peak" },
];

export default function DeepWorkArenaPage() {
  // Gamification Profile State
  const [profile, setProfile] = useState<DeepWorkProfile>(loadDeepWorkProfile());
  const rankInfo = getRankProgress(profile.xp);

  // Timer & Session State
  const [targetMinutes, setTargetMinutes] = useState<number>(45);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [distractions, setDistractions] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);

  // Soundscape Synthesizer State
  const [activePresetId, setActivePresetId] = useState<BinauralPresetId>("gamma-40");
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.6);
  const [noiseVolume, setNoiseVolume] = useState<number>(0.5);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // UI Modes & Modals
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completedSessionData, setCompletedSessionData] = useState<any>(null);
  const [reflectionNote, setReflectionNote] = useState<string>("");
  const [energyRating, setEnergyRating] = useState<number>(5);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState<boolean>(false);

  const activePreset =
    BINAURAL_PRESETS.find((p) => p.id === activePresetId) || BINAURAL_PRESETS[0];

  // Load available tasks
  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks.map((t: any) => ({ id: t.id, title: t.title })));
        }
      })
      .catch(() => {});
  }, []);

  // Sync soundscape subscription
  useEffect(() => {
    if (!soundscape) return;
    const unsubscribe = soundscape.subscribe((playing: boolean, presetId: BinauralPresetId) => {
      setIsAudioPlaying(playing);
      setActivePresetId(presetId);
      setAnalyser(soundscape.getAnalyser());
    });
    return unsubscribe;
  }, []);

  // Distraction Shield: Detect tab switches or window blurs
  useEffect(() => {
    if (!isRunning || !profile.distractionShieldEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setDistractions((d) => d + 1);
      }
    };

    const handleBlur = () => {
      setDistractions((d) => d + 1);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isRunning, profile.distractionShieldEnabled]);

  // Main countdown timer ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((sec) => sec - 1);
      }, 1000);
    } else if (isRunning && secondsRemaining === 0) {
      // Natural timer completion
      handleEndSession(true);
    }

    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  // Handle Preset duration selection
  const handleSelectDuration = (min: number) => {
    if (isRunning) return;
    setTargetMinutes(min);
    setSecondsRemaining(min * 60);
  };

  // Start Session
  const handleStartSession = () => {
    setIsRunning(true);
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }

    // Auto-engage soundscape if not playing
    if (soundscape && !isAudioPlaying) {
      soundscape.playPreset(activePresetId);
    }
  };

  // Pause Session
  const handlePauseSession = () => {
    setIsRunning(false);
  };

  // Reset Session
  const handleResetSession = () => {
    setIsRunning(false);
    setSecondsRemaining(targetMinutes * 60);
    setDistractions(0);
    setSessionStartTime(null);
  };

  // Complete / End Session
  const handleEndSession = (isAutoComplete = false) => {
    setIsRunning(false);

    const elapsedSeconds = targetMinutes * 60 - secondsRemaining;
    const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Stop audio
    if (soundscape && isAudioPlaying) {
      soundscape.stop();
    }

    // Record session & calculate XP
    const result = recordCompletedSession(
      profile,
      actualMinutes,
      targetMinutes,
      distractions,
      activePresetId
    );

    setProfile(result.updatedProfile);
    setCompletedSessionData({
      actualMinutes,
      targetMinutes,
      distractions,
      xpBreakdown: result.xpBreakdown,
      unlockedBadges: result.unlockedBadges,
    });
    setShowCompletionModal(true);
  };

  // Finalize session submission to backend
  const handleFinalizeSession = async () => {
    if (completedSessionData) {
      try {
        await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: selectedTask?.id || null,
            targetMinutes: completedSessionData.targetMinutes,
            actualMinutes: completedSessionData.actualMinutes,
            distractionCount: completedSessionData.distractions,
            energyRating,
            reflectionNotes: reflectionNote || null,
          }),
        });
      } catch (err) {
        console.warn("Error saving focus session to backend:", err);
      }
    }

    setShowCompletionModal(false);
    handleResetSession();
    setReflectionNote("");
  };

  // Soundscape toggles
  const handleToggleSoundscape = (presetId?: BinauralPresetId) => {
    if (!soundscape) return;
    soundscape.toggle(presetId || activePresetId);
  };

  const handleVolumeChange = (v: number) => {
    setMasterVolume(v);
    soundscape?.setMasterVolume(v);
  };

  const handleNoiseVolumeChange = (v: number) => {
    setNoiseVolume(v);
    soundscape?.setNoiseVolume(v);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`min-h-screen bg-black text-white p-4 md:p-8 space-y-6 transition-all ${
        isZenMode ? "fixed inset-0 z-50 overflow-y-auto" : "max-w-7xl mx-auto"
      }`}
    >
      {/* Arena Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 via-sky-500/20 to-emerald-500/20 border border-zinc-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  Deep Work Arena & Binaural Flow Studio
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-950/60 border border-purple-800/80 text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Cognitive Flow Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Hardware-synthesized binaural frequencies, cognitive leveling with streak multipliers, and strict distraction resistance.
              </p>
            </div>
          </div>
        </div>

        {/* Header Controls & Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rank Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-zinc-950 text-xs font-semibold"
            style={{ borderColor: rankInfo.currentRank.color }}
          >
            <span>{rankInfo.currentRank.badge}</span>
            <span style={{ color: rankInfo.currentRank.color }}>
              Lvl {rankInfo.currentRank.level}: {rankInfo.currentRank.title}
            </span>
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/40 bg-amber-950/20 text-xs font-semibold text-amber-300">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>
              {profile.streakDays}d Streak ({rankInfo.currentRank.level >= 1 ? "1.25x" : "1.0x"} XP)
            </span>
          </div>

          {/* Distraction Shield Toggle */}
          <button
            onClick={() => {
              const updated = {
                ...profile,
                distractionShieldEnabled: !profile.distractionShieldEnabled,
              };
              setProfile(updated);
              saveDeepWorkProfile(updated);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              profile.distractionShieldEnabled
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
            title="Toggle Strict Tab-Switch Distraction Shield"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Shield: {profile.distractionShieldEnabled ? "Strict" : "Off"}</span>
          </button>

          {/* Zen Mode Toggle */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title={isZenMode ? "Exit Zen Mode" : "Full Zen Mode"}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Distraction Warning Banner (if triggered) */}
      {distractions > 0 && isRunning && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex items-center justify-between text-xs text-rose-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Distraction Alert:</strong> {distractions} tab switch{distractions > 1 ? "es" : ""} recorded during active flow state.
            </span>
          </div>
          <span className="text-[11px] text-rose-400/80">Refocus your attention</span>
        </div>
      )}

      {/* Main Focus Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Flow Visualizer & Live Timer (Cols 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative rounded-3xl bg-[#0a0a0a] border border-zinc-800 overflow-hidden shadow-2xl p-6 flex flex-col items-center justify-center">
            {/* Embedded Live 60fps Audio Waveform Canvas */}
            <div className="w-full relative">
              <FlowVisualizer
                analyser={analyser}
                isPlaying={isAudioPlaying}
                isRunning={isRunning}
                themeColor={activePreset.themeColor}
              />

              {/* Monospace Countdown Numerals Overlaid */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-6xl sm:text-7xl font-extrabold tracking-tight font-mono text-white drop-shadow-2xl">
                  {formatTime(secondsRemaining)}
                </span>
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mt-2">
                  {isRunning ? "Deep Flow Horizon Active" : "Session Paused / Ready"}
                </span>

                {selectedTask && (
                  <div className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-sky-400" />
                    <span className="max-w-[200px] truncate">{selectedTask.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Duration Preset Chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 w-full">
              {DURATION_PRESETS.map((dur) => (
                <button
                  key={dur.min}
                  disabled={isRunning}
                  onClick={() => handleSelectDuration(dur.min)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    targetMinutes === dur.min
                      ? "bg-white text-black font-semibold shadow-lg"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  } disabled:opacity-50`}
                >
                  {dur.label}
                </button>
              ))}
            </div>

            {/* Core Focus Action Controls */}
            <div className="mt-6 flex items-center gap-3">
              {!isRunning ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Enter Flow State</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseSession}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-xl"
                >
                  <Pause className="w-4 h-4 fill-black" />
                  <span>Pause Flow</span>
                </button>
              )}

              {isRunning && (
                <button
                  onClick={() => handleEndSession(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Claim XP & End</span>
                </button>
              )}

              <button
                onClick={handleResetSession}
                disabled={isRunning}
                className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors disabled:opacity-40"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Task Linking Toggle */}
            <div className="mt-4 pt-4 border-t border-zinc-900 w-full flex items-center justify-between text-xs text-zinc-400">
              <button
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <ListTodo className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  {selectedTask ? `Linked: ${selectedTask.title}` : "Link Focus Block to a Task"}
                </span>
              </button>
              {selectedTask && (
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Task Picker Dropdown */}
            {showTaskPicker && tasks.length > 0 && (
              <div className="mt-2 w-full max-h-40 overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-800 p-2 space-y-1 animate-in fade-in duration-150">
                {tasks.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTask(t);
                      setShowTaskPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors truncate"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gamified Rank & XP Telemetry Bar */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Rank Progress ({profile.xp} Total XP)
              </span>
              <span className="text-zinc-400 font-mono">
                {rankInfo.nextRank
                  ? `${rankInfo.xpRemaining} XP to ${rankInfo.nextRank.title}`
                  : "Maximum Rank Achieved"}
              </span>
            </div>

            {/* Animated XP Progress Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-400"
                style={{ width: `${rankInfo.progressPct}%` }}
              />
            </div>

            {/* Arena Stats Matrix */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900 text-center">
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] text-zinc-500 uppercase font-medium block">
                  Lifetime Flow
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {profile.totalMinutes}m
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] text-zinc-500 uppercase font-medium block">
                  Battles Completed
                </span>
                <span className="text-sm font-bold text-sky-400 mt-0.5 block">
                  {profile.totalSessions}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                <span className="text-[10px] text-zinc-500 uppercase font-medium block">
                  Discipline Streak
                </span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                  {profile.streakDays} Days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Binaural Soundscape Studio & Achievements (Cols 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Soundscape Synthesizer Console */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Binaural Frequency Studio
                </h3>
              </div>
              <button
                onClick={() => handleToggleSoundscape()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isAudioPlaying
                    ? "bg-purple-900/60 border border-purple-700 text-purple-200"
                    : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400"
                }`}
              >
                {isAudioPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{isAudioPlaying ? "Audio Live" : "Muted"}</span>
              </button>
            </div>

            {/* Preset Selector Grid */}
            <div className="grid grid-cols-2 gap-2">
              {BINAURAL_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePresetId(preset.id);
                      if (isAudioPlaying && soundscape) {
                        soundscape.playPreset(preset.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-zinc-950 shadow-md"
                        : "bg-zinc-950/40 hover:bg-zinc-950 border-zinc-900 text-zinc-400"
                    }`}
                    style={{
                      borderColor: isSelected ? preset.themeColor : undefined,
                    }}
                  >
                    <div>
                      <span
                        className="text-xs font-bold block"
                        style={{ color: isSelected ? preset.themeColor : "#e4e4e7" }}
                      >
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 block line-clamp-1 mt-0.5">
                        {preset.tagline}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>{preset.category === "binaural" ? `Δ ${preset.beatFreq} Hz` : "Sub-bass"}</span>
                      {isSelected && isAudioPlaying && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Preset Scientific Breakdown */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 text-xs">
              <h4 className="font-semibold text-zinc-200 mb-1">{activePreset.name}</h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed mb-2">
                {activePreset.description}
              </p>
              <div className="space-y-1">
                {activePreset.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Soundscape Mixing Sliders */}
            <div className="space-y-3 pt-2 border-t border-zinc-900 text-xs">
              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Carrier & Master Volume</span>
                  <span>{Math.round(masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 bg-zinc-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Brown Acoustic Bedding Volume</span>
                  <span>{Math.round(noiseVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={noiseVolume}
                  onChange={(e) => handleNoiseVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 bg-zinc-800 rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Achievements & Cognitive Badges Grid */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-xl">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Cognitive Badges & Honor
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {profile.achievements.map((ach) => {
                const isUnlocked = !!ach.unlockedAt;
                return (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-2xl border transition-all flex items-start gap-2.5 ${
                      isUnlocked
                        ? "bg-zinc-950 border-amber-900/40 text-zinc-200"
                        : "bg-zinc-950/30 border-zinc-900 text-zinc-600 opacity-60"
                    }`}
                  >
                    <span className="text-lg shrink-0">{ach.icon}</span>
                    <div className="overflow-hidden">
                      <span className="font-semibold block truncate text-[11px]">
                        {ach.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 block line-clamp-1 mt-0.5">
                        {ach.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Session Completion & XP Victory Modal */}
      {showCompletionModal && completedSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl bg-[#0a0a0a] border border-purple-900/60 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Flow Horizon Conquered!</h3>
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total XP Earned Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 via-zinc-900 to-emerald-950/40 border border-purple-800/80 text-center">
              <span className="text-xs text-zinc-400 uppercase tracking-wider block">
                Total Cognitive XP Earned
              </span>
              <span className="text-3xl font-extrabold text-white mt-1 block">
                +{completedSessionData.xpBreakdown.totalXp} XP
              </span>
            </div>

            {/* XP Points Breakdown */}
            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-400">
                  Focused Duration ({completedSessionData.actualMinutes} mins @ 10 XP/m)
                </span>
                <span className="font-mono">+{completedSessionData.xpBreakdown.basePoints} XP</span>
              </div>
              {completedSessionData.xpBreakdown.completionBonus > 0 && (
                <div className="flex justify-between py-1 border-b border-zinc-900 text-sky-400">
                  <span>Target Horizon Completed Bonus</span>
                  <span className="font-mono">+{completedSessionData.xpBreakdown.completionBonus} XP</span>
                </div>
              )}
              {completedSessionData.xpBreakdown.cleanBonus > 0 && (
                <div className="flex justify-between py-1 border-b border-zinc-900 text-emerald-400">
                  <span>Strict Zero-Distraction Shield Bonus</span>
                  <span className="font-mono">+{completedSessionData.xpBreakdown.cleanBonus} XP</span>
                </div>
              )}
              <div className="flex justify-between py-1 text-amber-400">
                <span>Discipline Streak Multiplier</span>
                <span className="font-mono">{completedSessionData.xpBreakdown.streakMultiplier}x</span>
              </div>
            </div>

            {/* Unlocked Badges (if any) */}
            {completedSessionData.unlockedBadges.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/60 text-xs">
                <span className="font-semibold text-amber-300 block mb-1">
                  New Badge Unlocked!
                </span>
                {completedSessionData.unlockedBadges.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-2 text-zinc-200">
                    <span>{b.icon}</span>
                    <span>{b.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Energy Rating & Reflection Input */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <label className="text-xs text-zinc-400 block">Flow Energy Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEnergyRating(star)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      energyRating >= star
                        ? "bg-purple-900 text-purple-200 border border-purple-700"
                        : "bg-zinc-900 text-zinc-600"
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="Brief takeaway or breakthrough insight..."
                className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleFinalizeSession}
              className="w-full mt-2 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-xl"
            >
              Seal Flow Record & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
