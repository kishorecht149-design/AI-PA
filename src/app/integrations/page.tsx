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

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorItem | null>(null);

  // Config modal inputs
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConnectors = async () => {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      if (data.connectors) setConnectors(data.connectors);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const openConfigModal = (c: ConnectorItem) => {
    setSelectedConnector(c);
    setApiKeyInput("");
    setEndpointInput(c.defaultEndpoint || "");
    setTestResult(null);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedConnector.provider,
          apiKey: apiKeyInput,
          endpoint: endpointInput,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
      });

      fetchConnectors();
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
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "ERROR":
        return "text-red-400 bg-red-500/10 border-red-500/30";
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
            Integrations Hub &amp; Connector Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Modular architecture linking open-source tools, literature APIs, and local/hosted AI gateways.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading connectors...</div>
      ) : (
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
                <span className="text-[11px] text-slate-500 font-mono text-[10px]">
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
      )}

      {/* Config & Test Modal */}
      {selectedConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                Configure {selectedConnector.name}
              </div>
              <button
                onClick={() => setSelectedConnector(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {selectedConnector.setupInstructions}
            </p>

            <form onSubmit={handleTestAndSave} className="space-y-4">
              {selectedConnector.requiresApiKey && (
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
                  placeholder="https://..."
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
                  onClick={() => setSelectedConnector(null)}
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
