export type AssistantState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "explaining"
  | "acknowledging"
  | "success"
  | "warning"
  | "error"
  | "goodbye"
  | "dance"
  | "power_surge";

export type AnimationCategory = "core" | "speech" | "reaction" | "original";

export interface AnimationClipMeta {
  name: string;
  label: string;
  isOriginal: boolean;
  duration: number;
  isLoop: boolean;
  category: AnimationCategory;
  description: string;
}

export interface AvatarTransformOptions {
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface BehaviorCommand {
  behavior: AssistantState;
  intensity?: number;
  durationMs?: number;
  reason?: string;
}

export interface AmahAsAvatarProps {
  state?: AssistantState;
  clipOverride?: string | null;
  size?: number | string; // e.g. 56, 120, 260, 360, "100%"
  interactiveLookAt?: boolean;
  showFloorShadow?: boolean;
  showDevControls?: boolean;
  reducedMotion?: boolean;
  playbackSpeed?: number;
  className?: string;
  onClick?: () => void;
  onStateChange?: (state: AssistantState) => void;
  onClipChange?: (clipName: string) => void;
  onZoneClick?: (zoneName: string) => void;
  onEngineReady?: (engine: any) => void;
}

