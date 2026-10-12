"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  CheckSquare,
  FolderKanban,
  GraduationCap,
  Microscope,
  BookOpen,
  FileText,
  Flame,
  Target,
  BarChart3,
  Bot,
  Layers,
  Workflow,
  Settings,
  Menu,
  X,
  Search,
  Sparkles,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Core",
    items: [{ name: "Home", href: "/", icon: Home }],
  },
  {
    group: "Execution",
    items: [
      { name: "Planner", href: "/planner", icon: Calendar },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    group: "Academics & Research",
    items: [
      { name: "Academics", href: "/academics", icon: GraduationCap },
      { name: "Research Lab", href: "/research", icon: Microscope },
    ],
  },
  {
    group: "Knowledge & Growth",
    items: [
      { name: "Learning Studio", href: "/learning", icon: BookOpen },
      { name: "Notes", href: "/notes", icon: FileText },
      { name: "Habits", href: "/habits", icon: Flame },
      { name: "Goals", href: "/goals", icon: Target },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Intelligence & Hub",
    items: [
      { name: "Assistant", href: "/assistant", icon: Bot },
      { name: "Integrations", href: "/integrations", icon: Layers },
      { name: "Automations", href: "/automations", icon: Workflow },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Navigation({
  userName = "Student",
  onOpenCommandBar,
}: {
  userName?: string;
  onOpenCommandBar?: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // If on login/signup pages, don't render navigation shell
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/10 bg-[#070b14]/90 backdrop-blur-md transition-all duration-200 z-30 fixed top-0 bottom-0 left-0 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
              A
            </div>
            {!collapsed && (
              <div>
                <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  AMAHAS
                </span>
                <span className="block text-[10px] text-cyan-400 tracking-widest uppercase">
                  Student OS
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar collapse"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>

        {/* Global Search Shortcut */}
        {!collapsed ? (
          <div className="p-3">
            <button
              onClick={onOpenCommandBar}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 border border-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" /> Search & Command
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-slate-400 border border-white/10">
                ⌘K
              </kbd>
            </button>
          </div>
        ) : (
          <div className="p-2 flex justify-center">
            <button
              onClick={onOpenCommandBar}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400"
              title="Command Bar (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {grp.group}
                </div>
              )}
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold shadow-sm shadow-cyan-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`}
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-cyan-900/60 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-300 font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-slate-200 truncate">
                  {userName}
                </div>
                <div className="text-[10px] text-slate-500">Student Account</div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-full bg-cyan-900/60 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-300 font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Sign out"
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-[#070b14]/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-bold text-xs tracking-wider text-white">AMAHAS</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCommandBar}
            className="p-2 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-white/5"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <Link
            href="/assistant"
            className="p-2 text-violet-400 hover:text-violet-300 rounded-lg hover:bg-white/5"
            aria-label="Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Open menu drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (When More/Menu is open) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-[#070b14]/95 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="space-y-6 pb-20">
            {NAV_GROUPS.map((grp) => (
              <div key={grp.group} className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {grp.group}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Signed in as {userName}</span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (Always accessible thumbs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#070b14]/95 backdrop-blur-lg border-t border-white/10 px-3 flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname === "/" ? "text-cyan-400 font-semibold" : "text-slate-400"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/planner"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/planner") ? "text-cyan-400 font-semibold" : "text-slate-400"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Planner</span>
        </Link>
        <Link
          href="/tasks"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/tasks") ? "text-cyan-400 font-semibold" : "text-slate-400"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks</span>
        </Link>
        <Link
          href="/academics"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/academics") ? "text-cyan-400 font-semibold" : "text-slate-400"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Academics</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileMenuOpen ? "text-cyan-400 font-semibold" : "text-slate-400"
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
