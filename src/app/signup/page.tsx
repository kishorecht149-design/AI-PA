"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { AmahasLogo } from "@/components/brand/AmahasLogo";

export default function SignupPage() {
  const router = useRouter();

  // Registration form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Stepper: 1: credentials, 2: phone OTP, 3: personalization
  const [step, setStep] = useState<"credentials" | "phone_otp" | "personalization">("credentials");

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpStatus, setOtpStatus] = useState<string | null>(null);

  // Personalization state
  const [institution, setInstitution] = useState("");
  const [examinationTrack, setExaminationTrack] = useState("GATE_CS");
  const [primaryFocus, setPrimaryFocus] = useState("Academics & Research");

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [missingConfig, setMissingConfig] = useState<string[] | null>(null);

  // 1. Submit Registration Credentials
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMissingConfig(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Automatically trigger OTP dispatch if phone number is entered
      if (phoneNumber.trim()) {
        const otpRes = await fetch("/api/auth/phone/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
        });
        const otpData = await otpRes.json();
        if (!otpRes.ok) {
          if (otpData.missingConfig) {
            setMissingConfig(otpData.missingConfig);
          }
          setOtpStatus(otpData.error || "SMS provider not configured.");
        } else {
          setOtpStatus("Verification code dispatched to your mobile.");
        }
      }

      setStep("phone_otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed.");
      }

      setStep("personalization");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Complete Personalization & Enter Dashboard
  const handleFinishOnboarding = async (skip = false) => {
    if (!skip) {
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: {
              institution,
              examinationTrack,
              primaryFocus,
            },
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white relative overflow-hidden select-none">
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-zinc-600/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-7 md:p-9 shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center space-y-3 mb-7">
          <AmahasLogo variant="primary" size="lg" showSubtitle={false} />
          <h1 className="text-xl font-bold text-white tracking-tight">
            {step === "credentials" && "Create Student OS Account"}
            {step === "phone_otp" && "Verify Mobile Identity"}
            {step === "personalization" && "7-Day Free Trial Activated"}
          </h1>
          <p className="text-xs text-zinc-400 font-light">
            {step === "credentials" && "Autonomous Personal Workspace for Academics & Research"}
            {step === "phone_otp" && "SMS verification is required to activate your 7-day free trial"}
            {step === "personalization" && "Customize your academic focus or jump straight to work"}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {missingConfig && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 space-y-1.5 text-xs text-amber-200">
            <p className="font-bold">Missing External SMS Configuration:</p>
            <p className="text-[11px] text-amber-300/80">
              The server does not have active SMS gateway credentials ({missingConfig.join(", ")}).
            </p>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {step === "credentials" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="e.g. Alex Sharma"
                />
              </div>
            </div>

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
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="name@university.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Mobile Number (for SMS Verification)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
                  placeholder="+91 98765-43210"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Max 2 eligible accounts per verified mobile number.
              </p>
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
                  minLength={8}
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Registering..." : "Continue: Verify Mobile & Activate Trial"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: PHONE OTP VERIFICATION */}
        {step === "phone_otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
              <span className="font-bold text-white">Verification Code:</span>
              <p className="text-[11px] text-zinc-400">
                Enter the 6-digit one-time code sent to{" "}
                <span className="text-white font-mono">{phoneNumber}</span>.
              </p>
              {otpStatus && (
                <p className="text-[11px] text-cyan-400 font-medium pt-1">{otpStatus}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                6-Digit SMS Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-center text-base tracking-widest font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="000000"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Activate Free Trial"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleFinishOnboarding(true)}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 text-center transition-colors"
            >
              Verify later & explore workspace in read-only mode →
            </button>
          </form>
        )}

        {/* STEP 3: 7-DAY FREE TRIAL CONFIRMATION & PERSONALIZATION */}
        {step === "personalization" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white">7-Day Free Trial Activated!</h2>
              <p className="text-[11px] text-zinc-300">
                No credit card required. Full unrestricted access to all AMAHAS Student OS features until next week.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  College / Institution (Optional)
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology / Stanford"
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Examination Track (Optional)
                </label>
                <select
                  value={examinationTrack}
                  onChange={(e) => setExaminationTrack(e.target.value)}
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="GATE_CS">GATE Computer Science & IT</option>
                  <option value="GATE_EC">GATE Electronics & Communication</option>
                  <option value="ESE_ET">ESE Engineering Services (Electronics)</option>
                  <option value="UNIVERSITY">University Semester Coursework</option>
                  <option value="GENERAL">General Professional & Deep Work</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Primary Focus (Optional)
                </label>
                <input
                  type="text"
                  value={primaryFocus}
                  onChange={(e) => setPrimaryFocus(e.target.value)}
                  placeholder="e.g. Systems Architecture + Research"
                  className="w-full bg-[#111111] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => handleFinishOnboarding(true)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold transition-all"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={() => handleFinishOnboarding(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md"
              >
                Enter Workspace
              </button>
            </div>
          </div>
        )}

        {step === "credentials" && (
          <div className="mt-6 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
