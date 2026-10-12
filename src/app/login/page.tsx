"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@amahas.internal");
  const [password, setPassword] = useState("password123");
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      router.push("/");
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
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <AmahasLogo variant="primary" size="lg" showSubtitle={false} />
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Sign in to AMAHAS
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Intelligent Personal Operating System for Students
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

        <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
          New to AMAHAS?{" "}
          <Link href="/signup" className="text-[var(--accent-primary)] hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
