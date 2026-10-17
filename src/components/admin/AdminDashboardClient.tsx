"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  Users,
  Activity,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Lock,
  ExternalLink,
  Crown,
  FileText,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  adminRole?: string | null;
  createdAt: string;
  subscription?: {
    status: string;
    billingCycle: string;
    trialStartedAt?: string | null;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
    retentionDeadline?: string | null;
  } | null;
}

interface AdminDashboardProps {
  currentAdmin: {
    id: string;
    email: string;
    name: string;
    adminRole: "owner" | "support_admin";
    totpEnabled: boolean;
  };
}

export function AdminDashboardClient({ currentAdmin }: AdminDashboardProps) {
  // 2FA TOTP Session State
  const [is2faVerified, setIs2faVerified] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [totpSetupSecret, setTotpSetupSecret] = useState<string | null>(null);
  const [totpSetupUri, setTotpSetupUri] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Dashboard navigation & data
  const [activeTab, setActiveTab] = useState<"users" | "health" | "support" | "audit">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Support Session State (15-Minute Limit)
  const [supportModalUser, setSupportModalUser] = useState<AdminUser | null>(null);
  const [supportReason, setSupportReason] = useState("");
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    targetUserId: string;
    targetUserEmail: string;
    expiresAt: string;
  } | null>(null);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null);

  // Status message
  const [feedback, setFeedback] = useState<string | null>(null);

  // Check 2FA setup on mount
  useEffect(() => {
    if (!currentAdmin.totpEnabled) {
      // Need initial TOTP setup
      fetch("/api/admin/totp")
        .then((res) => res.json())
        .then((data) => {
          if (data.secret) {
            setTotpSetupSecret(data.secret);
            setTotpSetupUri(data.uri);
          }
        })
        .catch(console.error);
    }
  }, [currentAdmin.totpEnabled]);

  // Support session countdown timer
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(activeSession.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSessionSecondsLeft(remaining);
      if (remaining <= 0) {
        setActiveSession(null);
        setFeedback("Support edit session has expired (15-minute maximum limit reached).");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (is2faVerified) {
      fetchUsers();
    }
  }, [is2faVerified]);

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError("");

    if (totpSetupSecret) {
      // Activating TOTP for the first time
      try {
        const res = await fetch("/api/admin/totp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: totpSetupSecret, token: totpCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        setRecoveryCodes(data.recoveryCodes);
        setIs2faVerified(true);
      } catch (err: any) {
        setTotpError(err.message);
      }
    } else {
      // Verifying existing TOTP code or backup recovery code
      try {
        const res = await fetch("/api/admin/totp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VERIFY", token: totpCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid authenticator code or recovery code.");

        if (data.message) {
          setFeedback(data.message);
        }
        setIs2faVerified(true);
      } catch (err: any) {
        setTotpError(err.message || "Invalid authenticator code.");
      }
    }
  };

  const handleStartSupportSession = async () => {
    if (!supportModalUser) return;
    try {
      const res = await fetch("/api/admin/support-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: supportModalUser.id,
          reason: supportReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start support session");

      setActiveSession({
        sessionId: data.sessionId,
        targetUserId: supportModalUser.id,
        targetUserEmail: supportModalUser.email,
        expiresAt: data.expiresAt,
      });
      setSupportModalUser(null);
      setSupportReason("");
      setFeedback("15-minute support edit session activated. All changes are logged.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePromoteAdmin = async (targetUserId: string, role: string) => {
    if (currentAdmin.adminRole !== "owner") {
      alert("Only the Platform Owner can promote administrators.");
      return;
    }

    if (!confirm(`Are you sure you want to promote this user to ${role}?`)) return;

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROMOTE_ADMIN",
          targetUserId,
          newRole: role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Promotion failed");
      alert(data.message);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 1: TOTP 2FA Challenge Screen
  // ---------------------------------------------------------------------------
  if (!is2faVerified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-amber-400 mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Administrator Security Gate
            </h1>
            <p className="text-xs text-zinc-400">
              Two-Factor Authenticator verification required for {currentAdmin.email}
            </p>
          </div>

          {totpError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
              {totpError}
            </div>
          )}

          {totpSetupSecret && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2 text-zinc-300">
              <p className="font-semibold text-white">Authenticator App Setup (TOTP):</p>
              <p className="text-[11px] text-zinc-400">
                Scan into Google Authenticator or copy this Base32 secret:
              </p>
              <div className="p-2 rounded bg-black font-mono text-[11px] text-amber-300 break-all select-all">
                {totpSetupSecret}
              </div>
            </div>
          )}

          <form onSubmit={handleVerify2fa} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                className="w-full bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Verify & Access Admin Console</span>
            </button>
          </form>

          {recoveryCodes && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-800/40 space-y-2">
              <p className="text-xs font-bold text-amber-300">Save Your Backup Recovery Codes:</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-zinc-300">
                {recoveryCodes.map((c, i) => (
                  <div key={i} className="p-1 bg-zinc-900 rounded">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white transition-colors">
              ← Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Main Authorized Administration Console
  // ---------------------------------------------------------------------------
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* 15-Minute Support Edit Session Floating Alert Banner */}
      {activeSession && (
        <div className="sticky top-0 z-50 bg-amber-950 border-b border-amber-600/60 px-6 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="font-bold text-amber-200">
              Active Support-Edit Session for: {activeSession.targetUserEmail}
            </span>
            <span className="font-mono text-amber-300 bg-black/40 px-2 py-0.5 rounded">
              {sessionSecondsLeft !== null
                ? `${Math.floor(sessionSecondsLeft / 60)}m ${sessionSecondsLeft % 60}s remaining`
                : "15:00"}
            </span>
            <span className="text-zinc-400 text-[11px]">
              (Enforced server-side. Auto-revokes at 0:00).
            </span>
          </div>

          <button
            onClick={() => setActiveSession(null)}
            className="px-3 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs font-semibold"
          >
            End Edit Session
          </button>
        </div>
      )}

      {/* Admin Header */}
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between bg-zinc-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AmahasLogo variant="primary" size="md" showSubtitle={false} />
          <div className="h-5 w-px bg-zinc-800" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            Private Admin Panel
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
              currentAdmin.adminRole === "owner"
                ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                : "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
            }`}
          >
            {currentAdmin.adminRole === "owner" ? "Owner" : "Support Admin"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-400 hidden sm:inline">{currentAdmin.email}</span>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            Exit to Workspace
          </Link>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
        {feedback && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & Identity</span>
          </button>

          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "health"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Platform Services Health</span>
          </button>
        </div>

        {/* TAB 1: USER ACCOUNTS & IDENTITY VERIFICATION */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by email, name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <button
                onClick={fetchUsers}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Accounts</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-900 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Mobile & Verification</th>
                      <th className="py-3 px-4">Trial / Subscription</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-right">Support Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/80">
                    {filteredUsers.map((u) => {
                      const sub = u.subscription;
                      return (
                        <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{u.name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{u.email}</p>
                            <span className="text-[10px] text-zinc-500">
                              Joined {new Date(u.createdAt).toISOString().split("T")[0]}
                            </span>
                          </td>

                          <td className="py-3 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span>{u.phoneNumber || "No phone linked"}</span>
                              {u.phoneVerified ? (
                                <span title="Phone Verified"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /></span>
                              ) : (
                                <span title="Unverified"><XCircle className="w-3.5 h-3.5 text-zinc-600" /></span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-zinc-500">Email:</span>
                              {u.emailVerified ? (
                                <span className="text-emerald-400 font-medium">Verified</span>
                              ) : (
                                <span className="text-amber-400 font-medium">Unverified</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 space-y-1 font-mono text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                sub?.status === "ACTIVE"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                  : sub?.status === "TRIALING"
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                                  : "bg-zinc-900 text-zinc-400"
                              }`}
                            >
                              {sub?.status || "NO_TRIAL"}
                            </span>
                            {sub?.trialEndsAt && (
                              <p className="text-[10px] text-zinc-400">
                                Trial ends: {sub.trialEndsAt.split("T")[0]}
                              </p>
                            )}
                            {sub?.currentPeriodEnd && (
                              <p className="text-[10px] text-zinc-400">
                                Period ends: {sub.currentPeriodEnd.split("T")[0]}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {u.adminRole ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60 uppercase">
                                {u.adminRole}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">Student</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSupportModalUser(u);
                                setSupportReason("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                            >
                              Request 15m Edit
                            </button>

                            {currentAdmin.adminRole === "owner" && !u.adminRole && (
                              <button
                                onClick={() => handlePromoteAdmin(u.id, "support_admin")}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-amber-300 hover:text-amber-200"
                                title="Promote to Support Admin"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLATFORM SERVICES HEALTH */}
        {activeTab === "health" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                Primary Database
              </span>
              <p className="text-sm font-bold text-white">PostgreSQL & Connection Pooler</p>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Operational</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                SMS Delivery Gateway
              </span>
              <p className="text-sm font-bold text-white">Twilio API Connector</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Status: Configured via environment</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                Email Delivery Gateway
              </span>
              <p className="text-sm font-bold text-white">Resend / SMTP Connector</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Status: Configured via environment</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 15-Minute Support Edit Session Modal */}
      {supportModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Request 15-Minute Support-Edit Access
            </h3>
            <p className="text-xs text-zinc-400">
              Target account: <span className="text-white font-mono">{supportModalUser.email}</span>
            </p>
            <p className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
              Security notice: Edit privileges automatically expire after 15 minutes on the server. Your admin identity, timestamp, and actions will be preserved in internal audit logs for 90 days.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Reference / Context Note (Optional):
              </label>
              <textarea
                value={supportReason}
                onChange={(e) => setSupportReason(e.target.value)}
                rows={2}
                placeholder="Optional ticket reference or internal note..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSupportModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSupportSession}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Start 15m Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
