"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Clock,
  Plus,
  Trash2,
  Volume2,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Check,
  Calendar,
  AlertCircle,
  X,
  Flame,
  ArrowRight,
  Pause,
} from "lucide-react";
import {
  notifManager,
  AlarmItem,
  ReminderItem,
  InAppNotification,
} from "@/lib/notifications-client";
import { audioAlarm } from "@/lib/audio-alarm";

const QUICK_TIMERS = [
  { min: 5, label: "5m Micro Break" },
  { min: 15, label: "15m Review & Recall" },
  { min: 25, label: "25m Pomodoro Focus" },
  { min: 45, label: "45m Deep Work Block" },
  { min: 60, label: "60m Architectural Sprint" },
  { min: 90, label: "90m Deep Focus Horizon" },
];

export default function RemindersPage() {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Live Timer Countdown State
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);
  const [activeTimerLabel, setActiveTimerLabel] = useState<string>("");
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Modals
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Alarm Form State
  const [alarmTitle, setAlarmTitle] = useState("");
  const [alarmTime, setAlarmTime] = useState("09:00");
  const [alarmRepeat, setAlarmRepeat] = useState<"ONCE" | "DAILY" | "WEEKDAYS">("DAILY");
  const [alarmSound, setAlarmSound] = useState<"alarm" | "bell" | "chime">("alarm");

  // Reminder Form State
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("12:00");
  const [remNote, setRemNote] = useState("");
  const [remPriority, setRemPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [remCategory, setRemCategory] = useState<"DEADLINE" | "REVISION" | "HABIT" | "GENERAL">("GENERAL");

  const refresh = () => {
    setAlarms(notifManager.getAlarms());
    setReminders(notifManager.getReminders());
    setNotifications(notifManager.getNotifications());
    setPermission(notifManager.getPermission());
  };

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener("amahas_alarms_updated", handleUpdate);
    window.addEventListener("amahas_reminders_updated", handleUpdate);
    window.addEventListener("amahas_notifications_updated", handleUpdate);

    return () => {
      window.removeEventListener("amahas_alarms_updated", handleUpdate);
      window.removeEventListener("amahas_reminders_updated", handleUpdate);
      window.removeEventListener("amahas_notifications_updated", handleUpdate);
    };
  }, []);

  // Countdown timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimerSeconds !== null && activeTimerSeconds > 0 && !isTimerPaused) {
      interval = setInterval(() => {
        setActiveTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            // Timer Finished! Play alarm
            audioAlarm.startContinuousAlarm(0.5);
            notifManager.sendDesktopNotification(`Timer Finished: ${activeTimerLabel}`, {
              body: "Your timed session has concluded.",
              requireInteraction: true,
            });
            notifManager.pushNotification(
              `Timer Finished: ${activeTimerLabel}`,
              "Your scheduled countdown has concluded.",
              "ALARM"
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerSeconds, isTimerPaused, activeTimerLabel]);

  const handleStartTimer = (minutes: number, label: string) => {
    setActiveTimerSeconds(minutes * 60);
    setActiveTimerLabel(label);
    setIsTimerPaused(false);
    audioAlarm.playNotificationChime();
  };

  const handleStopTimer = () => {
    audioAlarm.stopContinuousAlarm();
    setActiveTimerSeconds(null);
    setActiveTimerLabel("");
    setIsTimerPaused(false);
  };

  const handleRequestPermission = async () => {
    const res = await notifManager.requestPermission();
    setPermission(res);
    if (res === "granted") {
      notifManager.sendDesktopNotification("Desktop Push Notifications Enabled", {
        body: "Real-time acoustic alarms and timed reminders are now fully active.",
      });
      audioAlarm.playNotificationChime();
    }
  };

  // Add Alarm
  const handleSaveAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTitle.trim() || !alarmTime) return;

    notifManager.addAlarm({
      title: alarmTitle.trim(),
      time: alarmTime,
      repeat: alarmRepeat,
      sound: alarmSound,
      enabled: true,
    });

    setAlarmTitle("");
    setShowAlarmModal(false);
    audioAlarm.playNotificationChime();
    refresh();
  };

  // Add Reminder
  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;

    const targetDate = remDate || new Date().toISOString().substring(0, 10);
    const isoString = new Date(`${targetDate}T${remTime}:00`).toISOString();

    notifManager.addReminder({
      title: remTitle.trim(),
      note: remNote.trim() || undefined,
      dueDateTime: isoString,
      priority: remPriority,
      category: remCategory,
    });

    setRemTitle("");
    setRemNote("");
    setShowReminderModal(false);
    audioAlarm.playNotificationChime();
    refresh();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-white" />
            Alarms, Reminders &amp; Timers
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time acoustic alarm synthesis, timed reminders, countdown timers, and native OS desktop push notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {permission !== "granted" ? (
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Enable Desktop Push
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-white flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-white" /> Push Notifications Active
            </span>
          )}

          <button
            onClick={() => setShowAlarmModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md"
          >
            <Clock className="w-4 h-4" /> + Set Alarm
          </button>

          <button
            onClick={() => setShowReminderModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> + New Reminder
          </button>
        </div>
      </div>

      {/* SECTION 1: Active Countdown Timer Banner */}
      {activeTimerSeconds !== null && (
        <div className="p-6 rounded-3xl bg-[#0a0a0a] border-2 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Clock className={`w-7 h-7 text-white ${activeTimerSeconds === 0 ? "animate-bounce" : "animate-spin"}`} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Active Countdown Timer
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{activeTimerLabel}</h3>
            </div>
          </div>

          <div className="text-4xl md:text-5xl font-mono font-bold tracking-widest text-white">
            {formatTimer(activeTimerSeconds)}
          </div>

          <div className="flex items-center gap-2">
            {activeTimerSeconds > 0 && (
              <button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isTimerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isTimerPaused ? "Resume" : "Pause"}
              </button>
            )}

            <button
              onClick={handleStopTimer}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-md"
            >
              {activeTimerSeconds === 0 ? "Dismiss Alarm" : "Cancel Timer"}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: 1-Click Quick Countdown Presets */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span>1-Click Focus &amp; Break Countdown Alarms</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TIMERS.map((t) => (
            <button
              key={t.min}
              onClick={() => handleStartTimer(t.min, t.label)}
              className="p-4 rounded-2xl bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 transition-all text-left group space-y-1 hover:shadow-lg"
            >
              <div className="font-mono text-xl font-bold text-white group-hover:text-zinc-200">
                {t.min}m
              </div>
              <div className="text-[11px] text-zinc-400 font-light truncate">
                {t.label}
              </div>
              <div className="pt-2 text-[10px] text-zinc-500 group-hover:text-white flex items-center gap-1 font-mono">
                <span>Start</span> <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3 & 4: Scheduled Alarms and Reminders Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scheduled Alarms Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              Scheduled Alarms ({alarms.length})
            </h2>
            <button
              onClick={() => setShowAlarmModal(true)}
              className="text-xs text-white hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Alarm
            </button>
          </div>

          {alarms.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-500 space-y-2">
              <Clock className="w-6 h-6 mx-auto text-zinc-600" />
              <p>No scheduled alarms configured yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    alarm.enabled
                      ? "bg-[#0a0a0a] border-zinc-800 hover:border-zinc-700"
                      : "bg-[#0a0a0a]/50 border-zinc-900 opacity-60"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-2xl font-bold text-white tracking-wider">
                        {alarm.time}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold">
                        {alarm.repeat}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        Sound: {alarm.sound}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 font-light truncate">
                      {alarm.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Audio Preview */}
                    <button
                      onClick={() => {
                        if (alarm.sound === "bell") audioAlarm.playReminderBell();
                        else if (alarm.sound === "chime") audioAlarm.playNotificationChime();
                        else {
                          audioAlarm.startContinuousAlarm(0.35);
                          setTimeout(() => audioAlarm.stopContinuousAlarm(), 1000);
                        }
                      }}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Preview Sound Tone"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => notifManager.toggleAlarm(alarm.id)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        alarm.enabled ? "bg-white" : "bg-zinc-800"
                      }`}
                      title={alarm.enabled ? "Turn Off" : "Turn On"}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${
                          alarm.enabled ? "right-0.5 bg-black" : "left-0.5 bg-zinc-500"
                        }`}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => notifManager.deleteAlarm(alarm.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete Alarm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timed Reminders Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white" />
              Scheduled Reminders ({reminders.length})
            </h2>
            <button
              onClick={() => setShowReminderModal(true)}
              className="text-xs text-white hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Reminder
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-[#0a0a0a] text-xs text-zinc-500 space-y-2">
              <Calendar className="w-6 h-6 mx-auto text-zinc-600" />
              <p>No reminders scheduled. Create your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((rem) => {
                const isPast = new Date(rem.dueDateTime).getTime() <= Date.now();
                return (
                  <div
                    key={rem.id}
                    className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      rem.completed
                        ? "bg-[#0a0a0a]/40 border-zinc-900 opacity-60"
                        : isPast
                        ? "bg-[#0a0a0a] border-zinc-700"
                        : "bg-[#0a0a0a] border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <button
                      onClick={() => notifManager.toggleReminder(rem.id)}
                      className="mt-1 text-zinc-500 hover:text-white"
                      title={rem.completed ? "Mark Incomplete" : "Mark Complete"}
                    >
                      {rem.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold">
                          {rem.category}
                        </span>
                        <span className="text-[10px] uppercase font-mono text-zinc-500">
                          Priority: {rem.priority}
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-bold ${
                          rem.completed ? "line-through text-zinc-500" : "text-white"
                        }`}
                      >
                        {rem.title}
                      </h4>
                      {rem.note && (
                        <p className="text-xs text-zinc-400 font-light leading-relaxed">
                          {rem.note}
                        </p>
                      )}
                      <div className="text-[11px] text-zinc-500 font-mono pt-1">
                        📅 Due: {new Date(rem.dueDateTime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => notifManager.deleteReminder(rem.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete Reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE ALARM MODAL */}
      {showAlarmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" /> Set Automatic Alarm
              </h2>
              <button
                onClick={() => setShowAlarmModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlarm} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Alarm Title *
                </label>
                <input
                  type="text"
                  required
                  value={alarmTitle}
                  onChange={(e) => setAlarmTitle(e.target.value)}
                  placeholder="e.g. Focus Sprint Kickoff"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Recurrence
                  </label>
                  <select
                    value={alarmRepeat}
                    onChange={(e: any) => setAlarmRepeat(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="DAILY">Every Day</option>
                    <option value="WEEKDAYS">Mon - Fri</option>
                    <option value="ONCE">Once (Today)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                  Acoustic Tone
                </label>
                <select
                  value={alarmSound}
                  onChange={(e: any) => setAlarmSound(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="alarm">Continuous Alarm Pulse (Electronic)</option>
                  <option value="bell">Resonant Acoustic Bell (Harmonic)</option>
                  <option value="chime">Gentle Two-Tone Melodic Chime</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAlarmModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md"
                >
                  Save Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" /> Create Timed Reminder
              </h2>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="e.g. Ingest 5 arXiv Quantization Papers"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={remDate}
                    onChange={(e) => setRemDate(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Target Time
                  </label>
                  <input
                    type="time"
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Notes &amp; Context (Optional)
                </label>
                <textarea
                  value={remNote}
                  onChange={(e) => setRemNote(e.target.value)}
                  rows={2}
                  placeholder="Additional context or checklist items..."
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Priority
                  </label>
                  <select
                    value={remPriority}
                    onChange={(e: any) => setRemPriority(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono uppercase">
                    Category
                  </label>
                  <select
                    value={remCategory}
                    onChange={(e: any) => setRemCategory(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="GENERAL">General</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="REVISION">Spaced Revision</option>
                    <option value="HABIT">Daily Habit</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
