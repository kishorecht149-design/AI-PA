/**
 * Web Audio API Acoustic Sound & Alarm Synthesizer.
 * Generates pure mathematical acoustic tones with zero external file dependencies.
 */

class AudioAlarmSynthesizer {
  private audioCtx: AudioContext | null = null;
  private currentAlarmOscillator: OscillatorNode | null = null;
  private isAlarmPlaying = false;
  private alarmIntervalId: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Pleasant 2-tone melodic notification chime (523Hz -> 659Hz).
   */
  playNotificationChime(volume = 0.3) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(volume * 1.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn("WebAudio chime failed:", e);
    }
  }

  /**
   * Resonant acoustic bell reminder with long decay.
   */
  playReminderBell(volume = 0.35) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fundamental = 587.33; // D5

      [1, 2.76, 5.4].forEach((harmonic, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(fundamental * harmonic, now);

        const harmVol = (volume / (idx + 1)) * 0.8;
        gain.gain.setValueAtTime(harmVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } catch (e) {
      console.warn("WebAudio reminder bell failed:", e);
    }
  }

  /**
   * Single alarm beep burst.
   */
  private playBeepBurst(freq = 880, duration = 0.12, volume = 0.4) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  /**
   * Active alarm: plays periodic multi-pulse alarm tone until stopped.
   */
  startContinuousAlarm(volume = 0.45) {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    const pulse = () => {
      if (!this.isAlarmPlaying) return;
      // Triple beep
      this.playBeepBurst(880, 0.1, volume);
      setTimeout(() => this.playBeepBurst(880, 0.1, volume), 150);
      setTimeout(() => this.playBeepBurst(988, 0.15, volume * 1.1), 300);
    };

    pulse();
    this.alarmIntervalId = setInterval(pulse, 1200);
  }

  /**
   * Stop active continuous alarm.
   */
  stopContinuousAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmIntervalId) {
      clearInterval(this.alarmIntervalId);
      this.alarmIntervalId = null;
    }
  }

  isAlarmActive(): boolean {
    return this.isAlarmPlaying;
  }
}

export const audioAlarm = new AudioAlarmSynthesizer();
