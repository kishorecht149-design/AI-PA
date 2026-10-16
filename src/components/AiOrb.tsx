"use client";

import React, { useState, useEffect } from "react";
import { AmahAsAvatar } from "./assistant/AmahAsAvatar";
import { AssistantState } from "./assistant/types";

export type AiOrbState = "idle" | "listening" | "thinking" | "speaking";

interface AiOrbProps {
  state?: AiOrbState;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  showStatusLabel?: boolean;
}

export function AiOrb({
  state = "idle",
  size = "md",
  className = "",
  onClick,
  showStatusLabel = false,
}: AiOrbProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pxSizes = {
    sm: 34,
    md: 52,
    lg: 76,
    xl: 120,
  }[size];

  const stateThemes = {
    idle: {
      label: "Ready",
      labelColor: "text-amber-300",
    },
    listening: {
      label: "Listening...",
      labelColor: "text-rose-400",
    },
    thinking: {
      label: "Reasoning & Searching...",
      labelColor: "text-sky-300",
    },
    speaking: {
      label: "Speaking...",
      labelColor: "text-emerald-400",
    },
  }[state];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center gap-3 select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
      title={`AMAHAS 3D AI Assistant — ${stateThemes.label}`}
    >
      <div
        style={{ width: pxSizes, height: pxSizes }}
        className="relative flex items-center justify-center shrink-0"
      >
        {isMounted ? (
          <AmahAsAvatar
            state={state as AssistantState}
            size={pxSizes}
            interactiveLookAt={true}
            showFloorShadow={false}
          />
        ) : (
          <div
            style={{ width: pxSizes, height: pxSizes }}
            className="rounded-full bg-cyan-500/10 blur-md animate-pulse"
          />
        )}
      </div>

      {showStatusLabel && (
        <div className="flex flex-col leading-none">
          <span className={`text-[11px] font-bold ${stateThemes.labelColor} tracking-wide`}>
            {stateThemes.label}
          </span>
          <span className="text-[9px] text-zinc-400 font-mono mt-0.5">
            AMAHAS Assistant Core
          </span>
        </div>
      )}
    </div>
  );
}

export default AiOrb;
