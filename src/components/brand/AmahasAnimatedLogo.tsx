"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTheme } from "@/lib/themes/theme-provider";

export interface AmahasAnimatedLogoProps {
  edition?: "silver" | "gold" | "auto";
  size?: number; // size in pixels
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Metallic palette styling
  const palette = isSilver
    ? {
        specularGrad:
          "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 48%, rgba(220,240,255,0.95) 50%, rgba(255,255,255,0.7) 52%, transparent 80%)",
        spotlightColor: "rgba(255, 255, 255, 0.45)",
        nodePulse: "#a5f3fc",
        synapseLine: "rgba(165, 243, 252, 0.4)",
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
        ambientGlow: "rgba(56, 189, 248, 0.2)",
      }
    : {
        specularGrad:
          "linear-gradient(115deg, transparent 20%, rgba(254,240,138,0.7) 48%, rgba(255,255,255,0.95) 50%, rgba(250,204,21,0.7) 52%, transparent 80%)",
        spotlightColor: "rgba(254, 240, 138, 0.55)",
        nodePulse: "#fde047",
        synapseLine: "rgba(250, 204, 21, 0.45)",
        textGradient: "from-amber-200 via-yellow-400 to-amber-600",
        ambientGlow: "rgba(234, 179, 8, 0.25)",
      };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    setMousePos({ x: nx, y: ny });

    if (interactive3D) {
      targetTilt.current = {
        x: -(ny - 0.5) * 16,
        y: (nx - 0.5) * 16,
      };
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    targetTilt.current = { x: 0, y: 0 };
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // 60 FPS Canvas rendering loop for Anisotropic Specular Light Sweep and Constellation Synapses
  useEffect(() => {
    let animId: number;
    let sweepPhase = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Synaptic constellation nodes inside the head silhouette
    // Coordinates normalized (0 to 1) based on emblem geometry
    const nodes = [
      { x: 0.64, y: 0.24, r: 2.8 },
      { x: 0.73, y: 0.35, r: 2.4 },
      { x: 0.60, y: 0.44, r: 3.0 },
      { x: 0.76, y: 0.54, r: 2.2 },
      { x: 0.62, y: 0.63, r: 2.6 },
      { x: 0.35, y: 0.43, r: 2.5 },
    ];

    const links = [
      { source: 0, target: 1, pulse: 0 },
      { source: 1, target: 2, pulse: 0.3 },
      { source: 2, target: 3, pulse: 0.6 },
      { source: 3, target: 4, pulse: 0.8 },
      { source: 0, target: 2, pulse: 0.5 },
      { source: 5, target: 2, pulse: 0.2 },
    ];

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Lerp 3D tilt
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.1;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.1;

      // Subtle breathing tilt when idle
      if (!isHovered && interactive3D) {
        const time = Date.now() * 0.0012;
        currentTilt.current.x = Math.sin(time) * 3.5;
        currentTilt.current.y = Math.cos(time * 0.8) * 4.5;
      }

      setTilt({ ...currentTilt.current });

      if (enableShimmer) {
        sweepPhase = (sweepPhase + 0.005) % 1; // slow majestic metallic sweep

        // 1. Moving Anisotropic Light Sweep across the beveled metal
        const sweepX = (sweepPhase * 2.4 - 0.7) * w;
        const sweepY = (sweepPhase * 2.4 - 0.7) * h;

        const grad = ctx.createLinearGradient(
          sweepX - 70,
          sweepY - 70,
          sweepX + 70,
          sweepY + 70
        );
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.4, "rgba(255,255,255,0.0)");
        grad.addColorStop(
          0.5,
          isSilver ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 245, 180, 0.9)"
        );
        grad.addColorStop(0.6, "rgba(255,255,255,0.0)");
        grad.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 2. Interactive Cursor Specular Glint (Tracks mouse position)
        if (isHovered) {
          const spotX = mousePos.x * w;
          const spotY = mousePos.y * h;
          const spotRad = ctx.createRadialGradient(
            spotX,
            spotY,
            0,
            spotX,
            spotY,
            w * 0.45
          );
          spotRad.addColorStop(0, palette.spotlightColor);
          spotRad.addColorStop(0.4, "rgba(255, 255, 255, 0.15)");
          spotRad.addColorStop(1, "transparent");

          ctx.fillStyle = spotRad;
          ctx.fillRect(0, 0, w, h);
        }

        // 3. Synaptic Constellation Energy Signals
        const t = Date.now() * 0.003;

        // Draw connecting synaptic tether lines
        links.forEach((l) => {
          const s = nodes[l.source];
          const tg = nodes[l.target];
          const x1 = s.x * w;
          const y1 = s.y * h;
          const x2 = tg.x * w;
          const y2 = tg.y * h;

          ctx.strokeStyle = palette.synapseLine;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Traveling Synaptic Signal Photon
          l.pulse = (l.pulse + 0.012) % 1;
          const px = x1 + (x2 - x1) * l.pulse;
          const py = y1 + (y2 - y1) * l.pulse;

          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = palette.nodePulse;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        });

        // Draw Celestial Constellation Spheres
        nodes.forEach((n, idx) => {
          const nx = n.x * w;
          const ny = n.y * h;
          const pulseIntensity = 0.6 + Math.sin(t + idx * 1.5) * 0.4;

          // Outer delicate glow
          const nodeGlow = ctx.createRadialGradient(
            nx,
            ny,
            n.r * 0.5,
            nx,
            ny,
            n.r * 2.8
          );
          nodeGlow.addColorStop(0, palette.nodePulse);
          nodeGlow.addColorStop(1, "transparent");

          ctx.fillStyle = nodeGlow;
          ctx.globalAlpha = pulseIntensity * 0.8;
          ctx.beginPath();
          ctx.arc(nx, ny, n.r * 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Solid core bead
          ctx.fillStyle = isSilver ? "#ffffff" : "#fef08a";
          ctx.globalAlpha = 1.0;
          ctx.beginPath();
          ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSilver, isHovered, enableShimmer, interactive3D, mousePos, palette]);

  const emblemSrc = isSilver
    ? "/brand/preview/silver-emblem-transparent.png"
    : "/brand/preview/gold-emblem-transparent.png";

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
          perspective: 1200,
        }}
        className="relative flex items-center justify-center cursor-pointer group"
      >
        {/* Tilting 3D Card Wrapper */}
        <div
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
            transition: isHovered
              ? "none"
              : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
            transformStyle: "preserve-3d",
          }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* Subtle Ambient Backlit Floor Shadow */}
          <div
            style={{
              width: size * 0.75,
              height: size * 0.75,
              filter: "blur(24px)",
              background: palette.ambientGlow,
            }}
            className="absolute rounded-full pointer-events-none"
          />

          {/* Master 3D Beveled Emblem Image (Transparent Cutout) */}
          <img
            src={emblemSrc}
            alt={`AMAHAS ${isSilver ? "Platinum Titanium" : "Champagne Gold"} Emblem`}
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              transform: "translateZ(15px)",
              filter: isHovered
                ? "brightness(1.08) contrast(1.05)"
                : "brightness(1.0) contrast(1.0)",
              transition: "filter 0.3s ease",
            }}
            className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] pointer-events-none"
          />

          {/* Anisotropic Specular Light Overlay Canvas (Masked over emblem with color-dodge) */}
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              transform: "translateZ(25px)",
              mixBlendMode: "color-dodge",
              pointerEvents: "none",
            }}
            className="absolute inset-0 w-full h-full"
          />

          {/* Moving Specular Sheen Beam (CSS Hardware Accelerated) */}
          {enableShimmer && (
            <div
              style={{
                width: size * 1.6,
                height: size * 1.6,
                transform: "translateZ(30px) rotate(-35deg)",
                background: palette.specularGrad,
                mixBlendMode: "overlay",
                pointerEvents: "none",
                animation: "metallic-sheen-sweep 4.5s ease-in-out infinite",
              }}
              className="absolute pointer-events-none"
            />
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
            transform: translateZ(30px) rotate(-35deg) translateX(-180%);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          45% {
            transform: translateZ(30px) rotate(-35deg) translateX(180%);
            opacity: 0.9;
          }
          46%,
          100% {
            transform: translateZ(30px) rotate(-35deg) translateX(180%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
