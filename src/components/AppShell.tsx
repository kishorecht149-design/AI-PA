"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "./Navigation";
import { CommandBar } from "./CommandBar";
import { usePathname } from "next/navigation";

import { NotificationAlarmEngine } from "./notifications/NotificationAlarmEngine";
import { NotificationBell } from "./notifications/NotificationBell";

export function AppShell({
  children,
  userName = "Student",
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const pathname = usePathname();

  const isFullWidthPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isFullWidthPage) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-150">
        <NotificationAlarmEngine />
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col md:flex-row transition-colors duration-150">
      <NotificationAlarmEngine />

      <Navigation
        userName={userName}
        onOpenCommandBar={() => setCommandBarOpen(true)}
      />

      <div className="flex-1 md:pl-64 flex flex-col min-w-0 transition-all duration-200">
        {/* Desktop Top Header with Live Notification Bell & Global Command shortcut */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 font-mono tracking-wider uppercase">
              AMAHAS Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandBarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>Command Bar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black text-[10px] text-zinc-500 font-mono border border-zinc-800">
                ⌘K
              </kbd>
            </button>

            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
      />
    </div>
  );
}
export default AppShell;
