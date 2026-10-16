"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Cpu,
  Lock,
  Plus,
  CheckSquare,
  Video,
  Clock,
  Folder,
  GraduationCap,
  ChevronRight,
  X,
  Check,
  Settings2,
  Copy,
  Terminal,
  Activity,
  Layers,
  Square,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";
import { AmahAsAvatar } from "@/components/assistant/AmahAsAvatar";
import { AvatarControls } from "@/components/assistant/AvatarControls";
import { AssistantState } from "@/components/assistant/types";
import { AutonomousBehaviorEngine } from "@/components/assistant/AutonomousBehaviorEngine";
import { ToolConfirmationCard, type PendingTool } from "@/components/assistant/ToolConfirmationCard";
import { ToolResultCard } from "@/components/assistant/ToolResultCard";

interface MessageItem {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCallsJson?: string | null;
  executedToolResults?: Array<{ toolName: string; result: any }>;
}

interface PendingToolConfirmation {
  toolName: string;
  args: any;
  callId?: string;
  idempotencyKey?: string;
}

const QUICK_PROMPTS = [
  { label: "📋 Summarize tasks", prompt: "Summarize my high-priority tasks and upcoming deadlines for today." },
  { label: "🚀 Draft project update", prompt: "Draft a concise, executive project progress update based on my current work." },
  { label: "📅 Review schedule", prompt: "Review today's schedule and recommend optimal Deep Work focus blocks." },
  { label: "⚡ 45m Focus Block", prompt: "Schedule a 45-minute distraction-free Deep Work focus session." },
  { label: "🔍 Research topic", prompt: "Search the web and synthesize the latest developments and papers on: " },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState("openrouter/free");
  const [modelOptions, setModelOptions] = useState<Array<{ id: string; name: string; isLocal?: boolean }>>(KNOWN_FREE_MODELS);
  const [ollamaActive, setOllamaActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [avatarState, setAvatarState] = useState<AssistantState>("idle");
  const [clipOverride, setClipOverride] = useState<string | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // Quick Action Menu & Task Selector
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Pending tool confirmation
  const [pendingTool, setPendingTool] = useState<PendingToolConfirmation | null>(null);

  // Voice capabilities & detection
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Stop Generation & Error Recovery
  const abortControllerRef = useRef<AbortController | null>(null);
  const [errorState, setErrorState] = useState<{ message: string; prompt: string } | null>(null);

  // Autonomous Behavior Engine Reference
  const engineRef = useRef<AutonomousBehaviorEngine | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Browser feature detection & URL dev mode check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsVoiceSupported(hasSpeech);

      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true") {
        setShowDevModal(true);
      }
    }
  }, []);

  const fetchUserTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setUserTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
        setShowTaskPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => {
        if (d.conversation?.messages && d.conversation.messages.length > 0) {
          setMessages(d.conversation.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content:
                "Greetings Kishore. I am your AMAHAS Assistant. I coordinate your research, project execution, and deep focus workflows. How may I assist your work today?",
            },
          ]);
        }
        if (d.memories) setMemories(d.memories);
      })
      .catch((err) => console.error("[Assistant] Initial load error:", err));

    // Dynamic model discovery (probe local Ollama daemon & cloud routes)
    fetch("/api/assistant/models")
      .then((res) => res.json())
      .then((d) => {
        if (d.localModels && d.cloudModels) {
          setModelOptions([...d.localModels, ...d.cloudModels]);
          setOllamaActive(Boolean(d.ollamaAvailable));
        }
      })
      .catch((err) => console.warn("[Assistant] Model discovery notice:", err));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingTool, loading]);

  const speakText = (text: string) => {
    if (ttsEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.onstart = () => {
        if (engineRef.current) {
          engineRef.current.executeDirectorCommand({
            behavior: "speaking",
            intensity: 0.8,
            durationMs: Math.max(3000, Math.min(8000, text.length * 60)),
            reason: "TTS Speech Active",
          });
        }
      };
      u.onend = () => {
        if (engineRef.current) {
          engineRef.current.resetToIdle();
        }
      };
      window.speechSynthesis.speak(u);
    }
  };

  // Connect Autonomous Engine
  const handleEngineReady = (engine: AutonomousBehaviorEngine) => {
    engineRef.current = engine;
    engine.onStateChange = (st) => {
      setAvatarState(st);
    };
  };

  // User typing in input box triggers autonomous listening posture
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (engineRef.current) {
      engineRef.current.onUserTyping();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    if (engineRef.current) {
      engineRef.current.resetToIdle();
    }
  };

  const handleSend = async (e?: React.FormEvent, directPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = directPrompt || input.trim();
    if (!promptToSend || loading) return;

    setErrorState(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: promptToSend }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Transition avatar to autonomous thinking state immediately
    if (engineRef.current) {
      engineRef.current.onRequestSent();
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptToSend,
          modelId,
        }),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server returned status ${res.status}.`);
      }

      if (data?.message) {
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            executedToolResults: data.executedToolResults,
          },
        ]);

        // Route autonomous behavior through the AI director
        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            content: data.message.content,
            command: data.behaviorCommand,
            userPrompt: promptToSend,
            isAudioPlaying: ttsEnabled,
          });
        }

        speakText(data.message.content);
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Notice: ${data.error}`,
          },
        ]);
        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            isError: true,
            userPrompt: promptToSend,
          });
        }
      } else {
        const fallbackText =
          "I'm right here with you! Let's organize your tasks, review research papers, or structure today's deep work schedule.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: fallbackText,
          },
        ]);
        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            content: fallbackText,
            userPrompt: promptToSend,
          });
        }
      }

      // Check if tool requires user confirmation
      if (data.requiresConfirmation && data.toolCalls && data.toolCalls.length > 0) {
        const call = data.toolCalls[0];
        setPendingTool({
          toolName: call.function?.name,
          args: JSON.parse(call.function?.arguments || "{}"),
          callId: call.id,
          idempotencyKey: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Response generation was stopped." },
        ]);
        if (engineRef.current) {
          engineRef.current.resetToIdle();
        }
      } else {
        setErrorState({ message: err.message, prompt: promptToSend });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `System notice: ${err.message}` },
        ]);
        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            isError: true,
            userPrompt: promptToSend,
          });
        }
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleConfirmTool = async (approve: boolean, toolOverride?: PendingTool) => {
    const toolToRun = toolOverride || pendingTool;
    if (!toolToRun) return;
    setPendingTool(null);

    if (!approve) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Action cancelled. No changes were made.`,
        },
      ]);
      return;
    }

    try {
      const idempotencyKey =
        toolToRun.idempotencyKey ||
        `tool_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executeConfirmedTool: {
            toolName: toolToRun.toolName,
            args: toolToRun.args,
            idempotencyKey,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Automatically refresh user tasks if task-related mutation
        if (["create_task", "update_task_status", "delete_task"].includes(toolToRun.toolName)) {
          fetchUserTasks();
        }

        const messageText = `Confirmed & Executed: ${
          data.toolResult?.message || "Operation completed successfully."
        }`;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: messageText,
            executedToolResults: [{ toolName: toolToRun.toolName, result: data.toolResult }],
          },
        ]);
        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            content: messageText,
            isSuccess: true,
          });
        }
      } else {
        throw new Error(data.error || "Execution failed.");
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Execution failed: ${e.message}` },
      ]);
      if (engineRef.current) {
        engineRef.current.onResponseReceived({
          isError: true,
        });
      }
    }
  };

  const toggleVoiceRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      if (engineRef.current) {
        engineRef.current.onUserVoiceActive(false);
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      if (engineRef.current) {
        engineRef.current.onUserVoiceActive(true);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      if (engineRef.current) {
        engineRef.current.onUserVoiceActive(false);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      if (engineRef.current) {
        engineRef.current.onUserVoiceActive(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (engineRef.current) {
        engineRef.current.onUserVoiceActive(false);
      }
    };

    recognition.start();
  };

  const handleDeleteMemory = async (id: string) => {
    await fetch(`/api/assistant?memoryId=${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const copyToClipboard = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to render markdown content with code blocks
  const renderMessageContent = (content: string, msgIdx: number) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: "code",
        lang: match[1] || "text",
        code: match[2].trim(),
        id: msgIdx * 100 + blockCounter++,
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.substring(lastIndex),
      });
    }

    if (parts.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    return (
      <div className="space-y-3">
        {parts.map((p, i) => {
          if (p.type === "code") {
            const isCopied = copiedCodeIdx === p.id;
            return (
              <div
                key={i}
                className="my-2 rounded-xl bg-black/60 border border-white/10 overflow-hidden font-mono text-[11px]"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/10 text-slate-400">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-cyan-300">
                    <Terminal className="w-3 h-3" />
                    {p.lang}
                  </span>
                  <button
                    onClick={() => copyToClipboard(p.code!, p.id!)}
                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }
          return (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {p.content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10 px-2 sm:px-4">
      {/* Top Header & Assistant Identity */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/10 to-transparent border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                AMAHAS Assistant
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous AI coordinator &amp; research partner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Model Gateway Selector */}
          <div className="relative">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="bg-[#0b1120] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            >
              {modelOptions.some((m) => m.isLocal) && (
                <optgroup label="Local Models (Ollama - Private)">
                  {modelOptions
                    .filter((m) => m.isLocal)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        ⚡ {m.name}
                      </option>
                    ))}
                </optgroup>
              )}
              <optgroup label="Cloud Free Models (OpenRouter)">
                {modelOptions
                  .filter((m) => !m.isLocal)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      ☁️ {m.name.length > 34 ? m.name.substring(0, 32) + "…" : m.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Voice Speech (TTS) Output Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              ttsEnabled
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title={ttsEnabled ? "Voice Output Active" : "Voice Output Muted"}
          >
            {ttsEnabled ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Memories Drawer Trigger */}
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Memories ({memories.length})</span>
          </button>

          {/* Discreet Developer Tools Trigger */}
          <button
            onClick={() => setShowDevModal(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Inspect 3D Rigs & Clips (Dev Tools)"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Business Layout: Side-by-Side Character Stage + Conversation Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==========================================
            COLUMN 1: DEDICATED 3D CHARACTER STAGE
            ========================================== */}
        <section className="lg:col-span-5 flex flex-col items-center justify-between rounded-3xl bg-gradient-to-b from-[#0b1120] via-[#070b14] to-black border border-cyan-500/20 p-5 shadow-2xl relative overflow-hidden min-h-[560px]">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none" />

          {/* Contextual Status Pill (Unobtrusive & Clean) */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Avatar State
              </span>
            </div>

            {avatarState === "listening" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-medium animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Listening...
              </div>
            )}

            {avatarState === "thinking" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 text-xs font-medium animate-pulse shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                Synthesizing...
              </div>
            )}

            {avatarState === "speaking" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-medium shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Speaking...
              </div>
            )}

            {avatarState === "explaining" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-medium shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                Explaining concept...
              </div>
            )}

            {avatarState === "success" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-medium shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                Task complete
              </div>
            )}

            {avatarState === "idle" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                Ready
              </div>
            )}

            {avatarState === "warning" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-xs font-medium">
                Notice / Caution
              </div>
            )}

            {avatarState === "greeting" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-medium">
                Welcome Wave
              </div>
            )}

            {avatarState === "goodbye" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
                Farewell
              </div>
            )}

            {avatarState === "dance" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-300 text-xs font-medium">
                Dance Flourish
              </div>
            )}

            {/* Engine Type Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${modelId.startsWith("ollama/") ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
              <span className="text-slate-300">
                {modelId.startsWith("ollama/") ? "Local Ollama" : "Cloud Gateway"}
              </span>
            </div>
          </div>

          {/* 3D Character Viewport with Floor Glow */}
          <div className="relative my-auto flex items-center justify-center w-full z-10 py-2">
            <AmahAsAvatar
              state={avatarState}
              clipOverride={clipOverride}
              size={330}
              interactiveLookAt={true}
              showFloorShadow={true}
              showDevControls={false}
              onEngineReady={handleEngineReady}
              onStateChange={(st) => setAvatarState(st)}
              className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
            />
          </div>

          {/* Stage Bottom Controls: Quick Mic, Audio, Reset */}
          <div className="w-full flex items-center justify-between pt-3 border-t border-white/10 z-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  isRecording
                    ? "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Voice Input</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setClipOverride(null);
                  if (engineRef.current) engineRef.current.resetToIdle();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                title="Reset avatar to natural idle"
              >
                ↺ Reset
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
              AMAHAS Neural Rig v2.0
            </div>
          </div>
        </section>

        {/* ==========================================
            COLUMN 2: FULL CONVERSATION WORKSPACE
            ========================================== */}
        <section className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-[#0b1120] border border-white/10 p-5 shadow-2xl relative overflow-hidden min-h-[560px]">
          {/* Quick Action Suggestion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none border-b border-white/5">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(undefined, qp.prompt)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-cyan-200 transition-all font-medium"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Conversation Message Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[420px] min-h-[340px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-message-in ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 mt-0.5 w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed transition-all duration-200 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-medium shadow-md shadow-cyan-500/10"
                      : "bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 text-slate-200 shadow-sm"
                  }`}
                >
                  {renderMessageContent(msg.content, i)}

                  {/* Render executed tool results if attached */}
                  {msg.executedToolResults && msg.executedToolResults.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 space-y-2">
                      {msg.executedToolResults.map((tr, idx) => (
                        <ToolResultCard key={idx} toolName={tr.toolName} result={tr.result} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Permission Review Card for mutating tool actions */}
            {pendingTool && (
              <ToolConfirmationCard
                tool={pendingTool}
                onConfirm={handleConfirmTool}
              />
            )}

            {/* Holographic Synthesizing Indicator Card */}
            {loading && (
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#070b14]/90 border border-cyan-500/30 max-w-md animate-message-in relative overflow-hidden shadow-xl backdrop-blur-md">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <span>AMAHAS is synthesizing</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-typing-1" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-typing-2" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-typing-3" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Coordinating tasks, research reasoning, and memory context...
                  </p>
                </div>
              </div>
            )}
            {/* Error Recovery Card */}
            {errorState && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 animate-message-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{errorState.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSend(undefined, errorState.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-xs shrink-0 transition-colors ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => handleSend(e)}
            className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 relative"
          >
            {/* Quick Action '+' Menu Button */}
            <div className="relative" ref={actionMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowActionMenu(!showActionMenu);
                  setShowTaskPicker(false);
                }}
                className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-center ${
                  showActionMenu
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                title="Quick Tools &amp; Tasks (+)"
              >
                <Plus
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showActionMenu ? "rotate-45 text-cyan-400" : ""
                  }`}
                />
              </button>

              {/* Quick Action Popover Menu */}
              {showActionMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-72 sm:w-80 rounded-2xl bg-[#0b1120] border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 space-y-1 backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 flex items-center justify-between">
                    <span>Assistant Quick Tools</span>
                    <span className="text-cyan-400 font-mono">1-Click</span>
                  </div>

                  {!showTaskPicker ? (
                    <div className="max-h-64 overflow-y-auto space-y-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTaskPicker(true);
                          fetchUserTasks();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100">Select from My Tasks</div>
                          <div className="text-[10px] text-slate-400">Pick a pending task to execute</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInput("Search web and YouTube tutorials for: ");
                          setShowActionMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-1 rounded-lg bg-red-500/20 text-red-400">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100">Search Web &amp; Video</div>
                          <div className="text-[10px] text-slate-400">Tutorials, video links &amp; docs</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInput("Schedule a 45-minute focus block for: ");
                          setShowActionMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100">Schedule Focus Block</div>
                          <div className="text-[10px] text-slate-400">Add to planner &amp; calendar</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInput(
                            "Create a section on my dashboard named Resources with folders for Video Links, Online Materials, Books, Information"
                          );
                          setShowActionMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                          <Folder className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100">Customize Dashboard</div>
                          <div className="text-[10px] text-slate-400">Create sections &amp; folders</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInput("Quiz me with 3 rapid retention questions on: ");
                          setShowActionMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100">Concept Mastery Quiz</div>
                          <div className="text-[10px] text-slate-400">3-question knowledge drill</div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    /* Task Picker Submenu */
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between px-2 pb-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowTaskPicker(false)}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          ← Back to actions
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {userTasks.length} tasks
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {loadingTasks ? (
                          <div className="text-center py-4 text-xs text-slate-400 animate-pulse">
                            Loading your tasks...
                          </div>
                        ) : userTasks.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400 space-y-1">
                            <div>No pending tasks found.</div>
                            <button
                              type="button"
                              onClick={() => {
                                setInput("Create task: ");
                                setShowActionMenu(false);
                              }}
                              className="text-cyan-400 hover:underline text-[11px]"
                            >
                              + Create new task
                            </button>
                          </div>
                        ) : (
                          userTasks.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setInput(
                                  `Help me work on my task: "${t.title}" (Priority: ${t.priority})`
                                );
                                setShowActionMenu(false);
                              }}
                              className="w-full flex items-start gap-2 p-2 rounded-xl text-left text-xs bg-white/[0.03] hover:bg-white/10 transition-colors border border-white/5"
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 ${
                                  t.priority === "URGENT"
                                    ? "bg-red-500/20 text-red-400"
                                    : t.priority === "HIGH"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-blue-500/20 text-blue-400"
                                }`}
                              >
                                {t.priority}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-slate-100 font-medium truncate">
                                  {t.title}
                                </div>
                                {t.dueDate && (
                                  <div className="text-[10px] text-slate-400">
                                    Due: {new Date(t.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Text Input */}
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask AMAHAS to plan tasks, conduct research, structure study blocks, or review papers..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />

            {/* Voice Input Microphone Button (Only enabled when supported) */}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-center ${
                  isRecording
                    ? "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                title={isRecording ? "Stop voice listening" : "Voice input via SpeechRecognition"}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 text-red-400 animate-pulse" />
                ) : (
                  <Mic className="w-4 h-4 text-cyan-400" />
                )}
              </button>
            )}

            {/* Action Button: Stop Generation when loading, else Send */}
            {loading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-5 py-3 rounded-xl bg-red-500/25 hover:bg-red-500/35 border border-red-500/40 text-red-200 font-semibold text-xs shadow-md shadow-red-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Stop generation"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black font-semibold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </form>
        </section>
      </div>

      {/* ==========================================
          MODAL: USER-APPROVED AI MEMORIES DRAWER
          ========================================== */}
      {showMemoryDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b1120] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
                <ShieldCheck className="w-4 h-4" /> User-Approved AI Memories
              </div>
              <button
                onClick={() => setShowMemoryDrawer(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              These verified memories enrich the assistant&apos;s context securely without leaking unvetted notes.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No saved memories yet.
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                        {m.key}
                      </span>
                      <span className="text-slate-200 mt-0.5 block leading-relaxed">
                        {m.value}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="p-1 text-slate-500 hover:text-red-400 shrink-0"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: HIDDEN DEVELOPER DECK & RIG AUDITION
          ========================================== */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0b1120] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span>3D Character Developer &amp; Rig Deck</span>
              </div>
              <button
                onClick={() => setShowDevModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Audition character skeletal animations, adjust playback speeds, and test speech cadences.
              This diagnostic deck is hidden from standard users by default.
            </p>

            <AvatarControls
              currentState={avatarState}
              currentClipName={clipOverride || "Natural Idle"}
              playbackSpeed={1.0}
              onStateSelect={(st) => {
                setClipOverride(null);
                setAvatarState(st);
                if (engineRef.current) {
                  engineRef.current.executeDirectorCommand({
                    behavior: st,
                    intensity: 0.8,
                    durationMs: 3500,
                    reason: `Manual dev selection: ${st}`,
                  });
                }
              }}
              onClipSelect={(clip) => {
                setClipOverride(clip);
              }}
              onSpeedChange={(spd) => {
                console.log("[Dev Deck] Speed changed to:", spd);
              }}
              onTestSpeech={(text) => {
                speakText(text);
                if (engineRef.current) {
                  engineRef.current.executeDirectorCommand({
                    behavior: "speaking",
                    intensity: 0.8,
                    durationMs: 4000,
                    reason: "Dev speech test",
                  });
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
