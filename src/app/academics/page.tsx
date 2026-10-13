"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Star,
  ChevronDown,
  ChevronRight,
  Flame,
  Award,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { OnboardingModal } from "@/components/OnboardingModal";

interface TopicItem {
  id: string;
  title: string;
  status: string;
  confidenceLevel: number;
  lastStudiedAt: string | null;
  nextRevisionAt: string | null;
  revisionCount: number;
}

interface UnitItem {
  id: string;
  unitNumber: number;
  title: string;
  topics: TopicItem[];
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  instructor: string | null;
  semester: string | null;
  confidence: number;
  isGateSubject: boolean;
  weightage: number | null;
  isDemo?: boolean;
  track?: string | null;
  units: UnitItem[];
}

export default function AcademicsPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [totalTopics, setTotalTopics] = useState(0);
  const [masteredTopics, setMasteredTopics] = useState(0);
  const [overallReadinessPct, setOverallReadinessPct] = useState(0);
  const [dueRevisionTopics, setDueRevisionTopics] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string>("GATE_EC");
  const [hasDemoCourses, setHasDemoCourses] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active topic revision modal state
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; title: string; courseCode: string } | null>(null);
  const [recallRating, setRecallRating] = useState<number>(4);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null);

  const fetchAcademics = async () => {
    try {
      const [acadRes, trackRes] = await Promise.all([
        fetch("/api/academics"),
        fetch("/api/tracks"),
      ]);

      const data = await acadRes.json();
      if (data.courses) {
        setCourses(data.courses);
        setTotalTopics(data.totalTopics || 0);
        setMasteredTopics(data.masteredTopics || 0);
        setOverallReadinessPct(data.overallReadinessPct || 0);
        setDueRevisionTopics(data.dueRevisionTopics || []);
        setHasDemoCourses(data.courses.some((c: CourseItem) => c.isDemo));
      }

      const trackData = await trackRes.json();
      if (trackData.currentTrack) {
        setCurrentTrack(trackData.currentTrack);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademics();
  }, []);

  const handleClearDemo = async () => {
    if (!confirm("Are you sure you want to remove demo sample courses and start fresh?")) return;
    try {
      await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_DEMO" }),
      });
      fetchAcademics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    setIsSubmittingRevision(true);
    setRevisionFeedback(null);

    try {
      const res = await fetch("/api/academics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic.id,
          rating: recallRating,
          notes: revisionNotes,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setRevisionFeedback(
          `Revision logged! SuperMemo SM-2 scheduled next review in ${result.intervalDays} day(s).`
        );
        setTimeout(() => {
          setSelectedTopic(null);
          setRevisionFeedback(null);
          setRevisionNotes("");
          fetchAcademics();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "MASTERED":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "REVISED":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case "IN_PROGRESS":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-slate-500 bg-white/5 border-white/5";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-emerald-400" />
            Academics &amp; Syllabus Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configured Examination Track: <span className="font-semibold text-cyan-400 font-mono">{currentTrack.replace("_", " ")}</span> • SuperMemo SM-2 spaced repetition tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            <GraduationCap className="w-4 h-4" /> Switch / Configure Track
          </button>

          {/* Global Readiness Score */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <Award className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Syllabus Readiness
              </div>
              <div className="text-xs font-bold text-emerald-300">
                {overallReadinessPct}% Mastered ({masteredTopics}/{totalTopics})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo courses notice banner if demo records exist */}
      {hasDemoCourses && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sample demo courses are currently loaded alongside your workspace.</span>
          </div>
          <button
            onClick={handleClearDemo}
            className="self-start sm:self-center px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] transition-colors"
          >
            Clear Demo Records
          </button>
        </div>
      )}

      {/* Due For Spaced Revision Alerts */}
      {dueRevisionTopics.length > 0 && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 space-y-2">
          <div className="flex items-center justify-between font-semibold text-cyan-300">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> {dueRevisionTopics.length} Topics Due for Spaced Repetition (SM-2)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {dueRevisionTopics.map((t) => (
              <div
                key={t.topicId}
                className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                    {t.courseCode}
                  </span>
                  <span className="text-xs text-slate-200 truncate block">
                    {t.topicTitle}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setSelectedTopic({
                      id: t.topicId,
                      title: t.topicTitle,
                      courseCode: t.courseCode,
                    })
                  }
                  className="px-2.5 py-1 rounded-md bg-cyan-500 text-black font-semibold text-[11px] shrink-0 hover:bg-cyan-400 transition-colors"
                >
                  Drill Recall
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Cards & Hierarchical Syllabus */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500">Loading syllabus...</div>
      ) : courses.length === 0 ? (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="p-8 md:p-10 rounded-3xl border border-zinc-800 bg-[#0a0a0a] text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">Configure Your Academic Track</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Track unit-by-unit concept mastery, review weak areas, and automate spaced repetition with the SuperMemo SM-2 algorithm.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Open Track Configurator
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Or Select a 1-Click Curriculum Track</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "GATE_CS", title: "Computer Science & Engineering", desc: "Algorithms, Operating Systems, Computer Architecture, Networks & DBMS" },
                { id: "GATE_EC", title: "Electronics & Communication", desc: "Networks, Signals & Systems, Electronic Devices, Analog & Digital" },
                { id: "ECE_CORE", title: "University Engineering Core", desc: "Fundamental university engineering curriculum & lab units" },
                { id: "ESE_ET", title: "Electronics & Telecommunication", desc: "Applied engineering services examination & telecom systems" },
              ].map((trk) => (
                <div
                  key={trk.id}
                  onClick={async () => {
                    await fetch("/api/tracks", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "SELECT_TRACK", trackId: trk.id, clearDemo: false }),
                    });
                    fetchAcademics();
                  }}
                  className="p-4 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-zinc-200">
                      {trk.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-light">
                      {trk.desc}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 group-hover:text-white transition-colors">
                    <span>Load Track</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 md:p-6 rounded-2xl bg-[#0a0a0a] border border-zinc-800 space-y-5"
            >
              {/* Course Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                      {course.code}
                    </span>
                    {course.isGateSubject && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-semibold text-[10px] border border-cyan-500/20">
                        {course.track ? course.track.replace("_", " ") : "Core Technical Subject"}
                      </span>
                    )}
                    {course.isDemo && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold text-[10px] border border-amber-500/20">
                        Demo Sample
                      </span>
                    )}
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-white">
                    {course.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Instructor: {course.instructor || "Department Faculty"} • {course.semester}
                  </p>
                </div>

                {/* Confidence Stars */}
                <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">Subject Confidence:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= course.confidence
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Units & Topics Hierarchy */}
              <div className="space-y-4">
                {course.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3"
                  >
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      Unit {unit.unitNumber}: {unit.title}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {unit.topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="p-3 rounded-lg bg-[#070b14]/70 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-200 truncate">
                              {topic.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                              <span className={`px-1.5 py-0.2 rounded-full border ${statusBadge(topic.status)}`}>
                                {topic.status}
                              </span>
                              <span>Revisions: {topic.revisionCount}</span>
                              {topic.nextRevisionAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  Next: {new Date(topic.nextRevisionAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              setSelectedTopic({
                                id: topic.id,
                                title: topic.title,
                                courseCode: course.code,
                              })
                            }
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 text-xs shrink-0 transition-colors"
                            title="Review Topic (SM-2)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SM-2 Topic Active Recall Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" /> SuperMemo SM-2 Active Recall Drill
            </div>

            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {selectedTopic.courseCode}
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {selectedTopic.title}
              </h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Rate your conceptual recall for this syllabus topic. The algorithm calculates the next spaced revision interval.
            </p>

            <form onSubmit={handleRecordRevision} className="space-y-4">
              {/* 1-5 recall rating buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Recall Confidence (1 = Blackout, 5 = Flawless)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRecallRating(val)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        recallRating === val
                          ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 scale-105"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Active Recall Notes (Formulas / Derivations / Traps)
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Formula: Effective Access Time = h*(tTLB + tRAM) + (1-h)*(tTLB + 2*tRAM)"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {revisionFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{revisionFeedback}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRevision}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmittingRevision ? "Recording..." : "Record & Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Track & Syllabus Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCompleted={fetchAcademics}
      />
    </div>
  );
}
