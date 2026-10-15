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
  Key,
  AlertCircle,
  Check,
  X,
  Lock,
  Plus,
  CheckSquare,
  Video,
  Clock,
  Folder,
  GraduationCap,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";
import { AiOrb, AiOrbState } from "@/components/AiOrb";
import { GuardianBot3D, BotRigAction } from "@/components/assistant/GuardianBot3D";

interface MessageItem {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCallsJson?: string | null;
}

interface PendingToolConfirmation {
  toolName: string;
  args: any;
  callId: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState("openrouter/free");
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [showBotStage, setShowBotStage] = useState(false);
  const [botActionOverride, setBotActionOverride] = useState<BotRigAction | null>(null);

  // Quick Action Menu & Task Selector
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Pending tool confirmation
  const [pendingTool, setPendingTool] = useState<PendingToolConfirmation | null>(null);

  // Voice capabilities
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (d.conversation?.messages) {
          setMessages(d.conversation.messages);
        } else {
          // Welcome greeting
          setMessages([
            {
              role: "assistant",
              content:
                "Greetings. I am your AMAHAS Assistant. I coordinate your research, project execution, and deep focus workflows. How may I assist your work today?",
            },
          ]);
        }
        if (d.memories) setMemories(d.memories);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingTool]);

  const speakText = (text: string) => {
    if (ttsEnabled && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          modelId,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server returned status ${res.status}.`);
      }

      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
        speakText(data.message.content);
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Notice: ${data.error}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm right here with you! Let's organize your tasks, explore research papers, or review today's schedule.",
          },
        ]);
      }

      // Check if tool requires user confirmation
      if (data.requiresConfirmation && data.toolCalls && data.toolCalls.length > 0) {
        const call = data.toolCalls[0];
        setPendingTool({
          toolName: call.function?.name,
          args: JSON.parse(call.function?.arguments || "{}"),
          callId: call.id,
        });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `System notice: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTool = async (approve: boolean) => {
    if (!pendingTool) return;
    const toolToRun = pendingTool;
    setPendingTool(null);

    if (!approve) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Action cancelled by student. No changes were made.`,
        },
      ]);
      return;
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executeConfirmedTool: {
            toolName: toolToRun.toolName,
            args: toolToRun.args,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Confirmed & Executed: ${data.toolResult?.message || "Operation completed successfully."}`,
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Execution failed: ${e.message}` },
      ]);
    }
  };

  const toggleVoiceRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleDeleteMemory = async (id: string) => {
    await fetch(`/api/assistant?memoryId=${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const currentOrbState: AiOrbState = isRecording
    ? "listening"
    : loading
    ? "thinking"
    : ttsEnabled
    ? "speaking"
    : "idle";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3.5">
          <AiOrb
            state={currentOrbState}
            size="md"
            showStatusLabel={true}
            onClick={() => {
              if (!isRecording) toggleVoiceRecording();
            }}
          />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Personal AI Assistant
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Permission-bounded coordinator over live search, tasks, syllabus, and memory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Gateway Selector */}
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="bg-[#0b1120] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-400 font-mono"
          >
            {KNOWN_FREE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              ttsEnabled
                ? "bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
            }`}
            title={ttsEnabled ? "Voice Output Active" : "Voice Output Muted"}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* 3D Guardian Bot Rig Stage Toggle */}
          <button
            onClick={() => setShowBotStage(!showBotStage)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
              showBotStage
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-semibold"
                : "bg-white/5 border-white/5 text-slate-300 hover:text-white"
            }`}
            title="Inspect 3D Golden Guardian Bot & Rig Actions"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>3D Body</span>
          </button>

          {/* Memory Inspector Drawer Trigger */}
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Memories ({memories.length})</span>
          </button>
        </div>
      </div>

      {/* 3D Golden Guardian Bot Holo-Deck & Rig Action Stage */}
      {showBotStage && (
        <div className="rounded-3xl bg-gradient-to-b from-black/80 via-zinc-950/90 to-black/90 border border-amber-500/30 p-5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Golden Guardian Bot — Kinetic 3D Avatar
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Status:</span>
              <span className="font-semibold text-white capitalize">
                {botActionOverride || currentOrbState}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            {/* The 3D Canvas */}
            <div className="relative flex items-center justify-center">
              <GuardianBot3D
                action={botActionOverride || (currentOrbState as BotRigAction)}
                size={260}
                interactiveLookAt={true}
                showEnergyCore={true}
                showActionBadge={true}
              />
            </div>

            {/* Rig Action Control Deck */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1">
                Trigger Rig Actions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setBotActionOverride("idle")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    (botActionOverride || currentOrbState) === "idle"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  🛡️ Hover (Idle)
                </button>
                <button
                  onClick={() => setBotActionOverride("listening")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    (botActionOverride || currentOrbState) === "listening"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  👂 Listen Pose
                </button>
                <button
                  onClick={() => setBotActionOverride("thinking")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    (botActionOverride || currentOrbState) === "thinking"
                      ? "bg-sky-500/20 border-sky-500 text-sky-300 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  ⚡ Quantum Scan
                </button>
                <button
                  onClick={() => setBotActionOverride("speaking")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    (botActionOverride || currentOrbState) === "speaking"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  🗣️ Speaking Nod
                </button>
                <button
                  onClick={() => setBotActionOverride("salute")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    botActionOverride === "salute"
                      ? "bg-yellow-500/30 border-yellow-400 text-yellow-200 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  ⚔️ 360° Salute
                </button>
                <button
                  onClick={() => setBotActionOverride("scan")}
                  className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                    botActionOverride === "scan"
                      ? "bg-purple-500/20 border-purple-500 text-purple-300 font-semibold"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  🔄 180° Sweep
                </button>
              </div>

              {botActionOverride && (
                <button
                  onClick={() => setBotActionOverride(null)}
                  className="mt-1 px-3 py-1 rounded-lg bg-zinc-800 text-[10px] text-zinc-300 hover:bg-zinc-700 self-start"
                >
                  ↺ Reset to Live Auto Sync
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 md:p-6 h-[540px] flex flex-col justify-between overflow-hidden relative shadow-2xl">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 animate-message-in ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 mt-0.5">
                  <AiOrb state={loading && i === messages.length - 1 ? "thinking" : "idle"} size="sm" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed transition-all duration-200 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-medium shadow-md shadow-cyan-500/10"
                    : "bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 text-slate-200 shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Prominent Permission Review Card for mutating actions */}
          {pendingTool && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-3 animate-message-in">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Lock className="w-4 h-4 animate-bounce" /> Permission Review: Action Requires Approval
              </div>
              <p className="text-slate-300 leading-relaxed">
                The assistant proposes to execute tool <strong>{pendingTool.toolName}</strong> with arguments:
              </p>
              <pre className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono overflow-x-auto text-amber-300">
                {JSON.stringify(pendingTool.args, null, 2)}
              </pre>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleConfirmTool(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-colors"
                >
                  Reject Action
                </button>
                <button
                  onClick={() => handleConfirmTool(true)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
                >
                  <Check className="w-3.5 h-3.5" /> Approve &amp; Execute
                </button>
              </div>
            </div>
          )}

          {/* Holographic Quantum Synthesizing Indicator Card */}
          {loading && (
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#070b14]/90 border border-violet-500/30 max-w-lg animate-message-in relative overflow-hidden shadow-xl backdrop-blur-md">
              {/* Animated scanning light beam */}
              <div className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-violet-500/15 to-transparent animate-scan-beam pointer-events-none" />

              <AiOrb state="thinking" size="sm" />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                  <span>AMAHAS is synthesizing</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-typing-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-typing-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-typing-3" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Scanning live web &amp; YouTube tutorials, syllabus records, and memory...
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-white/5 flex gap-2 relative">
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
                  ? "bg-violet-600/30 border-violet-500 text-violet-200"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              title="Quick Actions & Task Selector (+)"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${showActionMenu ? "rotate-45 text-violet-400" : ""}`} />
            </button>

            {/* Quick Action Popover Menu */}
            {showActionMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-72 sm:w-80 rounded-2xl bg-[#0b1120] border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 space-y-1 backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 flex items-center justify-between">
                  <span>Assistant Quick Tools</span>
                  <span className="text-violet-400 font-mono">1-Click</span>
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
                        <div className="text-[10px] text-slate-400">Pick a pending task to work on</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInput("Search web for YouTube video links on: ");
                        setShowActionMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-1 rounded-lg bg-red-500/20 text-red-400">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-100">Search Web &amp; YouTube</div>
                        <div className="text-[10px] text-slate-400">Find tutorials, video links &amp; docs</div>
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
                        setInput("Create a section on my dashboard named Resources with folders for Video Links, Online Materials, Books, Information");
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
                        setInput("Quiz me with 3 rapid questions on: ");
                        setShowActionMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-100">Concept Mastery Quiz</div>
                        <div className="text-[10px] text-slate-400">3-question knowledge retention drill</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInput("Draw a visual Mermaid mindmap diagram for: ");
                        setShowActionMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-100">Concept Map / Diagram</div>
                        <div className="text-[10px] text-slate-400">Generate flowchart or circuit</div>
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
                        className="text-[11px] text-violet-400 hover:underline flex items-center gap-1 font-medium"
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
                            className="text-violet-400 hover:underline text-[11px]"
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
                              setInput(`Help me work on my task: "${t.title}" (Priority: ${t.priority})`);
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
                              <div className="text-slate-100 font-medium truncate">{t.title}</div>
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

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`relative p-3 rounded-xl border text-xs transition-all flex items-center justify-center ${
              isRecording
                ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Speech-to-Text Voice Input"
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-xl bg-red-500/30 animate-ping pointer-events-none" />
            )}
            {isRecording ? <MicOff className="w-4 h-4 relative z-10" /> : <Mic className="w-4 h-4 relative z-10" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask assistant to search the web, plan tasks, analyze research, or organize workspace..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 disabled:opacity-40 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Memory Inspector Drawer */}
      {showMemoryDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
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
              These verified facts enrich the assistant&apos;s context without leaking unvetted notes. You can inspect or permanently delete any memory below:
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {memories.map((m) => (
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
