"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/themes/theme-provider";

export type BotRigAction =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "psychokinesis"
  | "victory"
  | "defense"
  | "wave"
  | "alert"
  | "salute"
  | "scan";

export interface GuardianBot3DProps {
  action?: BotRigAction;
  edition?: "gold" | "silver" | "auto";
  auraColor?: string;
  size?: number; // size in pixels (e.g. 56, 120, 240, 260, 320, 420)
  interactiveLookAt?: boolean;
  showEnergyCore?: boolean;
  showActionBadge?: boolean;
  autonomousAI?: boolean;
  aiMood?: "auto" | "focused" | "playful" | "vigilant" | "heroic";
  className?: string;
  onClick?: () => void;
  onActionTriggered?: (action: BotRigAction) => void;
  onAiStateChange?: (stateText: string) => void;
}

// Global cached geometry singleton to prevent re-fetching the 60MB GLB model
let cachedSilverScene: any = null;
let silverGltfPromise: Promise<any> | null = null;

export function GuardianBot3D({
  action = "idle",
  edition = "auto",
  auraColor,
  size = 280,
  interactiveLookAt = true,
  showEnergyCore = true,
  showActionBadge = false,
  autonomousAI = true,
  aiMood = "auto",
  className = "",
  onClick,
  onActionTriggered,
  onAiStateChange,
}: GuardianBot3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [currentActionState, setCurrentActionState] = useState<BotRigAction>(action);
  const [aiStatusText, setAiStatusText] = useState<string>("Hovering in Psychic Equilibrium");
  const actionRef = useRef<BotRigAction>(action);
  const mousePos = useRef({ x: 0, y: 0, isHovered: false });
  const lastUserInteraction = useRef<number>(Date.now());

  // Synchronously update actionRef on every render so the RAF loop immediately sees the new action
  actionRef.current = action;

  useEffect(() => {
    setCurrentActionState(action);
    if (sceneState.current && action === "salute") {
      sceneState.current.saluteProgress = 0;
    }
    lastUserInteraction.current = Date.now();
  }, [action]);

  const themeContext = useTheme();
  const isDark = themeContext ? themeContext.theme.isDark : true;
  const resolvedEdition = edition === "auto" ? (isDark ? "silver" : "gold") : edition;
  const isGold = resolvedEdition === "gold";

  const sceneState = useRef<{
    renderer: any;
    scene: any;
    camera: any;
    botGroup: any;
    torsoGroup: any;
    coreLight: any;
    coreSprite: any;
    keyLight: any;
    rimLight: any;
    shineLight: any;
    ambientLight: any;
    materials: any[];
    reqId: number;
    clock: any;
    targetRotation: { x: number; y: number; z: number };
    currentRotation: { x: number; y: number; z: number };
    targetPosition: { x: number; y: number; z: number };
    currentPosition: { x: number; y: number; z: number };
    saluteProgress: number;
    bonesMap: Record<string, any>;
    initialBoneRotations: Record<string, { x: number; y: number; z: number }>;
    THREE: any;
  } | null>(null);

  // Autonomous AI Sentience Engine: cycles through intelligent thoughts and micro-behaviors
  useEffect(() => {
    if (!autonomousAI) return;

    const autonomousSentienceStates: Array<{
      thought: string;
      action: BotRigAction;
      durationMs: number;
    }> = [
      {
        thought: "Autonomous AI: Monitoring active project workspace & tasks",
        action: "scan",
        durationMs: 4000,
      },
      {
        thought: "Autonomous AI: Sensing psychic equilibrium across system",
        action: "idle",
        durationMs: 6000,
      },
      {
        thought: "Autonomous AI: Telepathic link attuned with Kishore",
        action: "listening",
        durationMs: 3500,
      },
      {
        thought: "Autonomous AI: Channeling psychokinesis reserve energy",
        action: "psychokinesis",
        durationMs: 3200,
      },
      {
        thought: "Autonomous AI: Ready to assist — awaiting user commands",
        action: "wave",
        durationMs: 3200,
      },
      {
        thought: "Autonomous AI: Contemplating next execution steps",
        action: "thinking",
        durationMs: 3800,
      },
    ];

    let stateIdx = 0;
    const interval = setInterval(() => {
      // Only trigger autonomous actions if user hasn't interacted for at least 7 seconds
      const timeSinceInteraction = Date.now() - lastUserInteraction.current;
      if (timeSinceInteraction > 7000 && actionRef.current === "idle") {
        const next = autonomousSentienceStates[stateIdx % autonomousSentienceStates.length];
        stateIdx++;

        setAiStatusText(next.thought);
        if (onAiStateChange) onAiStateChange(next.thought);

        if (next.action !== "idle") {
          actionRef.current = next.action;
          setCurrentActionState(next.action);
          if (onActionTriggered) onActionTriggered(next.action);

          setTimeout(() => {
            // If user still hasn't touched controls during the autonomous action, return smoothly to idle
            if (Date.now() - lastUserInteraction.current > 7000) {
              actionRef.current = "idle";
              setCurrentActionState("idle");
              if (onActionTriggered) onActionTriggered("idle");
              setAiStatusText("Autonomous AI: Hovering in Psychic Equilibrium");
              if (onAiStateChange) onAiStateChange("Autonomous AI: Hovering in Psychic Equilibrium");
            }
          }, next.durationMs);
        }
      }
    }, 9000);

    return () => clearInterval(interval);
  }, [autonomousAI, onActionTriggered, onAiStateChange]);

  // Initialize Three.js WebGL on client mount
  useEffect(() => {
    let isDisposed = false;
    let animId = 0;

    async function initWebGL() {
      if (!mountRef.current) return;
      const container = mountRef.current;

      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        const { clone: cloneSkeleton } = await import("three/examples/jsm/utils/SkeletonUtils.js");

        if (isDisposed || !container) return;

        // 1. Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(0, 0.1, 4.2);

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;

        // 2. High-End Studio HDR Environment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv).texture;
        scene.environment = envTexture;

        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 3. Lighting Rig for Silver the Hedgehog & Armor
        const ambientLight = new THREE.AmbientLight(
          isGold ? 0xfff7ed : 0xf8fafc,
          1.3
        );
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(
          isGold ? 0xfffae8 : 0xffffff,
          3.6
        );
        keyLight.position.set(3, 4, 3.5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(
          isGold ? 0xfef08a : 0xe0f2fe,
          2.0
        );
        fillLight.position.set(-3, 2, 2);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(
          isGold ? 0xf59e0b : 0x38bdf8,
          3.8
        );
        rimLight.position.set(-2, -3, -2.5);
        scene.add(rimLight);

        // Dynamic Armor Specular Gleam
        const shineLight = new THREE.PointLight(
          isGold ? 0xfff7cc : 0xffffff,
          4.0,
          10
        );
        shineLight.position.set(0, 1.5, 2.5);
        scene.add(shineLight);

        // Psychokinesis Core Light
        const coreLight = new THREE.PointLight(
          isGold ? 0xffd700 : 0x00fff5,
          3.5,
          6
        );
        coreLight.position.set(0, 0.0, 0.8);
        scene.add(coreLight);

        // Bot Groups Hierarchy
        const botGroup = new THREE.Group();
        const torsoGroup = new THREE.Group();
        botGroup.add(torsoGroup);
        scene.add(botGroup);

        // Psychokinesis ESP Energy Aura Halo
        const coreCanvas = document.createElement("canvas");
        coreCanvas.width = 256;
        coreCanvas.height = 256;
        const ctx = coreCanvas.getContext("2d")!;
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        grad.addColorStop(0.2, "rgba(0, 255, 245, 0.85)"); // Vibrant Cyan ESP aura
        grad.addColorStop(0.5, "rgba(6, 182, 212, 0.4)");
        grad.addColorStop(0.8, "rgba(14, 116, 144, 0.15)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        const coreTex = new THREE.CanvasTexture(coreCanvas);
        const coreMat = new THREE.SpriteMaterial({
          map: coreTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        });
        const coreSprite = new THREE.Sprite(coreMat);
        coreSprite.position.set(0, 0.0, -0.2);
        coreSprite.scale.set(1.4, 1.4, 1.4);
        torsoGroup.add(coreSprite);

        const clock = new THREE.Clock();
        const materials: any[] = [];
        const bonesMap: Record<string, any> = {};
        const initialBoneRotations: Record<string, { x: number; y: number; z: number }> = {};

        sceneState.current = {
          renderer,
          scene,
          camera,
          botGroup,
          torsoGroup,
          coreLight,
          coreSprite,
          keyLight,
          rimLight,
          shineLight,
          ambientLight,
          materials,
          reqId: 0,
          clock,
          targetRotation: { x: 0, y: 0, z: 0 },
          currentRotation: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 0, y: 0, z: 0 },
          currentPosition: { x: 0, y: 0, z: 0 },
          saluteProgress: 0,
          bonesMap,
          initialBoneRotations,
          THREE,
        };

        // 5. Load Silver the Hedgehog GLB Model Singleton
        if (!silverGltfPromise) {
          const loader = new GLTFLoader();
          silverGltfPromise = new Promise((resolve, reject) => {
            loader.load(
              "/assistant/silver-hedgehog.glb",
              (gltf) => {
                cachedSilverScene = gltf.scene;
                resolve(gltf.scene);
              },
              undefined,
              (err) => {
                console.error("GLTFLoader error loading Silver the Hedgehog:", err);
                silverGltfPromise = null;
                reject(err);
              }
            );
          });
        }

        const rawScene = cachedSilverScene || (await silverGltfPromise);
        if (isDisposed) return;

        // Clone using SkeletonUtils so all 135 bones and skinned meshes are properly linked
        const clone = cloneSkeleton(rawScene);

        // Center around (0, 0, 0)
        const box = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box.getCenter(center);
        clone.position.sub(center);

        // Scale to fit viewport with smart framing (portrait for compact orbs, full body for stage)
        const sizeVec = new THREE.Vector3();
        box.getSize(sizeVec);
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const isSmall = size < 90;
        const targetScale = (isSmall ? 3.9 : 2.45) / (maxDim || 1);
        clone.scale.setScalar(targetScale);
        if (isSmall) {
          clone.position.y -= 0.38;
        }

        // Index all 135 joint deform bones and store their rest transforms
        clone.traverse((child: any) => {
          if (child.isBone) {
            bonesMap[child.name] = child;
            initialBoneRotations[child.name] = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }

          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.geometry) {
              child.geometry.computeVertexNormals();
            }

            const setupMat = (mat: any) => {
              if (!mat) return;
              mat.side = THREE.DoubleSide;
              mat.envMapIntensity = 1.8;

              // Turquoise / Cyan Psychokinesis Glow (Cuff Rings & ESP markings)
              if (
                mat.name?.includes("GlowStuff") ||
                (mat.emissive && (mat.emissive.r + mat.emissive.g + mat.emissive.b) > 0.05)
              ) {
                mat.emissive = new THREE.Color(0x00fff5);
                mat.emissiveIntensity = 4.5;
                mat.roughness = 0.1;
              } else if (mat.name?.includes("Rings")) {
                // Polished Gold Cuff Rings
                mat.color = new THREE.Color(0xfbbf24);
                mat.metalness = 0.95;
                mat.roughness = 0.15;
              } else if (mat.name?.includes("shou_ruby")) {
                // Boot Ruby Crystals
                mat.color = new THREE.Color(0xf43f5e);
                mat.metalness = 0.3;
                mat.roughness = 0.1;
              } else if (mat.name?.includes("shoe_tips")) {
                // Aerodynamic Teal Hover Boot Tips
                mat.color = new THREE.Color(0x06b6d4);
                mat.metalness = 0.4;
                mat.roughness = 0.2;
              } else if (mat.name?.includes("skin")) {
                // Silver body fur (or Champagne Super Silver when isGold)
                mat.color = isGold ? new THREE.Color(0xfef08a) : new THREE.Color(0xe2e8f0);
                mat.metalness = isGold ? 0.75 : 0.25;
                mat.roughness = 0.35;
              } else if (mat.name?.includes("Fur")) {
                // Chest fur mane
                mat.roughness = 0.75;
              }

              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
                mat.map.needsUpdate = true;
              }

              materials.push(mat);
            };

            if (Array.isArray(child.material)) {
              child.material.forEach(setupMat);
            } else {
              setupMat(child.material);
            }
          }
        });

        torsoGroup.clear();
        torsoGroup.add(clone);
        if (showEnergyCore) {
          torsoGroup.add(coreSprite);
        }

        // Quill Spike Bone Names for Telekinetic Undulation
        const quillBones = [
          "DEF-spike_head_rear0101R",
          "DEF-spike_head_rear0101L",
          "DEF-spike_head_middle0101",
          "DEF-spike_head_middle0201",
          "DEF-spike_head_middle_side0101R",
          "DEF-spike_head_middle_side0101L",
          "DEF-spike_head_far0101R",
          "DEF-spike_head_far0101L",
        ];

        // 6. Animation & Kinetic Rig Actions Loop with Bone Articulation
        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const stateObj = sceneState.current!;

          // READ DIRECTLY FROM actionRef TO PREVENT STALE CLOSURES
          const activeAction = actionRef.current;

          // Target bone deltas for procedural skeletal articulation this frame
          const targetBoneDeltas: Record<string, { x: number; y: number; z: number }> = {};

          // Quill buoyant idle floating wave
          quillBones.forEach((name, i) => {
            targetBoneDeltas[name] = {
              x: Math.sin(elapsed * 2.5 + i * 0.7) * 0.08,
              y: 0,
              z: Math.cos(elapsed * 2.0 + i * 0.6) * 0.06,
            };
          });

          // === DYNAMIC RIG ACTIONS & EMOTES ENGINE ===
          switch (activeAction) {
            case "idle": {
              // Action 1: Anti-Gravity Levitation Hover
              stateObj.targetPosition.x = Math.sin(elapsed * 0.9) * 0.04;
              stateObj.targetPosition.y = Math.sin(elapsed * 1.8) * 0.1;
              stateObj.targetPosition.z = 0;

              const idleBanking = Math.sin(elapsed * 1.2) * 0.04;
              const idlePitch = Math.cos(elapsed * 1.4) * 0.03;

              if (mousePos.current.isHovered && interactiveLookAt) {
                stateObj.targetRotation.x = -mousePos.current.y * 0.35 + idlePitch;
                stateObj.targetRotation.y = mousePos.current.x * 0.55;
                stateObj.targetRotation.z = -mousePos.current.x * 0.1 + idleBanking;

                // Head looks attentively toward mouse cursor
                targetBoneDeltas["DEF-head001"] = {
                  x: -mousePos.current.y * 0.28,
                  y: mousePos.current.x * 0.42,
                  z: -mousePos.current.x * 0.08,
                };
              } else {
                stateObj.targetRotation.x = idlePitch;
                stateObj.targetRotation.y = Math.sin(elapsed * 0.7) * 0.12;
                stateObj.targetRotation.z = idleBanking;

                targetBoneDeltas["DEF-head001"] = {
                  x: Math.cos(elapsed * 1.4) * 0.05,
                  y: Math.sin(elapsed * 0.8) * 0.12,
                  z: Math.sin(elapsed * 1.0) * 0.04,
                };
              }

              // Spine breathing rhythm
              targetBoneDeltas["DEF-spine"] = {
                x: Math.sin(elapsed * 2.0) * 0.04,
                y: 0,
                z: 0,
              };
              targetBoneDeltas["DEF-chest"] = {
                x: Math.sin(elapsed * 2.0 + 0.3) * 0.05,
                y: 0,
                z: 0,
              };

              // Arms floating gently beside hips
              targetBoneDeltas["DEF-upper_arm01R"] = {
                x: 0,
                y: 0,
                z: Math.sin(elapsed * 1.5) * 0.05,
              };
              targetBoneDeltas["DEF-upper_arm01L"] = {
                x: 0,
                y: 0,
                z: -Math.sin(elapsed * 1.5) * 0.05,
              };

              // Feet hovering dangle
              targetBoneDeltas["DEF-footR"] = {
                x: 0.15 + Math.sin(elapsed * 1.8) * 0.04,
                y: 0,
                z: 0,
              };
              targetBoneDeltas["DEF-footL"] = {
                x: 0.15 + Math.cos(elapsed * 1.8) * 0.04,
                y: 0,
                z: 0,
              };

              // Silver Psychokinesis Cyan Aura Pulse
              coreLight.color.setHex(0x00fff5);
              coreSprite.material.color.setHex(0xa5f3fc);
              const pulse = Math.sin(elapsed * 2.2) * 0.1 + 1.0;
              coreSprite.scale.set(1.3 * pulse, 1.3 * pulse, 1.3 * pulse);
              coreLight.intensity = 3.5 * pulse;
              break;
            }

            case "listening": {
              // Action 2: Dramatic Attentive Forward Lean & Inquisitive Head Tilt
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = -0.12 + Math.sin(elapsed * 2.8) * 0.03;
              stateObj.targetPosition.z = 0.45; // Leans way closer towards the user

              stateObj.targetRotation.x = -0.22;
              stateObj.targetRotation.y = mousePos.current.x * 0.35;
              stateObj.targetRotation.z = 0.14;

              // Bone Articulation: Curious head tilt and attentive neck forward bow
              targetBoneDeltas["DEF-spine"] = { x: 0.18, y: 0, z: 0 };
              targetBoneDeltas["DEF-neck"] = { x: 0.12, y: 0, z: 0.1 };
              targetBoneDeltas["DEF-head001"] = {
                x: -0.12 - mousePos.current.y * 0.25,
                y: mousePos.current.x * 0.35,
                z: 0.22,
              };

              // Radiant Rose Acoustic Pulse
              coreLight.color.setHex(0xf43f5e);
              coreSprite.material.color.setHex(0xfb7185);
              const micPulse = Math.sin(elapsed * 8.0) * 0.2 + 1.2;
              coreSprite.scale.set(0.44 * micPulse, 0.44 * micPulse, 0.44 * micPulse);
              coreLight.intensity = 5.5 * micPulse;
              break;
            }

            case "thinking": {
              // Action 3: Elevated Quantum Ascend & Continuous 360 Scan Orbit
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = 0.32 + Math.sin(elapsed * 2.2) * 0.06;
              stateObj.targetPosition.z = 0;

              stateObj.currentRotation.y += 0.038;
              stateObj.targetRotation.y = stateObj.currentRotation.y;
              stateObj.targetRotation.x = Math.sin(elapsed * 2.5) * 0.1;
              stateObj.targetRotation.z = Math.sin(elapsed * 1.5) * 0.08;

              // Bone Articulation: Contemplative upward head tilt and quills flared
              targetBoneDeltas["DEF-head001"] = {
                x: 0.22,
                y: Math.sin(elapsed * 3.5) * 0.22,
                z: 0,
              };
              quillBones.forEach((name) => {
                targetBoneDeltas[name] = {
                  x: -0.2 + Math.sin(elapsed * 4.5) * 0.06,
                  y: 0,
                  z: 0,
                };
              });

              // Brilliant Quantum Blue Core Reactor
              coreLight.color.setHex(0x38bdf8);
              coreSprite.material.color.setHex(0x7dd3fc);
              const scanPulse = Math.sin(elapsed * 14.0) * 0.3 + 1.3;
              coreSprite.scale.set(0.5 * scanPulse, 0.5 * scanPulse, 0.5 * scanPulse);
              coreLight.intensity = 7.0 * scanPulse;
              shineLight.position.y = Math.sin(elapsed * 5.0) * 1.6;
              break;
            }

            case "speaking": {
              // Action 4: Speech Harmonics, Rhythmic Gestures & Rapid Nodding
              stateObj.targetPosition.x = Math.sin(elapsed * 4.0) * 0.04;
              stateObj.targetPosition.y = Math.sin(elapsed * 8.0) * 0.06;
              stateObj.targetPosition.z = 0.15;

              stateObj.targetRotation.x = -0.08;
              stateObj.targetRotation.y = Math.sin(elapsed * 3.0) * 0.15;
              stateObj.targetRotation.z = Math.sin(elapsed * 2.0) * 0.04;

              // Bone Articulation: Rhythmic head nod & conversational arm gesture
              targetBoneDeltas["DEF-head001"] = {
                x: Math.sin(elapsed * 8.5) * 0.18,
                y: Math.sin(elapsed * 4.2) * 0.12,
                z: 0,
              };
              targetBoneDeltas["DEF-neck"] = {
                x: Math.sin(elapsed * 8.5) * 0.08,
                y: 0,
                z: 0,
              };
              targetBoneDeltas["DEF-upper_arm01R"] = {
                x: -0.45 + Math.sin(elapsed * 4.0) * 0.2,
                y: 0,
                z: -0.35,
              };
              targetBoneDeltas["DEF-forearm01R"] = {
                x: 0.4 + Math.cos(elapsed * 4.0) * 0.25,
                y: 0,
                z: 0,
              };
              targetBoneDeltas["DEF-handR"] = {
                x: Math.sin(elapsed * 6.0) * 0.2,
                y: 0,
                z: 0,
              };

              // Emerald Green Voice Harmonics
              coreLight.color.setHex(0x10b981);
              coreSprite.material.color.setHex(0x6ee7b7);
              const voicePulse = Math.sin(elapsed * 16.0) * 0.25 + 1.25;
              coreSprite.scale.set(0.42 * voicePulse, 0.42 * voicePulse, 0.42 * voicePulse);
              coreLight.intensity = 5.0 * voicePulse;
              break;
            }

            case "psychokinesis": {
              // Action 5: Silver's Signature ESP Force Push & Maximum Aura Flare
              stateObj.targetPosition.x = Math.sin(elapsed * 30.0) * 0.015; // High-frequency psychic resonance jitter
              stateObj.targetPosition.y = 0.18;
              stateObj.targetPosition.z = 0.25;

              stateObj.targetRotation.x = 0.1;
              stateObj.targetRotation.y = 0;
              stateObj.targetRotation.z = 0;

              // Bone Articulation: Power stance, both arms thrust forward, hands flared open
              targetBoneDeltas["DEF-spine"] = { x: -0.2, y: 0, z: 0 };
              targetBoneDeltas["DEF-chest"] = { x: -0.15, y: 0, z: 0 };
              targetBoneDeltas["DEF-head001"] = { x: 0.14, y: 0, z: 0 };

              // Both arms extended forward projecting telekinetic energy
              targetBoneDeltas["DEF-upper_arm01R"] = { x: -0.9, y: -0.25, z: -0.7 };
              targetBoneDeltas["DEF-upper_arm01L"] = { x: -0.9, y: 0.25, z: 0.7 };
              targetBoneDeltas["DEF-forearm01R"] = { x: 0.45, y: 0, z: 0 };
              targetBoneDeltas["DEF-forearm01L"] = { x: 0.45, y: 0, z: 0 };
              targetBoneDeltas["DEF-handR"] = { x: 0.35, y: 0, z: 0.25 };
              targetBoneDeltas["DEF-handL"] = { x: 0.35, y: 0, z: -0.25 };

              // Quills swept backwards by psychic blast wave
              quillBones.forEach((name) => {
                targetBoneDeltas[name] = {
                  x: -0.35 + Math.sin(elapsed * 12.0) * 0.06,
                  y: 0,
                  z: 0,
                };
              });

              // Blazing Cyan ESP Aura at maximum brilliance
              coreLight.color.setHex(0x00fff5);
              coreSprite.material.color.setHex(0x00fff5);
              const psiPulse = Math.sin(elapsed * 24.0) * 0.3 + 1.8;
              coreSprite.scale.set(1.8 * psiPulse, 1.8 * psiPulse, 1.8 * psiPulse);
              coreLight.intensity = 14.0;
              break;
            }

            case "victory": {
              // Action 6: Double Arm Triumph Raise & Golden Super Silver Flare
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = 0.24 + Math.sin(elapsed * 5.0) * 0.07;
              stateObj.targetPosition.z = 0;

              stateObj.targetRotation.x = -0.12;
              stateObj.targetRotation.y = Math.sin(elapsed * 2.0) * 0.15;
              stateObj.targetRotation.z = 0;

              // Bone Articulation: Chin up, chest proud, both fists raised in celebration
              targetBoneDeltas["DEF-spine"] = { x: -0.15, y: 0, z: 0 };
              targetBoneDeltas["DEF-head001"] = {
                x: 0.32,
                y: 0,
                z: Math.sin(elapsed * 3.0) * 0.08,
              };
              targetBoneDeltas["DEF-upper_arm01R"] = { x: -1.3, y: 0, z: -0.9 };
              targetBoneDeltas["DEF-upper_arm01L"] = { x: -1.3, y: 0, z: 0.9 };
              targetBoneDeltas["DEF-forearm01R"] = { x: 0.6, y: 0, z: 0 };
              targetBoneDeltas["DEF-forearm01L"] = { x: 0.6, y: 0, z: 0 };

              // Radiant Golden Solar Flare
              coreLight.color.setHex(0xfbbf24);
              coreSprite.material.color.setHex(0xfef08a);
              const vicPulse = Math.sin(elapsed * 6.0) * 0.2 + 1.4;
              coreSprite.scale.set(1.6 * vicPulse, 1.6 * vicPulse, 1.6 * vicPulse);
              coreLight.intensity = 9.0;
              break;
            }

            case "defense": {
              // Action 7: Kinetic Barrier Force Field Shield Stance
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = -0.06;
              stateObj.targetPosition.z = -0.1;

              stateObj.targetRotation.x = 0.15;
              stateObj.targetRotation.y = 0.2;
              stateObj.targetRotation.z = -0.1;

              // Bone Articulation: Arms crossed over chest to block attacks
              targetBoneDeltas["DEF-spine"] = { x: 0.22, y: 0, z: 0 };
              targetBoneDeltas["DEF-head001"] = { x: -0.25, y: 0, z: 0 };
              targetBoneDeltas["DEF-upper_arm01R"] = { x: -0.55, y: 0.75, z: -0.45 };
              targetBoneDeltas["DEF-upper_arm01L"] = { x: -0.55, y: -0.75, z: 0.45 };
              targetBoneDeltas["DEF-forearm01R"] = { x: 0.65, y: 0, z: 0 };
              targetBoneDeltas["DEF-forearm01L"] = { x: 0.65, y: 0, z: 0 };

              // Violet Force Field Barrier
              coreLight.color.setHex(0xc084fc);
              coreSprite.material.color.setHex(0xe9d5ff);
              coreLight.intensity = 8.5;
              break;
            }

            case "wave": {
              // Action 8: Friendly Animated Wave & Welcoming Smile Posture
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = Math.sin(elapsed * 2.0) * 0.08;
              stateObj.targetPosition.z = 0;

              stateObj.targetRotation.x = 0;
              stateObj.targetRotation.y = 0.1;
              stateObj.targetRotation.z = -0.08;

              // Bone Articulation: Friendly head tilt, right arm raised high waving side-to-side
              targetBoneDeltas["DEF-head001"] = {
                x: -0.08,
                y: mousePos.current.x * 0.3,
                z: -0.18,
              };
              targetBoneDeltas["DEF-upper_arm01R"] = { x: -1.05, y: 0, z: -0.75 };
              targetBoneDeltas["DEF-forearm01R"] = { x: 0.45, y: 0, z: 0 };
              targetBoneDeltas["DEF-handR"] = {
                x: 0,
                y: 0,
                z: Math.sin(elapsed * 10.0) * 0.55,
              };

              // Welcoming Sky Blue Aura
              coreLight.color.setHex(0x38bdf8);
              coreSprite.material.color.setHex(0xbae6fd);
              coreLight.intensity = 5.0;
              break;
            }

            case "alert": {
              // Action 9: Saccadic Threat Scan & Vigilant Combat Posture
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = 0.08;
              stateObj.targetPosition.z = 0;

              stateObj.targetRotation.x = 0;
              stateObj.targetRotation.y = 0;
              stateObj.targetRotation.z = 0;

              // Bone Articulation: Spine rigid, head snapping left/right, quills bristling
              targetBoneDeltas["DEF-spine"] = { x: -0.12, y: 0, z: 0 };
              targetBoneDeltas["DEF-head001"] = {
                x: 0.05,
                y: Math.sin(Math.floor(elapsed * 2.8)) * 0.45,
                z: 0,
              };
              targetBoneDeltas["DEF-upper_arm01R"] = { x: -0.25, y: 0, z: -0.3 };
              targetBoneDeltas["DEF-upper_arm01L"] = { x: -0.25, y: 0, z: 0.3 };
              quillBones.forEach((name) => {
                targetBoneDeltas[name] = { x: -0.24, y: 0, z: 0 };
              });

              // Amber Warning Strobe
              coreLight.color.setHex(0xf97316);
              coreSprite.material.color.setHex(0xfed7aa);
              coreLight.intensity = 7.5;
              break;
            }

            case "salute": {
              // Action 10: Interactive 360 Corkscrew Leap Flourish
              stateObj.saluteProgress += 0.035;
              if (stateObj.saluteProgress >= 1) {
                stateObj.saluteProgress = 0;
                actionRef.current = "idle";
                setCurrentActionState("idle");
                if (onActionTriggered) onActionTriggered("idle");
              }
              const p = stateObj.saluteProgress;
              stateObj.targetPosition.y = Math.sin(p * Math.PI) * 0.48; // High leap
              stateObj.currentRotation.y += 0.28; // Rapid 360 spin
              stateObj.targetRotation.y = stateObj.currentRotation.y;
              stateObj.targetRotation.x = Math.sin(p * Math.PI * 2) * 0.22;
              stateObj.targetRotation.z = 0;

              // Bone Articulation: Tucking limbs during corkscrew spin
              targetBoneDeltas["DEF-upper_arm01R"] = {
                x: -0.8 * Math.sin(p * Math.PI),
                y: 0,
                z: -0.5,
              };
              targetBoneDeltas["DEF-upper_arm01L"] = {
                x: -0.8 * Math.sin(p * Math.PI),
                y: 0,
                z: 0.5,
              };

              // Brilliant Golden Solar Flare
              coreLight.color.setHex(0xfbbf24);
              coreSprite.material.color.setHex(0xffffff);
              coreLight.intensity = 12.0;
              break;
            }

            case "scan": {
              // Action 11: 180 Panoramic Surveillance Sweep
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = Math.sin(elapsed * 1.5) * 0.04;
              stateObj.targetPosition.z = 0;

              // Sweeps widely from -60 deg to +60 deg
              stateObj.targetRotation.x = -0.05;
              stateObj.targetRotation.y = Math.sin(elapsed * 2.2) * 1.1;
              stateObj.targetRotation.z = -Math.cos(elapsed * 2.2) * 0.15;

              // Bone Articulation: Head looks into the direction of turn
              targetBoneDeltas["DEF-head001"] = {
                x: -0.05,
                y: Math.sin(elapsed * 2.2) * 0.45,
                z: 0,
              };

              // High-tech Purple Sensor Core
              coreLight.color.setHex(0xa855f7);
              coreSprite.material.color.setHex(0xd8b4fe);
              coreLight.intensity = 5.5;
              break;
            }
          }

          // Apply procedural skeletal joint rotations with smooth spring damping
          for (const [boneName, deltas] of Object.entries(targetBoneDeltas)) {
            const bone = bonesMap[boneName];
            const init = initialBoneRotations[boneName];
            if (bone && init) {
              bone.rotation.x += (init.x + deltas.x - bone.rotation.x) * 0.16;
              bone.rotation.y += (init.y + deltas.y - bone.rotation.y) * 0.16;
              bone.rotation.z += (init.z + deltas.z - bone.rotation.z) * 0.16;
            }
          }

          // Relax un-targeted bones back to rest pose
          for (const boneName in initialBoneRotations) {
            if (!(boneName in targetBoneDeltas)) {
              const bone = bonesMap[boneName];
              const init = initialBoneRotations[boneName];
              if (bone && init) {
                bone.rotation.x += (init.x - bone.rotation.x) * 0.1;
                bone.rotation.y += (init.y - bone.rotation.y) * 0.1;
                bone.rotation.z += (init.z - bone.rotation.z) * 0.1;
              }
            }
          }

          // Responsive spring lerp damping with shortest angular difference for Y rotation
          stateObj.currentPosition.x += (stateObj.targetPosition.x - stateObj.currentPosition.x) * 0.12;
          stateObj.currentPosition.y += (stateObj.targetPosition.y - stateObj.currentPosition.y) * 0.12;
          stateObj.currentPosition.z += (stateObj.targetPosition.z - stateObj.currentPosition.z) * 0.12;

          stateObj.currentRotation.x += (stateObj.targetRotation.x - stateObj.currentRotation.x) * 0.12;
          const dy = Math.atan2(
            Math.sin(stateObj.targetRotation.y - stateObj.currentRotation.y),
            Math.cos(stateObj.targetRotation.y - stateObj.currentRotation.y)
          );
          stateObj.currentRotation.y += dy * 0.12;
          stateObj.currentRotation.z += (stateObj.targetRotation.z - stateObj.currentRotation.z) * 0.12;

          botGroup.position.set(
            stateObj.currentPosition.x,
            stateObj.currentPosition.y,
            stateObj.currentPosition.z
          );
          botGroup.rotation.set(
            stateObj.currentRotation.x,
            stateObj.currentRotation.y,
            stateObj.currentRotation.z
          );

          // Specular Sweep
          shineLight.position.x = Math.sin(elapsed * 1.5) * 2.5;
          rimLight.position.set(
            Math.cos(elapsed * 1.2) * 3.2,
            Math.sin(elapsed * 1.2) * 2.5,
            -2.0
          );

          renderer.render(scene, camera);
        };

        animate();
      } catch (err) {
        console.error("GuardianBot3D initialization failed:", err);
      }
    }

    initWebGL();

    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      if (sceneState.current) {
        sceneState.current.renderer?.dispose();
        sceneState.current.materials?.forEach((m: any) => m.dispose());
      }
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [size, isGold]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mountRef.current || !interactiveLookAt) return;
    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mousePos.current = { x: nx, y: ny, isHovered: true };
  };

  const handleMouseEnter = () => {
    mousePos.current.isHovered = true;
  };

  const handleMouseLeave = () => {
    mousePos.current.isHovered = false;
  };

  // Tactile Click Zones: Raycast to detect whether user tapped head, rings, torso, or boots
  const handleModelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    lastUserInteraction.current = Date.now();

    if (!mountRef.current || !sceneState.current) {
      triggerDirectAction("salute");
      return;
    }

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const { camera, torsoGroup, THREE } = sceneState.current;
    if (!camera || !torsoGroup || !THREE) {
      triggerDirectAction("salute");
      return;
    }

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2(x, y);
    raycaster.setFromCamera(mouseVec, camera);

    const intersects = raycaster.intersectObjects(torsoGroup.children, true);

    let triggered: BotRigAction = "salute";
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      // Raycast zone classification
      if (hitPoint.y > 0.28) {
        // Head / Quills area -> Telepathic thinking or listening
        triggered = currentActionState === "thinking" ? "listening" : "thinking";
      } else if (hitPoint.y < -0.32) {
        // Hover Boots area -> Sonic Spin Leap Flourish
        triggered = "salute";
      } else if (Math.abs(hitPoint.x) > 0.28) {
        // Gold Cuff Rings & Hands -> ESP Psychokinesis Force Push
        triggered = "psychokinesis";
      } else {
        // Torso & Chest -> Friendly Wave or Triumph
        triggered = currentActionState === "wave" ? "victory" : "wave";
      }
    } else {
      // Clicked outer psychic aura field
      triggered = "psychokinesis";
    }

    triggerDirectAction(triggered);
  };

  const triggerDirectAction = (act: BotRigAction) => {
    actionRef.current = act;
    setCurrentActionState(act);
    if (sceneState.current && act === "salute") {
      sceneState.current.saluteProgress = 0;
    }
    if (onActionTriggered) onActionTriggered(act);
    if (onClick) onClick();
  };

  const actionLabels: Record<BotRigAction, string> = {
    idle: "Psychokinesis Hover • Ready",
    listening: "Telepathic Attunement...",
    thinking: "Psychokinetic 360° Scan...",
    speaking: "Conversational Nod...",
    psychokinesis: "ESP Psychokinesis Force Push!",
    victory: "Golden Triumph Celebration!",
    defense: "Kinetic Barrier Shield Active!",
    wave: "Friendly Telepathic Wave!",
    alert: "Vigilant Perimeter Alert!",
    salute: "Sonic Spin Leap Flourish!",
    scan: "180° Telekinetic Radar Sweep...",
  };

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        style={{ width: size, height: size }}
        onClick={handleModelClick}
        className="cursor-pointer active:scale-95 transition-transform"
        title="Silver the Hedgehog — Click Head (Telepathy), Rings (Psychokinesis), Torso (Wave), or Boots (Sonic Leap)!"
      />

      {/* Optional Status & Action Badge */}
      {showActionBadge && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] text-zinc-300 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              currentActionState === "listening"
                ? "bg-rose-500 animate-ping"
                : currentActionState === "thinking"
                ? "bg-sky-400 animate-spin"
                : currentActionState === "speaking"
                ? "bg-emerald-400 animate-pulse"
                : currentActionState === "psychokinesis"
                ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#00fff5]"
                : currentActionState === "victory"
                ? "bg-yellow-400 animate-bounce"
                : currentActionState === "defense"
                ? "bg-purple-400"
                : currentActionState === "wave"
                ? "bg-sky-300 animate-pulse"
                : currentActionState === "alert"
                ? "bg-orange-500 animate-ping"
                : currentActionState === "salute"
                ? "bg-amber-400 animate-bounce"
                : currentActionState === "scan"
                ? "bg-purple-400"
                : "bg-cyan-400"
            }`}
          />
          <span className="font-semibold">{actionLabels[currentActionState]}</span>
        </div>
      )}
    </div>
  );
}

export default GuardianBot3D;
