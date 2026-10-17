"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  FileText,
  CheckSquare,
  FolderKanban,
  ArrowRight,
  ExternalLink,
  X,
  History,
} from "lucide-react";
import { RecentWorkItem } from "@/types/dashboard";

interface PickUpRecentWorkProps {
  items: RecentWorkItem[];
}

export function PickUpRecentWork({ items }: PickUpRecentWorkProps) {
  const [viewMoreModal, setViewMoreModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || items.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Pick Up Where You Left Off
            </h2>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] py-2">
          No unfinished recent work to resume right now. Start a task or capture a thought below.
        </p>
      </div>
    );
  }

  const primaryItem = items.find((i) => i.isPrimary) || items[0];
  const otherItems = items.filter((i) => i.id !== primaryItem.id);

  const getItemIcon = (type: RecentWorkItem["type"]) => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />;
      case "note":
        return <FileText className="w-4 h-4 text-[var(--accent-secondary)]" />;
      case "project":
        return <FolderKanban className="w-4 h-4 text-emerald-400" />;
      default:
        return <RotateCcw className="w-4 h-4 text-[var(--accent-primary)]" />;
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <RotateCcw className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Pick Up Where You Left Off
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {otherItems.length > 0 && (
            <button
              onClick={() => setViewMoreModal(true)}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
            >
              <span>View more ({otherItems.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Dismiss suggestion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary recommendation */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border)] hover:border-[var(--accent-primary)] transition-all space-y-2.5 group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="shrink-0 mt-0.5">{getItemIcon(primaryItem.type)}</div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent-secondary)]">
                {primaryItem.type === "task" ? "In-Progress Task" : primaryItem.type.toUpperCase()}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                {primaryItem.title}
              </h3>
              {primaryItem.subtitle && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {primaryItem.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60 text-[11px] text-[var(--text-muted)]">
          <span>Active recently</span>
          <Link
            href={primaryItem.href}
            className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
          >
            <span>Resume Work</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Modal: View more recent activities */}
      {viewMoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Eligible Recent Work ({items.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Active notes, tasks, and ongoing projects
                </p>
              </div>
              <button
                onClick={() => setViewMoreModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setViewMoreModal(false)}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-primary)]/80 hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-all text-left"
                >
                  <div className="shrink-0 mt-0.5">{getItemIcon(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] shrink-0">
                        {item.type}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
