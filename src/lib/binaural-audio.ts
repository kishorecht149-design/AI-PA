/**
 * Hardware Web Audio API Soundscape & Binaural Beats Synthesizer
 * Zero external audio dependencies. Generates pure mathematical carrier frequencies,
 * binaural detuning, and lowpass filtered brownian noise directly in the browser.
 */

export type BinauralPresetId = "gamma-40" | "beta-14" | "alpha-10" | "theta-6" | "brown-noise" | "rain";

export interface BinauralPreset {
  id: BinauralPresetId;
  name: string;
  tagline: string;
  category: "binaural" | "noise";
  carrierFreq: number; // Hz
  beatFreq: number; // Hz difference (Left vs Right ear)
  description: string;
  benefits: string[];
  themeColor: string;
}

export const BINAURAL_PRESETS: BinauralPreset[] = [
  {
    id: "gamma-40",
    name: "40 Hz Gamma Waves",
    tagline: "Peak Cognitive Processing & Synaptic Binding",
    category: "binaural",
    carrierFreq: 200,
    beatFreq: 40,
    description: "40 Hz gamma oscillations enhance cortical network synchronization, high-speed problem solving, and complex memory recall.",
    benefits: ["Complex algorithmic reasoning", "High-speed mental acuity", "Deep focus resistance to fatigue"],
    themeColor: "#c084fc", // Purple
  },
  {
    id: "beta-14",
    name: "14 Hz Low-Beta Waves",
    tagline: "Active Execution & Analytical Focus",
    category: "binaural",
    carrierFreq: 210,
    beatFreq: 14,
    description: "Low-beta state promotes alert executive function without anxiety, ideal for coding sprints, task blitzing, and paper writing.",
    benefits: ["Action-oriented momentum", "Code writing velocity", "Executive task completion"],
    themeColor: "#38bdf8", // Sky blue
  },
  {
    id: "alpha-10",
    name: "10 Hz Alpha Waves",
    tagline: "Effortless Flow & Creative Synthesis",
    category: "binaural",
    carrierFreq: 200,
    beatFreq: 10,
    description: "The classic 'flow state' frequency. Bridges conscious execution with subconscious creative problem-solving and calm clarity.",
    benefits: ["Effortless prolonged work", "System architecture ideation", "Stress reduction while reading"],
    themeColor: "#10b981", // Emerald
  },
  {
    id: "theta-6",
    name: "6 Hz Theta Waves",
    tagline: "Deep System Design & Memory Consolidation",
    category: "binaural",
    carrierFreq: 150,
    beatFreq: 6,
    description: "Deep meditative focus state. Excellent for internalizing challenging mathematical models, algorithms, and spaced repetition recall.",
    benefits: ["Spaced repetition recall", "Abstract concept mastery", "Deep strategic contemplation"],
    themeColor: "#f59e0b", // Amber
  },
  {
    id: "brown-noise",
    name: "Deep Brown Noise",
    tagline: "Sub-bass Acoustic Shield & Masking",
    category: "noise",
    carrierFreq: 0,
    beatFreq: 0,
    description: "Low-frequency weighted acoustic texture modeled after Brownian motion (-6dB/octave dropoff). Completely masks harsh ambient sounds.",
    benefits: ["Full acoustic sensory deprivation", "ADHD/distraction dampening", "Low-frequency calming resonance"],
    themeColor: "#fb7185", // Rose
  },
  {
    id: "rain",
    name: "Atmospheric Rain & Drone",
    tagline: "Multi-Pole Filtered Ambient Texture",
    category: "noise",
    carrierFreq: 0,
    beatFreq: 0,
    description: "Randomized resonant filtered noise resembling steady rain against a studio window, creating a serene mental sanctuary.",
    benefits: ["Ambient calming rhythm", "Cognitive restoration", "Natural acoustic cocoon"],
    themeColor: "#2dd4bf", // Teal
  },
];

class SoundscapeSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Binaural tone generator nodes
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private panLeft: StereoPannerNode | null = null;
  private panRight: StereoPannerNode | null = null;
  private binauralGain: GainNode | null = null;

  // Noise generator nodes
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private isPlaying = false;
  private activePresetId: BinauralPresetId = "gamma-40";
  private masterVolume = 0.5;
  private binauralVolume = 0.7;
  private noiseVolume = 0.5;

  private listeners: Set<(isPlaying: boolean, preset: BinauralPresetId) => void> = new Set();

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return this.ctx;
  }

  /**
   * Generates a 5-second looping buffer of brownian / filtered rain noise
   */
  private createNoiseBuffer(ctx: AudioContext, type: "brown" | "rain"): AudioBuffer {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let lastOutL = 0.0;
    let lastOutR = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      if (type === "brown") {
        // Brownian motion: integrate white noise with leaky integrator
        lastOutL = (lastOutL + 0.02 * whiteL) / 1.02;
        lastOutR = (lastOutR + 0.02 * whiteR) / 1.02;
        left[i] = lastOutL * 3.5;
        right[i] = lastOutR * 3.5;
      } else {
        // Rain style: soft high-cut with sporadic micro-drops
        lastOutL = (lastOutL * 0.95 + whiteL * 0.05);
        lastOutR = (lastOutR * 0.95 + whiteR * 0.05);
        const drop = Math.random() > 0.998 ? (Math.random() - 0.5) * 0.4 : 0;
        left[i] = (lastOutL + drop) * 1.8;
        right[i] = (lastOutR + drop) * 1.8;
      }
    }

    return buffer;
  }

  public async playPreset(presetId: BinauralPresetId) {
    const ctx = this.initContext();
    this.stopInternal();

    this.activePresetId = presetId;
    const preset = BINAURAL_PRESETS.find((p) => p.id === presetId) || BINAURAL_PRESETS[0];

    const now = ctx.currentTime;

    if (preset.category === "binaural") {
      // Start Binaural Oscillators
      const leftFreq = preset.carrierFreq;
      const rightFreq = preset.carrierFreq + preset.beatFreq;

      this.binauralGain = ctx.createGain();
      this.binauralGain.gain.setValueAtTime(0.001, now);
      this.binauralGain.gain.exponentialRampToValueAtTime(this.binauralVolume, now + 1.2);

      this.oscLeft = ctx.createOscillator();
      this.oscRight = ctx.createOscillator();
      this.oscLeft.type = "sine";
      this.oscRight.type = "sine";
      this.oscLeft.frequency.setValueAtTime(leftFreq, now);
      this.oscRight.frequency.setValueAtTime(rightFreq, now);

      // Pan Left to -1, Right to +1
      this.panLeft = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      this.panRight = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      if (this.panLeft && this.panRight) {
        this.panLeft.pan.setValueAtTime(-1, now);
        this.panRight.pan.setValueAtTime(1, now);
        this.oscLeft.connect(this.panLeft);
        this.oscRight.connect(this.panRight);
        this.panLeft.connect(this.binauralGain);
        this.panRight.connect(this.binauralGain);
      } else {
        // Fallback for older browsers
        this.oscLeft.connect(this.binauralGain);
        this.oscRight.connect(this.binauralGain);
      }

      this.binauralGain.connect(this.masterGain!);
      this.oscLeft.start(now);
      this.oscRight.start(now);

      // Add soft warm brown sub-bedding for rich acoustic comfort
      const noiseBuffer = this.createNoiseBuffer(ctx, "brown");
      this.noiseNode = ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = "lowpass";
      this.noiseFilter.frequency.setValueAtTime(320, now);

      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.001, now);
      this.noiseGain.gain.exponentialRampToValueAtTime(this.noiseVolume * 0.45, now + 1.5);

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain!);
      this.noiseNode.start(now);
    } else {
      // Noise Preset (Brown noise or Rain)
      const noiseBuffer = this.createNoiseBuffer(ctx, presetId === "brown-noise" ? "brown" : "rain");
      this.noiseNode = ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = "lowpass";
      this.noiseFilter.frequency.setValueAtTime(presetId === "brown-noise" ? 420 : 1200, now);

      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.001, now);
      this.noiseGain.gain.exponentialRampToValueAtTime(this.noiseVolume, now + 1.2);

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain!);
      this.noiseNode.start(now);
    }

    this.isPlaying = true;
    this.notify();
  }

  private stopInternal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    try {
      if (this.binauralGain) {
        this.binauralGain.gain.setValueAtTime(this.binauralGain.gain.value, now);
        this.binauralGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      }
      if (this.noiseGain) {
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      }

      setTimeout(() => {
        try {
          if (this.oscLeft) { this.oscLeft.stop(); this.oscLeft.disconnect(); this.oscLeft = null; }
          if (this.oscRight) { this.oscRight.stop(); this.oscRight.disconnect(); this.oscRight = null; }
          if (this.noiseNode) { this.noiseNode.stop(); this.noiseNode.disconnect(); this.noiseNode = null; }
        } catch {}
      }, 350);
    } catch {}
  }

  public stop() {
    this.stopInternal();
    this.isPlaying = false;
    this.notify();
  }

  public toggle(presetId?: BinauralPresetId) {
    const target = presetId || this.activePresetId;
    if (this.isPlaying && this.activePresetId === target) {
      this.stop();
    } else {
      this.playPreset(target);
    }
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setNoiseVolume(val: number) {
    this.noiseVolume = Math.max(0, Math.min(1, val));
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setValueAtTime(this.noiseVolume, this.ctx.currentTime);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      activePresetId: this.activePresetId,
      masterVolume: this.masterVolume,
      preset: BINAURAL_PRESETS.find((p) => p.id === this.activePresetId) || BINAURAL_PRESETS[0],
    };
  }

  public subscribe(cb: (isPlaying: boolean, preset: BinauralPresetId) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPlaying, this.activePresetId));
  }
}

export const soundscape = typeof window !== "undefined" ? new SoundscapeSynthesizer() : (null as any);
