"use client";

import React from "react";

export interface AmahasLogoProps {
  variant?: "primary" | "compact" | "symbol" | "sidebar";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  themeMode?: "auto" | "light" | "dark" | "monochrome";
  showSubtitle?: boolean;
}

/**
 * Iconic AMAHAS Orbital Assistant Symbol
 * Features:
 * - Geometric archway "A"
 * - 3D orbital trajectory ring traversing through the glyph
 * - Inner personal assistant silhouette (circular head + curved shoulder crescent)
 * - Electric cyan to vibrant violet/magenta gradient
 */
export function AmahasSymbol({
  className = "w-9 h-9",
  themeMode = "auto",
}: {
  className?: string;
  themeMode?: "auto" | "light" | "dark" | "monochrome";
}) {
  const isMonochrome = themeMode === "monochrome";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 transition-transform duration-200 ${className}`}
      aria-label="AMAHAS Symbol"
    >
      <defs>
        {/* Core Arch Gradients */}
        <linearGradient id="amahas-arch-grad" x1="15" y1="80" x2="85" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="35%" stopColor="#0284c7" />
          <stop offset="70%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        <linearGradient id="amahas-ring-grad" x1="10" y1="50" x2="90" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>

        <linearGradient id="amahas-inner-grad" x1="35" y1="40" x2="65" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id="amahas-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Orbital Ring - Back Segment (renders behind right arm) */}
      <path
        d="M 52 32 C 72 26, 92 32, 88 44 C 84 55, 68 62, 52 64"
        stroke={isMonochrome ? "currentColor" : "url(#amahas-ring-grad)"}
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* 2. Main Arch Structure "A" */}
      <path
        d="M 27 75 L 43 28 C 45 22, 55 22, 57 28 L 73 75 C 75 79, 70 82, 66 79 L 55 46 C 53 40, 47 40, 45 46 L 34 79 C 30 82, 25 79, 27 75 Z"
        fill={isMonochrome ? "currentColor" : "url(#amahas-arch-grad)"}
        filter={isMonochrome ? undefined : "url(#amahas-glow)"}
      />

      {/* 3. Assistant Silhouette: Head */}
      <circle
        cx="50"
        cy="44"
        r="5.5"
        fill={isMonochrome ? "currentColor" : "url(#amahas-inner-grad)"}
        stroke={isMonochrome ? "currentColor" : "#e0f2fe"}
        strokeWidth="1.2"
      />

      {/* 4. Assistant Silhouette: Shoulders / Crossbar Crescent */}
      <path
        d="M 37 68 C 43 56, 57 56, 63 68 C 58 63, 42 63, 37 68 Z"
        fill={isMonochrome ? "currentColor" : "url(#amahas-inner-grad)"}
        stroke={isMonochrome ? "currentColor" : "#7dd3fc"}
        strokeWidth="0.8"
      />

      {/* 5. Orbital Ring - Front Segment (passes gracefully across front of left leg) */}
      <path
        d="M 12 56 C 14 44, 30 36, 48 34"
        stroke={isMonochrome ? "currentColor" : "#00e5ff"}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M 12 56 C 14 62, 26 66, 42 66"
        stroke={isMonochrome ? "currentColor" : "url(#amahas-ring-grad)"}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full AMAHAS Brand Identity Component
 */
export function AmahasLogo({
  variant = "primary",
  size = "md",
  className = "",
  themeMode = "auto",
  showSubtitle = true,
}: AmahasLogoProps) {
  const isMonochrome = themeMode === "monochrome";

  const sizeClasses = {
    sm: { symbol: "w-7 h-7", text: "text-base tracking-wider", sub: "text-[9px]" },
    md: { symbol: "w-9 h-9", text: "text-lg tracking-wider", sub: "text-[10px]" },
    lg: { symbol: "w-11 h-11", text: "text-xl tracking-wider", sub: "text-xs" },
    xl: { symbol: "w-16 h-16", text: "text-3xl tracking-widest", sub: "text-sm" },
  }[size];

  if (variant === "symbol") {
    return <AmahasSymbol className={`${sizeClasses.symbol} ${className}`} themeMode={themeMode} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Symbol */}
      <AmahasSymbol className={sizeClasses.symbol} themeMode={themeMode} />

      {/* Wordmark Lockup */}
      <div className="flex flex-col leading-none justify-center">
        <div className="flex items-center">
          <span
            className={`font-black tracking-wider ${sizeClasses.text} ${
              isMonochrome
                ? "text-current"
                : "bg-gradient-to-r from-cyan-400 via-sky-200 to-violet-400 bg-clip-text text-transparent"
            }`}
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.15em",
            }}
          >
            AMAHAS
          </span>
        </div>

        {showSubtitle && (
          <span
            className={`font-medium tracking-widest uppercase mt-0.5 ${sizeClasses.sub} ${
              isMonochrome
                ? "text-current opacity-70"
                : "text-[var(--accent-primary,theme(colors.cyan.400))] opacity-90"
            }`}
            style={{ letterSpacing: "0.18em" }}
          >
            {variant === "compact" || variant === "sidebar"
              ? "Student OS"
              : "Personal OS"}
          </span>
        )}
      </div>
    </div>
  );
}
export default AmahasLogo;
