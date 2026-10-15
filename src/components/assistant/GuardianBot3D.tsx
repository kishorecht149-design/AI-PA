"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/themes/theme-provider";

export type BotRigAction = "idle" | "listening" | "thinking" | "speaking" | "salute" | "scan";

export interface GuardianBot3DProps {
  action?: BotRigAction;
  edition?: "gold" | "silver" | "auto";
  size?: number; // size in pixels (e.g. 56, 120, 240, 320, 420)
  interactiveLookAt?: boolean;
  showEnergyCore?: boolean;
  showActionBadge?: boolean;
  className?: string;
  onClick?: () => void;
  onActionTriggered?: (action: BotRigAction) => void;
}

// Global cached geometry singleton
let cachedSilverScene: any = null;
let silverGltfPromise: Promise<any> | null = null;

export function GuardianBot3D({
  action = "idle",
  edition = "auto",
  size = 280,
  interactiveLookAt = true,
  showEnergyCore = true,
  showActionBadge = false,
  className = "",
  onClick,
  onActionTriggered,
}: GuardianBot3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [currentActionState, setCurrentActionState] = useState<BotRigAction>(action);
  const actionRef = useRef<BotRigAction>(action);
  const mousePos = useRef({ x: 0, y: 0, isHovered: false });

  // Synchronously update actionRef on every render so the RAF loop immediately sees the new action
  actionRef.current = action;

  useEffect(() => {
    setCurrentActionState(action);
    if (sceneState.current && action === "salute") {
      sceneState.current.saluteProgress = 0;
    }
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
    goldTex: any;
    silverTex: any;
    THREE: any;
  } | null>(null);

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

        // 3. Lighting Rig for Guardian Armor
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

        // Core Reactor Luminescent Light (inside chest)
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
          goldTex: null,
          silverTex: null,
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

        const clone = rawScene.clone(true);

        // Center around (0, 0, 0)
        const box = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box.getCenter(center);
        clone.position.sub(center);

        // Scale to fit viewport
        const sizeVec = new THREE.Vector3();
        box.getSize(sizeVec);
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const targetScale = 2.45 / (maxDim || 1);
        clone.scale.setScalar(targetScale);

        // Enhance and tune authentic PBR materials for Silver the Hedgehog
        clone.traverse((child: any) => {
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

        // 6. Animation & Kinetic Rig Actions Loop
        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const stateObj = sceneState.current!;

          // READ DIRECTLY FROM actionRef TO PREVENT STALE CLOSURES
          const activeAction = actionRef.current;

          // === DYNAMIC RIG ACTIONS ENGINE ===
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
              } else {
                stateObj.targetRotation.x = idlePitch;
                stateObj.targetRotation.y = Math.sin(elapsed * 0.7) * 0.12;
                stateObj.targetRotation.z = idleBanking;
              }

              // Silver Psychokinesis Cyan Aura Pulse
              coreLight.color.setHex(0x00fff5);
              coreSprite.material.color.setHex(0xa5f3fc);
              const pulse = Math.sin(elapsed * 2.2) * 0.1 + 1.0;
              coreSprite.scale.set(1.3 * pulse, 1.3 * pulse, 1.3 * pulse);
              coreLight.intensity = 3.5 * pulse;
              break;
            }

            case "listening": {
              // Action 2: Dramatic Attentive Forward Lean & Close Hover
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = -0.12 + Math.sin(elapsed * 2.8) * 0.03;
              stateObj.targetPosition.z = 0.45; // Leans way closer towards the user

              // Curious robot head tilt & forward bow
              stateObj.targetRotation.x = -0.32; // Deep forward pitch
              stateObj.targetRotation.y = mousePos.current.x * 0.35;
              stateObj.targetRotation.z = 0.18; // Side head tilt

              // Radiant Rose/Red Acoustic Pulse
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
              stateObj.targetPosition.y = 0.28 + Math.sin(elapsed * 2.2) * 0.06; // Ascends higher
              stateObj.targetPosition.z = 0;

              // Continuous 360 degree orbital rotation around Y axis
              stateObj.currentRotation.y += 0.038;
              stateObj.targetRotation.y = stateObj.currentRotation.y;
              stateObj.targetRotation.x = Math.sin(elapsed * 2.5) * 0.1;
              stateObj.targetRotation.z = Math.sin(elapsed * 1.5) * 0.08;

              // Brilliant Quantum Blue Core Reactor
              coreLight.color.setHex(0x38bdf8);
              coreSprite.material.color.setHex(0x7dd3fc);
              const scanPulse = Math.sin(elapsed * 14.0) * 0.3 + 1.3;
              coreSprite.scale.set(0.5 * scanPulse, 0.5 * scanPulse, 0.5 * scanPulse);
              coreLight.intensity = 7.0 * scanPulse;

              // Vertical laser scan beam
              shineLight.position.y = Math.sin(elapsed * 5.0) * 1.6;
              break;
            }

            case "speaking": {
              // Action 4: Speech Harmonics, Rhythmic Gestures & Rapid Nodding
              stateObj.targetPosition.x = Math.sin(elapsed * 4.0) * 0.04;
              stateObj.targetPosition.y = Math.sin(elapsed * 8.0) * 0.08;
              stateObj.targetPosition.z = 0.15;

              // Clear head nodding up and down
              stateObj.targetRotation.x = -0.12 + Math.sin(elapsed * 8.0) * 0.2;
              stateObj.targetRotation.y = Math.sin(elapsed * 4.0) * 0.25;
              stateObj.targetRotation.z = Math.sin(elapsed * 3.0) * 0.06;

              // Emerald Green Voice Harmonics
              coreLight.color.setHex(0x10b981);
              coreSprite.material.color.setHex(0x6ee7b7);
              const voicePulse = Math.sin(elapsed * 16.0) * 0.25 + 1.25;
              coreSprite.scale.set(0.42 * voicePulse, 0.42 * voicePulse, 0.42 * voicePulse);
              coreLight.intensity = 5.0 * voicePulse;
              break;
            }

            case "salute": {
              // Action 5: Interactive 360 Corkscrew Leap Flourish
              stateObj.saluteProgress += 0.035;
              if (stateObj.saluteProgress >= 1) {
                stateObj.saluteProgress = 0;
                actionRef.current = "idle";
                setCurrentActionState("idle");
                if (onActionTriggered) onActionTriggered("idle");
              }
              const p = stateObj.saluteProgress;
              stateObj.targetPosition.y = Math.sin(p * Math.PI) * 0.45; // High leap
              stateObj.currentRotation.y += 0.28; // Rapid 360 spin
              stateObj.targetRotation.y = stateObj.currentRotation.y;
              stateObj.targetRotation.x = Math.sin(p * Math.PI * 2) * 0.22;
              stateObj.targetRotation.z = 0;

              // Brilliant Golden Solar Flare
              coreLight.color.setHex(0xfbbf24);
              coreSprite.material.color.setHex(0xffffff);
              coreLight.intensity = 12.0;
              break;
            }

            case "scan": {
              // Action 6: 180 Panoramic Surveillance Sweep
              stateObj.targetPosition.x = 0;
              stateObj.targetPosition.y = Math.sin(elapsed * 1.5) * 0.04;
              stateObj.targetPosition.z = 0;

              // Sweeps widely from -60 deg to +60 deg
              stateObj.targetRotation.x = -0.05;
              stateObj.targetRotation.y = Math.sin(elapsed * 2.2) * 1.1;
              stateObj.targetRotation.z = -Math.cos(elapsed * 2.2) * 0.15; // Banks into turn

              // High-tech Purple Sensor Core
              coreLight.color.setHex(0xa855f7);
              coreSprite.material.color.setHex(0xd8b4fe);
              coreLight.intensity = 5.5;
              break;
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

  const handleTriggerSalute = () => {
    actionRef.current = "salute";
    setCurrentActionState("salute");
    if (sceneState.current) {
      sceneState.current.saluteProgress = 0;
    }
    if (onActionTriggered) onActionTriggered("salute");
    if (onClick) onClick();
  };

  const actionLabels: Record<BotRigAction, string> = {
    idle: "Psychokinesis Hover • Ready",
    listening: "Telepathic Attunement...",
    thinking: "Psychokinetic 360° Scan...",
    speaking: "Conversational Nod...",
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
        onClick={handleTriggerSalute}
        className="cursor-pointer active:scale-95 transition-transform"
        title="Silver the Hedgehog — Click for Sonic Spin Leap Flourish!"
      />

      {/* Optional Status & Action Badge */}
      {showActionBadge && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] text-zinc-300">
          <span
            className={`w-2 h-2 rounded-full ${
              currentActionState === "listening"
                ? "bg-rose-500 animate-ping"
                : currentActionState === "thinking"
                ? "bg-sky-400 animate-spin"
                : currentActionState === "speaking"
                ? "bg-emerald-400 animate-pulse"
                : currentActionState === "salute"
                ? "bg-amber-400 animate-bounce"
                : currentActionState === "scan"
                ? "bg-purple-400"
                : "bg-amber-400"
            }`}
          />
          <span className="font-semibold">{actionLabels[currentActionState]}</span>
        </div>
      )}
    </div>
  );
}

export default GuardianBot3D;
