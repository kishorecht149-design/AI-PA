"use client";

import React, { useRef, useEffect } from "react";
import { TransceiverState } from "@/lib/voice-transceiver";
import { Mic, MicOff, Volume2, Sparkles, Loader2 } from "lucide-react";

interface VoiceHologramOrbProps {
  state: TransceiverState;
  analyser: AnalyserNode | null;
  onToggle: () => void;
}

export function VoiceHologramOrb({
  state,
  analyser,
  onToggle,
}: VoiceHologramOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    let rotationAngle = 0;

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Dynamic swirling starlight particles
    const particles = Array.from({ length: 60 }, (_, i) => ({
      angle: (i / 60) * Math.PI * 2,
      radius: 50 + Math.random() * 90,
      speed: 0.005 + Math.random() * 0.015,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear Canvas (Pure OLED black)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Audio Amplitude Reading
      let audioLevel = 0;
      if (analyser && state === "listening") {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        audioLevel = sum / (dataArray.length * 255);
      } else if (state === "speaking") {
        audioLevel = 0.25 + Math.sin(phase * 4) * 0.15;
      } else if (state === "processing") {
        audioLevel = 0.18 + Math.sin(phase * 8) * 0.08;
      } else {
        // Idle gentle breathing
        audioLevel = 0.08 + Math.sin(phase * 1.5) * 0.03;
      }

      phase += 0.02 + audioLevel * 0.04;
      rotationAngle += state === "processing" ? 0.04 : 0.01;

      // Color palette based on state
      let primaryColor = "#a855f7"; // purple idle
      let glowColor = "rgba(168, 85, 247, 0.4)";

      if (state === "listening") {
        primaryColor = "#10b981"; // emerald live mic
        glowColor = "rgba(16, 185, 129, 0.6)";
      } else if (state === "processing") {
        primaryColor = "#38bdf8"; // sky blue thinking
        glowColor = "rgba(56, 189, 248, 0.6)";
      } else if (state === "speaking") {
        primaryColor = "#ec4899"; // pink neural voice
        glowColor = "rgba(236, 72, 153, 0.6)";
      }

      // 1. Swirling Orbiting Satellite Particles
      particles.forEach((p) => {
        p.angle += p.speed * (state === "processing" ? 3 : 1);
        const px = centerX + Math.cos(p.angle) * (p.radius + audioLevel * 30);
        const py = centerY + Math.sin(p.angle) * (p.radius + audioLevel * 30);

        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 2. Center Radiant Hologram Glow
      const baseR = Math.min(width, height) * 0.22;
      const dynamicR = baseR * (1 + audioLevel * 0.7);

      const rad = ctx.createRadialGradient(
        centerX,
        centerY,
        dynamicR * 0.15,
        centerX,
        centerY,
        dynamicR * 1.8
      );
      rad.addColorStop(0, glowColor);
      rad.addColorStop(0.5, "rgba(0, 0, 0, 0.2)");
      rad.addColorStop(1, "transparent");

      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 3. Harmonic Waveform Latitude Rings
      const rings = state === "listening" ? 5 : 3;
      for (let r = 0; r < rings; r++) {
        const ringR = dynamicR * (0.8 + r * 0.25);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = state === "listening" ? 1.5 : 1.0;
        ctx.globalAlpha = 0.5 - r * 0.08 + audioLevel * 0.4;

        ctx.beginPath();
        const segments = 72;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const sampleIdx = Math.floor((s / segments) * (bufferLength / 2));
          const freq = dataArray[sampleIdx] ? dataArray[sampleIdx] / 255 : 0;

          const distortion =
            Math.sin(theta * 8 + phase * 3 + r + rotationAngle) *
            (4 + freq * 24 * (r + 1));
          const currR = ringR + distortion;

          const x = centerX + Math.cos(theta) * currR;
          const y = centerY + Math.sin(theta) * currR;

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 4. Solid Neural Core Sphere
      const coreR = dynamicR * 0.4;
      const coreGrad = ctx.createRadialGradient(
        centerX - coreR * 0.3,
        centerY - coreR * 0.3,
        coreR * 0.1,
        centerX,
        centerY,
        coreR
      );
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.4, primaryColor);
      coreGrad.addColorStop(1, "#000000");

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [state, analyser]);

  return (
    <div className="relative w-full h-[340px] sm:h-[420px] rounded-3xl bg-black border border-zinc-900 overflow-hidden shadow-2xl flex items-center justify-center select-none group">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onClick={onToggle}
      />

      {/* Center Interactive Action Button Overlay */}
      <button
        onClick={onToggle}
        className="absolute w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700/80 hover:border-white text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 group-hover:border-zinc-500"
        title={state === "listening" ? "Stop Listening" : "Tap to Speak to AMAHAS"}
      >
        {state === "listening" && (
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-emerald-500/30 animate-ping" />
            <Mic className="w-7 h-7 text-emerald-400" />
          </div>
        )}
        {state === "processing" && (
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        )}
        {state === "speaking" && (
          <Volume2 className="w-7 h-7 text-pink-400 animate-pulse" />
        )}
        {state === "idle" && <Mic className="w-7 h-7 text-zinc-300" />}
      </button>

      {/* Bottom Status Pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-zinc-800 text-xs font-semibold flex items-center gap-2 pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            state === "listening"
              ? "bg-emerald-400 animate-ping"
              : state === "processing"
              ? "bg-sky-400 animate-spin"
              : state === "speaking"
              ? "bg-pink-400 animate-pulse"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-zinc-200">
          {state === "listening" && "Listening to Voice..."}
          {state === "processing" && "Synthesizing Neural Intent..."}
          {state === "speaking" && "AMAHAS Responding Aloud..."}
          {state === "idle" && "Tap Orb to Speak"}
        </span>
      </div>
    </div>
  );
}
