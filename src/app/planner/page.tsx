"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
} from "lucide-react";

interface TimeBlockItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  isFixed: boolean;
  completed: boolean;
  task?: { id: string; title: string; priority: string } | null;
}

interface ConflictItem {
  blockA: string;
  blockB: string;
  time: string;
}

interface UnscheduledTask {
  id: string;
  title: string;
  priority: string;
  estimatedMinutes: number | null;
}

export default function PlannerPage() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockItem[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<UnscheduledTask[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"day" | "week" | "agenda">("day");

  // Create block modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:30");
  const [newCategory, setNewCategory] = useState("focus");

  // AI Schedule proposal modal
  const [showAiProposal, setShowAiProposal] = useState(false);
  const [proposalApproved, setProposalApproved] = useState(false);

  const fetchPlanner = async () => {
    try {
      const res = await fetch("/api/planner");
      const data = await res.json();
      if (data.timeBlocks) setTimeBlocks(data.timeBlocks);
      if (data.unscheduledTasks) setUnscheduledTasks(data.unscheduledTasks);
      if (data.conflicts) setConflicts(data.conflicts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanner();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().substring(0, 10);
    const startIso = `${today}T${newStart}:00`;
    const endIso = `${today}T${newEnd}:00`;

    await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        startTime: startIso,
        endTime: endIso,
        category: newCategory,
      }),
    });

    setShowCreateModal(false);
    setNewTitle("");
    fetchPlanner();
  };

  const scheduleBacklogTask = async (task: UnscheduledTask) => {
    const today = new Date().toISOString().substring(0, 10);
    const start = new Date();
    start.setMinutes(start.getMinutes() + 15);
    const end = new Date(start.getTime() + (task.estimatedMinutes || 45) * 60000);

    await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        taskId: task.id,
        category: "focus",
      }),
    });

    fetchPlanner();
  };

  const applyAiSchedule = async () => {
    const today = new Date().toISOString().substring(0, 10);
    // Proposed schedule slots based on active priorities
    const slots = [
      { title: "Deep Work: Operating Systems Virtual Memory Paging", start: `${today}T09:00:00`, end: `${today}T10:30:00`, cat: "course" },
      { title: "Break & Hydration", start: `${today}T10:30:00`, end: `${today}T10:45:00`, cat: "break" },
      { title: "GATE Practice: 15 Multi-Level Paging Problems", start: `${today}T10:45:00`, end: `${today}T12:00:00`, cat: "focus" },
      { title: "Lunch & Rest", start: `${today}T12:00:00`, end: `${today}T13:30:00`, cat: "break" },
      { title: "Research Lab: Edge LLM INT3 MSL Kernel Profiling", start: `${today}T14:00:00`, end: `${today}T16:00:00`, cat: "research" },
      { title: "Language Drill: German Spaced Repetition", start: `${today}T16:30:00`, end: `${today}T17:00:00`, cat: "focus" },
    ];

    for (const s of slots) {
      await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: s.title,
          startTime: s.start,
          endTime: s.end,
          category: s.cat,
        }),
      });
    }

    setProposalApproved(true);
    setTimeout(() => {
      setShowAiProposal(false);
      setProposalApproved(false);
      fetchPlanner();
    }, 1200);
  };

  const formatTimeRange = (start: string, end: string) => {
    const s = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const e = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${s} – ${e}`;
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "course":
        return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
      case "research":
        return "border-violet-500/40 bg-violet-500/10 text-violet-300";
      case "break":
        return "border-slate-500/40 bg-slate-500/10 text-slate-400";
      default:
        return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-cyan-400" />
            Planner & Schedule
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Time-blocking architecture with conflict detection and unscheduled backlog.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs">
            {["day", "week", "agenda"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  view === v ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAiProposal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/30 border border-violet-500/40 hover:bg-violet-600/40 text-violet-200 font-medium text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Propose Schedule
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> Add Block
          </button>
        </div>
      </div>

      {/* Conflict Warning Banner if conflicts detected */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-red-400">
            <AlertTriangle className="w-4 h-4" /> {conflicts.length} Schedule Conflict Detected
          </div>
          {conflicts.map((c, i) => (
            <div key={i} className="pl-6 text-[11px] text-red-200/80">
              Overlap at {c.time}: &ldquo;{c.blockA}&rdquo; overlaps with &ldquo;{c.blockB}&rdquo;.
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Schedule vs Unscheduled Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline / Time Blocks (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-white/5 pb-2">
            <span>Today&apos;s Planned Time Blocks</span>
            <span className="text-[11px] text-cyan-400">{timeBlocks.length} Scheduled</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">Loading planner...</div>
          ) : timeBlocks.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p>No time blocks scheduled for today yet.</p>
              <button
                onClick={() => setShowAiProposal(true)}
                className="text-cyan-400 hover:underline"
              >
                Let AI propose an optimized schedule
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {timeBlocks.map((b) => (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border transition-all ${categoryColor(
                    b.category
                  )} flex items-center justify-between gap-3`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{b.title}</div>
                    <div className="text-[11px] opacity-80 mt-0.5 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeRange(b.startTime, b.endTime)}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-black/30 font-mono">
                        {b.category}
                      </span>
                    </div>
                  </div>
                  {b.completed && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unscheduled Tasks Backlog (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-white/5 pb-2">
            <span>Unscheduled Tasks Backlog</span>
            <span className="text-[11px] text-slate-500">{unscheduledTasks.length} Pending</span>
          </div>

          {unscheduledTasks.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-white/5 bg-white/[0.01] text-xs text-slate-500">
              All tasks currently have scheduled slots!
            </div>
          ) : (
            <div className="space-y-2">
              {unscheduledTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/10 space-y-2"
                >
                  <div className="text-xs font-medium text-slate-200 line-clamp-2">
                    {t.title}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {t.estimatedMinutes || 45} mins • {t.priority}
                    </span>
                    <button
                      onClick={() => scheduleBacklogTask(t)}
                      className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-medium transition-colors"
                    >
                      Schedule Next
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Proposal Modal */}
      {showAiProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b1120] border border-violet-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" /> AI Schedule Synthesis Engine
            </div>

            <h2 className="text-base font-bold text-white">
              Proposed Schedule for Today
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              Based on your priority courses (Operating Systems virtual memory) and research milestones (Edge LLM INT3 kernel), here is an optimized time-blocked structure honoring a 15-minute buffer:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/5 text-xs">
              <div className="p-2 rounded bg-white/5 text-slate-200">
                • 09:00 - 10:30: Deep Work: OS Virtual Memory Paging (CS301)
              </div>
              <div className="p-2 rounded bg-white/5 text-slate-400">
                • 10:30 - 10:45: Break &amp; Hydration
              </div>
              <div className="p-2 rounded bg-white/5 text-slate-200">
                • 10:45 - 12:00: GATE Practice: 15 Multi-Level Paging Problems
              </div>
              <div className="p-2 rounded bg-white/5 text-slate-400">
                • 12:00 - 13:30: Lunch &amp; Rest
              </div>
              <div className="p-2 rounded bg-white/5 text-slate-200">
                • 14:00 - 16:00: Research Lab: Edge LLM INT3 MSL Kernel Profiling
              </div>
              <div className="p-2 rounded bg-white/5 text-slate-200">
                • 16:30 - 17:00: Language Drill: German Spaced Repetition
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiProposal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
              >
                Dismiss
              </button>
              <button
                onClick={applyAiSchedule}
                disabled={proposalApproved}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/30 transition-all"
              >
                {proposalApproved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Applied!
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Approve &amp; Apply Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Time Block Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">Add Time Block</h2>
            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Block Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Graph Theory Derivations"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="focus">Focus Work</option>
                  <option value="course">Course Study</option>
                  <option value="research">Research Lab</option>
                  <option value="break">Buffer / Rest</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20"
                >
                  Save Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
