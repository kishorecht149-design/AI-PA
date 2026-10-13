"use client";

import React, { useEffect } from "react";
import { Bell, Clock, AlertCircle, X, Volume2, RotateCcw } from "lucide-react";
import { audioAlarm } from "@/lib/audio-alarm";

export interface ActiveAlarmData {
  id: string;
  title: string;
  type: "ALARM" | "REMINDER" | "TIMER";
  timeLabel: string;
  note?: string;
}

export function AlarmTriggerModal({
  alarm,
  onDismiss,
  onSnooze,
}: {
  alarm: ActiveAlarmData | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}) {
  useEffect(() => {
    if (alarm) {
      // Start continuous audible alarm tone
      audioAlarm.startContinuousAlarm(0.5);
    }
    return () => {
      audioAlarm.stopContinuousAlarm();
    };
  }, [alarm]);

  if (!alarm) return null;

  const handleDismiss = () => {
    audioAlarm.stopContinuousAlarm();
    onDismiss();
  };

  const handleSnooze = (min = 5) => {
    audioAlarm.stopContinuousAlarm();
    onSnooze(min);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0a0a] border-2 border-white/20 p-6 md:p-8 space-y-6 shadow-[0_0_80px_rgba(255,255,255,0.15)] text-center relative overflow-hidden">
        {/* Pulsing light wave effect */}
        <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none animate-pulse" />

        {/* Animated Beacon Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl border-2 border-white animate-ping opacity-40" />
          <Bell className="w-10 h-10 text-white animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-white uppercase tracking-wider font-semibold">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
            {alarm.type} Triggered • {alarm.timeLabel}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white pt-1">
            {alarm.title}
          </h2>
          {alarm.note && (
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed font-light">
              {alarm.note}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleSnooze(5)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-medium text-xs transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" /> Snooze (5 Mins)
          </button>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-xl flex items-center justify-center gap-2"
          >
            Dismiss Alarm
          </button>
        </div>
      </div>
    </div>
  );
}
