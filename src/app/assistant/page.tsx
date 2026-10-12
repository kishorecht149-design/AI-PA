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
} from "lucide-react";
import { KNOWN_FREE_MODELS } from "@/lib/ai-gateway";

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

  // Pending tool confirmation
  const [pendingTool, setPendingTool] = useState<PendingToolConfirmation | null>(null);

  // Voice capabilities
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                "Greetings, Kishore. I am your AMAHAS Assistant. I coordinate your academic syllabus revisions, research paper tracking, and task execution. How may I assist your engineering work today?",
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

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        speakText(data.message.content);
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-violet-400" />
            Personal AI Assistant
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Permission-bounded coordinator over tasks, syllabi, research, and memory.
          </p>
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
            className={`p-2 rounded-xl border text-xs transition-colors ${
              ttsEnabled
                ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
            }`}
            title={ttsEnabled ? "Voice Output Active" : "Voice Output Muted"}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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

      {/* Main Conversation Stream */}
      <div className="bg-[#0b1120] rounded-2xl border border-white/5 p-4 md:p-6 h-[540px] flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-cyan-500 text-black font-medium shadow-md shadow-cyan-500/10"
                    : "bg-white/[0.04] border border-white/5 text-slate-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Prominent Permission Review Card for mutating actions */}
          {pendingTool && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Lock className="w-4 h-4" /> Permission Review: Action Requires Approval
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
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium"
                >
                  Reject Action
                </button>
                <button
                  onClick={() => handleConfirmTool(true)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Approve &amp; Execute
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-violet-400 animate-pulse">
              <Sparkles className="w-4 h-4" /> Synthesizing response...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-white/5 flex gap-2">
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-3 rounded-xl border text-xs transition-all ${
              isRecording
                ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Speech-to-Text Voice Input"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask assistant to schedule tasks, drill GATE syllabus concepts, or search papers..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-400 transition-colors"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 disabled:opacity-50 flex items-center gap-1.5"
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
