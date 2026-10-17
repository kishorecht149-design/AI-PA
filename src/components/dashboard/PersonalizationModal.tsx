"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Clock,
  Briefcase,
  X,
  Check,
} from "lucide-react";
import { DashboardLayoutConfig } from "@/types/dashboard";

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardLayoutConfig;
  onSave: (personalization: DashboardLayoutConfig["personalization"]) => Promise<void>;
}

export function PersonalizationModal({
  isOpen,
  onClose,
  config,
  onSave,
}: PersonalizationModalProps) {
  const [role, setRole] = useState(config.personalization.role || "student");
  const [hoursStart, setHoursStart] = useState(config.personalization.workingHoursStart || "09:00");
  const [hoursEnd, setHoursEnd] = useState(config.personalization.workingHoursEnd || "22:00");
  const [focusTarget, setFocusTarget] = useState(config.personalization.dailyFocusTargetMinutes || 180);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const roles = [
    { id: "student", label: "Student / Academics", desc: "Syllabus tracking, exam revisions, and study blocks" },
    { id: "researcher", label: "Researcher / Scholar", desc: "Literature review, paper capture, and experiment notes" },
    { id: "developer", label: "Engineer / Developer", desc: "Sprint deliverables, codebase focus, and technical logs" },
    { id: "creator", label: "Creator / Professional", desc: "Project milestones, client tasks, and habit routines" },
    { id: "general", label: "Personal Operating System", desc: "Balanced daily planning, habits, reminders, and notes" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        role,
        workingHoursStart: hoursStart,
        workingHoursEnd: hoursEnd,
        dailyFocusTargetMinutes: Number(focusTarget),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Personalize Your Workspace
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Configure your daily capacity and adaptive layout focus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary Focus / Role */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Primary Role &amp; Context
            </label>
            <div className="space-y-1.5">
              {roles.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-[var(--badge-bg)] border-[var(--accent-primary)] text-[var(--text-primary)]"
                        : "bg-[var(--bg-primary)]/60 border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50"
                    }`}
                  >
                    <div
                      className={`p-1 rounded-md mt-0.5 ${
                        isSelected
                          ? "bg-[var(--accent-primary)] text-black"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {r.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours for Capacity Reality Check */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Daily Working Hours (Capacity Window)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={hoursStart}
                  onChange={(e) => setHoursStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={hoursEnd}
                  onChange={(e) => setHoursEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Daily Focus Goal */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Daily Deep Work Target (Minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={30}
                max={600}
                step={15}
                value={focusTarget}
                onChange={(e) => setFocusTarget(Number(e.target.value))}
                className="w-32 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">
                = {Math.round((Number(focusTarget) / 60) * 10) / 10} hours of planned focus per day
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
