"use client";

import React, { useEffect, useRef, useState } from "react";

export interface Amahas3DCanvasProps {
  edition: "silver" | "gold";
  size?: number;
  interactive3D?: boolean;
  enableShimmer?: boolean;
  className?: string;
  onLoaded?: () => void;
}

// Global cached geometry and textures singleton
let cachedScene: any = null;
let gltfPromise: Promise<any> | null = null;
let cachedGoldTexture: any = null;
let cachedSilverTexture: any = null;

export function Amahas3DCanvas({
  edition,
  size = 280,
  interactive3D = true,
  enableShimmer = true,
  className = "",
  onLoaded,
}: Amahas3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [is3DReady, setIs3DReady] = useState(false);
  const mousePos = useRef({ x: 0, y: 0, isHovered: false });
  const activeEditionRef = useRef(edition);
  activeEditionRef.current = edition;

  const sceneState = useRef<{
    renderer: any;
    scene: any;
    camera: any;
    modelGroup: any;
    cursorLight: any;
    shineLight: any;
    keyLight: any;
    rimLight: any;
    ambientLight: any;
    materials: any[];
    sparkleGroup: any;
    reqId: number;
    clock: any;
    targetRotation: { x: number; y: number };
    currentRotation: { x: number; y: number };
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
        // Dynamically import Three.js modules
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");

        if (isDisposed || !container) return;

        const currentEdition = activeEditionRef.current;
        const isGold = currentEdition === "gold";

        // 1. Scene, Camera, Renderer with High Dynamic Range Tone Mapping
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 3.8);

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        // 2. High-End Studio HDR Environment for Mirror-Smooth Metal Reflections
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv).texture;
        scene.environment = envTexture;

        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 3. Studio Lighting Rig for Precious Metals
        const ambientLight = new THREE.AmbientLight(
          isGold ? 0xfff7ed : 0xf8fafc,
          1.2
        );
        scene.add(ambientLight);

        // Key light (soft studio fill)
        const keyLight = new THREE.DirectionalLight(
          isGold ? 0xfffae8 : 0xffffff,
          3.4
        );
        keyLight.position.set(3, 4, 3.5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(
          isGold ? 0xfef08a : 0xe0f2fe,
          1.8
        );
        fillLight.position.set(-3, 2, 2);
        scene.add(fillLight);

        // Orbiting rim light for silhouette caustics
        const rimLight = new THREE.DirectionalLight(
          isGold ? 0xf59e0b : 0x2dd4bf,
          3.5
        );
        rimLight.position.set(-2, -3, -2);
        scene.add(rimLight);

        // High-Intensity Shining Sweep Light (travels across the metallic curves)
        const shineLight = new THREE.PointLight(
          isGold ? 0xfff7cc : 0xffffff,
          0,
          10
        );
        shineLight.position.set(-2.5, 2.0, 2.2);
        scene.add(shineLight);

        // Interactive Cursor Spotlight
        const cursorLight = new THREE.PointLight(
          isGold ? 0xffe066 : 0xf0f9ff,
          0,
          8
        );
        cursorLight.position.set(0, 0, 2.5);
        scene.add(cursorLight);

        // Model Group
        const modelGroup = new THREE.Group();
        scene.add(modelGroup);

        // Sparkle Group for Neural Constellation Nodes
        const sparkleGroup = new THREE.Group();
        scene.add(sparkleGroup);

        // Create diamond sparkle sprites for key constellation nodes
        const nodePositions = [
          [-0.32, 0.42, 0.32],
          [-0.12, 0.65, 0.28],
          [0.18, 0.58, 0.30],
          [0.38, 0.35, 0.26],
          [-0.22, 0.12, 0.34],
          [0.26, 0.08, 0.32],
          [0.02, 0.32, 0.35],
        ];

        const sparkleCanvas = document.createElement("canvas");
        sparkleCanvas.width = 64;
        sparkleCanvas.height = 64;
        const ctx = sparkleCanvas.getContext("2d")!;
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.25, isGold ? "rgba(254, 240, 138, 0.9)" : "rgba(186, 230, 253, 0.9)");
        grad.addColorStop(0.5, isGold ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const sparkleTex = new THREE.CanvasTexture(sparkleCanvas);
        const sparkleMat = new THREE.SpriteMaterial({
          map: sparkleTex,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        });

        const sparkles: any[] = [];
        nodePositions.forEach((pos, idx) => {
          const sprite = new THREE.Sprite(sparkleMat.clone());
          sprite.position.set(pos[0], pos[1], pos[2]);
          sprite.scale.set(0.18, 0.18, 0.18);
          sparkleGroup.add(sprite);
          sparkles.push({ sprite, phase: idx * 0.9 });
        });

        // 4. Load 2048x2048 PBR Textures (with flipY = false for GLTF UV alignment)
        const textureLoader = new THREE.TextureLoader();
        if (!cachedGoldTexture) {
          cachedGoldTexture = textureLoader.load("/brand/amahas-gold-texture.jpg");
          cachedGoldTexture.colorSpace = THREE.SRGBColorSpace;
          cachedGoldTexture.flipY = false;
          cachedGoldTexture.generateMipmaps = true;
          cachedGoldTexture.minFilter = THREE.LinearMipmapLinearFilter;
          cachedGoldTexture.magFilter = THREE.LinearFilter;
        }
        if (!cachedSilverTexture) {
          cachedSilverTexture = textureLoader.load("/brand/amahas-silver-texture.jpg");
          cachedSilverTexture.colorSpace = THREE.SRGBColorSpace;
          cachedSilverTexture.flipY = false;
          cachedSilverTexture.generateMipmaps = true;
          cachedSilverTexture.minFilter = THREE.LinearMipmapLinearFilter;
          cachedSilverTexture.magFilter = THREE.LinearFilter;
        }

        const clock = new THREE.Clock();
        const materials: any[] = [];

        sceneState.current = {
          renderer,
          scene,
          camera,
          modelGroup,
          cursorLight,
          shineLight,
          keyLight,
          rimLight,
          ambientLight,
          materials,
          sparkleGroup,
          reqId: 0,
          clock,
          targetRotation: { x: 0, y: 0 },
          currentRotation: { x: 0, y: 0 },
          goldTex: cachedGoldTexture,
          silverTex: cachedSilverTexture,
          THREE,
        };

        // 5. Load GLTF Singleton
        if (!gltfPromise) {
          const loader = new GLTFLoader();
          gltfPromise = new Promise((resolve, reject) => {
            loader.load(
              "/brand/amahas-logo.glb",
              (gltf) => {
                cachedScene = gltf.scene;
                resolve(gltf.scene);
              },
              undefined,
              (err) => {
                console.error("GLTFLoader error:", err);
                gltfPromise = null;
                reject(err);
              }
            );
          });
        }

        const rawScene = cachedScene || (await gltfPromise);
        if (isDisposed) return;

        // Clone model instance
        const clone = rawScene.clone(true);

        // Center around (0, 0, 0)
        const box = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box.getCenter(center);
        clone.position.sub(center);

        // Fit into view
        const sizeVec = new THREE.Vector3();
        box.getSize(sizeVec);
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const targetScale = 2.3 / (maxDim || 1);
        clone.scale.setScalar(targetScale);

        // Exact Master Artwork Metallic Shader (MeshPhysicalMaterial with high-res texture)
        clone.traverse((child: any) => {
          if (child.isMesh) {
            if (child.geometry) {
              child.geometry.computeVertexNormals();
            }

            const activeTexture = isGold ? cachedGoldTexture : cachedSilverTexture;

            const pbrMat = new THREE.MeshPhysicalMaterial({
              map: activeTexture,
              color: new THREE.Color(0xffffff), // 100% authentic color reproduction from artwork
              metalness: 0.92,
              roughness: 0.16, // Smooth satin brushed finish
              clearcoat: 0.85, // Luxury protective clearcoat sheen
              clearcoatRoughness: 0.05,
              reflectivity: 1.0,
              ior: 1.52,
              side: THREE.DoubleSide,
              envMapIntensity: 1.8,
            });

            child.material = pbrMat;
            child.castShadow = true;
            child.receiveShadow = true;
            materials.push(pbrMat);
          }
        });

        modelGroup.clear();
        modelGroup.add(clone);
        setIs3DReady(true);
        if (onLoaded) onLoaded();

        // 6. Shining Animation & Render Loop
        const animate = () => {
          if (isDisposed) return;
          animId = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();

          // A. Periodic Shining Light Sweep (Diagonal gleam every 3.2s)
          if (enableShimmer) {
            const shinePeriod = 3.2;
            const progress = (elapsed % shinePeriod) / shinePeriod;
            const sweepT = (progress - 0.12) / 0.65;
            if (sweepT >= 0 && sweepT <= 1) {
              const intensity = Math.sin(sweepT * Math.PI) * 18.0;
              shineLight.intensity = intensity;
              shineLight.position.set(
                -2.6 + sweepT * 5.2,
                2.2 - sweepT * 4.4,
                2.2
              );
            } else {
              shineLight.intensity = 0;
            }

            // Continuous orbiting rim caustics
            rimLight.position.set(
              Math.cos(elapsed * 1.2) * 3.4,
              Math.sin(elapsed * 1.2) * 2.6,
              -1.8
            );

            // Sparkling constellation nodes
            sparkles.forEach((s) => {
              const pulse = Math.sin(elapsed * 3.5 + s.phase);
              const scale = Math.max(0.08, 0.16 + pulse * 0.09);
              s.sprite.scale.set(scale, scale, scale);
              s.sprite.material.opacity = Math.max(0.3, 0.6 + pulse * 0.4);
            });
          }

          // B. Interactive Cursor Reflection
          if (interactive3D) {
            if (mousePos.current.isHovered) {
              sceneState.current!.targetRotation.x = -mousePos.current.y * 0.45;
              sceneState.current!.targetRotation.y = mousePos.current.x * 0.55;

              cursorLight.intensity = 9.0;
              cursorLight.position.set(
                mousePos.current.x * 3.0,
                -mousePos.current.y * 3.0,
                2.4
              );
            } else {
              cursorLight.intensity = 0;

              // Gentle idle breathing floating motion
              const idleX = Math.cos(elapsed * 0.7) * 0.08;
              const idleY = Math.sin(elapsed * 0.85) * 0.13;
              sceneState.current!.targetRotation.x = idleX;
              sceneState.current!.targetRotation.y = idleY;
            }

            sceneState.current!.currentRotation.x +=
              (sceneState.current!.targetRotation.x - sceneState.current!.currentRotation.x) * 0.08;
            sceneState.current!.currentRotation.y +=
              (sceneState.current!.targetRotation.y - sceneState.current!.currentRotation.y) * 0.08;

            modelGroup.rotation.x = sceneState.current!.currentRotation.x;
            modelGroup.rotation.y = sceneState.current!.currentRotation.y;
            sparkleGroup.rotation.x = sceneState.current!.currentRotation.x;
            sparkleGroup.rotation.y = sceneState.current!.currentRotation.y;
          }

          renderer.render(scene, camera);
        };

        animate();
      } catch (err) {
        console.error("Three.js WebGL initialization failed:", err);
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
  }, [size]);

  // Update edition on the fly
  useEffect(() => {
    if (!sceneState.current) return;
    const {
      rimLight,
      shineLight,
      cursorLight,
      keyLight,
      ambientLight,
      materials,
      sparkleGroup,
      goldTex,
      silverTex,
    } = sceneState.current;

    const isGold = edition === "gold";

    if (!isGold) {
      // Edition A: Platinum Titanium Silver
      ambientLight.color.setHex(0xf8fafc);
      ambientLight.intensity = 1.2;

      keyLight.color.setHex(0xffffff);
      keyLight.intensity = 3.4;

      rimLight.color.setHex(0x2dd4bf); // Mint / Cyan rim caustics matching reference
      rimLight.intensity = 3.5;

      shineLight.color.setHex(0xffffff);
      cursorLight.color.setHex(0xf0f9ff);

      materials.forEach((mat: any) => {
        if (silverTex) mat.map = silverTex;
        mat.color.setHex(0xffffff);
        mat.metalness = 0.92;
        mat.roughness = 0.16;
        mat.clearcoat = 0.85;
        mat.clearcoatRoughness = 0.05;
        mat.envMapIntensity = 1.8;
        mat.needsUpdate = true;
      });

      sparkleGroup?.children?.forEach((sprite: any) => {
        sprite.material.color.setHex(0xbae6fd);
      });
    } else {
      // Edition B: Radiant Champagne Gold
      ambientLight.color.setHex(0xfff7ed);
      ambientLight.intensity = 1.2;

      keyLight.color.setHex(0xfffae8);
      keyLight.intensity = 3.5;

      rimLight.color.setHex(0xf59e0b); // Warm gold rim caustics
      rimLight.intensity = 3.5;

      shineLight.color.setHex(0xfff7cc);
      cursorLight.color.setHex(0xffe066);

      materials.forEach((mat: any) => {
        if (goldTex) mat.map = goldTex;
        mat.color.setHex(0xffffff);
        mat.metalness = 0.92;
        mat.roughness = 0.16;
        mat.clearcoat = 0.85;
        mat.clearcoatRoughness = 0.05;
        mat.envMapIntensity = 1.8;
        mat.needsUpdate = true;
      });

      sparkleGroup?.children?.forEach((sprite: any) => {
        sprite.material.color.setHex(0xfef08a);
      });
    }
  }, [edition]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mountRef.current || !interactive3D) return;
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

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Instant Master Artwork Fallback (Guarantees zero blank screen) */}
      <img
        src={
          edition === "silver"
            ? "/brand/amahas-silver-master.jpg"
            : "/brand/amahas-gold-master.jpg"
        }
        alt={`AMAHAS ${edition === "silver" ? "Silver" : "Gold"} Emblem`}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: is3DReady ? 0 : 1,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }}
        className="absolute inset-0 rounded-2xl"
      />

      {/* 2. Three.js WebGL 3D Canvas */}
      <div
        ref={mountRef}
        style={{
          opacity: is3DReady ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}

export default Amahas3DCanvas;
