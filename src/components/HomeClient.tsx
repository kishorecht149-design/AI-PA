"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getHourlyContent,
  getTimeOfDayGreeting,
  HourlyQuote,
} from "@/lib/hourly-quotes";
import {
  Calendar,
  CheckSquare,
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
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface HomeClientProps {
  userName: string;
}

export function HomeClient({ userName }: HomeClientProps) {
  const [content, setContent] = useState<{
    quote: HourlyQuote;
    message: string;
    dateString: string;
  }>(() => getHourlyContent(new Date()));

  const [greeting, setGreeting] = useState(() =>
    getTimeOfDayGreeting(new Date(), userName)
  );

  // Hourly quote auto-updating mechanism that does NOT reload the page
  useEffect(() => {
    const updateContent = () => {
      const now = new Date();
      setContent(getHourlyContent(now));
      setGreeting(getTimeOfDayGreeting(now, userName));
    };

    // Calculate time until next top-of-the-hour
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds();

    // Set one-shot timeout for the exact boundary, then interval every hour
    let hourlyInterval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      updateContent();
      hourlyInterval = setInterval(updateContent, 60 * 60 * 1000);
    }, msUntilNextHour);

    return () => {
      clearTimeout(timeout);
      if (hourlyInterval) clearInterval(hourlyInterval);
    };
  }, [userName]);

  const workspaces = [
    {
      title: "Planner & Schedule",
      desc: "Time blocks, agenda, and conflict-free daily structure",
      href: "/planner",
      icon: Calendar,
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-400",
    },
    {
      title: "Tasks & Execution",
      desc: "Capture, prioritize, and run focus sessions",
      href: "/tasks",
      icon: CheckSquare,
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400",
    },
    {
      title: "Academics & GATE",
      desc: "Syllabi, spaced repetition revisions, and mock errors",
      href: "/academics",
      icon: GraduationCap,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
    },
    {
      title: "Research Lab",
      desc: "Paper library, arXiv discovery, and experiment logs",
      href: "/research",
      icon: Microscope,
      color: "from-violet-500/20 to-purple-500/20 text-violet-400",
    },
    {
      title: "Learning Studio",
      desc: "8 Languages, general knowledge, psychology, and books",
      href: "/learning",
      icon: BookOpen,
      color: "from-amber-500/20 to-yellow-500/20 text-amber-400",
    },
    {
      title: "Knowledge & Notes",
      desc: "Structured Markdown pages with relational links",
      href: "/notes",
      icon: FileText,
      color: "from-sky-500/20 to-blue-500/20 text-sky-400",
    },
    {
      title: "Habits & Routine",
      desc: "Flexible, guilt-free daily execution and reflection",
      href: "/habits",
      icon: Flame,
      color: "from-rose-500/20 to-pink-500/20 text-rose-400",
    },
    {
      title: "Goals & Milestones",
      desc: "Long-term academic and technical objectives",
      href: "/goals",
      icon: Target,
      color: "from-teal-500/20 to-cyan-500/20 text-teal-400",
    },
    {
      title: "Analytics & Reviews",
      desc: "Measured study hours and weekly progress reviews",
      href: "/analytics",
      icon: BarChart3,
      color: "from-indigo-500/20 to-violet-500/20 text-indigo-400",
    },
    {
      title: "Integrations Hub",
      desc: "Connected services (OpenAlex, Vikunja, Ollama, n8n)",
      href: "/integrations",
      icon: Layers,
      color: "from-slate-500/20 to-zinc-500/20 text-slate-300",
    },
    {
      title: "Automations",
      desc: "Event triggers and multi-step study workflows",
      href: "/automations",
      icon: Workflow,
      color: "from-cyan-500/20 to-teal-500/20 text-cyan-300",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-16 px-4 space-y-12 animate-in fade-in duration-300">
      {/* 1. Branding & Greeting */}
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5" /> AMAHAS Personal Operating System
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
          {greeting}
        </h1>
        <p className="text-sm md:text-base text-slate-400 font-medium">
          {content.dateString}
        </p>
      </section>

      {/* 2. Motivational Quotation & Hourly Message */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#0b1120] border border-white/10 p-6 md:p-8 text-center shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />
        <blockquote className="space-y-4">
          <p className="text-base md:text-lg text-slate-200 font-serif italic leading-relaxed">
            &ldquo;{content.quote.quote}&rdquo;
          </p>
          <footer className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            — {content.quote.author}
          </footer>
        </blockquote>
        <div className="mt-6 pt-5 border-t border-white/5 text-xs text-slate-400 font-sans">
          <span className="text-violet-400 font-medium">Hourly Focus: </span>
          {content.message}
        </div>
      </section>

      {/* 3. Global Search & Assistant Quick Input */}
      <section className="flex flex-col sm:flex-row gap-3 items-center">
        <Link
          href="/tasks"
          className="w-full flex-1 flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-400 transition-colors shadow-sm"
        >
          <span className="flex items-center gap-3">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Search syllabus, tasks, notes, or research...</span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/40 text-[10px] text-slate-400 border border-white/10">
            ⌘K
          </kbd>
        </Link>

        <Link
          href="/assistant"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:scale-[1.02]"
        >
          <Bot className="w-4 h-4" />
          <span>Ask Assistant</span>
        </Link>
      </section>

      {/* 4. Feature Directory Navigation (Clean Directory, No Cluttered Charts) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspaces & Capabilities
          </h2>
          <span className="text-xs text-slate-500">11 Workspaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.href}
                href={ws.href}
                className="group flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all duration-200"
              >
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${ws.color} border border-white/5`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {ws.title}
                    </h3>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {ws.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
