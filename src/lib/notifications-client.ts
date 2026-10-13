"use client";

import { audioAlarm } from "./audio-alarm";

export interface AlarmItem {
  id: string;
  title: string;
  time: string; // "HH:MM" in 24h format
  repeat: "ONCE" | "DAILY" | "WEEKDAYS";
  enabled: boolean;
  sound: "alarm" | "bell" | "chime";
  lastTriggeredDate?: string; // YYYY-MM-DD
}

export interface ReminderItem {
  id: string;
  title: string;
  note?: string;
  dueDateTime: string; // ISO String
  completed: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: "DEADLINE" | "REVISION" | "HABIT" | "GENERAL";
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  category: "ALARM" | "REMINDER" | "DEADLINE" | "REVISION" | "SYSTEM";
  createdAt: string;
  isRead: boolean;
  link?: string;
}

const STORAGE_KEY_ALARMS = "amahas_alarms_v1";
const STORAGE_KEY_REMINDERS = "amahas_reminders_v1";
const STORAGE_KEY_NOTIFS = "amahas_notifications_v1";

const DEFAULT_STARTER_ALARMS: AlarmItem[] = [
  {
    id: "alarm-morning-focus",
    title: "Morning Deep Work Focus Block",
    time: "09:00",
    repeat: "WEEKDAYS",
    enabled: true,
    sound: "alarm",
  },
  {
    id: "alarm-evening-review",
    title: "Daily Retrospective & Spaced Recall",
    time: "20:30",
    repeat: "DAILY",
    enabled: true,
    sound: "bell",
  },
];

const DEFAULT_STARTER_REMINDERS: ReminderItem[] = [
  {
    id: "rem-sm2-review",
    title: "Spaced Repetition (SM-2) Queue Due",
    note: "Review active recall items and formulas scheduled for today.",
    dueDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    completed: false,
    priority: "HIGH",
    category: "REVISION",
  },
  {
    id: "rem-habits",
    title: "Complete Daily Technical Disciplines",
    note: "Mark completed habits in your daily tracker.",
    dueDateTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    completed: false,
    priority: "MEDIUM",
    category: "HABIT",
  },
];

export class NotificationManager {
  /**
   * Request native browser notification permission.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }

  getPermission(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  }

  /**
   * Send native OS desktop browser notification.
   */
  sendDesktopNotification(title: string, options?: NotificationOptions) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          icon: "/icon.svg",
          badge: "/icon.svg",
          ...options,
        });
      } catch (e) {
        console.warn("Desktop notification creation failed:", e);
      }
    }
  }

  // --- Alarms ---
  getAlarms(): AlarmItem[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALARMS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_ALARMS, JSON.stringify(DEFAULT_STARTER_ALARMS));
        return DEFAULT_STARTER_ALARMS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_STARTER_ALARMS;
    }
  }

  saveAlarms(alarms: AlarmItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_ALARMS, JSON.stringify(alarms));
    window.dispatchEvent(new CustomEvent("amahas_alarms_updated"));
  }

  addAlarm(alarm: Omit<AlarmItem, "id">): AlarmItem {
    const alarms = this.getAlarms();
    const newAlarm: AlarmItem = {
      ...alarm,
      id: `alarm-${Date.now()}`,
    };
    this.saveAlarms([...alarms, newAlarm]);
    return newAlarm;
  }

  toggleAlarm(id: string) {
    const alarms = this.getAlarms().map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    this.saveAlarms(alarms);
  }

  deleteAlarm(id: string) {
    const alarms = this.getAlarms().filter((a) => a.id !== id);
    this.saveAlarms(alarms);
  }

  // --- Reminders ---
  getReminders(): ReminderItem[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(DEFAULT_STARTER_REMINDERS));
        return DEFAULT_STARTER_REMINDERS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_STARTER_REMINDERS;
    }
  }

  saveReminders(reminders: ReminderItem[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(reminders));
    window.dispatchEvent(new CustomEvent("amahas_reminders_updated"));
  }

  addReminder(rem: Omit<ReminderItem, "id" | "completed">): ReminderItem {
    const reminders = this.getReminders();
    const newRem: ReminderItem = {
      ...rem,
      id: `rem-${Date.now()}`,
      completed: false,
    };
    this.saveReminders([newRem, ...reminders]);
    return newRem;
  }

  toggleReminder(id: string) {
    const reminders = this.getReminders().map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    this.saveReminders(reminders);
  }

  deleteReminder(id: string) {
    const reminders = this.getReminders().filter((r) => r.id !== id);
    this.saveReminders(reminders);
  }

  // --- Notifications History ---
  getNotifications(): InAppNotification[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveNotifications(notifs: InAppNotification[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs));
    window.dispatchEvent(new CustomEvent("amahas_notifications_updated"));
  }

  pushNotification(
    title: string,
    message: string,
    category: InAppNotification["category"] = "SYSTEM",
    link?: string
  ): InAppNotification {
    const list = this.getNotifications();
    const notif: InAppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      category,
      createdAt: new Date().toISOString(),
      isRead: false,
      link,
    };
    this.saveNotifications([notif, ...list.slice(0, 49)]); // keep recent 50
    return notif;
  }

  markAllAsRead() {
    const notifs = this.getNotifications().map((n) => ({ ...n, isRead: true }));
    this.saveNotifications(notifs);
  }

  clearAllNotifications() {
    this.saveNotifications([]);
  }
}

export const notifManager = new NotificationManager();
