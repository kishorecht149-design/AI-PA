"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "./Navigation";
import { CommandBar } from "./CommandBar";
import { usePathname } from "next/navigation";

export function AppShell({
  children,
  userName = "Kishore Kumar",
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

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

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#070b14]">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col md:flex-row">
      <Navigation
        userName={userName}
        onOpenCommandBar={() => setCommandBarOpen(true)}
      />

      <div className="flex-1 md:pl-64 flex flex-col min-w-0 transition-all duration-200">
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
