"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Maximize2,
  Square,
  Bot,
  CheckCircle2,
  Clock,
  ListTodo,
  ExternalLink,
} from "lucide-react";
import { AmahAsAvatar } from "./AmahAsAvatar";
import { AssistantState } from "./types";
import { AutonomousBehaviorEngine } from "./AutonomousBehaviorEngine";
import { ToolConfirmationCard, type PendingTool } from "./ToolConfirmationCard";
import { ToolResultCard } from "./ToolResultCard";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageItem {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCallsJson?: string | null;
  executedToolResults?: Array<{ toolName: string; result: any }>;
}

export function FloatingAssistantDock() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on full assistant page or auth routes to prevent dual WebGL viewports
  if (pathname === "/assistant" || pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: "assistant",
      content: "Hello Kishore! I'm active across your workspace. Need help scheduling tasks, conducting research, or starting a focus block?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarState, setAvatarState] = useState<AssistantState>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);

  const engineRef = useRef<AutonomousBehaviorEngine | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setIsVoiceSupported(true);
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (e: any) => {
          const transcript = e.results[0]?.[0]?.transcript;
          if (transcript) {
            setInput(transcript);
            handleSend(undefined, transcript);
          }
        };
        rec.onend = () => setIsRecording(false);
        rec.onerror = () => setIsRecording(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, pendingTool, loading]);

  const handleEngineReady = (engine: AutonomousBehaviorEngine) => {
    engineRef.current = engine;
    engine.onStateChange = (st) => setAvatarState(st);
  };

  const handleSend = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const prompt = promptOverride || input.trim();
    if (!prompt || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (engineRef.current) {
      engineRef.current.onRequestSent();
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (data?.message) {
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            executedToolResults: data.executedToolResults,
          },
        ]);

        if (engineRef.current) {
          engineRef.current.onResponseReceived({
            content: data.message.content,
            command: data.behaviorCommand,
            userPrompt: prompt,
          });
        }
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Notice: ${data.error}` },
        ]);
      }

      if (data.requiresConfirmation && data.toolCalls && data.toolCalls.length > 0) {
        const call = data.toolCalls[0];
        setPendingTool({
          toolName: call.function?.name,
          args: JSON.parse(call.function?.arguments || "{}"),
          callId: call.id,
          idempotencyKey: `dock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `System alert: ${err.message}` },
        ]);
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
        { role: "assistant", content: "Action cancelled. No changes were made." },
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
            idempotencyKey: toolToRun.idempotencyKey,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        const text = `Confirmed & Executed: ${data.toolResult?.message || "Action finished successfully."}`;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: text,
            executedToolResults: [{ toolName: toolToRun.toolName, result: data.toolResult }],
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

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Quick Assistant HUD */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[400px] h-[520px] rounded-3xl bg-[#070b14]/95 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  AMAHAS Assistant
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-cyan-400 font-mono">Omni-Present Assistant Dock</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/assistant")}
                title="Open full assistant workspace"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize dock"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick 3D Mini-Avatar Viewport */}
          <div className="h-28 w-full bg-gradient-to-b from-cyan-950/20 via-transparent to-transparent flex items-center justify-center relative border-b border-white/5 shrink-0 overflow-hidden">
            <AmahAsAvatar
              state={avatarState}
              size={120}
              interactiveLookAt={true}
              showFloorShadow={false}
              showDevControls={false}
              onEngineReady={handleEngineReady}
              onStateChange={(st) => setAvatarState(st)}
            />
            <div className="absolute bottom-1 right-2 text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-cyan-300">
              State: {avatarState}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-semibold shadow-md shadow-cyan-500/10"
                      : "bg-white/[0.05] border border-white/10 text-slate-200"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                  {m.executedToolResults && m.executedToolResults.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      {m.executedToolResults.map((tr, idx) => (
                        <ToolResultCard key={idx} toolName={tr.toolName} result={tr.result} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pendingTool && (
              <ToolConfirmationCard tool={pendingTool} onConfirm={handleConfirmTool} />
            )}

            {loading && (
              <div className="flex items-center gap-2 text-cyan-300 text-xs py-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>AMAHAS is synthesizing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/30">
            <button
              onClick={() => handleSend(undefined, "What high-priority tasks do I have scheduled today?")}
              className="text-[10px] text-slate-300 hover:text-cyan-300 whitespace-nowrap px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors"
            >
              📋 My Tasks
            </button>
            <button
              onClick={() => handleSend(undefined, "Schedule a 25-minute Deep Work focus block now.")}
              className="text-[10px] text-slate-300 hover:text-cyan-300 whitespace-nowrap px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors"
            >
              ⚡ 25m Focus
            </button>
            <button
              onClick={() => handleSend(undefined, "Search latest research papers on multimodal AI architectures.")}
              className="text-[10px] text-slate-300 hover:text-cyan-300 whitespace-nowrap px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors"
            >
              🔍 Research
            </button>
          </div>

          {/* Composer */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-white/10 flex items-center gap-1.5 bg-black/40">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2 rounded-xl border text-xs transition-colors ${
                  isRecording
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AMAHAS or command tools..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            {loading ? (
              <button
                type="button"
                onClick={() => abortControllerRef.current?.abort()}
                className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      )}

      {/* Floating Trigger Orb */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-[#070b14] via-[#0d1627] to-[#121f3d] border border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.35)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.5)] hover:border-cyan-400 transition-all duration-300 hover:scale-105"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-black" />
        </span>

        <div className="w-12 h-12 flex items-center justify-center text-cyan-300 pointer-events-none">
          <Bot className="w-7 h-7 group-hover:scale-110 transition-transform text-cyan-400" />
        </div>
      </button>
    </div>
  );
}
