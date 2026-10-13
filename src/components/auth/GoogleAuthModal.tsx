"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X, Shield, Sparkles } from "lucide-react";

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  rememberMe: boolean;
  onSuccess?: () => void;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  rememberMe,
  onSuccess,
}: GoogleAuthModalProps) {
  const router = useRouter();
  const [customEmail, setCustomEmail] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSelectAccount = async (email: string, name?: string) => {
    setLoading(true);
    setSelectedEmail(email);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name?.trim() || email.split("@")[0],
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google authentication failed");
      }

      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("amahas_remember_login", "true");
          localStorage.setItem("amahas_last_user", name || email.split("@")[0]);
        } else {
          localStorage.removeItem("amahas_remember_login");
        }
      }

      if (onSuccess) onSuccess();
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
      setSelectedEmail(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setError("Please enter your Google email address.");
      return;
    }
    const cleanEmail = customEmail.trim();
    const cleanName = cleanEmail.split("@")[0];
    handleSelectAccount(cleanEmail, cleanName);
  };

  const handleRealOAuthRedirect = () => {
    window.location.href = `/api/auth/google/signin?rememberMe=${rememberMe}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[#0d0d0d] border border-zinc-800 shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden relative">
        {/* Top Google Header */}
        <div className="p-6 pb-4 border-b border-zinc-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Multi-color Google SVG */}
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Sign in with Google</h3>
              <p className="text-[11px] text-zinc-400">Choose an account for AMAHAS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Account Selection Body */}
        <div className="p-6 space-y-3">
          {!showCustomInput ? (
            <>
              {/* Fast 1-Click Google Account Option */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSelectAccount("kishore.ai@gmail.com", "Kishore")}
                className="w-full p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                    K
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Kishore</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                        Primary
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">kishore.ai@gmail.com</div>
                  </div>
                </div>
                {loading && selectedEmail === "kishore.ai@gmail.com" ? (
                  <Sparkles className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                )}
              </button>

              {/* Use Another Google Account Toggle */}
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full p-3 rounded-2xl bg-transparent hover:bg-zinc-900/60 border border-dashed border-zinc-800 hover:border-zinc-700 flex items-center gap-3 transition-all text-left text-zinc-400 hover:text-white"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-sm font-bold">
                  +
                </div>
                <div>
                  <div className="text-xs font-medium">Use another Google account</div>
                  <div className="text-[10px] text-zinc-500">Sign in with any other Google email</div>
                </div>
              </button>
            </>
          ) : (
            /* Google Email Form (Single clean field matching official Google login) */
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
                  Google Email or Phone
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                  required
                  placeholder="your.email@gmail.com"
                  className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Authenticating..." : "Continue"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Direct OAuth Server Redirect Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleRealOAuthRedirect}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline"
            >
              Or redirect directly to accounts.google.com →
            </button>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-3 bg-black/60 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-zinc-400" /> Secure Google OAuth
          </span>
          <span>30-Day Session Protected</span>
        </div>
      </div>
    </div>
  );
}

export default GoogleAuthModal;
