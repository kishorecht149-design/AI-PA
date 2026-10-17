"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Plus,
  Save,
  RotateCcw,
  Monitor,
  Smartphone,
  Settings2,
  Trash2,
  FolderPlus,
} from "lucide-react";
import {
  WidgetInstance,
  WidgetType,
  DashboardLayoutConfig,
} from "@/types/dashboard";

interface DashboardCustomizerProps {
  layoutConfig: DashboardLayoutConfig;
  onSave: (newConfig: DashboardLayoutConfig) => Promise<void>;
  onCancel: () => void;
  onOpenCreateSectionModal: () => void;
}

const WIDGET_TITLES: Record<WidgetType, string> = {
  top_overview: "Top Overview & Daily Horizon",
  attention_queue: "Needs Your Attention (Action Feed)",
  next_activity: "Next Scheduled Activity & Focus Launcher",
  recent_work: "Pick Up Where You Left Off",
  today_tasks: "Today's Focus Queue",
  weekly_pulse: "Weekly Progress Pulse",
  habits_routine: "Daily Habits & Routine",
  active_projects: "Active Projects",
  custom_sections: "Curated Resource Folders",
};

export function DashboardCustomizer({
  layoutConfig,
  onSave,
  onCancel,
  onOpenCreateSectionModal,
}: DashboardCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");
  const [desktopWidgets, setDesktopWidgets] = useState<WidgetInstance[]>(
    JSON.parse(JSON.stringify(layoutConfig.desktopLayout))
  );
  const [mobileWidgets, setMobileWidgets] = useState<WidgetInstance[]>(
    JSON.parse(JSON.stringify(layoutConfig.mobileLayout))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const currentList = activeTab === "desktop" ? desktopWidgets : mobileWidgets;
  const setList = activeTab === "desktop" ? setDesktopWidgets : setMobileWidgets;

  const toggleVisibility = (id: string) => {
    setList((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setList((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx }));
    });
  };

  const moveDown = (index: number) => {
    if (index === currentList.length - 1) return;
    setList((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx }));
    });
  };

  const toggleColumn = (id: string) => {
    if (activeTab !== "desktop") return;
    setDesktopWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, column: w.column === "left" ? "right" : "left" } : w
      )
    );
  };

  const updateSetting = (id: string, key: string, value: any) => {
    setList((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              settings: { ...w.settings, [key]: value },
            }
          : w
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...layoutConfig,
        desktopLayout: desktopWidgets,
        mobileLayout: mobileWidgets,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--accent-primary)]/40 p-5 space-y-5 shadow-xl animate-in fade-in">
      {/* Customizer Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--accent-primary)] text-black">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Customize Dashboard Layout
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Arrange widgets, toggle visibility, and configure display settings
            </p>
          </div>
        </div>

        {/* View Switcher: Desktop vs Mobile */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-primary)] p-0.5 rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setActiveTab("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "desktop"
                  ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (2-Col)</span>
            </button>
            <button
              onClick={() => setActiveTab("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "mobile"
                  ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Stream</span>
            </button>
          </div>

          <button
            onClick={onOpenCreateSectionModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]"
            title="Create personal custom section"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="hidden sm:inline">Add Section</span>
          </button>
        </div>
      </div>

      {/* Widget Manager List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {currentList.map((widget, idx) => {
          const isSelected = selectedWidgetId === widget.id;
          const widgetName = widget.title || WIDGET_TITLES[widget.type] || widget.type;

          return (
            <div
              key={widget.id}
              className={`p-3 rounded-xl border transition-all ${
                widget.visible
                  ? "bg-[var(--bg-primary)]/80 border-[var(--border)]"
                  : "bg-[var(--bg-primary)]/30 border-[var(--border)]/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] w-4 text-center">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {widgetName}
                      </span>
                      {activeTab === "desktop" && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)]">
                          {widget.column} column
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Widget Item Controls */}
                <div className="flex items-center gap-1">
                  {/* Column Switcher (Desktop only) */}
                  {activeTab === "desktop" && (
                    <button
                      onClick={() => toggleColumn(widget.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
                      title={`Move to ${widget.column === "left" ? "Right" : "Left"} column`}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Move Up */}
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === currentList.length - 1}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => toggleVisibility(widget.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      widget.visible
                        ? "text-[var(--accent-primary)] hover:bg-[var(--badge-bg)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
                    }`}
                    title={widget.visible ? "Hide widget" : "Show widget"}
                  >
                    {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Settings toggle */}
                  <button
                    onClick={() => setSelectedWidgetId(isSelected ? null : widget.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[var(--badge-bg)] text-[var(--accent-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    }`}
                    title="Widget settings"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Instance Settings Drawer */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
                      Display Limit
                    </label>
                    <select
                      value={widget.settings?.limit || 5}
                      onChange={(e) => updateSetting(widget.id, "limit", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value={3}>Show 3 items</option>
                      <option value={5}>Show 5 items</option>
                      <option value={10}>Show 10 items</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
                      Density
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting(
                          widget.id,
                          "compactView",
                          !widget.settings?.compactView
                        )
                      }
                      className="w-full px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-primary)] text-left"
                    >
                      {widget.settings?.compactView ? "Compact View" : "Standard View"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save & Cancel Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Cancel &amp; Revert</span>
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 shadow-md transition-all"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? "Saving Layout..." : "Save Dashboard Layout"}</span>
        </button>
      </div>
    </div>
  );
}
