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
import { AmahasLogo } from "@/components/brand/AmahasLogo";

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

  useEffect(() => {
    const updateContent = () => {
      const now = new Date();
      setContent(getHourlyContent(now));
      setGreeting(getTimeOfDayGreeting(now, userName));
    };

    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds();

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
    },
    {
      title: "Tasks & Execution",
      desc: "Capture, prioritize, and run focus sessions",
      href: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Academics & GATE",
      desc: "Syllabi, spaced repetition revisions, and mock errors",
      href: "/academics",
      icon: GraduationCap,
    },
    {
      title: "Research Lab",
      desc: "Paper library, arXiv discovery, and experiment logs",
      href: "/research",
      icon: Microscope,
    },
    {
      title: "Learning Studio",
      desc: "8 Languages, general knowledge, psychology, and books",
      href: "/learning",
      icon: BookOpen,
    },
    {
      title: "Knowledge & Notes",
      desc: "Structured Markdown pages with relational links",
      href: "/notes",
      icon: FileText,
    },
    {
      title: "Habits & Routine",
      desc: "Flexible, guilt-free daily execution and reflection",
      href: "/habits",
      icon: Flame,
    },
    {
      title: "Goals & Milestones",
      desc: "Long-term academic and technical objectives",
      href: "/goals",
      icon: Target,
    },
    {
      title: "Analytics & Reviews",
      desc: "Measured study hours and weekly progress reviews",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Integrations Hub",
      desc: "Connected services (OpenAlex, Vikunja, Ollama, n8n)",
      href: "/integrations",
      icon: Layers,
    },
    {
      title: "Automations",
      desc: "Event triggers and multi-step study workflows",
      href: "/automations",
      icon: Workflow,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-14 px-4 space-y-10 animate-in fade-in duration-300 transition-colors duration-150">
      {/* 1. Branding & Greeting */}
      <section className="flex flex-col items-center text-center space-y-3">
        <AmahasLogo variant="primary" size="lg" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {greeting}
        </h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] font-medium">
          {content.dateString}
        </p>
      </section>

      {/* 2. Motivational Quotation & Hourly Message */}
      <section className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 md:p-8 text-center shadow-lg transition-colors">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)]" />
        <blockquote className="space-y-4">
          <p className="text-base md:text-lg text-[var(--text-primary)] font-serif italic leading-relaxed">
            &ldquo;{content.quote.quote}&rdquo;
          </p>
          <footer className="text-xs uppercase tracking-widest text-[var(--accent-primary)] font-semibold">
            — {content.quote.author}
          </footer>
        </blockquote>
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] font-sans">
          <span className="text-[var(--accent-secondary)] font-semibold">Hourly Focus: </span>
          {content.message}
        </div>
      </section>

      {/* 3. Global Search & Assistant Quick Input */}
      <section className="flex flex-col sm:flex-row gap-3 items-center">
        <Link
          href="/tasks"
          className="w-full flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border)] border border-[var(--border)] text-xs text-[var(--text-secondary)] transition-colors shadow-sm"
        >
          <span className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Search syllabus, tasks, notes, or research...</span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-[var(--bg-primary)] text-[10px] text-[var(--text-muted)] border border-[var(--border)]">
            ⌘K
          </kbd>
        </Link>

        <Link
          href="/assistant"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
        >
          <Bot className="w-4 h-4" />
          <span>Ask Assistant</span>
        </Link>
      </section>

      {/* 4. Feature Directory Navigation */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Workspaces &amp; Capabilities
          </h2>
          <span className="text-xs text-[var(--text-muted)]">11 Workspaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <Link
                key={ws.href}
                href={ws.href}
                className="group flex items-start gap-3.5 p-4 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-focus)]/50 transition-all duration-200"
              >
                <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {ws.title}
                    </h3>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
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
export default HomeClient;
