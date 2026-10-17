"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Bot,
  BookOpen,
  FlaskConical,
  Lock,
  Mail,
  Clock,
  Zap,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";
import { Interactive3DScene } from "@/components/canvas/Interactive3DScene";
import { Perspective3DShowcase } from "@/components/canvas/Perspective3DShowcase";
import { GoogleAuthModal } from "@/components/auth/GoogleAuthModal";
import { GuidedDemonstration } from "@/components/portal/GuidedDemonstration";
import { SampleWorkspaceModal } from "@/components/portal/SampleWorkspaceModal";

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
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showSampleWorkspace, setShowSampleWorkspace] = useState(false);

  // Email & Password inputs (strictly clean and empty)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 30-day session persistence
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

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
      {/* Interactive 3D Canvas Background (Rotating Polyhedron Mesh & Particle Field) */}
      <Interactive3DScene />

      {/* Subtle Radial Glows for Contrast */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none" />

      {/* Production-Grade Navigation Header */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-zinc-900/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <AmahasLogo variant="primary" size="md" />
        </Link>

        {/* Executive Header Controls (Clean & Production-Grade) */}
        <div className="flex items-center gap-4">
          {currentUser ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-lg hover:shadow-white/10 flex items-center gap-2"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveStep("signin")}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowGoogleModal(true)}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-md"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Dynamic Workspace Stage */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 md:py-16 flex-1 flex flex-col justify-center items-center">
        {activeStep === "welcome" ? (
          /* STEP 1: HERO & 3D INTERACTIVE WORKSPACE SHOWCASE */
          <div className="w-full flex flex-col items-center text-center space-y-10 animate-in fade-in duration-300">
            {/* Shimmer Border Capsule Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs font-medium tracking-wide backdrop-blur-xl shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AMAHAS Student OS • Autonomous Execution Engine</span>
            </div>

            {/* Hero Headlines */}
            <div className="max-w-4xl space-y-5">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
                Architected for Focus. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
                  Powered by Intelligence.
                </span>
              </h1>
              <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                The personal operating system for students managing coursework, competitive exams,
                autonomous literature research, and long-term knowledge retention.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href={currentUser ? "/dashboard" : "/signup"}
                className="group relative px-7 py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-zinc-100/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative">{currentUser ? "Open Workspace" : "Get Started Free"}</span>
                <ArrowRight className="relative w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                onClick={() => setShowSampleWorkspace(true)}
                className="px-6 py-3.5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 hover:border-cyan-700 text-cyan-200 text-xs font-semibold transition-all flex items-center gap-2 backdrop-blur-md shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Explore Sample Workspace</span>
              </button>

              {!currentUser && (
                <button
                  onClick={() => setActiveStep("signin")}
                  className="px-5 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Open Workspace (Sign In)</span>
                </button>
              )}
            </div>

            {/* INTERACTIVE 3D PERSPECTIVE PRODUCT SHOWCASE */}
            <Perspective3DShowcase />

            {/* Architecture Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pt-6 text-left">
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

            {/* Architecture Security Spec Strip */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                Tenant-Isolated Datastores
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                Sub-50ms Gateway Routing
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                AES Session Token Encryption
              </span>
            </div>

            {/* Guided Realistic Student Workflow Demonstration */}
            <div className="w-full pt-10">
              <GuidedDemonstration />
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

            {/* 1-CLICK PROMINENT GOOGLE BUTTON */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
              <span>Continue with Google</span>
            </button>

            {/* Clean Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                or email credentials
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* EMAIL & PASSWORD LOGIN FORM */}
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
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : "Next: Enter Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

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

      {/* Production-Grade Minimalist Footer */}
      <footer className="relative z-20 max-w-7xl mx-auto w-full px-6 py-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2">
          <span>© 2026 AMAHAS Inc.</span>
          <span>•</span>
          <span className="text-zinc-400">Autonomous Execution Architecture</span>
        </div>
        <div className="flex items-center gap-6">
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

      {/* Authentic Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        rememberMe={rememberMe}
      />

      {/* Isolated Demonstration Sample Workspace Modal */}
      <SampleWorkspaceModal
        isOpen={showSampleWorkspace}
        onClose={() => setShowSampleWorkspace(false)}
        onOpenSignUp={() => {
          setShowSampleWorkspace(false);
          setActiveStep("signin");
        }}
      />
    </div>
  );
}

export default CreativePortal;
