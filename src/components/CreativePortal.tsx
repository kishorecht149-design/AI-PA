"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Bot,
  GraduationCap,
  Microscope,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ExternalLink,
  ChevronRight,
  Layers,
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
  const [activeStep, setActiveStep] = useState<"welcome" | "signin">("welcome");
  const [authMode, setAuthMode] = useState<"google" | "credentials">("google");
  
  // Credentials form state
  const [email, setEmail] = useState("student@amahas.internal");
  const [password, setPassword] = useState("password123");
  
  // Google account picker state for separate users
  const [googleEmail, setGoogleEmail] = useState(currentUser?.email || "kishore.ai@gmail.com");
  const [googleName, setGoogleName] = useState(currentUser?.name || "Kishore");
  const [isCustomGoogleUser, setIsCustomGoogleUser] = useState(false);
  
  // Remember me toggle (persists 30-day session)
  const [rememberMe, setRememberMe] = useState(true);
  
  // Loading & error
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handleGoogleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("Authenticating Google user & synchronizing isolated Supabase records...");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          name: googleName,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google sign-in failed");
      }

      // Store remember preference
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("amahas_remember_login", "true");
          localStorage.setItem("amahas_last_user", googleName);
        } else {
          localStorage.removeItem("amahas_remember_login");
        }
      }

      setStatusMessage("Identity verified! Entering AMAHAS Student OS...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 600);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google");
      setLoading(false);
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("Authenticating credentials...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      setStatusMessage("Welcome back! Entering AMAHAS...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 relative overflow-hidden flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Cosmic Glow & Laser Orbs Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-600/5 blur-[160px] pointer-events-none" />

      {/* Top Holographic Navigation Header */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3">
          <AmahasLogo variant="primary" size="md" />
        </Link>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium transition-all shadow-lg hover:shadow-cyan-500/20"
            >
              <span>Dashboard ({currentUser.name})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => setActiveStep("signin")}
              className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Creative Center Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center items-center">
        {activeStep === "welcome" ? (
          /* STEP 1: CREATIVE GATEWAY & FEATURE SHOWCASE */
          <div className="w-full flex flex-col items-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-300">
            {/* Holographic Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-violet-500/15 to-transparent border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-lg shadow-xl shadow-cyan-500/5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>AMAHAS Student OS • Next-Gen Autonomous AI</span>
            </div>

            {/* Neural Energy Core Orb Visual */}
            <div className="relative my-2">
              <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
              <div className="relative p-3 rounded-full bg-[#0a1022]/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
                <AiOrb state="idle" size="lg" />
              </div>
            </div>

            {/* Hero Headlines */}
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Empower Your Mind with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
                  AMAHAS
                </span>
              </h1>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                The unified, permission-bounded intelligence engine. Coordinate academic syllabi, autonomous live web search, spaced repetition, and deep systems research in one frictionless cyber environment.
              </p>
            </div>

            {/* Main Action Hub: Continue to AMAHAS & Stepper */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={() => setActiveStep("signin")}
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative">Continue to AMAHAS</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setActiveStep("signin");
                  setAuthMode("google");
                }}
                className="px-6 py-4 rounded-2xl bg-[#0c1328]/80 hover:bg-[#111b38] border border-white/10 hover:border-cyan-500/40 text-slate-200 text-sm font-semibold transition-all flex items-center gap-2.5 backdrop-blur-md"
              >
                {/* Google authentic color SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            {/* Holographic Feature Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-8 text-left">
              <div className="p-5 rounded-2xl bg-[#090f20]/60 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  Autonomous AI Partner
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  Web & YouTube search engine, long-term memory, and direct task coordination.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#090f20]/60 border border-white/[0.08] hover:border-violet-500/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  GATE & ESE Syllabus Mastery
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  Structured syllabus progression with algorithmic SuperMemo SM-2 spaced repetition.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#090f20]/60 border border-white/[0.08] hover:border-sky-500/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                  <Microscope className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                  Systems Research Lab
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  Quantization benchmarks, arXiv citation tracking, and experiment reproducibility.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: CREATIVE SIGN-IN & GOOGLE AUTH CONSOLE */
          <div className="w-full max-w-md bg-[#0a1024]/90 border border-cyan-500/25 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header / Nav Back */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setActiveStep("welcome")}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                ← Back to Overview
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Lock className="w-3 h-3 text-cyan-400" /> Secure Sign In
              </div>
            </div>

            {/* Brand Title */}
            <div className="text-center space-y-1.5 mb-6">
              <h2 className="text-xl font-extrabold text-white">Continue to AMAHAS</h2>
              <p className="text-xs text-slate-400">
                Choose Google authentication or student credentials to access your isolated workspace.
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex rounded-xl bg-[#070b16] p-1 border border-white/10 mb-6">
              <button
                onClick={() => setAuthMode("google")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  authMode === "google"
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Google Sign-In</span>
              </button>
              <button
                onClick={() => setAuthMode("credentials")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                  authMode === "credentials"
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Email & Password</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {authMode === "google" ? (
              /* GOOGLE AUTHENTICATION FOR SEPARATE USERS */
              <div className="space-y-4">
                {/* Account card: Kishore */}
                {!isCustomGoogleUser ? (
                  <div className="p-3.5 rounded-2xl bg-[#0e1633] border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                        {googleName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {googleName}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                            Verified
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{googleEmail}</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  </div>
                ) : (
                  /* Custom Google User creation input */
                  <div className="space-y-3 p-3.5 rounded-2xl bg-[#0e1633] border border-cyan-500/30">
                    <div className="text-xs font-semibold text-cyan-300">
                      Sign in as Separate Google User
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                        placeholder="e.g. Kishore"
                        className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Google Email Address</label>
                      <input
                        type="email"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full bg-[#070b16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Toggle between primary account & custom separate user */}
                <button
                  type="button"
                  onClick={() => setIsCustomGoogleUser(!isCustomGoogleUser)}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mx-auto"
                >
                  {isCustomGoogleUser ? "← Back to primary account" : "Use a different Google account →"}
                </button>

                {/* Remember Login Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#070b16] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                    />
                    <span>Remember my login on this device</span>
                  </label>
                  <p className="text-[10px] text-slate-500 ml-6 mt-0.5">
                    Extends your authenticated session for 30 days.
                  </p>
                </div>

                {/* Primary Google Next / Continue Button */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth()}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? "Signing in..." : "Next: Continue with Google"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* EMAIL & PASSWORD LOGIN FORM */
              <form onSubmit={handleCredentialsAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Student Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="student@amahas.internal"
                      className="w-full bg-[#070b16] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#070b16] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Remember Login Checkbox */}
                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#070b16] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                    />
                    <span>Remember my login on this device</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{loading ? "Authenticating..." : "Next: Enter Student OS"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Quick Demo Helper Hint */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400">
                <Sparkles className="w-3 h-3" /> Kishore's Verified Profile
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail("student@amahas.internal");
                  setPassword("password123");
                  setGoogleName("Kishore");
                  setGoogleEmail("student@amahas.internal");
                  setIsCustomGoogleUser(false);
                }}
                className="text-cyan-400 hover:underline"
              >
                Auto-fill
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Holographic Footer */}
      <footer className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2">
          <span>AMAHAS Autonomous Systems</span>
          <span>•</span>
          <span className="text-cyan-400 font-medium">Free & Unlimited</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
            Direct Dashboard
          </Link>
          <Link href="/assistant" className="hover:text-slate-300 transition-colors">
            AI Assistant
          </Link>
          <Link href="/settings" className="hover:text-slate-300 transition-colors">
            Settings
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default CreativePortal;
