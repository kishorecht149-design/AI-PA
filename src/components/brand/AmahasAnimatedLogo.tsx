"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/themes/theme-provider";
import Amahas3DCanvas from "./Amahas3DCanvas";

export interface AmahasAnimatedLogoProps {
  edition?: "silver" | "gold" | "auto";
  size?: number; // size in pixels (e.g. 28, 36, 48, 64, 140, 280, 360)
  interactive3D?: boolean;
  enableShimmer?: boolean;
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AmahasAnimatedLogo({
  edition = "auto",
  size = 280,
  interactive3D = true,
  enableShimmer = true,
  showText = false,
  className = "",
  onClick,
}: AmahasAnimatedLogoProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Read site theme context
  const themeContext = useTheme();
  const isDark = themeContext ? themeContext.theme.isDark : true;

  // Resolve edition:
  // Edition B (Gold) for light/white themes, Edition A (Silver) for dark/black themes
  const resolvedEdition: "silver" | "gold" =
    edition === "auto" ? (isDark ? "silver" : "gold") : edition;

  const isSilver = resolvedEdition === "silver";

  const palette = isSilver
    ? {
        ambientGlow: "rgba(56, 189, 248, 0.15)",
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
        editionLabel: "Platinum Titanium Edition A",
      }
    : {
        ambientGlow: "rgba(234, 179, 8, 0.2)",
        textGradient: "from-amber-300 via-yellow-500 to-amber-700",
        editionLabel: "Champagne Gold Edition B",
      };

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center select-none ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        style={{
          width: size,
          height: size,
        }}
        className="relative flex items-center justify-center"
      >
        {/* Subtle Ambient Back-Glow (Depth) */}
        <div
          style={{
            position: "absolute",
            width: size * 0.85,
            height: size * 0.85,
            background: palette.ambientGlow,
            filter: `blur(${Math.max(16, size * 0.18)}px)`,
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* Direct Client-Hydrated 3D WebGL Canvas */}
        {isMounted ? (
          <Amahas3DCanvas
            edition={resolvedEdition}
            size={size}
            interactive3D={interactive3D}
            enableShimmer={enableShimmer}
          />
        ) : (
          <img
            src={
              isSilver
                ? "/brand/amahas-silver-master.jpg"
                : "/brand/amahas-gold-master.jpg"
            }
            alt="AMAHAS Logo"
            width={size}
            height={size}
            className="w-full h-full object-contain rounded-2xl"
          />
        )}
      </div>

      {/* Optional Wordmark and Edition Typography */}
      {showText && (
        <div className="mt-4 text-center">
          <div
            className={`text-xl md:text-2xl font-black tracking-[0.25em] uppercase bg-gradient-to-r ${palette.textGradient} bg-clip-text text-transparent drop-shadow-sm`}
          >
            AMAHAS
          </div>
          <div className="text-[10px] tracking-[0.35em] uppercase font-semibold text-[var(--text-secondary)] mt-1 flex items-center justify-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSilver ? "bg-sky-400" : "bg-amber-400"
              }`}
            />
            <span>{palette.editionLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AmahasAnimatedLogo;
