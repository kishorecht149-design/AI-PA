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
  Palette,
  Check,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";
import { useTheme } from "@/lib/themes/theme-provider";
import { ThemeId } from "@/lib/themes/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Core",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Portal", href: "/", icon: Sparkles },
    ],
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
  const [quickThemeOpen, setQuickThemeOpen] = useState(false);

  const { theme, themeId, setTheme, allThemes } = useTheme();

  // If on login/signup pages, don't render navigation shell
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] backdrop-blur-md transition-all duration-200 z-30 fixed top-0 bottom-0 left-0 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center overflow-hidden">
            <AmahasLogo
              variant={collapsed ? "symbol" : "sidebar"}
              size={collapsed ? "md" : "sm"}
              className="py-1"
            />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar collapse"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors flex-shrink-0"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>

        {/* Global Search & Quick Theme Shortcut */}
        {!collapsed ? (
          <div className="p-3 space-y-2">
            <button
              onClick={onOpenCommandBar}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--input-bg)] hover:bg-[var(--border)] text-xs text-[var(--text-secondary)] border border-[var(--border)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Search & Command
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[10px] text-[var(--text-muted)] border border-[var(--border)]">
                ⌘K
              </kbd>
            </button>
          </div>
        ) : (
          <div className="p-2 flex flex-col items-center gap-2">
            <button
              onClick={onOpenCommandBar}
              className="p-2.5 rounded-lg bg-[var(--input-bg)] hover:bg-[var(--border)] text-[var(--accent-primary)] transition-colors"
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
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
                        ? "bg-[var(--badge-bg)] text-[var(--accent-primary)] border border-[var(--border-focus)] font-semibold shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
                      }`}
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quick Theme Switcher Popover Overlay */}
        {quickThemeOpen && (
          <div
            className={`absolute bottom-16 ${
              collapsed ? "left-20" : "left-3 right-3"
            } z-50 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150`}
            style={{ width: collapsed ? "260px" : "auto" }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Quick Theme
              </span>
              <Link
                href="/settings#appearance"
                onClick={() => setQuickThemeOpen(false)}
                className="text-[10px] text-[var(--accent-primary)] hover:underline"
              >
                All 24 in Settings →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {allThemes.slice(0, 10).map((t) => {
                const isSelected = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-[11px] border transition-all ${
                      isSelected
                        ? "border-[var(--accent-primary)] bg-[var(--badge-bg)] font-semibold"
                        : "border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-black/20"
                      style={{ backgroundColor: t.tokens.accentPrimary }}
                    />
                    <span className="truncate">{t.name}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 ml-auto text-[var(--accent-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Profile, Theme Palette & Logout Footer */}
        <div className="p-3 border-t border-[var(--border)] flex items-center justify-between gap-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden flex-1">
              <div className="w-8 h-8 rounded-full bg-[var(--badge-bg)] border border-[var(--border-focus)] flex items-center justify-center text-xs text-[var(--accent-primary)] font-semibold flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {userName}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{theme.name}</div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-full bg-[var(--badge-bg)] border border-[var(--border-focus)] flex items-center justify-center text-xs text-[var(--accent-primary)] font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickThemeOpen(!quickThemeOpen)}
              title="Quick Theme Selector"
              className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
            >
              <Palette className="w-4 h-4" />
            </button>

            {!collapsed && (
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  title="Sign out"
                  className="text-[var(--text-muted)] hover:text-red-400 p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-[var(--bg-sidebar)] backdrop-blur-md border-b border-[var(--border)] px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <AmahasLogo variant="compact" size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickThemeOpen(!quickThemeOpen)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] rounded-lg hover:bg-[var(--border)]"
            title="Theme"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCommandBar}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]"
            aria-label="Open command bar"
          >
            <Search className="w-4 h-4" />
          </button>
          <Link
            href="/assistant"
            className="p-2 text-[var(--accent-secondary)] hover:opacity-80 rounded-lg hover:bg-[var(--border)]"
            aria-label="Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]"
            aria-label="Open menu drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Quick Theme Dropdown Drawer */}
      {quickThemeOpen && (
        <div className="md:hidden fixed inset-x-3 top-16 z-50 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--accent-primary)]" /> Appearance Themes
            </span>
            <button
              onClick={() => setQuickThemeOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {allThemes.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setQuickThemeOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs border transition-all ${
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--badge-bg)] font-semibold text-[var(--text-primary)]"
                      : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/20"
                    style={{ backgroundColor: t.tokens.accentPrimary }}
                  />
                  <span className="truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Drawer (When More/Menu is open) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-[var(--bg-primary)] backdrop-blur-xl p-4 overflow-y-auto">
          <div className="space-y-6 pb-20">
            {NAV_GROUPS.map((grp) => (
              <div key={grp.group} className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
                            ? "bg-[var(--badge-bg)] border-[var(--border-focus)] text-[var(--accent-primary)]"
                            : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Signed in as {userName}</span>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[var(--bg-sidebar)] backdrop-blur-lg border-t border-[var(--border)] px-3 flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname === "/" ? "text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)]"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/planner"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/planner")
              ? "text-[var(--accent-primary)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Planner</span>
        </Link>
        <Link
          href="/tasks"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/tasks")
              ? "text-[var(--accent-primary)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks</span>
        </Link>
        <Link
          href="/academics"
          className={`flex flex-col items-center gap-1 text-[10px] ${
            pathname.startsWith("/academics")
              ? "text-[var(--accent-primary)] font-semibold"
              : "text-[var(--text-muted)]"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Academics</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center gap-1 text-[10px] ${
            mobileMenuOpen ? "text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)]"
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
export default Navigation;
