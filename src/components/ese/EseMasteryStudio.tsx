"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Calendar,
  BookOpen,
  FolderKanban,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Plus,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
  Target,
} from "lucide-react";
import Link from "next/link";
import { EseOverviewResponse } from "@/lib/ese/service";
import { EseChecklistItem, EsePartDMilestone, EseSubject } from "@/lib/ese/syllabus-data";
import { MANDATORY_ATTESTATION_TEXT, isValidGoogleDriveUrl } from "@/lib/ese/schedule-generator";

type EseTab = "overview" | "syllabus" | "plan" | "resources";

export function EseMasteryStudio() {
  const [activeTab, setActiveTab] = useState<EseTab>("overview");
  const [overview, setOverview] = useState<EseOverviewResponse | null>(null);
  const [syllabusData, setSyllabusData] = useState<{
    subjects: EseSubject[];
    milestones: EsePartDMilestone[];
    stats: any;
  } | null>(null);
  const [resourcesData, setResourcesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 600-Day Plan activation state
  const [selectedStartDate, setSelectedStartDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [activatingPlan, setActivatingPlan] = useState(false);
  const [planSuccessMessage, setPlanSuccessMessage] = useState<string | null>(null);

  // Plan Explorer state
  const [planExplorerDay, setPlanExplorerDay] = useState<number>(1);
  const [planPhaseFilter, setPlanPhaseFilter] = useState<string>("ALL");
  const [previewPlan, setPreviewPlan] = useState<any>(null);

  // Syllabus Explorer state
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [syllabusStageFilter, setSyllabusStageFilter] = useState<string>("ALL");
  const [syllabusSearch, setSyllabusSearch] = useState<string>("");

  // Resource Add Modal
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResNodeId, setNewResNodeId] = useState("");
  const [savingResource, setSavingResource] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/ese/overview");
      const data = await res.json();
      setOverview(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSyllabus = async () => {
    try {
      const res = await fetch("/api/ese/syllabus");
      const data = await res.json();
      setSyllabusData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch("/api/ese/resources");
      const data = await res.json();
      setResourcesData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPreviewPlan = async (startDate: string) => {
    try {
      const res = await fetch(`/api/ese/plan?startDate=${startDate}`);
      const data = await res.json();
      if (data.preview) setPreviewPlan(data.preview);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchOverview(), fetchSyllabus(), fetchResources()]).finally(() => {
      setLoading(false);
    });
    fetchPreviewPlan(selectedStartDate);
  }, []);

  const handleStartDateChange = (newDate: string) => {
    setSelectedStartDate(newDate);
    fetchPreviewPlan(newDate);
  };

  const handleActivatePlan = async () => {
    setActivatingPlan(true);
    setPlanSuccessMessage(null);
    try {
      const res = await fetch("/api/ese/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: selectedStartDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate plan");

      setPlanSuccessMessage(
        "600-Day Mastery Plan activated successfully! Daily study tasks are now synchronized in Tasks & Planner."
      );
      fetchOverview();
      fetchPreviewPlan(selectedStartDate);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActivatingPlan(false);
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResTitle || !newResUrl) return;
    setSavingResource(true);
    setResError(null);

    try {
      const res = await fetch("/api/ese/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newResTitle,
          url: newResUrl,
          nodeId: newResNodeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save resource");

      setShowAddResource(false);
      setNewResTitle("");
      setNewResUrl("");
      setNewResNodeId("");
      fetchResources();
    } catch (err: any) {
      setResError(err.message);
    } finally {
      setSavingResource(false);
    }
  };

  const toggleSubject = (sId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [sId]: !prev[sId] }));
  };

  const toggleChapter = (cId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [cId]: !prev[cId] }));
  };

  // Filtered syllabus items
  const filteredSubjects = syllabusData?.subjects.filter((sub) => {
    if (syllabusStageFilter !== "ALL" && sub.part !== syllabusStageFilter) return false;
    if (syllabusSearch.trim()) {
      const q = syllabusSearch.toLowerCase();
      const matchSub = sub.title.toLowerCase().includes(q);
      const matchCh = sub.chapters.some(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.items.some((it) => it.subtopicTitle.toLowerCase().includes(q))
      );
      return matchSub || matchCh;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Studio Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/70 backdrop-blur-md px-6 py-5 sticky top-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">ESE 600-Day Mastery System</h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-bold uppercase">
                    UPSC E&amp;T 2027
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Academics &rarr; Engineering Services Examination (22 Subjects, 78 Chapters, 351 Subtopics + 16 Milestones = 367 Total Preparation Items)
                </p>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: Target },
              { id: "syllabus", label: "Syllabus (351+16)", icon: BookOpen },
              { id: "plan", label: "600-Day Plan", icon: Calendar },
              { id: "resources", label: "Resources", icon: FolderKanban },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EseTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--accent-primary)] text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/planner"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--border)] transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Tasks &amp; Planner</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Countdown / Activation Hero Banner */}
            <div className="p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)]/80 to-purple-950/20 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">
                    {overview?.plan.countdownActive ? "Active Mastery Countdown" : "Plan Pre-Activation"}
                  </span>
                  <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                    {overview?.plan.countdownActive
                      ? `Day ${overview.plan.currentDay} of 600 • ${overview.plan.daysRemaining} Days Remaining`
                      : "600-Day Structured Mastery Framework"}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] max-w-2xl">
                    {overview?.plan.countdownActive
                      ? `Target examination horizon active in Asia/Kolkata timezone: ${overview.plan.startDate} to ${overview.plan.endDate}.`
                      : "Select your start date and review the phased preparation framework. Countdown activates only upon explicit activation."}
                  </p>
                </div>

                {!overview?.plan.countdownActive ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] mb-1 font-semibold">
                        Start Date (Asia/Kolkata)
                      </label>
                      <input
                        type="date"
                        value={selectedStartDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div className="sm:self-end">
                      <button
                        onClick={handleActivatePlan}
                        disabled={activatingPlan}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50"
                      >
                        {activatingPlan ? "Generating 600 Days..." : "Activate 600-Day Plan"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/planner"
                      className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors flex items-center gap-2 shrink-0 self-start md:self-center"
                    >
                      <span>Open Today in Tasks &amp; Planner</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>

              {planSuccessMessage && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{planSuccessMessage}</span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-muted)]">
                    Overall Preparation Progress (351 Subtopics + 16 Milestones)
                  </span>
                  <span className="text-purple-400 font-mono">
                    {overview?.stats.completedItems || 0} / 367 Items (
                    {overview?.stats.progressPercentage || 0}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-[var(--accent-primary)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(overview?.stats.progressPercentage || 0, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Counting Model: 351 Syllabus Subtopics + 16 Readiness Milestones = 367 Total Preparation Items
                </p>
              </div>
            </div>

            {/* Reconciliation Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Subjects", val: overview?.stats.totalSubjects || 22, sub: "Papers I & II", color: "text-blue-400" },
                { label: "Chapters", val: overview?.stats.totalChapters || 78, sub: "Canonical Groups", color: "text-indigo-400" },
                { label: "Syllabus Subtopics", val: overview?.stats.totalChecklistItems || 351, sub: "Checklist Items", color: "text-purple-400" },
                { label: "Part D Milestones", val: overview?.stats.totalMilestones || 16, sub: "Readiness Milestones", color: "text-pink-400" },
                { label: "Total Prep Items", val: (overview?.stats.totalChecklistItems || 351) + (overview?.stats.totalMilestones || 16), sub: "351 Subtopics + 16 Milestones", color: "text-cyan-400" },
                { label: "Notes Evidence", val: overview?.stats.totalEvidenceSubmitted || 0, sub: "Drive Uploads", color: "text-emerald-400" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-1">
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.val}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* 6 Phased Framework Roadmap Overview */}
            <div className="space-y-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--accent-primary)]" />
                Six Phased Preparation Roadmap (600 Days)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview?.phases.map((ph, idx) => (
                  <div
                    key={ph.phase}
                    className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--border)]">
                        <span className="font-mono text-purple-400 font-bold">{ph.daysRange}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{ph.dayCount} Days</span>
                      </div>
                      <h4 className="text-sm font-semibold mt-2">{ph.name}</h4>
                    </div>
                    <div className="pt-2 text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                      <span>Status: {overview?.plan.countdownActive ? `${ph.completedDays} / ${ph.dayCount} days` : "Scheduled"}</span>
                      {ph.completedDays >= ph.dayCount && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYLLABUS */}
        {activeTab === "syllabus" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Complete Auditable Syllabus Hierarchy</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Examination Stage &rarr; Subject (22) &rarr; Chapter (78) &rarr; Subtopic (351 items + 16 Milestones)
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={syllabusSearch}
                    onChange={(e) => setSyllabusSearch(e.target.value)}
                    placeholder="Search syllabus..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <select
                  value={syllabusStageFilter}
                  onChange={(e) => setSyllabusStageFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs outline-none"
                >
                  <option value="ALL">All Stages &amp; Papers</option>
                  <option value="PART_A">Part A (General Studies)</option>
                  <option value="PART_B">Part B (Tech Paper I)</option>
                  <option value="PART_C">Part C (Tech Paper II)</option>
                  <option value="PART_D">Part D (Milestones)</option>
                </select>
              </div>
            </div>

            {/* Tree View */}
            <div className="space-y-3">
              {syllabusStageFilter !== "PART_D" &&
                filteredSubjects?.map((sub) => {
                  const isExpanded = !!expandedSubjects[sub.id];
                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSubject(sub.id)}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[var(--border)]/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[var(--accent-primary)] font-bold">
                                Subject {sub.number}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] font-mono text-[var(--text-muted)]">
                                {sub.stage}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{sub.title}</h3>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
                          {sub.chapters.length} Chapters
                        </span>
                      </button>

                      {/* Chapters Accordion */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 space-y-3 border-t border-[var(--border)] bg-[var(--bg-primary)]/30">
                          {sub.chapters.map((ch) => {
                            const isChExpanded = !!expandedChapters[ch.id];
                            return (
                              <div
                                key={ch.id}
                                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleChapter(ch.id)}
                                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[var(--border)]/30 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-muted)]">
                                      {isChExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      Chapter {ch.chapterNumber}. {ch.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                    {ch.items.length} Subtopics
                                  </span>
                                </button>

                                {/* Checklist Items grouped by Topic */}
                                {isChExpanded && (
                                  <div className="px-4 pb-3 pt-2 space-y-3 border-t border-[var(--border)] bg-[var(--bg-primary)]/50">
                                    {(() => {
                                      const topicMap = new Map<string, typeof ch.items>();
                                      for (const it of ch.items) {
                                        const topic = it.topicTitle || "General Concepts";
                                        if (!topicMap.has(topic)) topicMap.set(topic, []);
                                        topicMap.get(topic)!.push(it);
                                      }

                                      return Array.from(topicMap.entries()).map(([topicName, items]) => (
                                        <div key={topicName} className="space-y-1.5">
                                          <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)]">
                                            <FolderKanban className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                                            <span>Topic: {topicName}</span>
                                            <span className="text-[10px] font-mono text-[var(--text-muted)] ml-auto">
                                              ({items.length} subtopics)
                                            </span>
                                          </div>
                                          <div className="space-y-1.5 pl-2">
                                            {items.map((it: any) => {
                                              const isDone = it.status === "COMPLETED";
                                              return (
                                                <div
                                                  key={it.id}
                                                  className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] flex items-start justify-between gap-3 text-xs"
                                                >
                                                  <div className="flex items-start gap-2.5 min-w-0">
                                                    <span className="mt-0.5 shrink-0">
                                                      {isDone ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                      ) : (
                                                        <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                                                      )}
                                                    </span>
                                                    <div className="min-w-0">
                                                      <p className={`font-medium ${isDone ? "text-[var(--text-muted)] line-through" : ""}`}>
                                                        {it.subtopicTitle}
                                                      </p>
                                                      <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5">
                                                        ID: {it.id}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {it.evidenceUrl && (
                                                    <a
                                                      href={it.evidenceUrl}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="flex items-center gap-1 text-[10px] text-purple-400 hover:underline shrink-0"
                                                    >
                                                      <FileCheck className="w-3 h-3" />
                                                      Notes <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Part D Milestones */}
              {(syllabusStageFilter === "ALL" || syllabusStageFilter === "PART_D") && (
                <div className="rounded-2xl border border-pink-500/30 bg-[var(--bg-card)] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                    <div>
                      <h3 className="text-sm font-bold text-pink-400">
                        Part D — Prelims and Mains Execution Checklist (16 Milestones)
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Strategic preparation milestones, answer writing, and interview readiness
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {syllabusData?.milestones.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${m.status === "COMPLETED" ? "text-emerald-400" : "text-pink-400/50"}`} />
                          <div>
                            <span className="text-[10px] font-mono uppercase text-pink-400 block mb-0.5">
                              {m.section} • {m.id}
                            </span>
                            <p className="font-medium text-[var(--text-primary)]">{m.title}</p>
                          </div>
                        </div>
                        {m.evidenceUrl && (
                          <a
                            href={m.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-pink-400 hover:underline shrink-0"
                          >
                            <FileCheck className="w-3 h-3" />
                            Proof <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 600-DAY PLAN */}
        {activeTab === "plan" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Interactive 600-Day Study Schedule</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Deterministic daily tasks (30–60m each) with explicit outcomes and required notes evidence
                </p>
              </div>

              {/* Day Jumper / Phase Selector */}
              <div className="flex items-center gap-2 text-xs">
                <label className="text-[var(--text-muted)]">Jump to Day:</label>
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={planExplorerDay}
                  onChange={(e) => setPlanExplorerDay(Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 600))}
                  className="w-16 px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs text-center font-mono outline-none"
                />
              </div>
            </div>

            {/* Selected Day Detail Card */}
            {previewPlan && previewPlan.days && previewPlan.days[planExplorerDay - 1] && (
              <div className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                  <div>
                    <span className="text-xs font-mono text-purple-400 font-bold uppercase">
                      {previewPlan.days[planExplorerDay - 1].phaseName}
                    </span>
                    <h3 className="text-xl font-bold mt-0.5">
                      Day {planExplorerDay} • {previewPlan.days[planExplorerDay - 1].date}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlanExplorerDay((prev) => Math.max(prev - 1, 1))}
                      disabled={planExplorerDay <= 1}
                      className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      Day {planExplorerDay} / 600
                    </span>
                    <button
                      onClick={() => setPlanExplorerDay((prev) => Math.min(prev + 1, 600))}
                      disabled={planExplorerDay >= 600}
                      className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Daily Focus Summary:</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {previewPlan.days[planExplorerDay - 1].focusSummary}
                  </p>
                </div>

                {/* Day Tasks */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    Planned Tasks ({previewPlan.days[planExplorerDay - 1].tasks.length}):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {previewPlan.days[planExplorerDay - 1].tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/50 space-y-2 flex flex-col justify-between text-xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-semibold">
                              {task.taskType}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {task.durationMinutes} mins
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                            {task.title}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            {task.outcome}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                          <span>Evidence: Google Drive Notes URL</span>
                          <Link
                            href="/planner"
                            className="text-purple-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            Open in Planner <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RESOURCES */}
        {activeTab === "resources" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">ESE Verified Study Resources &amp; Notes</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Subject &rarr; Chapter &rarr; Topic hierarchy. Automatically synced from verified task completion.
                </p>
              </div>

              <button
                onClick={() => setShowAddResource(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Add Study Resource</span>
              </button>
            </div>

            {/* Structured Subject Groups */}
            <div className="space-y-4">
              {resourcesData?.structuredSubjects.length === 0 &&
              resourcesData?.unclassifiedResources.length === 0 ? (
                <div className="p-12 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] text-center space-y-2">
                  <FolderKanban className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                  <p className="text-sm font-semibold">No study notes resources added yet.</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    As you complete daily ESE study tasks with Google Drive links, they automatically appear here!
                  </p>
                </div>
              ) : (
                resourcesData?.structuredSubjects.map((s: any) => (
                  <div
                    key={s.subjectName}
                    className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <h3 className="text-sm font-bold text-purple-400">{s.subjectName}</h3>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {s.totalResources} Resources
                      </span>
                    </div>

                    <div className="space-y-3">
                      {s.chapters.map((ch: any) => (
                        <div key={ch.chapterTitle} className="space-y-2 pl-2">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{ch.chapterTitle}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {ch.resources.map((res: any) => (
                              <div
                                key={res.id}
                                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{res.title}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">{res.subtopicTitle}</p>
                                </div>
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)] text-purple-400"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {/* Unclassified Resources */}
              {resourcesData?.unclassifiedResources &&
                resourcesData.unclassifiedResources.length > 0 && (
                  <div className="p-5 rounded-2xl border border-amber-500/30 bg-[var(--bg-card)] space-y-3">
                    <h3 className="text-sm font-bold text-amber-400">
                      Unclassified Resources ({resourcesData.unclassifiedResources.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {resourcesData.unclassifiedResources.map((res: any) => (
                        <div
                          key={res.id}
                          className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{res.title}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{res.url}</p>
                          </div>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)] text-amber-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </main>

      {/* ADD RESOURCE MODAL */}
      {showAddResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold">Add Study Resource</h3>
              <button
                onClick={() => setShowAddResource(false)}
                className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveResource} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                  placeholder="e.g. Master Formula Sheet: Control Systems"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1">URL (Drive / Web Link) *</label>
                <input
                  type="url"
                  required
                  value={newResUrl}
                  onChange={(e) => setNewResUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Optional Syllabus Node ID</label>
                <input
                  type="text"
                  value={newResNodeId}
                  onChange={(e) => setNewResNodeId(e.target.value)}
                  placeholder="e.g. ESE-PA-S01-CH01-I001 (leave empty for Unclassified)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] outline-none font-mono"
                />
              </div>
              {resError && (
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 text-xs">
                  {resError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddResource(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResource}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {savingResource ? "Saving..." : "Save Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
