"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  CheckSquare,
  GraduationCap,
  Microscope,
  BookOpen,
  FileText,
  Bot,
  Settings,
  X,
  Plus,
} from "lucide-react";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open through custom event if needed
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  const quickLinks = [
    { name: "Planner & Time Blocks", path: "/planner", icon: Calendar, category: "Navigation" },
    { name: "Task Backlog & Kanban", path: "/tasks", icon: CheckSquare, category: "Navigation" },
    { name: "Academic Courses & Syllabus", path: "/academics", icon: GraduationCap, category: "Navigation" },
    { name: "Research Lab & Papers", path: "/research", icon: Microscope, category: "Navigation" },
    { name: "Learning Studio (8 Languages & GK)", path: "/learning", icon: BookOpen, category: "Navigation" },
    { name: "Knowledge Base & Notes", path: "/notes", icon: FileText, category: "Navigation" },
    { name: "Ask Assistant with Authorized Tools", path: "/assistant", icon: Bot, category: "Intelligence" },
    { name: "Settings & AI Models Gateway", path: "/settings", icon: Settings, category: "Settings" },
  ];

  const filtered = quickLinks.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#0b1120] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, feature, or navigate..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-md"
            aria-label="Close command bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Suggestion if typing task */}
        {query.trim().length > 2 && (
          <div className="px-3 pt-2">
            <button
              onClick={() => {
                router.push(`/tasks?quickCreate=${encodeURIComponent(query)}`);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task: &quot;{query}&quot;</span>
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-xs text-slate-200 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 text-slate-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{item.category}</span>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching destinations found for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with mouse or Tab</span>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
}
