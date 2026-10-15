/**
 * Hardware Web Speech & Neural Audio Transceiver
 * Manages live microphone frequency analysis, Web Speech recognition,
 * and high-fidelity speech synthesis.
 */

export type TransceiverState = "idle" | "listening" | "processing" | "speaking";

export interface TransceiverStatus {
  state: TransceiverState;
  transcript: string;
  interimTranscript: string;
  isMuted: boolean;
  voiceVolume: number;
}

class VoiceTransceiver {
  private recognition: any = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;

  private state: TransceiverState = "idle";
  private transcript = "";
  private interimTranscript = "";
  private isMuted = false;
  private isSupported = false;

  private listeners: Set<(status: TransceiverStatus) => void> = new Set();
  private onCommandCallback: ((command: string) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => {
          this.setState("listening");
        };

        this.recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          this.interimTranscript = interim;
          if (final) {
            this.transcript = final;
            this.interimTranscript = "";
            this.setState("processing");
            if (this.onCommandCallback) {
              this.onCommandCallback(final.trim());
            }
          }
          this.notify();
        };

        this.recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (this.state === "listening") {
            this.setState("idle");
          }
        };

        this.recognition.onend = () => {
          if (this.state === "listening") {
            this.setState("idle");
          }
        };
      }
    }
  }

  public setOnCommand(cb: (command: string) => void) {
    this.onCommandCallback = cb;
  }

  /**
   * Initializes microphone audio context for live waveform visualizer
   */
  public async initMicrophone() {
    if (typeof window === "undefined" || this.analyser) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);
    } catch (err) {
      console.warn("Could not acquire microphone stream for visualizer:", err);
    }
  }

  public async startListening() {
    if (!this.recognition) return;
    this.stopSpeaking();
    await this.initMicrophone();

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    this.transcript = "";
    this.interimTranscript = "";

    try {
      this.recognition.start();
    } catch {
      // If already started, ignore
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.setState("idle");
  }

  public toggleListening() {
    if (this.state === "listening") {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Natural Speech Synthesis (AMAHAS voice response)
   */
  public speak(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    if (this.isMuted) {
      if (onEnd) onEnd();
      return;
    }

    // Stop recognition while speaking so mic doesn't loop
    this.stopListening();
    window.speechSynthesis.cancel();

    // Clean markdown characters from text for natural speech
    const cleanSpeech = text
      .replace(/[*#`_~[\]()]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanSpeech) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a high-quality natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.name.includes("Natural") || v.name.includes("Neural")) ||
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.setState("speaking");
    };

    utterance.onend = () => {
      this.setState("idle");
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.setState("idle");
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (this.state === "speaking") {
      this.setState("idle");
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
    this.notify();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getStatus(): TransceiverStatus {
    return {
      state: this.state,
      transcript: this.transcript,
      interimTranscript: this.interimTranscript,
      isMuted: this.isMuted,
      voiceVolume: 1.0,
    };
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public subscribe(cb: (status: TransceiverStatus) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setState(newState: TransceiverState) {
    this.state = newState;
    this.notify();
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }
}

export const voiceTransceiver =
  typeof window !== "undefined" ? new VoiceTransceiver() : (null as any);
