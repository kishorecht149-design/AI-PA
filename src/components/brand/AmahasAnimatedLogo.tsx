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

  // Metallic color parameters
  const palette = isSilver
    ? {
        specularBase: "rgba(255, 255, 255, 0.95)",
        specularFringe: "rgba(200, 240, 255, 0.4)",
        spotlightColor: "rgba(255, 255, 255, 0.7)",
        nodePulse: "#a5f3fc",
        synapseLine: "rgba(165, 243, 252, 0.45)",
        textGradient: "from-zinc-100 via-zinc-300 to-zinc-500",
        ambientGlow: "rgba(56, 189, 248, 0.15)",
        emblemSrc: "/brand/preview/silver-clean.png",
      }
    : {
        specularBase: "rgba(255, 248, 200, 0.95)",
        specularFringe: "rgba(250, 204, 21, 0.45)",
        spotlightColor: "rgba(255, 235, 150, 0.75)",
        nodePulse: "#fde047",
        synapseLine: "rgba(250, 204, 21, 0.5)",
        textGradient: "from-amber-300 via-yellow-500 to-amber-700",
        ambientGlow: "rgba(234, 179, 8, 0.18)",
        emblemSrc: "/brand/preview/gold-clean.png",
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

  // Hardware-accelerated Canvas animation with STRICT source-atop pixel masking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepPhase = 0;
    const img = new Image();
    img.src = palette.emblemSrc;

    let isImageLoaded = false;
    img.onload = () => {
      isImageLoaded = true;
    };

    // Synaptic constellation nodes inside the head silhouette
    const nodes = [
      { x: 0.65, y: 0.24, r: 2.8 },
      { x: 0.74, y: 0.35, r: 2.4 },
      { x: 0.61, y: 0.43, r: 3.0 },
      { x: 0.77, y: 0.53, r: 2.2 },
      { x: 0.63, y: 0.62, r: 2.6 },
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

      // 1. Clear entire canvas completely (100% transparent outside emblem)
      ctx.clearRect(0, 0, w, h);

      // Lerp 3D tilt
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.1;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.1;

      // Gentle breathing tilt when idle
      if (!isHovered && interactive3D) {
        const time = Date.now() * 0.0012;
        currentTilt.current.x = Math.sin(time) * 3.5;
        currentTilt.current.y = Math.cos(time * 0.8) * 4.5;
      }

      setTilt({ ...currentTilt.current });

      if (isImageLoaded) {
        // 2. Draw master 3D emblem
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, 0, 0, w, h);

        if (enableShimmer) {
          sweepPhase = (sweepPhase + 0.006) % 1; // smooth metallic specular sweep

          // 3. STRICT SOURCE-ATOP COMPOSITING
          // Any specular highlight drawn will ONLY affect non-transparent emblem pixels!
          // Absolutely ZERO spill outside the logo silhouette!
          ctx.globalCompositeOperation = "source-atop";

          // Moving Anisotropic Specular Gleam across the metallic chamfers
          const sweepX = (sweepPhase * 2.6 - 0.8) * w;
          const sweepY = (sweepPhase * 2.6 - 0.8) * h;
          const beamWidth = w * 0.22;

          const sweepGrad = ctx.createLinearGradient(
            sweepX - beamWidth,
            sweepY - beamWidth,
            sweepX + beamWidth,
            sweepY + beamWidth
          );
          sweepGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          sweepGrad.addColorStop(0.35, "rgba(255, 255, 255, 0)");
          sweepGrad.addColorStop(0.48, palette.specularFringe);
          sweepGrad.addColorStop(0.5, palette.specularBase);
          sweepGrad.addColorStop(0.52, palette.specularFringe);
          sweepGrad.addColorStop(0.65, "rgba(255, 255, 255, 0)");
          sweepGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.fillStyle = sweepGrad;
          ctx.fillRect(0, 0, w, h);

          // Interactive Cursor Specular Spotlight (Tracks mouse position on metal)
          if (isHovered) {
            const spotX = mousePos.x * w;
            const spotY = mousePos.y * h;
            const spotRad = ctx.createRadialGradient(
              spotX,
              spotY,
              0,
              spotX,
              spotY,
              w * 0.35
            );
            spotRad.addColorStop(0, palette.spotlightColor);
            spotRad.addColorStop(0.4, "rgba(255, 255, 255, 0.2)");
            spotRad.addColorStop(1, "transparent");

            ctx.fillStyle = spotRad;
            ctx.fillRect(0, 0, w, h);
          }

          // 4. Reset Composite to draw Constellation Synaptic Signals on top
          ctx.globalCompositeOperation = "source-over";
          const t = Date.now() * 0.003;

          // Draw fine synaptic tether lines
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
            ctx.shadowBlur = 6;
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

            // Faint breathing glow
            const nodeGlow = ctx.createRadialGradient(
              nx,
              ny,
              n.r * 0.5,
              nx,
              ny,
              n.r * 2.5
            );
            nodeGlow.addColorStop(0, palette.nodePulse);
            nodeGlow.addColorStop(1, "transparent");

            ctx.fillStyle = nodeGlow;
            ctx.globalAlpha = pulseIntensity * 0.8;
            ctx.beginPath();
            ctx.arc(nx, ny, n.r * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Solid core bead
            ctx.fillStyle = isSilver ? "#ffffff" : "#fef08a";
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSilver, isHovered, enableShimmer, interactive3D, mousePos, palette]);

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center select-none overflow-visible ${className}`}
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
        {/* Tilting 3D Canvas Wrapper */}
        <div
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
            transition: isHovered
              ? "none"
              : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
            transformStyle: "preserve-3d",
            width: size,
            height: size,
          }}
          className="relative flex items-center justify-center"
        >
          {/* Subtle Ambient Backlit Floor Shadow */}
          <div
            style={{
              width: size * 0.7,
              height: size * 0.7,
              filter: "blur(22px)",
              background: palette.ambientGlow,
            }}
            className="absolute rounded-full pointer-events-none"
          />

          {/* Master 60 FPS Metallic Canvas (Strictly clipped with source-atop) */}
          <canvas
            ref={canvasRef}
            width={size * 2}
            height={size * 2}
            style={{
              width: size,
              height: size,
              transform: "translateZ(15px)",
              filter: isHovered
                ? "brightness(1.06) contrast(1.04)"
                : "brightness(1.0) contrast(1.0)",
              transition: "filter 0.3s ease",
            }}
            className="block pointer-events-none"
          />
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
    </div>
  );
}
