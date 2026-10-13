"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getHourlyContent,
  getTimeOfDayGreeting,
  HourlyQuote,
} from "@/lib/hourly-quotes";
import {
  Calendar,
  CheckSquare,
  GraduationCap,
  Microscope,
  BookOpen,
  FileText,
  Flame,
  Target,
  BarChart3,
  Bot,
  Layers,
  Workflow,
  Search,
  ArrowRight,
  Sparkles,
  Folder,
  FolderOpen,
  Plus,
  ExternalLink,
  Video,
  Globe,
  Book,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Link2,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

interface HomeClientProps {
  userName: string;
}

export function HomeClient({ userName }: HomeClientProps) {
  const [content, setContent] = useState<{
    quote: HourlyQuote;
    message: string;
    dateString: string;
  }>(() => getHourlyContent(new Date()));

  const [greeting, setGreeting] = useState(() =>
    getTimeOfDayGreeting(new Date(), userName)
  );

  useEffect(() => {
    const updateContent = () => {
      const now = new Date();
      setContent(getHourlyContent(now));
      setGreeting(getTimeOfDayGreeting(now, userName));
    };

    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds();

    let hourlyInterval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      updateContent();
      hourlyInterval = setInterval(updateContent, 60 * 60 * 1000);
    }, msUntilNextHour);

    return () => {
      clearTimeout(timeout);
      if (hourlyInterval) clearInterval(hourlyInterval);
    };
  }, [userName]);

  const [customSections, setCustomSections] = useState<any[]>([]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [addingLinkFolder, setAddingLinkFolder] = useState<{ sectionId: string; folderTitle: string } | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkNotes, setNewLinkNotes] = useState("");
  const [addingSectionModal, setAddingSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [newSectionFolders, setNewSectionFolders] = useState("");

  const loadSections = async () => {
    try {
      const res = await fetch("/api/dashboard/sections");
      if (res.ok) {
        const data = await res.json();
        setCustomSections(data.sections || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    try {
      const res = await fetch("/api/dashboard/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSectionTitle.trim(),
          description: newSectionDesc.trim(),
          folders: newSectionFolders.split(",").map((f) => f.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setAddingSectionModal(false);
        setNewSectionTitle("");
        setNewSectionDesc("");
        setNewSectionFolders("");
        loadSections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingLinkFolder || !newLinkTitle.trim() || !newLinkUrl.trim()) return;
    try {
      const res = await fetch("/api/dashboard/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_LINK",
          sectionId: addingLinkFolder.sectionId,
          folderTitle: addingLinkFolder.folderTitle,
          linkTitle: newLinkTitle.trim(),
          linkUrl: newLinkUrl.trim(),
          linkNotes: newLinkNotes.trim(),
        }),
      });
      if (res.ok) {
        setAddingLinkFolder(null);
        setNewLinkTitle("");
        setNewLinkUrl("");
        setNewLinkNotes("");
        loadSections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to remove this section from your dashboard?")) return;
    try {
      await fetch(`/api/dashboard/sections?sectionId=${sectionId}`, { method: "DELETE" });
      loadSections();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFolderToSection = async (sectionId: string) => {
    const folderTitle = prompt("Enter new folder name (e.g., 'Cheatsheets' or 'Lecture Notes'):");
    if (!folderTitle || !folderTitle.trim()) return;
    try {
      const res = await fetch("/api/dashboard/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_FOLDER",
          sectionId,
          folderTitle: folderTitle.trim(),
        }),
      });
      if (res.ok) {
        loadSections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getFolderIcon = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes("video") || t.includes("watch") || t.includes("lecture") || t.includes("media")) return Video;
    if (t.includes("book") || t.includes("read") || t.includes("paper")) return Book;
    if (t.includes("online") || t.includes("web") || t.includes("site") || t.includes("material")) return Globe;
    return Folder;
  };

  const workspaces = [
    {
      title: "Planner & Schedule",
      desc: "Time blocks, agenda, and conflict-free daily structure",
      href: "/planner",
      icon: Calendar,
    },
    {
      title: "Tasks & Execution",
      desc: "Capture, prioritize, and run focus sessions",
      href: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Academics & GATE",
      desc: "Syllabi, spaced repetition revisions, and mock errors",
      href: "/academics",
      icon: GraduationCap,
    },
    {
      title: "Research Lab",
      desc: "Paper library, arXiv discovery, and experiment logs",
      href: "/research",
      icon: Microscope,
    },
    {
      title: "Learning Studio",
      desc: "8 Languages, general knowledge, psychology, and books",
      href: "/learning",
      icon: BookOpen,
    },
    {
      title: "Knowledge & Notes",
      desc: "Structured Markdown pages with relational links",
      href: "/notes",
      icon: FileText,
    },
    {
      title: "Habits & Routine",
      desc: "Flexible, guilt-free daily execution and reflection",
      href: "/habits",
      icon: Flame,
    },
    {
      title: "Goals & Milestones",
      desc: "Long-term academic and technical objectives",
      href: "/goals",
      icon: Target,
    },
    {
      title: "Analytics & Reviews",
      desc: "Measured study hours and weekly progress reviews",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Integrations Hub",
      desc: "Connected services (OpenAlex, Vikunja, Ollama, n8n)",
      href: "/integrations",
      icon: Layers,
    },
    {
      title: "Automations",
      desc: "Event triggers and multi-step study workflows",
      href: "/automations",
      icon: Workflow,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-14 px-4 space-y-10 animate-in fade-in duration-300 transition-colors duration-150">
      {/* 1. Branding & Greeting */}
      <section className="flex flex-col items-center text-center space-y-3">
        <AmahasLogo variant="primary" size="lg" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {greeting}
        </h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] font-medium">
          {content.dateString}
        </p>
      </section>

      {/* 2. Motivational Quotation & Hourly Message */}
      <section className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 md:p-8 text-center shadow-lg transition-colors">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)]" />
        <blockquote className="space-y-4">
          <p className="text-base md:text-lg text-[var(--text-primary)] font-serif italic leading-relaxed">
            &ldquo;{content.quote.quote}&rdquo;
          </p>
          <footer className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold">
            — {content.quote.author}
          </footer>
        </blockquote>
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] font-sans">
          <span className="text-[var(--accent-secondary)] font-semibold">Hourly Focus: </span>
          {content.message}
        </div>
      </section>

      {/* 3. Global Search & Assistant Quick Input */}
      <section className="flex flex-col sm:flex-row gap-3 items-center">
        <Link
          href="/tasks"
          className="w-full flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border)] border border-[var(--border)] text-xs text-[var(--text-secondary)] transition-colors shadow-sm"
        >
          <span className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Search syllabus, tasks, notes, or research...</span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-[var(--bg-primary)] text-[10px] text-[var(--text-muted)] border border-[var(--border)]">
            ⌘K
          </kbd>
        </Link>

        <Link
          href="/assistant"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
        >
          <Bot className="w-4 h-4" />
          <span>Ask Assistant</span>
        </Link>
      </section>

      {/* 4. Dynamic Custom Sections & Resource Hub */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              Dynamic Dashboard Sections
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border)]">
              PA Customizable
            </span>
          </div>
          <button
            onClick={() => setAddingSectionModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>New Section</span>
          </button>
        </div>

        {customSections.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-center space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              No custom dashboard sections yet. Ask your PA in chat:
            </p>
            <p className="text-xs font-mono bg-[var(--bg-primary)] inline-block px-3 py-1 rounded-lg border border-[var(--border)] text-[var(--accent-primary)]">
              &quot;Create a section named Resources with folders for video links, books, and online materials&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {customSections.map((sec) => {
              const folders = Array.isArray(sec.items) ? sec.items : [];
              return (
                <div
                  key={sec.id}
                  className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 md:p-6 space-y-4 shadow-sm"
                >
                  {/* Section Title & Controls */}
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {sec.title}
                        </h3>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--accent-secondary)] px-2 py-0.5 rounded bg-[var(--badge-bg)]">
                          {sec.category || "Resources"}
                        </span>
                      </div>
                      {sec.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {sec.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddFolderToSection(sec.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Add a folder to this section"
                      >
                        <Plus className="w-3 h-3 text-[var(--accent-primary)]" />
                        <span>Add Folder</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Folders Listing */}
                  {folders.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                      No folders in this section yet. Click &quot;Add Folder&quot; to organize resources.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {folders.map((folder: any, fIdx: number) => {
                        const folderKey = `${sec.id}_${folder.title || fIdx}`;
                        const isExpanded = openFolders[folderKey] ?? true;
                        const IconComponent = getFolderIcon(folder.title || "");
                        const linkCount = Array.isArray(folder.links) ? folder.links.length : 0;

                        return (
                          <div
                            key={folder.id || fIdx}
                            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/60 overflow-hidden transition-all"
                          >
                            {/* Folder header */}
                            <div className="flex items-center justify-between p-3.5 bg-[var(--bg-card)]/50 border-b border-[var(--border)]">
                              <button
                                onClick={() => toggleFolder(folderKey)}
                                className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                              >
                                <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                    {folder.title}
                                  </h4>
                                  <p className="text-[10px] text-[var(--text-secondary)]">
                                    {linkCount} {linkCount === 1 ? "item" : "items"}
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  setAddingLinkFolder({
                                    sectionId: sec.id,
                                    folderTitle: folder.title,
                                  })
                                }
                                className="ml-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--badge-bg)] transition-colors"
                                title="Add resource/link to this folder"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Folder content when expanded */}
                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {Array.isArray(folder.links) && folder.links.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {folder.links.map((link: any, lIdx: number) => (
                                      <a
                                        key={link.id || lIdx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-start justify-between gap-2 p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-colors text-xs"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium group-hover:text-[var(--accent-primary)] transition-colors">
                                            <Link2 className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                                            <span className="truncate">{link.title}</span>
                                          </div>
                                          {link.notes && (
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate pl-4.5">
                                              {link.notes}
                                            </p>
                                          )}
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0 mt-0.5" />
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[11px] text-[var(--text-muted)]">
                                    No items in this folder yet.
                                    <button
                                      onClick={() =>
                                        setAddingLinkFolder({
                                          sectionId: sec.id,
                                          folderTitle: folder.title,
                                        })
                                      }
                                      className="block mx-auto mt-1 text-[10px] font-semibold text-[var(--accent-primary)] hover:underline"
                                    >
                                      + Add first link or resource
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Feature Directory Navigation */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Workspaces &amp; Capabilities
          </h2>
          <span className="text-xs text-[var(--text-muted)]">11 Workspaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.href}
                href={ws.href}
                className="group flex items-start gap-3.5 p-4 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-focus)] transition-all duration-200"
              >
                <div className="p-2.5 rounded-xl bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border-focus)]">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {ws.title}
                    </h3>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                    {ws.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Modal: Add Link to Folder */}
      {addingLinkFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Add Resource Link
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Folder: <span className="text-[var(--accent-primary)] font-medium">{addingLinkFolder.folderTitle}</span>
                </p>
              </div>
              <button
                onClick={() => setAddingLinkFolder(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MIT 6.006 Lecture 1: Algorithmic Thinking"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  URL / Link
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://youtube.com/... or https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asymptotic analysis and peak finding"
                  value={newLinkNotes}
                  onChange={(e) => setNewLinkNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingLinkFolder(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Dashboard Section */}
      {addingSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Create Dashboard Section
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Organize links, reference materials, and custom widgets
                </p>
              </div>
              <button
                onClick={() => setAddingSectionModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resources, GATE Exam Hub, Project Assets"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Curated video links, books, and reference documents"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Initial Folders (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Video Links, Online Materials, Books, Information"
                  value={newSectionFolders}
                  onChange={(e) => setNewSectionFolders(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  💡 Tip: You can also ask your AI Assistant directly in chat to create sections for you!
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingSectionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default HomeClient;
