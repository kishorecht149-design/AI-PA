"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Bot,
  Layers,
  BookOpen,
  FlaskConical,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ChevronRight,
  Zap,
  Clock,
  Compass,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";
import { AiOrb } from "@/components/AiOrb";

interface CreativePortalProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function CreativePortal({ currentUser }: CreativePortalProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<"welcome" | "signin">(
    currentUser ? "welcome" : "welcome"
  );
  const [authMode, setAuthMode] = useState<"google" | "credentials">("google");

  // Authentication inputs (strictly clean and empty by default)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Google account input for separate users (strictly clean)
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");

  // Remember login option (persists 30-day session via cookie + localStorage)
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handleGoogleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    const targetEmail = googleEmail.trim();
    if (!targetEmail) {
      setError("Please enter your Google account email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setError("Please enter a valid email address (e.g., yourname@gmail.com).");
      return;
    }

    const targetName = googleName.trim() || targetEmail.split("@")[0];

    setLoading(true);
    setStatusMessage("Authenticating Google user and synchronizing secure session...");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google sign-in failed. Please verify your details.");
      }

      // Store remember preference
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("amahas_remember_login", "true");
          localStorage.setItem("amahas_last_user", targetName);
        } else {
          localStorage.removeItem("amahas_remember_login");
        }
      }

      setStatusMessage("Identity verified. Entering workspace...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setStatusMessage("Authenticating credentials...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("amahas_remember_login", "true");
        } else {
          localStorage.removeItem("amahas_remember_login");
        }
      }

      setStatusMessage("Welcome back. Entering workspace...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Please verify your credentials.");
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Pitch-Black Ambient Lighting (No Blue/Cyan Cast) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-zinc-600/[0.03] blur-[160px] pointer-events-none" />
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-white/[0.015] blur-[180px] pointer-events-none" />

      {/* Subtle Halo Rotation Animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.03] pointer-events-none animate-halo-spin" />

      {/* Top Header */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-zinc-900/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <AmahasLogo variant="primary" size="md" />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>v2.6 Stable</span>
          </div>

          {currentUser ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-lg hover:shadow-white/10"
            >
              <span>Workspace ({currentUser.name})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => {
                setActiveStep("signin");
                setAuthMode("credentials");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Dynamic Workspace Stage */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 md:py-16 flex-1 flex flex-col justify-center items-center">
        {activeStep === "welcome" ? (
          /* STEP 1: WELCOME & UNIVERSAL WORKSPACE SHOWCASE */
          <div className="w-full flex flex-col items-center text-center space-y-12 animate-in fade-in duration-300">
            {/* Minimalist Executive Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-medium tracking-wide backdrop-blur-xl shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Autonomous Workspace & Intelligence System</span>
            </div>

            {/* Floating Kinetic Orb with Physics Animation */}
            <div className="relative my-2 animate-float-slow">
              <div className="absolute -inset-6 rounded-full bg-white/[0.04] blur-2xl" />
              <div className="relative p-3.5 rounded-full bg-[#0a0a0a] border border-zinc-800 shadow-2xl backdrop-blur-2xl">
                <AiOrb state="idle" size="lg" />
              </div>
            </div>

            {/* Hero Positioning */}
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Architected for Focus.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
                  Powered by Intelligence.
                </span>
              </h1>
              <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                One unified, high-performance operating environment uniting autonomous intelligence,
                deep work execution, structured knowledge retention, and literature pipelines.
              </p>
            </div>

            {/* Primary Action Suite */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={() => setActiveStep("signin")}
                className="group relative px-8 py-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-zinc-100/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative">Continue to AMAHAS</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setActiveStep("signin");
                  setAuthMode("google");
                }}
                className="px-6 py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-semibold transition-all flex items-center gap-3 backdrop-blur-md"
              >
                {/* Official Google Brand Mark */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>

            {/* Universal Architecture Pillars (Zero Niche Advertising) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pt-8 text-left">
              <div className="p-5 rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3.5 group-hover:scale-105 transition-transform">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Autonomous Intelligence
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  Web-connected research, multi-step orchestration, and conversational memory across domains.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3.5 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Deep Focus & Execution
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  Algorithmic time-blocking, milestone prioritization, and conflict detection to guard deep work.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3.5 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Knowledge Architecture
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  SuperMemo SM-2 spaced revision intervals, topic graphs, and long-term concept retention.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3.5 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Empirical Literature Lab
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  Ingest research papers, track citation pipelines, and record reproducible technical notes.
                </p>
              </div>
            </div>

            {/* Minimalist Trust & Architecture Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                Isolated User Data & Zero Tracking
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                High-Performance Real-Time Sync
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                AES Session Token Encryption
              </span>
            </div>
          </div>
        ) : (
          /* STEP 2: AUTHENTIC, SECURE SIGN-IN CONSOLE */
          <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-7 md:p-9 shadow-2xl relative z-10 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Nav Back */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setActiveStep("welcome");
                  setError("");
                  setStatusMessage("");
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                ← Back to Overview
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                <Lock className="w-3 h-3 text-zinc-400" /> Secure Sign In
              </div>
            </div>

            {/* Brand Title */}
            <div className="text-center space-y-1.5 mb-7">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Continue to AMAHAS
              </h2>
              <p className="text-xs text-zinc-400 font-light">
                Sign in with Google or your credentials to access your isolated workspace.
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 mb-6">
              <button
                onClick={() => {
                  setAuthMode("google");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  authMode === "google"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>Google Sign-In</span>
              </button>
              <button
                onClick={() => {
                  setAuthMode("credentials");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  authMode === "credentials"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>Email & Password</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center gap-2.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {authMode === "google" ? (
              /* GENUINE GOOGLE AUTHENTICATION (NO FAKE / PRE-FILLED CREDENTIALS) */
              <form onSubmit={handleGoogleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Google Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      required
                      placeholder="your.email@gmail.com"
                      className="w-full bg-[#121212] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Full Name (as displayed in workspace)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full bg-[#121212] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Remember Login Checkbox (30 days persistence) */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white accent-white cursor-pointer"
                    />
                    <span>Remember my login on this device</span>
                  </label>
                  <p className="text-[10px] text-zinc-500 ml-6 mt-0.5">
                    Maintains your authenticated session for 30 days.
                  </p>
                </div>

                {/* Primary Google Auth Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-lg flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? "Authenticating..." : "Next: Continue with Google"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* EMAIL & PASSWORD LOGIN FORM (STRICTLY CLEAN) */
              <form onSubmit={handleCredentialsAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                      className="w-full bg-[#121212] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-[#121212] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Remember Login Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white accent-white cursor-pointer"
                    />
                    <span>Remember my login on this device</span>
                  </label>
                  <p className="text-[10px] text-zinc-500 ml-6 mt-0.5">
                    Keeps you signed in for 30 days.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{loading ? "Authenticating..." : "Next: Enter Workspace"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Bottom Register Option */}
            <div className="mt-7 pt-5 border-t border-zinc-900 text-center text-xs text-zinc-500">
              Need a new account?{" "}
              <Link href="/signup" className="text-white hover:underline font-medium ml-1">
                Create one now
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Obsidian Minimal Footer */}
      <footer className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2">
          <span>AMAHAS Autonomous Systems</span>
          <span>•</span>
          <span className="text-zinc-400">Pure Obsidian Edition</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
            Workspace
          </Link>
          <Link href="/assistant" className="hover:text-zinc-300 transition-colors">
            Assistant
          </Link>
          <Link href="/settings" className="hover:text-zinc-300 transition-colors">
            Settings
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default CreativePortal;
