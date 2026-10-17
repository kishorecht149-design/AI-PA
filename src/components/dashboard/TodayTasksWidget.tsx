"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Square,
  Check,
  Plus,
  ArrowRight,
  Filter,
} from "lucide-react";
import { TaskSummary } from "@/types/dashboard";

interface TodayTasksWidgetProps {
  tasks: TaskSummary[];
  onTaskUpdated?: () => void;
}

export function TodayTasksWidget({ tasks, onTaskUpdated }: TodayTasksWidgetProps) {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("PENDING");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "PENDING") return t.status !== "COMPLETED";
    if (filter === "COMPLETED") return t.status === "COMPLETED";
    return true;
  });

  const toggleTask = async (task: TaskSummary) => {
    setTogglingId(task.id);
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          status: newStatus,
        }),
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("amahas:data-update"));
        }
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const getPriorityBadge = (priority: TaskSummary["priority"]) => {
    switch (priority) {
      case "URGENT":
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">URGENT</span>;
      case "HIGH":
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">HIGH</span>;
      case "LOW":
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">LOW</span>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-[var(--accent-primary)]">
            <CheckSquare className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Today&apos;s Focus Queue
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            ({filteredTasks.length})
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === "PENDING"
                ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === "COMPLETED"
                ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Done
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === "ALL"
                ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="py-6 px-4 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] text-center space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {filter === "PENDING"
              ? "All clear for today. Great momentum!"
              : "No tasks found under this filter."}
          </p>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>Open Tasks Workspace</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.slice(0, 6).map((task) => {
            const isCompleted = task.status === "COMPLETED";
            return (
              <div
                key={task.id}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(task)}
                    disabled={togglingId === task.id}
                    className={`p-1 rounded-md transition-colors ${
                      isCompleted
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--badge-bg)]"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium truncate ${
                          isCompleted
                            ? "line-through text-[var(--text-muted)]"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>
                    {task.projectName && (
                      <span className="text-[10px] text-[var(--text-muted)] truncate block">
                        Project: {task.projectName}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/tasks?id=${task.id}`}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="pt-1 flex items-center justify-between text-xs">
        <span className="text-[11px] text-[var(--text-muted)]">
          {tasks.filter((t) => t.status === "COMPLETED").length} of {tasks.length} finished
        </span>
        <Link
          href="/tasks"
          className="font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
        >
          <span>Manage in Tasks</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
