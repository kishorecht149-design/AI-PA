"use client";

import React from "react";
import { useTheme } from "@/lib/themes/theme-provider";
import AmahasAnimatedLogo from "./AmahasAnimatedLogo";

export interface AmahasLogoProps {
  variant?: "primary" | "compact" | "symbol" | "sidebar";
  size?: "sm" | "md" | "lg" | "xl";
  edition?: "silver" | "gold" | "auto";
  interactive?: boolean;
  className?: string;
  showSubtitle?: boolean;
  onClick?: () => void;
}

/**
 * Official AMAHAS 3D Brand Logo Component
 * Renders the authentic, high-resolution 3D WebGL emblem with dynamic theme adaptation:
 * - Edition B (Champagne Gold & Dark Charcoal) for white and light themes.
 * - Edition A (Platinum Titanium Silver & Charcoal) for OLED black and dark themes.
 */
export function AmahasLogo({
  variant = "primary",
  size = "md",
  edition = "auto",
  interactive = true,
  className = "",
  showSubtitle = true,
  onClick,
}: AmahasLogoProps) {
  const themeContext = useTheme();
  const isDark = themeContext ? themeContext.theme.isDark : true;

  const resolvedEdition = edition === "auto" ? (isDark ? "silver" : "gold") : edition;
  const isSilver = resolvedEdition === "silver";

  const palette = isSilver
    ? {
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
        subtitleColor: "text-sky-400",
      }
    : {
        textGradient: "from-amber-300 via-yellow-500 to-amber-700",
        subtitleColor: "text-amber-500",
      };

  // 1. Standalone 3D Emblem Symbol
  if (variant === "symbol") {
    const pxSize = size === "sm" ? 28 : size === "md" ? 36 : size === "lg" ? 52 : 72;

    return (
      <div onClick={onClick} className={`select-none flex-shrink-0 ${className}`}>
        <AmahasAnimatedLogo
          edition={resolvedEdition}
          size={pxSize}
          interactive3D={interactive}
          enableShimmer={true}
          showText={false}
        />
      </div>
    );
  }

  // 2. Sidebar Navigation Lockup (36px Emblem + Typography)
  if (variant === "sidebar") {
    const pxSize = size === "sm" ? 32 : size === "lg" ? 44 : 36;

    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2.5 select-none ${className}`}
      >
        <div className="flex-shrink-0">
          <AmahasAnimatedLogo
            edition={resolvedEdition}
            size={pxSize}
            interactive3D={interactive}
            enableShimmer={true}
            showText={false}
          />
        </div>
        <div className="flex flex-col leading-none justify-center">
          <span
            className={`font-black text-sm tracking-widest bg-gradient-to-r ${palette.textGradient} bg-clip-text text-transparent`}
            style={{ letterSpacing: "0.18em" }}
          >
            AMAHAS
          </span>
          {showSubtitle && (
            <span
              className={`text-[9px] uppercase tracking-widest ${palette.subtitleColor} font-semibold mt-0.5 opacity-90`}
              style={{ letterSpacing: "0.16em" }}
            >
              Student OS
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Compact Header Lockup (28px Emblem + Wordmark)
  if (variant === "compact") {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 select-none ${className}`}
      >
        <div className="flex-shrink-0">
          <AmahasAnimatedLogo
            edition={resolvedEdition}
            size={28}
            interactive3D={interactive}
            enableShimmer={true}
            showText={false}
          />
        </div>
        <span
          className={`font-black text-xs tracking-wider bg-gradient-to-r ${palette.textGradient} bg-clip-text text-transparent`}
          style={{ letterSpacing: "0.15em" }}
        >
          AMAHAS
        </span>
      </div>
    );
  }

  // 4. Primary Full 3D Hero / Auth / Portal Lockup
  const emblemSizes = {
    sm: 48,
    md: 68,
    lg: 96,
    xl: 130,
  }[size];

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center select-none text-center ${className}`}
    >
      <AmahasAnimatedLogo
        edition={resolvedEdition}
        size={emblemSizes}
        interactive3D={interactive}
        enableShimmer={true}
        showText={false}
      />
      <div className="mt-3 flex flex-col items-center">
        <span
          className={`font-black tracking-[0.22em] uppercase bg-gradient-to-r ${palette.textGradient} bg-clip-text text-transparent drop-shadow-sm ${
            size === "sm"
              ? "text-lg"
              : size === "lg" || size === "xl"
              ? "text-2xl md:text-3xl"
              : "text-xl"
          }`}
        >
          AMAHAS
        </span>
        {showSubtitle && (
          <span className="text-[10px] tracking-[0.28em] uppercase text-[var(--text-muted)] font-semibold mt-1">
            Autonomous Workspace & Intelligence
          </span>
        )}
      </div>
    </div>
  );
}

export default AmahasLogo;
