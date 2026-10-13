"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";
import { GoogleAuthModal } from "@/components/auth/GoogleAuthModal";

export default function LoginPage() {
  const router = useRouter();
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Credentials form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Remember login state
  const [rememberMe, setRememberMe] = useState(true);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("Authenticating credentials...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, rememberMe }),
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
      setError(err.message || "Failed to sign in. Please verify your credentials.");
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white relative overflow-hidden select-none">
      {/* Subtle deep-space ambient gradient halo */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-zinc-600/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-7 md:p-9 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-7">
          <AmahasLogo variant="primary" size="lg" showSubtitle={false} />
          <h1 className="text-xl font-bold text-white tracking-tight">
            Sign in to AMAHAS
          </h1>
          <p className="text-xs text-zinc-400 font-light">
            Autonomous Personal Workspace & Intelligence System
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
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
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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

          {/* Remember Me Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300 select-none">
              <input
                type="checkbox"
                id="rememberMeCreds"
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
            <span>{loading ? "Authenticating..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-4">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            ← Home
          </Link>
          <span>•</span>
          <Link href="/signup" className="text-white hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>

      {/* Authentic Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        rememberMe={rememberMe}
      />
    </div>
  );
}
