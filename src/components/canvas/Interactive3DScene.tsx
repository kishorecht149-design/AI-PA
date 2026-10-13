"use client";

import React, { useEffect, useRef } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  radius: number;
  color: string;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
}

export function Interactive3DScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Mouse tracking for 3D parallax & interactive rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      mouseX = (clientX - width / 2) / (width / 2);
      mouseY = (clientY - height / 2) / (height / 2);
      targetRotY = mouseX * 0.8;
      targetRotX = -mouseY * 0.5;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // 1. Generate 3D Polyhedron / Neural Core Geodesic Nodes
    const coreNodes: Node3D[] = [];
    const coreRadius = Math.min(width, height) * 0.22;
    const rings = 6;
    const pointsPerRing = 10;

    for (let r = 0; r < rings; r++) {
      const phi = (Math.PI / (rings + 1)) * (r + 1);
      const y = Math.cos(phi) * coreRadius;
      const ringRad = Math.sin(phi) * coreRadius;

      for (let p = 0; p < pointsPerRing; p++) {
        const theta = ((Math.PI * 2) / pointsPerRing) * p + (r % 2 === 0 ? 0 : Math.PI / pointsPerRing);
        const x = Math.cos(theta) * ringRad;
        const z = Math.sin(theta) * ringRad;

        coreNodes.push({
          x,
          y,
          z,
          baseX: x,
          baseY: y,
          baseZ: z,
          radius: 2 + Math.random() * 1.5,
          color: Math.random() > 0.8 ? "rgba(255, 255, 255, 0.95)" : "rgba(200, 200, 210, 0.6)",
        });
      }
    }

    // Add poles
    coreNodes.push({
      x: 0,
      y: -coreRadius,
      z: 0,
      baseX: 0,
      baseY: -coreRadius,
      baseZ: 0,
      radius: 3,
      color: "#ffffff",
    });
    coreNodes.push({
      x: 0,
      y: coreRadius,
      z: 0,
      baseX: 0,
      baseY: coreRadius,
      baseZ: 0,
      radius: 3,
      color: "#ffffff",
    });

    // 2. Generate 3D Ambient Dust Particles
    const particlesCount = 90;
    const particles: Particle3D[] = [];
    const spreadX = width * 1.2;
    const spreadY = height * 1.2;
    const spreadZ = 600;

    for (let i = 0; i < particlesCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * spreadX,
        y: (Math.random() - 0.5) * spreadY,
        z: (Math.random() - 0.5) * spreadZ,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
        size: 0.8 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.45,
      });
    }

    // Camera perspective distance
    const fov = 420;
    let baseAngle = 0;

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth inertia rotation towards mouse target + continuous rotation
      rotX += (targetRotX - rotX) * 0.04;
      rotY += (targetRotY - rotY) * 0.04;
      baseAngle += 0.005;

      const currentRotY = rotY + baseAngle;
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const centerX = width / 2;
      const centerY = height * 0.42;

      // 1. Render 3D Dust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap around bounds
        if (p.x < -spreadX / 2) p.x = spreadX / 2;
        if (p.x > spreadX / 2) p.x = -spreadX / 2;
        if (p.y < -spreadY / 2) p.y = spreadY / 2;
        if (p.y > spreadY / 2) p.y = -spreadY / 2;
        if (p.z < -spreadZ / 2) p.z = spreadZ / 2;
        if (p.z > spreadZ / 2) p.z = -spreadZ / 2;

        // Particle 3D projection
        const pScale = fov / (fov + p.z + 200);
        if (pScale > 0) {
          const px = centerX + p.x * pScale;
          const py = centerY + p.y * pScale;

          ctx.beginPath();
          ctx.arc(px, py, p.size * pScale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * pScale})`;
          ctx.fill();
        }
      }

      // 2. Project Core 3D Nodes
      const projectedNodes: Array<{ px: number; py: number; scale: number; z: number; orig: Node3D }> = [];

      for (let i = 0; i < coreNodes.length; i++) {
        const n = coreNodes[i];

        // 3D Rotation along Y and X axes
        const x1 = n.baseX * cosY - n.baseZ * sinY;
        const z1 = n.baseZ * cosY + n.baseX * sinY;

        const y2 = n.baseY * cosX - z1 * sinX;
        const z2 = z1 * cosX + n.baseY * sinX;

        // Perspective scale
        const scale = fov / (fov + z2 + coreRadius * 0.6);
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;

        projectedNodes.push({ px, py, scale, z: z2, orig: n });
      }

      // Sort by Z depth (back to front) for true 3D occlusion
      projectedNodes.sort((a, b) => a.z - b.z);

      // 3. Render connecting 3D wireframe edges
      const maxDist = coreRadius * 0.65;
      ctx.lineWidth = 0.8;

      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];

          const dx = n1.orig.baseX - n2.orig.baseX;
          const dy = n1.orig.baseY - n2.orig.baseY;
          const dz = n1.orig.baseZ - n2.orig.baseZ;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3D < maxDist) {
            const edgeAlpha = Math.max(0, (1 - dist3D / maxDist) * 0.28 * Math.min(n1.scale, n2.scale));
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
            ctx.stroke();
          }
        }
      }

      // 4. Render 3D Nodes with Depth Shading
      for (let i = 0; i < projectedNodes.length; i++) {
        const pn = projectedNodes[i];
        const alpha = Math.max(0.2, Math.min(1, (pn.z + coreRadius) / (coreRadius * 2)));

        ctx.beginPath();
        ctx.arc(pn.px, pn.py, pn.orig.radius * pn.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.shadowBlur = 10 * pn.scale;
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Central Gravitational Radiant Flare
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 0.9);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.06)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.015)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}

export default Interactive3DScene;
