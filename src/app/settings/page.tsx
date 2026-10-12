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
} from "lucide-react";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";

export default function SettingsPage() {
  const [profileName, setProfileName] = useState("Kishore Kumar");
  const [workingStart, setWorkingStart] = useState("08:30");
  const [workingEnd, setWorkingEnd] = useState("22:30");
  const [focusMin, setFocusMin] = useState(45);
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI model test state
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingModel, setTestingModel] = useState(false);

  useEffect(() => {
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
      });
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

  const handleTestAiModel = async () => {
    setTestingModel(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "OPENROUTER",
        }),
      });
      const data = await res.json();
      setTestResult(data.message);
    } catch (e: any) {
      setTestResult(`Test error: ${e.message}`);
    } finally {
      setTestingModel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-400" />
            System Settings &amp; Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure working hours, AI Model Gateway, privacy controls, and data portability.
          </p>
        </div>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Section 1: Profile & Working Hours */}
        <div className="p-6 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <User className="w-4 h-4" /> Student Profile &amp; Routine
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Configured Timezone
              </label>
              <input
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Study Hours Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  className="bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="time"
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  className="bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Focus Duration (Minutes)
              </label>
              <input
                type="number"
                value={focusMin}
                onChange={(e) => setFocusMin(Number(e.target.value))}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully.
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Preferences"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 2: AI Model Gateway Config */}
      <div className="p-6 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
          <Cpu className="w-4 h-4" /> AI Models Gateway (OpenRouter &amp; Ollama)
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          AMAHAS prioritizes free hosted router endpoints (<strong>openrouter/free</strong>) and local inference (<strong>Ollama</strong>). Paid models are never engaged without explicit selection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KNOWN_FREE_MODELS.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                selectedModel === m.id
                  ? "bg-violet-600/10 border-violet-500/40 text-white"
                  : "bg-white/[0.02] border-white/5 text-slate-400"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>{m.name}</span>
                <span className="text-[10px] text-emerald-400 uppercase font-mono">
                  {m.isFree ? "Free Tier" : "Local"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{m.description}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleTestAiModel}
            disabled={testingModel}
            className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-500/30 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {testingModel ? "Testing Gateway..." : "Test AI Model Gateway"}
          </button>
          {testResult && (
            <span className="text-xs text-slate-300 font-mono">{testResult}</span>
          )}
        </div>
      </div>

      {/* Section 3: Privacy & Full Data Portability */}
      <div className="p-6 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Shield className="w-4 h-4" /> Privacy &amp; Data Portability
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          You own 100% of your academic records, research notes, and habit data. Export your complete data structure at any time into standard, portable JSON with zero vendor lock-in.
        </p>

        <div className="pt-1">
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Complete Student Data (.json)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
