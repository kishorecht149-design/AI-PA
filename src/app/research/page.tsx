"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Microscope,
  Search,
  BookOpen,
  FlaskConical,
  ExternalLink,
  Plus,
  CheckCircle2,
  Sparkles,
  FileText,
  Trash2,
  X,
  ChevronDown,
  Layers,
  Award,
  Check,
  Copy,
  Quote,
  Network,
  Share2,
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"papers" | "experiments" | "discovery">("papers");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Project Form
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectVenue, setNewProjectVenue] = useState("");
  const [newProjectHypothesis, setNewProjectHypothesis] = useState("");
  const [newProjectAbstract, setNewProjectAbstract] = useState("");

  // Paper Form
  const [newPaperTitle, setNewPaperTitle] = useState("");
  const [newPaperAuthors, setNewPaperAuthors] = useState("");
  const [newPaperYear, setNewPaperYear] = useState(new Date().getFullYear().toString());
  const [newPaperDoi, setNewPaperDoi] = useState("");
  const [newPaperArxivId, setNewPaperArxivId] = useState("");
  const [newPaperPdfUrl, setNewPaperPdfUrl] = useState("");
  const [newPaperStatus, setNewPaperStatus] = useState("TO_READ");
  const [newPaperTakeaway, setNewPaperTakeaway] = useState("");

  // Experiment Form
  const [newExpCode, setNewExpCode] = useState("");
  const [newExpObjective, setNewExpObjective] = useState("");
  const [newExpMethod, setNewExpMethod] = useState("");
  const [newExpMetrics, setNewExpMetrics] = useState("");
  const [newExpResult, setNewExpResult] = useState("");
  const [newExpReproducible, setNewExpReproducible] = useState(true);

  // Live Discovery Search State
  const [searchQuery, setSearchQuery] = useState("Edge LLM Quantization");
  const [discoveryPapers, setDiscoveryPapers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Citation & Ingestion States
  const [citationModalPaper, setCitationModalPaper] = useState<any | null>(null);
  const [citationFormat, setCitationFormat] = useState<"bibtex" | "ieee" | "apa">("bibtex");
  const [citationCopied, setCitationCopied] = useState(false);
  const [ingestingNoteId, setIngestingNoteId] = useState<string | null>(null);
  const [noteIngestSuccess, setNoteIngestSuccess] = useState<{ id: string; noteId: string } | null>(null);

  const generateCitation = (paper: any, format: "bibtex" | "ieee" | "apa") => {
    const authorsStr = Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors || "Unknown Authors";
    const firstAuthorLast = authorsStr.split(",")[0]?.split(" ").pop() || "Author";
    const year = paper.year || paper.publicationYear || new Date().getFullYear();
    const title = paper.title || "Untitled Paper";
    const citeKey = `${firstAuthorLast.toLowerCase()}${year}`;

    if (format === "bibtex") {
      return `@article{${citeKey},
  title = {${title}},
  author = {${authorsStr}},
  year = {${year}},
  journal = {${paper.retrievedSource || paper.source || "arXiv preprint"}}${paper.doi ? `,\n  doi = {${paper.doi}}` : ""}${paper.arxivId ? `,\n  eprint = {${paper.arxivId}}` : ""}
}`;
    }

    if (format === "ieee") {
      return `[1] ${authorsStr}, "${title}," ${year}.${paper.doi ? ` doi: ${paper.doi}.` : paper.arxivId ? ` arXiv:${paper.arxivId}.` : ""}`;
    }

    return `${authorsStr} (${year}). ${title}. ${paper.retrievedSource || paper.source || "Scholarly Archive"}.${paper.doi ? ` https://doi.org/${paper.doi}` : ""}`;
  };

  const copyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2000);
  };

  const handleIngestToNotes = async (paper: any) => {
    setIngestingNoteId(paper.id);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INGEST_NOTE",
          researchProjectId: activeProject?.id,
          title: paper.title,
          authors: Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors,
          year: paper.year || paper.publicationYear,
          doi: paper.doi,
          arxivId: paper.arxivId,
          abstract: paper.abstract,
          pdfUrl: paper.pdfUrl || paper.openAccessUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.note) {
        setNoteIngestSuccess({ id: paper.id, noteId: data.note.id });
        setTimeout(() => setNoteIngestSuccess(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIngestingNoteId(null);
    }
  };

  const fetchResearch = async () => {
    try {
      const res = await fetch("/api/research");
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  // Sync selected project
  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.some((p) => p.id === selectedProjectId);
      if (!exists) {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId]);

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // 1. Create Research Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PROJECT",
          projectTitle: newProjectTitle.trim(),
          targetVenue: newProjectVenue.trim() || null,
          hypotheses: newProjectHypothesis.trim() || null,
          abstract: newProjectAbstract.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setSelectedProjectId(data.project.id);
        setShowProjectModal(false);
        setNewProjectTitle("");
        setNewProjectVenue("");
        setNewProjectHypothesis("");
        setNewProjectAbstract("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Starter Workspace Initializer
  const handleInitializeStarter = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PROJECT",
          projectTitle: "Intelligent Systems & Neural Architectures",
          targetVenue: "IEEE / ACM Conference",
          hypotheses:
            "Quantized neural weights combined with parameter-efficient fine-tuning retain 98%+ task accuracy while reducing latency by 2.4x.",
          abstract:
            "Systematic literature review, empirical inference profiling, and hardware acceleration benchmarks.",
        }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setSelectedProjectId(data.project.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Add Paper Manually
  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaperTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchProjectId: activeProject?.id,
          title: newPaperTitle.trim(),
          authors: newPaperAuthors.trim() || null,
          year: newPaperYear ? parseInt(newPaperYear, 10) : null,
          doi: newPaperDoi.trim() || null,
          arxivId: newPaperArxivId.trim() || null,
          pdfUrl: newPaperPdfUrl.trim() || null,
          readingStatus: newPaperStatus,
          userKeyTakeaways: newPaperTakeaway.trim() || null,
          source: "Manual Entry",
        }),
      });

      if (res.ok) {
        setShowPaperModal(false);
        setNewPaperTitle("");
        setNewPaperAuthors("");
        setNewPaperDoi("");
        setNewPaperArxivId("");
        setNewPaperPdfUrl("");
        setNewPaperTakeaway("");
        fetchResearch();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Create Experiment
  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpObjective.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_EXPERIMENT",
          researchProjectId: activeProject?.id,
          experimentCode: newExpCode.trim() || undefined,
          objective: newExpObjective.trim(),
          methodDescription: newExpMethod.trim() || "Empirical benchmarking run",
          metricsJson: newExpMetrics.trim() || null,
          resultSummary: newExpResult.trim() || null,
          isReproducible: newExpReproducible,
        }),
      });

      if (res.ok) {
        setShowExpModal(false);
        setNewExpCode("");
        setNewExpObjective("");
        setNewExpMethod("");
        setNewExpMetrics("");
        setNewExpResult("");
        fetchResearch();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Deletion Handlers
  const handleDeletePaper = async (paperId: string) => {
    if (!confirm("Are you sure you want to remove this paper?")) return;
    await fetch(`/api/research?paperId=${paperId}`, { method: "DELETE" });
    fetchResearch();
  };

  const handleDeleteExperiment = async (expId: string) => {
    if (!confirm("Are you sure you want to remove this experiment?")) return;
    await fetch(`/api/research?experimentId=${expId}`, { method: "DELETE" });
    fetchResearch();
  };

  const handleDeleteProject = async (projId: string) => {
    if (!confirm("Are you sure you want to delete this research project and all associated records?")) return;
    await fetch(`/api/research?projectId=${projId}`, { method: "DELETE" });
    fetchResearch();
  };

  const handleUpdateStatus = async (paperId: string, readingStatus: string) => {
    await fetch("/api/research", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId, readingStatus }),
    });
    fetchResearch();
  };

  // Search Live arXiv / OpenAlex
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

  // Save Discovered Paper to Project (Auto-creates project if none exist!)
  const handleSaveToProject = async (paper: any) => {
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchProjectId: activeProject?.id,
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
        setTimeout(() => setSaveSuccessId(null), 2500);
        await fetchResearch();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Microscope className="w-6 h-6 text-white" />
            Research Lab
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Systematic investigation, literature repository with live arXiv &amp; OpenAlex discovery, and reproducible experimental runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-medium"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("papers")}
          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === "papers"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Paper Library ({activeProject?.papers?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("experiments")}
          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === "experiments"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Experiments ({activeProject?.experiments?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab("discovery");
            if (discoveryPapers.length === 0) {
              setSearching(true);
              fetch(`/api/research/search?q=${encodeURIComponent(searchQuery)}`)
                .then((r) => r.json())
                .then((d) => setDiscoveryPapers(d.papers || []))
                .finally(() => setSearching(false));
            }
          }}
          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === "discovery"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Live arXiv &amp; OpenAlex Search
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Loading research workspace...</div>
      ) : !activeProject ? (
        /* Empty State with Immediate Action Workflows */
        <div className="p-8 md:p-12 rounded-3xl border border-zinc-800 bg-[#0a0a0a] text-center space-y-5 shadow-2xl max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
            <Microscope className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">Start Your Research Workspace</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Organize literature reviews, ingest arXiv and OpenAlex papers, and log reproducible benchmark experiments with verified parameters.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowProjectModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Research Project
            </button>
            <button
              onClick={handleInitializeStarter}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-medium text-xs transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-zinc-400" />
              {submitting ? "Initializing..." : "1-Click Initialize Workspace"}
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-900">
            <button
              onClick={() => {
                setActiveTab("discovery");
                if (discoveryPapers.length === 0) {
                  setSearching(true);
                  fetch(`/api/research/search?q=${encodeURIComponent(searchQuery)}`)
                    .then((r) => r.json())
                    .then((d) => setDiscoveryPapers(d.papers || []))
                    .finally(() => setSearching(false));
                }
              }}
              className="text-xs text-zinc-400 hover:text-white underline inline-flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" /> Or browse and save papers from live arXiv search
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Project Banner */}
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-zinc-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 text-[10px] font-mono uppercase tracking-wider border border-zinc-800 font-semibold">
                  {activeProject.status} Project
                </span>
                {activeProject.targetVenue && (
                  <span className="text-xs text-zinc-400">
                    Venue: <strong className="text-zinc-200">{activeProject.targetVenue}</strong>
                  </span>
                )}
              </div>

              <button
                onClick={() => handleDeleteProject(activeProject.id)}
                className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-white">
              {activeProject.title}
            </h2>

            {activeProject.hypotheses && (
              <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 text-xs text-zinc-300">
                <span className="text-zinc-400 font-semibold block mb-0.5 uppercase text-[10px] tracking-wider font-mono">
                  Core Hypothesis:
                </span>
                {activeProject.hypotheses}
              </div>
            )}
          </div>

          {/* TAB 1: Paper Library */}
          {activeTab === "papers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">
                  {activeProject.papers.length} Papers in Project
                </span>
                <button
                  onClick={() => setShowPaperModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Paper
                </button>
              </div>

              {activeProject.papers.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-500 space-y-3">
                  <p>No papers saved to this project yet.</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowPaperModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs"
                    >
                      + Add Manually
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("discovery");
                        if (discoveryPapers.length === 0) {
                          setSearching(true);
                          fetch(`/api/research/search?q=${encodeURIComponent(searchQuery)}`)
                            .then((r) => r.json())
                            .then((d) => setDiscoveryPapers(d.papers || []))
                            .finally(() => setSearching(false));
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
                    >
                      Search arXiv
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeProject.papers.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold">
                            {p.retrievedSource || "Paper"} • {p.year || "Recent"}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1">{p.title}</h3>
                          {p.authors && (
                            <p className="text-xs text-zinc-400 font-light">Authors: {p.authors}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={p.readingStatus}
                            onChange={(e) => handleUpdateStatus(p.id, e.target.value)}
                            className="text-[10px] uppercase font-mono px-2 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 focus:outline-none"
                          >
                            <option value="TO_READ">To Read</option>
                            <option value="IN_PROGRESS">Reading</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="REFERENCED">Referenced</option>
                          </select>
                          <button
                            onClick={() => handleDeletePaper(p.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                            title="Remove Paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {p.userKeyTakeaways && (
                        <div className="p-3 rounded-xl bg-black border border-zinc-800/80 text-xs text-zinc-300">
                          <strong className="text-white">Student Note: </strong>
                          {p.userKeyTakeaways}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2.5 border-t border-zinc-900">
                        <div className="flex items-center gap-3">
                          {p.doi && (
                            <a
                              href={`https://doi.org/${p.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                            >
                              DOI Reference <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {p.arxivId && (
                            <a
                              href={`https://arxiv.org/abs/${p.arxivId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                            >
                              arXiv:{p.arxivId} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {p.pdfUrl && (
                            <a
                              href={p.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                            >
                              Read Full PDF <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Research Action Pipeline */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCitationModalPaper(p)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-800 transition-colors"
                            title="Format and copy bibliographic citation"
                          >
                            <Quote className="w-3 h-3 text-amber-400" />
                            <span>Cite</span>
                          </button>

                          <button
                            onClick={() => handleIngestToNotes(p)}
                            disabled={ingestingNoteId === p.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-800 transition-colors disabled:opacity-50"
                            title="Auto-generate structured literature review in Notes"
                          >
                            {noteIngestSuccess?.id === p.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">In Notes!</span>
                              </>
                            ) : ingestingNoteId === p.id ? (
                              <>
                                <Sparkles className="w-3 h-3 animate-spin text-purple-400" />
                                <span>Ingesting...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3 text-purple-400" />
                                <span>Ingest to Notes</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => router.push("/graph")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-800 transition-colors"
                            title="View paper in 3D Knowledge Graph"
                          >
                            <Network className="w-3 h-3 text-sky-400" />
                            <span>Graph</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Experiments */}
          {activeTab === "experiments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">
                  {activeProject.experiments.length} Experiments Recorded
                </span>
                <button
                  onClick={() => setShowExpModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Experiment
                </button>
              </div>

              {activeProject.experiments.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-500 space-y-3">
                  <p>No experiments or empirical benchmark runs recorded yet.</p>
                  <button
                    onClick={() => setShowExpModal(true)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all"
                  >
                    + Log First Benchmark
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeProject.experiments.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-5 rounded-2xl bg-[#0a0a0a] border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {exp.experimentCode}
                          </span>
                          {exp.isReproducible && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-white" /> Reproducible
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteExperiment(exp.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          title="Remove Experiment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-white">{exp.objective}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        {exp.methodDescription}
                      </p>

                      {exp.metricsJson && (
                        <div className="p-3 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-zinc-300">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                            Evaluated Metrics:
                          </div>
                          <pre className="overflow-x-auto text-[11px]">{exp.metricsJson}</pre>
                        </div>
                      )}

                      {exp.resultSummary && (
                        <div className="text-xs text-zinc-300 bg-black p-3 rounded-xl border border-zinc-800">
                          <strong className="text-white">Benchmark Finding: </strong>
                          {exp.resultSummary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Live arXiv & OpenAlex Discovery */}
          {activeTab === "discovery" && (
            <div className="space-y-4">
              <form onSubmit={handleSearchDiscovery} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search arXiv and OpenAlex for papers..."
                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs disabled:opacity-50 transition-all"
                >
                  {searching ? "Searching APIs..." : "Live Search"}
                </button>
              </form>

              {searching ? (
                <div className="py-16 text-center text-xs text-zinc-500">
                  Querying real-time arXiv and OpenAlex endpoints...
                </div>
              ) : (
                <div className="space-y-3">
                  {discoveryPapers.map((paper, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold">
                            {paper.source} • {paper.publicationYear}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1">{paper.title}</h3>
                          <p className="text-xs text-zinc-400 font-light">
                            {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSaveToProject(paper)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shrink-0 shadow-sm"
                        >
                          {saveSuccessId === paper.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Saved!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Save to Lab
                            </>
                          )}
                        </button>
                      </div>

                      {paper.abstract && (
                        <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed font-light">
                          {paper.abstract}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-zinc-900">
                        {paper.openAccessUrl ? (
                          <a
                            href={paper.openAccessUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-medium"
                          >
                            View Open Access PDF <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-mono">arXiv / OpenAlex Indexed</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCitationModalPaper(paper)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-800 transition-colors"
                            title="Format and copy bibliographic citation"
                          >
                            <Quote className="w-3 h-3 text-amber-400" />
                            <span>Cite</span>
                          </button>

                          <button
                            onClick={() => handleIngestToNotes(paper)}
                            disabled={ingestingNoteId === paper.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-800 transition-colors disabled:opacity-50"
                            title="Auto-generate structured literature review in Notes"
                          >
                            {noteIngestSuccess?.id === paper.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">In Notes!</span>
                              </>
                            ) : ingestingNoteId === paper.id ? (
                              <>
                                <Sparkles className="w-3 h-3 animate-spin text-purple-400" />
                                <span>Ingesting...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3 text-purple-400" />
                                <span>Ingest to Notes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1-CLICK CITATION MODAL */}
      {citationModalPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-7 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Quote className="w-4 h-4 text-amber-400" />
                  Citation Generator
                </div>
                <p className="text-xs text-zinc-400 line-clamp-1">{citationModalPaper.title}</p>
              </div>
              <button
                onClick={() => setCitationModalPaper(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Citation Formats */}
            <div className="flex items-center gap-2">
              {(["bibtex", "ieee", "apa"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setCitationFormat(fmt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase font-mono transition-all ${
                    citationFormat === fmt
                      ? "bg-white text-black shadow-md"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Formatted Code Block */}
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-black border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56">
                {generateCitation(citationModalPaper, citationFormat)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleIngestToNotes(citationModalPaper)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ingest into Notes workspace</span>
              </button>

              <button
                onClick={() => copyCitation(generateCitation(citationModalPaper, citationFormat))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-md shadow-amber-500/20 transition-all"
              >
                {citationCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Microscope className="w-5 h-5 text-white" /> Create Research Project
              </h2>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Distributed Model Serving Optimization"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Venue / Conference (Optional)
                </label>
                <input
                  type="text"
                  value={newProjectVenue}
                  onChange={(e) => setNewProjectVenue(e.target.value)}
                  placeholder="e.g. NeurIPS 2026, IEEE Transactions, Springer"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Core Scientific Hypothesis
                </label>
                <textarea
                  value={newProjectHypothesis}
                  onChange={(e) => setNewProjectHypothesis(e.target.value)}
                  rows={2}
                  placeholder="e.g. Structured activation pruning matches baseline accuracy with 2x cache saving."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Abstract / Scope
                </label>
                <textarea
                  value={newProjectAbstract}
                  onChange={(e) => setNewProjectAbstract(e.target.value)}
                  rows={3}
                  placeholder="Brief summary of research methodology and objectives..."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newProjectTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PAPER MODAL */}
      {showPaperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" /> Add Research Paper
              </h2>
              <button
                onClick={() => setShowPaperModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePaper} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={newPaperTitle}
                  onChange={(e) => setNewPaperTitle(e.target.value)}
                  placeholder="e.g. Attention Is All You Need"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Authors
                </label>
                <input
                  type="text"
                  value={newPaperAuthors}
                  onChange={(e) => setNewPaperAuthors(e.target.value)}
                  placeholder="e.g. Vaswani et al."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    value={newPaperYear}
                    onChange={(e) => setNewPaperYear(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Reading Status
                  </label>
                  <select
                    value={newPaperStatus}
                    onChange={(e) => setNewPaperStatus(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="TO_READ">To Read</option>
                    <option value="IN_PROGRESS">Reading</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REFERENCED">Referenced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    arXiv ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPaperArxivId}
                    onChange={(e) => setNewPaperArxivId(e.target.value)}
                    placeholder="1706.03762"
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    DOI (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPaperDoi}
                    onChange={(e) => setNewPaperDoi(e.target.value)}
                    placeholder="10.1145/..."
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  PDF / Open Access URL
                </label>
                <input
                  type="url"
                  value={newPaperPdfUrl}
                  onChange={(e) => setNewPaperPdfUrl(e.target.value)}
                  placeholder="https://arxiv.org/pdf/1706.03762.pdf"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Key Takeaway / Notes
                </label>
                <textarea
                  value={newPaperTakeaway}
                  onChange={(e) => setNewPaperTakeaway(e.target.value)}
                  rows={2}
                  placeholder="Core innovation, architectural takeaways, or empirical results..."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPaperModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newPaperTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Paper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPERIMENT MODAL */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-white" /> Log Benchmark Experiment
              </h2>
              <button
                onClick={() => setShowExpModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExperiment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Experiment Code
                </label>
                <input
                  type="text"
                  value={newExpCode}
                  onChange={(e) => setNewExpCode(e.target.value)}
                  placeholder="e.g. EXP-001"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Objective *
                </label>
                <input
                  type="text"
                  required
                  value={newExpObjective}
                  onChange={(e) => setNewExpObjective(e.target.value)}
                  placeholder="e.g. Evaluate INT4 AWQ inference throughput vs FP16 baseline"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Method Description
                </label>
                <textarea
                  value={newExpMethod}
                  onChange={(e) => setNewExpMethod(e.target.value)}
                  rows={2}
                  placeholder="e.g. Tested on Apple Silicon GPU with batch size 1 and 4096 context tokens."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Metrics (JSON or text)
                </label>
                <textarea
                  value={newExpMetrics}
                  onChange={(e) => setNewExpMetrics(e.target.value)}
                  rows={2}
                  placeholder='{"latency_ms": 14.2, "tokens_per_sec": 70.4, "memory_gb": 3.8}'
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Result Finding
                </label>
                <textarea
                  value={newExpResult}
                  onChange={(e) => setNewExpResult(e.target.value)}
                  rows={2}
                  placeholder="e.g. INT4 achieved 2.8x speedup with <0.4% perplexity difference."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reproducibleCheck"
                  checked={newExpReproducible}
                  onChange={(e) => setNewExpReproducible(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-white focus:ring-0"
                />
                <label htmlFor="reproducibleCheck" className="text-xs text-zinc-300 select-none cursor-pointer">
                  Benchmark is deterministically reproducible
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newExpObjective.trim()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? "Logging..." : "Save Benchmark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
