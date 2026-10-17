"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  CheckSquare,
  FileText,
  Bell,
  Sparkles,
  ArrowRight,
  X,
  Link2,
} from "lucide-react";

interface UniversalQuickCaptureProps {
  onSuccess: () => void;
  onOpenCommandBar?: () => void;
  onOpenAddResourceModal?: () => void;
}

export function UniversalQuickCapture({
  onSuccess,
  onOpenCommandBar,
  onOpenAddResourceModal,
}: UniversalQuickCaptureProps) {
  const [inputVal, setInputVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedModal, setExpandedModal] = useState<"task" | "note" | null>(null);

  // Form states for expanded modal
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [modalPriority, setModalPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Deterministic intent heuristic for quick input
  const parseIntent = (raw: string) => {
    const text = raw.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    // Check for note
    if (lower.startsWith("note:") || lower.startsWith("idea:") || lower.startsWith("memo:")) {
      const cleanTitle = text.replace(/^(note|idea|memo):\s*/i, "").trim();
      return {
        type: "note" as const,
        title: cleanTitle || "Quick Note",
        preview: "Knowledge Note",
      };
    }

    // Task parsing
    let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
    let priorityLabel = "Medium Priority";
    if (lower.includes("p1") || lower.includes("urgent")) {
      priority = "URGENT";
      priorityLabel = "Urgent";
    } else if (lower.includes("p2") || lower.includes("high")) {
      priority = "HIGH";
      priorityLabel = "High Priority";
    } else if (lower.includes("p3") || lower.includes("low")) {
      priority = "LOW";
      priorityLabel = "Low Priority";
    }

    let dueDateStr: string | null = null;
    let dueLabel = "";
    const now = new Date();
    if (lower.includes("tomorrow")) {
      const tomorrow = new Date(now.getTime() + 86400000);
      dueDateStr = tomorrow.toISOString();
      dueLabel = "Due Tomorrow";
    } else if (lower.includes("today") || lower.includes("tonight")) {
      dueDateStr = now.toISOString();
      dueLabel = "Due Today";
    }

    // Clean title
    let cleanTaskTitle = text
      .replace(/\b(p1|p2|p3|urgent|high|low)\b/gi, "")
      .replace(/\b(tomorrow|today|tonight)\b/gi, "")
      .trim();

    if (!cleanTaskTitle) cleanTaskTitle = text;

    return {
      type: "task" as const,
      title: cleanTaskTitle,
      priority,
      priorityLabel,
      dueDate: dueDateStr,
      dueLabel,
      preview: `Task · ${priorityLabel}${dueLabel ? ` · ${dueLabel}` : ""}`,
    };
  };

  const parsed = parseIntent(inputVal);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSubmitting) return;

    const intent = parseIntent(inputVal);
    if (!intent) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (intent.type === "note") {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: intent.title,
            contentMarkdown: `Captured from Dashboard Universal Quick Capture:\n\n${inputVal}`,
          }),
        });
        if (!res.ok) throw new Error("Failed to save note");
        setSuccessMsg(`Note "${intent.title}" created successfully.`);
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: intent.title,
            priority: intent.priority,
            dueDate: intent.dueDate,
          }),
        });
        if (!res.ok) throw new Error("Failed to create task");
        setSuccessMsg(`Task "${intent.title}" added to your queue.`);
      }

      setInputVal("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("amahas:data-update"));
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Capture failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const handleExpandedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (expandedModal === "note") {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: modalTitle.trim(),
            contentMarkdown: modalContent.trim(),
          }),
        });
        if (!res.ok) throw new Error("Failed to create note");
        setSuccessMsg(`Note "${modalTitle}" created.`);
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: modalTitle.trim(),
            description: modalContent.trim() || null,
            priority: modalPriority,
          }),
        });
        if (!res.ok) throw new Error("Failed to create task");
        setSuccessMsg(`Task "${modalTitle}" created.`);
      }

      setExpandedModal(null);
      setModalTitle("");
      setModalContent("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("amahas:data-update"));
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save record");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-2">
      {/* Universal Single-Line Capture Bar */}
      <form onSubmit={handleQuickSubmit} className="relative">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] focus-within:border-[var(--accent-primary)] shadow-sm transition-all">
          <div className="pl-2.5 text-[var(--accent-primary)]">
            <Sparkles className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type a task ('DSP Lab p1 tomorrow'), note ('note: Cache thesis'), or idea..."
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none min-w-0"
          />

          {/* Real-time Parsed Intent Preview Chip */}
          {parsed && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border)] shrink-0">
              {parsed.preview}
            </span>
          )}

          {/* Quick Capture Submit Button */}
          {inputVal.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 shrink-0 transition-opacity"
            >
              <span>{isSubmitting ? "Saving..." : "Save"}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Global Command Bar shortcut */}
          {onOpenCommandBar && (
            <button
              type="button"
              onClick={onOpenCommandBar}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="Global search (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>⌘K</span>
            </button>
          )}

          {/* Dedicated + Add Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="hidden sm:inline">Add</span>
            </button>

            {/* Dropdown Add Menu */}
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] p-1.5 shadow-xl z-30 animate-in fade-in space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    setExpandedModal("task");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] text-left transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>New Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    setExpandedModal("note");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                  <span>New Note</span>
                </button>

                {onOpenAddResourceModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddResourceModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] text-left transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Resource Link</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Notifications / Feedback */}
      {successMsg && (
        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 animate-in fade-in">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-in fade-in">
          ✕ {errorMsg}
        </div>
      )}

      {/* Expanded Modal for Detailed Task or Note Capture */}
      {expandedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {expandedModal === "task" ? "Create New Task" : "Create New Note"}
              </h3>
              <button
                onClick={() => setExpandedModal(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExpandedSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={expandedModal === "task" ? "Task title..." : "Note title..."}
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  {expandedModal === "task" ? "Description (Optional)" : "Markdown Content"}
                </label>
                <textarea
                  rows={expandedModal === "task" ? 2 : 4}
                  placeholder={expandedModal === "task" ? "Details, links, or subtasks..." : "Write your thoughts in markdown..."}
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                />
              </div>

              {expandedModal === "task" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setModalPriority(p)}
                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                          modalPriority === p
                            ? "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]"
                            : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-primary)]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpandedModal(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
