"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  ArrowRight,
  Plus,
} from "lucide-react";

export function ActiveProjectsWidget() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const handleUpdate = () => fetchProjects();
    window.addEventListener("amahas:data-update", handleUpdate);
    return () => window.removeEventListener("amahas:data-update", handleUpdate);
  }, []);

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--badge-bg)] text-emerald-400">
            <FolderKanban className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Active Projects
          </h2>
        </div>

        <Link
          href="/projects"
          className="text-xs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 font-semibold"
        >
          <span>All Projects</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-10 bg-[var(--bg-primary)] rounded-xl animate-pulse" />
          <div className="h-10 bg-[var(--bg-primary)] rounded-xl animate-pulse" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-4 px-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border)] text-center space-y-1.5">
          <p className="text-xs text-[var(--text-secondary)]">
            No active projects right now.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>Create a Project</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {projects.slice(0, 4).map((project) => {
            const totalUnits = (project.totalTasks || 0) + (project.totalMilestones || 0);
            const hasUnits = totalUnits > 0;
            const pct = hasUnits ? (project.calculatedProgress ?? 0) : null;

            return (
              <Link
                key={project.id}
                href={`/projects?id=${project.id}`}
                className="block p-3 rounded-xl bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-all group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                    {project.name}
                  </span>
                  {hasUnits ? (
                    <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                      {pct}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] italic font-medium">
                      No tasks linked yet
                    </span>
                  )}
                </div>

                {hasUnits ? (
                  <>
                    <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: project.color || "var(--accent-primary)",
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-[var(--text-muted)]">
                      <span>{project.completedTasks} / {project.totalTasks} tasks</span>
                      <span className="uppercase">{project.category || "General"}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border)]/40 text-[10px]">
                    <span className="text-[var(--accent-primary)] font-semibold inline-flex items-center gap-1 group-hover:underline">
                      <span>Open Project & add tasks</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                    <span className="uppercase text-[var(--text-muted)]">{project.category || "General"}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
