"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Target,
  Flame,
  ShieldAlert,
} from "lucide-react";
import { EXAMINATION_TRACKS, ExaminationTrack } from "@/lib/syllabus-templates";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onCompleted }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [workingStart, setWorkingStart] = useState("08:30");
  const [workingEnd, setWorkingEnd] = useState("22:30");
  const [focusMin, setFocusMin] = useState(45);
  const [selectedTrack, setSelectedTrack] = useState<string>("GATE_EC");
  const [targetExams, setTargetExams] = useState("GATE EC 2027");
  const [fixedCommitments, setFixedCommitments] = useState(
    "College Lectures: Mon-Fri 09:00 - 16:00\nCore Lab Sessions: Wed & Fri 14:00 - 17:00"
  );
  const [learningPriorities, setLearningPriorities] = useState(
    "1. Networks & Transient Analysis\n2. Signals & Fourier/Laplace Transforms\n3. Daily 45-min Active Recall Review"
  );
  const [clearDemoData, setClearDemoData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimeZone(detected);
    } catch {
      // Fallback already set to Asia/Kolkata
    }
  }, []);

  if (!isOpen) return null;

  const tracksList = Object.values(EXAMINATION_TRACKS);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Update Preferences & Profile via settings API
      const settingsRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeZone,
          workingHoursStart: workingStart,
          workingHoursEnd: workingEnd,
          preferredFocusMinutes: focusMin,
          targetExams,
          examinationTrack: selectedTrack,
          fixedCommitments,
          learningPriorities,
        }),
      });

      if (!settingsRes.ok) {
        throw new Error("Failed to save student preferences");
      }

      // 2. Provision Track Syllabus and manage demo data
      const trackRes = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SELECT_TRACK",
          trackId: selectedTrack,
          clearDemo: clearDemoData,
          fixedCommitments,
          learningPriorities,
          targetExams,
        }),
      });

      if (!trackRes.ok) {
        const err = await trackRes.json();
        throw new Error(err.error || "Failed to configure track syllabus");
      }

      if (onCompleted) onCompleted();
      onClose();
    } catch (e: any) {
      setErrorMessage(e.message || "An unexpected error occurred during onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-primary)]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-text)] flex items-center justify-center font-bold text-sm shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)]">
                AMAHAS Personalization &amp; Track Onboarding
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Step {step} of 4 — {step === 1 ? "Time & Routine" : step === 2 ? "Discipline & Exam Track" : step === 3 ? "Commitments & Goals" : "Provisioning & Demo Policy"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[var(--text-primary)]">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Time Zone, Routine & Focus */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-slate-300 leading-relaxed">
                Configure your local timezone, habitual study window, and default focus block duration. AMAHAS uses your local hours to align daily review reminders and schedule planning.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Time Zone
                  </label>
                  <input
                    type="text"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    placeholder="e.g. Asia/Kolkata, UTC, America/New_York"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Detected system timezone: {timeZone}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Active Study Window (Start)
                    </label>
                    <input
                      type="time"
                      value={workingStart}
                      onChange={(e) => setWorkingStart(e.target.value)}
                      className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Active Study Window (End)
                    </label>
                    <input
                      type="time"
                      value={workingEnd}
                      onChange={(e) => setWorkingEnd(e.target.value)}
                      className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Preferred Focus Duration (Minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    {[25, 45, 60, 90].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setFocusMin(dur)}
                        className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                          focusMin === dur
                            ? "bg-cyan-500 text-black border-cyan-400"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                    <input
                      type="number"
                      value={focusMin}
                      onChange={(e) => setFocusMin(Number(e.target.value))}
                      className="w-20 bg-[#070b14] border border-white/10 rounded-xl px-2.5 py-1.5 text-center text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Discipline & Examination Track */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-slate-300 leading-relaxed">
                Select your engineering discipline and examination track. AMAHAS provides recognized syllabus structures for each track with real subject units without fabricated weightages or fake marks.
              </div>

              <div className="space-y-2.5">
                {tracksList.map((tr) => (
                  <div
                    key={tr.id}
                    onClick={() => {
                      setSelectedTrack(tr.id);
                      setTargetExams(tr.title);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTrack === tr.id
                        ? "bg-cyan-500/10 border-cyan-400/50 text-white shadow-md shadow-cyan-500/10"
                        : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-100">
                        <GraduationCap className="w-4 h-4 text-cyan-400" />
                        <span>{tr.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-300">
                        {tr.discipline}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{tr.description}</p>
                    <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <span>Includes:</span>
                      {tr.courses.slice(0, 3).map((c) => (
                        <span key={c.code} className="text-slate-300 font-mono">
                          {c.code}
                        </span>
                      ))}
                      {tr.courses.length > 3 && (
                        <span>+{tr.courses.length - 3} more subjects</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Fixed Commitments & Goals */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-slate-300 leading-relaxed">
                Record your real-world fixed obligations (e.g. college class schedule, lab hours, sleep window) and core learning priorities so planner blocks don't create impossible schedules.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Primary Examination / Academic Goal
                  </label>
                  <input
                    type="text"
                    value={targetExams}
                    onChange={(e) => setTargetExams(e.target.value)}
                    placeholder="e.g. GATE EC 2027 AIR < 100, ESE Electronics & Telecom"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Fixed Weekly Commitments (Classes, Labs, Commute)
                  </label>
                  <textarea
                    rows={3}
                    value={fixedCommitments}
                    onChange={(e) => setFixedCommitments(e.target.value)}
                    placeholder="e.g. Mon-Fri 09:00 - 16:00 College Lectures..."
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Core Learning Priorities
                  </label>
                  <textarea
                    rows={3}
                    value={learningPriorities}
                    onChange={(e) => setLearningPriorities(e.target.value)}
                    placeholder="e.g. 1. Complete Transient Analysis\n2. Solve 20 past year questions daily..."
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Demo Data Policy & Finalize */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 space-y-2">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Ready to provision {EXAMINATION_TRACKS[selectedTrack]?.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  AMAHAS will configure standard syllabus structures for {selectedTrack} with {EXAMINATION_TRACKS[selectedTrack]?.courses.length} courses and active spaced repetition tracking.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="font-semibold text-white">Sample / Demo Records Handling</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The initial database seed contained sample demo records (e.g. Computer Science OS/Math tasks). Select how you would like to handle them:
                </p>

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-white/5 bg-black/20 cursor-pointer">
                    <input
                      type="radio"
                      name="demoPolicy"
                      checked={clearDemoData}
                      onChange={() => setClearDemoData(true)}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">
                        Clear demo data (Recommended)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Removes sample CS records so your workspace reflects only your selected track ({selectedTrack}).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-white/5 bg-black/20 cursor-pointer">
                    <input
                      type="radio"
                      name="demoPolicy"
                      checked={!clearDemoData}
                      onChange={() => setClearDemoData(false)}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">
                        Keep sample data as reference
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Retains sample records clearly flagged with a [Demo Record] badge alongside your new track.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-white/10 bg-[#070b14]/50 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={submitting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? "Configuring Track..." : "Finish Onboarding"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
