"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Calendar,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AttentionItem } from "@/types/dashboard";

interface AttentionQueueProps {
  items: AttentionItem[];
  onDismiss: (id: string) => Promise<void>;
}

export function AttentionQueue({ items, onDismiss }: AttentionQueueProps) {
  const [viewAllModal, setViewAllModal] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const topItems = items.slice(0, 3);
  const hasMore = items.length > 3;

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissingId(id);
    try {
      await onDismiss(id);
    } finally {
      setDismissingId(null);
    }
  };

  const getSeverityStyle = (severity: AttentionItem["severity"]) => {
    if (severity === "high") {
      return "border-amber-500/30 bg-amber-500/5 text-amber-400";
    }
    return "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)]";
  };

  const getCategoryIcon = (category: AttentionItem["category"]) => {
    switch (category) {
      case "conflict":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "overdue":
        return <Clock className="w-4 h-4 text-rose-400" />;
      case "unscheduled":
        return <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />;
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Needs Your Attention
          </h2>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {items.length}
            </span>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setViewAllModal(true)}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
          >
            <span>View all ({items.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Items list */}
      {topItems.length === 0 ? (
        <div className="py-6 px-4 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] text-center space-y-2">
          <div className="inline-flex p-2 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-[var(--text-primary)]">
            You&apos;re all caught up!
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
            No schedule conflicts, overdue commitments, or critical bottlenecks detected. Ready for your next focus session.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {topItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${getSeverityStyle(item.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="shrink-0 mt-0.5">{getCategoryIcon(item.category)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                      {item.reason}
                    </p>

                    <div className="flex items-center gap-2 mt-2.5">
                      {item.link ? (
                        <Link
                          href={item.link}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
                        >
                          <span>{item.actionLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
                        >
                          <span>{item.actionLabel}</span>
                        </button>
                      )}

                      {item.dismissible && (
                        <button
                          onClick={(e) => handleDismiss(e, item.id)}
                          disabled={dismissingId === item.id}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          {dismissingId === item.id ? "Dismissing..." : "Dismiss"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {item.dismissible && (
                  <button
                    onClick={(e) => handleDismiss(e, item.id)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: View All Attention Items */}
      {viewAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  All Attention Signals ({items.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Evaluated cross-module friction and schedule items
                </p>
              </div>
              <button
                onClick={() => setViewAllModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border ${getSeverityStyle(item.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="shrink-0 mt-0.5">{getCategoryIcon(item.category)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                          {item.reason}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          {item.link ? (
                            <Link
                              href={item.link}
                              onClick={() => setViewAllModal(false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)]"
                            >
                              <span>{item.actionLabel}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)]"
                            >
                              <span>{item.actionLabel}</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDismiss(e, item.id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
