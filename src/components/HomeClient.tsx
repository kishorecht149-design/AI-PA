"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  Link2,
  Video,
  Book,
  Globe,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { DashboardOverviewData, DashboardLayoutConfig } from "@/types/dashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AttentionQueue } from "@/components/dashboard/AttentionQueue";
import { NextActivityCard } from "@/components/dashboard/NextActivityCard";
import { PickUpRecentWork } from "@/components/dashboard/PickUpRecentWork";
import { UniversalQuickCapture } from "@/components/dashboard/UniversalQuickCapture";
import { TodayTasksWidget } from "@/components/dashboard/TodayTasksWidget";
import { WeeklyProgressWidget } from "@/components/dashboard/WeeklyProgressWidget";
import { HabitsRoutineWidget } from "@/components/dashboard/HabitsRoutineWidget";
import { ActiveProjectsWidget } from "@/components/dashboard/ActiveProjectsWidget";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { PersonalizationModal } from "@/components/dashboard/PersonalizationModal";

interface HomeClientProps {
  userName?: string;
}

export function HomeClient({ userName: initialUserName }: HomeClientProps) {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  // Custom Sections & Folders State (preserved capability)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [addingLinkFolder, setAddingLinkFolder] = useState<{ sectionId: string; folderTitle: string } | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkNotes, setNewLinkNotes] = useState("");
  const [addingSectionModal, setAddingSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [newSectionFolders, setNewSectionFolders] = useState("");

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (!res.ok) {
        throw new Error(`Failed to load dashboard overview (Status: ${res.status})`);
      }
      const json: DashboardOverviewData = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error("[Dashboard] Error fetching overview:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Event-driven real-time refresh
    const handleDataUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener("amahas:data-update", handleDataUpdate);

    // Refresh on tab refocus if away
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("amahas:data-update", handleDataUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboardData]);

  // Layout save handler
  const handleSaveLayout = async (newConfig: DashboardLayoutConfig) => {
    try {
      const res = await fetch("/api/dashboard/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setIsCustomizing(false);
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Signal dismissal handler
  const handleDismissAttention = async (id: string) => {
    try {
      const res = await fetch("/api/dashboard/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISMISS_ATTENTION",
          attentionId: id,
        }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                attentionItems: prev.attentionItems.filter((item) => item.id !== id),
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Personalization preferences save handler
  const handleSavePersonalization = async (
    personalization: DashboardLayoutConfig["personalization"]
  ) => {
    try {
      const res = await fetch("/api/dashboard/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalization }),
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Custom sections helper handlers (preserved)
  const toggleFolder = (folderKey: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const getFolderIcon = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes("video") || t.includes("watch") || t.includes("lecture") || t.includes("media")) return Video;
    if (t.includes("book") || t.includes("read") || t.includes("paper")) return Book;
    if (t.includes("online") || t.includes("web") || t.includes("site") || t.includes("material")) return Globe;
    return Folder;
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
        loadDashboardData();
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
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to remove this section from your dashboard?")) return;
    try {
      await fetch(`/api/dashboard/sections?sectionId=${sectionId}`, { method: "DELETE" });
      loadDashboardData();
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
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Loading Skeleton State
  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto py-6 md:py-8 px-4 space-y-8 animate-in fade-in duration-300">
        <div className="h-14 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
        <div className="h-28 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-48 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
            <div className="h-64 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-44 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
            <div className="h-56 bg-[var(--bg-card)] rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error && !data) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-[var(--bg-card)] border border-rose-500/30 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Dashboard Unavailable
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            loadDashboardData();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Widget rendering helper based on type
  const renderWidget = (type: string, widgetId: string) => {
    switch (type) {
      case "attention_queue":
        return (
          <AttentionQueue
            key={widgetId}
            items={data.attentionItems}
            onDismiss={handleDismissAttention}
          />
        );
      case "next_activity":
        return <NextActivityCard key={widgetId} activity={data.nextActivity} />;
      case "recent_work":
        return <PickUpRecentWork key={widgetId} items={data.recentWork} />;
      case "today_tasks":
        return (
          <TodayTasksWidget
            key={widgetId}
            tasks={data.todayTasks}
            onTaskUpdated={loadDashboardData}
          />
        );
      case "weekly_pulse":
        return <WeeklyProgressWidget key={widgetId} progress={data.weeklyProgress} />;
      case "habits_routine":
        return <HabitsRoutineWidget key={widgetId} />;
      case "active_projects":
        return <ActiveProjectsWidget key={widgetId} />;
      case "custom_sections":
        return (
          <div key={widgetId} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
                  <Folder className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Curated Resource Folders
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border)]">
                  Personal Sections
                </span>
              </div>
              <button
                onClick={() => setAddingSectionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>New Section</span>
              </button>
            </div>

            {data.customSections.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-center space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  No custom resource sections created yet. Organize study guides, video lecture series, or reference links.
                </p>
                <button
                  onClick={() => setAddingSectionModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Resource Section</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.customSections.map((sec) => {
                  const folders = Array.isArray(sec.items) ? sec.items : [];
                  return (
                    <div
                      key={sec.id}
                      className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 sm:p-5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 pb-2 border-b border-[var(--border)]">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                              {sec.title}
                            </h3>
                            <span className="text-[9px] uppercase font-bold text-[var(--accent-secondary)] px-1.5 py-0.5 rounded bg-[var(--badge-bg)]">
                              {sec.category || "Resources"}
                            </span>
                          </div>
                          {sec.description && (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                              {sec.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAddFolderToSection(sec.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Plus className="w-3 h-3 text-[var(--accent-primary)]" />
                            <span>Add Folder</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
                            title="Delete section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Folder Listing */}
                      {folders.length === 0 ? (
                        <div className="py-3 text-center text-xs text-[var(--text-muted)]">
                          No folders yet. Click &quot;Add Folder&quot; to organize resources.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {folders.map((folder: any, fIdx: number) => {
                            const folderKey = `${sec.id}_${folder.title || fIdx}`;
                            const isExpanded = openFolders[folderKey] ?? true;
                            const IconComponent = getFolderIcon(folder.title || "");
                            const links = Array.isArray(folder.links) ? folder.links : [];

                            return (
                              <div
                                key={folder.id || fIdx}
                                className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/50 overflow-hidden"
                              >
                                <div className="flex items-center justify-between p-2.5 bg-[var(--bg-card)]/50 border-b border-[var(--border)]">
                                  <button
                                    onClick={() => toggleFolder(folderKey)}
                                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                                  >
                                    <div className="p-1 rounded-md bg-[var(--badge-bg)] text-[var(--accent-primary)] shrink-0">
                                      <IconComponent className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                        {folder.title}
                                      </h4>
                                      <p className="text-[10px] text-[var(--text-muted)]">
                                        {links.length} item{links.length === 1 ? "" : "s"}
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
                                    className="ml-1 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--badge-bg)]"
                                    title="Add link"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                {isExpanded && (
                                  <div className="p-2 space-y-1.5">
                                    {links.length > 0 ? (
                                      links.map((link: any, lIdx: number) => (
                                        <a
                                          key={link.id || lIdx}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs group"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium group-hover:text-[var(--accent-primary)] truncate">
                                              <Link2 className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                                              <span className="truncate">{link.title}</span>
                                            </div>
                                            {link.notes && (
                                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate pl-4.5">
                                                {link.notes}
                                              </p>
                                            )}
                                          </div>
                                          <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] shrink-0 mt-0.5" />
                                        </a>
                                      ))
                                    ) : (
                                      <div className="text-center py-1.5 text-[10px] text-[var(--text-muted)]">
                                        No items yet.
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
          </div>
        );
      default:
        return null;
    }
  };

  // Split widgets by column based on layout config
  const desktopLayout = data.layout?.desktopLayout || [];
  const leftWidgets = desktopLayout
    .filter((w) => w.visible && w.column === "left")
    .sort((a, b) => a.order - b.order);
  const rightWidgets = desktopLayout
    .filter((w) => w.visible && w.column === "right")
    .sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-8 px-4 space-y-6 animate-in fade-in duration-300">
      {/* 1. Top Overview & Situation Summary */}
      <DashboardHeader
        data={data}
        isCustomizing={isCustomizing}
        onToggleCustomizing={() => setIsCustomizing(!isCustomizing)}
        onOpenPersonalize={() => setIsPersonalizing(true)}
      />

      {/* 2. Universal Quick Capture & Add Menu */}
      <UniversalQuickCapture
        onSuccess={loadDashboardData}
        onOpenAddResourceModal={() => {
          if (data.customSections.length > 0) {
            setAddingLinkFolder({
              sectionId: data.customSections[0].id,
              folderTitle: data.customSections[0].items[0]?.title || "General",
            });
          } else {
            setAddingSectionModal(true);
          }
        }}
      />

      {/* 3. Customize Dashboard Mode Panel */}
      {isCustomizing && (
        <DashboardCustomizer
          layoutConfig={data.layout}
          onSave={handleSaveLayout}
          onCancel={() => setIsCustomizing(false)}
          onOpenCreateSectionModal={() => setAddingSectionModal(true)}
        />
      )}

      {/* 4. Main 2-Column Responsive Operational Horizon */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Primary Action Surface - 60%) */}
        <div className="lg:col-span-7 space-y-6">
          {leftWidgets.map((w) => renderWidget(w.type, w.id))}
        </div>

        {/* Right Column (Context & Tempo Rail - 40%) */}
        <div className="lg:col-span-5 space-y-6">
          {rightWidgets.map((w) => renderWidget(w.type, w.id))}
        </div>
      </div>

      {/* Personalization Setup Modal */}
      <PersonalizationModal
        isOpen={isPersonalizing}
        onClose={() => setIsPersonalizing(false)}
        config={data.layout}
        onSave={handleSavePersonalization}
      />

      {/* Modal: Add Link to Resource Folder (preserved) */}
      {addingLinkFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  URL / Link
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingLinkFolder(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Dashboard Section (preserved) */}
      {addingSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Create Personal Section
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Organize links, folders, and resources
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
                  placeholder="e.g. Systems Research Hub, GATE Exam Assets"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Papers, video series, and quick benchmarks"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Initial Folders (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lectures, Papers, Cheatsheets"
                  value={newSectionFolders}
                  onChange={(e) => setNewSectionFolders(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingSectionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90"
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
