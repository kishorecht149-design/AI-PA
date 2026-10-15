"use client";

import React, { useRef, useEffect } from "react";

interface FlowVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  isRunning: boolean;
  themeColor: string;
}

export function FlowVisualizer({
  analyser,
  isPlaying,
  isRunning,
  themeColor = "#c084fc",
}: FlowVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    // Buffer for audio frequency data
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

    // Dynamic background dust particles
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 400,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Clear Canvas with deep OLED black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // 2. Fetch Audio data if playing
      let avgVolume = 0;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        avgVolume = sum / (dataArray.length * 255);
      } else if (isRunning) {
        // Idle gentle breathing amplitude
        avgVolume = 0.12 + Math.sin(phase * 1.2) * 0.05;
      }

      phase += 0.02 + avgVolume * 0.05;

      // 3. Render ambient particle stars
      particles.forEach((p) => {
        p.x = (p.x + p.vx + width) % width;
        p.y = (p.y + p.vy + height) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (0.8 + avgVolume)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // 4. Center Radiant Flow Core (Radial Glow)
      const baseRadius = Math.min(width, height) * 0.22;
      const pulseRadius = baseRadius * (1 + avgVolume * 0.45 + Math.sin(phase) * 0.04);

      const radGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        pulseRadius * 0.2,
        centerX,
        centerY,
        pulseRadius * 1.6
      );
      radGradient.addColorStop(0, `${themeColor}40`);
      radGradient.addColorStop(0.5, `${themeColor}15`);
      radGradient.addColorStop(1, "transparent");

      ctx.fillStyle = radGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 5. Harmonic Concentric Waveform Rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringRadius = pulseRadius * (0.7 + r * 0.35);
        ctx.strokeStyle = `${themeColor}${Math.floor((0.25 - r * 0.06 + avgVolume * 0.4) * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        const segments = 64;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const sampleIdx = Math.floor((s / segments) * (bufferLength / 2));
          const freqValue = dataArray[sampleIdx] ? dataArray[sampleIdx] / 255 : 0;

          const distortion =
            Math.sin(theta * 6 + phase * 2 + r) * (6 + freqValue * 18 * (r + 1));
          const currentR = ringRadius + distortion;

          const px = centerX + Math.cos(theta) * currentR;
          const py = centerY + Math.sin(theta) * currentR;

          if (s === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 6. Central Solid Neural Orb
      const orbRadius = pulseRadius * 0.38;
      const orbGrad = ctx.createRadialGradient(
        centerX - orbRadius * 0.3,
        centerY - orbRadius * 0.3,
        orbRadius * 0.1,
        centerX,
        centerY,
        orbRadius
      );
      orbGrad.addColorStop(0, "#ffffff");
      orbGrad.addColorStop(0.3, themeColor);
      orbGrad.addColorStop(1, `${themeColor}33`);

      ctx.fillStyle = orbGrad;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, isPlaying, isRunning, themeColor]);

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] rounded-3xl bg-black border border-zinc-900 overflow-hidden shadow-2xl flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
