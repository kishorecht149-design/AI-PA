"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  Clock,
  Shield,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  Cpu,
  Palette,
} from "lucide-react";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ThemeBrowser } from "@/components/ThemeBrowser";

export default function SettingsPage() {
  const [profileName, setProfileName] = useState("Kishore");
  const [workingStart, setWorkingStart] = useState("08:30");
  const [workingEnd, setWorkingEnd] = useState("22:30");
  const [focusMin, setFocusMin] = useState(45);
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [examinationTrack, setExaminationTrack] = useState("GATE_EC");
  const [targetExams, setTargetExams] = useState("GATE EC 2027");
  const [fixedCommitments, setFixedCommitments] = useState("");
  const [learningPriorities, setLearningPriorities] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // AI model test state
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingModel, setTestingModel] = useState(false);

  const loadSettings = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setProfileName(d.user.name);
        if (d.preferences) {
          setWorkingStart(d.preferences.workingHoursStart || "08:30");
          setWorkingEnd(d.preferences.workingHoursEnd || "22:30");
          setFocusMin(d.preferences.preferredFocusMinutes || 45);
          setTimeZone(d.preferences.timeZone || "Asia/Kolkata");
        }
        if (d.profile) {
          if (d.profile.examinationTrack) setExaminationTrack(d.profile.examinationTrack);
          if (d.profile.targetExams) setTargetExams(d.profile.targetExams);
          if (d.profile.fixedCommitments) setFixedCommitments(d.profile.fixedCommitments);
          if (d.profile.learningPriorities) setLearningPriorities(d.profile.learningPriorities);
        }
      });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          workingHoursStart: workingStart,
          workingHoursEnd: workingEnd,
          preferredFocusMinutes: focusMin,
          timeZone,
          examinationTrack,
          targetExams,
          fixedCommitments,
          learningPriorities,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm("Are you sure you want to remove all demo sample courses, tasks, and goals?")) return;
    try {
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_DEMO" }),
      });
      if (res.ok) {
        alert("Demo records cleared successfully.");
        loadSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAiModel = async () => {
    setTestingModel(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Ping. State system ready in 1 word.",
          modelId: selectedModel,
        }),
      });
      const data = await res.json();
      const replyText = data.message?.content || data.reply;
      if (replyText) {
        setTestResult(`✓ Active: "${replyText.slice(0, 50)}"`);
      } else {
        setTestResult("⚠️ AI Gateway replied without content.");
      }
    } catch {
      setTestResult("❌ Gateway unreachable.");
    } finally {
      setTestingModel(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto transition-colors duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[var(--accent-primary)]" />
            System Settings &amp; Preferences
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Personalize your 24-theme workspace, routine timings, examination track, and data controls.
          </p>
        </div>
      </div>

      {/* SECTION: Theme & Appearance (24 Visual Themes Engine) */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-6">
        <ThemeBrowser />
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Section: Profile & Working Hours */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            <User className="w-4 h-4" /> Student Profile &amp; Routine
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Configured Timezone
              </label>
              <input
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Study Hours Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
                <input
                  type="time"
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Default Focus Duration (Minutes)
              </label>
              <input
                type="number"
                value={focusMin}
                onChange={(e) => setFocusMin(Number(e.target.value))}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Configured Examination Track
              </label>
              <select
                value={examinationTrack}
                onChange={(e) => setExaminationTrack(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                <option value="GATE_EC">GATE EC — Electronics &amp; Communication</option>
                <option value="ESE_ET">ESE E&amp;T — Electronics &amp; Telecommunication (UPSC)</option>
                <option value="ECE_CORE">ECE Core Coursework — Degree Curriculum</option>
                <option value="GATE_CS">GATE CS — Computer Science &amp; IT</option>
                <option value="CUSTOM">Custom Engineering Track</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Target Examination Goals
              </label>
              <input
                type="text"
                value={targetExams}
                onChange={(e) => setTargetExams(e.target.value)}
                placeholder="e.g. GATE EC 2027 AIR < 100"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Fixed Commitments (Classes, Labs, Commute)
              </label>
              <textarea
                rows={3}
                value={fixedCommitments}
                onChange={(e) => setFixedCommitments(e.target.value)}
                placeholder="e.g. Mon-Fri 09:00 - 16:00 College Lectures..."
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Learning Priorities
              </label>
              <textarea
                rows={3}
                value={learningPriorities}
                onChange={(e) => setLearningPriorities(e.target.value)}
                placeholder="e.g. 1. Networks & Transient Analysis..."
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] leading-relaxed"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-[var(--text-primary)] border border-violet-500/30 text-xs font-semibold transition-colors"
              >
                Launch Onboarding Wizard
              </button>
              <button
                type="button"
                onClick={handleClearDemo}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                Clear Demo Data
              </button>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Preferences saved.
                </span>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--btn-bg)] hover:opacity-90 text-[var(--btn-text)] font-semibold text-xs transition-colors shadow-md disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Preferences"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Section: AI Model Gateway Config */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-secondary)]">
          <Cpu className="w-4 h-4" /> AI Models Gateway (OpenRouter &amp; Ollama)
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          AMAHAS prioritizes free hosted router endpoints (<strong>openrouter/free</strong>) and local inference (<strong>Ollama</strong>). Paid models are never engaged without explicit selection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KNOWN_FREE_MODELS.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-all ${
                selectedModel === m.id
                  ? "bg-violet-500/15 border-violet-500/50 text-[var(--text-primary)] ring-1 ring-violet-500/50 shadow-sm"
                  : "bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-focus)]"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  {selectedModel === m.id && (
                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 animate-pulse" />
                  )}
                  {m.name}
                </span>
                <span className="text-[10px] text-emerald-400 uppercase font-mono shrink-0 ml-1.5">
                  {m.isFree ? "Free Tier" : "Local"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">{m.description}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleTestAiModel}
            disabled={testingModel}
            className="px-4 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-[var(--text-primary)] border border-violet-500/30 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {testingModel ? "Testing Gateway..." : "Test AI Model Gateway"}
          </button>
          {testResult && (
            <span className="text-xs text-[var(--text-secondary)] font-mono">{testResult}</span>
          )}
        </div>
      </div>

      {/* Section: Privacy & Full Data Portability */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Shield className="w-4 h-4" /> Privacy &amp; Data Portability
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          You own 100% of your academic records, research notes, and habit data. Export your complete data structure at any time into standard, portable JSON with zero vendor lock-in.
        </p>

        <div className="pt-1">
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Complete Student Data (.json)</span>
          </a>
        </div>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCompleted={loadSettings}
      />
    </div>
  );
}
