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

// Global cached geometry and textures singleton
let cachedBotScene: any = null;
let botGltfPromise: Promise<any> | null = null;
let cachedBotGoldTexture: any = null;
let cachedBotSilverTexture: any = null;

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
  const [currentAction, setCurrentAction] = useState<BotRigAction>(action);
  const mousePos = useRef({ x: 0, y: 0, isHovered: false });

  // Sync external action prop
  useEffect(() => {
    setCurrentAction(action);
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
    saluteProgress: number; // 0 to 1
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
        const coreLight = new THREE.PointLight(
          isGold ? 0xf59e0b : 0x00e5ff,
          3.0,
          4
        );
        coreLight.position.set(0, 0.25, 0.5);
        scene.add(coreLight);

        // Bot Groups Hierarchy (enables multi-axis rig actions)
        const botGroup = new THREE.Group();
        const torsoGroup = new THREE.Group();
        botGroup.add(torsoGroup);
        scene.add(botGroup);

        // Glowing Chest Reactor Sprite
        const coreCanvas = document.createElement("canvas");
        coreCanvas.width = 128;
        coreCanvas.height = 128;
        const ctx = coreCanvas.getContext("2d")!;
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, isGold ? "rgba(254, 240, 138, 0.95)" : "rgba(56, 189, 248, 0.95)");
        grad.addColorStop(0.5, isGold ? "rgba(245, 158, 11, 0.5)" : "rgba(2, 132, 199, 0.5)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        const coreTex = new THREE.CanvasTexture(coreCanvas);
        const coreMat = new THREE.SpriteMaterial({
          map: coreTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        });
        const coreSprite = new THREE.Sprite(coreMat);
        coreSprite.position.set(0, 0.25, 0.6);
        coreSprite.scale.set(0.35, 0.35, 0.35);
        torsoGroup.add(coreSprite);

        // 4. Textures
        const textureLoader = new THREE.TextureLoader();
        if (!cachedBotGoldTexture) {
          cachedBotGoldTexture = textureLoader.load("/assistant/bot-gold-texture.jpg");
          cachedBotGoldTexture.colorSpace = THREE.SRGBColorSpace;
          cachedBotGoldTexture.flipY = false;
        }
        if (!cachedBotSilverTexture) {
          cachedBotSilverTexture = textureLoader.load("/assistant/bot-silver-texture.jpg");
          cachedBotSilverTexture.colorSpace = THREE.SRGBColorSpace;
          cachedBotSilverTexture.flipY = false;
        }

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
          goldTex: cachedBotGoldTexture,
          silverTex: cachedBotSilverTexture,
          THREE,
        };

        // 5. Load GLB Model Singleton
        if (!botGltfPromise) {
          const loader = new GLTFLoader();
          botGltfPromise = new Promise((resolve, reject) => {
            loader.load(
              "/assistant/guardian-bot.glb",
              (gltf) => {
                cachedBotScene = gltf.scene;
                resolve(gltf.scene);
              },
              undefined,
              (err) => {
                console.error("GLTFLoader error loading bot:", err);
                botGltfPromise = null;
                reject(err);
              }
            );
          });
        }

        const rawScene = cachedBotScene || (await botGltfPromise);
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
        const targetScale = 2.4 / (maxDim || 1);
        clone.scale.setScalar(targetScale);

        // PBR Armor Material
        clone.traverse((child: any) => {
          if (child.isMesh) {
            if (child.geometry) {
              child.geometry.computeVertexNormals();
            }

            const activeTexture = isGold ? cachedBotGoldTexture : cachedBotSilverTexture;

            const mat = new THREE.MeshPhysicalMaterial({
              map: activeTexture,
              color: new THREE.Color(0xffffff),
              metalness: 0.94,
              roughness: 0.15,
              clearcoat: 0.85,
              clearcoatRoughness: 0.05,
              reflectivity: 1.0,
              ior: 1.52,
              side: THREE.DoubleSide,
              envMapIntensity: 2.0,
            });

            child.material = mat;
            child.castShadow = true;
            child.receiveShadow = true;
            materials.push(mat);
          }
        });

        torsoGroup.clear();
        torsoGroup.add(clone);
        if (showEnergyCore) {
          torsoGroup.add(coreSprite);
        }

        // 6. Animation & Rig Actions Loop
        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const stateObj = sceneState.current!;

          // === RIG ACTIONS CONTROLLER ===
          switch (currentAction) {
            case "idle": {
              // Action 1: Anti-Gravity Levitation Hover
              stateObj.targetPosition.y = Math.sin(elapsed * 1.8) * 0.09;
              stateObj.targetPosition.x = Math.sin(elapsed * 0.9) * 0.03;

              // Precession banking tilt
              const idleBanking = Math.sin(elapsed * 1.1) * 0.04;
              const idlePitch = Math.cos(elapsed * 1.4) * 0.03;

              if (mousePos.current.isHovered && interactiveLookAt) {
                // Look-at cursor tracking
                stateObj.targetRotation.x = -mousePos.current.y * 0.35 + idlePitch;
                stateObj.targetRotation.y = mousePos.current.x * 0.55;
                stateObj.targetRotation.z = -mousePos.current.x * 0.1 + idleBanking;
              } else {
                stateObj.targetRotation.x = idlePitch;
                stateObj.targetRotation.y = Math.sin(elapsed * 0.7) * 0.12;
                stateObj.targetRotation.z = idleBanking;
              }

              // Pulse core breathing
              const pulse = Math.sin(elapsed * 2.0) * 0.05 + 1.0;
              coreSprite.scale.set(0.35 * pulse, 0.35 * pulse, 0.35 * pulse);
              coreLight.intensity = 2.5 * pulse;
              break;
            }

            case "listening": {
              // Action 2: Attentive Ear-Drop & Forward Pose
              stateObj.targetPosition.y = -0.05 + Math.sin(elapsed * 3.0) * 0.03;
              stateObj.targetPosition.z = 0.2; // leans closer to user
              stateObj.targetRotation.x = -0.16; // attentive forward lean
              stateObj.targetRotation.y = mousePos.current.x * 0.35;
              stateObj.targetRotation.z = 0;

              // Acoustic ripple pulse
              const micPulse = Math.sin(elapsed * 8.0) * 0.15 + 1.1;
              coreSprite.scale.set(0.42 * micPulse, 0.42 * micPulse, 0.42 * micPulse);
              coreLight.intensity = 4.5 * micPulse;
              break;
            }

            case "thinking": {
              // Action 3: Elevated Quantum Scan & Continuous Orbit
              stateObj.targetPosition.y = 0.14 + Math.sin(elapsed * 2.5) * 0.06;
              stateObj.targetPosition.z = 0;
              stateObj.targetRotation.x = Math.cos(elapsed * 2.0) * 0.06;
              // Smooth 360 scanning rotation
              stateObj.targetRotation.y += 0.025;
              stateObj.targetRotation.z = Math.sin(elapsed * 1.5) * 0.08;

              // High frequency quantum core flare
              const scanPulse = Math.sin(elapsed * 12.0) * 0.25 + 1.2;
              coreSprite.scale.set(0.48 * scanPulse, 0.48 * scanPulse, 0.48 * scanPulse);
              coreLight.intensity = 5.5 * scanPulse;

              // Scanning beam vertical traverse
              shineLight.position.y = Math.sin(elapsed * 4.0) * 1.5;
              break;
            }

            case "speaking": {
              // Action 4: Speech Harmonics & Articulated Gesture Nodding
              stateObj.targetPosition.y = Math.sin(elapsed * 7.0) * 0.05;
              stateObj.targetPosition.x = Math.sin(elapsed * 3.5) * 0.03;
              stateObj.targetRotation.x = -0.05 + Math.sin(elapsed * 6.5) * 0.07; // nodding
              stateObj.targetRotation.y = mousePos.current.x * 0.4 + Math.cos(elapsed * 4.0) * 0.06;
              stateObj.targetRotation.z = Math.sin(elapsed * 3.0) * 0.04;

              // Voice harmonic flash
              const voicePulse = Math.sin(elapsed * 14.0) * 0.2 + 1.15;
              coreSprite.scale.set(0.38 * voicePulse, 0.38 * voicePulse, 0.38 * voicePulse);
              coreLight.intensity = 4.0 * voicePulse;
              break;
            }

            case "salute": {
              // Action 5: Interactive 360 Spin Salute Flourish
              stateObj.saluteProgress += 0.04;
              if (stateObj.saluteProgress >= 1) {
                stateObj.saluteProgress = 0;
                setCurrentAction("idle");
                if (onActionTriggered) onActionTriggered("idle");
              }
              const p = stateObj.saluteProgress;
              stateObj.targetPosition.y = Math.sin(p * Math.PI) * 0.35; // leap
              stateObj.targetRotation.y += 0.25; // corkscrew spin
              stateObj.targetRotation.x = Math.sin(p * Math.PI * 2) * 0.2;
              coreLight.intensity = 6.0;
              break;
            }

            case "scan": {
              // Action 6: 180 Panoramic Scan
              stateObj.targetPosition.y = Math.sin(elapsed * 1.5) * 0.04;
              stateObj.targetRotation.x = 0;
              stateObj.targetRotation.y = Math.sin(elapsed * 1.8) * 0.75;
              stateObj.targetRotation.z = 0;
              break;
            }
          }

          // Spring Lerp Damping for Smooth Physical Motion
          stateObj.currentPosition.x += (stateObj.targetPosition.x - stateObj.currentPosition.x) * 0.08;
          stateObj.currentPosition.y += (stateObj.targetPosition.y - stateObj.currentPosition.y) * 0.08;
          stateObj.currentPosition.z += (stateObj.targetPosition.z - stateObj.currentPosition.z) * 0.08;

          stateObj.currentRotation.x += (stateObj.targetRotation.x - stateObj.currentRotation.x) * 0.08;
          stateObj.currentRotation.y += (stateObj.targetRotation.y - stateObj.currentRotation.y) * 0.08;
          stateObj.currentRotation.z += (stateObj.targetRotation.z - stateObj.currentRotation.z) * 0.08;

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
    setCurrentAction("salute");
    if (onActionTriggered) onActionTriggered("salute");
    if (onClick) onClick();
  };

  const actionLabels = {
    idle: "Levitating • Ready",
    listening: "Listening intently...",
    thinking: "Reasoning & Analyzing...",
    speaking: "Articulating response...",
    salute: "Guardian Salute!",
    scan: "Scanning environment...",
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
        title="Golden Guardian Bot — Click for 360° Salute Flourish!"
      />

      {/* Optional Status & Action Badge */}
      {showActionBadge && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[11px] text-zinc-300">
          <span
            className={`w-2 h-2 rounded-full ${
              currentAction === "listening"
                ? "bg-rose-500 animate-ping"
                : currentAction === "thinking"
                ? "bg-sky-400 animate-spin"
                : currentAction === "speaking"
                ? "bg-emerald-400 animate-pulse"
                : "bg-amber-400"
            }`}
          />
          <span className="font-semibold">{actionLabels[currentAction]}</span>
        </div>
      )}
    </div>
  );
}

export default GuardianBot3D;
