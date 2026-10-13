"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  notifManager,
  AlarmItem,
  ReminderItem,
} from "@/lib/notifications-client";
import { audioAlarm } from "@/lib/audio-alarm";
import { AlarmTriggerModal, ActiveAlarmData } from "./AlarmTriggerModal";

export function NotificationAlarmEngine() {
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmData | null>(null);
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const lastMinuteCheckedRef = useRef<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, "0");
      const currentMM = String(now.getMinutes()).padStart(2, "0");
      const currentHHMM = `${currentHH}:${currentMM}`;
      const todayDateStr = now.toISOString().substring(0, 10);
      const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const currentMinuteKey = `${todayDateStr}T${currentHHMM}`;

      // 1. Check Alarms only once per minute
      if (lastMinuteCheckedRef.current !== currentMinuteKey) {
        lastMinuteCheckedRef.current = currentMinuteKey;

        const alarms = notifManager.getAlarms();
        let alarmsUpdated = false;

        for (const alarm of alarms) {
          if (!alarm.enabled) continue;
          if (alarm.time !== currentHHMM) continue;

          // Check if already triggered today at this minute
          if (alarm.lastTriggeredDate === currentMinuteKey) continue;

          // Check repeat constraints
          if (alarm.repeat === "WEEKDAYS" && (dayOfWeek === 0 || dayOfWeek === 6)) {
            continue;
          }

          // Trigger Alarm!
          alarm.lastTriggeredDate = currentMinuteKey;
          if (alarm.repeat === "ONCE") {
            alarm.enabled = false;
          }
          alarmsUpdated = true;

          // Fire Audio & Modal
          setActiveAlarm({
            id: alarm.id,
            title: alarm.title,
            type: "ALARM",
            timeLabel: alarm.time,
            note: `Scheduled ${alarm.repeat.toLowerCase()} alarm at ${alarm.time}`,
          });

          // Fire Desktop Push
          notifManager.sendDesktopNotification(`Alarm: ${alarm.title}`, {
            body: `Scheduled alarm for ${alarm.time}`,
            requireInteraction: true,
          });

          // In-App Notification Feed
          notifManager.pushNotification(
            `Alarm: ${alarm.title}`,
            `Alarm triggered at ${alarm.time}`,
            "ALARM"
          );

          break; // trigger one alarm at a time to prevent UI stacking
        }

        if (alarmsUpdated) {
          notifManager.saveAlarms(alarms);
        }
      }

      // 2. Check Due Reminders
      const reminders = notifManager.getReminders();
      const nowTimestamp = now.getTime();

      for (const rem of reminders) {
        if (rem.completed) continue;
        const dueTime = new Date(rem.dueDateTime).getTime();

        if (dueTime <= nowTimestamp && !notifiedRemindersRef.current.has(rem.id)) {
          notifiedRemindersRef.current.add(rem.id);

          // Play Reminder Bell tone
          audioAlarm.playReminderBell(0.4);

          // Show in Notification Feed
          notifManager.pushNotification(
            `Reminder: ${rem.title}`,
            rem.note || `Reminder is due now.`,
            "REMINDER"
          );

          // Send Desktop Notification
          notifManager.sendDesktopNotification(`Reminder: ${rem.title}`, {
            body: rem.note || `Due now (${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
          });
        }
      }
    };

    // Run tick every 1000ms
    const interval = setInterval(tick, 1000);
    tick(); // initial check

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setActiveAlarm(null);
  };

  const handleSnooze = (minutes = 5) => {
    if (!activeAlarm) return;
    const now = new Date();
    const target = new Date(now.getTime() + minutes * 60 * 1000);
    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");

    notifManager.addAlarm({
      title: `${activeAlarm.title} (Snoozed)`,
      time: `${hh}:${mm}`,
      repeat: "ONCE",
      sound: "alarm",
      enabled: true,
    });

    setActiveAlarm(null);
  };

  return (
    <AlarmTriggerModal
      alarm={activeAlarm}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    />
  );
}
