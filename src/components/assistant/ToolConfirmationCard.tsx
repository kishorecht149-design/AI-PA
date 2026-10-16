"use client";

import React, { useState } from "react";
import {
  Check,
  X,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Zap,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

export interface PendingTool {
  toolName: string;
  args: Record<string, any>;
  callId?: string;
  idempotencyKey?: string;
  confirmationToken?: string;
}

interface ToolConfirmationCardProps {
  tool: PendingTool;
  onConfirm: (approve: boolean, tool: PendingTool) => Promise<void>;
}

export function ToolConfirmationCard({ tool, onConfirm }: ToolConfirmationCardProps) {
  const [executing, setExecuting] = useState(false);
  const [status, setStatus] = useState<"pending" | "executed" | "rejected" | "error">("pending");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleAction = async (approve: boolean) => {
    setExecuting(true);
    try {
      if (!approve) {
        setStatus("rejected");
        setStatusMessage("Action was rejected. No changes were made.");
        await onConfirm(false, tool);
      } else {
        await onConfirm(true, tool);
        setStatus("executed");
        setStatusMessage("Action confirmed and executed successfully.");
      }
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(err.message || "Failed to execute tool action.");
    } finally {
      setExecuting(false);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">URGENT</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">LOW</span>;
    }
  };

  const renderToolDetails = () => {
    const { toolName, args } = tool;

    switch (toolName) {
      case "create_task":
        return (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-slate-100 text-sm">{args.title || "Untitled Task"}</div>
              {getPriorityBadge(args.priority)}
            </div>
            {args.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-2 rounded-lg border border-white/5">
                {args.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 pt-1">
              {args.estimatedMinutes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{args.estimatedMinutes} mins</span>
                </div>
              )}
              {args.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Due: {new Date(args.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {args.courseCode && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Course: {args.courseCode}</span>
                </div>
              )}
            </div>
          </div>
        );

      case "update_task_status":
        return (
          <div className="space-y-2">
            <div className="text-xs text-slate-300">
              Update task <span className="font-mono text-cyan-300 font-bold">{args.taskId || args.title}</span> to:
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{args.status || "COMPLETED"}</span>
            </div>
          </div>
        );

      case "schedule_focus_block":
        return (
          <div className="space-y-2">
            <div className="font-semibold text-slate-100 text-sm">{args.title || "Focus Block"}</div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{args.durationMinutes || 25} minutes</span>
              </div>
              {args.startTime && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>{new Date(args.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>
          </div>
        );

      case "record_syllabus_revision":
        return (
          <div className="space-y-2">
            <div className="text-xs text-slate-300">
              Record revision for <span className="font-semibold text-purple-300">{args.topicName || args.courseCode}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Recall rating:</span>
              <span className="font-bold text-amber-300">{args.recallRating || 4}/5</span>
              <span>(SM-2 Spaced Repetition)</span>
            </div>
          </div>
        );

      default:
        return (
          <pre className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono overflow-x-auto text-amber-300 max-h-40">
            {JSON.stringify(args, null, 2)}
          </pre>
        );
    }
  };

  if (status === "executed") {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-message-in">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
        <span className="text-[10px] text-emerald-400/80 font-mono">CONFIRMED</span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 flex items-center gap-2">
        <X className="w-4 h-4 text-slate-500 shrink-0" />
        <span>Action rejected. Database state preserved.</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
        <button
          onClick={() => handleAction(true)}
          className="text-xs underline hover:text-rose-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-black/40 to-black/60 border border-amber-500/30 shadow-xl space-y-3.5 animate-message-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Permission Review: Action Requires Your Approval</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {tool.toolName}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-black/40 border border-white/10">
        {renderToolDetails()}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          onClick={() => handleAction(false)}
          disabled={executing}
          className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          Reject Action
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={executing}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-black font-bold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
        >
          {executing ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Approve &amp; Execute</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
