"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Target,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newCategory, setNewCategory] = useState("academic");

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

    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        objective: newObjective,
        category: newCategory,
      }),
    });

    setNewName("");
    setNewObjective("");
    setShowCreate(false);
    fetchProjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-cyan-400" />
            Projects &amp; Milestones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Measurable criteria execution across academic, research, and technical initiatives.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500 space-y-2">
          <FolderKanban className="w-8 h-8 mx-auto text-slate-600" />
          <p>No active projects registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-[#0b1120] border border-white/5 hover:border-white/15 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-white/5 text-cyan-400">
                    {p.category}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1.5">{p.name}</h2>
                </div>
                <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                  {p.calculatedProgress}%
                </span>
              </div>

              {p.objective && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {p.objective}
                </p>
              )}

              {/* Measurable Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Task Execution</span>
                  <span>
                    {p.completedTasks} / {p.totalTasks} completed
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${p.calculatedProgress}%` }}
                  />
                </div>
              </div>

              {/* Tasks preview */}
              {p.tasks.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Recent Action Items
                  </div>
                  {p.tasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      className="text-xs text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">• {t.title}</span>
                      <span className="text-[10px] text-slate-500 uppercase ml-2 shrink-0">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Distributed Systems Lab Project"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Objective
                </label>
                <textarea
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  rows={3}
                  placeholder="Measurable goal and target completion criteria..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
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
                  <option value="academic">Academic Coursework</option>
                  <option value="research">Research &amp; Papers</option>
                  <option value="technical">Technical Implementation</option>
                  <option value="personal">Personal Growth</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
