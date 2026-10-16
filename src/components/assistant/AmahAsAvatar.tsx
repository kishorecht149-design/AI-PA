"use client";

import React, { useState, useRef, useEffect } from "react";
import { AmahAsAvatarProps, AssistantState } from "./types";
import { AvatarScene } from "./AvatarScene";
import { AvatarControls } from "./AvatarControls";
import { AvatarAnimationController } from "./AvatarAnimationController";
import { AvatarSpeechController } from "./AvatarSpeechController";

export function AmahAsAvatar({
  state = "idle",
  clipOverride = null,
  size = 280,
  interactiveLookAt = true,
  showFloorShadow = true,
  showDevControls = false,
  reducedMotion = false,
  playbackSpeed = 1.0,
  className = "",
  onClick,
  onStateChange,
  onClipChange,
  onZoneClick,
}: AmahAsAvatarProps) {
  const [internalState, setInternalState] = useState<AssistantState>(state);
  const [activeClipName, setActiveClipName] = useState<string | null>(clipOverride);
  const [currentSpeed, setCurrentSpeed] = useState<number>(playbackSpeed);

  const controllerRef = useRef<AvatarAnimationController | null>(null);
  const speechRef = useRef<AvatarSpeechController | null>(null);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  useEffect(() => {
    setActiveClipName(clipOverride);
  }, [clipOverride]);

  const handleControllerReady = (
    controller: AvatarAnimationController,
    speech: AvatarSpeechController
  ) => {
    controllerRef.current = controller;
    speechRef.current = speech;
  };

  const handleStateSelect = (newState: AssistantState) => {
    setInternalState(newState);
    if (controllerRef.current) {
      controllerRef.current.transitionToState(newState, true);
    }
    if (onStateChange) onStateChange(newState);
  };

  const handleClipSelect = (clipName: string) => {
    setActiveClipName(clipName);
    if (controllerRef.current) {
      controllerRef.current.playClipByName(clipName);
    }
    if (onClipChange) onClipChange(clipName);
  };

  const handleTestSpeech = (sampleText: string) => {
    if (speechRef.current) {
      speechRef.current.startSpeaking(sampleText, () => {
        setInternalState("idle");
      });
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* 3D Character Viewport */}
      <AvatarScene
        state={internalState}
        clipOverride={activeClipName}
        size={size}
        interactiveLookAt={interactiveLookAt}
        showFloorShadow={showFloorShadow}
        playbackSpeed={currentSpeed}
        reducedMotion={reducedMotion}
        onClick={onClick}
        onStateChange={(st) => {
          setInternalState(st);
          if (onStateChange) onStateChange(st);
        }}
        onClipChange={(clip) => {
          setActiveClipName(clip);
          if (onClipChange) onClipChange(clip);
        }}
        onZoneClick={onZoneClick}
        onControllerReady={handleControllerReady}
      />

      {/* Development-Only Animation Testing & Inspection Panel */}
      {showDevControls && (
        <div className="w-full mt-3">
          <AvatarControls
            currentState={internalState}
            currentClipName={activeClipName}
            playbackSpeed={currentSpeed}
            onStateSelect={handleStateSelect}
            onClipSelect={handleClipSelect}
            onSpeedChange={setCurrentSpeed}
            onTestSpeech={handleTestSpeech}
          />
        </div>
      )}
    </div>
  );
}

export default AmahAsAvatar;
