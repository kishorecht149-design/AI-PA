"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  BookOpen,
  CheckSquare,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { decodeHtmlEntities, sanitizeUrl } from "@/lib/format-utils";

interface ToolResultCardProps {
  toolName: string;
  result: any;
}

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  // 1. Web Research Source Cards (Render only when web research was actually executed)
  if (toolName === "search_web" && Array.isArray(result.results)) {
    if (result.results.length === 0) return null;

    return (
      <div className="my-2.5 p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-cyan-300 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Verified Research Sources ({result.results.length})
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 lowercase"
          >
            {expanded ? "collapse" : "expand"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="space-y-1.5">
          {result.results.slice(0, expanded ? 6 : 3).map((r: any, idx: number) => {
            const title = decodeHtmlEntities(r.title || "External Source");
            const snippet = decodeHtmlEntities(r.snippet || "");
            const safeUrl = sanitizeUrl(r.url);

            return (
              <a
                key={idx}
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 text-xs transition-all group"
              >
                <div className="flex items-center justify-between text-cyan-300 font-medium">
                  <span className="truncate group-hover:text-cyan-200 transition-colors">
                    {title}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0 ml-1.5 opacity-70 group-hover:opacity-100" />
                </div>
                {snippet && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {snippet}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Academic Record Action Confirmation
  if (
    toolName === "create_academic_record" ||
    toolName === "update_academic_record" ||
    toolName === "delete_academic_record"
  ) {
    const course = result.course;
    return (
      <div className="my-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2.5">
        <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 min-w-0">
          <div className="font-semibold text-emerald-300">
            {result.message || "Academic Plan Updated"}
          </div>
          {course && (
            <div className="text-[11px] text-emerald-300/80 font-mono">
              Course: {course.name} ({course.code}) • Track: {course.track || "General"}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Task Management Action Confirmation
  if (
    toolName === "create_task" ||
    toolName === "update_task" ||
    toolName === "update_task_status" ||
    toolName === "delete_task"
  ) {
    const task = result.task;
    return (
      <div className="my-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2.5">
        <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 min-w-0">
          <div className="font-semibold text-cyan-300">
            {result.message || "Task Updated"}
          </div>
          {task && (
            <div className="text-[11px] text-cyan-300/80 font-mono">
              Priority: {task.priority} • Status: {task.status}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Reminder Action Confirmation
  if (toolName === "create_reminder") {
    return (
      <div className="my-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2.5">
        <Bell className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 min-w-0">
          <div className="font-semibold text-purple-300">
            {result.message || "Reminder Created"}
          </div>
        </div>
      </div>
    );
  }

  // For read-only tools whose data is already answered in prose (e.g. get_academic_records, get_tasks),
  // suppress raw JSON payloads so users never see raw debug state.
  return null;
}
