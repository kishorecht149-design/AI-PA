import { AvatarAnimationController } from "./AvatarAnimationController";

export class AvatarSpeechController {
  private animationController: AvatarAnimationController;
  private isSpeakingActive: boolean = false;
  private speechCycleTimer: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(animationController: AvatarAnimationController) {
    this.animationController = animationController;
  }

  /**
   * Begin speaking synchronization with speech synthesis or streaming audio
   */
  public startSpeaking(text?: string, onEndCallback?: () => void): void {
    this.stopSpeaking();
    this.isSpeakingActive = true;

    // Transition controller to speaking state
    this.animationController.transitionToState("speaking");

    // Alternate between speech gestures every 2.8 seconds while speaking continues
    this.speechCycleTimer = setInterval(() => {
      if (!this.isSpeakingActive) {
        clearInterval(this.speechCycleTimer);
        return;
      }
      this.animationController.transitionToState("speaking");
    }, 2800);

    // If browser speech synthesis is available and text is provided, play audio
    if (text && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.onend = () => {
        this.stopSpeaking();
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (e) => {
        console.warn("[AvatarSpeechController] Speech synthesis error:", e);
        this.stopSpeaking();
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Stop speaking and return smoothly to idle or persistent state
   */
  public stopSpeaking(): void {
    if (this.speechCycleTimer) {
      clearInterval(this.speechCycleTimer);
      this.speechCycleTimer = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    this.currentUtterance = null;

    if (this.isSpeakingActive) {
      this.isSpeakingActive = false;
      this.animationController.transitionToState("idle");
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  public dispose(): void {
    this.stopSpeaking();
  }
}
