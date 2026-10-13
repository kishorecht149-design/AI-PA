"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@amahas.internal");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "student@amahas.internal",
          name: "Kishore",
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google authentication failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden transition-colors duration-150">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-2xl relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <AmahasLogo variant="primary" size="lg" showSubtitle={false} />
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Sign in to AMAHAS
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Intelligent Personal Operating System for Students
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Google Authentication */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2.5 transition-all shadow-sm disabled:opacity-50"
        >
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
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">or email</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                placeholder="you@institution.edu"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--input-bg)] text-[var(--accent-primary)] accent-[var(--accent-primary)] cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              Remember my login on this device (30 days)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90 font-semibold text-xs shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to AMAHAS"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Hint Banner */}
        <div className="mt-6 p-3 rounded-xl bg-[var(--badge-bg)] border border-[var(--border-focus)] text-[11px] text-[var(--text-secondary)] space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--accent-primary)] font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Default Demo Student Account
          </div>
          <div>
            Email: <code className="text-[var(--text-primary)]">student@amahas.internal</code>
          </div>
          <div>
            Password: <code className="text-[var(--text-primary)]">password123</code>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-4">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ← Beginning Portal
          </Link>
          <span>•</span>
          <Link href="/signup" className="text-[var(--accent-primary)] hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
