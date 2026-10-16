"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  RotateCcw,
  Sparkles,
  Settings,
  Shield,
  X,
  Cpu,
  HardDrive,
  Terminal,
  Activity,
  Workflow,
  Bot,
  Flame,
  Check,
} from "lucide-react";

interface ConnectorItem {
  provider: string;
  name: string;
  category: string;
  description: string;
  status: "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  requiresApiKey: boolean;
  authType?: "OPEN_PUBLIC" | "API_KEY" | "LOCAL_DAEMON";
  pricingNote?: string;
  defaultEndpoint?: string;
  setupInstructions: string;
  lastSyncAt?: string;
  lastError?: string;
}

interface CompanionServiceItem {
  id: string;
  name: string;
  role: string;
  specificCapability: string;
  executionMode: "LOCAL_ONLY" | "REMOTE_ONLY" | "HYBRID";
  isEnabledByDefault: boolean;
  isNecessaryForInitialRelease: boolean;
  apiProtocol: string;
  authRequirements: string;
  resourceRequirements: {
    minimumRam: string;
    recommendedGpu: string;
    diskSpace: string;
  };
  license: string;
  securityBoundary: string;
  failureMode: string;
  status: string;
  endpointUrl?: string;
  lastSyncAt?: string;
  lastError?: string;
}

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [companionServices, setCompanionServices] = useState<CompanionServiceItem[]>([]);
  const [activeTab, setActiveTab] = useState<"connectors" | "companion">("connectors");
  const [loading, setLoading] = useState(true);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorItem | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionServiceItem | null>(null);

  // Config modal inputs
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      if (data.connectors) setConnectors(data.connectors);
      if (data.companionServices) setCompanionServices(data.companionServices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const openConfigModal = (c: ConnectorItem) => {
    setSelectedConnector(c);
    setSelectedCompanion(null);
    setApiKeyInput("");
    setEndpointInput(c.defaultEndpoint || "");
    setTestResult(null);
  };

  const openCompanionModal = (s: CompanionServiceItem) => {
    setSelectedCompanion(s);
    setSelectedConnector(null);
    setApiKeyInput("");
    setEndpointInput(s.endpointUrl || (s.id === "ollama" ? "http://localhost:11434" : s.id === "n8n" ? "http://localhost:5678" : s.id === "langflow" ? "http://localhost:7860" : s.id === "comfyui" ? "http://localhost:8188" : ""));
    setTestResult(null);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerName = selectedConnector?.provider || selectedCompanion?.id.toUpperCase();
    if (!providerName) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerName,
          apiKey: apiKeyInput,
          endpoint: endpointInput,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
      });

      fetchIntegrations();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection test error: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "CONNECTED":
      case "AVAILABLE":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "ERROR":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "DISABLED_BY_DEFAULT":
        return "text-amber-400/80 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-slate-400 bg-white/5 border-white/5";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            Integrations Hub &amp; Companion Architecture
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hybrid local and cloud orchestration with a strict ₹0 infrastructure budget policy.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("connectors")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "connectors"
                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Core Connectors ({connectors.length})
          </button>
          <button
            onClick={() => setActiveTab("companion")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "companion"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Companion Services ({companionServices.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading integrations...</div>
      ) : activeTab === "connectors" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((c) => (
            <div
              key={c.provider}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-cyan-400 font-bold">
                      {c.category}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                        c.authType === "OPEN_PUBLIC"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : c.authType === "LOCAL_DAEMON"
                          ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      {c.authType === "OPEN_PUBLIC"
                        ? "Public API"
                        : c.authType === "LOCAL_DAEMON"
                        ? "Local Daemon"
                        : "API Key Required"}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-white">{c.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {c.description}
                  </p>
                  {c.pricingNote && (
                    <p className="text-[10px] text-slate-500 italic mt-2">
                      💡 {c.pricingNote}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-500 font-mono text-[10px]">
                  {c.authType === "OPEN_PUBLIC" ? "No Credentials Needed" : c.requiresApiKey ? "Auth Token Needed" : "Local Port 11434"}
                </span>

                <button
                  onClick={() => openConfigModal(c)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/5 text-xs font-medium transition-colors"
                >
                  Configure &amp; Test
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Companion Architecture Services (The 8 Repositories) */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-purple-300">Companion Architecture Policy</span>
              <p className="text-purple-200/80 leading-relaxed text-[11px]">
                To preserve your strict ₹0 infrastructure budget, all companion services remain <strong>disabled by default</strong>. AMAHAS acts as the single unified personal operating system and frontend. Services run locally on demand without recurring subscription fees.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companionServices.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 hover:border-purple-500/30 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
                        {s.role}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(s.status)}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {s.name}
                      <span className="text-[10px] font-normal text-slate-500">({s.license})</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {s.specificCapability}
                    </p>
                  </div>

                  {/* Resource specs */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">RAM:</span>
                      <span className="text-slate-300">{s.resourceRequirements.minimumRam}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Disk:</span>
                      <span className="text-slate-300">{s.resourceRequirements.diskSpace}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Protocol:</span>
                      <span className="text-purple-300 truncate max-w-[140px]">{s.apiProtocol.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] font-mono">
                    {s.executionMode.replace(/_/g, " ")}
                  </span>

                  <button
                    onClick={() => openCompanionModal(s)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                  >
                    Check / Health
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config & Test Modal (Core Connectors or Companion Services) */}
      {(selectedConnector || selectedCompanion) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                Configure {selectedConnector?.name || selectedCompanion?.name}
              </div>
              <button
                onClick={() => {
                  setSelectedConnector(null);
                  setSelectedCompanion(null);
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {selectedConnector?.setupInstructions ||
                `Verify connection to the ${selectedCompanion?.name} service running on your local machine or container.`}
            </p>

            <form onSubmit={handleTestAndSave} className="space-y-4">
              {(selectedConnector?.requiresApiKey || selectedCompanion?.authRequirements.includes("Key")) && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    API Key / Token
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter service credential..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="http://localhost:..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConnector(null);
                    setSelectedCompanion(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {testing ? "Testing..." : "Test Connection & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
