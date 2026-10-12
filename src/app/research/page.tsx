"use client";

import React, { useState, useEffect } from "react";
import {
  Microscope,
  Search,
  BookOpen,
  FlaskConical,
  Database,
  ExternalLink,
  Plus,
  CheckCircle2,
  Sparkles,
  FileText,
  Calendar,
  Layers,
  Award,
} from "lucide-react";

interface PaperItem {
  id: string;
  title: string;
  authors: string | null;
  venue: string | null;
  year: number | null;
  doi: string | null;
  arxivId: string | null;
  abstract: string | null;
  pdfUrl: string | null;
  readingStatus: string;
  retrievedSource: string | null;
  userKeyTakeaways: string | null;
}

interface ExperimentItem {
  id: string;
  experimentCode: string;
  objective: string;
  methodDescription: string;
  configJson: string | null;
  metricsJson: string | null;
  resultSummary: string | null;
  isReproducible: boolean;
}

interface ResearchProjectItem {
  id: string;
  title: string;
  description: string | null;
  abstract: string | null;
  hypotheses: string | null;
  status: string;
  targetVenue: string | null;
  papers: PaperItem[];
  experiments: ExperimentItem[];
  datasets: { id: string; name: string; sizeFormatted: string | null }[];
}

export default function ResearchPage() {
  const [projects, setProjects] = useState<ResearchProjectItem[]>([]);
  const [activeTab, setActiveTab] = useState<"papers" | "experiments" | "discovery">("papers");
  const [loading, setLoading] = useState(true);

  // Live Discovery Search State
  const [searchQuery, setSearchQuery] = useState("Quantization Edge LLM");
  const [discoveryPapers, setDiscoveryPapers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  const fetchResearch = async () => {
    try {
      const res = await fetch("/api/research");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  const handleSearchDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/research/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.papers) setDiscoveryPapers(data.papers);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveToProject = async (paper: any) => {
    const activeProject = projects[0];
    if (!activeProject) return;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchProjectId: activeProject.id,
          title: paper.title,
          authors: paper.authors,
          year: paper.publicationYear,
          doi: paper.doi,
          arxivId: paper.arxivId,
          abstract: paper.abstract,
          pdfUrl: paper.openAccessUrl,
          source: paper.source,
        }),
      });

      if (res.ok) {
        setSaveSuccessId(paper.id);
        setTimeout(() => setSaveSuccessId(null), 2000);
        fetchResearch();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeProject = projects[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Microscope className="w-6 h-6 text-violet-400" />
            Research Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Systematic investigation, paper repository with live arXiv &amp; OpenAlex discovery, and reproducible experiments.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs">
          <button
            onClick={() => setActiveTab("papers")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "papers" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Paper Library ({activeProject?.papers.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("experiments")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "experiments" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Experiments ({activeProject?.experiments.length || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab("discovery");
              if (discoveryPapers.length === 0) {
                // Auto trigger initial discovery
                setSearching(true);
                fetch(`/api/research/search?q=${encodeURIComponent(searchQuery)}`)
                  .then((r) => r.json())
                  .then((d) => setDiscoveryPapers(d.papers || []))
                  .finally(() => setSearching(false));
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "discovery" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Live arXiv &amp; OpenAlex Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading research records...</div>
      ) : !activeProject ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500">
          No research projects registered.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Project Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0b1120] border border-violet-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] font-mono uppercase tracking-wider border border-violet-500/20">
                {activeProject.status} Project
              </span>
              {activeProject.targetVenue && (
                <span className="text-xs text-slate-400">
                  Target Venue: <strong className="text-slate-200">{activeProject.targetVenue}</strong>
                </span>
              )}
            </div>

            <h2 className="text-lg md:text-xl font-bold text-white">
              {activeProject.title}
            </h2>

            {activeProject.hypotheses && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300">
                <span className="text-violet-400 font-semibold block mb-0.5">Hypothesis:</span>
                {activeProject.hypotheses}
              </div>
            )}
          </div>

          {/* TAB 1: Paper Library */}
          {activeTab === "papers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Literature Repository</span>
                <span>{activeProject.papers.length} Papers Saved</span>
              </div>

              <div className="space-y-3">
                {activeProject.papers.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-400">
                          {p.retrievedSource || "Paper"} • {p.year || "Recent"}
                        </span>
                        <h3 className="text-sm font-bold text-white">{p.title}</h3>
                        <p className="text-xs text-slate-400">Authors: {p.authors}</p>
                      </div>

                      <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 shrink-0">
                        {p.readingStatus}
                      </span>
                    </div>

                    {p.userKeyTakeaways && (
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                        <strong className="text-cyan-400">Student Key Takeaway: </strong>
                        {p.userKeyTakeaways}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs pt-1">
                      {p.doi && (
                        <a
                          href={`https://doi.org/${p.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          DOI Reference <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {p.arxivId && (
                        <a
                          href={`https://arxiv.org/abs/${p.arxivId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          arXiv:{p.arxivId} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Experiments */}
          {activeTab === "experiments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Experiment Records &amp; Reproducibility Runs</span>
                <span>{activeProject.experiments.length} Experiments</span>
              </div>

              <div className="space-y-3">
                {activeProject.experiments.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl bg-[#0b1120] border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {exp.experimentCode}
                      </span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Reproducible
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{exp.objective}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {exp.methodDescription}
                    </p>

                    {/* Metrics JSON display */}
                    {exp.metricsJson && (
                      <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-xs text-emerald-300">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Evaluated Metrics:
                        </div>
                        <pre className="overflow-x-auto">{exp.metricsJson}</pre>
                      </div>
                    )}

                    {exp.resultSummary && (
                      <div className="text-xs text-slate-300 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                        <strong className="text-violet-300">Result: </strong>
                        {exp.resultSummary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Live arXiv & OpenAlex Discovery */}
          {activeTab === "discovery" && (
            <div className="space-y-4">
              <form onSubmit={handleSearchDiscovery} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search arXiv and OpenAlex for papers..."
                    className="w-full bg-[#0b1120] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 disabled:opacity-50"
                >
                  {searching ? "Searching APIs..." : "Live Search"}
                </button>
              </form>

              {searching ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Querying arXiv and OpenAlex endpoints...
                </div>
              ) : (
                <div className="space-y-3">
                  {discoveryPapers.map((paper, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-violet-400 font-semibold">
                            {paper.source} • {paper.publicationYear}
                          </span>
                          <h3 className="text-sm font-bold text-white">{paper.title}</h3>
                          <p className="text-xs text-slate-400">
                            {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSaveToProject(paper)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white text-xs font-medium border border-violet-500/30 transition-all shrink-0"
                        >
                          {saveSuccessId === paper.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saved!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Save to Lab
                            </>
                          )}
                        </button>
                      </div>

                      {paper.abstract && (
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                          {paper.abstract}
                        </p>
                      )}

                      {paper.openAccessUrl && (
                        <a
                          href={paper.openAccessUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline pt-1"
                        >
                          View Open Access PDF <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
