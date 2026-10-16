import type * as ThreeType from "three";
import { AnimationClipMeta, AssistantState } from "./types";

// ==========================================
// 1. ORIGINAL 6 RIGGED ANIMATIONS IN GLB
// ==========================================
export const ORIGINAL_ANIMATION_METAS: AnimationClipMeta[] = [
  {
    name: "Celebration",
    label: "Celebration",
    isOriginal: true,
    duration: 4.0,
    isLoop: false,
    category: "original",
    description: "Original rigged celebratory triumph with enthusiastic arm wave and bounce.",
  },
  {
    name: "Crying",
    label: "Distress / Error",
    isOriginal: true,
    duration: 4.83,
    isLoop: false,
    category: "original",
    description: "Original distress gesture suitable for errors or operation failures.",
  },
  {
    name: "Dance",
    label: "Rhythmic Dance",
    isOriginal: true,
    duration: 1.0,
    isLoop: true,
    category: "original",
    description: "Original rhythmic upbeat body sway flourish.",
  },
  {
    name: "Monster Transformation",
    label: "Power Surge",
    isOriginal: true,
    duration: 2.23,
    isLoop: false,
    category: "original",
    description: "Original dynamic power surge and quantum focus activation.",
  },
  {
    name: "Surprise",
    label: "Alert / Surprise",
    isOriginal: true,
    duration: 2.47,
    isLoop: false,
    category: "original",
    description: "Original startled alert gesture with hands raised in discovery.",
  },
  {
    name: "Yes",
    label: "Affirmation (Yes)",
    isOriginal: true,
    duration: 2.5,
    isLoop: false,
    category: "original",
    description: "Original affirmative nod and agreement gesture.",
  },
];

// ==========================================
// 2. EXPANDED 12 RIGGED ANIMATIONS
// ==========================================
export const EXPANDED_ANIMATION_METAS: AnimationClipMeta[] = [
  {
    name: "Natural Idle",
    label: "Natural Idle",
    isOriginal: false,
    duration: 3.6,
    isLoop: true,
    category: "core",
    description: "Relaxed breathing cycle across spine, gentle weight shift on hips, and natural head movement.",
  },
  {
    name: "Welcome / Greeting",
    label: "Welcome / Greeting",
    isOriginal: false,
    duration: 2.8,
    isLoop: false,
    category: "reaction",
    description: "Warm friendly greeting: right arm raises with an inviting 3-cycle hand wave and polite welcome nod.",
  },
  {
    name: "Listening Attentively",
    label: "Listening Attentively",
    isOriginal: false,
    duration: 3.0,
    isLoop: true,
    category: "core",
    description: "Attentive forward posture, inquisitive head tilt, and subtle periodic affirmation nods.",
  },
  {
    name: "Deep Thinking",
    label: "Deep Thinking",
    isOriginal: false,
    duration: 3.2,
    isLoop: true,
    category: "core",
    description: "Contemplative upward head movement and thoughtful hand gesture near chin/chest.",
  },
  {
    name: "Speaking Gesture A",
    label: "Speaking Gesture A",
    isOriginal: false,
    duration: 2.4,
    isLoop: true,
    category: "speech",
    description: "Conversational right-hand explanatory gesture with rhythmic head nodding in cadence.",
  },
  {
    name: "Speaking Gesture B",
    label: "Speaking Gesture B",
    isOriginal: false,
    duration: 2.6,
    isLoop: true,
    category: "speech",
    description: "Alternate two-handed open conversational gesture preventing monotonous repetition.",
  },
  {
    name: "Understanding / Acknowledgement",
    label: "Acknowledgement",
    isOriginal: false,
    duration: 1.8,
    isLoop: false,
    category: "reaction",
    description: "Distinct affirmative double-nod with reassuring open-hand agreement gesture.",
  },
  {
    name: "Confused / Clarification",
    label: "Clarification Prompt",
    isOriginal: false,
    duration: 2.4,
    isLoop: false,
    category: "reaction",
    description: "Questioning head tilt and two-handed open-palm questioning gesture requesting user clarification.",
  },
  {
    name: "Success / Completion",
    label: "Task Success",
    isOriginal: false,
    duration: 2.6,
    isLoop: false,
    category: "reaction",
    description: "Energetic celebratory fist pump with proud chest arch and confident chin rise.",
  },
  {
    name: "Warning / Caution",
    label: "Warning / Caution",
    isOriginal: false,
    duration: 2.6,
    isLoop: false,
    category: "reaction",
    description: "Controlled serious caution gesture with forward open palm and steady direct gaze.",
  },
  {
    name: "Explaining / Teaching",
    label: "Engineering Tutorial",
    isOriginal: false,
    duration: 3.6,
    isLoop: true,
    category: "speech",
    description: "Broad explanatory presentation sweep designed for technical walkthroughs, diagrams, and code.",
  },
  {
    name: "Goodbye / Session End",
    label: "Farewell / Goodbye",
    isOriginal: false,
    duration: 2.6,
    isLoop: false,
    category: "reaction",
    description: "Polite respectful torso bow and gentle parting farewell wave.",
  },
];

export const ALL_ANIMATION_METAS: AnimationClipMeta[] = [
  ...ORIGINAL_ANIMATION_METAS,
  ...EXPANDED_ANIMATION_METAS,
];

// ==========================================
// 3. SEMANTIC STATE TO ANIMATION CLIP MAPPING
// ==========================================
export const STATE_TO_CLIP_MAP: Record<AssistantState, string[]> = {
  idle: ["Natural Idle"],
  greeting: ["Welcome / Greeting"],
  listening: ["Listening Attentively"],
  thinking: ["Deep Thinking"],
  speaking: ["Speaking Gesture A", "Speaking Gesture B"],
  explaining: ["Explaining / Teaching"],
  acknowledging: ["Understanding / Acknowledgement", "Yes"],
  success: ["Success / Completion", "Celebration"],
  warning: ["Warning / Caution", "Surprise"],
  error: ["Crying"],
  goodbye: ["Goodbye / Session End"],
  dance: ["Dance"],
  power_surge: ["Monster Transformation"],
};

export const STATE_PRIORITY: Record<AssistantState, number> = {
  error: 100,
  warning: 90,
  success: 85,
  goodbye: 80,
  greeting: 75,
  power_surge: 70,
  dance: 65,
  acknowledging: 55,
  explaining: 45,
  speaking: 40,
  thinking: 30,
  listening: 25,
  idle: 10,
};

// ==========================================
// 4. SYNTHETIC RIGGED CLIP GENERATOR
// ==========================================
export function generateExpandedClips(
  bonesMap: Record<string, any>,
  THREE: typeof ThreeType
): ThreeType.AnimationClip[] {
  const restQuats: Record<string, ThreeType.Quaternion> = {};
  for (const name in bonesMap) {
    restQuats[name] = bonesMap[name].quaternion.clone();
  }

  function makeClip(
    name: string,
    duration: number,
    fps: number,
    poseFn: (normT: number, t: number) => Record<string, [number, number, number]>
  ): ThreeType.AnimationClip {
    const frameCount = Math.max(2, Math.floor(duration * fps) + 1);
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      times[i] = (i / (frameCount - 1)) * duration;
    }

    const boneTracks: Record<string, Float32Array> = {};

    for (let i = 0; i < frameCount; i++) {
      const t = times[i];
      const normT = t / duration;
      const poseRotations = poseFn(normT, t);

      for (const bName in poseRotations) {
        if (!restQuats[bName]) continue;
        if (!boneTracks[bName]) {
          boneTracks[bName] = new Float32Array(frameCount * 4);
        }

        const [rx, ry, rz] = poseRotations[bName];
        const qDelta = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rx, ry, rz, "XYZ")
        );
        const qFinal = restQuats[bName].clone().multiply(qDelta).normalize();

        boneTracks[bName][i * 4 + 0] = qFinal.x;
        boneTracks[bName][i * 4 + 1] = qFinal.y;
        boneTracks[bName][i * 4 + 2] = qFinal.z;
        boneTracks[bName][i * 4 + 3] = qFinal.w;
      }
    }

    const tracks: ThreeType.KeyframeTrack[] = [];
    for (const bName in boneTracks) {
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${bName}.quaternion`,
          times,
          boneTracks[bName]
        )
      );
    }

    return new THREE.AnimationClip(name, duration, tracks);
  }

  // Smooth sinusoidal oscillation helper
  const sinWave = (normT: number, freq = 1, phase = 0) =>
    Math.sin(normT * Math.PI * 2 * freq + phase);

  // Smooth bell curve envelope helper (0 at start, 1 in middle, 0 at end)
  const bellEnvelope = (normT: number) => Math.sin(normT * Math.PI);

  const clips: ThreeType.AnimationClip[] = [];

  // 1. Natural Idle (3.6s, looping)
  clips.push(
    makeClip("Natural Idle", 3.6, 24, (normT) => {
      const p = normT * Math.PI * 2;
      return {
        mixamorigSpine: [Math.sin(p) * 0.02, 0, Math.cos(p) * 0.01],
        mixamorigSpine1: [Math.sin(p + 0.3) * 0.025, 0, 0],
        mixamorigSpine2: [Math.sin(p + 0.6) * 0.03, 0, 0],
        mixamorigNeck: [Math.sin(p) * 0.015, Math.cos(p * 0.5) * 0.03, 0],
        mixamorigHead: [
          Math.sin(p) * 0.025,
          Math.cos(p * 0.5) * 0.045,
          Math.sin(p * 0.5) * 0.02,
        ],
        mixamorigLeftArm: [0, 0, Math.sin(p) * 0.015],
        mixamorigRightArm: [0, 0, -Math.sin(p) * 0.015],
        mixamorigLeftForeArm: [Math.sin(p) * 0.02, 0, 0],
        mixamorigRightForeArm: [Math.sin(p) * 0.02, 0, 0],
      };
    })
  );

  // 2. Welcome / Greeting (2.8s, one-shot)
  clips.push(
    makeClip("Welcome / Greeting", 2.8, 30, (normT) => {
      const env = bellEnvelope(normT);
      const wave = Math.sin(normT * Math.PI * 7) * env;
      return {
        mixamorigSpine1: [0, 0, -0.04 * env],
        mixamorigNeck: [-0.04 * env, 0, -0.06 * env],
        mixamorigHead: [0.08 * env, 0.05 * env, -0.08 * env],
        mixamorigRightShoulder: [0, 0, -0.15 * env],
        mixamorigRightArm: [-0.5 * env, -0.2 * env, -0.85 * env],
        mixamorigRightForeArm: [0.6 * env, 0, 0.3 * env],
        mixamorigRightHand: [0, 0, 0.45 * wave],
      };
    })
  );

  // 3. Listening Attentively (3.0s, looping)
  clips.push(
    makeClip("Listening Attentively", 3.0, 24, (normT) => {
      const nod = Math.sin(normT * Math.PI * 4) * 0.04;
      return {
        mixamorigSpine: [0.05, 0, 0],
        mixamorigSpine1: [0.05, 0, 0],
        mixamorigSpine2: [0.06, 0, 0],
        mixamorigNeck: [0.06 + nod, 0, 0.12],
        mixamorigHead: [-0.04 + nod * 1.5, 0.06, 0.14],
        mixamorigLeftArm: [0.08, 0, 0.04],
        mixamorigRightArm: [0.08, 0, -0.04],
      };
    })
  );

  // 4. Deep Thinking (3.2s, looping)
  clips.push(
    makeClip("Deep Thinking", 3.2, 24, (normT) => {
      const drift = sinWave(normT, 1) * 0.03;
      return {
        mixamorigSpine1: [0.02, 0, 0],
        mixamorigSpine2: [0.04, 0, 0],
        mixamorigNeck: [-0.08, 0.15 + drift, 0.06],
        mixamorigHead: [-0.15, 0.2 + drift, 0.08],
        mixamorigRightArm: [-0.6, 0.2, -0.5],
        mixamorigRightForeArm: [0.9, 0, 0.4],
        mixamorigRightHand: [0.2, 0.1, 0.1],
        mixamorigLeftArm: [0.05, 0, 0.02],
      };
    })
  );

  // 5. Speaking Gesture A (2.4s, speech looping)
  clips.push(
    makeClip("Speaking Gesture A", 2.4, 30, (normT) => {
      const cadence = Math.sin(normT * Math.PI * 4);
      const nod = Math.sin(normT * Math.PI * 4) * 0.06;
      return {
        mixamorigSpine1: [0.02 * cadence, 0, 0],
        mixamorigNeck: [0.03 + nod * 0.5, 0, 0],
        mixamorigHead: [nod, Math.sin(normT * Math.PI * 2) * 0.04, 0],
        mixamorigRightArm: [-0.35 + cadence * 0.1, 0, -0.4],
        mixamorigRightForeArm: [0.55 + cadence * 0.15, 0, 0],
        mixamorigRightHand: [0.15 * cadence, 0, 0.1],
        mixamorigLeftArm: [0, 0, 0.02],
      };
    })
  );

  // 6. Speaking Gesture B (2.6s, speech looping)
  clips.push(
    makeClip("Speaking Gesture B", 2.6, 30, (normT) => {
      const cadence = Math.sin(normT * Math.PI * 3);
      const nod = Math.cos(normT * Math.PI * 3) * 0.05;
      return {
        mixamorigSpine2: [0.03, 0, cadence * 0.02],
        mixamorigNeck: [nod * 0.5, cadence * 0.04, -0.04],
        mixamorigHead: [nod, cadence * 0.06, -0.06],
        mixamorigRightArm: [-0.25 + cadence * 0.08, -0.1, -0.35],
        mixamorigRightForeArm: [0.45 + cadence * 0.1, 0, 0],
        mixamorigLeftArm: [-0.2 + cadence * 0.08, 0.1, 0.35],
        mixamorigLeftForeArm: [0.4 + cadence * 0.1, 0, 0],
      };
    })
  );

  // 7. Understanding / Acknowledgement (1.8s, one-shot)
  clips.push(
    makeClip("Understanding / Acknowledgement", 1.8, 30, (normT) => {
      const env = bellEnvelope(normT);
      const doubleNod = Math.sin(normT * Math.PI * 4) * env * 0.18;
      return {
        mixamorigSpine1: [0.03 * env, 0, 0],
        mixamorigNeck: [0.08 * env + doubleNod * 0.6, 0, 0],
        mixamorigHead: [doubleNod, 0, 0],
        mixamorigRightArm: [-0.25 * env, 0, -0.2 * env],
        mixamorigRightForeArm: [0.35 * env, 0, 0],
        mixamorigRightHand: [0.15 * env, 0, 0],
      };
    })
  );

  // 8. Confused / Clarification (2.4s, one-shot)
  clips.push(
    makeClip("Confused / Clarification", 2.4, 30, (normT) => {
      const env = bellEnvelope(normT);
      return {
        mixamorigSpine1: [0, 0, 0.03 * env],
        mixamorigNeck: [0, -0.1 * env, 0.18 * env],
        mixamorigHead: [-0.05 * env, -0.15 * env, 0.22 * env],
        mixamorigRightArm: [-0.2 * env, -0.15 * env, -0.35 * env],
        mixamorigRightForeArm: [0.5 * env, 0, 0.2 * env],
        mixamorigRightHand: [0, 0.2 * env, 0],
        mixamorigLeftArm: [-0.2 * env, 0.15 * env, 0.35 * env],
        mixamorigLeftForeArm: [0.5 * env, 0, -0.2 * env],
        mixamorigLeftHand: [0, -0.2 * env, 0],
      };
    })
  );

  // 9. Success / Completion (2.6s, one-shot)
  clips.push(
    makeClip("Success / Completion", 2.6, 30, (normT) => {
      const env = bellEnvelope(normT);
      const pump = Math.sin(normT * Math.PI * 3) * env;
      return {
        mixamorigSpine: [-0.06 * env, 0, 0],
        mixamorigSpine1: [-0.08 * env, 0, 0],
        mixamorigSpine2: [-0.1 * env, 0, 0],
        mixamorigNeck: [-0.12 * env, 0, 0],
        mixamorigHead: [-0.2 * env, 0, 0],
        mixamorigRightShoulder: [0, 0, -0.2 * env],
        mixamorigRightArm: [-0.7 * env + pump * 0.15, 0, -0.6 * env],
        mixamorigRightForeArm: [1.1 * env + pump * 0.2, 0, 0.2 * env],
        mixamorigRightHand: [0.3 * env, 0, 0],
      };
    })
  );

  // 10. Warning / Caution (2.6s, one-shot)
  clips.push(
    makeClip("Warning / Caution", 2.6, 30, (normT) => {
      const env = bellEnvelope(normT);
      return {
        mixamorigSpine: [0.04 * env, 0, 0],
        mixamorigNeck: [0.06 * env, 0, 0],
        mixamorigHead: [0.08 * env, 0, 0],
        mixamorigRightArm: [-0.55 * env, 0, -0.3 * env],
        mixamorigRightForeArm: [0.4 * env, 0, 0],
        mixamorigRightHand: [-0.35 * env, 0, 0],
      };
    })
  );

  // 11. Explaining / Teaching (3.6s, looping)
  clips.push(
    makeClip("Explaining / Teaching", 3.6, 24, (normT) => {
      const sweep = Math.sin(normT * Math.PI * 2);
      return {
        mixamorigSpine1: [0, sweep * 0.08, 0],
        mixamorigSpine2: [0, sweep * 0.12, 0],
        mixamorigNeck: [0, sweep * 0.15, 0],
        mixamorigHead: [0, sweep * 0.2, 0],
        mixamorigRightArm: [-0.4, sweep * 0.35, -0.45],
        mixamorigRightForeArm: [0.65, 0, 0.15],
        mixamorigRightHand: [0.1, 0, sweep * 0.15],
        mixamorigLeftArm: [-0.1, 0, 0.15],
      };
    })
  );

  // 12. Goodbye / Session End (2.6s, one-shot)
  clips.push(
    makeClip("Goodbye / Session End", 2.6, 30, (normT) => {
      const env = bellEnvelope(normT);
      const wave = Math.sin(normT * Math.PI * 4) * env;
      return {
        mixamorigSpine: [0.08 * env, 0, 0],
        mixamorigNeck: [0.12 * env, 0, 0],
        mixamorigHead: [0.15 * env, 0, 0],
        mixamorigRightArm: [-0.45 * env, 0, -0.6 * env],
        mixamorigRightForeArm: [0.65 * env, 0, 0.2 * env],
        mixamorigRightHand: [0, 0, 0.35 * wave],
      };
    })
  );

  return clips;
}
