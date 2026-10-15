"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTheme } from "@/lib/themes/theme-provider";

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Read site theme context
  const themeContext = useTheme();
  const isDark = themeContext ? themeContext.theme.isDark : true;

  // Resolve edition:
  // If auto: Edition B (Gold) for light/white themes, Edition A (Silver) for dark/black themes
  const resolvedEdition: "silver" | "gold" =
    edition === "auto" ? (isDark ? "silver" : "gold") : edition;

  const isSilver = resolvedEdition === "silver";

  // 3D Parallax & Gyroscopic state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });

  // Metallic styling parameters
  const palette = isSilver
    ? {
        emblemSrc: "/brand/preview/silver-clean.png",
        ambientGlow: "rgba(56, 189, 248, 0.18)",
        specularGrad:
          "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.85) 48%, rgba(220,240,255,1) 50%, rgba(255,255,255,0.85) 52%, rgba(255,255,255,0.15) 65%, transparent 80%)",
        nodePulse: "#38bdf8",
        synapseLine: "rgba(56, 189, 248, 0.4)",
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
      }
    : {
        emblemSrc: "/brand/preview/gold-clean.png",
        ambientGlow: "rgba(234, 179, 8, 0.22)",
        specularGrad:
          "linear-gradient(115deg, transparent 20%, rgba(254,240,138,0.2) 35%, rgba(255,245,180,0.9) 48%, rgba(255,255,255,1) 50%, rgba(254,240,138,0.9) 52%, rgba(250,204,21,0.2) 65%, transparent 80%)",
        nodePulse: "#facc15",
        synapseLine: "rgba(234, 179, 8, 0.45)",
        textGradient: "from-amber-400 via-yellow-500 to-amber-700",
      };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !interactive3D) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    targetTilt.current = {
      x: -ny * 16,
      y: nx * 16,
    };
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    targetTilt.current = { x: 0, y: 0 };
  };

  // Smooth lerp loop for 3D spring tilt
  useEffect(() => {
    let animId: number;

    const loop = () => {
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.1;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.1;

      // Gentle continuous ambient breathing tilt when idle
      if (!isHovered && interactive3D) {
        const time = Date.now() * 0.0012;
        currentTilt.current.x = Math.sin(time) * 3.5;
        currentTilt.current.y = Math.cos(time * 0.8) * 4.5;
      }

      setTilt({ ...currentTilt.current });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isHovered, interactive3D]);

  // Normalised constellation nodes inside the head silhouette
  const constellationNodes = [
    { cx: "65%", cy: "24%", r: 3 },
    { cx: "74%", cy: "35%", r: 2.5 },
    { cx: "61%", cy: "43%", r: 3.2 },
    { cx: "77%", cy: "53%", r: 2.5 },
    { cx: "63%", cy: "62%", r: 2.8 },
  ];

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center select-none ${className}`}
    >
      {/* 3D Perspective Stage Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: size,
          height: size,
          perspective: 1000,
        }}
        className="relative flex items-center justify-center cursor-pointer group"
      >
        {/* Tilting 3D Emblem Wrapper */}
        <div
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
            transition: isHovered
              ? "none"
              : "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
            transformStyle: "preserve-3d",
            width: size,
            height: size,
          }}
          className="relative flex items-center justify-center"
        >
          {/* Subtle Backlit Ambient Depth Halo */}
          <div
            style={{
              width: size * 0.8,
              height: size * 0.8,
              filter: "blur(20px)",
              background: palette.ambientGlow,
            }}
            className="absolute rounded-full pointer-events-none"
          />

          {/* 1. MASTER 3D BEVELED EMBLEM IMAGE (100% Reliable, Always Visible) */}
          <img
            src={palette.emblemSrc}
            alt={`AMAHAS ${isSilver ? "Platinum Titanium" : "Champagne Gold"} Emblem`}
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              transform: "translateZ(15px)",
              filter: isHovered
                ? "brightness(1.06) contrast(1.03)"
                : "brightness(1.0) contrast(1.0)",
              transition: "filter 0.3s ease",
            }}
            className="object-contain pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
          />

          {/* 2. SPECULAR SHEEN SWEEP (STRICTLY CLIPPED TO LOGO SILHOUETTE VIA MASK) */}
          {enableShimmer && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: size,
                height: size,
                transform: "translateZ(25px)",
                maskImage: `url(${palette.emblemSrc})`,
                WebkitMaskImage: `url(${palette.emblemSrc})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                pointerEvents: "none",
                overflow: "hidden",
                mixBlendMode: isSilver ? "color-dodge" : "screen",
              }}
            >
              {/* The Gleam Bar (Guaranteed NEVER to bleed outside the mask!) */}
              <div
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background: palette.specularGrad,
                  transform: "rotate(-35deg)",
                  animation: "metallic-sheen-sweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {/* 3. CONSTELLATION SYNAPSE SIGNALS (Subtle micro-pulses inside head silhouette) */}
          {enableShimmer && (
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: size,
                height: size,
                transform: "translateZ(30px)",
                pointerEvents: "none",
              }}
              viewBox="0 0 100 100"
            >
              {/* Synaptic links */}
              <line x1="65" y1="24" x2="74" y2="35" stroke={palette.synapseLine} strokeWidth="0.8" />
              <line x1="74" y1="35" x2="61" y2="43" stroke={palette.synapseLine} strokeWidth="0.8" />
              <line x1="61" y1="43" x2="77" y2="53" stroke={palette.synapseLine} strokeWidth="0.8" />
              <line x1="77" y1="53" x2="63" y2="62" stroke={palette.synapseLine} strokeWidth="0.8" />

              {/* Orbital Nodes with subtle breathing animation */}
              {constellationNodes.map((n, i) => (
                <circle
                  key={i}
                  cx={n.cx}
                  cy={n.cy}
                  r={n.r * 0.4}
                  fill={palette.nodePulse}
                  opacity="0.9"
                  className="animate-pulse"
                  style={{ animationDuration: `${2 + i * 0.5}s` }}
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Brand Typographic Signature (Optional) */}
      {showText && (
        <div className="mt-4 flex flex-col items-center text-center">
          <span
            className={`text-xl sm:text-2xl font-black tracking-[0.24em] bg-gradient-to-r ${palette.textGradient} bg-clip-text text-transparent drop-shadow-sm`}
          >
            AMAHAS
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mt-1">
            Autonomous Workspace & Intelligence
          </span>
        </div>
      )}

      {/* CSS Keyframes for Metallic Sheen Sweep */}
      <style jsx>{`
        @keyframes metallic-sheen-sweep {
          0% {
            transform: rotate(-35deg) translateY(-140%);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          45% {
            transform: rotate(-35deg) translateY(140%);
            opacity: 1;
          }
          46%,
          100% {
            transform: rotate(-35deg) translateY(140%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
