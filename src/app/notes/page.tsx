"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Plus,
  Pin,
  Trash2,
  Folder,
  GraduationCap,
  Download,
  Eye,
  Edit3,
  CheckCircle2,
  Save,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { MarkdownLatexRenderer } from "@/components/MarkdownLatexRenderer";

interface NoteItem {
  id: string;
  title: string;
  contentMarkdown: string;
  tags: string | null;
  isPinned: boolean;
  updatedAt: string;
  collection?: { id: string; name: string } | null;
  course?: { code: string; name: string } | null;
}

const STARTER_NOTE_TEMPLATES = [
  {
    title: "System Architecture & Interface Spec",
    content: `# System Architecture & Interface Specification\n\n## 1. System Overview\nHigh-throughput, asynchronous service coordinating real-time tasks.\n\n## 2. API Schema & Contracts\n- \`POST /api/orchestration\`: Ingest and route payload\n- \`GET /api/status\`: Health check and telemetry\n\n## 3. Performance & Bounds\n- Target latency: < 50ms p95\n- Fault tolerance: Automated retry with exponential backoff`,
  },
  {
    title: "Empirical Literature Synthesis",
    content: `# Empirical Literature Synthesis\n\n## Paper Reference\n- **Title**: Attention Is All You Need\n- **Venue**: NeurIPS\n- **Key Innovation**: Multi-head self-attention replacing recurrent sequence networks.\n\n## Core Mathematical Formulation\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\n## Critical Takeaway\nEliminates sequential bottlenecks while enabling massive parallel training.`,
  },
  {
    title: "Active Recall Formulas & Derivations",
    content: `# Active Recall Formulas & Derivations\n\n## Memory Hierarchy Paging\n$$\\text{Effective Access Time (EAT)} = h \\cdot (t_{\\text{TLB}} + t_{\\text{RAM}}) + (1 - h) \\cdot (t_{\\text{TLB}} + 2 \\cdot t_{\\text{RAM}})$$\n\n*Where $h$ is the TLB hit ratio.*\n\n## Key Exam Pitfalls\n- Watch for multi-level page tables where each missing level incurs an extra memory access.\n- Ensure time units (nanoseconds vs microseconds) are strictly unified before computing.`,
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active note editing fields
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const fetchNotes = async (q?: string) => {
    try {
      const url = q ? `/api/notes?q=${encodeURIComponent(q)}` : "/api/notes";
      const res = await fetch(url);
      const data = await res.json();
      if (data.notes) {
        setNotes(data.notes);
        if (!activeNote && data.notes.length > 0) {
          selectNote(data.notes[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selectNote = (n: NoteItem) => {
    setActiveNote(n);
    setEditTitle(n.title);
    setEditContent(n.contentMarkdown);
  };

  const handleCreateNote = async (initialTitle = "New Note", initialContent = "# New Note\n\nWrite your concepts, equations, or synthesis here...") => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: initialTitle,
          contentMarkdown: initialContent,
        }),
      });
      const data = await res.json();
      if (data.note) {
        setNotes((prev) => [data.note, ...prev]);
        selectNote(data.note);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveActiveNote = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeNote.id,
          title: editTitle,
          contentMarkdown: editContent,
        }),
      });
      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeNote.id
              ? { ...n, title: editTitle, contentMarkdown: editContent, updatedAt: new Date().toISOString() }
              : n
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (remaining.length > 0) {
      selectNote(remaining[0]);
    } else {
      setActiveNote(null);
      setEditTitle("");
      setEditContent("");
    }
  };

  const handleTogglePin = async (n: NoteItem) => {
    const nextPinned = !n.isPinned;
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, isPinned: nextPinned }),
    });
    fetchNotes();
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([editContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editTitle.replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-white" />
            Knowledge Base &amp; Notes
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Markdown repository with live LaTeX mathematics and bidirectional project links.
          </p>
        </div>

        <button
          onClick={() => handleCreateNote()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[720px]">
        {/* Left Column: Notes List & Search */}
        <div className="bg-[#0a0a0a] rounded-3xl border border-zinc-800 p-4 flex flex-col space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchNotes(e.target.value);
              }}
              placeholder="Search notes..."
              className="w-full bg-[#121212] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {notes.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <p>No notes found.</p>
                <button
                  onClick={() => handleCreateNote()}
                  className="text-white hover:underline font-medium"
                >
                  + Create your first note
                </button>
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => selectNote(n)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left space-y-1 ${
                    activeNote?.id === n.id
                      ? "bg-zinc-900 border-zinc-700 text-white font-medium"
                      : "bg-black border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{n.title}</span>
                    {n.isPinned && (
                      <Pin className="w-3 h-3 text-white shrink-0 fill-white" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                    {n.course && (
                      <span className="text-zinc-300">{n.course.code}</span>
                    )}
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Markdown Editor / Live Preview */}
        <div className="md:col-span-2 bg-[#0a0a0a] rounded-3xl border border-zinc-800 p-6 flex flex-col space-y-4">
          {activeNote ? (
            <>
              {/* Note Action Toolbar */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-transparent text-lg font-bold text-white outline-none flex-1 placeholder-zinc-600"
                  placeholder="Note Title"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreview(!isPreview)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
                    title={isPreview ? "Edit mode" : "Preview mode"}
                  >
                    {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isPreview ? "Edit" : "Preview"}</span>
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Export as Markdown (.md)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleTogglePin(activeNote)}
                    className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors ${
                      activeNote.isPinned ? "text-white fill-white" : "text-zinc-400"
                    }`}
                    title="Pin Note"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSaveActiveNote}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor / Preview Content */}
              <div className="flex-1 overflow-y-auto">
                {isPreview ? (
                  <div className="prose prose-invert prose-sm max-w-none text-zinc-200 font-sans leading-relaxed p-2">
                    <MarkdownLatexRenderer content={editContent} />
                  </div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full bg-transparent resize-none font-mono text-xs text-zinc-200 outline-none leading-relaxed placeholder-zinc-600"
                    placeholder="Start typing in Markdown (LaTeX equations $...$ supported)..."
                  />
                )}
              </div>
            </>
          ) : (
            /* Empty State with 1-Click Starter Note Templates */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <FileText className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Create or Select a Note</h3>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  Capture architectural specifications, derivations, and research insights with full Markdown and KaTeX math support.
                </p>
              </div>

              <button
                onClick={() => handleCreateNote()}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Blank Note
              </button>

              <div className="pt-4 border-t border-zinc-900 w-full max-w-md space-y-2.5">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block font-mono">
                  Or Load Starter Template:
                </span>
                <div className="space-y-2">
                  {STARTER_NOTE_TEMPLATES.map((tmpl, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleCreateNote(tmpl.title, tmpl.content)}
                      className="p-3 rounded-xl bg-black border border-zinc-800 hover:border-zinc-700 cursor-pointer flex items-center justify-between text-left group transition-all"
                    >
                      <span className="text-xs font-medium text-zinc-300 group-hover:text-white">
                        {tmpl.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
