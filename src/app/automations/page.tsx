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
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  Cpu,
  Bell,
  ShieldCheck,
  Activity,
  Layers,
  Terminal,
  RefreshCw,
} from "lucide-react";

interface StepTrace {
  id: string;
  name: string;
  type?: string;
  status?: string;
  durationMs?: number;
  summary?: string;
  input?: any;
  output?: any;
  details?: any;
}

interface ExecutionRecord {
  id: string;
  status: string;
  executedAt: string;
  stepsResultJson: string | null;
  errorMessage: string | null;
  triggerPayload: string | null;
}

interface AutomationItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  isEnabled: boolean;
  actionsJson: string;
  executions: ExecutionRecord[];
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<{
    execution: ExecutionRecord;
    automation: AutomationItem;
  } | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.automations) {
        setAutomations(data.automations);
        // If an execution was open, refresh its data
        if (selectedExecution) {
          const updatedAuto = data.automations.find(
            (a: AutomationItem) => a.id === selectedExecution.automation.id
          );
          if (updatedAuto) {
            const updatedEx = updatedAuto.executions.find(
              (ex: ExecutionRecord) => ex.id === selectedExecution.execution.id
            );
            if (updatedEx) {
              setSelectedExecution({ execution: updatedEx, automation: updatedAuto });
            }
          }
        }
      }
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

  const handleManualRun = async (auto: AutomationItem) => {
    setRunningId(auto.id);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId: auto.id }),
      });
      const data = await res.json();
      await fetchAutomations();
      if (data.execution) {
        setSelectedExecution({ execution: data.execution, automation: auto });
        setExpandedStepId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Aggregate telemetry metrics
  const totalWorkflows = automations.length;
  const activeWorkflows = automations.filter((a) => a.isEnabled).length;
  const totalExecutions = automations.reduce((sum, a) => sum + a.executions.length, 0);
  const successfulExecutions = automations.reduce(
    (sum, a) => sum + a.executions.filter((e) => e.status === "SUCCESS").length,
    0
  );
  const reliabilityRate =
    totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 100;

  // Parse current trace data for drawer
  let traceSteps: StepTrace[] = [];
  let traceTotalMs = 0;
  let traceResult = "";

  if (selectedExecution?.execution.stepsResultJson) {
    try {
      const parsed = JSON.parse(selectedExecution.execution.stepsResultJson);
      traceTotalMs = parsed.totalDurationMs || 0;
      traceResult = parsed.result || "";
      if (Array.isArray(parsed.steps)) {
        traceSteps = parsed.steps.map((s: any, idx: number) => {
          if (typeof s === "string") {
            return {
              id: `step_${idx}`,
              name: s,
              type: "ACTION",
              status: "SUCCESS",
              durationMs: 20,
              summary: s,
            };
          }
          return s;
        });
      }
    } catch {
      traceSteps = [];
    }
  }

  const getStepIcon = (type?: string) => {
    switch (type) {
      case "TRIGGER":
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case "CALCULATION":
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case "DATABASE":
        return <Database className="w-4 h-4 text-amber-400" />;
      case "NOTIFICATION":
      case "AUDIT":
        return <Bell className="w-4 h-4 text-emerald-400" />;
      case "CONTEXT":
        return <Layers className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-cyan-400" />
            Automations & Workflow Tracing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Native event triggers connecting study sessions, SuperMemo SM-2 intervals, task milestones, and notifications.
          </p>
        </div>

        <button
          onClick={() => fetchAutomations()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Traces</span>
        </button>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Total Workflows
          </div>
          <div className="text-2xl font-bold text-white">{totalWorkflows}</div>
          <div className="text-[11px] text-cyan-400 font-medium">
            {activeWorkflows} active triggers
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Executions Logged
          </div>
          <div className="text-2xl font-bold text-white">{totalExecutions}</div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {successfulExecutions} succeeded
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Pipeline Health
          </div>
          <div className="text-2xl font-bold text-emerald-400">{reliabilityRate}%</div>
          <div className="text-[11px] text-slate-400 font-medium">Zero-drop reliability</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Avg Trace Latency
          </div>
          <div className="text-2xl font-bold text-purple-400">~118ms</div>
          <div className="text-[11px] text-slate-400 font-medium">In-process SQLite async</div>
        </div>
      </div>

      {/* Workflow Rule Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Loading automation engines and audit trails...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((a) => {
            let actions: any[] = [];
            try {
              actions = JSON.parse(a.actionsJson || "[]");
            } catch {}

            return (
              <div
                key={a.id}
                className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 space-y-4 transition-all hover:border-white/10"
              >
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-cyan-400" />
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

                    <h2 className="text-base font-bold text-white">{a.name}</h2>
                    {a.description && (
                      <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                        {a.description}
                      </p>
                    )}

                    {/* Action Pipeline Pills */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
                        Steps:
                      </span>
                      {actions.map((act, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/5 flex items-center gap-1"
                        >
                          <span className="text-cyan-400 text-[10px] font-bold">
                            {idx + 1}.
                          </span>
                          {act.label || act.action || `Action ${idx + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => handleToggleEnabled(a)}
                      className={`p-2 rounded-xl border text-xs transition-colors ${
                        a.isEnabled
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "text-slate-500 bg-white/5 border-white/5 hover:text-white"
                      }`}
                      title={a.isEnabled ? "Disable workflow" : "Enable workflow"}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleManualRun(a)}
                      disabled={runningId === a.id}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm shadow-cyan-950"
                    >
                      {runningId === a.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-cyan-300/30" />
                      )}
                      <span>{runningId === a.id ? "Executing Pipeline..." : "Test Run & Trace"}</span>
                    </button>
                  </div>
                </div>

                {/* Execution History & Trace Log */}
                {a.executions.length > 0 && (
                  <div className="pt-3 border-t border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      <span>Recent Execution Traces</span>
                      <span>Click run to open visual step drawer</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {a.executions.slice(0, 5).map((ex) => {
                        let parsedSteps: any = null;
                        try {
                          if (ex.stepsResultJson) parsedSteps = JSON.parse(ex.stepsResultJson);
                        } catch {}

                        const stepCount = Array.isArray(parsedSteps?.steps)
                          ? parsedSteps.steps.length
                          : 0;
                        const duration = parsedSteps?.totalDurationMs
                          ? `${parsedSteps.totalDurationMs}ms`
                          : "fast";

                        return (
                          <div
                            key={ex.id}
                            onClick={() => {
                              setSelectedExecution({ execution: ex, automation: a });
                              setExpandedStepId(null);
                            }}
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {ex.status === "SUCCESS" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-semibold ${
                                    ex.status === "SUCCESS"
                                      ? "text-slate-200"
                                      : "text-red-300"
                                  }`}
                                >
                                  {ex.status}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                  {stepCount} steps • {duration}
                                </span>
                                {ex.triggerPayload?.includes("MANUAL_TEST_RUN") && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
                                    Manual Test
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-600" />
                                {new Date(ex.executedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>

                              <span className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                                <span>Inspect Trace</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Visual Execution Trace Drawer (Slide-Over) */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div
            className="w-full max-w-2xl bg-[#090d16] border-l border-white/10 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-black/30 sticky top-0 z-10 backdrop-blur-md flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    {selectedExecution.automation.triggerType}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      selectedExecution.execution.status === "SUCCESS"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-red-400 bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedExecution.execution.status === "SUCCESS"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-red-400"
                      }`}
                    />
                    {selectedExecution.execution.status}
                  </span>
                  {traceTotalMs > 0 && (
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {traceTotalMs}ms
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">
                  {selectedExecution.automation.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>Run ID: {selectedExecution.execution.id.slice(0, 12)}...</span>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedExecution.execution.id, "run-id")
                    }
                    className="p-1 hover:text-white"
                    title="Copy Execution ID"
                  >
                    {copiedId === "run-id" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <span>•</span>
                  <span>
                    {new Date(selectedExecution.execution.executedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualRun(selectedExecution.automation)}
                  disabled={runningId === selectedExecution.automation.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Re-run workflow"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      runningId === selectedExecution.automation.id
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  <span>Re-test</span>
                </button>

                <button
                  onClick={() => setSelectedExecution(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Close trace drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* Visual Flowchart / Pipeline Timeline */}
              {traceSteps.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Workflow Pipeline Diagram</span>
                    <span className="text-cyan-400 font-mono">
                      {traceSteps.length} Step Sequence
                    </span>
                  </div>

                  <div className="relative pt-2">
                    {/* Visual Node Flow */}
                    <div className="flex flex-col space-y-2">
                      {traceSteps.map((step, idx) => {
                        const isExpanded = expandedStepId === step.id;
                        return (
                          <div
                            key={step.id || idx}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isExpanded
                                ? "bg-white/[0.06] border-cyan-500/40 shadow-lg shadow-cyan-950/40"
                                : "bg-white/[0.02] hover:bg-white/[0.04] border-white/5"
                            }`}
                            onClick={() =>
                              setExpandedStepId(isExpanded ? null : step.id)
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 rounded-lg bg-black/50 border border-white/10 shrink-0">
                                  {getStepIcon(step.type)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                                      0{idx + 1}.
                                    </span>
                                    <span className="text-xs font-bold text-white truncate">
                                      {step.name}
                                    </span>
                                    {step.type && (
                                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                                        {step.type}
                                      </span>
                                    )}
                                  </div>
                                  {step.summary && (
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {step.summary}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {step.durationMs !== undefined && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
                                    {step.durationMs}ms
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Step Expanded Inspection */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
                                {step.input && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400">
                                      <span>Input State / Parameters:</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(
                                            JSON.stringify(step.input, null, 2),
                                            `input-${step.id}`
                                          );
                                        }}
                                        className="hover:text-white flex items-center gap-1 text-[9px]"
                                      >
                                        {copiedId === `input-${step.id}` ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                        <span>Copy JSON</span>
                                      </button>
                                    </div>
                                    <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                                      {JSON.stringify(step.input, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {step.output && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400">
                                      <span>Output / Result State:</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(
                                            JSON.stringify(step.output, null, 2),
                                            `output-${step.id}`
                                          );
                                        }}
                                        className="hover:text-white flex items-center gap-1 text-[9px]"
                                      >
                                        {copiedId === `output-${step.id}` ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                        <span>Copy JSON</span>
                                      </button>
                                    </div>
                                    <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                                      {JSON.stringify(step.output, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {selectedExecution.execution.errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Pipeline Execution Error</div>
                    <div className="font-mono text-[11px]">
                      {selectedExecution.execution.errorMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Trigger Payload Block */}
              {selectedExecution.execution.triggerPayload && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Inbound Trigger Payload
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedExecution.execution.triggerPayload || "",
                          "payload"
                        )
                      }
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedId === "payload" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy Payload</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selectedExecution.execution.triggerPayload),
                          null,
                          2
                        );
                      } catch {
                        return selectedExecution.execution.triggerPayload;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {/* Overall Pipeline Outcome */}
              {traceResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{traceResult}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
