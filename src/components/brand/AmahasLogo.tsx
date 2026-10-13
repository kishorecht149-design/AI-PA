"use client";

import React from "react";

export interface AmahasLogoProps {
  variant?: "primary" | "compact" | "symbol" | "sidebar";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Official AMAHAS 3D Brand Logo Component
 * Uses the authentic, high-resolution 3D rendered artwork.
 */
export function AmahasLogo({
  variant = "primary",
  size = "md",
  className = "",
  showSubtitle = true,
}: AmahasLogoProps) {
  // Standalone 3D Emblem Symbol
  if (variant === "symbol") {
    const symbolSizes = {
      sm: "w-7 h-7",
      md: "w-9 h-9",
      lg: "w-12 h-12",
      xl: "w-16 h-16",
    }[size];

    const pxSize = size === "sm" ? 28 : size === "lg" ? 48 : size === "xl" ? 64 : 36;

    return (
      <img
        src="/brand/amahas-symbol.png"
        alt="AMAHAS Symbol"
        width={pxSize}
        height={pxSize}
        style={{ width: pxSize, height: pxSize, maxWidth: pxSize, maxHeight: pxSize }}
        className={`${symbolSizes} object-contain flex-shrink-0 drop-shadow-md select-none ${className}`}
      />
    );
  }

  // Sidebar compact lockup
  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <img
          src="/brand/amahas-symbol.png"
          alt="AMAHAS"
          width={36}
          height={36}
          style={{ width: 36, height: 36, maxWidth: 36, maxHeight: 36 }}
          className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-md"
        />
        <div className="flex flex-col leading-none justify-center">
          <span
            className="font-black text-sm tracking-widest bg-gradient-to-r from-cyan-400 via-sky-200 to-violet-400 bg-clip-text text-transparent"
            style={{ letterSpacing: "0.18em" }}
          >
            AMAHAS
          </span>
          {showSubtitle && (
            <span
              className="text-[9px] uppercase tracking-widest text-cyan-400 font-semibold mt-0.5 opacity-90"
              style={{ letterSpacing: "0.16em" }}
            >
              Student OS
            </span>
          )}
        </div>
      </div>
    );
  }

  // Compact Header Lockup
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <img
          src="/brand/amahas-symbol.png"
          alt="AMAHAS"
          width={28}
          height={28}
          style={{ width: 28, height: 28, maxWidth: 28, maxHeight: 28 }}
          className="w-7 h-7 object-contain flex-shrink-0 drop-shadow-sm"
        />
        <span
          className="font-black text-xs tracking-wider bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent"
          style={{ letterSpacing: "0.15em" }}
        >
          AMAHAS
        </span>
      </div>
    );
  }

  // Primary Full 3D Logo Lockup (with the authentic artwork)
  const primarySizes = {
    sm: "h-10",
    md: "h-14",
    lg: "h-20",
    xl: "h-28",
  }[size];

  const maxH = size === "sm" ? 40 : size === "lg" ? 80 : size === "xl" ? 112 : 56;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <img
        src="/brand/amahas-logo.png"
        alt="AMAHAS — Intelligent Personal Operating System for Students"
        style={{ maxHeight: maxH, height: maxH, width: "auto" }}
        className={`${primarySizes} w-auto object-contain drop-shadow-xl`}
      />
    </div>
  );
}

export default AmahasLogo;
