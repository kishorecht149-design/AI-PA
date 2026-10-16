import type * as ThreeType from "three";
import type { AssistantState } from "./types.ts";
import {
  ALL_ANIMATION_METAS,
  STATE_TO_CLIP_MAP,
  STATE_PRIORITY,
} from "./AvatarAnimationRegistry.ts";

export interface PlayClipOptions {
  crossfadeDuration?: number;
  speed?: number;
  loopOnce?: boolean;
  priority?: number;
}

export class AvatarAnimationController {
  private mixer: ThreeType.AnimationMixer;
  private actions: Map<string, ThreeType.AnimationAction> = new Map();
  private currentAction: ThreeType.AnimationAction | null = null;
  private currentClipName: string | null = null;
  private currentState: AssistantState = "idle";
  private persistentState: AssistantState = "idle";
  private currentPriority: number = 0;
  private playbackSpeed: number = 1.0;
  private speechAlternateIndex: number = 0;
  private isOneShotActive: boolean = false;
  private isDisposed: boolean = false;
  private THREE: typeof ThreeType;

  public onClipChange?: (clipName: string) => void;
  public onStateChange?: (state: AssistantState) => void;

  constructor(
    root: ThreeType.Object3D,
    clips: ThreeType.AnimationClip[],
    THREE: typeof ThreeType
  ) {
    this.THREE = THREE;
    this.mixer = new THREE.AnimationMixer(root);

    // Register all available clips into mixer actions
    clips.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });

    // Handle one-shot animation completion
    this.mixer.addEventListener("finished", this.handleActionFinished);
  }

  private handleActionFinished = (e: any) => {
    if (this.isDisposed) return;
    const finishedClipName = e.action?.getClip()?.name;

    // If a one-shot action completed, return smoothly to persistent state
    if (this.isOneShotActive || finishedClipName !== "Natural Idle") {
      this.isOneShotActive = false;
      this.currentPriority = STATE_PRIORITY[this.persistentState] || 10;
      this.transitionToState(this.persistentState, true);
    }
  };

  /**
   * Transition cleanly to an AI assistant semantic state
   */
  public transitionToState(state: AssistantState, force = false): boolean {
    if (this.isDisposed) return false;

    const requestedPriority = STATE_PRIORITY[state] || 10;

    // Check priority rules: do not interrupt higher-priority active one-shots unless forced
    if (this.isOneShotActive && requestedPriority < this.currentPriority && !force) {
      // Record requested state as the future persistent state to resume after one-shot finishes
      this.persistentState = state;
      return false;
    }

    const candidateClips = STATE_TO_CLIP_MAP[state] || ["Natural Idle"];
    let chosenClipName = candidateClips[0];

    // For speaking state, alternate between Speech Gesture A and B
    if (state === "speaking" && candidateClips.length > 1) {
      chosenClipName = candidateClips[this.speechAlternateIndex % candidateClips.length];
      this.speechAlternateIndex++;
    }

    // Determine if this state should be persistent (idle, listening, thinking, speaking, explaining)
    const isPersistent =
      state === "idle" ||
      state === "listening" ||
      state === "thinking" ||
      state === "speaking" ||
      state === "explaining";

    if (isPersistent) {
      this.persistentState = state;
    }

    const meta = ALL_ANIMATION_METAS.find((m) => m.name === chosenClipName);
    const isLoop = meta ? meta.isLoop : isPersistent;

    this.isOneShotActive = !isLoop;
    this.currentPriority = requestedPriority;
    this.currentState = state;

    if (this.onStateChange) {
      this.onStateChange(state);
    }

    return this.playClipByName(chosenClipName, {
      crossfadeDuration: 0.38,
      loopOnce: !isLoop,
      priority: requestedPriority,
    });
  }

  /**
   * Play an explicit clip by its name with crossfade and options
   */
  public playClipByName(clipName: string, options?: PlayClipOptions): boolean {
    if (this.isDisposed) return false;

    let targetAction = this.actions.get(clipName);

    // Fallback if specific clip is missing
    if (!targetAction) {
      console.warn(`[AvatarAnimationController] Clip '${clipName}' not found. Falling back to idle.`);
      targetAction = this.actions.get("Natural Idle") || this.actions.values().next().value;
      if (!targetAction) return false;
      clipName = targetAction.getClip().name;
    }

    // Don't re-trigger if already playing the exact same action
    if (this.currentClipName === clipName && targetAction.isRunning()) {
      return true;
    }

    const fadeDuration = options?.crossfadeDuration ?? 0.35;
    const loopOnce = options?.loopOnce ?? false;

    // Configure target action
    targetAction.reset();
    targetAction.setEffectiveTimeScale(this.playbackSpeed * (options?.speed ?? 1.0));
    targetAction.setEffectiveWeight(1.0);

    if (loopOnce) {
      targetAction.setLoop(this.THREE.LoopOnce, 1);
      targetAction.clampWhenFinished = true;
      this.isOneShotActive = true;
    } else {
      targetAction.setLoop(this.THREE.LoopRepeat, Infinity);
      targetAction.clampWhenFinished = false;
      this.isOneShotActive = false;
    }

    targetAction.play();

    // Crossfade from current action
    if (this.currentAction && this.currentAction !== targetAction) {
      this.currentAction.crossFadeTo(targetAction, fadeDuration, true);
    }

    this.currentAction = targetAction;
    this.currentClipName = clipName;

    if (this.onClipChange) {
      this.onClipChange(clipName);
    }

    return true;
  }

  /**
   * Per-frame animation mixer update
   */
  public update(deltaSeconds: number): void {
    if (this.isDisposed) return;
    this.mixer.update(deltaSeconds);
  }

  /**
   * Set playback speed multiplier (e.g. 0.5x, 1.0x, 1.5x)
   */
  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(speed, 3.0));
    this.actions.forEach((act) => {
      act.setEffectiveTimeScale(this.playbackSpeed);
    });
  }

  public getCurrentClipName(): string | null {
    return this.currentClipName;
  }

  public getCurrentState(): AssistantState {
    return this.currentState;
  }

  public getAvailableClipNames(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Clean disposal on unmount
   */
  public dispose(): void {
    this.isDisposed = true;
    this.mixer.removeEventListener("finished", this.handleActionFinished);
    this.mixer.stopAllAction();
    this.actions.clear();
    this.currentAction = null;
  }
}
