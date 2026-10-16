import type * as ThreeType from "three";
import type { AssistantState } from "./types.ts";
import { AvatarAnimationController } from "./AvatarAnimationController.ts";

import {
  type BehaviorCommand,
  ALLOWED_AUTONOMOUS_BEHAVIORS,
  validateBehaviorCommand,
} from "./behaviorDirector.ts";

export {
  type BehaviorCommand,
  ALLOWED_AUTONOMOUS_BEHAVIORS,
  validateBehaviorCommand,
};

export class AutonomousBehaviorEngine {
  private controller: AvatarAnimationController | null = null;
  private headBone: ThreeType.Bone | null = null;
  private neckBone: ThreeType.Bone | null = null;
  private spineBone: ThreeType.Bone | null = null;

  // Layer 1 (Procedural Life) state
  private isTabVisible: boolean = true;
  private prefersReducedMotion: boolean = false;
  private idleTimer: number = 0;
  private nextGlanceInterval: number = 14.0; // Seconds until next glance
  private currentGlanceTime: number = 0;
  private glanceTargetYaw: number = 0;
  private glanceTargetPitch: number = 0;
  private restHeadQuat: { x: number; y: number; z: number; w: number } | null = null;

  // Layer 2 (Director & Event State)
  private activeTimeout: ReturnType<typeof setTimeout> | null = null;
  private typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentState: AssistantState = "idle";
  private isDisposed: boolean = false;

  public onStateChange?: (state: AssistantState) => void;

  constructor(
    controller?: AvatarAnimationController | null,
    bonesMap?: Record<string, any>
  ) {
    if (controller) {
      this.attachController(controller, bonesMap);
    }

    if (typeof window !== "undefined") {
      this.isTabVisible = !document.hidden;
      this.prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  public attachController(
    controller: AvatarAnimationController,
    bonesMap?: Record<string, any>
  ) {
    this.controller = controller;
    if (bonesMap) {
      this.headBone = bonesMap["mixamorigHead"] || null;
      this.neckBone = bonesMap["mixamorigNeck"] || null;
      this.spineBone =
        bonesMap["mixamorigSpine"] || bonesMap["mixamorigSpine1"] || null;

      if (this.headBone) {
        this.restHeadQuat = {
          x: this.headBone.quaternion.x,
          y: this.headBone.quaternion.y,
          z: this.headBone.quaternion.z,
          w: this.headBone.quaternion.w,
        };
      }
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === "undefined") return;
    this.isTabVisible = !document.hidden;
  };

  /**
   * Called every animation frame in the render loop.
   * Runs Layer 1 continuous micro-breathing, subtle glances, and tab throttling.
   */
  public update(deltaSeconds: number, elapsedTime: number, isHovered: boolean) {
    if (this.isDisposed || !this.isTabVisible || this.prefersReducedMotion) {
      return;
    }

    // When the avatar is idle and not being tracked by cursor hover,
    // apply Layer 1 natural life: micro-breathing & periodic glances
    if (this.currentState === "idle") {
      this.idleTimer += deltaSeconds;

      // 1. Organic micro-breathing cycle (subtle pitch sway on spine/neck)
      if (this.spineBone) {
        const breathingOffset = Math.sin(elapsedTime * 1.6) * 0.012;
        this.spineBone.rotation.x += (breathingOffset - this.spineBone.rotation.x) * 0.08;
      }

      // 2. Periodic natural alive glance (looking around naturally)
      if (!isHovered && this.headBone) {
        if (this.idleTimer >= this.nextGlanceInterval) {
          // Trigger a subtle glance
          this.currentGlanceTime = 2.4;
          this.glanceTargetYaw = (Math.random() - 0.5) * 0.22;
          this.glanceTargetPitch = (Math.random() - 0.4) * 0.12;
          this.idleTimer = 0;
          this.nextGlanceInterval = 14 + Math.random() * 12; // 14 to 26 seconds
        }

        if (this.currentGlanceTime > 0) {
          this.currentGlanceTime -= deltaSeconds;
          // Smooth ease toward glance target
          this.headBone.rotation.y +=
            (this.glanceTargetYaw - this.headBone.rotation.y) * 0.06;
          this.headBone.rotation.x +=
            (this.glanceTargetPitch - this.headBone.rotation.x) * 0.06;

          if (this.neckBone) {
            this.neckBone.rotation.y +=
              (this.glanceTargetYaw * 0.4 - this.neckBone.rotation.y) * 0.05;
          }
        } else {
          // Smooth return to center
          this.headBone.rotation.y += (0 - this.headBone.rotation.y) * 0.08;
          this.headBone.rotation.x += (0 - this.headBone.rotation.x) * 0.08;
          if (this.neckBone) {
            this.neckBone.rotation.y += (0 - this.neckBone.rotation.y) * 0.06;
          }
        }
      }
    } else {
      this.idleTimer = 0;
    }
  }

  // ==========================================
  // LAYER 2: EVENT-DRIVEN DIRECTOR METHODS
  // ==========================================

  /**
   * User is typing in the input box.
   * Avatar enters listening state (attentive posture, alert head tilt).
   */
  public onUserTyping() {
    if (this.isDisposed) return;
    if (this.currentState === "speaking" || this.currentState === "thinking") {
      return;
    }

    this.transitionState("listening");

    // Debounce return to idle if typing stops for 3.5 seconds
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.typingDebounceTimer = setTimeout(() => {
      if (this.currentState === "listening") {
        this.transitionState("idle");
      }
    }, 3500);
  }

  /**
   * User activated or released the voice microphone.
   */
  public onUserVoiceActive(isActive: boolean) {
    if (this.isDisposed) return;
    if (isActive) {
      if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
      this.transitionState("listening");
    } else {
      // Remain listening briefly awaiting speech transcription
      if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
      this.typingDebounceTimer = setTimeout(() => {
        if (this.currentState === "listening") {
          this.transitionState("idle");
        }
      }, 3000);
    }
  }

  /**
   * Request sent to AI backend / OpenRouter.
   * Avatar immediately transitions to thinking state.
   */
  public onRequestSent() {
    if (this.isDisposed) return;
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.transitionState("thinking");
  }

  /**
   * Incoming stream or assistant response arrived.
   * Evaluates structured behavior command or falls back to semantic heuristics.
   */
  public onResponseReceived(params: {
    content?: string;
    command?: any;
    isError?: boolean;
    isSuccess?: boolean;
    isAudioPlaying?: boolean;
    userPrompt?: string;
  }) {
    if (this.isDisposed) return;
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);

    // 1. Check for explicit dance request by the user
    const promptLower = (params.userPrompt || "").toLowerCase();
    const isExplicitDancePrompt =
      /\b(dance for me|do a dance|show me a dance|please dance|breakdance)\b/i.test(
        promptLower
      );

    // 2. If a structured director command is provided, validate & execute it
    if (params.command) {
      const validated = validateBehaviorCommand(params.command, isExplicitDancePrompt);
      this.executeDirectorCommand(validated);
      return;
    }

    // 3. Fallback Heuristics from content & flags
    if (params.isError) {
      this.executeDirectorCommand({
        behavior: "warning",
        intensity: 0.7,
        durationMs: 3500,
        reason: "Error encountered",
      });
      return;
    }

    if (isExplicitDancePrompt) {
      this.executeDirectorCommand({
        behavior: "dance",
        intensity: 1.0,
        durationMs: 4500,
        reason: "User explicitly requested a dance flourish",
      });
      return;
    }

    const text = (params.content || "").toLowerCase();

    // Check for task completion / success
    if (
      params.isSuccess ||
      /\b(completed|all set|done|fixed|success|finished successfully|great job|accomplished)\b/i.test(
        text
      )
    ) {
      this.executeDirectorCommand({
        behavior: "success",
        intensity: 0.85,
        durationMs: 3400,
        reason: "Task completed successfully",
      });
      return;
    }

    // Check for farewell / goodbye
    if (/\b(goodbye|see you later|farewell|take care|have a great day|have a good night)\b/i.test(text)) {
      this.executeDirectorCommand({
        behavior: "goodbye",
        intensity: 0.8,
        durationMs: 3000,
        reason: "Farewell",
      });
      return;
    }

    // Check for technical tutorial / explanatory response
    if (
      text.includes("```") ||
      /\b(here is how|for example|step 1|architecture|diagram|let's explain|in summary)\b/i.test(
        text
      )
    ) {
      this.executeDirectorCommand({
        behavior: "explaining",
        intensity: 0.8,
        durationMs: 4000,
        reason: "Technical explanation",
      });
      return;
    }

    // Default conversational reply
    const speakDuration = params.isAudioPlaying ? 5000 : 3200;
    this.executeDirectorCommand({
      behavior: "speaking",
      intensity: 0.75,
      durationMs: speakDuration,
      reason: "Conversational answer",
    });
  }

  /**
   * Executes a validated director command, holding the state for command.durationMs
   * before cleanly returning to idle.
   */
  public executeDirectorCommand(cmd: BehaviorCommand) {
    if (this.isDisposed) return;
    if (this.activeTimeout) clearTimeout(this.activeTimeout);

    this.transitionState(cmd.behavior);

    // Schedule return to idle
    this.activeTimeout = setTimeout(() => {
      this.transitionState("idle");
    }, cmd.durationMs);
  }

  /**
   * Internal transition helper.
   */
  private transitionState(newState: AssistantState) {
    this.currentState = newState;
    if (this.controller) {
      this.controller.transitionToState(newState);
    }
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  public resetToIdle() {
    if (this.activeTimeout) clearTimeout(this.activeTimeout);
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);
    this.transitionState("idle");
  }

  public isSuspended(): boolean {
    return !this.isTabVisible;
  }

  public getCurrentState(): AssistantState {
    return this.currentState;
  }

  public dispose() {
    this.isDisposed = true;
    if (this.activeTimeout) clearTimeout(this.activeTimeout);
    if (this.typingDebounceTimer) clearTimeout(this.typingDebounceTimer);

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.controller = null;
    this.headBone = null;
    this.neckBone = null;
    this.spineBone = null;
  }
}
