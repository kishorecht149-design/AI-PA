"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  CheckSquare,
  Plus,
  Play,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Circle,
  Folder,
  GraduationCap,
  Sparkles,
  Pause,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  project?: { id: string; name: string; color: string | null } | null;
  course?: { id: string; code: string; name: string } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban" | "myday">("list");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newEstimatedMin, setNewEstimatedMin] = useState("45");
  const [newDueDate, setNewDueDate] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [coursesList, setCoursesList] = useState<{ id: string; code: string; name: string }[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Focus Timer modal state
  const [activeFocusTask, setActiveFocusTask] = useState<TaskItem | null>(null);
  const [focusSecondsRemaining, setFocusSecondsRemaining] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedFocusMinutes, setElapsedFocusMinutes] = useState(0);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) setProjectsList(d.projects);
      })
      .catch(() => {});
    fetch("/api/academics")
      .then((r) => r.json())
      .then((d) => {
        if (d.courses) setCoursesList(d.courses);
      })
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          priority: newPriority,
          estimatedMinutes: parseInt(newEstimatedMin, 10) || 45,
          dueDate: newDueDate || null,
          projectId: newProjectId || null,
          courseId: newCourseId || null,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewProjectId("");
        setNewCourseId("");
        setShowCreateForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
    fetchTasks();
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const startFocusSession = (task: TaskItem) => {
    setActiveFocusTask(task);
    const mins = task.estimatedMinutes || 45;
    setFocusSecondsRemaining(mins * 60);
    setElapsedFocusMinutes(0);
    setIsTimerRunning(true);
  };

  const saveFocusSession = async () => {
    if (!activeFocusTask) return;
    const recordedMins = Math.max(1, Math.round(elapsedFocusMinutes));

    // Record persistent focus session and update task actual time
    try {
      await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeFocusTask.id,
          targetMinutes: activeFocusTask.estimatedMinutes || 45,
          actualMinutes: recordedMins,
          courseId: activeFocusTask.course?.id || null,
        }),
      });
    } catch (e) {
      console.error("Failed to record focus session:", e);
    }

    setIsTimerRunning(false);
    setActiveFocusTask(null);
    fetchTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    if (view === "myday") {
      return t.status !== "COMPLETED" && (t.priority === "HIGH" || t.priority === "URGENT");
    }
    return true;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED");

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "URGENT":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "HIGH":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "MEDIUM":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-cyan-400" />
            Task Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Vikunja & Super Productivity execution architecture with focus tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View tabs */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                view === "list" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                view === "kanban" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("myday")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                view === "myday" ? "bg-cyan-500 text-black font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              My Day
            </button>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 text-xs text-slate-400 overflow-x-auto pb-1">
        <span className="flex items-center gap-1.5 font-medium text-slate-300 shrink-0">
          <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter:
        </span>
        {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filterPriority === p
                ? "bg-white/10 border-cyan-400/40 text-cyan-300 font-medium"
                : "bg-white/5 border-transparent hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Quick Create Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b1120] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Solve 15 GATE CS questions on Paging"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Estimate (Minutes)
                  </label>
                  <input
                    type="number"
                    value={newEstimatedMin}
                    onChange={(e) => setNewEstimatedMin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">None</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Course (Optional)
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">None</option>
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Focus Timer Modal */}
      {activeFocusTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 md:p-8 text-center shadow-2xl relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Super Productivity Focus Session
            </div>

            <h2 className="text-base md:text-lg font-bold text-white line-clamp-2">
              {activeFocusTask.title}
            </h2>

            {/* Huge Timer Display */}
            <div className="my-8">
              <div className="text-5xl md:text-6xl font-mono font-bold text-cyan-400 tracking-wider">
                {formatTimer(focusSecondsRemaining)}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Actual time logged: {Math.round(elapsedFocusMinutes)} mins
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? "Pause Session" : "Resume"}</span>
              </button>

              <button
                onClick={saveFocusSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Finish & Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading tasks...</div>
      ) : view === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column: TODO */}
          <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-white/5 pb-2">
              <span>To Do</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px]">{todoTasks.length}</span>
            </div>
            <div className="space-y-2">
              {todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTaskStatus}
                  onDelete={handleDeleteTask}
                  onFocus={startFocusSession}
                  priorityBadge={priorityColor(task.priority)}
                />
              ))}
            </div>
          </div>

          {/* Column: IN PROGRESS */}
          <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 border-b border-white/5 pb-2">
              <span>In Progress</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[10px]">{inProgressTasks.length}</span>
            </div>
            <div className="space-y-2">
              {inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTaskStatus}
                  onDelete={handleDeleteTask}
                  onFocus={startFocusSession}
                  priorityBadge={priorityColor(task.priority)}
                />
              ))}
            </div>
          </div>

          {/* Column: COMPLETED */}
          <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 border-b border-white/5 pb-2">
              <span>Completed</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px]">{completedTasks.length}</span>
            </div>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTaskStatus}
                  onDelete={handleDeleteTask}
                  onFocus={startFocusSession}
                  priorityBadge={priorityColor(task.priority)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List / My Day View */
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500 space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p>No tasks found in this view.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-cyan-400 hover:underline"
              >
                Create your first task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                    aria-label="Toggle completion"
                  >
                    {task.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        task.status === "COMPLETED"
                          ? "line-through text-slate-500"
                          : "text-slate-100"
                      }`}
                    >
                      {task.title}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>

                      {task.course && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <GraduationCap className="w-3 h-3" />
                          {task.course.code}
                        </span>
                      )}

                      {task.project && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Folder className="w-3 h-3" />
                          {task.project.name}
                        </span>
                      )}

                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {task.actualMinutes}/{task.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.status !== "COMPLETED" && (
                    <button
                      onClick={() => startFocusSession(task)}
                      className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs flex items-center gap-1 transition-colors"
                      title="Start Focus Session"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">Focus</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onFocus,
  priorityBadge,
}: {
  task: TaskItem;
  onToggle: (t: TaskItem) => void;
  onDelete: (id: string) => void;
  onFocus: (t: TaskItem) => void;
  priorityBadge: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 space-y-2 group transition-all">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onToggle(task)}
          className="text-slate-500 hover:text-cyan-400 mt-0.5 shrink-0"
        >
          {task.status === "COMPLETED" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
        <div
          className={`flex-1 text-xs font-medium leading-snug ${
            task.status === "COMPLETED" ? "line-through text-slate-500" : "text-slate-200"
          }`}
        >
          {task.title}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-[10px]">
        <span className={`px-1.5 py-0.5 rounded-full border ${priorityBadge}`}>
          {task.priority}
        </span>

        <div className="flex items-center gap-1">
          {task.status !== "COMPLETED" && (
            <button
              onClick={() => onFocus(task)}
              className="p-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
              title="Focus timer"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-slate-600 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
