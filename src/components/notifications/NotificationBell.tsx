"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Clock,
  Plus,
  Trash2,
  X,
  Volume2,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  notifManager,
  AlarmItem,
  ReminderItem,
  InAppNotification,
} from "@/lib/notifications-client";
import { audioAlarm } from "@/lib/audio-alarm";

export function NotificationBell({
  activeCountdownMinutes,
  onStartQuickTimer,
}: {
  activeCountdownMinutes?: number;
  onStartQuickTimer?: (minutes: number, label: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"alarms" | "reminders" | "feed">("alarms");

  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // New Alarm Form State
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [newAlarmTitle, setNewAlarmTitle] = useState("");
  const [newAlarmTime, setNewAlarmTime] = useState("09:00");
  const [newAlarmRepeat, setNewAlarmRepeat] = useState<"ONCE" | "DAILY" | "WEEKDAYS">("DAILY");
  const [newAlarmSound, setNewAlarmSound] = useState<"alarm" | "bell" | "chime">("alarm");

  // New Reminder Form State
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newRemTitle, setNewRemTitle] = useState("");
  const [newRemDate, setNewRemDate] = useState("");
  const [newRemTime, setNewRemTime] = useState("12:00");
  const [newRemNote, setNewRemNote] = useState("");
  const [newRemPriority, setNewRemPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  const popoverRef = useRef<HTMLDivElement>(null);

  const refreshState = () => {
    setAlarms(notifManager.getAlarms());
    setReminders(notifManager.getReminders());
    setNotifications(notifManager.getNotifications());
    setPermission(notifManager.getPermission());
  };

  useEffect(() => {
    refreshState();

    const handleUpdate = () => refreshState();
    window.addEventListener("amahas_alarms_updated", handleUpdate);
    window.addEventListener("amahas_reminders_updated", handleUpdate);
    window.addEventListener("amahas_notifications_updated", handleUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("amahas_alarms_updated", handleUpdate);
      window.removeEventListener("amahas_reminders_updated", handleUpdate);
      window.removeEventListener("amahas_notifications_updated", handleUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount =
    notifications.filter((n) => !n.isRead).length +
    reminders.filter((r) => !r.completed && new Date(r.dueDateTime).getTime() <= Date.now()).length;

  const handleRequestPermission = async () => {
    const res = await notifManager.requestPermission();
    setPermission(res);
    if (res === "granted") {
      notifManager.sendDesktopNotification("Desktop Notifications Enabled", {
        body: "You will receive real-time alarms, focus timer alerts, and revision reminders.",
      });
      audioAlarm.playNotificationChime();
    }
  };

  // Add Alarm
  const handleSaveAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTitle.trim() || !newAlarmTime) return;

    notifManager.addAlarm({
      title: newAlarmTitle.trim(),
      time: newAlarmTime,
      repeat: newAlarmRepeat,
      sound: newAlarmSound,
      enabled: true,
    });

    setNewAlarmTitle("");
    setShowAddAlarm(false);
    refreshState();
    audioAlarm.playNotificationChime();
  };

  // Add Reminder
  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim()) return;

    const targetDate = newRemDate || new Date().toISOString().substring(0, 10);
    const isoString = new Date(`${targetDate}T${newRemTime}:00`).toISOString();

    notifManager.addReminder({
      title: newRemTitle.trim(),
      note: newRemNote.trim() || undefined,
      dueDateTime: isoString,
      priority: newRemPriority,
      category: "GENERAL",
    });

    setNewRemTitle("");
    setNewRemNote("");
    setShowAddReminder(false);
    refreshState();
    audioAlarm.playNotificationChime();
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && notifications.length > 0) {
            notifManager.markAllAsRead();
          }
        }}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          isOpen
            ? "bg-white text-black border-white shadow-lg"
            : "bg-[#0a0a0a] border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
        }`}
        title="Alarms, Reminders & Notifications"
        aria-label="Notification Center"
      >
        <Bell className="w-4 h-4" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black font-mono font-bold text-[10px] flex items-center justify-center border border-black shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-3xl bg-[#0a0a0a] border border-zinc-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                Alarms &amp; Notifications
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Automatic scheduled triggers and sound reminders
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 bg-black/40 text-xs">
            <button
              onClick={() => setActiveTab("alarms")}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                activeTab === "alarms"
                  ? "border-b-2 border-white text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Alarms ({alarms.filter((a) => a.enabled).length})
            </button>
            <button
              onClick={() => setActiveTab("reminders")}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                activeTab === "reminders"
                  ? "border-b-2 border-white text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Reminders ({reminders.filter((r) => !r.completed).length})
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                activeTab === "feed"
                  ? "border-b-2 border-white text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Feed ({notifications.length})
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: ALARMS & TIMERS */}
            {activeTab === "alarms" && (
              <div className="space-y-4">
                {/* 1-Click Timer Presets */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block font-semibold">
                    Quick Countdown Alarms:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { min: 5, label: "5m Break" },
                      { min: 15, label: "15m Review" },
                      { min: 25, label: "25m Pomodoro" },
                      { min: 45, label: "45m Deep Work" },
                      { min: 60, label: "60m Sprint" },
                      { min: 90, label: "90m Block" },
                    ].map((preset) => (
                      <button
                        key={preset.min}
                        onClick={() => {
                          const now = new Date();
                          const target = new Date(now.getTime() + preset.min * 60 * 1000);
                          const hh = String(target.getHours()).padStart(2, "0");
                          const mm = String(target.getMinutes()).padStart(2, "0");
                          notifManager.addAlarm({
                            title: preset.label,
                            time: `${hh}:${mm}`,
                            repeat: "ONCE",
                            sound: "alarm",
                            enabled: true,
                          });
                          audioAlarm.playNotificationChime();
                          refreshState();
                          if (onStartQuickTimer) onStartQuickTimer(preset.min, preset.label);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors"
                      >
                        +{preset.min}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Set Custom Alarm Accordion / Button */}
                {!showAddAlarm ? (
                  <button
                    onClick={() => setShowAddAlarm(true)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Set Custom Alarm
                  </button>
                ) : (
                  <form onSubmit={handleSaveAlarm} className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Set Scheduled Alarm</span>
                      <button
                        type="button"
                        onClick={() => setShowAddAlarm(false)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                        Alarm Label
                      </label>
                      <input
                        type="text"
                        required
                        value={newAlarmTitle}
                        onChange={(e) => setNewAlarmTitle(e.target.value)}
                        placeholder="e.g. Focus Sprint Kickoff"
                        className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                          Time (HH:MM)
                        </label>
                        <input
                          type="time"
                          required
                          value={newAlarmTime}
                          onChange={(e) => setNewAlarmTime(e.target.value)}
                          className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                          Repeat
                        </label>
                        <select
                          value={newAlarmRepeat}
                          onChange={(e: any) => setNewAlarmRepeat(e.target.value)}
                          className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKDAYS">Mon - Fri</option>
                          <option value="ONCE">Once</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddAlarm(false)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs"
                      >
                        Save Alarm
                      </button>
                    </div>
                  </form>
                )}

                {/* Alarms List */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block font-semibold">
                    Active Alarms ({alarms.length}):
                  </span>

                  {alarms.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      No scheduled alarms. Add one above.
                    </div>
                  ) : (
                    alarms.map((alarm) => (
                      <div
                        key={alarm.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          alarm.enabled
                            ? "bg-black border-zinc-800"
                            : "bg-black/40 border-zinc-900 opacity-60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-white tracking-wider">
                              {alarm.time}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {alarm.repeat}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 truncate mt-0.5">
                            {alarm.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Test Sound button */}
                          <button
                            onClick={() => {
                              if (alarm.sound === "bell") audioAlarm.playReminderBell();
                              else if (alarm.sound === "chime") audioAlarm.playNotificationChime();
                              else {
                                audioAlarm.startContinuousAlarm(0.3);
                                setTimeout(() => audioAlarm.stopContinuousAlarm(), 1000);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs"
                            title="Preview Alarm Sound"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Enable/Disable Toggle */}
                          <button
                            onClick={() => {
                              notifManager.toggleAlarm(alarm.id);
                              refreshState();
                            }}
                            className={`w-9 h-5 rounded-full transition-colors relative ${
                              alarm.enabled ? "bg-white" : "bg-zinc-800"
                            }`}
                            title={alarm.enabled ? "Disable Alarm" : "Enable Alarm"}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                                alarm.enabled
                                  ? "right-0.5 bg-black"
                                  : "left-0.5 bg-zinc-500"
                              }`}
                            />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              notifManager.deleteAlarm(alarm.id);
                              refreshState();
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                            title="Remove Alarm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REMINDERS */}
            {activeTab === "reminders" && (
              <div className="space-y-4">
                {!showAddReminder ? (
                  <button
                    onClick={() => setShowAddReminder(true)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Reminder
                  </button>
                ) : (
                  <form onSubmit={handleSaveReminder} className="p-3.5 rounded-2xl bg-black border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Add Timed Reminder</span>
                      <button
                        type="button"
                        onClick={() => setShowAddReminder(false)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                        Reminder Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newRemTitle}
                        onChange={(e) => setNewRemTitle(e.target.value)}
                        placeholder="e.g. Literature Survey Paper Draft"
                        className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                          Date
                        </label>
                        <input
                          type="date"
                          value={newRemDate}
                          onChange={(e) => setNewRemDate(e.target.value)}
                          className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                          Time
                        </label>
                        <input
                          type="time"
                          value={newRemTime}
                          onChange={(e) => setNewRemTime(e.target.value)}
                          className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 font-mono uppercase">
                        Note / Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newRemNote}
                        onChange={(e) => setNewRemNote(e.target.value)}
                        placeholder="e.g. Target 3 pages minimum."
                        className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddReminder(false)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs"
                      >
                        Save Reminder
                      </button>
                    </div>
                  </form>
                )}

                {/* Reminders List */}
                <div className="space-y-2">
                  {reminders.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      No pending reminders.
                    </div>
                  ) : (
                    reminders.map((rem) => {
                      const isPast = new Date(rem.dueDateTime).getTime() <= Date.now();
                      return (
                        <div
                          key={rem.id}
                          className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                            rem.completed
                              ? "bg-black/30 border-zinc-900 opacity-60"
                              : isPast
                              ? "bg-zinc-900/60 border-zinc-700"
                              : "bg-black border-zinc-800"
                          }`}
                        >
                          <button
                            onClick={() => {
                              notifManager.toggleReminder(rem.id);
                              refreshState();
                            }}
                            className="mt-0.5 text-zinc-500 hover:text-white"
                          >
                            {rem.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <Circle className="w-4 h-4 text-zinc-600" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <h4
                              className={`text-xs font-semibold ${
                                rem.completed ? "line-through text-zinc-500" : "text-white"
                              }`}
                            >
                              {rem.title}
                            </h4>
                            {rem.note && (
                              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                                {rem.note}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 font-mono">
                              <span>
                                {new Date(rem.dueDateTime).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                                {" "}at{" "}
                                {new Date(rem.dueDateTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isPast && !rem.completed && (
                                <span className="text-zinc-300 font-bold uppercase">Due</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              notifManager.deleteReminder(rem.id);
                              refreshState();
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: FEED & NOTIFICATIONS */}
            {activeTab === "feed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold">
                    Activity History
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        notifManager.clearAllNotifications();
                        refreshState();
                      }}
                      className="text-[10px] text-zinc-500 hover:text-white underline font-mono"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No recent activity notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-2xl bg-black border border-zinc-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {n.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                      <p className="text-[11px] text-zinc-400 font-light">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Desktop Push Permission Banner */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Desktop Push:</span>
            </div>

            {permission === "granted" ? (
              <span className="text-[11px] font-mono text-white flex items-center gap-1">
                <Check className="w-3 h-3" /> Enabled
              </span>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-[11px] font-medium transition-colors"
              >
                Enable Notifications
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
