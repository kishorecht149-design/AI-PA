"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Plus,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Circle,
  Folder,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Filter,
  Check,
  Search,
  ExternalLink,
  BookOpen,
  FileCheck,
  Layers,
  X,
} from "lucide-react";
import Link from "next/link";
import { isValidGoogleDriveUrl, MANDATORY_ATTESTATION_TEXT } from "@/lib/ese/schedule-generator";

export type UnifiedView = "today" | "calendar" | "all-tasks" | "upcoming" | "unscheduled";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  scheduledDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  externalSource?: string | null;
  eseNodeId?: string | null;
  eseDayNumber?: number | null;
  eseTaskType?: string | null;
  evidenceUrl?: string | null;
  evidenceAttested?: boolean;
  project?: { id: string; name: string; color: string | null } | null;
  course?: { id: string; code: string; name: string } | null;
}

interface TimeBlockItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  isFixed: boolean;
  completed: boolean;
  taskId?: string | null;
  task?: TaskItem | null;
}

interface ConflictItem {
  blockA: string;
  blockB: string;
  time: string;
  severity?: "WARNING" | "CRITICAL";
}

export function UnifiedTasksPlanner({
  defaultView = "today",
}: {
  defaultView?: UnifiedView;
}) {
  const [activeView, setActiveView] = useState<UnifiedView>(defaultView);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sub-views
  const [tasksSubView, setTasksSubView] = useState<"list" | "kanban">("list");
  const [calendarSubView, setCalendarSubView] = useState<"day" | "week" | "agenda">("day");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Form
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newEstimatedMin, setNewEstimatedMin] = useState("45");
  const [newDueDate, setNewDueDate] = useState("");
  const [newScheduledDate, setNewScheduledDate] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [coursesList, setCoursesList] = useState<{ id: string; code: string; name: string }[]>([]);

  // Create TimeBlock Form
  const [showCreateBlock, setShowCreateBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockStart, setNewBlockStart] = useState("09:00");
  const [newBlockEnd, setNewBlockEnd] = useState("10:30");
  const [newBlockCategory, setNewBlockCategory] = useState("focus");

  // Focus Timer
  const [activeFocusTask, setActiveFocusTask] = useState<TaskItem | null>(null);
  const [focusSecondsRemaining, setFocusSecondsRemaining] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedFocusMinutes, setElapsedFocusMinutes] = useState(0);

  // ESE Completion & Evidence Modal
  const [evidenceModalTask, setEvidenceModalTask] = useState<TaskItem | null>(null);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Load all tasks and planner state
  const refreshData = async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/planner"),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();

      if (tData.tasks) setTasks(tData.tasks);
      if (pData.timeBlocks) setTimeBlocks(pData.timeBlocks);
      if (pData.conflicts) setConflicts(pData.conflicts);
    } catch (err) {
      console.error("Failed to load Tasks & Planner data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => d.projects && setProjectsList(d.projects))
      .catch(() => {});
    fetch("/api/academics")
      .then((r) => r.json())
      .then((d) => d.courses && setCoursesList(d.courses))
      .catch(() => {});
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && focusSecondsRemaining > 0) {
      interval = setInterval(() => {
        setFocusSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsedFocusMinutes((prev) => prev + 1 / 60);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, focusSecondsRemaining]);

  // Handle task status change
  const handleToggleTaskStatus = async (task: TaskItem) => {
    const isEseTask = task.externalSource === "ESE_600_DAY_PLAN" || !!task.eseNodeId;

    if (task.status !== "COMPLETED") {
      if (isEseTask) {
        // Open mandatory evidence modal
        setEvidenceModalTask(task);
        setDriveUrlInput(task.evidenceUrl || "");
        setAttestationConfirmed(task.evidenceAttested || false);
        setEvidenceError(null);
        return;
      }

      // Normal task completion
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: "COMPLETED" }),
      });
    } else {
      // Revert to TODO
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: "TODO" }),
      });
    }
    refreshData();
  };

  // Submit ESE evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceModalTask) return;

    if (!driveUrlInput || !isValidGoogleDriveUrl(driveUrlInput)) {
      setEvidenceError("Please enter a valid Google Drive or Google Docs URL (e.g. drive.google.com/file/d/...).");
      return;
    }
    if (!attestationConfirmed) {
      setEvidenceError(`You must confirm: "${MANDATORY_ATTESTATION_TEXT}"`);
      return;
    }

    setSubmittingEvidence(true);
    setEvidenceError(null);

    try {
      const res = await fetch("/api/ese/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: evidenceModalTask.id,
          driveUrl: driveUrlInput.trim(),
          attestationConfirmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete study task with evidence.");
      }

      setEvidenceModalTask(null);
      refreshData();
    } catch (err: any) {
      setEvidenceError(err.message);
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        priority: newPriority,
        estimatedMinutes: parseInt(newEstimatedMin, 10) || 45,
        dueDate: newDueDate || null,
        scheduledDate: newScheduledDate || null,
        projectId: newProjectId || null,
        courseId: newCourseId || null,
      }),
    });

    setNewTitle("");
    setShowCreateTask(false);
    refreshData();
  };

  // Create TimeBlock
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().substring(0, 10);
    const startIso = `${today}T${newBlockStart}:00.000Z`;
    const endIso = `${today}T${newBlockEnd}:00.000Z`;

    await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newBlockTitle || "Focus Block",
        startTime: startIso,
        endTime: endIso,
        category: newBlockCategory,
      }),
    });

    setNewBlockTitle("");
    setShowCreateBlock(false);
    refreshData();
  };

  // Quick schedule backlog task to calendar
  const handleScheduleTask = async (task: TaskItem) => {
    const today = new Date().toISOString().substring(0, 10);
    const start = new Date();
    start.setMinutes(start.getMinutes() + 15);
    const duration = task.estimatedMinutes || 45;
    const end = new Date(start.getTime() + duration * 60000);

    // Update task scheduledDate
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        scheduledDate: start.toISOString(),
      }),
    });

    // Create linked TimeBlock
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

    refreshData();
  };

  // Derived datasets
  const localDate = new Date();
  const localTodayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  const utcTodayStr = localDate.toISOString().substring(0, 10);

  const isTodayDate = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const sub = dateStr.substring(0, 10);
    return sub === localTodayStr || sub === utcTodayStr;
  };

  const todayTasks = tasks.filter((t) => {
    if (isTodayDate(t.scheduledDate) || isTodayDate(t.dueDate)) return true;
    return false;
  });

  const todayBlocks = timeBlocks.filter(
    (b) => isTodayDate(b.startTime)
  );

  const unscheduledTasks = tasks.filter(
    (t) => !t.scheduledDate && t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );

  const upcomingTasks = tasks.filter((t) => {
    if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
    const dateVal = t.scheduledDate || t.dueDate;
    if (!dateVal) return false;
    const sub = dateVal.substring(0, 10);
    return !isTodayDate(dateVal) && (sub > localTodayStr || sub > utcTodayStr);
  });

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Header & Unified View Switcher */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/70 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[var(--accent-primary)]" />
              Tasks &amp; Planner
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold border border-[var(--accent-primary)]/20">
              Unified
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Synchronized schedule, backlog, calendar timeline, and ESE study mastery
          </p>
        </div>

        {/* View Switcher Tabs (Accessible on Mobile & Desktop) */}
        <div className="flex items-center p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] overflow-x-auto">
          {[
            { id: "today", label: "Today", icon: Clock },
            { id: "calendar", label: "Calendar", icon: CalendarIcon },
            { id: "all-tasks", label: "All Tasks", icon: CheckSquare },
            { id: "upcoming", label: "Upcoming", icon: ArrowRight },
            { id: "unscheduled", label: "Unscheduled", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as UnifiedView)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--accent-primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === "unscheduled" && unscheduledTasks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400">
                    {unscheduledTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <button
            onClick={() => setShowCreateBlock(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--border)]/40 transition-colors"
          >
            <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>New Block</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--text-muted)]">Loading tasks &amp; schedule...</p>
          </div>
        ) : (
          <>
            {/* VIEW 1: TODAY */}
            {activeView === "today" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Today's Scheduled Tasks */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                      Today&apos;s Focus &amp; Scheduled Tasks ({todayTasks.length})
                    </h2>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-center space-y-4">
                      <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">No tasks scheduled for today</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {tasks.length > 0
                            ? `You have ${tasks.length} total tasks in your workspace. Schedule pending tasks below or explore your ESE 600-Day Plan.`
                            : "Create a new task, schedule items from your backlog, or activate your ESE 600-Day Study Plan."}
                        </p>
                      </div>

                      {unscheduledTasks.length > 0 && (
                        <div className="pt-2 text-left space-y-2 border-t border-[var(--border)]">
                          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            Unscheduled Backlog ({unscheduledTasks.length}):
                          </p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {unscheduledTasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="font-medium truncate">{task.title}</span>
                                <button
                                  onClick={() => handleScheduleTask(task)}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-white text-[10px] font-semibold hover:opacity-90 shrink-0"
                                >
                                  Schedule Today
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => setActiveView("all-tasks")}
                          className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] hover:bg-[var(--border)]"
                        >
                          View All Tasks ({tasks.length})
                        </button>
                        <Link
                          href="/academics/ese"
                          className="px-3 py-1.5 text-xs rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                        >
                          View ESE 600-Day Plan
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                  {todayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggleStatus={() => handleToggleTaskStatus(task)}
                      onStartFocus={() => {
                        setActiveFocusTask(task);
                        setFocusSecondsRemaining((task.estimatedMinutes || 45) * 60);
                        setIsTimerRunning(true);
                      }}
                      onOpenEvidenceModal={() => {
                        setEvidenceModalTask(task);
                        setDriveUrlInput(task.evidenceUrl || "");
                        setAttestationConfirmed(task.evidenceAttested || false);
                        setEvidenceError(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Today's Timeline TimeBlocks & Focus */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Today&apos;s Time Blocks ({todayBlocks.length})
              </h2>

              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                {todayBlocks.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">
                    No time blocks created for today. Click &quot;New Block&quot; to schedule focus time.
                  </p>
                ) : (
                  todayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{block.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(block.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {new Date(block.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                        {block.category}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Active Focus Session Widget */}
              {activeFocusTask && (
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Focus Timer
                    </span>
                    <button
                      onClick={() => setActiveFocusTask(null)}
                      className="text-[var(--text-muted)] hover:text-white text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-xs font-medium truncate">{activeFocusTask.title}</p>
                  <div className="text-3xl font-mono font-bold text-center py-2 text-indigo-300">
                    {Math.floor(focusSecondsRemaining / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(focusSecondsRemaining % 60).toString().padStart(2, "0")}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white flex items-center gap-1"
                    >
                      {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isTimerRunning ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => setFocusSecondsRemaining((activeFocusTask.estimatedMinutes || 45) * 60)}
                      className="p-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CALENDAR TIMELINE */}
        {activeView === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Calendar &amp; Schedule Timeline</h2>
                <div className="flex items-center p-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs">
                  {(["day", "week", "agenda"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCalendarSubView(mode)}
                      className={`px-2.5 py-1 rounded font-medium capitalize ${
                        calendarSubView === mode ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conflict detection notice */}
            {conflicts.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Detected {conflicts.length} schedule conflict(s): {conflicts[0].blockA} overlaps with {conflicts[0].blockB}.
                </span>
              </div>
            )}

            {/* Calendar Blocks Display */}
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-4">
              {timeBlocks.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-12">
                  No time blocks or scheduled sessions found. Add a block or schedule tasks.
                </p>
              ) : (
                <div className="space-y-3">
                  {timeBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-10 rounded-full bg-[var(--accent-primary)]" />
                        <div>
                          <p className="text-sm font-semibold">{block.title}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {new Date(block.startTime).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            – {new Date(block.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.completed ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Completed
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: ALL TASKS (LIST & KANBAN) */}
        {activeView === "all-tasks" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">All Workspace Tasks ({filteredTasks.length})</h2>
                <div className="flex items-center p-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs">
                  <button
                    onClick={() => setTasksSubView("list")}
                    className={`px-2.5 py-1 rounded font-medium ${
                      tasksSubView === "list" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setTasksSubView("kanban")}
                    className={`px-2.5 py-1 rounded font-medium ${
                      tasksSubView === "kanban" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    Kanban
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            {/* List Mode */}
            {tasksSubView === "list" && (
              <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] py-12">
                    No tasks match the active filters.
                  </p>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggleStatus={() => handleToggleTaskStatus(task)}
                      onStartFocus={() => {
                        setActiveFocusTask(task);
                        setFocusSecondsRemaining((task.estimatedMinutes || 45) * 60);
                        setIsTimerRunning(true);
                      }}
                      onOpenEvidenceModal={() => {
                        setEvidenceModalTask(task);
                        setDriveUrlInput(task.evidenceUrl || "");
                        setAttestationConfirmed(task.evidenceAttested || false);
                        setEvidenceError(null);
                      }}
                    />
                  ))
                )}
              </div>
            )}

            {/* Kanban Mode */}
            {tasksSubView === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["TODO", "IN_PROGRESS", "COMPLETED"] as const).map((colStatus) => {
                  const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                  return (
                    <div
                      key={colStatus}
                      className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                        <span className="text-xs font-semibold capitalize">
                          {colStatus.replace("_", " ")} ({colTasks.length})
                        </span>
                      </div>
                      <div className="space-y-2 min-h-[200px]">
                        {colTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] space-y-2 text-xs"
                          >
                            <p className="font-semibold line-clamp-2">{task.title}</p>
                            {task.eseNodeId && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 font-mono">
                                ESE Plan
                              </span>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {task.estimatedMinutes || 45}m
                              </span>
                              <button
                                onClick={() => handleToggleTaskStatus(task)}
                                className="text-[10px] font-medium text-[var(--accent-primary)] hover:underline"
                              >
                                {colStatus === "COMPLETED" ? "Mark Todo" : "Complete"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: UPCOMING */}
        {activeView === "upcoming" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Upcoming Scheduled Work ({upcomingTasks.length})</h2>
            {upcomingTasks.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-muted)] py-12">
                No upcoming scheduled tasks.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleStatus={() => handleToggleTaskStatus(task)}
                    onStartFocus={() => {
                      setActiveFocusTask(task);
                      setFocusSecondsRemaining((task.estimatedMinutes || 45) * 60);
                      setIsTimerRunning(true);
                    }}
                    onOpenEvidenceModal={() => {
                      setEvidenceModalTask(task);
                      setDriveUrlInput(task.evidenceUrl || "");
                      setAttestationConfirmed(task.evidenceAttested || false);
                      setEvidenceError(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: UNSCHEDULED BACKLOG */}
        {activeView === "unscheduled" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Unscheduled Task Backlog ({unscheduledTasks.length})</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Tasks without a scheduled calendar date. 1-click schedule into today&apos;s agenda.
                </p>
              </div>
            </div>

            {unscheduledTasks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-center text-sm text-[var(--text-muted)]">
                All tasks are currently scheduled! Your backlog is clean.
              </div>
            ) : (
              <div className="space-y-2">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{task.title}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{task.description}</p>
                    </div>
                    <button
                      onClick={() => handleScheduleTask(task)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 whitespace-nowrap"
                    >
                      Schedule Today
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>
      )}
      </main>

      {/* CREATE TASK MODAL */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold">New Task</h3>
              <button
                onClick={() => setShowCreateTask(false)}
                className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Derive state equations for RLC circuit"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    value={newEstimatedMin}
                    onChange={(e) => setNewEstimatedMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Project (Optional)</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  >
                    <option value="">No Project</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Course (Optional)</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  >
                    <option value="">No Course</option>
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} – {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-semibold hover:opacity-90"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TIME BLOCK MODAL */}
      {showCreateBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold">New Time Block</h3>
              <button
                onClick={() => setShowCreateBlock(false)}
                className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBlock} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Block Title</label>
                <input
                  type="text"
                  required
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  placeholder="e.g. Morning Focus Session"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">End Time</label>
                  <input
                    type="time"
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateBlock(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-semibold hover:opacity-90"
                >
                  Schedule Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY ESE COMPLETION EVIDENCE MODAL */}
      {evidenceModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="text-base font-bold">Mandatory Study Notes Evidence</h3>
              </div>
              <button
                onClick={() => setEvidenceModalTask(null)}
                className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border)] space-y-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">{evidenceModalTask.title}</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                To mark this ESE study task as completed, you must provide your verified Google Drive notes file URL.
              </p>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Google Drive / Docs File URL *
                </label>
                <input
                  type="url"
                  required
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent-primary)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Supports drive.google.com or docs.google.com links. Contents are user-attested.
                </p>
              </div>

              {/* Mandatory Attestation Checkbox */}
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="attestation-checkbox"
                  checked={attestationConfirmed}
                  onChange={(e) => setAttestationConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--border)] text-[var(--accent-primary)] focus:ring-0"
                />
                <label
                  htmlFor="attestation-checkbox"
                  className="text-xs font-medium text-[var(--text-primary)] leading-relaxed cursor-pointer"
                >
                  &ldquo;{MANDATORY_ATTESTATION_TEXT}&rdquo;
                </label>
              </div>

              {evidenceError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {evidenceError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Link will automatically sync to ESE Resources.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceModalTask(null)}
                    className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--border)] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEvidence}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingEvidence ? "Saving..." : "Verify & Complete"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggleStatus,
  onStartFocus,
  onOpenEvidenceModal,
}: {
  task: TaskItem;
  onToggleStatus: () => void;
  onStartFocus: () => void;
  onOpenEvidenceModal: () => void;
}) {
  const isCompleted = task.status === "COMPLETED";
  const isEseTask = task.externalSource === "ESE_600_DAY_PLAN" || !!task.eseNodeId;

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
        isCompleted
          ? "border-[var(--border)] bg-[var(--bg-card)]/40 opacity-70"
          : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={onToggleStatus}
          className={`p-1 rounded-full shrink-0 transition-colors ${
            isCompleted
              ? "text-emerald-400"
              : "text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
          }`}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`font-semibold truncate text-[var(--text-primary)] ${
                isCompleted ? "line-through text-[var(--text-muted)]" : ""
              }`}
            >
              {task.title}
            </p>
            {isEseTask && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ESE Study Task
              </span>
            )}
            {task.priority === "URGENT" && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                URGENT
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mt-1 flex-wrap">
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
            )}
            {task.scheduledDate && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Scheduled: {task.scheduledDate.substring(0, 10)}
              </span>
            )}
            {task.evidenceUrl && (
              <a
                href={task.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[var(--accent-primary)] hover:underline font-medium"
              >
                <FileCheck className="w-3 h-3" />
                Notes Evidence Verified <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {isEseTask && !task.evidenceUrl && !isCompleted && (
              <button
                onClick={onOpenEvidenceModal}
                className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <FileCheck className="w-3 h-3" />
                Attach Drive Notes
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isCompleted && (
          <button
            onClick={onStartFocus}
            title="Start Focus Timer"
            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--border)]/60"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
