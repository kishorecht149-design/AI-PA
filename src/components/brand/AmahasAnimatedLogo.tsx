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
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);

  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });

  // Metallic styling parameters referencing the exact uploaded artwork
  const palette = isSilver
    ? {
        imageSrc: "/brand/amahas-silver-master.jpg",
        ambientGlow: "rgba(56, 189, 248, 0.2)",
        specularHighlight:
          "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0.7) 48%, rgba(220,240,255,0.95) 50%, rgba(255,255,255,0.7) 52%, rgba(255,255,255,0.05) 65%, transparent 80%)",
        spotlightColor: "rgba(255, 255, 255, 0.4)",
        starColor: "#a5f3fc",
        synapseColor: "rgba(165, 243, 252, 0.5)",
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
        borderHighlight: "rgba(255, 255, 255, 0.12)",
      }
    : {
        imageSrc: "/brand/amahas-gold-master.jpg",
        ambientGlow: "rgba(234, 179, 8, 0.25)",
        specularHighlight:
          "linear-gradient(115deg, transparent 20%, rgba(254,240,138,0.08) 35%, rgba(255,245,180,0.75) 48%, rgba(255,255,255,0.95) 50%, rgba(254,240,138,0.75) 52%, rgba(250,204,21,0.08) 65%, transparent 80%)",
        spotlightColor: "rgba(254, 240, 138, 0.45)",
        starColor: "#fde047",
        synapseColor: "rgba(250, 204, 21, 0.5)",
        textGradient: "from-amber-300 via-yellow-500 to-amber-700",
        borderHighlight: "rgba(250, 204, 21, 0.2)",
      };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !interactive3D) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    setMousePos({ x: nx, y: ny });
    targetTilt.current = {
      x: -(ny - 0.5) * 14,
      y: (nx - 0.5) * 14,
    };
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    targetTilt.current = { x: 0, y: 0 };
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // Smooth 3D Gyroscopic spring lerp loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.08;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.08;

      // Gentle continuous ambient breathing tilt when idle
      if (!isHovered && interactive3D) {
        const time = Date.now() * 0.001;
        currentTilt.current.x = Math.sin(time) * 3.0;
        currentTilt.current.y = Math.cos(time * 0.8) * 3.5;
      }

      setTilt({ ...currentTilt.current });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isHovered, interactive3D]);

  // Constellation orbital nodes matching the exact artwork geometry
  const nodes = [
    { x: "36%", y: "33%", size: 3.2, delay: "0s" },
    { x: "33%", y: "43%", size: 2.8, delay: "0.8s" },
    { x: "64%", y: "24%", size: 3.5, delay: "1.4s" },
    { x: "69%", y: "34%", size: 4.2, delay: "0.4s" },
    { x: "75%", y: "52%", size: 2.8, delay: "1.8s" },
    { x: "61%", y: "65%", size: 2.6, delay: "1.1s" },
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
          className="relative rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl"
        >
          {/* 1. MASTER HIGH-RES 3D EMBLEM ARTWORK (100% Authentic, Direct Image) */}
          <img
            src={palette.imageSrc}
            alt={`AMAHAS ${isSilver ? "Platinum Titanium" : "Champagne Gold"} Logo`}
            width={size}
            height={size}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: isHovered
                ? "brightness(1.06) contrast(1.04)"
                : "brightness(1.0) contrast(1.0)",
              transition: "filter 0.3s ease",
            }}
            className="block pointer-events-none select-none"
          />

          {/* 2. SPECULAR SHEEN SWEEP (STRICTLY CONFINED INSIDE OVERFLOW-HIDDEN CONTAINER) */}
          {enableShimmer && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                mixBlendMode: "screen",
              }}
            >
              {/* The Linear Sheen Glint Beam */}
              <div
                style={{
                  position: "absolute",
                  top: "-60%",
                  left: "-60%",
                  width: "220%",
                  height: "220%",
                  background: palette.specularHighlight,
                  transform: "rotate(-35deg)",
                  animation: "metallic-gleam-sweep 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {/* 3. INTERACTIVE CURSOR SPECULAR SPOTLIGHT (Follows Mouse on Metal) */}
          {interactive3D && isHovered && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle 90px at ${mousePos.x * 100}% ${
                  mousePos.y * 100
                }%, ${palette.spotlightColor} 0%, rgba(255,255,255,0.08) 50%, transparent 80%)`,
                mixBlendMode: "color-dodge",
                pointerEvents: "none",
                transition: "opacity 0.2s ease",
              }}
            />
          )}

          {/* 4. CONSTELLATION ORBITAL SHIMMER PULSES (Aligned with artwork nodes) */}
          {enableShimmer && (
            <div className="absolute inset-0 pointer-events-none">
              {nodes.map((node, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    transform: "translate(-50%, -50%)",
                    width: node.size * 2,
                    height: node.size * 2,
                  }}
                  className="flex items-center justify-center"
                >
                  {/* Subtle radiating beacon */}
                  <span
                    style={{
                      backgroundColor: palette.starColor,
                      animationDelay: node.delay,
                      animationDuration: "2.4s",
                    }}
                    className="absolute w-full h-full rounded-full opacity-60 animate-ping"
                  />
                  {/* Glowing center starlet */}
                  <span
                    style={{
                      backgroundColor: "#ffffff",
                      boxShadow: `0 0 6px ${palette.starColor}`,
                    }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 5. LUXURY BEVELED PERIMETER BORDER */}
          <div
            style={{
              borderColor: palette.borderHighlight,
            }}
            className="absolute inset-0 rounded-3xl border pointer-events-none"
          />
        </div>
      </div>

      {/* Optional Brand Typographic Signature */}
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

      {/* Hardware-Accelerated CSS Keyframes for Metallic Gleam Sweep */}
      <style jsx>{`
        @keyframes metallic-gleam-sweep {
          0% {
            transform: rotate(-35deg) translateY(-160%);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          45% {
            transform: rotate(-35deg) translateY(160%);
            opacity: 0.85;
          }
          46%,
          100% {
            transform: rotate(-35deg) translateY(160%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
