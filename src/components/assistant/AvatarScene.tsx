"use client";

import React, { useEffect, useRef, useState } from "react";
import type * as ThreeType from "three";
import { AssistantState } from "./types";
import { AvatarAnimationController } from "./AvatarAnimationController";
import { AvatarSpeechController } from "./AvatarSpeechController";
import { generateExpandedClips } from "./AvatarAnimationRegistry";

interface AvatarSceneProps {
  state?: AssistantState;
  clipOverride?: string | null;
  size?: number | string;
  interactiveLookAt?: boolean;
  showFloorShadow?: boolean;
  playbackSpeed?: number;
  reducedMotion?: boolean;
  className?: string;
  onClick?: () => void;
  onStateChange?: (state: AssistantState) => void;
  onClipChange?: (clipName: string) => void;
  onZoneClick?: (zoneName: string) => void;
  onControllerReady?: (
    controller: AvatarAnimationController,
    speech: AvatarSpeechController
  ) => void;
}

// Global in-memory singleton cache to prevent repeatedly re-fetching or re-parsing the 8.6MB model
let cachedGLTF: { scene: ThreeType.Group; animations: ThreeType.AnimationClip[] } | null = null;
let gltfLoadingPromise: Promise<{ scene: ThreeType.Group; animations: ThreeType.AnimationClip[] }> | null = null;

export function AvatarScene({
  state = "idle",
  clipOverride = null,
  size = 280,
  interactiveLookAt = true,
  showFloorShadow = true,
  playbackSpeed = 1.0,
  reducedMotion = false,
  className = "",
  onClick,
  onStateChange,
  onClipChange,
  onZoneClick,
  onControllerReady,
}: AvatarSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedGLTF);
  const [loadError, setLoadError] = useState<string | null>(null);

  const controllerRef = useRef<AvatarAnimationController | null>(null);
  const speechRef = useRef<AvatarSpeechController | null>(null);
  const mousePos = useRef<{ x: number; y: number; isHovered: boolean }>({
    x: 0,
    y: 0,
    isHovered: false,
  });

  const parsedSize = typeof size === "number" ? size : parseInt(String(size), 10) || 280;
  const isSmallOrb = parsedSize < 90;

  // React to prop state changes
  useEffect(() => {
    if (controllerRef.current) {
      if (clipOverride) {
        controllerRef.current.playClipByName(clipOverride);
      } else {
        controllerRef.current.transitionToState(state);
      }
    }
  }, [state, clipOverride]);

  // React to playback speed changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setPlaybackSpeed(reducedMotion ? 0.5 : playbackSpeed);
    }
  }, [playbackSpeed, reducedMotion]);

  useEffect(() => {
    let isDisposed = false;
    let animId = 0;

    async function init() {
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
        const width = container.clientWidth || parsedSize;
        const height = container.clientHeight || parsedSize;

        const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        if (isSmallOrb) {
          // Portrait framing focused on head & upper chest for compact orbs
          camera.position.set(0, 1.52, 0.95);
          camera.lookAt(0, 1.48, 0);
        } else {
          // Full body presentation framing
          camera.position.set(0, 1.05, 3.2);
          camera.lookAt(0, 0.92, 0);
        }

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 2. High-End Studio HDR Environment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv).texture;
        scene.environment = envTexture;

        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 3. Professional Lighting Rig
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xfffae8, 2.8);
        keyLight.position.set(2.5, 3.5, 2.5);
        keyLight.castShadow = true;
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.6);
        fillLight.position.set(-2.5, 2.0, 1.5);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
        rimLight.position.set(0, 2.5, -2.8);
        scene.add(rimLight);

        // Ground contact shadow disc
        if (showFloorShadow && !isSmallOrb) {
          const shadowCanvas = document.createElement("canvas");
          shadowCanvas.width = 128;
          shadowCanvas.height = 128;
          const sCtx = shadowCanvas.getContext("2d")!;
          const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, "rgba(0, 0, 0, 0.45)");
          grad.addColorStop(0.5, "rgba(0, 0, 0, 0.15)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          sCtx.fillStyle = grad;
          sCtx.fillRect(0, 0, 128, 128);

          const shadowTex = new THREE.CanvasTexture(shadowCanvas);
          const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false,
          });
          const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), shadowMat);
          shadowPlane.rotation.x = -Math.PI / 2;
          shadowPlane.position.set(0, 0.01, 0);
          scene.add(shadowPlane);
        }

        // 4. Load or Retrieve Cached Character Model
        if (!cachedGLTF) {
          if (!gltfLoadingPromise) {
            const loader = new GLTFLoader();
            gltfLoadingPromise = new Promise((resolve, reject) => {
              loader.load(
                "/assistant/amahas-character.glb",
                (gltf) => {
                  cachedGLTF = {
                    scene: gltf.scene,
                    animations: gltf.animations,
                  };
                  resolve(cachedGLTF);
                },
                undefined,
                (err) => {
                  console.error("[AvatarScene] Failed to load amahas-character.glb:", err);
                  gltfLoadingPromise = null;
                  reject(err);
                }
              );
            });
          }
          await gltfLoadingPromise;
        }

        if (isDisposed) return;
        setIsLoading(false);

        const source = cachedGLTF!;
        const clone = cloneSkeleton(source.scene);

        // Center on floor (Y=0)
        const box = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box.getCenter(center);
        clone.position.x = -center.x;
        clone.position.z = -center.z;
        clone.position.y = -box.min.y; // Align feet with Y=0 plane

        scene.add(clone);

        // Index skeleton bones and setup materials
        const bonesMap: Record<string, ThreeType.Bone> = {};
        clone.traverse((child: any) => {
          if (child.isBone) {
            bonesMap[child.name] = child;
          }
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m: any) => {
                m.side = THREE.DoubleSide;
                m.envMapIntensity = 1.4;
                if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
              });
            }
          }
        });

        // 5. Generate All 12 Expanded Rigged Animations & Combine with Original 6
        const expandedClips = generateExpandedClips(bonesMap, THREE);
        const combinedClips = [...source.animations, ...expandedClips];

        // 6. Instantiate Controllers
        const controller = new AvatarAnimationController(clone, combinedClips, THREE);
        const speech = new AvatarSpeechController(controller);

        controller.onClipChange = (clipName) => {
          if (onClipChange) onClipChange(clipName);
        };
        controller.onStateChange = (st) => {
          if (onStateChange) onStateChange(st);
        };

        controller.setPlaybackSpeed(reducedMotion ? 0.5 : playbackSpeed);

        controllerRef.current = controller;
        speechRef.current = speech;

        if (onControllerReady) {
          onControllerReady(controller, speech);
        }

        // Play initial state
        if (clipOverride) {
          controller.playClipByName(clipOverride);
        } else {
          controller.transitionToState(state, true);
        }

        // Head bone for interactive cursor tracking
        const headBone = bonesMap["mixamorigHead"];
        const neckBone = bonesMap["mixamorigNeck"];

        // 7. Render & Animation RAF Loop
        const clock = new THREE.Clock();
        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const delta = Math.min(clock.getDelta(), 0.1);

          // Update character skeletal animation mixer
          controller.update(delta);

          // Interactive Look-At head tracking
          if (interactiveLookAt && headBone && mousePos.current.isHovered) {
            const targetYaw = mousePos.current.x * 0.35;
            const targetPitch = -mousePos.current.y * 0.25;

            headBone.rotation.y += (targetYaw - headBone.rotation.y) * 0.1;
            headBone.rotation.x += (targetPitch - headBone.rotation.x) * 0.1;
            if (neckBone) {
              neckBone.rotation.y += (targetYaw * 0.5 - neckBone.rotation.y) * 0.08;
            }
          }

          renderer.render(scene, camera);
        };

        animate();

        // Resize observer for responsive layout
        const resizeObserver = new ResizeObserver((entries) => {
          if (isDisposed || !entries[0]) return;
          const rect = entries[0].contentRect;
          if (rect.width > 0 && rect.height > 0) {
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.setSize(rect.width, rect.height);
          }
        });
        resizeObserver.observe(container);

        // Store cleanup handles
        return () => {
          isDisposed = true;
          if (animId) cancelAnimationFrame(animId);
          resizeObserver.disconnect();
          speech.dispose();
          controller.dispose();
          pmremGenerator.dispose();
          renderer.dispose();
          scene.clear();
          if (container) container.innerHTML = "";
        };
      } catch (err: any) {
        console.error("[AvatarScene] Initialization error:", err);
        if (!isDisposed) {
          setLoadError(err?.message || "Failed to initialize 3D scene.");
          setIsLoading(false);
        }
      }
    }

    const cleanupPromise = init();

    return () => {
      isDisposed = true;
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, [parsedSize, isSmallOrb]);

  // Mouse move handler for interactive look-at
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

  // Tactile click zones raycasting
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) onClick();
    if (!mountRef.current || !controllerRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Approximate vertical hit detection for character zones
    // ny > 0.4: Head / Visor -> Thinking / Inquisitive
    // 0.0 < ny <= 0.4: Chest / Arms -> Explaining / Greeting
    // -0.4 < ny <= 0.0: Waist / Hands -> Affirmation (Yes)
    // ny <= -0.4: Legs / Feet -> Dance / Celebration
    let zoneName = "Torso";
    if (ny > 0.35) {
      zoneName = "Head / Visor";
      controllerRef.current.transitionToState("thinking");
    } else if (ny > 0.0) {
      zoneName = "Arms & Chest";
      controllerRef.current.transitionToState("explaining");
    } else if (ny > -0.35) {
      zoneName = "Hands / Core";
      controllerRef.current.transitionToState("acknowledging");
    } else {
      zoneName = "Boots / Legs";
      controllerRef.current.transitionToState("dance");
    }

    if (onZoneClick) {
      onZoneClick(zoneName);
    }
  };

  return (
    <div
      className={`relative select-none flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-pointer active:scale-[0.98] transition-transform duration-150"
        title="AMAHAS 3D AI Assistant — Click Head, Chest, or Boots for interactive reactions!"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <span className="text-[11px] text-cyan-300 font-mono mt-2 tracking-wider">
            Loading Character...
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 p-3 text-center rounded-3xl border border-red-500/20">
          <span className="text-xs text-red-300 font-semibold mb-1">
            Character Display Notice
          </span>
          <span className="text-[10px] text-red-400 font-mono">{loadError}</span>
        </div>
      )}
    </div>
  );
}

export default AvatarScene;
