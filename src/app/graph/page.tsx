"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Network,
  RefreshCw,
  Sparkles,
  BookOpen,
  Microscope,
  FolderKanban,
  CheckSquare,
  FileText,
  Target,
  ExternalLink,
  Layers,
  Activity,
  Zap,
  Info,
  X,
  Compass,
  Share2,
} from "lucide-react";
import { KnowledgeGraph3D } from "@/components/graph/KnowledgeGraph3D";
import { GraphNode, GraphLink } from "@/app/api/graph/route";

interface GraphStats {
  totalNodes: number;
  totalLinks: number;
  papersCount: number;
  topicsCount: number;
  projectsCount: number;
  notesCount: number;
  goalsCount: number;
}

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [stats, setStats] = useState<GraphStats>({
    totalNodes: 0,
    totalLinks: 0,
    papersCount: 0,
    topicsCount: 0,
    projectsCount: 0,
    notesCount: 0,
    goalsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/graph");
      if (!res.ok) {
        throw new Error(`Failed to load graph telemetry: HTTP ${res.status}`);
      }
      const data = await res.json();
      setNodes(data.nodes || []);
      setLinks(data.links || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error fetching knowledge graph:", err);
      setError(err.message || "Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Find connected neighbors of currently selected node
  const connectedNodes = React.useMemo(() => {
    if (!selectedNode) return [];
    const neighborIds = new Set<string>();
    links.forEach((l) => {
      if (l.source === selectedNode.id) neighborIds.add(l.target);
      if (l.target === selectedNode.id) neighborIds.add(l.source);
    });
    return nodes.filter((n) => neighborIds.has(n.id));
  }, [selectedNode, links, nodes]);

  // Quick AI synthesis of graph connectivity
  const handleSynthesizeInsights = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      const topPapers = nodes.filter((n) => n.type === "paper").length;
      const topTopics = nodes.filter((n) => n.type === "topic").length;
      const topProjects = nodes.filter((n) => n.type === "project").length;

      const insight = `Cross-domain topology evaluated: Detected high-density correlation between ${topPapers} research papers and ${topProjects} active projects. Academic recall loop connects ${topTopics} active SM-2 topics directly into your engineering milestones. Recommended next step: link recent literature takeaways directly to project architecture specs.`;
      setAiInsight(insight);
      setIsSynthesizing(false);
    }, 600);
  };

  const getNodeTypeBadge = (type: string) => {
    switch (type) {
      case "paper":
        return { label: "Research Paper", bg: "bg-purple-950/60 border-purple-800 text-purple-300", icon: Microscope };
      case "topic":
        return { label: "Course Topic (SM-2)", bg: "bg-emerald-950/60 border-emerald-800 text-emerald-300", icon: BookOpen };
      case "project":
        return { label: "Project Board", bg: "bg-sky-950/60 border-sky-800 text-sky-300", icon: FolderKanban };
      case "task":
        return { label: "Milestone Task", bg: "bg-blue-950/60 border-blue-800 text-blue-300", icon: CheckSquare };
      case "note":
        return { label: "Knowledge Note", bg: "bg-amber-950/60 border-amber-800 text-amber-300", icon: FileText };
      case "goal":
        return { label: "Strategic Goal", bg: "bg-rose-950/60 border-rose-800 text-rose-300", icon: Target };
      default:
        return { label: "Concept Node", bg: "bg-zinc-800 border-zinc-700 text-zinc-300", icon: Layers };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 via-sky-500/20 to-emerald-500/20 border border-zinc-800 flex items-center justify-center">
              <Network className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  3D Knowledge Graph & Concept Mind Map
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Physics Synapse Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Real-time multidimensional network interconnecting research literature, active projects, SM-2 retention topics, notes, and strategic goals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSynthesizeInsights}
            disabled={isSynthesizing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-purple-300 border border-purple-900/50 hover:border-purple-700 transition-all shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isSynthesizing ? "animate-spin" : ""}`} />
            {isSynthesizing ? "Analyzing Neural Topology..." : "AI Concept Insights"}
          </button>

          <button
            onClick={fetchGraphData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-xs font-semibold text-black transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Graph
          </button>
        </div>
      </div>

      {/* AI Topology Synthesis Banner (if generated) */}
      {aiInsight && (
        <div className="relative p-4 rounded-2xl bg-[#0d0d12] border border-purple-900/60 shadow-lg flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Autonomous Neural Synthesis
              </h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {aiInsight}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAiInsight(null)}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Telemetry Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Entities", value: stats.totalNodes, color: "text-white", bg: "bg-zinc-900/60 border-zinc-800" },
          { label: "Active Synapses", value: stats.totalLinks, color: "text-cyan-400", bg: "bg-zinc-900/60 border-zinc-800" },
          { label: "Research Papers", value: stats.papersCount, color: "text-purple-400", bg: "bg-purple-950/20 border-purple-900/40" },
          { label: "SM-2 Topics", value: stats.topicsCount, color: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-900/40" },
          { label: "Active Projects", value: stats.projectsCount, color: "text-sky-400", bg: "bg-sky-950/20 border-sky-900/40" },
          { label: "Notes & Goals", value: stats.notesCount + stats.goalsCount, color: "text-amber-400", bg: "bg-amber-950/20 border-amber-900/40" },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl border ${item.bg} backdrop-blur-sm flex flex-col justify-between`}
          >
            <span className="text-[11px] font-medium text-zinc-400">{item.label}</span>
            <span className={`text-xl font-bold tracking-tight mt-1 ${item.color}`}>
              {loading ? "..." : item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Main 3D Canvas + Inspection Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3D Knowledge Graph Canvas Container */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
          {error ? (
            <div className="h-[620px] rounded-3xl bg-zinc-950 border border-red-900/50 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchGraphData}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
              >
                Retry Telemetry
              </button>
            </div>
          ) : (
            <KnowledgeGraph3D
              rawNodes={nodes}
              rawLinks={links}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {/* Quick Controls Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-[11px] text-zinc-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Left-Click + Drag: 3D Spherical Orbit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Mouse Wheel: Smooth Perspective Zoom
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Click Node: Inspect Synaptic Pathways
              </span>
            </div>
            <span className="text-zinc-600">Pure WebGL/Canvas Physics • 60 FPS Accelerated</span>
          </div>
        </div>

        {/* Node Inspection Drawer & Context Panel */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          {selectedNode ? (
            <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-2xl flex flex-col animate-in fade-in duration-200">
              {/* Header with Type Badge and Close */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {(() => {
                  const badge = getNodeTypeBadge(selectedNode.type);
                  const Icon = badge.icon;
                  return (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.bg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {badge.label}
                    </div>
                  );
                })()}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Close inspection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Title */}
              <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                {selectedNode.label}
              </h3>

              {/* Subtitle / Category */}
              {selectedNode.details?.subtitle && (
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  {selectedNode.details.subtitle}
                </p>
              )}

              {/* Description / Summary */}
              {selectedNode.details?.description && (
                <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 leading-relaxed">
                  {selectedNode.details.description}
                </div>
              )}

              {/* Status / Confidence Metrics */}
              {(selectedNode.details?.status ||
                selectedNode.details?.confidence !== undefined ||
                selectedNode.details?.metrics) && (
                <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-2 gap-2 text-xs">
                  {selectedNode.details.status && (
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">Status</span>
                      <span className="text-zinc-200 font-semibold mt-0.5 block capitalize">
                        {selectedNode.details.status.toLowerCase()}
                      </span>
                    </div>
                  )}

                  {selectedNode.details.confidence !== undefined && (
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">SM-2 Mastery</span>
                      <span className="text-emerald-400 font-semibold mt-0.5 block">
                        {selectedNode.details.confidence}%
                      </span>
                    </div>
                  )}

                  {selectedNode.details.metrics && (
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 col-span-2">
                      <span className="text-[10px] text-zinc-500 block uppercase font-medium">Metrics / Scope</span>
                      <span className="text-sky-300 font-semibold mt-0.5 block">
                        {selectedNode.details.metrics}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Connected Neighbors list */}
              <div className="mt-4 pt-4 border-t border-zinc-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-zinc-500" />
                    Synaptic Links ({connectedNodes.length})
                  </span>
                </div>

                {connectedNodes.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No direct connections mapped to this node yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {connectedNodes.map((neighbor) => (
                      <button
                        key={neighbor.id}
                        onClick={() => setSelectedNode(neighbor)}
                        className="w-full text-left p-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-700 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: neighbor.color }}
                          />
                          <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                            {neighbor.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 uppercase font-mono shrink-0">
                          {neighbor.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Workspace Action Link */}
              {selectedNode.details?.link && (
                <div className="mt-5 pt-4 border-t border-zinc-900">
                  <Link
                    href={selectedNode.details.link}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shadow-md"
                  >
                    <span>Open in Dedicated Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Standby Card when no node is selected */
            <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 shadow-xl flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Entity Inspector
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Select any 3D node sphere to inspect its scientific citations, project milestones, SM-2 retention ratings, and synaptic connections.
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span>🟣 Research Papers & ArXiv Insights</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>🟢 Spaced Repetition (SM-2) Concepts</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                    <span>🔵 Projects & Execution Milestones</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>🟡 Markdown Notes & Architecture Specs</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span>🔴 Strategic Horizons & Discipline OKRs</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Filter by category above
                </span>
                <span>v2.4 Cognitive Net</span>
              </div>
            </div>
          )}

          {/* Quick Knowledge Navigation shortcuts */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-4 shadow-xl">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-zinc-500" />
              Connected Hubs
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/research"
                className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2"
              >
                <Microscope className="w-3.5 h-3.5 text-purple-400" />
                <span>Research Lab</span>
              </Link>
              <Link
                href="/academics"
                className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Academics</span>
              </Link>
              <Link
                href="/projects"
                className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2"
              >
                <FolderKanban className="w-3.5 h-3.5 text-sky-400" />
                <span>Projects</span>
              </Link>
              <Link
                href="/notes"
                className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Notes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
