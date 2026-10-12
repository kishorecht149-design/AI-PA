"use client";

import React, { useState, useEffect } from "react";
import {
  Workflow,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Power,
} from "lucide-react";

interface AutomationItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  isEnabled: boolean;
  actionsJson: string;
  executions: {
    id: string;
    status: string;
    executedAt: string;
    stepsResultJson: string | null;
  }[];
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.automations) setAutomations(data.automations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggleEnabled = async (auto: AutomationItem) => {
    const nextState = !auto.isEnabled;
    setAutomations((prev) =>
      prev.map((a) => (a.id === auto.id ? { ...a, isEnabled: nextState } : a))
    );

    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        automationId: auto.id,
        toggleEnabled: nextState,
      }),
    });
  };

  const handleManualRun = async (id: string) => {
    setRunningId(id);
    try {
      await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId: id }),
      });
      fetchAutomations();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRunningId(null), 800);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-cyan-400" />
            Automations Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            n8n-inspired internal workflow triggers connecting study sessions, SM-2 intervals, and reviews.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading workflows...</div>
      ) : (
        <div className="space-y-4">
          {automations.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-cyan-400 font-bold">
                      Trigger: {a.triggerType}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        a.isEnabled
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-slate-500 bg-white/5 border-white/5"
                      }`}
                    >
                      {a.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white">{a.name}</h2>
                  {a.description && (
                    <p className="text-xs text-slate-400">{a.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => handleToggleEnabled(a)}
                    className={`p-2 rounded-xl border text-xs transition-colors ${
                      a.isEnabled
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-slate-500 bg-white/5 border-white/5 hover:text-white"
                    }`}
                    title={a.isEnabled ? "Disable workflow" : "Enable workflow"}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleManualRun(a.id)}
                    disabled={runningId === a.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{runningId === a.id ? "Executing..." : "Test Run"}</span>
                  </button>
                </div>
              </div>

              {/* Execution History */}
              {a.executions.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Recent Execution Audit Logs
                  </div>
                  <div className="space-y-1.5">
                    {a.executions.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Status: {ex.status}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ex.executedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
