"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  ArrowRight,
  Layers,
  Calendar,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  priority: string;
  category: string;
  color: string | null;
  totalTasks: number;
  completedTasks: number;
  calculatedProgress: number;
  milestones: { id: string; title: string; completed: boolean }[];
  tasks: { id: string; title: string; status: string; priority: string }[];
}

const STARTER_PROJECT_TEMPLATES = [
  {
    name: "Autonomous AI System Architecture",
    objective: "Design and implement low-latency microservices with local LLM orchestration and vector retrieval.",
    category: "technical",
  },
  {
    name: "Literature Review & Empirical Survey",
    objective: "Synthesize 20+ peer-reviewed papers on edge model quantization and prepare conference draft.",
    category: "research",
  },
  {
    name: "Core Engineering Mastery Sprint",
    objective: "Review fundamental systems architecture, operating systems paging, and distributed algorithms.",
    category: "academic",
  },
  {
    name: "Quarterly Deep Work & Discipline",
    objective: "Establish 90-minute morning deep work sprint daily without context switching.",
    category: "personal",
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newCategory, setNewCategory] = useState("technical");
  const [submitting, setSubmitting] = useState(false);

  // Quick task creation inside project
  const [activeTaskProjectId, setActiveTaskProjectId] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);

    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          objective: newObjective.trim() || null,
          category: newCategory,
        }),
      });

      setNewName("");
      setNewObjective("");
      setShowCreate(false);
      fetchProjects();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStarter = async (template: typeof STARTER_PROJECT_TEMPLATES[0]) => {
    setSubmitting(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      fetchProjects();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const handleAddQuickTask = async (projectId: string) => {
    if (!quickTaskTitle.trim()) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          projectId,
          priority: "HIGH",
          estimatedMinutes: 45,
        }),
      });
      setQuickTaskTitle("");
      setActiveTaskProjectId(null);
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-white" />
            Projects &amp; Milestones
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Measurable criteria execution across academic, research, and technical initiatives.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        /* Empty State with 1-Click Starter Templates */
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="p-8 md:p-10 rounded-3xl border border-zinc-800 bg-[#0a0a0a] text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
              <FolderKanban className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">Start Your First Project</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Coordinate complex objectives, link actionable tasks, and monitor completion progress in real time.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Custom Project
              </button>
            </div>
          </div>

          {/* Quick Starter Templates */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Or Choose a 1-Click Starter Project Template</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STARTER_PROJECT_TEMPLATES.map((tmpl, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCreateStarter(tmpl)}
                  className="p-4 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {tmpl.category}
                    </span>
                    <h3 className="text-xs font-bold text-white group-hover:text-zinc-200">
                      {tmpl.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-light line-clamp-2">
                      {tmpl.objective}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-white transition-colors">
                    <span>Initialize Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-5 md:p-6 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {p.category}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">{p.name}</h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-white bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 font-mono">
                    {p.calculatedProgress}%
                  </span>
                  <button
                    onClick={() => handleDeleteProject(p.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {p.objective && (
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  {p.objective}
                </p>
              )}

              {/* Measurable Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>Task Execution</span>
                  <span>
                    {p.completedTasks} / {p.totalTasks} completed
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${p.calculatedProgress}%` }}
                  />
                </div>
              </div>

              {/* Tasks preview & inline task adder */}
              <div className="pt-2 border-t border-zinc-900 space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  <span>Action Items ({p.tasks.length})</span>
                  <button
                    onClick={() => setActiveTaskProjectId(activeTaskProjectId === p.id ? null : p.id)}
                    className="text-white hover:underline flex items-center gap-1 font-medium capitalize"
                  >
                    <Plus className="w-3 h-3" /> Add Task
                  </button>
                </div>

                {activeTaskProjectId === p.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddQuickTask(p.id);
                    }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      placeholder="Task title (e.g. Write integration test suite)"
                      className="flex-1 bg-[#121212] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!quickTaskTitle.trim()}
                      className="px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs disabled:opacity-50"
                    >
                      Add
                    </button>
                  </form>
                )}

                {p.tasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="text-xs text-zinc-300 flex items-center justify-between py-0.5"
                  >
                    <span className="truncate text-zinc-400">• {t.title}</span>
                    <span className="text-[10px] text-zinc-600 uppercase font-mono ml-2 shrink-0">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-white" /> Create Project
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Objective &amp; Target Criteria
                </label>
                <textarea
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  rows={3}
                  placeholder="Measurable goal, key milestones, and completion criteria..."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                >
                  <option value="technical">Technical Implementation</option>
                  <option value="research">Research &amp; Papers</option>
                  <option value="academic">Academic Coursework</option>
                  <option value="personal">Personal Growth</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
