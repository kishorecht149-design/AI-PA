"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Zap,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { NextActivityItem } from "@/types/dashboard";

interface NextActivityCardProps {
  activity: NextActivityItem | null;
}

export function NextActivityCard({ activity }: NextActivityCardProps) {
  if (!activity) {
    return (
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Next Scheduled Activity
          </h2>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] text-center space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            No activities scheduled for the rest of today.
          </p>
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Time Block</span>
          </Link>
        </div>
      </div>
    );
  }

  const startTimeObj = new Date(activity.startTime);
  const endTimeObj = new Date(activity.endTime);
  const timeFormatted = `${startTimeObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endTimeObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const durationMin = Math.max(
    15,
    Math.round((endTimeObj.getTime() - startTimeObj.getTime()) / 60000)
  );

  const focusHref = activity.taskId
    ? `/focus?taskId=${activity.taskId}&targetMinutes=${durationMin}`
    : `/focus?targetMinutes=${durationMin}`;

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm relative overflow-hidden">
      {activity.isOngoing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-emerald-400 animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {activity.isOngoing ? "Active Activity Now" : "Next Scheduled Activity"}
          </h2>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            activity.isOngoing
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
              : "bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border)]"
          }`}
        >
          {activity.isOngoing
            ? "In Progress"
            : activity.startsInMinutes === 0
            ? "Starting now"
            : `In ${activity.startsInMinutes}m`}
        </span>
      </div>

      {/* Main Activity Details */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border)] space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
              {activity.title}
            </h3>
            {activity.taskTitle && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Linked Task: <span className="text-[var(--accent-primary)] font-medium">{activity.taskTitle}</span>
              </p>
            )}
          </div>

          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-card)]">
            {activity.category}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{timeFormatted}</span>
          <span className="text-[var(--text-muted)]">({durationMin} min)</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Link
          href="/planner"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
        >
          <span>View Day Planner</span>
          <ArrowRight className="w-3 h-3" />
        </Link>

        <Link
          href={focusHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 shadow-md transition-all hover:scale-[1.02]"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Launch Focus Arena</span>
        </Link>
      </div>
    </div>
  );
}
