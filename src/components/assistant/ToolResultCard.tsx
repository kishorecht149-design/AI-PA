"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ListTodo,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface ToolResultCardProps {
  toolName: string;
  result: any;
}

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const renderContent = () => {
    // 1. Task search results
    if (toolName === "search_tasks" && Array.isArray(result.tasks)) {
      return (
        <div className="space-y-2 mt-2">
          <div className="text-[11px] text-slate-400">
            Found {result.tasks.length} task{result.tasks.length === 1 ? "" : "s"}:
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {result.tasks.slice(0, 5).map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      t.status === "COMPLETED"
                        ? "bg-emerald-400"
                        : t.status === "IN_PROGRESS"
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="truncate">{t.title}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 2. Note search results
    if (toolName === "search_notes" && Array.isArray(result.notes)) {
      return (
        <div className="space-y-2 mt-2">
          <div className="text-[11px] text-slate-400">
            Found {result.notes.length} note{result.notes.length === 1 ? "" : "s"}:
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {result.notes.slice(0, 4).map((n: any) => (
              <div key={n.id} className="p-2 rounded-lg bg-black/40 border border-white/5 text-xs text-slate-200">
                <div className="font-semibold text-cyan-300">{n.title}</div>
                {n.content && <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.content}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. Web search results
    if (toolName === "search_web" && Array.isArray(result.results)) {
      return (
        <div className="space-y-1.5 mt-2">
          {result.results.slice(0, 3).map((r: any, idx: number) => (
            <a
              key={idx}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block p-2 rounded-lg bg-black/40 border border-white/5 hover:border-cyan-500/30 text-xs transition-colors"
            >
              <div className="flex items-center justify-between text-cyan-300 font-medium">
                <span className="truncate">{r.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-70" />
              </div>
              {r.snippet && <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{r.snippet}</p>}
            </a>
          ))}
        </div>
      );
    }

    // Generic JSON output
    return (
      <pre className="mt-2 p-2 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono overflow-x-auto text-slate-300 max-h-40">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="my-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-slate-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] text-cyan-300">Tool Result: {toolName}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>{expanded ? "Hide" : "Show"} details</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>

      {expanded && renderContent()}
    </div>
  );
}
