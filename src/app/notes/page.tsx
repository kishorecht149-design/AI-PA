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
} from "lucide-react";

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

  const handleCreateNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Note",
          contentMarkdown: "# Title\n\nWrite your concepts or lecture formulas here...",
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
              ? { ...n, title: editTitle, contentMarkdown: editContent }
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
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeNote?.id === id) {
      if (remaining.length > 0) selectNote(remaining[0]);
      else setActiveNote(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            Knowledge Base &amp; Notes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AppFlowy-inspired Markdown repository with bidirectional course &amp; project links.
          </p>
        </div>

        <button
          onClick={handleCreateNote}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* Main 2-Column AppFlowy Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[720px]">
        {/* Left Column: Notes List & Search */}
        <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 flex flex-col space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchNotes(e.target.value);
              }}
              placeholder="Search notes..."
              className="w-full bg-[#070b14] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {notes.map((n) => (
              <div
                key={n.id}
                onClick={() => selectNote(n)}
                className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                  activeNote?.id === n.id
                    ? "bg-cyan-500/10 border-cyan-500/30 text-white font-medium"
                    : "bg-white/[0.02] border-transparent hover:bg-white/[0.05] text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{n.title}</span>
                  {n.isPinned && (
                    <Pin className="w-3 h-3 text-cyan-400 shrink-0 fill-cyan-400" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                  {n.course && (
                    <span className="text-emerald-400">{n.course.code}</span>
                  )}
                  <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Markdown Editor / Live Preview (2 Cols) */}
        <div className="md:col-span-2 bg-[#0b1120] rounded-2xl border border-white/5 p-5 flex flex-col space-y-4">
          {activeNote ? (
            <>
              {/* Note Action Toolbar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-transparent text-lg font-bold text-white outline-none flex-1"
                  placeholder="Note Title"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreview(!isPreview)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    title={isPreview ? "Edit mode" : "Preview mode"}
                  >
                    {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isPreview ? "Edit" : "Preview"}</span>
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-cyan-400"
                    title="Export as Markdown (.md)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleTogglePin(activeNote)}
                    className={`p-1.5 rounded-lg hover:bg-white/5 ${
                      activeNote.isPinned ? "text-cyan-400 fill-cyan-400" : "text-slate-400"
                    }`}
                    title="Pin Note"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSaveActiveNote}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-red-400"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor / Preview Content */}
              <div className="flex-1 overflow-y-auto">
                {isPreview ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {editContent}
                  </div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full bg-transparent resize-none font-mono text-xs text-slate-200 outline-none leading-relaxed"
                    placeholder="Start typing in Markdown..."
                  />
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              Select or create a note to begin writing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
