"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Bot,
  Command,
  HelpCircle,
  FileText,
  FolderKanban,
  CheckSquare,
  Network,
  RotateCcw,
} from "lucide-react";
import {
  voiceTransceiver,
  TransceiverStatus,
} from "@/lib/voice-transceiver";
import { parseVoiceIntent, ParsedVoiceIntent } from "@/lib/voice-intent-parser";
import { VoiceHologramOrb } from "@/components/voice/VoiceHologramOrb";
import { notifManager } from "@/lib/notifications-client";

interface ActionLogItem {
  id: string;
  timestamp: string;
  command: string;
  intent: ParsedVoiceIntent;
  status: "success" | "executing" | "error";
  aiResponse?: string;
}

const SAMPLE_COMMANDS = [
  { icon: CheckSquare, text: "Create high priority task Review Raft Consensus", category: "Tasks" },
  { icon: Zap, text: "Start 45 minute Gamma focus session", category: "Focus" },
  { icon: FileText, text: "Take note: Memory footprint in multi-level paging", category: "Notes" },
  { icon: Network, text: "Go to 3D Knowledge Graph", category: "Navigation" },
  { icon: Clock, text: "Set reminder for Systems Conference at 10:00", category: "Reminders" },
  { icon: Bot, text: "Explain the difference between AWQ and INT4 quantization", category: "AI Q&A" },
];

export default function VoiceTransceiverPage() {
  const router = useRouter();
  const [status, setStatus] = useState<TransceiverStatus>({
    state: "idle",
    transcript: "",
    interimTranscript: "",
    isMuted: false,
    voiceVolume: 1.0,
  });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Sync with Voice Transceiver client
  useEffect(() => {
    if (!voiceTransceiver) return;
    setIsSupported(voiceTransceiver.getIsSupported());

    const unsubscribe = voiceTransceiver.subscribe((newStatus: TransceiverStatus) => {
      setStatus(newStatus);
      setAnalyser(voiceTransceiver.getAnalyser());
    });

    voiceTransceiver.setOnCommand((command: string) => {
      handleExecuteCommand(command);
    });

    return () => {
      unsubscribe();
      voiceTransceiver.stopListening();
      voiceTransceiver.stopSpeaking();
    };
  }, []);

  // Dispatch and execute parsed voice intent
  const handleExecuteCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    const intent = parseVoiceIntent(commandText);
    const logId = `log-${Date.now()}`;
    const newLog: ActionLogItem = {
      id: logId,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      command: commandText,
      intent,
      status: "executing",
    };

    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);

    try {
      if (intent.type === "CREATE_TASK") {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: intent.payload.title,
            priority: intent.payload.priority,
            status: "TODO",
          }),
        });

        const speakText = `Created ${intent.payload.priority.toLowerCase()} priority task: ${intent.payload.title}.`;
        setLatestResponse(speakText);
        voiceTransceiver?.speak(speakText);
        updateLogStatus(logId, "success", speakText);
      } else if (intent.type === "START_FOCUS") {
        const speakText = `Starting ${intent.payload.minutes} minute flow session in Deep Work Arena.`;
        setLatestResponse(speakText);
        voiceTransceiver?.speak(speakText, () => {
          router.push(`/focus`);
        });
        updateLogStatus(logId, "success", speakText);
      } else if (intent.type === "TAKE_NOTE") {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: intent.payload.title,
            content: intent.payload.content,
            category: intent.payload.category,
          }),
        });

        const speakText = `Saved new knowledge note: ${intent.payload.title}.`;
        setLatestResponse(speakText);
        voiceTransceiver?.speak(speakText);
        updateLogStatus(logId, "success", speakText);
      } else if (intent.type === "SET_REMINDER") {
        const due = new Date();
        const parts = (intent.payload.time || "12:00").split(":");
        if (parts[0]) due.setHours(parseInt(parts[0], 10));
        if (parts[1]) due.setMinutes(parseInt(parts[1], 10));

        notifManager.addReminder({
          title: intent.payload.title,
          dueDateTime: due.toISOString(),
          category: "GENERAL",
          priority: "HIGH",
        });

        const speakText = `Scheduled reminder for ${intent.payload.title} at ${intent.payload.time}.`;
        setLatestResponse(speakText);
        voiceTransceiver?.speak(speakText);
        updateLogStatus(logId, "success", speakText);
      } else if (intent.type === "NAVIGATE") {
        const speakText = `Navigating to ${intent.payload.name}.`;
        setLatestResponse(speakText);
        voiceTransceiver?.speak(speakText, () => {
          router.push(intent.payload.path);
        });
        updateLogStatus(logId, "success", speakText);
      } else {
        // QUERY_AI: General AI Dialogue
        setLatestResponse("Synthesizing answer...");
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: intent.rawText }),
        });

        if (!res.ok) {
          throw new Error("Assistant response error");
        }

        const data = await res.json();
        const aiAnswer = data.response || "I have processed your query.";
        setLatestResponse(aiAnswer);
        voiceTransceiver?.speak(aiAnswer);
        updateLogStatus(logId, "success", aiAnswer);
      }
    } catch (err: any) {
      console.error("Error executing voice command:", err);
      const errorMsg = "Encountered an issue executing that command. Please try again.";
      setLatestResponse(errorMsg);
      voiceTransceiver?.speak(errorMsg);
      updateLogStatus(logId, "error", errorMsg);
    }
  };

  const updateLogStatus = (id: string, status: "success" | "error", aiResponse?: string) => {
    setLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, aiResponse } : item))
    );
  };

  const handleToggleListening = () => {
    if (!voiceTransceiver) return;
    voiceTransceiver.toggleListening();
  };

  const handleToggleMute = () => {
    if (!voiceTransceiver) return;
    voiceTransceiver.setMuted(!status.isMuted);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-purple-500/20 border border-zinc-800 flex items-center justify-center">
              <Mic className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  Omni-Command Voice AI & Neural Transceiver
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Neural Speech Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                Hands-free speech recognition, real-time 3D audio waveform orb, autonomous workspace action dispatch, and spoken natural responses.
              </p>
            </div>
          </div>
        </div>

        {/* Audio Mute & State Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              status.isMuted
                ? "bg-rose-950/40 border-rose-800/80 text-rose-300"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
            }`}
            title="Toggle Spoken Audio Responses"
          >
            {status.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>Voice Speech: {status.isMuted ? "Muted" : "Active"}</span>
          </button>

          <button
            onClick={handleToggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              status.state === "listening"
                ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                : "bg-white hover:bg-zinc-200 text-black"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{status.state === "listening" ? "Stop Listening" : "Tap to Speak"}</span>
          </button>
        </div>
      </div>

      {!isSupported && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300 flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            Note: Your current browser does not natively expose the Web Speech API. For full hands-free voice recognition, Google Chrome, Brave, or Microsoft Edge is recommended. You can still test voice commands by clicking any of the prompts below!
          </span>
        </div>
      )}

      {/* Main Voice Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hologram Orb & Live Telemetry (Cols 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* 3D Voice Hologram Orb Canvas */}
          <VoiceHologramOrb
            state={status.state}
            analyser={analyser}
            onToggle={handleToggleListening}
          />

          {/* Live Transcription & Response Bubble */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Live Transcription & Dialogue
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                {status.state === "listening" ? "Streaming audio input..." : "Standby"}
              </span>
            </div>

            {/* User Speech Display */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 min-h-[64px] flex items-center">
              {status.interimTranscript ? (
                <p className="text-sm text-emerald-300 font-medium italic animate-pulse">
                  "{status.interimTranscript}..."
                </p>
              ) : status.transcript ? (
                <p className="text-sm text-white font-medium">"{status.transcript}"</p>
              ) : (
                <p className="text-xs text-zinc-600 italic">
                  Tap the center orb or button above and speak naturally...
                </p>
              )}
            </div>

            {/* AMAHAS Neural Voice Response Display */}
            {latestResponse && (
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-900/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    AMAHAS Voice Response
                  </span>
                  {status.state === "speaking" && (
                    <span className="flex items-center gap-1 text-[10px] text-pink-400 font-medium">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      Speaking Aloud
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  {latestResponse}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Voice Command Cheat Sheet & Execution Logs (Cols 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Voice Command Cheat Sheet */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-sky-400" />
                Spoken Command Patterns
              </h3>
              <span className="text-[10px] text-zinc-500">Tap to test</span>
            </div>

            <div className="space-y-2">
              {SAMPLE_COMMANDS.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleExecuteCommand(cmd.text)}
                    className="w-full text-left p-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-700 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-zinc-600">
                        <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                      </div>
                      <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                        "{cmd.text}"
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 uppercase shrink-0">
                      {cmd.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Execution Logs */}
          <div className="rounded-3xl bg-[#0a0a0a] border border-zinc-800 p-5 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Recent Voice Actions
            </h3>

            {logs.length === 0 ? (
              <p className="text-xs text-zinc-600 italic py-4 text-center">
                No voice commands executed in this session yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-900 flex flex-col gap-1.5 text-xs animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200 truncate max-w-[200px]">
                        "{log.command}"
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{log.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      {log.status === "success" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      {log.status === "executing" && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
                      )}
                      <span>{log.intent.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
